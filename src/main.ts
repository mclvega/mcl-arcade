import './style.css';
import { initAudio } from './game/audio';
import { setMusicMood, startMusic } from './game/music';
import { enterFullscreen, initFullscreen } from './game/fullscreen';
import { Game, type Nav } from './game/game';
import { hideMenu, showMenu } from './game/menu';
import { openNameDialog, openPlayerNameDialog } from './game/nameDialog';
import { isStoreUnlocked, loadPlayerName, loadStoreName } from './game/save';
import { settings } from './game/settings';
import { STORE_MAP, type StoreDef } from './game/stores';
import { $, initModal } from './game/ui';

initModal();
initFullscreen();

// El audio solo puede arrancar tras un gesto del usuario.
const unlockAudio = () => {
  initAudio();
  startMusic();
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

let game: Game | null = null;

function closeGame() {
  game?.dispose();
  game = null;
}

const nav: Nav = {
  menu() {
    closeGame();
    history.replaceState(null, '', location.pathname);
    setMusicMood(0.65);
    showMenu(play);
  },
  store(id) {
    const store = STORE_MAP.get(id);
    if (!store) return;
    closeGame();
    play(store);
  },
  restart(id) {
    const store = STORE_MAP.get(id);
    if (!store) return;
    closeGame();
    openNameDialog(store, () => start(store));
  },
};

/** Antes de jugar: nombre del jugador (una vez) y nombre de la tienda (la primera vez que se abre). */
function play(store: StoreDef) {
  initAudio();
  if (settings.fullscreen) enterFullscreen();
  if (!loadPlayerName()) {
    openPlayerNameDialog(() => play(store));
    return;
  }
  if (!loadStoreName(store.id)) {
    openNameDialog(store, () => start(store));
    return;
  }
  start(store);
}

function start(store: StoreDef) {
  hideMenu();
  history.replaceState(null, '', `?tienda=${store.id}`);
  game = new Game($('app'), store, nav);
  game.start();
  // Acceso desde la consola solo en desarrollo, para depurar.
  if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game;
}

const requested = STORE_MAP.get(new URLSearchParams(location.search).get('tienda') ?? '');
if (requested && isStoreUnlocked(requested.id)) play(requested);
else showMenu(play);

// Service worker: guarda el juego en caché para jugar sin conexión (también instalado como app).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
