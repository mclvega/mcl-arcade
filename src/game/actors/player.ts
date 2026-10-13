import * as THREE from 'three';
import { LAYOUT } from '../config';
import { animateWalk, createAvatar, type Look } from '../characters';
import { nameTag } from '../labels';
import { columnLayout, Stack } from '../stack';
import { damp, lerpAngle, resolveCollisions, type Box } from '../util';

// Direcciones de pantalla proyectadas al suelo (cámara isométrica desde +x +z).
const FORWARD = new THREE.Vector3(-1, 0, -1).normalize();
const RIGHT = new THREE.Vector3(1, 0, -1).normalize();

export class Player {
  readonly group: THREE.Group;
  readonly stack: Stack;
  private body: THREE.Group;
  private walkT = 0;
  private dir = new THREE.Vector3();

  constructor(capacity: number, start: THREE.Vector3, look: Look, name?: string) {
    const c = createAvatar(look);
    this.group = c.group;
    this.body = c.body;
    this.group.position.copy(start);
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 0.45, -0.45);
    anchor.scale.setScalar(1 / (this.body.userData.heightScale ?? 1));
    this.body.add(anchor);
    this.stack = new Stack(anchor, capacity, columnLayout());
    if (name) {
      const tag = nameTag(name);
      tag.position.y = 2.0;
      this.group.add(tag);
    }
  }

  get pos() {
    return this.group.position;
  }

  update(dt: number, input: { x: number; y: number }, speed: number, obstacles: Box[]) {
    const mag = Math.min(1, Math.hypot(input.x, input.y));
    const moving = mag > 0;
    if (moving) {
      this.dir.set(0, 0, 0).addScaledVector(RIGHT, input.x).addScaledVector(FORWARD, input.y).normalize();
      this.pos.addScaledVector(this.dir, speed * mag * dt);
      this.group.rotation.y = lerpAngle(this.group.rotation.y, Math.atan2(this.dir.x, this.dir.z), damp(dt, 14));
      this.walkT += dt;
    }
    resolveCollisions(this.pos, 0.35, obstacles);
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, LAYOUT.bounds.minX, LAYOUT.bounds.maxX);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, LAYOUT.bounds.minZ, LAYOUT.bounds.maxZ);
    animateWalk(this.body, this.walkT, moving);
  }
}
