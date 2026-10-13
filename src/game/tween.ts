import type * as THREE from 'three';

export interface Tween {
  t: number;
  dur: number;
  dead: boolean;
  update: (k: number) => void;
  done?: () => void;
}

const list: Tween[] = [];

export function addTween(dur: number, update: (k: number) => void, done?: () => void): Tween {
  const tw: Tween = { t: 0, dur, dead: false, update, done };
  list.push(tw);
  update(0);
  return tw;
}

export function updateTweens(dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const tw = list[i];
    if (tw.dead) {
      list.splice(i, 1);
      continue;
    }
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    tw.update(k);
    if (k >= 1) {
      tw.dead = true;
      list.splice(i, 1);
      tw.done?.();
    }
  }
}

/** Al salir de una tienda. */
export function clearTweens() {
  list.length = 0;
}

export function easeOutBack(k: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}

/** Aparición con rebote. */
export function popIn(obj: THREE.Object3D, dur = 0.45) {
  addTween(dur, (k) => obj.scale.setScalar(Math.max(0.001, easeOutBack(k))));
}
