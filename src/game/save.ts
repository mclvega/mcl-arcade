const KEY = 'granja-tienda-save-v1';

export interface SaveData {
  v: 1;
  money: number;
  unlocked: string[];
  paid: Record<string, number>;
  upgrades: Record<string, number>;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return data && data.v === 1 ? data : null;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* modo privado o almacenamiento bloqueado: se juega sin guardar */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada que borrar */
  }
}
