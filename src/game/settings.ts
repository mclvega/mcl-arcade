const KEY = 'mcl-arcade:settings';

export interface Settings {
  /** auto: recoger/soltar/comprar al acercarse · manual: con el botón de acción. */
  mode: 'auto' | 'manual';
  sound: boolean;
  shadows: boolean;
  hints: boolean;
  /** Entrar en pantalla completa al jugar. */
  fullscreen: boolean;
}

const DEFAULTS: Settings = { mode: 'auto', sound: true, shadows: true, hints: true, fullscreen: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* sin almacenamiento: valores por defecto */
  }
  return { ...DEFAULTS };
}

export const settings: Settings = load();

const listeners = new Set<() => void>();

export function updateSettings(patch: Partial<Settings>) {
  Object.assign(settings, patch);
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((fn) => fn());
}

export function onSettingsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
