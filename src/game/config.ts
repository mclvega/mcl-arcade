import * as THREE from 'three';

export const GAME_NAME = 'McL Arcade';

// ───────── Ritmo y capacidades ─────────

export const SHELF_CAPACITY = 12;
export const PROCESSOR_CAPACITY = 8;
export const CASH_PILE_CAPACITY = 40;
export const CUSTOMER_CAPACITY = 6;
export const CUSTOMER_SPEED = 2.6;
export const CHECKOUT_INTERVAL = 0.2;
/** Cuántas zonas de compra se muestran a la vez. */
export const REVEAL_WINDOW = 3;
/** Los generadores (establo, mina…) tardan más que una máquina normal. */
export const GENERATOR_TIME_MULT = 1.5;

export const STATS = {
  playerCapacity: (lvl: number) => 6 + 2 * lvl,
  playerSpeed: (lvl: number) => 4.8 * (1 + 0.08 * lvl),
  growTime: (lvl: number) => 5 * Math.pow(0.88, lvl),
  processTime: (lvl: number) => 3 * Math.pow(0.88, lvl),
  staffSpeed: (lvl: number) => 3.2 * (1 + 0.1 * lvl),
  staffCapacity: (lvl: number) => 4 + lvl,
  machineCapacity: (lvl: number) => 8 + 2 * lvl,
  shelfCapacity: (lvl: number) => 12 + 4 * lvl,
  checkoutInterval: (lvl: number) => 0.2 * Math.pow(0.87, lvl),
  patienceMult: (lvl: number) => 1 + 0.08 * lvl,
  spawnMult: (lvl: number) => Math.pow(0.93, lvl),
  restMult: (lvl: number) => Math.pow(0.88, lvl),
};

// ───────── Dificultad y reputación ─────────

export type DifficultyId = 'relax' | 'easy' | 'normal' | 'hard' | 'expert' | 'nightmare';

