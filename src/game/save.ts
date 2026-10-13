import { DEFAULT_LOOK, type Look } from './characters';
import type { DifficultyId } from './config';
import { STORES, type StoreDef } from './stores';

const PREFIX = 'mcl-arcade:v1';

export interface StoreSave {
  money: number;
  unlocked: string[];
  paid: Record<string, number>;
  upgrades: Record<string, number>;
  rep?: number;
  stats?: StoreStats;
}

export interface StoreStats {
  served: number;
  lost: number;
  earned: number;
  tips: number;
  playTime: number;
}

interface MetaSave {
  unlockedStores: string[];
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* modo privado o almacenamiento bloqueado: se juega sin guardar */
  }
}

export const loadStore = (id: string) => read<StoreSave>(`${PREFIX}:store:${id}`);
export const saveStore = (id: string, data: StoreSave) => write(`${PREFIX}:store:${id}`, data);

/** Nombre que el jugador le puso a la tienda. */
export const loadStoreName = (id: string) => read<string>(`${PREFIX}:name:${id}`);
export const saveStoreName = (id: string, name: string) => write(`${PREFIX}:name:${id}`, name);
export const displayName = (store: StoreDef) => loadStoreName(store.id) || store.name;

/** Dificultad elegida al abrir la tienda. */
export const loadDifficulty = (id: string): DifficultyId => read<DifficultyId>(`${PREFIX}:difficulty:${id}`) ?? 'normal';
export const saveDifficulty = (id: string, d: DifficultyId) => write(`${PREFIX}:difficulty:${id}`, d);

/** Al cerrar la tienda: se pierde su progreso (se conservan nombre y dificultad). */
export function clearStoreProgress(id: string) {
  try {
    localStorage.removeItem(`${PREFIX}:store:${id}`);
  } catch {
    /* sin almacenamiento */
  }
}

/** Apariencia del personaje del jugador. */
export function loadLook(): Look {
  const saved = (read<Record<string, unknown>>(`${PREFIX}:look`) ?? {}) as Omit<Partial<Look>, 'accessory'> & { accessory?: string };
  if (saved.accessory === 'mustache') {
    saved.accessory = 'none';
    saved.facialHair = 'mustache';
  }
  return { ...DEFAULT_LOOK, ...(saved as Partial<Look>) };
}
export const saveLook = (look: Look) => write(`${PREFIX}:look`, look);

export const loadPlayerName = () => read<string>(`${PREFIX}:player`);
export const savePlayerName = (name: string) => write(`${PREFIX}:player`, name);

function loadMeta(): MetaSave {
  return read<MetaSave>(`${PREFIX}:meta`) ?? { unlockedStores: [] };
}

export function isStoreUnlocked(id: string) {
  return id === STORES[0].id || loadMeta().unlockedStores.includes(id);
}

export function unlockStore(id: string) {
  const meta = loadMeta();
  if (!meta.unlockedStores.includes(id)) meta.unlockedStores.push(id);
  write(`${PREFIX}:meta`, meta);
}

export function clearAll() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    /* nada que borrar */
  }
}
