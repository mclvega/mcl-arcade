import * as THREE from 'three';
import type { Customer } from '../actors/customer';
import { CASH_PILE_CAPACITY, CHECKOUT_INTERVAL, PRICES } from '../config';
import type { Game } from '../game';
import { emojiGroundLabel, ring } from '../labels';
import { scene } from '../scene';
import { consumeItem, gridLayout, makeItem, Stack } from '../stack';
import { boxAt, distXZ } from '../util';

const lambert = (color: number) => new THREE.MeshLambertMaterial({ color });

export class Register {
  readonly group = new THREE.Group();
  readonly queue: Customer[] = [];
  readonly cashierSpot: THREE.Vector3;
  readonly cashPile: Stack;
  readonly cashPos: THREE.Vector3;
  staffed = false;
  private t = 0;
  private elapsed = 0;
  private top: THREE.Vector3;
  private marker: THREE.Mesh;
  private markerMat: THREE.MeshBasicMaterial;

  constructor(
    private game: Game,
    readonly pos: THREE.Vector3,
  ) {
    const { x, z } = pos;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 2.6), lambert(0x5c9ead));
    counter.position.set(x, 0.5, z);
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 2.7), lambert(0xf5f5f5));
    counterTop.position.set(x, 1.04, z);
    const till = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), lambert(0x37474f));
    till.position.set(x - 0.1, 1.25, z - 0.7);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.4), new THREE.MeshBasicMaterial({ color: 0x80deea }));
    screen.position.set(x + 0.17, 1.35, z - 0.7);
    for (const m of [counter, counterTop, till]) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    this.group.add(counter, counterTop, till, screen);

    this.cashierSpot = new THREE.Vector3(x - 1.3, 0, z);
    this.marker = ring(0.85, 0xffffff, 0.8);
    this.markerMat = this.marker.material as THREE.MeshBasicMaterial;
    this.marker.position.set(this.cashierSpot.x, 0.025, z);
    const label = emojiGroundLabel('🧾', 0.6);
    label.position.set(this.cashierSpot.x, 0.03, z);
    this.group.add(this.marker, label);

    this.cashPos = new THREE.Vector3(x, 0, z - 2.4);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), new THREE.MeshLambertMaterial({ color: 0x2e7d32 }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(this.cashPos.x, 0.02, this.cashPos.z);
    mat.receiveShadow = true;
    const anchor = new THREE.Object3D();
    anchor.position.set(this.cashPos.x, 0.03, this.cashPos.z);
    this.group.add(mat, anchor);
    this.cashPile = new Stack(anchor, CASH_PILE_CAPACITY, gridLayout(2, 3, 0.5, 0.3, 0.07));

    this.top = new THREE.Vector3(x, 1.3, z);
    scene.add(this.group);
    game.obstacles.push(boxAt(x, z, 1.0, 2.6));

    game.addZone({
      pos: this.cashPos,
      radius: 1.25,
      interval: 0.035,
      act: () => {
        const it = this.cashPile.pop();
        if (!it) return;
        const chest = game.player.pos.clone().setY(1.0);
        consumeItem(it, chest, undefined, 0.22);
        game.addMoney(it.value);
        game.sfx.coin();
      },
    });
  }

  queueSpot(i: number, out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(this.pos.x + 1.45 + Math.floor(i / 5) * 1.1, 0, this.pos.z + (i % 5) * 1.25);
  }

  addCash(value: number) {
    if (value <= 0) return;
    if (this.cashPile.full) {
      this.cashPile.items[this.cashPile.count - 1].value += value;
      return;
    }
    this.cashPile.push(makeItem('cash', this.top, value), 1.0, 0.35);
  }

  update(dt: number) {
    this.elapsed += dt;
    const game = this.game;
    this.staffed = game.cashierHired || distXZ(game.player.pos, this.cashierSpot) < 1.0;

    const front = this.queue[0];
    const waiting = !!front && front.readyToPay();
    if (this.staffed) this.markerMat.color.set(0x66bb6a);
    else if (waiting) this.markerMat.color.setHSL(0.08, 1, 0.5 + Math.sin(this.elapsed * 8) * 0.15);
    else this.markerMat.color.set(0xffffff);

    if (!waiting || !this.staffed) {
      this.t = 0;
      return;
    }
    this.t += dt;
    if (this.t < CHECKOUT_INTERVAL) return;
    this.t = 0;
    const it = front.stack.pop();
    if (it) {
      consumeItem(it, this.top, undefined, 0.2);
      this.addCash(PRICES[it.type] ?? 0);
      game.sfx.cash();
    } else {
      this.queue.shift();
      front.leave(true);
    }
  }
}
