import * as THREE from 'three';
import { animateWalk, createCharacter } from '../characters';
import { LAYOUT, THIEF } from '../config';
import type { Game } from '../game';
import { Bubble, emojiSprite } from '../labels';
import { scene } from '../scene';
import { columnLayout, Stack } from '../stack';
import { addTween } from '../tween';
import { distXZ, stepTowards } from '../util';

type State = 'toCash' | 'stealing' | 'fleeing' | 'done';

/** Ladrón: entra a por el dinero acumulado en la caja y huye. El jugador lo detiene tocándolo. */
export class Thief {
  readonly group: THREE.Group;
  readonly stack: Stack;
  state: State = 'toCash';
  private body: THREE.Group;
  private bubble = new Bubble();
  private route: THREE.Vector3[];
  private t = 0;
  private walkT = 0;
  private alert: THREE.Sprite;

  constructor(
    private game: Game,
    private speed: number,
  ) {
    const c = createCharacter(0x37474f, 0x212121);
    this.group = c.group;
    this.body = c.body;
    // Antifaz
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.1), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    mask.position.set(0, 1.33, 0.18);
    this.body.add(mask);
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 0.45, -0.45);
    this.body.add(anchor);
    this.stack = new Stack(anchor, 99, columnLayout());

    this.alert = emojiSprite('🚨', 0.6);
    this.alert.position.y = 2.6;
    this.bubble.sprite.position.y = 1.75;
    this.group.add(this.alert, this.bubble.sprite);
    this.bubble.set('🦹');

    this.group.position.copy(LAYOUT.path.spawn);
    const cash = game.register.cashPos;
    this.route = [LAYOUT.path.door.clone(), LAYOUT.path.inside.clone(), cash.clone().add(new THREE.Vector3(1.0, 0, 0.2))];
    scene.add(this.group);
  }

  get stolen() {
    return this.stack.items.reduce((s, it) => s + it.value, 0);
  }

  update(dt: number) {
    if (this.state === 'done') return;
    this.alert.position.y = 2.6 + Math.sin(performance.now() / 120) * 0.08;
    if (distXZ(this.game.player.pos, this.group.position) < THIEF.catchRadius) {
      this.game.onThiefCaught(this);
      return;
    }
    let moving = false;
    switch (this.state) {
      case 'toCash':
        moving = true;
        if (this.walk(dt, this.speed)) {
          this.state = 'stealing';
          this.t = 0;
        }
        break;
      case 'stealing': {
        this.t += dt;
        const pile = this.game.register.cashPile;
        if (this.t >= THIEF.grabInterval && pile.count > 0 && this.stack.count < THIEF.maxBills) {
          this.t = 0;
          const it = pile.pop();
          if (it) this.stack.push(it, 0.6, 0.2);
          this.game.sfx.coin();
        } else if (pile.count === 0 || this.stack.count >= THIEF.maxBills || this.t > 1.2) {
          this.state = 'fleeing';
          this.route = [LAYOUT.path.inside.clone(), LAYOUT.path.door.clone(), LAYOUT.path.spawn.clone()];
          this.bubble.set(this.stack.count ? `💰 $${this.stolen}` : '😒');
        }
        break;
      }
      case 'fleeing':
        moving = true;
        // Cargado con el botín corre un poco menos.
        if (this.walk(dt, this.speed * (this.stack.count ? 0.92 : 1.1))) this.game.onThiefEscaped(this);
        break;
    }
    if (moving) this.walkT += dt * 1.4;
    animateWalk(this.body, this.walkT, moving);
  }

  /** Atrapado: se hace pequeño y desaparece. */
  vanish() {
    this.state = 'done';
    this.bubble.set('😵');
    addTween(
      0.5,
      (k) => this.group.scale.setScalar(Math.max(0.001, 1 - k)),
      () => this.dispose(),
    );
  }

  dispose() {
    this.state = 'done';
    scene.remove(this.group);
    this.bubble.dispose();
  }

  private walk(dt: number, speed: number): boolean {
    const target = this.route[0];
    if (!target) return true;
    if (stepTowards(this.group, target, speed, dt)) this.route.shift();
    return this.route.length === 0;
  }
}
