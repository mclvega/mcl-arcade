import * as THREE from 'three';
import { LAYOUT, type AreaId } from '../config';
import type { Game } from '../game';
import { lambert } from '../items';
import { emojiSprite } from '../labels';
import { scene } from '../scene';
import { addTween } from '../tween';
import { boxAt, type Box } from '../util';

const POST_GEO = new THREE.CylinderGeometry(0.07, 0.09, 0.9, 8);

/** Zona bloqueada: suelo oscurecido, cinta alrededor y candado hasta que se compra la ampliación. */
export class LockedArea {
  readonly group = new THREE.Group();
  readonly center: THREE.Vector3;
  isOpen = false;
  private overlay: THREE.Mesh;
  private obstacles: Box[] = [];

  constructor(
    private game: Game,
    id: AreaId,
  ) {
    const a = LAYOUT.areas[id];
    const { minX, maxX, minZ, maxZ } = a.rect;
    this.center = new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);

    this.overlay = new THREE.Mesh(
      new THREE.PlaneGeometry(maxX - minX, maxZ - minZ),
      new THREE.MeshBasicMaterial({ color: 0x263238, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    this.overlay.rotation.x = -Math.PI / 2;
    this.overlay.position.set(this.center.x, 0.03, this.center.z);
    this.group.add(this.overlay);

    const lock = emojiSprite('🔒', 1.4);
    lock.position.set(this.center.x, 1.6, this.center.z);
    this.group.add(lock);

    const red = lambert(0xff5252);
    const white = lambert(0xffffff);
    for (const [x1, z1, x2, z2] of a.barriers) {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const posts = Math.max(2, Math.round(len / 2) + 1);
      for (let i = 0; i < posts; i++) {
        const k = i / (posts - 1);
        const post = new THREE.Mesh(POST_GEO, i % 2 ? white : red);
        post.position.set(x1 + (x2 - x1) * k, 0.45, z1 + (z2 - z1) * k);
        post.castShadow = true;
        this.group.add(post);
      }
      const angle = Math.atan2(z2 - z1, x2 - x1);
      for (const [y, mat] of [[0.75, red], [0.5, white]] as const) {
        const tape = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.04), mat);
        tape.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
        tape.rotation.y = -angle;
        this.group.add(tape);
      }
      const box = boxAt((x1 + x2) / 2, (z1 + z2) / 2, Math.max(0.2, Math.abs(x2 - x1)), Math.max(0.2, Math.abs(z2 - z1)));
      this.obstacles.push(box);
      game.obstacles.push(box);
    }
    scene.add(this.group);
  }

  /** Abre la zona: quita la cinta, el candado y la sombra. */
  open(animate: boolean) {
    if (this.isOpen) return;
    this.isOpen = true;
    for (const b of this.obstacles) {
      const i = this.game.obstacles.indexOf(b);
      if (i >= 0) this.game.obstacles.splice(i, 1);
    }
    if (!animate) {
      scene.remove(this.group);
      return;
    }
    const mat = this.overlay.material as THREE.MeshBasicMaterial;
    addTween(
      0.9,
      (k) => {
        mat.opacity = 0.45 * (1 - k);
        this.group.children.forEach((c) => {
          if (c !== this.overlay) c.scale.y = Math.max(0.001, 1 - k);
        });
      },
      () => scene.remove(this.group),
    );
  }
}
