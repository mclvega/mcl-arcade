import './style.css';
import { initAudio } from './game/audio';
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

let game: Game | null = null;

function closeGame() {
  game?.dispose();
  game = null;
}

const nav: Nav = {
  menu() {
    closeGame();
    history.replaceState(null, '', location.pathname);
    showMenu(play);
  },
  store(id) {
    const store = STORE_MAP.get(id);
    if (!store) return;
    closeGame();
    play(store);
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
