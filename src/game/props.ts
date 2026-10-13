import * as THREE from 'three';
import { lambert } from './items';

export function castShadows(o: THREE.Object3D, receive = false) {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      if (receive) c.receiveShadow = true;
    }
  });
  return o;
}

export function mesh(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, lambert(color));
  m.position.set(x, y, z);
  return m;
}

export function pineTree(): THREE.Group {
  const g = new THREE.Group();
  g.add(
    mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.9, 6), 0x795548, 0, 0.45),
    mesh(new THREE.ConeGeometry(0.9, 1.8, 7), 0x2e7d32, 0, 1.7),
    mesh(new THREE.ConeGeometry(0.7, 1.3, 7), 0x388e3c, 0, 2.4),
  );
  return castShadows(g) as THREE.Group;
}

export function roundTree(crown = 0x43a047): THREE.Group {
  const g = new THREE.Group();
  g.add(
    mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.1, 6), 0x795548, 0, 0.55),
    mesh(new THREE.IcosahedronGeometry(0.85, 1), crown, 0, 1.6),
    mesh(new THREE.IcosahedronGeometry(0.55, 1), crown, 0.4, 2.0, 0.2),
  );
  return castShadows(g) as THREE.Group;
}

/** Árbol de huerto frutal (copa redonda baja). */
export function orchardTree(): THREE.Group {
  const g = new THREE.Group();
  g.add(
    mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 6), 0x795548, 0, 0.45),
    mesh(new THREE.IcosahedronGeometry(0.62, 1), 0x388e3c, 0, 1.3),
  );
  return castShadows(g) as THREE.Group;
}
