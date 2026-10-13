import * as THREE from 'three';
import type { Game } from '../game';
import { itemEmoji, lambert, PRODUCTS, type ItemType } from '../items';
import { castShadows, mesh, orchardTree } from '../props';
import { scene } from '../scene';
import { makeItem, type Item, type Stack } from '../stack';
import { popIn } from '../tween';
import type { Source } from '../types';

const SOIL_TOP = 0.14;

interface Plant {
  /** Posición local donde aparece el producto maduro. */
  spot: THREE.Vector3;
  t: number;
  sprout: THREE.Object3D;
  item?: Item;
}

function createSprout(style: string, color: number): THREE.Object3D {
  const g = new THREE.Group();
  if (style === 'bush') {
    const bush = mesh(new THREE.SphereGeometry(0.28, 10, 8), color, 0, 0.5);
    bush.scale.set(1, 0.8, 1);
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6), 0x388e3c, 0, 0.25), bush);
  } else if (style === 'stalks') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const s = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 5), color, Math.cos(a) * 0.12, 0.35, Math.sin(a) * 0.12);
      s.rotation.set(Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15);
      g.add(s);
    }
  } else {
    // leafy: hojas bajas a ras de suelo
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const l = mesh(new THREE.SphereGeometry(0.16, 8, 6), color, Math.cos(a) * 0.14, 0.05, Math.sin(a) * 0.14);
      l.scale.set(1, 0.3, 0.5);
      l.rotation.y = -a;
      g.add(l);
    }
  }
  return castShadows(g);
}

/** Huerto (6 plantas) o frutales (2 árboles con 3 frutos cada uno). */
export class Plot implements Source {
  readonly group = new THREE.Group();
  readonly access: THREE.Vector3;
  private plants: Plant[] = [];
  private tmp = new THREE.Vector3();

  constructor(
    game: Game,
    readonly type: ItemType,
    x: number,
    z: number,
  ) {
    const def = PRODUCTS[type];
    const style = def.grow ?? 'bush';
    this.group.position.set(x, 0, z);

    if (style === 'tree') {
      const grass = mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.06, 20), 0x7cb342, 0, 0.03, 0);
      grass.scale.set(1, 1, 0.7);
      grass.receiveShadow = true;
      this.group.add(grass);
      for (const tx of [-0.95, 0.95]) {
        const tree = orchardTree();
        tree.position.set(tx, 0, -0.1);
        this.group.add(tree);
        for (const [dx, y, dz] of [[-0.35, 1.0, 0.45], [0.38, 1.2, 0.42], [0, 1.6, 0.48]]) {
          const spot = new THREE.Vector3(tx + dx, y, -0.1 + dz);
          const bud = mesh(new THREE.SphereGeometry(0.07, 8, 6), 0x9ccc65, spot.x, spot.y + 0.05, spot.z);
          this.group.add(bud);
          this.plants.push({ spot, t: -Math.random(), sprout: bud });
        }
      }
    } else {
      const soil = mesh(new THREE.BoxGeometry(3.9, SOIL_TOP, 2.7), 0x8d6e63, 0, SOIL_TOP / 2, 0);
      soil.receiveShadow = true;
      this.group.add(soil);
      const plantColor = def.plant ?? (style === 'stalks' ? 0xc8b450 : 0x43a047);
      const itemY = style === 'bush' ? 0.78 : style === 'stalks' ? 0.82 : SOIL_TOP + 0.08;
      for (let r = 0; r < 2; r++) {
        const furrow = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.02, 0.5), lambert(0x6d4c41));
        furrow.position.set(0, SOIL_TOP + 0.005, -0.6 + r * 1.2);
        this.group.add(furrow);
        for (let c = 0; c < 3; c++) {
          const px = -1.25 + c * 1.25;
          const pz = -0.6 + r * 1.2;
          const sprout = createSprout(style, plantColor);
          sprout.position.set(px, SOIL_TOP, pz);
          this.group.add(sprout);
          this.plants.push({ spot: new THREE.Vector3(px, itemY, pz), t: -Math.random(), sprout });
        }
      }
    }

    this.access = new THREE.Vector3(x - 2.4, 0, z);
    scene.add(this.group);
    const player = game.player.stack;
    game.addZone({
      pos: new THREE.Vector3(x, 0, z),
      radius: 2.3,
      interval: 0.08,
      label: 'Recoger',
      icon: itemEmoji(type),
      canAct: () => !player.full && this.available() > 0,
      act: () => {
        if (this.take(player)) game.sfx.pick();
      },
    });
  }

  update(dt: number, growTime: number) {
    for (const p of this.plants) {
      if (p.item) continue;
      p.t += dt;
      const k = THREE.MathUtils.clamp(p.t / growTime, 0, 1);
      p.sprout.scale.setScalar(0.3 + 0.7 * k);
      if (k < 1) continue;
      p.item = makeItem(this.type, new THREE.Vector3());
      this.group.add(p.item.mesh);
      p.item.mesh.position.copy(p.spot);
      popIn(p.item.mesh, 0.35);
    }
  }

  available() {
    return this.plants.reduce((n, p) => n + (p.item ? 1 : 0), 0);
  }

  /** Cosecha el producto maduro más cercano al destino. */
  take(to: Stack): boolean {
    const from = to.anchor.getWorldPosition(this.tmp);
    this.group.worldToLocal(from);
    let best: Plant | undefined;
    let bestD = Infinity;
    for (const p of this.plants) {
      if (!p.item) continue;
      const d = p.spot.distanceToSquared(from);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best?.item) return false;
    to.push(best.item);
    best.item = undefined;
    best.t = 0;
    best.sprout.scale.setScalar(0.3);
    return true;
  }
}
