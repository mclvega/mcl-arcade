import './style.css';
import { initAudio } from './game/audio';
import { Game } from './game/game';
import { hideMenu, showMenu } from './game/menu';
import { isStoreUnlocked } from './game/save';
import { STORE_MAP, type StoreDef } from './game/stores';
import { $, initModal } from './game/ui';

initModal();

function play(store: StoreDef) {
  initAudio();
  hideMenu();
  history.replaceState(null, '', `?tienda=${store.id}`);
  const game = new Game($('app'), store);
  game.start();
  // Acceso desde la consola solo en desarrollo, para depurar.
  if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game;
}

const requested = STORE_MAP.get(new URLSearchParams(location.search).get('tienda') ?? '');
if (requested && isStoreUnlocked(requested.id)) play(requested);
else showMenu(play);
