import * as THREE from 'three';
import { PROCESSOR_CAPACITY } from '../config';
import type { Game } from '../game';
import { ITEM_INFO, type ItemType } from '../items';
import { emojiGroundLabel, ring } from '../labels';
import { scene } from '../scene';
import { consumeItem, gridLayout, makeItem, Stack, transfer } from '../stack';
import type { Sink, Source } from '../types';
import { boxAt } from '../util';

const lambert = (color: number) => new THREE.MeshLambertMaterial({ color });
const PALLET_GEO = new THREE.BoxGeometry(0.95, 0.12, 0.95);
const PALLET_MAT = lambert(0xbcaaa4);
const BAR_BG = new THREE.MeshBasicMaterial({ color: 0x333333 });
const BAR_FG = new THREE.MeshBasicMaterial({ color: 0x76ff03 });

function shadowed(o: THREE.Object3D) {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return o;
}

function createOven(): THREE.Object3D {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 1.9), lambert(0xb0bec5));
  body.position.y = 0.65;
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 2.0), lambert(0x78909c));
  top.position.y = 1.36;
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.05), new THREE.MeshBasicMaterial({ color: 0xff9800 }));
  mouth.position.set(0, 0.55, 0.96);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 10), lambert(0x8d6e63));
  chimney.position.set(0.5, 1.8, -0.4);
  g.add(body, top, mouth, chimney);
  return shadowed(g);
}

function createCoop(): THREE.Object3D {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.0, 1.9), lambert(0xd7a86e));
  body.position.y = 0.5;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.9, 4), lambert(0xc62828));
  roof.position.y = 1.45;
  roof.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.05), lambert(0x5d4037));
  door.position.set(0, 0.3, 0.96);
  g.add(body, roof, door);
  const white = lambert(0xffffff);
  const red = lambert(0xe53935);
  for (const [cx, cz] of [
    [-0.45, 1.3],
    [0.55, 1.35],
  ]) {
    const hen = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), white);
    b.position.y = 0.2;
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.12), red);
    comb.position.set(0, 0.42, 0.08);
    hen.add(b, comb);
    hen.position.set(cx, 0, cz);
    hen.name = 'hen';
    g.add(hen);
  }
  return shadowed(g);
}

export class Processor implements Source {
  readonly group = new THREE.Group();
  readonly input: Stack;
  readonly output: Stack;
  readonly sink: Sink;
  readonly access: THREE.Vector3;
  readonly type: ItemType;
  private t = 0;
  private machine: THREE.Object3D;
  private bar: THREE.Mesh;
  private barBg: THREE.Mesh;
  private center: THREE.Vector3;
  private elapsed = 0;

  constructor(
    game: Game,
    readonly inputType: ItemType,
    readonly outputType: ItemType,
    readonly kind: 'oven' | 'coop',
    x: number,
    z: number,
  ) {
    this.type = outputType;
    this.group.position.set(x, 0, z);
    this.machine = kind === 'oven' ? createOven() : createCoop();
    this.group.add(this.machine);

    this.barBg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), BAR_BG);
    this.barBg.position.set(0, 2.3, 0.6);
    const barGeo = new THREE.BoxGeometry(1.36, 0.12, 0.12).translate(0.68, 0, 0);
    this.bar = new THREE.Mesh(barGeo, BAR_FG);
    this.bar.position.set(-0.68, 2.3, 0.6);
    this.group.add(this.barBg, this.bar);

    const makePallet = (dx: number, emoji: string) => {
      const pallet = new THREE.Mesh(PALLET_GEO, PALLET_MAT);
      pallet.position.set(dx, 0.06, 0);
      pallet.receiveShadow = true;
      const r = ring(0.8);
      r.position.set(dx, 0.025, 0);
      const label = emojiGroundLabel(emoji, 0.55);
      label.position.set(dx, 0.03, 0.95);
      const anchor = new THREE.Object3D();
      anchor.position.set(dx, 0.12, 0);
      this.group.add(pallet, r, label, anchor);
      return anchor;
    };
    const inAnchor = makePallet(-1.9, ITEM_INFO[inputType].emoji);
    const outAnchor = makePallet(1.9, ITEM_INFO[outputType].emoji);
    this.input = new Stack(inAnchor, PROCESSOR_CAPACITY, gridLayout(2, 2, 0.42, 0.42, ITEM_INFO[inputType].height + 0.01));
    this.output = new Stack(outAnchor, PROCESSOR_CAPACITY, gridLayout(2, 2, 0.42, 0.42, ITEM_INFO[outputType].height + 0.01));

    this.center = new THREE.Vector3(x, 1.0, z);
    this.access = new THREE.Vector3(x + 1.9, 0, z + 1.1);
    this.sink = { type: inputType, stack: this.input, access: new THREE.Vector3(x - 1.9, 0, z + 1.1), isShelf: false };

    scene.add(this.group);
    game.obstacles.push(boxAt(x, z, 1.9, 1.9));
    game.addZone({
      pos: new THREE.Vector3(x - 1.9, 0, z),
      radius: 1.05,
      interval: 0.09,
      act: () => {
        if (transfer(game.player.stack, this.input, inputType)) game.sfx.drop();
      },
    });
    game.addZone({
      pos: new THREE.Vector3(x + 1.9, 0, z),
      radius: 1.05,
      interval: 0.09,
      act: () => {
        if (transfer(this.output, game.player.stack)) game.sfx.pick();
      },
    });
  }

  update(dt: number, processTime: number) {
    this.elapsed += dt;
    const working = this.input.count > 0 && !this.output.full;
    if (working) {
      this.t += dt;
      if (this.t >= processTime) {
        this.t = 0;
        const it = this.input.pop();
        if (it) consumeItem(it, this.center, undefined, 0.25);
        this.output.push(makeItem(this.outputType, this.center.clone().setY(1.6)), 0.8, 0.35);
      }
    }
    this.bar.scale.x = Math.max(0.001, this.t / processTime);
    this.bar.visible = this.barBg.visible = working;
    const pulse = working ? 1 + Math.sin(this.elapsed * 14) * 0.025 : 1;
    this.machine.scale.set(pulse, 2 - pulse, pulse);
    if (this.kind === 'coop') {
      this.machine.children.forEach((c, i) => {
        if (c.name === 'hen') c.rotation.y = Math.sin(this.elapsed * 2 + i) * 0.8;
      });
    }
  }

  available() {
    return this.output.count;
  }

  take(to: Stack): boolean {
    return transfer(this.output, to);
  }
}
