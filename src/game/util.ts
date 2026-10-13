import * as THREE from 'three';

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const distXZ = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

/** Factor de suavizado independiente del framerate. */
export const damp = (dt: number, speed: number) => 1 - Math.exp(-speed * dt);

export function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const boxAt = (x: number, z: number, w: number, d: number): Box => ({
  minX: x - w / 2,
  maxX: x + w / 2,
  minZ: z - d / 2,
  maxZ: z + d / 2,
});

/** Empuja un círculo de radio `r` fuera de las cajas. */
export function resolveCollisions(pos: THREE.Vector3, r: number, boxes: Box[]) {
  for (const b of boxes) {
    const minX = b.minX - r;
    const maxX = b.maxX + r;
    const minZ = b.minZ - r;
    const maxZ = b.maxZ + r;
    if (pos.x <= minX || pos.x >= maxX || pos.z <= minZ || pos.z >= maxZ) continue;
    const dl = pos.x - minX;
    const dr = maxX - pos.x;
    const dt = pos.z - minZ;
    const db = maxZ - pos.z;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) pos.x = minX;
    else if (m === dr) pos.x = maxX;
    else if (m === dt) pos.z = minZ;
    else pos.z = maxZ;
  }
}

/** Mueve `obj` hacia `target` en el plano XZ y lo orienta. Devuelve true al llegar. */
export function stepTowards(obj: THREE.Object3D, target: THREE.Vector3, speed: number, dt: number): boolean {
  const dx = target.x - obj.position.x;
  const dz = target.z - obj.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) return true;
  const s = Math.min(d, speed * dt);
  obj.position.x += (dx / d) * s;
  obj.position.z += (dz / d) * s;
  obj.rotation.y = lerpAngle(obj.rotation.y, Math.atan2(dx, dz), damp(dt, 12));
  return d - s < 0.05;
}

export function faceTowards(obj: THREE.Object3D, target: THREE.Vector3, dt: number) {
  const a = Math.atan2(target.x - obj.position.x, target.z - obj.position.z);
  obj.rotation.y = lerpAngle(obj.rotation.y, a, damp(dt, 10));
}

export const formatMoney = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 10_000 ? `${(v / 1000).toFixed(1)}K` : `${Math.floor(v)}`;
