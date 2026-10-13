import * as THREE from 'three';
import { Customer, type Want } from './actors/customer';
import { Player } from './actors/player';
import { Worker, type StockTask } from './actors/worker';
import { initAudio, sfx } from './audio';
import {
  PLAYER_START,
  REGISTER_POS,
  START_MONEY,
  STATS,
  UNLOCKS,
  upgradeCost,
  UPGRADES,
  type UnlockDef,
} from './config';
import { Hud } from './hud';
import { Input } from './input';
import { ITEM_INFO, type ItemType } from './items';
import { clearSave, loadSave, writeSave } from './save';
import { scene } from './scene';
import { BuyZone } from './stations/buyzone';
import { Plot } from './stations/plot';
import { Processor } from './stations/processor';
import { Register } from './stations/register';
import { Shelf } from './stations/shelf';
import { updateTweens, popIn } from './tween';
import type { Sink, Source, Zone } from './types';
import { damp, distXZ, randInt, shuffle, type Box } from './util';
import { buildWorld } from './world';

const UNLOCK_MAP = new Map<string, UnlockDef>(UNLOCKS.map((d) => [d.id, d]));
const CAM_OFFSET = new THREE.Vector3(12, 16, 12);

export class Game {
  readonly sfx = sfx;
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
  readonly zones: Zone[] = [];
  readonly obstacles: Box[] = [];
  readonly shelves: Shelf[] = [];
  readonly plots: Plot[] = [];
  readonly processors: Processor[] = [];
  readonly customers: Customer[] = [];
  readonly workers: Worker[] = [];
  readonly buyZones = new Map<string, BuyZone>();
  readonly unlocked = new Set<string>();
  readonly player: Player;
  readonly register: Register;
  readonly input: Input;
  readonly hud: Hud;
  money = START_MONEY;
  cashierHired = false;

