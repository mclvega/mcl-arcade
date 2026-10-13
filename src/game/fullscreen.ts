import { settings } from './settings';

type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

const doc = document as FsDoc;
const root = document.documentElement as FsEl;

/** El iPhone no permite pantalla completa en páginas (sí al añadir la web a la pantalla de inicio). */
export const fullscreenSupported = () => !!(root.requestFullscreen || root.webkitRequestFullscreen);
export const isFullscreen = () => !!(document.fullscreenElement || doc.webkitFullscreenElement);

/** Si el jugador sale a mano (Esc), no se vuelve a forzar hasta que lo pida. */
let dismissed = false;

export function enterFullscreen() {
  dismissed = false;
  if (isFullscreen() || !fullscreenSupported()) return;
  try {
    const p = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen?.();
    p?.catch(() => {});
  } catch {
    /* sin gesto del usuario: se reintenta en el siguiente toque */
  }
}

export function toggleFullscreen() {
  if (!isFullscreen()) {
    enterFullscreen();
    return;
  }
  dismissed = true;
  const p = document.exitFullscreen ? document.exitFullscreen() : doc.webkitExitFullscreen?.();
  p?.catch(() => {});
}

/**
 * Los navegadores exigen un gesto para entrar en pantalla completa: con la opción activada,
 * el primer toque o tecla (p. ej. tras recargar la página) la activa.
 */
export function initFullscreen() {
  const auto = () => {
    if (settings.fullscreen && !dismissed && !isFullscreen()) enterFullscreen();
  };
  window.addEventListener('pointerup', auto);
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') auto();
  });
  const onChange = () => {
    if (!isFullscreen()) dismissed = true;
    document.body.classList.toggle('is-fullscreen', isFullscreen());
  };
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  document.body.classList.toggle('no-fullscreen', !fullscreenSupported());
}
