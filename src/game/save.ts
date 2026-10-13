import { STORES } from './stores';

const PREFIX = 'mcl-arcade:v1';

export interface StoreSave {
  money: number;
  unlocked: string[];
  paid: Record<string, number>;
  upgrades: Record<string, number>;
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
