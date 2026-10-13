import * as THREE from 'three';
import type { Game } from '../game';
import type { ItemType } from '../items';
import { scene } from '../scene';
import { makeItem, type Item, type Stack } from '../stack';
import { popIn } from '../tween';
import type { Source } from '../types';

const SOIL_GEO = new THREE.BoxGeometry(3.9, 0.14, 2.7);
const SOIL_MAT = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
const FURROW_GEO = new THREE.BoxGeometry(3.7, 0.02, 0.5);
const FURROW_MAT = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
const STEM_GEO = new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6);
const STEM_MAT = new THREE.MeshLambertMaterial({ color: 0x388e3c });
const BUSH_GEO = new THREE.SphereGeometry(0.28, 10, 8);
const BUSH_MAT = new THREE.MeshLambertMaterial({ color: 0x43a047 });
const STALK_GEO = new THREE.CylinderGeometry(0.025, 0.03, 0.7, 5);
const STALK_MAT = new THREE.MeshLambertMaterial({ color: 0xc8b450 });

const SOIL_TOP = 0.14;

interface Plant {
  local: THREE.Vector3;
  t: number;
  sprout: THREE.Object3D;
  item?: Item;
}

function createSprout(type: ItemType): THREE.Object3D {
  const g = new THREE.Group();
  if (type === 'tomato') {
    const stem = new THREE.Mesh(STEM_GEO, STEM_MAT);
    stem.position.y = 0.25;
    const bush = new THREE.Mesh(BUSH_GEO, BUSH_MAT);
    bush.position.y = 0.5;
    bush.scale.set(1, 0.8, 1);
    g.add(stem, bush);
  } else {
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(STALK_GEO, STALK_MAT);
      const a = (i / 5) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.12, 0.35, Math.sin(a) * 0.12);
      s.rotation.set(Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15);
      g.add(s);
    }
  }
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return g;
}

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
    this.group.position.set(x, 0, z);
    const soil = new THREE.Mesh(SOIL_GEO, SOIL_MAT);
    soil.position.y = SOIL_TOP / 2;
    soil.receiveShadow = true;
    this.group.add(soil);

    for (let r = 0; r < 2; r++) {
      const furrow = new THREE.Mesh(FURROW_GEO, FURROW_MAT);
      furrow.position.set(0, SOIL_TOP + 0.005, -0.6 + r * 1.2);
      this.group.add(furrow);
      for (let c = 0; c < 3; c++) {
        const local = new THREE.Vector3(-1.25 + c * 1.25, SOIL_TOP, -0.6 + r * 1.2);
        const sprout = createSprout(type);
        sprout.position.copy(local);
        this.group.add(sprout);
        this.plants.push({ local, t: -Math.random(), sprout });
      }
    }

    this.access = new THREE.Vector3(x - 2.4, 0, z);
    scene.add(this.group);
    game.addZone({
      pos: new THREE.Vector3(x, 0, z),
      radius: 2.3,
      interval: 0.08,
      act: () => {
        if (!game.player.stack.full && this.take(game.player.stack)) game.sfx.pick();
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
      const world = this.group.localToWorld(this.tmp.copy(p.local).setY(this.type === 'tomato' ? 0.78 : 0.82));
      p.item = makeItem(this.type, world);
      this.group.add(p.item.mesh);
      p.item.mesh.position.copy(this.group.worldToLocal(world));
      popIn(p.item.mesh, 0.35);
    }
  }

  available() {
    return this.plants.reduce((n, p) => n + (p.item ? 1 : 0), 0);
  }

  /** Cosecha la planta madura más cercana al destino. */
  take(to: Stack): boolean {
    const from = to.anchor.getWorldPosition(this.tmp);
    this.group.worldToLocal(from);
    let best: Plant | undefined;
    let bestD = Infinity;
    for (const p of this.plants) {
      if (!p.item) continue;
      const d = p.local.distanceToSquared(from);
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
