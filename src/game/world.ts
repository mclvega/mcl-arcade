import * as THREE from 'three';
import { LAYOUT } from './config';
import type { Game } from './game';
import { lambert } from './items';
import { makeCanvasTexture, UI_FONT } from './labels';
import { castShadows, mesh, pineTree, roundTree } from './props';
import { scene } from './scene';
import type { Theme } from './stores';
import { boxAt } from './util';

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

function floorTexture(t: Theme) {
  const { ctx, texture } = makeCanvasTexture(64, 64);
  ctx.fillStyle = hex(t.floorA);
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = hex(t.floorB);
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillRect(32, 32, 32, 32);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

function storeSign(text: string, color: number) {
  const { ctx, texture } = makeCanvasTexture(640, 110);
  ctx.fillStyle = hex(color);
  ctx.beginPath();
  ctx.roundRect(0, 0, 640, 110, 24);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 64;
  do ctx.font = `bold ${size}px ${UI_FONT}`;
  while (ctx.measureText(text).width > 590 && --size > 20);
  ctx.fillText(text, 320, 60);
  texture.needsUpdate = true;
  return new THREE.Mesh(new THREE.PlaneGeometry(7, 1.2), new THREE.MeshBasicMaterial({ map: texture }));
}

function plane(w: number, d: number, color: number | THREE.Material, x: number, y: number, z: number) {
  const mat = typeof color === 'number' ? lambert(color) : color;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

/** Suelo, luces, tienda y decorado según el tema de la tienda. */
export function buildWorld(game: Game, theme: Theme, title: string) {
  scene.background = new THREE.Color(theme.sky);

  const hemi = new THREE.HemisphereLight(0xfff8e7, 0x6b8e4e, 1.4);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(16, 24, 10);
  sun.target.position.set(6, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -32;
  sc.right = 32;
  sc.top = 32;
  sc.bottom = -32;
  sc.near = 1;
  sc.far = 80;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);

  const { store: S, farm: F, doorZ } = LAYOUT;
  plane(180, 180, theme.ground, 6, 0, 0);
  plane(S.maxX - S.minX, S.maxZ - S.minZ, new THREE.MeshLambertMaterial({ map: floorTexture(theme) }), (S.minX + S.maxX) / 2, 0.01, (S.minZ + S.maxZ) / 2);
  plane(6, 2.2, 0xd7b98e, S.minX - 3, 0.012, doorZ);
  plane(F.maxX - F.minX, F.maxZ - F.minZ, theme.farm, (F.minX + F.maxX) / 2, 0.008, (F.minZ + F.maxZ) / 2);

  // Paredes: trasera e izquierda (con hueco de puerta)
  const walls: [number, number, number, number][] = [
    [(S.minX + S.maxX) / 2, S.minZ, S.maxX - S.minX + 0.3, 0.3],
    [S.minX, (S.minZ + doorZ - 1.2) / 2, 0.3, doorZ - 1.2 - S.minZ],
    [S.minX, (doorZ + 1.2 + S.maxZ) / 2, 0.3, S.maxZ - doorZ - 1.2],
  ];
  for (const [x, z, w, d] of walls) {
    const m = mesh(new THREE.BoxGeometry(w, 1.4, d), theme.wall, x, 0.7, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    game.obstacles.push(boxAt(x, z, w, d));
  }
  const signBoard = mesh(new THREE.BoxGeometry(7.2, 1.4, 0.1), 0xffffff, (S.minX + S.maxX) / 2, 2.1, S.minZ + 0.05);
  const sign = storeSign(title.toUpperCase(), theme.sign);
  sign.position.set((S.minX + S.maxX) / 2, 2.1, S.minZ + 0.11);
  scene.add(signBoard, sign);

  // Valla de la zona de producción
  const fenceMat = 0xffffff;
  for (const z of [F.minZ, F.maxZ]) {
    scene.add(mesh(new THREE.BoxGeometry(F.maxX - F.minX, 0.08, 0.06), fenceMat, (F.minX + F.maxX) / 2, 0.45, z));
    for (let x = F.minX; x <= F.maxX; x += 2) {
      const post = mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), fenceMat, x, 0.3, z);
      post.castShadow = true;
      scene.add(post);
    }
  }

  const trees: [number, number, number][] = [
    [-21, -12, 1.1], [-21, -4, 0.9], [-22, 10, 1], [33, -10, 1.2], [33.5, 0, 1], [33, 9, 1.1],
    [-8, 12, 0.9], [6, 13.5, 1], [16, 13.5, 1.2], [26, 13.5, 1], [-12, -13, 1], [2, -13, 1.1],
    [12, -13, 0.9], [22, -13, 1.1],
  ];
  for (const [x, z, s] of trees) {
    const t = theme.trees === 'pine' ? pineTree() : roundTree();
    t.position.set(x, 0, z);
    t.scale.setScalar(s);
    t.rotation.y = Math.random() * Math.PI;
    scene.add(t);
  }
  castShadows(signBoard);
}