export interface DifficultyDef {
  label: string;
  emoji: string;
  desc: string;
  /** Paciencia de cada cliente: base + por cada producto del pedido (segundos). */
  patienceBase: number;
  patiencePerItem: number;
  /** Multiplica las pérdidas de reputación. */
  penaltyMult: number;
  /** Multiplica las propinas. */
  tipMult: number;
  /** Multiplica el tiempo entre clientes (menos = más clientes). */
  spawnMult: number;
  startRep: number;
  /** Si la reputación baja de 0, la tienda cierra. */
  canLose: boolean;
  /** Reponedor: viajes antes de descansar y segundos de descanso. */
  stockerTrips: number;
  stockerRest: number;
  /** Cajero: segundos de turno y de descanso (la caja queda sin atender). */
  cashierShift: number;
  cashierBreak: number;
  /** Segundos con dinero sin recoger en la caja hasta que aparece un ladrón, y su velocidad. */
  thiefIdle: number;
  thiefSpeed: number;
  /** Cada cuántos segundos hay una hora punta (oleada de clientes). 0 = nunca. */
  rushEvery: number;
  /** Probabilidad de avería por máquina y minuto de trabajo. 0 = nunca. */
  breakdownRate: number;
  /** Multiplica la probabilidad de clientes VIP. */
  vipMult: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  relax: { label: 'Relajado', emoji: '😌', desc: 'Clientes muy pacientes. La tienda nunca cierra.', patienceBase: 70, patiencePerItem: 8, penaltyMult: 0.5, tipMult: 0.5, spawnMult: 1.15, startRep: 50, canLose: false, stockerTrips: 8, stockerRest: 4, cashierShift: 120, cashierBreak: 6, thiefIdle: 45, thiefSpeed: 3.0, rushEvery: 0, breakdownRate: 0, vipMult: 0.5 },
  easy: { label: 'Fácil', emoji: '🙂', desc: 'Clientes pacientes y castigos suaves.', patienceBase: 50, patiencePerItem: 6, penaltyMult: 0.6, tipMult: 0.8, spawnMult: 1.05, startRep: 60, canLose: true, stockerTrips: 6, stockerRest: 6, cashierShift: 90, cashierBreak: 8, thiefIdle: 32, thiefSpeed: 3.4, rushEvery: 0, breakdownRate: 0, vipMult: 0.8 },
  normal: { label: 'Normal', emoji: '😐', desc: 'El reto equilibrado.', patienceBase: 38, patiencePerItem: 5, penaltyMult: 1, tipMult: 1, spawnMult: 1, startRep: 50, canLose: true, stockerTrips: 4, stockerRest: 8, cashierShift: 60, cashierBreak: 10, thiefIdle: 24, thiefSpeed: 3.8, rushEvery: 240, breakdownRate: 0, vipMult: 1 },
  hard: { label: 'Difícil', emoji: '😤', desc: 'Poca paciencia y castigos duros, pero mejores propinas.', patienceBase: 27, patiencePerItem: 4, penaltyMult: 1.5, tipMult: 1.6, spawnMult: 0.9, startRep: 40, canLose: true, stockerTrips: 3, stockerRest: 12, cashierShift: 45, cashierBreak: 14, thiefIdle: 16, thiefSpeed: 4.3, rushEvery: 180, breakdownRate: 0.05, vipMult: 1.3 },
  expert: {
    label: 'Experto',
    emoji: '💀',
    desc: 'Clientes exigentes, ladrones veloces y averías frecuentes.',
    patienceBase: 22,
    patiencePerItem: 3.5,
    penaltyMult: 2,
    tipMult: 2,
    spawnMult: 0.85,
    startRep: 35,
    canLose: true,
    stockerTrips: 3,
    stockerRest: 14,
    cashierShift: 40,
    cashierBreak: 16,
    thiefIdle: 12,
    thiefSpeed: 4.6,
    rushEvery: 150,
    breakdownRate: 0.08,
    vipMult: 1.6,
  },
  nightmare: {
    label: 'Pesadilla',
    emoji: '🔥',
    desc: 'Solo para valientes: todo falla, nadie espera y cada error cuesta caro.',
    patienceBase: 17,
    patiencePerItem: 3,
    penaltyMult: 2.5,
    tipMult: 2.5,
    spawnMult: 0.8,
    startRep: 30,
    canLose: true,
    stockerTrips: 2,
    stockerRest: 16,
    cashierShift: 35,
    cashierBreak: 18,
    thiefIdle: 9,
    thiefSpeed: 4.9,
    rushEvery: 120,
    breakdownRate: 0.12,
    vipMult: 2,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['relax', 'easy', 'normal', 'hard', 'expert', 'nightmare'];

/** Horas punta y averías. */
export const EVENTS = {
  rushDuration: 30,
  /** Durante la hora punta los clientes llegan este factor más a menudo… */
  rushSpawnMult: 0.35,
  /** …y caben estos clientes más en la tienda. */
  rushExtraCustomers: 6,
  /** Segundos junto a la máquina para repararla. */
  repairTime: 2.5,
};

/** Resumen de las mecánicas extra de una dificultad (para el selector). */
export function difficultyFeatures(d: DifficultyDef): string {
  const f: string[] = [];
  if (d.rushEvery) f.push(`horas punta cada ${Math.round(d.rushEvery / 60)} min`);
  if (d.breakdownRate) f.push('averías de máquinas');
  if (!d.canLose) f.push('la tienda nunca cierra');
  return f.length ? ` (${f.join(', ')})` : '';
}

/** Cambios de reputación (0–100) según cómo acaba cada cliente. */
export const REPUTATION = {
  max: 100,
  warning: 20,
  /** Pedido completo con más de la mitad de la paciencia: reputación + propina. */
  great: 3,
  greatRatio: 0.5,
  tipRate: 0.25,
  ok: 1,
  /** Se le acabó la paciencia comprando: paga lo que lleva. */
  partial: -3,
  /** Se fue sin comprar nada. */
  angry: -8,
  /** Tiempo extra en la cola cuando se cansa de esperar en las estanterías. */
  lastChance: 12,
  vipChance: 0.08,
  vipMult: 2,
};

/** Hábitats de mascotas: el comedero se vacía y hay que rellenarlo. */
export const CARE = {
  /** Segundos que tarda en vaciarse la barra de comida. */
  drainTime: 45,
  /** Come de su comedero cuando baja de este nivel… */
  feedAt: 0.6,
  /** …y recupera esta cantidad por ración. */
  feedAmount: 0.5,
  /** Con hambre: pierde reputación cada tantos segundos. */
  penaltyEvery: 8,
  penalty: -1,
};

/** Ladrón: aparece si se acumula dinero sin recoger en la caja. */
export const THIEF = {
  /** Billetes mínimos en la caja para que merezca la pena robar. */
  minBills: 4,
  /** Tiempo mínimo entre ladrones. */
  cooldown: 60,
  catchRadius: 0.9,
  grabInterval: 0.3,
  maxBills: 14,
  caughtRep: 2,
  escapedRep: -4,
};

/** Pedidos especiales: un camión pide varios productos con tiempo límite. */
export const SPECIAL = {
  firstDelay: 90,
  intervalMin: 120,
  intervalMax: 180,
  /** Hace falta tener al menos estas estanterías con producción. */
  minProducts: 2,
  /** Tiempo límite: base + por unidad (se ajusta con la dificultad). */
  baseTime: 45,
  perItem: 9,
  /** Recompensa = valor de venta × este multiplicador. */
  rewardMult: 2.5,
  rep: 6,
  failRep: -4,
};

// ───────── Calidad gráfica ─────────

export const QUALITY = {
  low: { label: 'Baja', maxPixelRatio: 0.75, antialias: false, shadows: false, shadowSize: 1024, softShadows: false },
  medium: { label: 'Media', maxPixelRatio: 1.25, antialias: true, shadows: true, shadowSize: 1024, softShadows: false },
  high: { label: 'Alta', maxPixelRatio: 2, antialias: true, shadows: true, shadowSize: 2048, softShadows: true },
} as const;

/** Cuanto más lleva encima el jugador, más lento camina. */
export const CARRY = {
  slowPerItem: 0.025,
  maxSlow: 0.45,
};

// ───────── Mapa (común a todas las tiendas) ─────────

const v = (x: number, z: number) => new THREE.Vector3(x, 0, z);

const SHELF_XS = [-7.5, -4.3, -1.1];
const SHELF_ZS = [3.2, -0.4, -4, -7.6];
const FARM_XS = [7.5, 13.5, 19.5, 25.5];
const FARM_ZS = [-7.5, -3.5, 0.5, 4.5, 8.5];

export const LAYOUT = {
  store: { minX: -16, maxX: 2, minZ: -10, maxZ: 8 },
  farm: { minX: 4, maxX: 29.5, minZ: -10, maxZ: 11.5 },
  doorZ: 5.2,
  register: v(-13, -1),
  playerStart: v(-9, 2),
  bounds: { minX: -15.6, maxX: 29, minZ: -9.6, maxZ: 11.2 },
  path: { spawn: v(-19.5, 5.2), door: v(-15.3, 5.2), inside: v(-10, 5.2), exit: v(-9.6, 6.8) },
  /** De delante hacia el fondo de la tienda. */
  shelfSlots: SHELF_ZS.flatMap((z) => SHELF_XS.map((x) => v(x, z))),
  /** Ordenadas por cercanía a la tienda. */
  farmSlots: FARM_XS.flatMap((x) => FARM_ZS.map((z) => v(x, z))).sort(
    (a, b) => Math.hypot(a.x - 3, (a.z - 0.5) * 1.2) - Math.hypot(b.x - 3, (b.z - 0.5) * 1.2),
  ),
  staffHomes: [v(3, 3.8), v(3, 5.6), v(3, 7.4)],
  cashierZone: v(-14.4, -6),
  expansionZone: v(-5.5, 6.4),
  trash: v(3, -1.5),
  /** Camión de pedidos especiales, delante de la tienda. */
  orderTruck: v(-1, 10.3),
  /**
   * Zonas que se compran para ampliar el mapa. Las estanterías desde `fromShelf`
   * y los puestos de producción desde `fromFarm` quedan dentro de su zona.
   */
  areas: {
    store: {
      label: 'Ampliar tienda',
      icon: '🏪',
      fromShelf: 6,
      rect: { minX: -10.2, maxX: 2, minZ: -10, maxZ: -2.2 },
      barriers: [
        [-10.2, -2.2, 2, -2.2],
        [-10.2, -10, -10.2, -2.2],
        [2, -10, 2, -2.2],
      ] as [number, number, number, number][],
      buy: v(0.9, -1.55),
    },
    farm: {
      label: 'Ampliar producción',
      icon: '🚜',
      fromFarm: 10,
      rect: { minX: 16.5, maxX: 29.5, minZ: -10, maxZ: 11.5 },
      barriers: [[16.5, -10, 16.5, 11.5]] as [number, number, number, number][],
      buy: v(16.2, 10.4),
    },
  },
};

export type AreaId = keyof typeof LAYOUT.areas;

// ───────── Mejoras ─────────

export type UpgradeId =
  | 'capacity' | 'speed'
  | 'growth' | 'machines' | 'storage'
  | 'shelves' | 'checkout' | 'decor' | 'marketing'
  | 'staff' | 'rest';

export type UpgradeCategory = 'player' | 'production' | 'store' | 'staff';

export const UPGRADE_CATEGORIES: { id: UpgradeCategory; title: string }[] = [
  { id: 'player', title: '👤 Jugador' },
  { id: 'production', title: '🏭 Producción' },
  { id: 'store', title: '🏪 Tienda' },
  { id: 'staff', title: '👷 Personal' },
];

export interface UpgradeDef {
  id: UpgradeId;
  category: UpgradeCategory;
  name: string;
  icon: string;
  desc: string;
  base: number;
  growth: number;
  max: number;
  /** Visible cuando hay construido algo de alguno de estos tipos. */
  requires?: ('shelf' | 'field' | 'machine' | 'cashier' | 'stocker')[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'capacity', category: 'player', name: 'Mochila', icon: '🎒', desc: 'Capacidad: +2 de carga', base: 25, growth: 1.6, max: 10 },
  { id: 'speed', category: 'player', name: 'Zapatillas', icon: '👟', desc: 'Velocidad: +8% (compensa ir cargado)', base: 30, growth: 1.6, max: 8 },
  { id: 'growth', category: 'production', name: 'Abono', icon: '🌱', desc: 'Cultivos un 12% más rápidos', base: 40, growth: 1.65, max: 8, requires: ['field'] },
  { id: 'machines', category: 'production', name: 'Maquinaria', icon: '⚙️', desc: 'Rendimiento: máquinas un 12% más rápidas', base: 60, growth: 1.7, max: 8, requires: ['machine'] },
  { id: 'storage', category: 'production', name: 'Palés grandes', icon: '📦', desc: 'Capacidad: +2 en entrada y salida de máquinas', base: 50, growth: 1.6, max: 6, requires: ['machine'] },
  { id: 'shelves', category: 'store', name: 'Estanterías grandes', icon: '🗄️', desc: 'Capacidad: +4 productos por estantería', base: 45, growth: 1.6, max: 6, requires: ['shelf'] },
  { id: 'checkout', category: 'store', name: 'Caja rápida', icon: '🧾', desc: 'Rendimiento: se cobra un 15% más rápido', base: 40, growth: 1.6, max: 6, requires: ['shelf'] },
  { id: 'decor', category: 'store', name: 'Decoración', icon: '🪴', desc: 'Clientes un 8% más pacientes', base: 60, growth: 1.7, max: 6, requires: ['shelf'] },
  { id: 'marketing', category: 'store', name: 'Publicidad', icon: '📣', desc: 'Llegan un 7% más de clientes', base: 70, growth: 1.75, max: 6, requires: ['shelf'] },
  { id: 'staff', category: 'staff', name: 'Formación', icon: '🎓', desc: 'Reponedores: +1 de carga y +10% de velocidad', base: 80, growth: 1.7, max: 8, requires: ['stocker'] },
  { id: 'rest', category: 'staff', name: 'Sala de descanso', icon: '☕', desc: 'Descansos del personal un 12% más cortos', base: 70, growth: 1.7, max: 6, requires: ['cashier', 'stocker'] },
];

export const upgradeCost = (u: UpgradeDef, lvl: number, mult: number) => Math.round((u.base * Math.pow(u.growth, lvl) * mult) / 5) * 5;
