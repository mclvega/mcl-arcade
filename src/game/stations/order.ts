import * as THREE from 'three';
import type { Game } from '../game';
import type { ItemType } from '../items';
import { emojiSprite, ring } from '../labels';
import { castShadows, mesh } from '../props';
import { scene } from '../scene';
import { consumeItem } from '../stack';
import { addTween, easeOutBack } from '../tween';
import { boxAt, type Box } from '../util';

export interface OrderLine {
  type: ItemType;
  qty: number;
  got: number;
}

/** Camión de pedidos especiales: aparece cada cierto tiempo y espera una lista de productos. */
export class SpecialOrder {
  readonly group = new THREE.Group();
  lines: OrderLine[] = [];
  timeLeft = 0;
  total = 1;
  reward = 0;
  active = false;
  private truck = new THREE.Group();
  private dropPos: THREE.Vector3;
  private obstacle: Box;

  constructor(
    private game: Game,
    readonly pos: THREE.Vector3,
  ) {
    // Camión mirando hacia +x, con la caja de carga hacia la tienda.
    const t = this.truck;
    t.add(
      mesh(new THREE.BoxGeometry(1.8, 1.1, 1.1), 0xffffff, -0.3, 0.75, 0),
      mesh(new THREE.BoxGeometry(1.84, 0.12, 1.14), 0xff7043, -0.3, 0.5, 0),
      mesh(new THREE.BoxGeometry(0.8, 0.85, 1.05), 0xff7043, 0.95, 0.62, 0),
      mesh(new THREE.BoxGeometry(0.05, 0.4, 0.9), 0x81d4fa, 1.36, 0.8, 0),
    );
    for (const [x, z] of [[0.9, 0.55], [0.9, -0.55], [-0.8, 0.55], [-0.8, -0.55]]) {
      const w = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), 0x212121, x, 0.22, z);
      w.rotation.x = Math.PI / 2;
      t.add(w);
    }
    castShadows(t);
    const sign = emojiSprite('📦', 0.7);
    sign.position.set(-0.3, 1.8, 0);
    t.add(sign);
    this.group.add(t);

    this.dropPos = pos.clone().add(new THREE.Vector3(0, 0, -1.4));
    const r = ring(0.9, 0xffb74d, 0.9);
    r.position.set(0, 0.025, -1.4);
    this.group.add(r);
    this.group.position.copy(pos);
    this.group.visible = false;
    scene.add(this.group);
    this.obstacle = boxAt(pos.x - 0.1, pos.z, 2.8, 1.2);

    const player = game.player.stack;
    game.addZone({
      pos: this.dropPos,
      radius: 0.95,
      interval: 0.1,
      label: 'Entregar',
      icon: '📦',
      enabled: () => this.active,
      canAct: () => this.lines.some((l) => l.got < l.qty && player.has(l.type)),
      act: () => {
        const line = this.lines.find((l) => l.got < l.qty && player.has(l.type));
        const it = line && player.pop(line.type);
        if (!line || !it) return;
        line.got++;
        consumeItem(it, this.pos.clone().setY(1.0), undefined, 0.3);
        game.sfx.drop();
        if (this.lines.every((l) => l.got >= l.qty)) game.onOrderDelivered();
      },
    });
  }

  get needs() {
    return this.lines.filter((l) => l.got < l.qty).map((l) => l.type);
  }

  start(lines: OrderLine[], time: number, reward: number) {
    this.lines = lines;
    this.timeLeft = this.total = time;
    this.reward = reward;
    this.active = true;
    this.group.visible = true;
    this.game.obstacles.push(this.obstacle);
    // Llega desde la derecha.
    addTween(1.2, (k) => (this.truck.position.x = 14 * (1 - easeOutBack(k))));
  }

  /** Se va (entregado, caducado o rechazado). */
  close() {
    this.active = false;
    const i = this.game.obstacles.indexOf(this.obstacle);
    if (i >= 0) this.game.obstacles.splice(i, 1);
    addTween(
      1.0,
      (k) => (this.truck.position.x = -16 * k * k),
      () => {
        if (!this.active) this.group.visible = false;
        this.truck.position.x = 0;
      },
    );
  }

  update(dt: number) {
    if (!this.active) return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.game.onOrderExpired();
  }
}
