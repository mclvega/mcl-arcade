import * as THREE from 'three';

export type ItemType = 'tomato' | 'wheat' | 'bread' | 'egg' | 'cash';

/** `height` es la altura que ocupa al apilarse (el origen de cada malla está en su base). */
export const ITEM_INFO: Record<ItemType, { name: string; emoji: string; height: number }> = {
  tomato: { name: 'tomates', emoji: '🍅', height: 0.3 },
  wheat: { name: 'trigo', emoji: '🌾', height: 0.2 },
  bread: { name: 'pan', emoji: '🍞', height: 0.21 },
  egg: { name: 'huevos', emoji: '🥚', height: 0.29 },
  cash: { name: 'dinero', emoji: '💵', height: 0.07 },
};

const lambert = (color: number) => new THREE.MeshLambertMaterial({ color });

const MAT = {
  tomato: lambert(0xe53935),
  leaf: lambert(0x2e7d32),
  wheat: lambert(0xf2c94c),
  band: lambert(0x8d6e63),
  bread: lambert(0xc68642),
  egg: lambert(0xfff6e5),
  cash: lambert(0x43a047),
  cashBand: lambert(0xc8e6c9),
  coin: lambert(0xffc107),
};

const GEO = {
  tomato: new THREE.SphereGeometry(0.15, 14, 10),
  leaf: new THREE.ConeGeometry(0.07, 0.07, 5),
  wheat: new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8).rotateZ(Math.PI / 2),
  band: new THREE.CylinderGeometry(0.106, 0.106, 0.08, 8).rotateZ(Math.PI / 2),
  bread: new THREE.CapsuleGeometry(0.1, 0.22, 4, 10).rotateZ(Math.PI / 2),
  egg: new THREE.SphereGeometry(0.11, 12, 10),
  cash: new THREE.BoxGeometry(0.44, 0.06, 0.24),
  cashBand: new THREE.BoxGeometry(0.1, 0.064, 0.244),
  coin: new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14),
};

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, y: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.y = y;
  m.castShadow = true;
  return m;
}

export function createItemMesh(type: ItemType): THREE.Object3D {
  const g = new THREE.Group();
  switch (type) {
    case 'tomato':
      g.add(mesh(GEO.tomato, MAT.tomato, 0.15), mesh(GEO.leaf, MAT.leaf, 0.31));
      break;
    case 'wheat':
      g.add(mesh(GEO.wheat, MAT.wheat, 0.1), mesh(GEO.band, MAT.band, 0.1));
      break;
    case 'bread':
      g.add(mesh(GEO.bread, MAT.bread, 0.1));
      break;
    case 'egg': {
      const e = mesh(GEO.egg, MAT.egg, 0.145);
      e.scale.set(1, 1.3, 1);
      g.add(e);
      break;
    }
    case 'cash':
      g.add(mesh(GEO.cash, MAT.cash, 0.03), mesh(GEO.cashBand, MAT.cashBand, 0.03));
      break;
  }
  return g;
}

export function createCoinMesh(): THREE.Object3D {
  const c = mesh(GEO.coin, MAT.coin, 0);
  c.rotation.x = Math.PI / 2;
  return c;
}
