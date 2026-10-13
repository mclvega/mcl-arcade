import * as THREE from 'three';
import { SHELF_CAPACITY } from '../config';
import type { Game } from '../game';
import { ITEM_INFO, type ItemType } from '../items';
import { emojiSign } from '../labels';
import { scene } from '../scene';
import { gridLayout, Stack, transfer } from '../stack';
import type { Sink } from '../types';
import { boxAt } from '../util';

const BASE_GEO = new THREE.BoxGeometry(2.2, 0.5, 0.8);
const TOP_GEO = new THREE.BoxGeometry(2.3, 0.06, 0.86);
const BACK_GEO = new THREE.BoxGeometry(2.2, 0.9, 0.08);
const BASE_MAT = new THREE.MeshLambertMaterial({ color: 0x4fc3f7 });
const TOP_MAT = new THREE.MeshLambertMaterial({ color: 0xffffff });
const BACK_MAT = new THREE.MeshLambertMaterial({ color: 0x29b6f6 });

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
    this.group.position.set(x, 0, z);

    const base = new THREE.Mesh(BASE_GEO, BASE_MAT);
    base.position.y = 0.25;
    const top = new THREE.Mesh(TOP_GEO, TOP_MAT);
    top.position.y = 0.53;
    const back = new THREE.Mesh(BACK_GEO, BACK_MAT);
    back.position.set(0, 0.98, -0.4);
    for (const m of [base, top, back]) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    const sign = emojiSign(ITEM_INFO[type].emoji, 0.45);
    sign.position.set(0, 1.18, -0.355);
    this.group.add(base, top, back, sign);

    const anchor = new THREE.Object3D();
    anchor.position.set(0, 0.56, 0.05);
    this.group.add(anchor);
    this.stack = new Stack(anchor, SHELF_CAPACITY, gridLayout(4, 2, 0.48, 0.3, ITEM_INFO[type].height + 0.01));

    this.access = new THREE.Vector3(x, 0, z + 1.15);
    scene.add(this.group);
    game.obstacles.push(boxAt(x, z, 2.2, 0.8));
    game.addZone({
      pos: new THREE.Vector3(x, 0, z),
      radius: 1.75,
      interval: 0.09,
      act: () => {
        if (transfer(game.player.stack, this.stack, type)) game.sfx.drop();
      },
    });
  }
}
