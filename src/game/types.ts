import type * as THREE from 'three';
import type { ItemType } from './items';
import type { Stack } from './stack';

/** Zona de interacción del jugador por proximidad. */
export interface Zone {
  pos: THREE.Vector3;
  radius: number;
  interval: number;
  timer: number;
  /** Texto del botón de acción en modo manual. */
  label: string;
  icon: string;
  /** ¿Hay algo que hacer ahora mismo? */
  canAct: () => boolean;
  act: () => void;
  enabled?: () => boolean;
}

/** Donde se depositan productos (estanterías, entradas de máquinas). */
export interface Sink {
  type: ItemType;
  stack: Stack;
  access: THREE.Vector3;
  isShelf: boolean;
}

/** De donde se recogen productos (huertos, salidas de máquinas). */
export interface Source {
  type: ItemType;
  access: THREE.Vector3;
  available(): number;
  take(to: Stack): boolean;
}
