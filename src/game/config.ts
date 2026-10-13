import * as THREE from 'three';

export const GAME_NAME = 'McL Arcade';

// ───────── Ritmo y capacidades ─────────

export const SHELF_CAPACITY = 12;
export const PROCESSOR_CAPACITY = 8;
export const CASH_PILE_CAPACITY = 40;
export const CUSTOMER_CAPACITY = 6;
export const CUSTOMER_PATIENCE = 24;
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
};

// ───────── Mejoras ─────────

export type UpgradeId = 'capacity' | 'speed' | 'growth' | 'machines' | 'staff';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: string;
  desc: string;
  base: number;
  growth: number;
  max: number;
  /** Visible cuando hay algo construido de este tipo. */
  requires?: 'field' | 'machine' | 'stocker';
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'capacity', name: 'Mochila', icon: '🎒', desc: '+2 de carga', base: 25, growth: 1.6, max: 10 },
  { id: 'speed', name: 'Zapatillas', icon: '👟', desc: '+8% de velocidad', base: 30, growth: 1.6, max: 8 },
  { id: 'growth', name: 'Abono', icon: '🌱', desc: 'Cultivos un 12% más rápidos', base: 40, growth: 1.65, max: 8, requires: 'field' },
  { id: 'machines', name: 'Maquinaria', icon: '⚙️', desc: 'Máquinas un 12% más rápidas', base: 60, growth: 1.7, max: 8, requires: 'machine' },
  { id: 'staff', name: 'Formación', icon: '🎓', desc: 'Reponedores más rápidos y con más carga', base: 80, growth: 1.7, max: 8, requires: 'stocker' },
];

export const upgradeCost = (u: UpgradeDef, lvl: number, mult: number) => Math.round((u.base * Math.pow(u.growth, lvl) * mult) / 5) * 5;
