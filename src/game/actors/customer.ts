import * as THREE from 'three';
import { animateWalk, createCharacter } from '../characters';
import { CUSTOMER_CAPACITY, CUSTOMER_PATIENCE, CUSTOMER_SPEED, LAYOUT } from '../config';
import type { Game } from '../game';
import { itemEmoji, type ItemType } from '../items';
import { Bubble } from '../labels';
import { scene } from '../scene';
import type { Shelf } from '../stations/shelf';
import { gridLayout, Stack, transfer } from '../stack';
import { faceTowards, rand, stepTowards } from '../util';

const PATH = LAYOUT.path;
const COLORS = [0xef5350, 0xab47bc, 0x7e57c2, 0x26a69a, 0xffa726, 0x8d6e63, 0xec407a, 0x66bb6a, 0xffca28];
const BOX_GEO = new THREE.BoxGeometry(0.62, 0.22, 0.42);
const BOX_MAT = new THREE.MeshLambertMaterial({ color: 0xd7b98e });

export interface Want {
  type: ItemType;
  qty: number;
  got: number;
}

type State = 'entering' | 'toShelf' | 'atShelf' | 'queued' | 'leaving' | 'gone';

export class Customer {
  readonly group: THREE.Group;
  readonly stack: Stack;
  state: State = 'entering';
  private body: THREE.Group;
  private bubble = new Bubble();
  private route: THREE.Vector3[];
  private wi = 0;
  private shelf?: Shelf;
  private waitT = 0;
  private takeT = 0;
  private walkT = 0;
  private arrived = false;
  private spot = new THREE.Vector3();
  private speed = CUSTOMER_SPEED * rand(0.9, 1.1);

  constructor(
    private game: Game,
    private wants: Want[],
  ) {
    const c = createCharacter(COLORS[Math.floor(Math.random() * COLORS.length)]);
    this.group = c.group;
    this.body = c.body;
    this.group.position.copy(PATH.spawn);

    const box = new THREE.Mesh(BOX_GEO, BOX_MAT);
    box.position.set(0, 0.7, 0.42);
    box.castShadow = true;
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 0.81, 0.42);
    this.body.add(box, anchor);
    this.stack = new Stack(anchor, CUSTOMER_CAPACITY, gridLayout(2, 2, 0.26, 0.18, 0.25));

    this.bubble.sprite.position.y = 1.75;
    this.group.add(this.bubble.sprite);
    this.updateBubble();

    this.route = [PATH.door.clone(), PATH.inside.clone().add(new THREE.Vector3(rand(-0.5, 0.5), 0, 0))];
    scene.add(this.group);
  }

  update(dt: number) {
    let moving = false;
    switch (this.state) {
      case 'entering':
        moving = true;
        if (this.walk(dt)) this.nextShelf();
        break;
      case 'toShelf':
        moving = true;
        if (this.walk(dt)) {
          this.state = 'atShelf';
          this.waitT = 0;
          this.takeT = 0;
        }
        break;
      case 'atShelf':
        this.shop(dt);
        break;
      case 'queued': {
        const idx = this.game.register.queue.indexOf(this);
        this.game.register.queueSpot(Math.max(0, idx), this.spot);
        this.arrived = stepTowards(this.group, this.spot, this.speed, dt);
        moving = !this.arrived;
        if (this.arrived) faceTowards(this.group, this.game.register.pos, dt);
        break;
      }
      case 'leaving':
        moving = true;
        if (this.walk(dt)) this.state = 'gone';
        break;
    }
    if (moving) this.walkT += dt;
    animateWalk(this.body, this.walkT, moving);
  }

  readyToPay() {
    return this.state === 'queued' && this.arrived && this.game.register.queue[0] === this;
  }

  leave(happy: boolean) {
    this.state = 'leaving';
    this.route = [PATH.exit.clone(), PATH.door.clone(), PATH.spawn.clone()];
    this.bubble.set(happy ? '😊' : '😠');
    if (!happy) this.game.sfx.angry();
  }

  dispose() {
    scene.remove(this.group);
    this.bubble.dispose();
  }

  private shop(dt: number) {
    const w = this.wants[this.wi];
    const shelf = this.shelf;
    if (!w || !shelf) {
      this.nextShelf();
      return;
    }
    faceTowards(this.group, shelf.group.position, dt);
    this.waitT += dt;
    this.takeT += dt;
    if (this.takeT >= 0.4 && shelf.stack.has(w.type) && !this.stack.full) {
      this.takeT = 0;
      if (transfer(shelf.stack, this.stack, w.type)) {
        w.got++;
        this.waitT = 0;
        this.updateBubble();
        if (w.got >= w.qty || this.stack.full) {
          this.wi++;
          this.nextShelf();
        }
      }
    } else if (this.waitT > CUSTOMER_PATIENCE) {
      this.wi++;
      this.nextShelf();
    }
  }

  private nextShelf() {
    while (this.wi < this.wants.length && !this.stack.full) {
      const shelf = this.game.bestShelfFor(this.wants[this.wi].type);
      if (shelf) {
        this.shelf = shelf;
        this.route = [shelf.access.clone().add(new THREE.Vector3(rand(-0.7, 0.7), 0, rand(0, 0.3)))];
        this.state = 'toShelf';
        this.updateBubble();
        return;
      }
      this.wi++;
    }
    if (this.stack.count === 0) {
      this.leave(false);
      return;
    }
    this.game.register.queue.push(this);
    this.state = 'queued';
    this.arrived = false;
    this.bubble.set('💵');
  }

  private updateBubble() {
    const w = this.wants[this.wi];
    if (w) this.bubble.set(`${itemEmoji(w.type)} ${w.got}/${w.qty}`);
  }

  private walk(dt: number): boolean {
    const target = this.route[0];
    if (!target) return true;
    if (stepTowards(this.group, target, this.speed, dt)) this.route.shift();
    return this.route.length === 0;
  }
}
