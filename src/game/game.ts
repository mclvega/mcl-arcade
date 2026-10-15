import * as THREE from 'three';
import { Customer, type Want } from './actors/customer';
import { Player } from './actors/player';
import { Thief } from './actors/thief';
import { Worker, type StockTask } from './actors/worker';
import { initAudio, sfx } from './audio';
import { setMusicMood } from './music';
import { CARE, CARRY, DIFFICULTIES, EVENTS, SPECIAL, THIEF, type AreaId, LAYOUT, QUALITY, REPUTATION, REVEAL_WINDOW, STATS, upgradeCost, UPGRADES, type DifficultyDef } from './config';
import { Hud } from './hud';
import { Input } from './input';
import { itemEmoji, itemName, PRODUCTS, type ItemType } from './items';
import { clearStoreProgress, displayName, loadDifficulty, loadLook, loadPlayerName, loadStore, saveStore, unlockStore, type StoreStats } from './save';
import { scene } from './scene';
import { consumeItem } from './stack';
import { onSettingsChange, settings } from './settings';
import { BuyZone } from './stations/buyzone';
import { Plot } from './stations/plot';
import { Processor } from './stations/processor';
import { Register } from './stations/register';
import { Shelf } from './stations/shelf';
import { TrashBin } from './stations/trash';
import { LockedArea } from './stations/area';
import { SpecialOrder, type OrderLine } from './stations/order';
import { areaAt, buildUnlocks, MACHINES, startMoney, STORE_MAP, storeLayout, type StoreDef, type UnlockDef, type UnlockKind } from './stores';
import { addTween, clearTweens, popIn, updateTweens } from './tween';
import type { Sink, Source, Zone } from './types';
import { floatingText } from './labels';
import { isModalOpen, openModal } from './ui';
import { boxAt, damp, distXZ, rand, randInt, shuffle, type Box } from './util';
import { buildWorld } from './world';

const CAM_OFFSET = new THREE.Vector3(12, 16, 12);

/** Navegación sin recargar la página (así no se pierde la pantalla completa). */
export interface Nav {
  menu(): void;
  store(id: string): void;
  /** Tras cerrar la tienda: empezar de cero (se puede cambiar la dificultad). */
  restart(id: string): void;
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
  readonly order: SpecialOrder;
  private areas = new Map<string, LockedArea>();
  readonly input: Input;
  readonly hud: Hud;
  readonly name: string;
  money: number;
  readonly difficulty: DifficultyDef;
  /** Reputación 0–100. Si baja de 0 (y la dificultad lo permite) la tienda cierra. */
  rep: number;
  stats: StoreStats = { served: 0, lost: 0, earned: 0, tips: 0, playTime: 0 };
  /** La tienda ha cerrado: el juego se congela. */
  private over = false;
  private warnedHungry = false;
  private warnedBreak = false;
  private orderTimer = SPECIAL.firstDelay;
  private thief: Thief | null = null;
  private thiefCooldown = 30;
  private rushTimer = 0;
  private rushLeft = 0;
  private warnedBroken = false;
  cashierHired = false;
  /** Dónde está la basura en esta tienda. */
  readonly trashPos: THREE.Vector3;
  private moves: Record<string, { x: number; z: number }> = {};

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
    this.difficulty = DIFFICULTIES[loadDifficulty(store.id)];
    this.rep = this.difficulty.startRep;
    this.rushTimer = this.difficulty.rushEvery;
    const layout = storeLayout(store);
    this.unlocks = buildUnlocks(store, layout);
    this.unlockMap = new Map(this.unlocks.map((u) => [u.id, u]));
    this.moves = { ...loadStore(store.id)?.moves };
    for (const [id, m] of Object.entries(this.moves)) {
      const def = this.unlockMap.get(id);
      if (!def) continue;
      def.x = m.x;
      def.z = m.z;
      const a = areaAt(m.x, m.z);
      def.area = a && this.unlockMap.has(`area:${a}`) ? `area:${a}` : undefined;
    }
    const t = this.moves.trash;
    this.trashPos = t ? new THREE.Vector3(t.x, 0, t.z) : layout.trash.clone();
    this.money = startMoney(store, this.unlocks);
    this.relocateBlocked(new Set(loadStore(store.id)?.unlocked ?? []));

