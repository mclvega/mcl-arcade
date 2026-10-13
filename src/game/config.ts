import * as THREE from 'three';
import type { ItemType } from './items';

// ───────── Economía y ritmo (equilibrar aquí, no en la lógica) ─────────

export const START_MONEY = 20;
export const PRICES: Partial<Record<ItemType, number>> = { tomato: 3, bread: 8, egg: 6 };

export const SHELF_CAPACITY = 12;
export const PROCESSOR_CAPACITY = 8;
export const CASH_PILE_CAPACITY = 36;
export const CUSTOMER_CAPACITY = 6;
export const CUSTOMER_PATIENCE = 22;
export const CUSTOMER_SPEED = 2.4;
export const CHECKOUT_INTERVAL = 0.22;

export const STATS = {
  playerCapacity: (lvl: number) => 6 + 2 * lvl,
  playerSpeed: (lvl: number) => 4.6 * (1 + 0.08 * lvl),
  growTime: (lvl: number) => 5 * Math.pow(0.88, lvl),
  processTime: (lvl: number) => 3 * Math.pow(0.88, lvl),
  staffSpeed: (lvl: number) => 3.2 * (1 + 0.1 * lvl),
  staffCapacity: (lvl: number) => 4 + lvl,
};

// ───────── Mapa ─────────

export const REGISTER_POS = new THREE.Vector3(-9, 0, 0);
export const PLAYER_START = new THREE.Vector3(-6, 0, 1.5);
export const BOUNDS = { minX: -11.6, maxX: 19, minZ: -7.6, maxZ: 9.5 };
export const CUSTOMER_PATH = {
  spawn: new THREE.Vector3(-15.5, 0, 4),
  door: new THREE.Vector3(-11.4, 0, 4),
  inside: new THREE.Vector3(-6.5, 0, 4),
  exit: new THREE.Vector3(-6.2, 0, 5.6),
};

// ───────── Desbloqueos (orden y precios) ─────────

export type UnlockKind = 'shelf' | 'plot' | 'processor' | 'cashier' | 'stocker';

export interface UnlockDef {
  id: string;
  label: string;
  icon: string;
  price: number;
  x: number;
  z: number;
  /** Se muestra cuando todos estos están comprados. */
  requires: string[];
  kind: UnlockKind;
  product?: ItemType;
  input?: ItemType;
  output?: ItemType;
  machine?: 'oven' | 'coop';
}

export const UNLOCKS: UnlockDef[] = [
  { id: 'shelf_tomato', label: 'Estantería', icon: '🍅', price: 10, x: -4, z: -5, requires: [], kind: 'shelf', product: 'tomato' },
  { id: 'plot_tomato', label: 'Huerto', icon: '🍅', price: 10, x: 7, z: -5, requires: ['shelf_tomato'], kind: 'plot', product: 'tomato' },
  { id: 'plot_tomato2', label: 'Huerto', icon: '🍅', price: 30, x: 7, z: -1, requires: ['plot_tomato'], kind: 'plot', product: 'tomato' },
  { id: 'cashier', label: 'Cajero', icon: '🙋', price: 60, x: -10.5, z: -3.5, requires: ['plot_tomato'], kind: 'cashier' },
  { id: 'plot_wheat', label: 'Trigal', icon: '🌾', price: 40, x: 12, z: -5, requires: ['plot_tomato2'], kind: 'plot', product: 'wheat' },
  { id: 'oven', label: 'Horno', icon: '🔥', price: 60, x: 12, z: 4, requires: ['plot_wheat'], kind: 'processor', input: 'wheat', output: 'bread', machine: 'oven' },
  { id: 'shelf_bread', label: 'Estantería', icon: '🍞', price: 45, x: -1, z: -5, requires: ['oven'], kind: 'shelf', product: 'bread' },
  { id: 'coop', label: 'Gallinero', icon: '🐔', price: 70, x: 6.5, z: 4, requires: ['plot_tomato2'], kind: 'processor', input: 'tomato', output: 'egg', machine: 'coop' },
  { id: 'shelf_egg', label: 'Estantería', icon: '🥚', price: 55, x: -4, z: -1, requires: ['coop'], kind: 'shelf', product: 'egg' },
  { id: 'stocker', label: 'Reponedor', icon: '🧺', price: 150, x: 0, z: 3, requires: ['shelf_bread'], kind: 'stocker' },
  { id: 'shelf_tomato2', label: 'Estantería', icon: '🍅', price: 80, x: -1, z: -1, requires: ['shelf_egg'], kind: 'shelf', product: 'tomato' },
  { id: 'plot_wheat2', label: 'Trigal', icon: '🌾', price: 90, x: 12, z: -1, requires: ['shelf_bread'], kind: 'plot', product: 'wheat' },
  { id: 'stocker2', label: 'Reponedor', icon: '🧺', price: 250, x: 1.8, z: 3, requires: ['stocker', 'shelf_egg'], kind: 'stocker' },
];

// ───────── Mejoras ─────────

export interface UpgradeDef {
  id: 'capacity' | 'speed' | 'growth' | 'machines' | 'staff';
  name: string;
  icon: string;
  desc: string;
  base: number;
  growth: number;
  max: number;
  /** Visible si alguno de estos desbloqueos está comprado. */
  requiresAny?: string[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'capacity', name: 'Mochila', icon: '🎒', desc: '+2 de carga', base: 25, growth: 1.6, max: 10 },
  { id: 'speed', name: 'Zapatillas', icon: '👟', desc: '+8% de velocidad', base: 30, growth: 1.6, max: 8 },
  { id: 'growth', name: 'Abono', icon: '🌱', desc: 'Cultivos un 12% más rápidos', base: 40, growth: 1.65, max: 8, requiresAny: ['plot_tomato'] },
  { id: 'machines', name: 'Maquinaria', icon: '⚙️', desc: 'Máquinas un 12% más rápidas', base: 60, growth: 1.7, max: 8, requiresAny: ['oven', 'coop'] },
  { id: 'staff', name: 'Formación', icon: '🎓', desc: 'Reponedores más rápidos y con más carga', base: 80, growth: 1.7, max: 8, requiresAny: ['stocker'] },
];

export const upgradeCost = (u: UpgradeDef, lvl: number) => Math.round(u.base * Math.pow(u.growth, lvl));
