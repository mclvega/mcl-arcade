import * as THREE from 'three';

const matCache = new Map<number, THREE.MeshLambertMaterial>();
const mat = (color: number) => {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    matCache.set(color, m);
  }
  return m;
};

const TORSO = new THREE.CapsuleGeometry(0.3, 0.42, 4, 12);
const HEAD = new THREE.SphereGeometry(0.24, 16, 12);
const EYE = new THREE.SphereGeometry(0.035, 8, 6);
const CAP = new THREE.CylinderGeometry(0.25, 0.25, 0.12, 16);
const VISOR = new THREE.BoxGeometry(0.3, 0.03, 0.18);

export interface Character {
  group: THREE.Group;
  body: THREE.Group;
}

/** Personaje low-poly que mira hacia +z. */
export function createCharacter(color: number, hat?: number): Character {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const torso = new THREE.Mesh(TORSO, mat(color));
  torso.position.y = 0.55;
  const head = new THREE.Mesh(HEAD, mat(0xffd5b0));
  head.position.y = 1.28;
  const eyeL = new THREE.Mesh(EYE, mat(0x222222));
  eyeL.position.set(-0.09, 1.32, 0.21);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.09;
  body.add(torso, head, eyeL, eyeR);

  if (hat !== undefined) {
    const cap = new THREE.Mesh(CAP, mat(hat));
    cap.position.y = 1.47;
    const visor = new THREE.Mesh(VISOR, mat(hat));
    visor.position.set(0, 1.43, 0.24);
    body.add(cap, visor);
  }

  body.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { group, body };
}

/** Balanceo al caminar. */
export function animateWalk(body: THREE.Object3D, t: number, moving: boolean) {
  body.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.08 : 0;
  body.rotation.z = moving ? Math.sin(t * 11) * 0.06 : 0;
}
