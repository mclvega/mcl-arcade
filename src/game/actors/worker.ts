import * as THREE from 'three';
import { animateWalk, createCharacter } from '../characters';
import type { Game } from '../game';
import { Bubble } from '../labels';
import { scene } from '../scene';
import { columnLayout, Stack, transfer } from '../stack';
import type { Sink, Source } from '../types';
import { stepTowards } from '../util';

export interface StockTask {
  sink: Sink;
  source: Source;
}

type State = 'idle' | 'toSource' | 'collect' | 'toSink' | 'deliver' | 'toRest' | 'rest';

/**
 * Cajero: atiende la caja y cada cierto tiempo se toma un descanso (la caja queda sin atender).
 * Reponedor: lleva productos de huertos/salidas de máquinas a estanterías y entradas de máquinas;
 * tras varios viajes vuelve a su puesto a descansar. Los tiempos dependen de la dificultad.
 */
export class Worker {
  readonly group: THREE.Group;
  readonly stack: Stack;
  task?: StockTask;
  private body: THREE.Group;
  private bubble = new Bubble();
  private state: State = 'idle';
  private target?: THREE.Vector3;
  private t = 0;
  private waitT = 0;
  private walkT = 0;
  private elapsed = Math.random() * 10;
  /** Viajes (reponedor) o segundos de turno (cajero) desde el último descanso. */
  private work = 0;
  private restLeft = 0;
  private restTotal = 1;
  private restSpot: THREE.Vector3;

  constructor(
    private game: Game,
    readonly role: 'cashier' | 'stocker',
    private home: THREE.Vector3,
  ) {
    const c = createCharacter(role === 'cashier' ? 0xffb300 : 0xf06292, role === 'cashier' ? 0x6d4c41 : 0xffffff);
    this.group = c.group;
    this.body = c.body;
    this.group.position.copy(home);
    if (role === 'cashier') this.group.rotation.y = Math.PI / 2;
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 0.45, -0.45);
    anchor.scale.setScalar(1 / (this.body.userData.heightScale ?? 1));
    this.body.add(anchor);
    this.stack = new Stack(anchor, game.staffCapacity, columnLayout());
    this.bubble.sprite.position.y = 1.75;
    this.bubble.set('');
    this.group.add(this.bubble.sprite);
    // El cajero descansa un poco apartado de la caja.
    this.restSpot = role === 'cashier' ? home.clone().add(new THREE.Vector3(-0.4, 0, -2.2)) : home;
    scene.add(this.group);
  }

  /** El cajero está atendiendo (no en su descanso). */
  get onDuty() {
    return this.state !== 'toRest' && this.state !== 'rest';
  }

  get resting() {
    return !this.onDuty;
  }

  update(dt: number) {
    this.elapsed += dt;
    if (this.role === 'cashier') this.updateCashier(dt);
    else this.updateStocker(dt);
  }

  private startRest(total: number) {
    this.restTotal = this.restLeft = total * this.game.restMultiplier;
    this.work = 0;
    this.state = 'toRest';
  }

  /** Camina al sitio de descanso y espera; devuelve true al terminar. */
  private rest(dt: number, icon: string): boolean {
    if (this.state === 'toRest') {
      const arrived = stepTowards(this.group, this.restSpot, this.game.staffSpeed, dt);
      this.walkT += dt;
      animateWalk(this.body, this.walkT, !arrived);
      if (arrived) this.state = 'rest';
    } else {
      animateWalk(this.body, 0, false);
      this.body.position.y = Math.sin(this.elapsed * 1.5) * 0.02;
      this.restLeft -= dt;
    }
    this.bubble.set(`${icon} ${Math.max(0, Math.ceil(this.restLeft))}s`, 1 - this.restLeft / this.restTotal);
    if (this.restLeft > 0) return false;
    this.bubble.set('');
    return true;
  }

  private updateCashier(dt: number) {
    const d = this.game.difficulty;
    if (this.onDuty) {
      const back = stepTowards(this.group, this.home, this.game.staffSpeed, dt);
      if (back) {
        this.group.rotation.y = Math.PI / 2;
        this.body.position.y = Math.abs(Math.sin(this.elapsed * 2)) * 0.03;
      }
      this.work += dt;
      if (this.work >= d.cashierShift) {
        this.startRest(d.cashierBreak);
        this.game.onCashierBreak();
      }
      return;
    }
    if (this.rest(dt, '☕')) this.state = 'idle';
  }

  private updateStocker(dt: number) {
    const game = this.game;
    let moving = false;
    switch (this.state) {
      case 'toRest':
      case 'rest':
        if (this.rest(dt, '💤')) {
          this.state = 'idle';
          this.t = 0;
        }
        return;
      case 'idle':
        this.t -= dt;
        if (this.t <= 0) {
          this.t = 0.5;
          const task = game.findStockTask(this);
          if (task) {
            this.task = task;
            this.target = task.source.access;
            this.state = 'toSource';
            break;
          }
        }
        moving = !stepTowards(this.group, this.home, game.staffSpeed, dt);
        break;
      case 'toSource':
        moving = true;
        if (stepTowards(this.group, this.target!, game.staffSpeed, dt)) {
          this.state = 'collect';
          this.t = 0;
          this.waitT = 0;
        }
        break;
      case 'collect':
        this.collect(dt);
        break;
      case 'toSink':
        moving = true;
        if (stepTowards(this.group, this.target!, game.staffSpeed, dt)) {
          this.state = 'deliver';
          this.t = 0;
        }
        break;
      case 'deliver': {
        this.t += dt;
        if (this.t < 0.15) break;
        this.t = 0;
        const sink = this.task!.sink;
        if (this.stack.count === 0) {
          this.task = undefined;
          this.state = 'idle';
          this.t = 0.2;
          if (++this.work >= game.difficulty.stockerTrips) this.startRest(game.difficulty.stockerRest);
        } else if (!sink.stack.full) {
          transfer(this.stack, sink.stack);
        }
        break;
      }
    }
    if (moving) this.walkT += dt;
    animateWalk(this.body, this.walkT, moving);
  }

  private collect(dt: number) {
    this.t += dt;
    if (this.t < 0.2) return;
    this.t = 0;
    const { source, sink } = this.task!;
    const room = sink.stack.capacity - sink.stack.count - this.stack.count;
    if (!this.stack.full && room > 0 && source.available() > 0) {
      source.take(this.stack);
      this.waitT = 0;
      return;
    }
    this.waitT += 0.2;
    if (this.stack.count > 0 && (this.stack.full || room <= 0 || this.waitT >= 0.8)) {
      this.target = sink.access;
      this.state = 'toSink';
    } else if (this.stack.count === 0 && this.waitT >= 2.5) {
      this.task = undefined;
      this.state = 'idle';
    }
  }

  dispose() {
    this.bubble.dispose();
  }
}