    this.renderer = this.createRenderer();
    this.sun = buildWorld(this, store.theme, this.name);
    this.applyShadowSize();
    // El joystick escucha al contenedor: así el canvas se puede cambiar al variar la calidad.
    this.input = new Input(container, document.getElementById('joystick')!, document.getElementById('joy-knob')!, this.abort.signal);
    this.player = new Player(STATS.playerCapacity(0), LAYOUT.playerStart, loadLook(), loadPlayerName() ?? undefined);
    scene.add(this.player.group);
    this.register = new Register(this, LAYOUT.register);
    new TrashBin(this, this.trashPos);
    this.order = new SpecialOrder(this, LAYOUT.orderTruck);
    for (const def of this.unlocks) {
      this.buyZones.set(def.id, new BuyZone(this, def));
      if (def.kind === 'area') this.areas.set(def.id, new LockedArea(this, def.ref as AreaId));
    }
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
    this.cancelPlacing();
    this.save();
    this.renderer.setAnimationLoop(null);
    this.perf?.remove();
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
  /** Velocidad del jugador: la de las zapatillas, menos un 2,5 % por cada cosa que lleva (máx. −45 %). */
  get playerSpeed() {
    const load = Math.min(CARRY.maxSlow, CARRY.slowPerItem * this.player.stack.count);
    return STATS.playerSpeed(this.level('speed')) * (1 - load);
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
  get checkoutInterval() {
    return STATS.checkoutInterval(this.level('checkout'));
  }
  get patienceMult() {
    return STATS.patienceMult(this.level('decor'));
  }
  /** Multiplica la duración de los descansos del personal. */
  get restMultiplier() {
    return STATS.restMult(this.level('rest'));
  }
  /** Hay un cajero contratado y no está en su descanso. */
  get cashierOnDuty() {
    return this.workers.some((w) => w.role === 'cashier' && w.onDuty);
  }

  /** Aviso la primera vez que el cajero se va a descansar. */
  onCashierBreak() {
    if (this.warnedBreak) return;
    this.warnedBreak = true;
    this.hud.toast('☕ El cajero se ha tomado un descanso: ¡cubre tú la caja!', 4000);
  }

  hasBuilt(kinds: UnlockKind[]) {
    return this.unlocks.some((u) => kinds.includes(u.kind) && this.unlocked.has(u.id));
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
    const shelfCap = STATS.shelfCapacity(this.level('shelves'));
    for (const s of this.shelves) s.stack.capacity = shelfCap;
    const machineCap = STATS.machineCapacity(this.level('storage'));
    for (const p of this.processors) {
      p.output.capacity = machineCap;
      if (p.input) p.input.capacity = machineCap;
    }
  }

  // ───────── Mover estructuras ─────────

  /** Lo que se puede cambiar de sitio: lo ya construido con hueco propio, y la basura. */
  movables(): { id: string; label: string; icon: string; x: number; z: number }[] {
    const list = this.unlocks
      .filter((u) => this.unlocked.has(u.id) && (u.kind === 'shelf' || u.kind === 'field' || u.kind === 'machine'))
      .map((u) => ({ id: u.id, label: u.label, icon: u.icon, x: u.x, z: u.z }));
    list.push({ id: 'trash', label: 'Basura', icon: '🗑️', x: this.trashPos.x, z: this.trashPos.z });
    return list;
  }

  moveCost(id: string) {
    const def = this.unlockMap.get(id);
    const base = def ? def.price * 0.75 : 60 * this.store.costMult;
    return Math.max(30, Math.round(base / 5) * 5);
  }

  /** Espacio que ocupa algo (con sus zonas de uso), para que no se pisen al moverlo. */
  private footprint(kind: UnlockKind | 'trash', x: number, z: number): Box {
    if (kind === 'shelf') return { minX: x - 1.3, maxX: x + 1.3, minZ: z - 0.5, maxZ: z + 1.6 };
    if (kind === 'field' || kind === 'machine') return { minX: x - 3, maxX: x + 3, minZ: z - 1.8, maxZ: z + 1.8 };
    if (kind === 'trash') return { minX: x - 0.6, maxX: x + 0.6, minZ: z - 1.1, maxZ: z + 1.4 };
    return boxAt(x, z, 2.3, 2.3);
  }

  /** ¿Se puede poner `id` con su centro en (x, z)? */
  canPlace(id: string, x: number, z: number, built: Set<string> = this.unlocked) {
    const def = this.unlockMap.get(id);
    const kind = def?.kind ?? 'trash';
    const f = this.footprint(kind, x, z);
    const inside = (r: Box) => f.minX >= r.minX && f.maxX <= r.maxX && f.minZ >= r.minZ && f.maxZ <= r.maxZ;
    const hits = (r: Box) => f.minX < r.maxX && f.maxX > r.minX && f.minZ < r.maxZ && f.maxZ > r.minZ;
    const S = LAYOUT.store;
    const F = LAYOUT.farm;
    const B = LAYOUT.bounds;
    if (kind === 'shelf' && !inside({ minX: S.minX + 0.4, maxX: S.maxX, minZ: S.minZ + 0.4, maxZ: S.maxZ })) return false;
    if ((kind === 'field' || kind === 'machine') && !inside({ minX: F.minX, maxX: F.maxX, minZ: F.minZ + 0.2, maxZ: F.maxZ - 0.2 })) return false;
    if (kind === 'trash' && !inside({ minX: B.minX + 0.2, maxX: B.maxX, minZ: B.minZ + 0.4, maxZ: B.maxZ })) return false;
    for (const [aid, a] of Object.entries(LAYOUT.areas)) if (!built.has(`area:${aid}`) && hits(a.rect)) return false;
    // Caja, cola de clientes, entrada y otros puntos fijos.
    const fixed: Box[] = [
      boxAt(LAYOUT.register.x - 0.2, LAYOUT.register.z - 1.2, 3.4, 6),
      boxAt(LAYOUT.cashierZone.x, LAYOUT.cashierZone.z, 2.4, 2.4),
      { minX: -20, maxX: -9, minZ: 4, maxZ: 7.4 },
    ];
    if (fixed.some(hits)) return false;
    for (const u of this.unlocks) {
      if (u.id === id) continue;
      if (u.kind === 'area') {
        if (!built.has(u.id) && hits(boxAt(u.x, u.z, 2, 2))) return false;
        continue;
      }
      if (u.kind === 'cashier' && built.has(u.id)) continue;
      // Lo aún no comprado no cuenta: si le quitan el sitio, se recoloca al cargar.
      if (!built.has(u.id)) continue;
      if (hits(this.footprint(u.kind, u.x, u.z))) return false;
    }
    if (id !== 'trash' && hits(this.footprint('trash', this.trashPos.x, this.trashPos.z))) return false;
    return true;
  }

  /** Lo no comprado cuyo sitio ha quedado ocupado por algo movido pasa al hueco libre más cercano. */
  private relocateBlocked(built: Set<string>) {
    if (!Object.keys(this.moves).length) return;
    for (const u of this.unlocks) {
      if (built.has(u.id) || (u.kind !== 'shelf' && u.kind !== 'field' && u.kind !== 'machine')) continue;
      if (this.canPlace(u.id, u.x, u.z, built)) continue;
      let best: { x: number; z: number } | null = null;
      for (let r = 0.5; r <= 30 && !best; r += 0.5) {
        for (let a = 0; a < 360 && !best; a += 15) {
          const x = Math.round((u.x + Math.cos((a * Math.PI) / 180) * r) * 2) / 2;
          const z = Math.round((u.z + Math.sin((a * Math.PI) / 180) * r) * 2) / 2;
          if (this.canPlace(u.id, x, z, built)) best = { x, z };
        }
      }
      if (!best) continue;
      u.x = best.x;
      u.z = best.z;
      const a = areaAt(u.x, u.z);
      u.area = a && this.unlockMap.has(`area:${a}`) ? `area:${a}` : undefined;
      this.moves[u.id] = best;
      built.add(u.id); // los siguientes no se le pueden poner encima
    }
  }

  // ── Modo colocar: una silueta sigue al jugador y se confirma con el botón ──

  private placing: { id: string; ghost: THREE.Mesh; x: number; z: number; ok: boolean } | null = null;

  startPlacing(id: string) {
    const def = this.unlockMap.get(id);
    const f = this.footprint(def?.kind ?? 'trash', 0, 0);
    const ghost = new THREE.Mesh(
      new THREE.PlaneGeometry(f.maxX - f.minX, f.maxZ - f.minZ).rotateX(-Math.PI / 2).translate((f.minX + f.maxX) / 2, 0, (f.minZ + f.maxZ) / 2),
      new THREE.MeshBasicMaterial({ color: 0x66bb6a, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    scene.add(ghost);
    this.placing = { id, ghost, x: 0, z: 0, ok: false };
    this.hud.setPlacing(def?.label ?? 'Basura', this.moveCost(id));
    this.updatePlacing();
  }

  get isPlacing() {
    return !!this.placing;
  }

  private updatePlacing() {
    const p = this.placing;
    if (!p) return;
    p.x = Math.round(this.player.pos.x * 2) / 2;
    p.z = Math.round(this.player.pos.z * 2) / 2;
    p.ok = this.canPlace(p.id, p.x, p.z) && this.money >= this.moveCost(p.id);
    p.ghost.position.set(p.x, 0.06, p.z);
    (p.ghost.material as THREE.MeshBasicMaterial).color.setHex(p.ok ? 0x66bb6a : 0xef5350);
    this.hud.setPlaceOk(p.ok);
  }

  cancelPlacing() {
    if (!this.placing) return;
    scene.remove(this.placing.ghost);
    this.placing.ghost.geometry.dispose();
    this.placing = null;
    this.hud.setPlacing(null);
  }

  /** Paga y deja la estructura donde está la silueta; la tienda se vuelve a montar. */
  confirmPlacing() {
    const p = this.placing;
    if (!p) return;
    this.updatePlacing();
    if (!p.ok) {
      this.hud.toast('🚫 No cabe ahí: busca un sitio libre (silueta verde)');
      return;
    }
    this.money -= this.moveCost(p.id);
    this.moves[p.id] = { x: p.x, z: p.z };
    this.cancelPlacing();
    sfx.upgrade();
    this.save();
    this.nav.store(this.store.id);
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
        if (p.def.care && !instant && !this.processors.some((x) => x !== p && x.def.care))
          this.hud.toast('🐾 Los animales necesitan comida: mantén lleno su comedero o perderás reputación', 5000);
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
      case 'area': {
        const area = this.areas.get(def.id)!;
        area.open(!instant);
        if (!instant) {
          this.camFocus.push({ pos: area.center, t: 1.4 });
          this.hud.toast('🗺️ ¡Nueva zona desbloqueada! Ya tienes más espacio', 3500);
        }
        break;
      }
    }

    this.applyStats();
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
    // Al empezar solo se ofrece lo imprescindible para vender (estantería + producción):
    // así el dinero inicial no se puede gastar en algo que deje la tienda sin poder generar.
    const starter = this.unlocks.slice(0, this.store.startSteps);
    const inStarter = starter.some((u) => !this.unlocked.has(u.id));
    for (const def of inStarter ? starter : this.unlocks) {
      if (shown >= REVEAL_WINDOW) break;
      const z = this.buyZones.get(def.id)!;
      if (z.done) continue;
      if (def.area && !this.unlocked.has(def.area)) continue;
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
      const score = sink.stack.count / sink.stack.capacity + (sink.isShelf ? 0 : 0.2) - (sink.priority?.() ?? 0);
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
    // Con un menú abierto (pausa, mejoras, ajustes) basta con 10 FPS: ahorra batería.
    if (isModalOpen()) {
      if (now - this.lastModalFrame < 100) return;
      this.lastModalFrame = now;
    }
    if (settings.fpsLimit) {
      const interval = 1000 / settings.fpsLimit;
      const elapsed = now - this.lastFrame;
      // Margen de 2 ms para no perder fotogramas por la variación del refresco de pantalla.
      if (elapsed < interval - 2) return;
      this.lastFrame = now - (elapsed >= interval ? elapsed % interval : 0);
    }
    const raw = this.clock.getDelta();
    this.update(Math.min(raw, 1 / 20));
    const t0 = this.perf ? performance.now() : 0;
    this.renderer.render(scene, this.camera);
    if (this.perf) this.updatePerf(now, performance.now() - t0, raw);

    this.fpsFrames++;
    this.fpsTime += raw;
    if (this.fpsTime >= 0.5) {
      this.hud.setFps(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }

  private lastModalFrame = 0;
  /** Monitor `?perf` (ver PLAN-rendimiento.md): FPS, ms de render, llamadas de dibujo y memoria. */
  private perf: HTMLElement | null = new URLSearchParams(location.search).has('perf') ? document.body.appendChild(document.createElement('pre')) : null;
  private perfT = 0;
  private perfRender = 0;
  private perfFps = 60;

  private updatePerf(now: number, renderMs: number, dt: number) {
    const el = this.perf!;
    this.perfRender = this.perfRender * 0.9 + renderMs * 0.1;
    if (dt > 0) this.perfFps = this.perfFps * 0.9 + (1 / dt) * 0.1;
    if (now - this.perfT < 250) return;
    this.perfT = now;
    el.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99;margin:0;padding:6px 8px;font:11px/1.35 monospace;color:#9f9;background:rgb(0 0 0 / 0.75);border:1px solid #222;border-radius:6px;pointer-events:none';
    const info = this.renderer.info;
    const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    el.textContent = [
      `FPS ${this.perfFps.toFixed(0)} · resolución ×${this.renderer.getPixelRatio()}`,
      `render ${this.perfRender.toFixed(2)} ms`,
      `llamadas ${info.render.calls} · triángulos ${info.render.triangles}`,
      `geometrías ${info.memory.geometries} · texturas ${info.memory.textures}`,
      heap ? `heap ${(heap.usedJSHeapSize / 1048576).toFixed(1)} MB` : '',
    ].filter(Boolean).join('\n');
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
    if (this.over) return;
    this.elapsed += dt;
    this.stats.playTime += dt;
    const paused = isModalOpen();
    this.player.update(dt, paused ? { x: 0, y: 0 } : this.input.vector(), this.playerSpeed, this.obstacles);
    this.updateZones(dt, paused);

    this.updatePlacing();
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
    this.updateRush(dt);
    this.updateSpawner(dt);
    this.updateOrders(dt);
    this.updateThief(dt);
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

  /** Más reputación = más clientes; también lo ajusta la dificultad. */
  private updateSpawner(dt: number) {
    // Cualquier estantería abierta atrae clientes, aunque todavía no haya producto:
    // si no lo repones a tiempo, se irán enfadados.
    const types = shuffle([...new Set(this.shelves.map((s) => s.type))]);
    if (types.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const n = this.shelves.length;
    const repFactor = THREE.MathUtils.clamp(1.4 - (0.8 * this.rep) / REPUTATION.max, 0.6, 1.4);
    const rush = this.rushLeft > 0;
    this.spawnTimer =
      Math.max(1.6, 6.5 - n * 0.45) * this.difficulty.spawnMult * STATS.spawnMult(this.level('marketing')) * repFactor * (0.8 + Math.random() * 0.4) * (rush ? EVENTS.rushSpawnMult : 1);
    if (this.customers.length >= Math.min(16, 3 + n * 1.2) + (rush ? EVENTS.rushExtraCustomers : 0)) return;

    const vip = n >= 4 && Math.random() < REPUTATION.vipChance * this.difficulty.vipMult;
    const nTypes = Math.min(types.length, vip ? 3 : Math.random() < 0.2 ? 3 : randInt(1, 2));
    const wants: Want[] = types.slice(0, nTypes).map((type) => ({ type, qty: vip ? randInt(2, 3) : randInt(1, nTypes > 1 ? 2 : 3), got: 0 }));
    const items = wants.reduce((s, w) => s + w.qty, 0);
    const d = this.difficulty;
    const patience = (d.patienceBase + d.patiencePerItem * items) * this.patienceMult * (vip ? 0.75 : 1);
    this.customers.push(new Customer(this, wants, patience, vip));
    if (vip) this.hud.toast('👑 ¡Ha llegado un cliente VIP! Atiéndelo rápido', 3000);
  }

  // ───────── Horas punta y averías ─────────

  private updateRush(dt: number) {
    if (!this.difficulty.rushEvery || this.shelves.length < 2) return;
    if (this.rushLeft > 0) {
      this.rushLeft -= dt;
      if (this.rushLeft <= 0) this.hud.toast('😮‍💨 Se acabó la hora punta', 2500);
      return;
    }
    this.rushTimer -= dt;
    if (this.rushTimer > 0) return;
    this.rushTimer = this.difficulty.rushEvery;
    this.rushLeft = EVENTS.rushDuration;
    this.spawnTimer = 0;
    sfx.alarm();
    this.hud.toast('🔥 ¡Hora punta! Llegan muchos clientes durante 30 s', 3500);
  }

  onMachineBroken(p: Processor) {
    sfx.angry();
    if (!this.warnedBroken) {
      this.warnedBroken = true;
      this.hud.toast(`🔧 ¡Se ha averiado ${p.def.name}! Acércate para repararla`, 4000);
    }
  }

  onMachineFixed(p: Processor) {
    sfx.upgrade();
    this.float('🔧 ✓', '#b9f6ca', p.group.position, 2.6);
  }

  // ───────── Ladrón ─────────

  private updateThief(dt: number) {
    if (this.thief) {
      this.thief.update(dt);
      return;
    }
    this.thiefCooldown -= dt;
    const r = this.register;
    if (this.thiefCooldown > 0 || r.cashPile.count < THIEF.minBills || r.cashIdle < this.difficulty.thiefIdle) return;
    this.thief = new Thief(this, this.difficulty.thiefSpeed);
    sfx.alarm();
    this.hud.toast('🚨 ¡Un ladrón va a por el dinero de la caja! Corre a atraparlo', 4000);
  }

  /** El jugador lo toca: recupera lo robado y gana reputación. */
  onThiefCaught(t: Thief) {
    const loot = t.stolen;
    for (let it = t.stack.pop(); it; it = t.stack.pop()) {
      this.addMoney(it.value);
      consumeItem(it, this.player.pos.clone().setY(1.0), undefined, 0.25);
    }
    t.vanish();
    this.thief = null;
    this.thiefCooldown = THIEF.cooldown;
    sfx.caught();
    if (loot > 0) this.float(`+$${loot}`, '#ffd54f', t.group.position, 3.0);
    this.changeRep(THIEF.caughtRep, t.group.position);
    this.hud.toast(loot > 0 ? `👮 ¡Ladrón atrapado! Recuperas $${loot}` : '👮 ¡Ladrón atrapado!', 3000);
  }

  onThiefEscaped(t: Thief) {
    const loot = t.stolen;
    t.dispose();
    this.thief = null;
    this.thiefCooldown = THIEF.cooldown;
    if (loot <= 0) return;
    this.changeRep(THIEF.escapedRep * this.difficulty.penaltyMult);
    this.hud.toast(`💸 El ladrón escapó con $${loot}. Recoge el dinero de la caja más a menudo`, 4000);
  }

  // ───────── Pedidos especiales ─────────

  private updateOrders(dt: number) {
    const o = this.order;
    if (o.active) {
      o.update(dt);
      this.hud.setOrder(o);
      return;
    }
    this.orderTimer -= dt;
    if (this.orderTimer > 0) return;
    const types = shuffle([...new Set(this.shelves.filter((s) => this.sourcesFor(s.type).length > 0).map((s) => s.type))]);
    if (types.length < SPECIAL.minProducts) {
      this.orderTimer = 15;
      return;
    }
    const lines: OrderLine[] = types.slice(0, randInt(1, Math.min(3, types.length))).map((type) => ({ type, qty: randInt(3, 6), got: 0 }));
    const items = lines.reduce((s, l) => s + l.qty, 0);
    const value = lines.reduce((s, l) => s + (PRODUCTS[l.type]?.price ?? 0) * l.qty, 0) * this.store.saleMult;
    const time = (SPECIAL.baseTime + SPECIAL.perItem * items) * (this.difficulty.patienceBase / 38);
    o.start(lines, time, Math.round(value * SPECIAL.rewardMult));
    this.hud.setOrder(o);
    sfx.upgrade();
    this.hud.toast(`📦 ¡Pedido especial! ${lines.map((l) => `${l.qty} ${itemEmoji(l.type)}`).join(' + ')} · recompensa $${o.reward}`, 4000);
  }

  private endOrder() {
    this.order.close();
    this.hud.setOrder(null);
    this.orderTimer = rand(SPECIAL.intervalMin, SPECIAL.intervalMax);
  }

  onOrderDelivered() {
    const o = this.order;
    this.addMoney(o.reward);
    this.stats.earned += o.reward;
    this.float(`+$${o.reward}`, '#ffd54f', LAYOUT.orderTruck, 3.2);
    this.changeRep(SPECIAL.rep, LAYOUT.orderTruck);
    sfx.unlock();
    this.hud.toast(`🎉 ¡Pedido entregado! +$${o.reward}`, 3000);
    this.endOrder();
  }

  onOrderExpired() {
    this.hud.toast('⌛ El pedido especial ha caducado', 3000);
    this.changeRep(SPECIAL.failRep * this.difficulty.penaltyMult, LAYOUT.orderTruck);
    this.endOrder();
  }

  /** Rechazar no penaliza, pero se pierde la recompensa. */
  rejectOrder() {
    if (!this.order.active) return;
    this.endOrder();
  }

  // ───────── Reputación ─────────

  /** El cliente terminó de pagar: reputación según lo rápido que fue y propina. */
  onCustomerPaid(c: Customer) {
    const R = REPUTATION;
    const vipM = c.vip ? R.vipMult : 1;
    let delta: number;
    let face: string;
    let tip = 0;
    if (c.partial) {
      delta = R.partial * this.difficulty.penaltyMult * vipM;
      face = '😕';
    } else if (c.mood >= R.greatRatio) {
      delta = R.great * vipM;
      tip = Math.max(1, Math.round(c.spent * R.tipRate * this.difficulty.tipMult * vipM));
      face = '😄';
    } else {
      delta = R.ok * vipM;
      face = '🙂';
    }
    this.stats.served++;
    this.stats.earned += c.spent;
    if (tip > 0) {
      this.stats.tips += tip;
      this.register.addCash(tip);
      this.float(`+$${tip}`, '#ffd54f', c.group.position, 3.0);
    }
    c.leave(face);
    this.changeRep(delta, c.group.position);
  }

  /** Un hábitat lleva un rato sin comida. */
  onPetsHungry(p: Processor) {
    if (!this.warnedHungry) {
      this.warnedHungry = true;
      this.hud.toast(`😿 ¡Los animales del ${p.def.name} tienen hambre! Llena su comedero`, 4000);
    }
    this.changeRep(CARE.penalty * this.difficulty.penaltyMult, p.group.position);
  }

  /** El cliente se fue sin comprar. */
  onCustomerLost(c: Customer) {
    const vipM = c.vip ? REPUTATION.vipMult : 1;
    this.stats.lost++;
    c.leave('😡');
    sfx.angry();
    this.changeRep(REPUTATION.angry * this.difficulty.penaltyMult * vipM, c.group.position);
  }

  changeRep(raw: number, at?: THREE.Vector3) {
    if (this.over) return;
    const delta = raw > 0 ? Math.max(1, Math.round(raw)) : Math.min(-1, Math.round(raw));
    const prev = this.rep;
    this.rep = Math.min(REPUTATION.max, this.rep + delta);
    if (!this.difficulty.canLose) this.rep = Math.max(0, this.rep);
    if (at) this.float(`${delta > 0 ? '+' : ''}${delta} ⭐`, delta > 0 ? '#b9f6ca' : '#ff8a80', at, 2.5);
    this.hud.setRep(this.rep, this.difficulty);
    setMusicMood(this.rep / REPUTATION.max);
    if (this.rep < REPUTATION.warning && prev >= REPUTATION.warning) {
      this.hud.toast(
        this.difficulty.canLose ? '⚠️ ¡Reputación muy baja! Si baja de 0, la tienda cerrará' : '⚠️ Tus clientes están descontentos',
        4000,
      );
    }
    if (this.rep < 0 && this.difficulty.canLose) this.gameOver();
  }

  private float(text: string, color: string, at: THREE.Vector3, y: number) {
    const s = floatingText(text, color);
    s.position.set(at.x, y, at.z);
    scene.add(s);
    const mat = s.material;
    addTween(
      1.3,
      (k) => {
        s.position.y = y + k * 1.2;
        mat.opacity = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      },
      () => {
        scene.remove(s);
        mat.map?.dispose();
        mat.dispose();
      },
    );
  }

  /** Reputación negativa: la tienda cierra y se pierde su progreso. */
  private gameOver() {
    this.over = true;
    clearStoreProgress(this.store.id);
    this.hud.setAction(null);
    const s = this.stats;
    const mins = Math.floor(s.playTime / 60);
    const body = `
      <p class="big-emoji">🔒</p>
      <p class="center">Los clientes dejaron de confiar en <b>${this.name}</b> y la tienda ha cerrado.<br>Has perdido su progreso.</p>
      <div class="stats">
        <div><b>${s.served}</b><small>clientes atendidos</small></div>
        <div><b>${s.lost}</b><small>clientes perdidos</small></div>
        <div><b>$${Math.floor(s.earned)}</b><small>ventas</small></div>
        <div><b>${mins} min</b><small>abierta</small></div>
      </div>
      <p class="center muted">Consejo: contrata pronto un cajero y no dejes que se acumule la cola.</p>`;
    let chosen = false;
    openModal(
      'Tienda cerrada',
      body,
      [
        { label: '🏠 Menú', onClick: () => ((chosen = true), this.nav.menu()) },
        { label: '🔄 Volver a empezar', primary: true, onClick: () => ((chosen = true), this.nav.restart(this.store.id)) },
      ],
      // Cerrar con ✕ o fuera de la ventana: al menú.
      () => setTimeout(() => !chosen && this.nav.menu(), 0),
    );
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

    if (this.thief && this.thief.state !== 'done') {
      target = this.thief.group.position;
      text = '🚨 ¡Atrapa al ladrón! Choca con él';
    } else if (this.processors.some((x) => x.broken)) {
      const m = this.processors.find((x) => x.broken)!;
      target = m.group.position;
      text = `🔧 Repara ${m.def.name}: quédate a su lado`;
    } else if (this.unlocked.size < 2 && affordable.length) {
      target = affordable[0].pos;
      text = `${verb} para comprar: ${affordable[0].def.label}`;
    } else if (this.processors.some((p) => p.hungry || (p.def.care && p.hunger < 0.3 && p.input?.count === 0))) {
      const p = this.processors.find((x) => x.hungry || (x.def.care && x.hunger < 0.3 && x.input?.count === 0))!;
      target = p.sink!.access;
      text = `😿 Los animales del ${p.def.name} tienen hambre: lleva ${itemName(p.inputType!)}`;
    } else if (this.order.active && this.order.needs.some((t) => p.stack.has(t))) {
      target = this.order.pos;
      text = '📦 Entrega el pedido especial en el camión';
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
        target = this.trashPos;
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
    if (this.over) return;
    const paid: Record<string, number> = {};
    for (const [id, z] of this.buyZones) if (!z.done && z.paid > 0) paid[id] = z.paid;
    saveStore(this.store.id, { money: Math.floor(this.money), unlocked: [...this.unlocked], paid, upgrades: this.upgrades, rep: this.rep, stats: this.stats, moves: this.moves });
  }

  private loadGame() {
    const data = loadStore(this.store.id);
    if (data) {
      this.money = data.money;
      this.upgrades = { ...data.upgrades };
      if (typeof data.rep === 'number') this.rep = data.rep;
      if (data.stats) this.stats = { ...this.stats, ...data.stats };
      for (const def of this.unlocks) if (data.unlocked.includes(def.id)) this.unlock(def.id, true);
      for (const def of this.unlocks) if (def.area && this.unlocked.has(def.id)) this.unlock(def.area, true);
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
    this.hud.setRep(this.rep, this.difficulty);
    setMusicMood(this.rep / REPUTATION.max);
  }
}
