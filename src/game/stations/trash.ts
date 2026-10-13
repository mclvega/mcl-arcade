import * as THREE from 'three';
import type { Game } from '../game';
import { emojiGroundLabel, ring } from '../labels';
import { castShadows, mesh } from '../props';
import { scene } from '../scene';
import { consumeItem } from '../stack';
import { addTween } from '../tween';
import { boxAt } from '../util';

/** Cubo de basura: elimina lo que lleva el jugador, de uno en uno. */
export class TrashBin {
  readonly group = new THREE.Group();
  private lid: THREE.Object3D;
  private mouth: THREE.Vector3;

  constructor(game: Game, pos: THREE.Vector3) {
    this.group.position.copy(pos);
    const bin = mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.9, 14), 0x43a047, 0, 0.45, -0.55);
    const band = mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 14), 0x2e7d32, 0, 0.75, -0.55);
    this.lid = new THREE.Group();
    this.lid.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 14), 0x2e7d32, 0, 0, 0.42), mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), 0x1b5e20, 0, 0.06, 0.42));
    this.lid.position.set(0, 0.94, -0.97);
    this.group.add(castShadows(new THREE.Group().add(bin, band, this.lid)));

    const r = ring(0.9, 0xff8a80, 0.8);
    r.position.set(0, 0.025, 0.45);
    const label = emojiGroundLabel('🗑️', 0.55);
    label.position.set(0, 0.03, 0.45);
    this.group.add(r, label);
    scene.add(this.group);

    this.mouth = pos.clone().add(new THREE.Vector3(0, 1.0, -0.55));
    game.obstacles.push(boxAt(pos.x, pos.z - 0.55, 0.8, 0.8));

    const player = game.player.stack;
    game.addZone({
      pos: pos.clone().add(new THREE.Vector3(0, 0, 0.45)),
      radius: 0.9,
      interval: 0.07,
      label: 'Tirar',
      icon: '🗑️',
      canAct: () => player.count > 0,
      act: () => {
        const it = player.pop();
        if (!it) return;
        consumeItem(it, this.mouth, undefined, 0.25);
        game.sfx.trash();
        this.flap();
      },
    });
  }

  private flap() {
    addTween(0.25, (k) => (this.lid.rotation.x = -Math.sin(Math.PI * k) * 0.9));
  }
}
