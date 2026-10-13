import * as THREE from 'three';
import { createItemMesh, itemHeight, type ItemType } from './items';
import { scene } from './scene';
import { addTween, type Tween } from './tween';

export interface Item {
  type: ItemType;
  mesh: THREE.Object3D;
  /** Posición del hueco dentro del ancla de su pila (local). */
  target: THREE.Vector3;
  value: number;
  tween?: Tween;
}

export type Layout = (index: number, items: Item[], out: THREE.Vector3) => void;

/** Columna vertical (espalda del jugador). */
export const columnLayout = (): Layout => (i, items, out) => {
  let y = 0;
  for (let j = 0; j < i; j++) y += itemHeight(items[j].type);
  out.set(0, y, 0);
};

/** Rejilla por capas (estanterías, palés, pila de billetes). */
export const gridLayout =
  (cols: number, rows: number, dx: number, dz: number, layerH: number): Layout =>
  (i, _items, out) => {
    const perLayer = cols * rows;
    const layer = Math.floor(i / perLayer);
    const r = i % perLayer;
    const c = r % cols;
    const row = Math.floor(r / cols);
    out.set((c - (cols - 1) / 2) * dx, layer * layerH, (row - (rows - 1) / 2) * dz);
  };

export function makeItem(type: ItemType, worldPos: THREE.Vector3, value = 0): Item {
  const mesh = createItemMesh(type);
  mesh.position.copy(worldPos);
  return { type, mesh, target: new THREE.Vector3(), value };
}

export class Stack {
  items: Item[] = [];

  constructor(
    public anchor: THREE.Object3D,
    public capacity: number,
    public layout: Layout,
  ) {}

  get count() {
    return this.items.length;
  }

  get full() {
    return this.items.length >= this.capacity;
  }

  has(type?: ItemType) {
    return type ? this.items.some((it) => it.type === type) : this.items.length > 0;
  }

  countOf(type: ItemType) {
    let n = 0;
    for (const it of this.items) if (it.type === type) n++;
    return n;
  }

  /** Añade el ítem: su malla vuela en arco desde su posición actual hasta el hueco. */
  push(item: Item, arc = 0.9, dur = 0.28) {
    const start = new THREE.Vector3();
    item.mesh.getWorldPosition(start);
    this.anchor.updateWorldMatrix(true, false);
    this.anchor.worldToLocal(start);
    this.anchor.add(item.mesh);
    item.mesh.position.copy(start);
    item.mesh.rotation.set(0, 0, 0);
    this.items.push(item);
    this.layout(this.items.length - 1, this.items, item.target);
    if (item.tween) item.tween.dead = true;
    const from = start.clone();
    item.tween = addTween(dur, (k) => {
      item.mesh.position.lerpVectors(from, item.target, k);
      item.mesh.position.y += Math.sin(Math.PI * k) * arc;
    });
  }

  /** Quita el último ítem (del tipo indicado, si se pasa). */
  pop(type?: ItemType): Item | undefined {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (type && this.items[i].type !== type) continue;
      const [item] = this.items.splice(i, 1);
      if (i < this.items.length) this.relayout();
      return item;
    }
    return undefined;
  }

  relayout() {
    this.items.forEach((it, i) => {
      this.layout(i, this.items, it.target);
      if (!it.tween || it.tween.dead) it.mesh.position.copy(it.target);
    });
  }
}

export function transfer(from: Stack, to: Stack, type?: ItemType): boolean {
  if (to.full) return false;
  const item = from.pop(type);
  if (!item) return false;
  to.push(item);
  return true;
}

/** El ítem vuela hasta `to`, se encoge y desaparece. */
export function consumeItem(item: Item, to: THREE.Vector3, onDone?: () => void, dur = 0.3) {
  if (item.tween) item.tween.dead = true;
  flyAndRemove(item.mesh, to, dur, onDone);
}

export function flyAndRemove(mesh: THREE.Object3D, to: THREE.Vector3, dur = 0.3, onDone?: () => void) {
  const from = new THREE.Vector3();
  mesh.getWorldPosition(from);
  scene.add(mesh);
  mesh.position.copy(from);
  const end = to.clone();
  const s0 = mesh.scale.x;
  addTween(
    dur,
    (k) => {
      mesh.position.lerpVectors(from, end, k);
      mesh.position.y += Math.sin(Math.PI * k) * 0.7;
      mesh.scale.setScalar(s0 * (1 - 0.7 * k));
    },
    () => {
      scene.remove(mesh);
      onDone?.();
    },
  );
}
