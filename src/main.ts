import './style.css';
import { Game } from './game/game';

const game = new Game(document.getElementById('app')!);
game.start();

// Acceso desde la consola solo en desarrollo, para depurar.
if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game;
