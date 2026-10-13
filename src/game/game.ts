import * as THREE from 'three';
import { Customer, type Want } from './actors/customer';
import { Player } from './actors/player';
import { Worker, type StockTask } from './actors/worker';
import { initAudio, sfx } from './audio';
import { LAYOUT, QUALITY, REVEAL_WINDOW, STATS, upgradeCost, UPGRADES } from './config';
import { Hud } from './hud';
import { Input } from './input';
import { itemName, type ItemType } from './items';
import { displayName, loadPlayerName, loadStore, saveStore, unlockStore } from './save';
import { scene } from './scene';
import { onSettingsChange, settings } from './settings';
import { BuyZone } from './stations/buyzone';
import { Plot } from './stations/plot';
import { Processor } from './stations/processor';
import { Register } from './stations/register';
import { Shelf } from './stations/shelf';
import { TrashBin } from './stations/trash';
import { buildUnlocks, MACHINES, startMoney, STORE_MAP, type StoreDef, type UnlockDef, type UnlockKind } from './stores';
import { clearTweens, popIn, updateTweens } from './tween';
import type { Sink, Source, Zone } from './types';
import { isModalOpen, openModal } from './ui';
import { damp, distXZ, randInt, shuffle, type Box } from './util';
import { buildWorld } from './world';

const CAM_OFFSET = new THREE.Vector3(12, 16, 12);

/** Navegación sin recargar la página (así no se pierde la pantalla completa). */
export interface Nav {
  menu(): void;
  store(id: string): void;
}

export class Game {
  readonly sfx = sfx;
  renderer: THREE.WebGLRenderer;
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
  readonly unlocks: UnlockDef[];
  readonly player: Player;
  readonly register: Register;
  readonly input: Input;
  readonly hud: Hud;
  readonly name: string;
  money: number;
  cashierHired = false;

