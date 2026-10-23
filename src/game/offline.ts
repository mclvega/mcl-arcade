/**
 * «Jugar sin conexión» en Configuración (versión del Arcade de herramientas/sinconexion.ts).
 * El service worker ya guarda todo el juego la primera vez; aquí se ve el estado,
 * se puede descargar o actualizar a mano y se ofrece instalar el juego como app.
 */

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installPrompt: InstallEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e as InstallEvent;
});
window.addEventListener('appinstalled', () => (installPrompt = null));

/** ¿Se está usando como app instalada? (la pantalla completa del navegador no cuenta). */
function installed(): boolean {
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
  if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: minimal-ui)').matches) return true;
  return matchMedia('(display-mode: fullscreen)').matches && !document.fullscreenElement;
}
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function cachedFiles(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  let total = 0;
  for (const name of await caches.keys()) total = Math.max(total, (await (await caches.open(name)).keys()).length);
  return total;
}

function waitActive(reg: ServiceWorkerRegistration): Promise<boolean> {
  if (reg.active && !reg.installing && !reg.waiting) return Promise.resolve(true);
  return new Promise((resolve) => {
    const sw = reg.installing ?? reg.waiting;
    if (!sw) return resolve(!!reg.active);
    const timer = setTimeout(() => resolve(!!reg.active), 30000);
    sw.addEventListener('statechange', () => {
      if (sw.state === 'activated' || sw.state === 'redundant') {
        clearTimeout(timer);
        resolve(sw.state === 'activated');
      }
    });
  });
}

/** Bloque de Configuración con el estado de la descarga y los botones Descargar e Instalar. */
export function offlineBlock(): HTMLElement {
  const block = document.createElement('div');
  block.className = 'set-block';
  block.innerHTML = `
    <b>📥 Jugar sin conexión</b>
    <small data-offline-status>Comprobando…</small>
    <div class="name-row">
      <button type="button" class="primary" data-offline-download>Descargar ahora</button>
      <button type="button" data-offline-install>📲 Instalar como app</button>
    </div>
    <small data-offline-install-msg></small>`;
  const status = block.querySelector<HTMLElement>('[data-offline-status]')!;
  const download = block.querySelector<HTMLButtonElement>('[data-offline-download]')!;
  const install = block.querySelector<HTMLButtonElement>('[data-offline-install]')!;
  const installMsg = block.querySelector<HTMLElement>('[data-offline-install-msg]')!;
  const supported = 'serviceWorker' in navigator && typeof caches !== 'undefined';

  const check = async () => {
    if (!supported) {
      status.textContent = 'Tu navegador no permite guardar el juego para jugar sin conexión.';
      download.style.display = 'none';
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    const n = await cachedFiles();
    if (reg?.active && n > 0) status.textContent = `✅ Descargado (${n} archivos): puedes jugar sin conexión. Tu progreso se guarda en este dispositivo.`;
    else if (reg?.installing) status.textContent = '⏳ Descargando el juego…';
    else status.textContent = 'Aún no está descargado. Pulsa «Descargar ahora» con conexión.';
  };

  download.addEventListener('click', async () => {
    if (import.meta.env.DEV) {
      status.textContent = 'En modo desarrollo no hay descarga: funciona en la versión publicada.';
      return;
    }
    if (!navigator.onLine) {
      status.textContent = 'Necesitas conexión para descargar o actualizar el juego.';
      return;
    }
    download.disabled = true;
    status.textContent = '⏳ Descargando el juego…';
    try {
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
      await reg.update();
      await waitActive(reg);
    } catch {
      status.textContent = 'No se pudo descargar. Inténtalo de nuevo con conexión.';
    }
    download.disabled = false;
    await check();
  });

  install.addEventListener('click', async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const r = await installPrompt.userChoice;
    installPrompt = null;
    install.style.display = 'none';
    installMsg.textContent = r.outcome === 'accepted' ? '¡Instalado! Ábrelo desde tu pantalla de inicio.' : 'Puedes instalarlo cuando quieras.';
  });
  if (installed()) {
    install.style.display = 'none';
    installMsg.textContent = 'Ya lo tienes instalado como app.';
  } else if (!installPrompt) {
    install.style.display = 'none';
    installMsg.textContent = isIos()
      ? 'Para instalarlo en iPhone o iPad: botón Compartir de Safari → «Añadir a pantalla de inicio».'
      : 'Para instalarlo: menú del navegador → «Instalar app» o «Añadir a pantalla de inicio».';
  }
  void check();
  return block;
}