  private upgrades: Record<string, number> = {};
  private clock = new THREE.Clock();
  private spawnTimer = 1.5;
  private hintTimer = 0;
  private saveTimer = 0;
  private elapsed = 0;
  private hintTarget: THREE.Vector3 | null = null;
  private camTarget = new THREE.Vector3();
  private camFocus: { pos: THREE.Vector3; t: number }[] = [];
  private marker: THREE.Mesh;
  private arrow: THREE.Mesh;
  private resetting = false;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    buildWorld(this);
    this.input = new Input(this.renderer.domElement, document.getElementById('joystick')!, document.getElementById('joy-knob')!);
    this.player = new Player(STATS.playerCapacity(0), PLAYER_START);
    scene.add(this.player.group);
    this.register = new Register(this, REGISTER_POS);
    for (const def of UNLOCKS) this.buyZones.set(def.id, new BuyZone(this, def));
    this.hud = new Hud(this);

    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 16).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: 0xffd54f }));
    const arrowShape = new THREE.Shape([new THREE.Vector2(0, 0.38), new THREE.Vector2(-0.28, -0.14), new THREE.Vector2(0.28, -0.14)]);
    this.arrow = new THREE.Mesh(
      new THREE.ShapeGeometry(arrowShape).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
    );
    scene.add(this.marker, this.arrow);

    this.loadGame();
    this.camTarget.copy(this.player.pos);

    const unlockAudio = () => initAudio();
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
    });
    window.addEventListener('pagehide', () => this.save());
    this.resize();

    if (this.unlocked.size === 0) this.hud.toast('Muévete con WASD / flechas o arrastrando en la pantalla', 4500);
  }

  start() {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ───────── Estadísticas y mejoras ─────────

  level(id: string) {
    return this.upgrades[id] ?? 0;
  }
  get playerSpeed() {
    return STATS.playerSpeed(this.level('speed'));
  }
  get growTime() {
    return STATS.growTime(this.level('growth'));
  }
  get processTime() {
    return STATS.processTime(this.level('machines'));
  }
  get staffSpeed() {
    return STATS.staffSpeed(this.level('staff'));
  }
  get staffCapacity() {
    return STATS.staffCapacity(this.level('staff'));
  }

  buyUpgrade(id: string) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return;
    const lvl = this.level(id);
    const cost = upgradeCost(u, lvl);
    if (lvl >= u.max || this.money < cost) return;
    this.money -= cost;
    this.upgrades[id] = lvl + 1;
    this.applyStats();
    sfx.upgrade();
    this.save();
  }

  private applyStats() {
    this.player.stack.capacity = STATS.playerCapacity(this.level('capacity'));
    for (const w of this.workers) w.stack.capacity = this.staffCapacity;
  }

  // ───────── Dinero ─────────

  addMoney(v: number) {
    this.money += v;
  }

  spendMoney(v: number) {
    this.money = Math.max(0, this.money - v);
  }

  // ───────── Construcción y progresión ─────────

  addZone(z: Omit<Zone, 'timer'>) {
    this.zones.push({ ...z, timer: z.interval });
  }

  unlock(id: string, instant = false) {
    if (this.unlocked.has(id)) return;
    const def = UNLOCK_MAP.get(id);
    if (!def) return;
    this.unlocked.add(id);
    this.buyZones.get(id)?.hide();

    let obj: THREE.Object3D | undefined;
    switch (def.kind) {
      case 'shelf': {
        const s = new Shelf(this, def.product!, def.x, def.z);
        this.shelves.push(s);
        obj = s.group;
        if (this.shelves.length === 1) this.spawnTimer = Math.min(this.spawnTimer, 2);
        break;
      }
      case 'plot': {
        const p = new Plot(this, def.product!, def.x, def.z);
        this.plots.push(p);
        obj = p.group;
        break;
      }
      case 'processor': {
        const p = new Processor(this, def.input!, def.output!, def.machine!, def.x, def.z);
        this.processors.push(p);
        obj = p.group;
        break;
      }
      case 'cashier': {
        const w = new Worker(this, 'cashier', this.register.cashierSpot.clone());
        this.workers.push(w);
        this.cashierHired = true;
        obj = w.group;
        break;
      }
      case 'stocker': {
        const w = new Worker(this, 'stocker', new THREE.Vector3(def.x, 0, def.z));
        this.workers.push(w);
        obj = w.group;
        break;
      }
    }

    if (!instant) {
      if (obj) popIn(obj);
      sfx.unlock();
      this.refreshZones(true);
      this.save();
      if (this.unlocked.size === UNLOCKS.length) this.hud.toast('🎉 ¡Tienda completa! Sigue mejorando en el panel de mejoras', 5000);
    }
  }

  private refreshZones(animate: boolean) {
    for (const z of this.buyZones.values()) {
      if (z.revealed || z.done) continue;
      if (!z.def.requires.every((r) => this.unlocked.has(r))) continue;
      z.reveal(animate);
      if (animate) this.camFocus.push({ pos: z.pos.clone(), t: 1.1 });
    }
  }

  // ───────── Consultas para la IA ─────────

  bestShelfFor(type: ItemType): Shelf | undefined {
    let best: Shelf | undefined;
    for (const s of this.shelves) if (s.type === type && (!best || s.stack.count > best.stack.count)) best = s;
    return best;
  }

  sourcesFor(type: ItemType): Source[] {
    return [...this.plots.filter((p) => p.type === type), ...this.processors.filter((p) => p.outputType === type)];
  }

  sinks(): Sink[] {
    return [...this.shelves, ...this.processors.map((p) => p.sink)];
  }

  /** Destino con menor ocupación que tenga producto disponible (estanterías primero). */
  findStockTask(worker: Worker): StockTask | undefined {
    const taken = new Set(this.workers.filter((w) => w !== worker && w.task).map((w) => w.task!.sink));
    let best: StockTask | undefined;
    let bestScore = Infinity;
    for (const sink of this.sinks()) {
      if (taken.has(sink)) continue;
      if (sink.stack.capacity - sink.stack.count < 2) continue;
      let source: Source | undefined;
      for (const s of this.sourcesFor(sink.type)) if (s.available() > 0 && (!source || s.available() > source.available())) source = s;
      if (!source) continue;
      const score = sink.stack.count / sink.stack.capacity + (sink.isShelf ? 0 : 0.2);
      if (score < bestScore) {
        bestScore = score;
        best = { sink, source };
      }
    }
    return best;
  }

  // ───────── Bucle ─────────

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.update(dt);
    this.renderer.render(scene, this.camera);
  }

  private update(dt: number) {
    this.elapsed += dt;
    const input = this.hud.panelOpen ? { x: 0, y: 0 } : this.input.vector();
    this.player.update(dt, input, this.playerSpeed, this.obstacles);

    const pp = this.player.pos;
    for (const z of this.zones) {
      if ((z.enabled && !z.enabled()) || distXZ(pp, z.pos) > z.radius) {
        z.timer = z.interval;
        continue;
      }
      z.timer = Math.min(z.timer + dt, z.interval * 3);
      while (z.timer >= z.interval) {
        z.timer -= z.interval;
        z.act();
      }
    }

    for (const p of this.plots) p.update(dt, this.growTime);
    for (const p of this.processors) p.update(dt, this.processTime);
    this.register.update(dt);
    for (const c of this.customers) c.update(dt);
    for (let i = this.customers.length - 1; i >= 0; i--) {
      if (this.customers[i].state === 'gone') {
        this.customers[i].dispose();
        this.customers.splice(i, 1);
      }
    }
    for (const w of this.workers) w.update(dt);
    this.updateSpawner(dt);
    updateTweens(dt);

    this.hintTimer -= dt;
    if (this.hintTimer <= 0) {
      this.hintTimer = 0.3;
      this.updateHint();
    }
    this.updateGuides();
    this.updateCamera(dt);
    this.hud.update();

    this.saveTimer += dt;
    if (this.saveTimer > 5) {
      this.saveTimer = 0;
      this.save();
    }
  }

  private updateSpawner(dt: number) {
    if (this.shelves.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const n = this.shelves.length;
    this.spawnTimer = Math.max(2.2, 6.5 - n * 0.8) * (0.8 + Math.random() * 0.4);
    if (this.customers.length >= 3 + n * 1.5) return;

    const types = shuffle([...new Set(this.shelves.map((s) => s.type))]);
    const nTypes = Math.min(types.length, Math.random() < 0.15 ? 3 : randInt(1, 2));
    const wants: Want[] = types.slice(0, nTypes).map((type) => ({ type, qty: randInt(1, nTypes > 1 ? 2 : 3), got: 0 }));
    this.customers.push(new Customer(this, wants));
  }

  private updateHint() {
    const p = this.player;
    let text = '';
    let target: THREE.Vector3 | null = null;
    const affordable = [...this.buyZones.values()]
      .filter((z) => z.revealed && !z.done && this.money >= z.remaining)
      .sort((a, b) => a.remaining - b.remaining);
    const front = this.register.queue[0];

    if (!this.unlocked.has('plot_tomato') && affordable.length) {
      target = affordable[0].pos;
      text = `Párate sobre la zona para comprar: ${affordable[0].def.label}`;
    } else if (front?.readyToPay() && !this.register.staffed) {
      target = this.register.cashierSpot;
      text = '¡Un cliente espera! Ve a la caja 🧾';
    } else if (this.register.cashPile.count >= 4) {
      target = this.register.cashPos;
      text = 'Recoge el dinero 💵';
    } else if (p.stack.count > 0) {
      let bestD = Infinity;
      let bestSink: Sink | undefined;
      for (const s of this.sinks()) {
        if (s.stack.full || !p.stack.has(s.type)) continue;
        const d = distXZ(p.pos, s.access) - (s.isShelf ? 3 : 0);
        if (d < bestD) {
          bestD = d;
          bestSink = s;
        }
      }
      if (bestSink) {
        target = bestSink.access;
        text = `Lleva ${ITEM_INFO[bestSink.type].name} ${bestSink.isShelf ? 'a la estantería' : 'a la máquina'}`;
      }
    } else if (affordable.length) {
      target = affordable[0].pos;
      text = `¡Puedes comprar: ${affordable[0].def.label}!`;
    } else {
      const sink = this.sinks()
        .filter((s) => !s.stack.full && this.sourcesFor(s.type).some((src) => src.available() > 0))
        .sort((a, b) => a.stack.count / a.stack.capacity - b.stack.count / b.stack.capacity)[0];
      if (sink) {
        const src = this.sourcesFor(sink.type).find((s) => s.available() > 0)!;
        target = src.access;
        text = `Recoge ${ITEM_INFO[sink.type].name}`;
      }
    }
    this.hud.setHint(text);
    this.hintTarget = target;
  }

  private updateGuides() {
    const t = this.hintTarget;
    const far = !!t && distXZ(this.player.pos, t) > 1.6;
    this.marker.visible = !!t;
    this.arrow.visible = far;
    if (!t) return;
    this.marker.position.set(t.x, 2.2 + Math.sin(this.elapsed * 5) * 0.2, t.z);
    this.marker.rotation.y += 0.04;
    if (far) {
      const a = Math.atan2(t.x - this.player.pos.x, t.z - this.player.pos.z);
      this.arrow.rotation.y = a;
      this.arrow.position.set(this.player.pos.x + Math.sin(a) * 1.1, 0.06, this.player.pos.z + Math.cos(a) * 1.1);
    }
  }

  private updateCamera(dt: number) {
    let goal = this.player.pos;
    const focus = this.camFocus[0];
    if (focus) {
      goal = focus.pos;
      focus.t -= dt;
      if (focus.t <= 0) this.camFocus.shift();
    }
    this.camTarget.lerp(goal, damp(dt, focus ? 4 : 8));
    this.camera.position.copy(this.camTarget).add(CAM_OFFSET);
    this.camera.lookAt(this.camTarget);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const halfH = aspect >= 1 ? 7.5 : Math.max(7.5, 6.2 / aspect);
    this.camera.left = -halfH * aspect;
    this.camera.right = halfH * aspect;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ───────── Guardado ─────────

  save() {
    if (this.resetting) return;
    const paid: Record<string, number> = {};
    for (const [id, z] of this.buyZones) if (!z.done && z.paid > 0) paid[id] = z.paid;
    writeSave({ v: 1, money: Math.floor(this.money), unlocked: [...this.unlocked], paid, upgrades: this.upgrades });
  }

  reset() {
    this.resetting = true;
    clearSave();
    location.reload();
  }

  private loadGame() {
    const data = loadSave();
    if (data) {
      this.money = data.money;
      this.upgrades = { ...data.upgrades };
      for (const def of UNLOCKS) if (data.unlocked.includes(def.id)) this.unlock(def.id, true);
      for (const [id, v] of Object.entries(data.paid ?? {})) {
        const z = this.buyZones.get(id);
        if (z && !z.done) {
          z.paid = Math.min(v, z.def.price);
          z.draw();
        }
      }
    }
    this.applyStats();
    this.refreshZones(false);
  }
}
