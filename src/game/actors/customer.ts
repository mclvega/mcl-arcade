import * as THREE from 'three';
import { animateWalk, createAvatar, randomLook } from '../characters';
import { CUSTOMER_CAPACITY, CUSTOMER_SPEED, LAYOUT, REPUTATION } from '../config';
import type { Game } from '../game';
import { itemEmoji, type ItemType } from '../items';
import { Bubble } from '../labels';
import { scene } from '../scene';
import type { Shelf } from '../stations/shelf';
import { consumeItem, gridLayout, Stack, transfer } from '../stack';
import { faceTowards, rand, stepTowards } from '../util';

const PATH = LAYOUT.path;
const BOX_GEO = new THREE.BoxGeometry(0.62, 0.22, 0.42);
const BOX_MAT = new THREE.MeshLambertMaterial({ color: 0xd7b98e });

export interface Want {
  type: ItemType;
  qty: number;
  got: number;
}

type State = 'entering' | 'toShelf' | 'atShelf' | 'queued' | 'leaving' | 'gone';

/**
 * Cliente con paciencia para toda la visita (estanterías + cola).
 * Si se le acaba comprando, va a pagar lo que lleve con un poco de tiempo extra;
 * si se le acaba en la cola o sin nada, se va enfadado.
 */
export class Customer {
  readonly group: THREE.Group;
  readonly stack: Stack;
  state: State = 'entering';
  /** Se le acabó la paciencia comprando y paga solo lo que lleva. */
  partial = false;
  /** Dinero pagado en caja (para calcular la propina). */
  spent = 0;
  timeLeft: number;
  private body: THREE.Group;
  private bubble = new Bubble();
  private route: THREE.Vector3[];
  private wi = 0;
  private shelf?: Shelf;
  private takeT = 0;
  private walkT = 0;
  private arrived = false;
  private spot = new THREE.Vector3();
  private speed = CUSTOMER_SPEED * rand(0.9, 1.1);

  constructor(
    private game: Game,
    private wants: Want[],
    readonly patience: number,
    readonly vip: boolean,
  ) {
    this.timeLeft = patience;
    // Cada cliente con un aspecto aleatorio; los VIP llevan corona y traje morado.
    const c = createAvatar(vip ? { ...randomLook(), shirt: 0x6a1b9a, hat: 'crown', accessory: 'bowtie' } : randomLook());
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
    this.refreshBubble();

    this.route = [PATH.door.clone(), PATH.inside.clone().add(new THREE.Vector3(rand(-0.5, 0.5), 0, 0))];
    scene.add(this.group);
  }

  get mood() {
    return this.timeLeft / this.patience;
  }

  update(dt: number) {
    if (this.state !== 'leaving' && this.state !== 'gone' && !this.beingServed()) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.giveUp();
        return;
      }
    }

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
    if (this.state !== 'leaving') this.refreshBubble();
  }

  readyToPay() {
    return this.state === 'queued' && this.arrived && this.game.register.queue[0] === this;
  }

  /** Mientras le cobran no pierde paciencia. */
  private beingServed() {
    return this.readyToPay() && this.game.register.staffed;
  }

  leave(face: string) {
    this.state = 'leaving';
    this.route = [PATH.exit.clone(), PATH.door.clone(), PATH.spawn.clone()];
    this.bubble.set(face, undefined, this.vip);
  }

  dispose() {
    scene.remove(this.group);
    this.bubble.dispose();
  }

  private giveUp() {
    if (this.state === 'queued') {
      const q = this.game.register.queue;
      q.splice(q.indexOf(this), 1);
      // Deja la compra y se va.
      for (let it = this.stack.pop(); it; it = this.stack.pop()) consumeItem(it, this.group.position.clone(), undefined, 0.3);
      this.game.onCustomerLost(this);
      return;
    }
    if (this.stack.count > 0 && !this.partial) {
      this.partial = true;
      this.timeLeft = REPUTATION.lastChance;
      this.joinQueue();
      return;
    }
    this.game.onCustomerLost(this);
  }

  private shop(dt: number) {
    const w = this.wants[this.wi];
    const shelf = this.shelf;
    if (!w || !shelf) {
      this.nextShelf();
      return;
    }
    faceTowards(this.group, shelf.group.position, dt);
    this.takeT += dt;
    if (this.takeT < 0.4 || !shelf.stack.has(w.type) || this.stack.full) return;
    this.takeT = 0;
    if (!transfer(shelf.stack, this.stack, w.type)) return;
    w.got++;
    if (w.got >= w.qty || this.stack.full) {
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
        return;
      }
      this.wi++;
    }
    if (this.stack.count === 0) {
      this.game.onCustomerLost(this);
      return;
    }
    this.joinQueue();
  }

  private joinQueue() {
    this.game.register.queue.push(this);
    this.state = 'queued';
    this.arrived = false;
  }

  private refreshBubble() {
    const w = this.wants[this.wi];
    const text = this.state === 'queued' ? '💵' : w ? `${itemEmoji(w.type)} ${w.got}/${w.qty}` : '💵';
    this.bubble.set(this.vip ? `👑${text}` : text, this.mood, this.vip);
  }

  private walk(dt: number): boolean {
    const target = this.route[0];
    if (!target) return true;
    if (stepTowards(this.group, target, this.speed, dt)) this.route.shift();
    return this.route.length === 0;
  }
}
