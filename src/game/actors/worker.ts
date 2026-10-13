import * as THREE from 'three';
import { animateWalk, createCharacter } from '../characters';
import type { Game } from '../game';
import { scene } from '../scene';
import { columnLayout, Stack, transfer } from '../stack';
import type { Sink, Source } from '../types';
import { stepTowards } from '../util';

export interface StockTask {
  sink: Sink;
  source: Source;
}

type State = 'idle' | 'toSource' | 'collect' | 'toSink' | 'deliver';

/**
 * Cajero: se queda en la caja.
 * Reponedor: lleva productos de huertos/salidas de máquinas a estanterías y entradas de máquinas.
 */
export class Worker {
  readonly group: THREE.Group;
  readonly stack: Stack;
  task?: StockTask;
  private body: THREE.Group;
  private state: State = 'idle';
  private target?: THREE.Vector3;
  private t = 0;
  private waitT = 0;
  private walkT = 0;
  private elapsed = Math.random() * 10;

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
    this.body.add(anchor);
    this.stack = new Stack(anchor, game.staffCapacity, columnLayout());
    scene.add(this.group);
  }

  update(dt: number) {
    this.elapsed += dt;
    if (this.role === 'cashier') {
      this.body.position.y = Math.abs(Math.sin(this.elapsed * 2)) * 0.03;
      return;
    }
    const game = this.game;
    let moving = false;
    switch (this.state) {
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
}
