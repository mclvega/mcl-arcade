import * as THREE from 'three';
import { SHELF_CAPACITY } from '../config';
import type { Game } from '../game';
import { itemEmoji, itemSize, lambert, type ItemType } from '../items';
import { emojiSign } from '../labels';
import { scene } from '../scene';
import { gridLayout, Stack, transfer } from '../stack';
import type { Sink } from '../types';
import { boxAt } from '../util';

const BASE_GEO = new THREE.BoxGeometry(2.2, 0.5, 0.8);
const TOP_GEO = new THREE.BoxGeometry(2.3, 0.06, 0.86);
const BACK_GEO = new THREE.BoxGeometry(2.2, 0.9, 0.08);

export class Shelf implements Sink {
  readonly group = new THREE.Group();
  readonly stack: Stack;
  readonly access: THREE.Vector3;
  readonly isShelf = true;

  constructor(
    game: Game,
    readonly type: ItemType,
    x: number,
    z: number,
  ) {
    const theme = game.store.theme;
    this.group.position.set(x, 0, z);

    const base = new THREE.Mesh(BASE_GEO, lambert(theme.shelf));
    base.position.y = 0.25;
    const top = new THREE.Mesh(TOP_GEO, lambert(0xffffff));
    top.position.y = 0.53;
    const back = new THREE.Mesh(BACK_GEO, lambert(theme.shelfBack));
    back.position.set(0, 0.98, -0.4);
    for (const m of [base, top, back]) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    const sign = emojiSign(itemEmoji(type), 0.45);
    sign.position.set(0, 1.18, -0.355);
    this.group.add(base, top, back, sign);

    // La rejilla se adapta al tamaño del producto.
    const { width, depth, height } = itemSize(type);
    const cols = THREE.MathUtils.clamp(Math.floor(2.1 / (width + 0.05)), 2, 4);
    const rows = depth > 0.36 ? 1 : 2;
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 0.56, 0.05);
    this.group.add(anchor);
    this.stack = new Stack(anchor, SHELF_CAPACITY, gridLayout(cols, rows, 2.1 / cols, 0.32, height + 0.01));

    this.access = new THREE.Vector3(x, 0, z + 1.15);
    scene.add(this.group);
    game.obstacles.push(boxAt(x, z, 2.2, 0.8));
    const player = game.player.stack;
    game.addZone({
      pos: new THREE.Vector3(x, 0, z),
      radius: 1.75,
      interval: 0.09,
      label: 'Soltar',
      icon: itemEmoji(type),
      canAct: () => !this.stack.full && player.has(type),
      act: () => {
        if (transfer(player, this.stack, type)) game.sfx.drop();
      },
    });
  }
}
