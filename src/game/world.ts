import * as THREE from 'three';
import type { Game } from './game';
import { makeCanvasTexture, UI_FONT } from './labels';
import { scene } from './scene';
import { boxAt } from './util';

const lambert = (color: number) => new THREE.MeshLambertMaterial({ color });

function floorTexture() {
  const { ctx, texture } = makeCanvasTexture(64, 64);
  ctx.fillStyle = '#f6e7c8';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#ecd9b2';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillRect(32, 32, 32, 32);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

function storeSign() {
  const { ctx, texture } = makeCanvasTexture(512, 96);
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, 96, 20);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold 54px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GRANJA & TIENDA', 256, 52);
  texture.needsUpdate = true;
  return new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.05), new THREE.MeshBasicMaterial({ map: texture }));
}

function tree(x: number, z: number, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.9, 6), lambert(0x795548));
  trunk.position.y = 0.45;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 7), lambert(0x2e7d32));
  crown.position.y = 1.7;
  const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.3, 7), lambert(0x388e3c));
  crown2.position.y = 2.4;
  g.add(trunk, crown, crown2);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  g.rotation.y = Math.random() * Math.PI;
  scene.add(g);
}

/** Suelo, luces, tienda y decorado. */
export function buildWorld(game: Game) {
  scene.background = new THREE.Color(0x9ccc65);

  const hemi = new THREE.HemisphereLight(0xfff8e7, 0x6b8e4e, 1.4);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(10, 22, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -28;
  sc.right = 28;
  sc.top = 28;
  sc.bottom = -28;
  sc.near = 1;
  sc.far = 70;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), lambert(0x8bc34a));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Suelo de la tienda: x ∈ [-12, 2], z ∈ [-8, 6]
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshLambertMaterial({ map: floorTexture() }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-5, 0.01, -1);
  floor.receiveShadow = true;
  scene.add(floor);

  // Camino de entrada de clientes
  const path = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), lambert(0xd7b98e));
  path.rotation.x = -Math.PI / 2;
  path.position.set(-15, 0.012, 4);
  path.receiveShadow = true;
  scene.add(path);

  // Tierra de la granja
  const farm = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), lambert(0x9ccc65));
  farm.rotation.x = -Math.PI / 2;
  farm.position.set(11, 0.008, 0);
  farm.receiveShadow = true;
  scene.add(farm);

  // Paredes (trasera e izquierda con hueco de puerta en z ∈ [2.8, 5.2])
  const wallMat = lambert(0xefe2c8);
  const walls: [number, number, number, number][] = [
    [-5, -8, 14.3, 0.3],
    [-12, -2.6, 0.3, 10.8],
    [-12, 5.6, 0.3, 0.8],
  ];
  for (const [x, z, w, d] of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, d), wallMat);
    m.position.set(x, 0.7, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    game.obstacles.push(boxAt(x, z, w, d));
  }
  const sign = storeSign();
  sign.position.set(-5, 2.0, -7.84);
  scene.add(sign);
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.2, 0.1), lambert(0xffffff));
  signBoard.position.set(-5, 2.0, -7.9);
  scene.add(signBoard);

  // Valla de la granja
  const postGeo = new THREE.BoxGeometry(0.12, 0.6, 0.12);
  const railGeo = new THREE.BoxGeometry(16, 0.08, 0.06);
  const fenceMat = lambert(0xffffff);
  for (const z of [-8, 8.5]) {
    const rail = new THREE.Mesh(railGeo, fenceMat);
    rail.position.set(11, 0.45, z);
    scene.add(rail);
    for (let x = 3; x <= 19; x += 2) {
      const post = new THREE.Mesh(postGeo, fenceMat);
      post.position.set(x, 0.3, z);
      post.castShadow = true;
      scene.add(post);
    }
  }

  for (const [x, z, s] of [
    [-17, -10, 1.1],
    [-17, -3, 0.9],
    [-17, 9, 1],
    [21, -9, 1.2],
    [21.5, 0, 1],
    [21, 8, 1.1],
    [-4, 10.5, 0.9],
    [5, 11, 1],
    [14, 11, 1.2],
    [-9, -11, 1],
    [3, -11, 1.1],
    [12, -11, 0.9],
  ]) {
    tree(x, z, s);
  }
}