  private unlockMap: Map<string, UnlockDef>;
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
  private actionHeld = false;
  private actionPulse = false;
  private actionZone: Zone | null = null;
  private abort = new AbortController();
  private unsubSettings: () => void;
  private sun: THREE.DirectionalLight;
  private lastFrame = 0;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor(
    private container: HTMLElement,
    readonly store: StoreDef,
    private nav: Nav,
  ) {
    this.name = displayName(store);
    this.unlocks = buildUnlocks(store);
    this.unlockMap = new Map(this.unlocks.map((u) => [u.id, u]));
    this.money = startMoney(store, this.unlocks);

    this.renderer = this.createRenderer();
    this.sun = buildWorld(this, store.theme, this.name);
    this.applyShadowSize();
    // El joystick escucha al contenedor: así el canvas se puede cambiar al variar la calidad.
    this.input = new Input(container, document.getElementById('joystick')!, document.getElementById('joy-knob')!, this.abort.signal);
    this.player = new Player(STATS.playerCapacity(0), LAYOUT.playerStart, loadPlayerName() ?? undefined);
    scene.add(this.player.group);
    this.register = new Register(this, LAYOUT.register);
    new TrashBin(this, LAYOUT.trash);
    for (const def of this.unlocks) this.buyZones.set(def.id, new BuyZone(this, def));
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

    const opts = { signal: this.abort.signal };
    const unlockAudio = () => initAudio();
    window.addEventListener('pointerdown', unlockAudio, opts);
    window.addEventListener('keydown', unlockAudio, opts);
    window.addEventListener('resize', () => this.resize(), opts);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.save();
      },
      opts,
    );
    window.addEventListener('pagehide', () => this.save(), opts);
    this.unsubSettings = onSettingsChange(() => this.applySettings());
    this.resize();

    if (this.unlocked.size === 0) {
      const how = settings.mode === 'manual' ? 'y usa el botón de acción (o Espacio)' : 'y acércate a las cosas para usarlas';
      this.hud.toast(`Muévete con WASD / flechas o arrastrando ${how}`, 5000);
    }
  }

  start() {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** Guarda y libera todo (escena, listeners, GPU) para volver al menú o cambiar de tienda. */
  dispose() {
    this.save();
    this.renderer.setAnimationLoop(null);
    this.abort.abort();
    this.unsubSettings();
    this.hud.dispose();
    clearTweens();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      for (const mat of mats) {
        (mat as THREE.MeshBasicMaterial).map?.dispose();
        mat.dispose();
      }
    });
    scene.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
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

  hasBuilt(kind: UnlockKind) {
    return this.unlocks.some((u) => u.kind === kind && this.unlocked.has(u.id));
  }

  upgradePrice(id: string) {
    const u = UPGRADES.find((x) => x.id === id)!;
    return upgradeCost(u, this.level(id), this.store.costMult);
  }

  buyUpgrade(id: string) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return;
    const lvl = this.level(id);
    const cost = this.upgradePrice(id);
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

  // ───────── Botón de acción (modo manual) ─────────

  actionDown() {
    this.actionHeld = true;
    this.actionPulse = true;
  }

  actionUp() {
    this.actionHeld = false;
  }

  // ───────── Construcción y progresión ─────────

  addZone(z: Omit<Zone, 'timer'>) {
    this.zones.push({ ...z, timer: z.interval });
  }

  unlock(id: string, instant = false) {
    if (this.unlocked.has(id)) return;
    const def = this.unlockMap.get(id);
    if (!def) return;
    this.unlocked.add(id);
    this.buyZones.get(id)?.hide();

    let obj: THREE.Object3D | undefined;
    switch (def.kind) {
      case 'shelf': {
        const s = new Shelf(this, def.ref!, def.x, def.z);
        this.shelves.push(s);
        obj = s.group;
        if (this.shelves.length === 1) this.spawnTimer = Math.min(this.spawnTimer, 2);
        break;
      }
      case 'field': {
        const p = new Plot(this, def.ref!, def.x, def.z);
        this.plots.push(p);
        obj = p.group;
        break;
      }
      case 'machine': {
        const p = new Processor(this, MACHINES[def.ref!], def.x, def.z);
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
      case 'expansion':
        unlockStore(def.ref!);
        break;
    }

    if (instant) return;
    if (obj) popIn(obj);
    sfx.unlock();
    this.refreshZones(true);
    this.save();
    if (def.kind === 'expansion') this.showExpansion(def.ref!);
    else if (this.unlocked.size === this.unlocks.length) this.hud.toast('🎉 ¡Tienda completa! Sigue mejorando en el panel de mejoras', 5000);
  }

  private showExpansion(storeId: string) {
    const next = STORE_MAP.get(storeId);
    if (!next) return;
    openModal(
      '¡Nueva tienda desbloqueada!',
      `<p class="big-emoji">${next.emoji}</p><p><b>${next.name}</b> ya está disponible.<br>${next.tagline}</p>`,
      [
        { label: 'Seguir aquí' },
        { label: `Ir a ${next.name} ▶`, primary: true, onClick: () => this.goToStore(next.id) },
      ],
    );
  }

  /** Muestra las siguientes zonas de compra pendientes, en orden. */
  private refreshZones(animate: boolean) {
    let shown = 0;
    for (const def of this.unlocks) {
      if (shown >= REVEAL_WINDOW) break;
      const z = this.buyZones.get(def.id)!;
      if (z.done) continue;
      if (!z.revealed) {
        z.reveal(animate);
        if (animate) this.camFocus.push({ pos: z.pos.clone(), t: 1.0 });
      }
      shown++;
    }
  }

  goToMenu() {
    this.nav.menu();
  }

  goToStore(id: string) {
    this.nav.store(id);
  }

  // ───────── Consultas para la IA ─────────

  bestShelfFor(type: ItemType): Shelf | undefined {
    let best: Shelf | undefined;
    for (const s of this.shelves) if (s.type === type && (!best || s.stack.count > best.stack.count)) best = s;
    return best;
  }

  sourcesFor(type: ItemType): Source[] {
    return [...this.plots.filter((p) => p.type === type), ...this.processors.filter((p) => p.type === type)];
  }

  sinks(): Sink[] {
    const sinks: Sink[] = [...this.shelves];
    for (const p of this.processors) if (p.sink) sinks.push(p.sink);
    return sinks;
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
    const now = performance.now();
    if (settings.fpsLimit) {
      const interval = 1000 / settings.fpsLimit;
      const elapsed = now - this.lastFrame;
      // Margen de 2 ms para no perder fotogramas por la variación del refresco de pantalla.
      if (elapsed < interval - 2) return;
      this.lastFrame = now - (elapsed >= interval ? elapsed % interval : 0);
    }
    const raw = this.clock.getDelta();
    this.update(Math.min(raw, 1 / 20));
    this.renderer.render(scene, this.camera);

    this.fpsFrames++;
    this.fpsTime += raw;
    if (this.fpsTime >= 0.5) {
      this.hud.setFps(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }

  private createRenderer(): THREE.WebGLRenderer {
    const q = QUALITY[settings.quality];
    const r = new THREE.WebGLRenderer({ antialias: q.antialias, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, q.maxPixelRatio));
    r.shadowMap.enabled = q.shadows;
    r.shadowMap.type = q.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.container.appendChild(r.domElement);
    return r;
  }

  private applyShadowSize() {
    const size = QUALITY[settings.quality].shadowSize;
    if (this.sun.shadow.mapSize.x === size) return;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
  }

  private update(dt: number) {
    this.elapsed += dt;
    const paused = isModalOpen();
    this.player.update(dt, paused ? { x: 0, y: 0 } : this.input.vector(), this.playerSpeed, this.obstacles);
    this.updateZones(dt, paused);

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

  /** Automático: actúan todas las zonas cercanas. Manual: solo la más cercana, mientras se pulsa el botón. */
  private updateZones(dt: number, paused: boolean) {
    const pp = this.player.pos;
    const manual = settings.mode === 'manual';
    const held = (this.actionHeld || this.actionPulse || this.input.actionHeld) && !paused;
    this.actionPulse = false;
    let best: Zone | null = null;
    let bestD = Infinity;

    for (const z of this.zones) {
      const d = distXZ(pp, z.pos);
      const active = !paused && d <= z.radius && (!z.enabled || z.enabled()) && z.canAct();
      if (!active) {
        z.timer = z.interval;
        continue;
      }
      if (manual) {
        if (d < bestD) {
          bestD = d;
          best = z;
        }
        continue;
      }
      this.tickZone(z, dt);
    }

    if (manual) {
      if (best !== this.actionZone && this.actionZone) this.actionZone.timer = this.actionZone.interval;
      if (best && held) this.tickZone(best, dt);
      else if (best) best.timer = best.interval;
    }
    this.actionZone = manual ? best : null;
    this.hud.setAction(this.actionZone);
  }

  private tickZone(z: Zone, dt: number) {
    z.timer = Math.min(z.timer + dt, z.interval * 3);
    while (z.timer >= z.interval) {
      z.timer -= z.interval;
      if (!z.canAct()) break;
      z.act();
    }
  }

  private updateSpawner(dt: number) {
    if (this.shelves.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const n = this.shelves.length;
    this.spawnTimer = Math.max(1.6, 6.5 - n * 0.45) * (0.8 + Math.random() * 0.4);
    if (this.customers.length >= Math.min(16, 3 + n * 1.2)) return;

    const types = shuffle([...new Set(this.shelves.map((s) => s.type))]);
    const nTypes = Math.min(types.length, Math.random() < 0.2 ? 3 : randInt(1, 2));
    const wants: Want[] = types.slice(0, nTypes).map((type) => ({ type, qty: randInt(1, nTypes > 1 ? 2 : 3), got: 0 }));
    this.customers.push(new Customer(this, wants));
  }

  private updateHint() {
    if (!settings.hints) {
      this.hud.setHint('');
      this.hintTarget = null;
      return;
    }
    const p = this.player;
    let text = '';
    let target: THREE.Vector3 | null = null;
    const affordable = [...this.buyZones.values()]
      .filter((z) => z.revealed && !z.done && this.money >= z.remaining)
      .sort((a, b) => a.remaining - b.remaining);
    const front = this.register.queue[0];
    const verb = settings.mode === 'manual' ? 'Pulsa el botón sobre la zona' : 'Párate sobre la zona';

    if (this.unlocked.size < 2 && affordable.length) {
      target = affordable[0].pos;
      text = `${verb} para comprar: ${affordable[0].def.label}`;
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
        text = `Lleva ${itemName(bestSink.type)} ${bestSink.isShelf ? 'a la estantería' : 'a la máquina'}`;
      } else {
        target = LAYOUT.trash;
        text = 'No hay dónde dejarlo: tíralo a la basura 🗑️';
      }
    } else if (affordable.length) {
      target = affordable[0].pos;
      text = `¡Puedes comprar: ${affordable[0].def.label}!`;
    } else {
      const sink = this.sinks()
        .filter((s) => !s.stack.full && this.sourcesFor(s.type).some((src) => src.available() > 0))
        .sort((a, b) => a.stack.count / a.stack.capacity - b.stack.count / b.stack.capacity)[0];
      if (sink) {
        target = this.sourcesFor(sink.type).find((s) => s.available() > 0)!.access;
        text = `Recoge ${itemName(sink.type)}`;
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

  /** Aplica calidad y FPS al momento, sin salir de la tienda. */
  private applySettings() {
    const q = QUALITY[settings.quality];
    if (this.renderer.getContextAttributes()?.antialias !== q.antialias) {
      // El suavizado de bordes solo se elige al crear el contexto WebGL: se rehace el renderer.
      this.renderer.setAnimationLoop(null);
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
      this.renderer = this.createRenderer();
      this.resize();
      this.start();
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.maxPixelRatio));
      this.resize();
      const softType = q.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
      if (this.renderer.shadowMap.enabled !== q.shadows || this.renderer.shadowMap.type !== softType) {
        this.renderer.shadowMap.enabled = q.shadows;
        this.renderer.shadowMap.type = softType;
        scene.traverse((o) => {
          const m = (o as THREE.Mesh).material;
          if (m) (Array.isArray(m) ? m : [m]).forEach((x) => (x.needsUpdate = true));
        });
      }
    }
    this.applyShadowSize();
    this.lastFrame = 0;
    this.hud.setFps(null);
    this.hintTimer = 0;
  }

  // ───────── Guardado ─────────

  save() {
    const paid: Record<string, number> = {};
    for (const [id, z] of this.buyZones) if (!z.done && z.paid > 0) paid[id] = z.paid;
    saveStore(this.store.id, { money: Math.floor(this.money), unlocked: [...this.unlocked], paid, upgrades: this.upgrades });
  }

  private loadGame() {
    const data = loadStore(this.store.id);
    if (data) {
      this.money = data.money;
      this.upgrades = { ...data.upgrades };
      for (const def of this.unlocks) if (data.unlocked.includes(def.id)) this.unlock(def.id, true);
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
