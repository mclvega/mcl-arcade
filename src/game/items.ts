import * as THREE from 'three';

export type ItemType = string;

export type GrowStyle = 'bush' | 'stalks' | 'leafy' | 'tree';

type ShapeKind =
  | 'ball' | 'carrot' | 'corn' | 'strawberry' | 'cluster' | 'bundle' | 'bottle' | 'box' | 'bag' | 'wedge'
  | 'loaf' | 'croissant' | 'donut' | 'jar' | 'cup' | 'can' | 'pie' | 'cake' | 'popcorn' | 'candy' | 'cookie'
  | 'pizzabox' | 'calzone' | 'leaf' | 'mushroom' | 'pepper' | 'layered' | 'tyre' | 'canister' | 'battery'
  | 'pane' | 'headlight' | 'wrench' | 'bolts' | 'engine' | 'car' | 'barrel' | 'rock' | 'crystal' | 'ingot'
  | 'bucket' | 'cash';

/** Descripción compacta de la malla low-poly de un producto. */
export interface Shape {
  k: ShapeKind;
  c?: number;
  c2?: number;
  r?: number;
  sy?: number;
  w?: number;
  h?: number;
  d?: number;
}

export interface ProductDef {
  name: string;
  emoji: string;
  /** Precio base de venta (se multiplica por el de la tienda). 0 = no se vende. */
  price: number;
  shape: Shape;
  /** Solo productos que se cultivan. */
  grow?: GrowStyle;
  plant?: number;
}

export const PRODUCTS: Record<string, ProductDef> = {
  // ── Granja
  tomato: { name: 'tomates', emoji: '🍅', price: 3, shape: { k: 'ball', c: 0xe53935, c2: 0x2e7d32 }, grow: 'bush' },
  carrot: { name: 'zanahorias', emoji: '🥕', price: 3, shape: { k: 'carrot' }, grow: 'leafy' },
  corn: { name: 'maíz', emoji: '🌽', price: 4, shape: { k: 'corn' }, grow: 'stalks', plant: 0x9ccc65 },
  wheat: { name: 'trigo', emoji: '🌾', price: 0, shape: { k: 'bundle', c: 0xf2c94c, c2: 0x8d6e63 }, grow: 'stalks' },
  apple: { name: 'manzanas', emoji: '🍎', price: 4, shape: { k: 'ball', c: 0xc62828, r: 0.14, c2: 0x43a047 }, grow: 'tree' },
  egg: { name: 'huevos', emoji: '🥚', price: 6, shape: { k: 'ball', c: 0xfff6e5, r: 0.11, sy: 1.3 } },
  milk: { name: 'leche', emoji: '🥛', price: 7, shape: { k: 'bottle', c: 0xffffff, c2: 0x1e88e5 } },
  bread: { name: 'pan', emoji: '🍞', price: 8, shape: { k: 'loaf', c: 0xc68642 } },
  cheese: { name: 'queso', emoji: '🧀', price: 12, shape: { k: 'wedge', c: 0xffca28 } },
  ketchup: { name: 'kétchup', emoji: '🥫', price: 9, shape: { k: 'bottle', c: 0xd32f2f, c2: 0xffffff } },
  carrotjuice: { name: 'zumo de zanahoria', emoji: '🧃', price: 9, shape: { k: 'bottle', c: 0xff9800, c2: 0x43a047 } },
  popcorn: { name: 'palomitas', emoji: '🍿', price: 10, shape: { k: 'popcorn', c: 0xe53935 } },
  applepie: { name: 'tartas de manzana', emoji: '🥧', price: 15, shape: { k: 'pie', c: 0xd9a05b, c2: 0xb5651d } },

  // ── Pizzería
  sauce: { name: 'salsa de tomate', emoji: '🥫', price: 8, shape: { k: 'jar', c: 0xc62828, c2: 0xffffff } },
  flour: { name: 'harina', emoji: '🧂', price: 0, shape: { k: 'bag', c: 0xfafafa, c2: 0x8d6e63 } },
  dough: { name: 'masa', emoji: '🫓', price: 0, shape: { k: 'ball', c: 0xf5deb3, r: 0.15, sy: 0.6 } },
  pizza: { name: 'pizzas', emoji: '🍕', price: 18, shape: { k: 'pizzabox', c: 0xd7b98e, c2: 0xe53935 } },
  calzone: { name: 'calzones', emoji: '🥟', price: 16, shape: { k: 'calzone', c: 0xe0a35a } },
  garlicbread: { name: 'pan de ajo', emoji: '🥖', price: 12, shape: { k: 'loaf', c: 0xe8b04a, r: 0.075, w: 0.32 } },
  basil: { name: 'albahaca', emoji: '🌿', price: 4, shape: { k: 'leaf', c: 0x2e7d32 }, grow: 'leafy' },
  mushroom: { name: 'champiñones', emoji: '🍄', price: 5, shape: { k: 'mushroom', c: 0xd7ccc8 }, grow: 'leafy' },
  pepper: { name: 'pimientos', emoji: '🫑', price: 5, shape: { k: 'pepper', c: 0x43a047 }, grow: 'bush' },
  olives: { name: 'aceitunas', emoji: '🫒', price: 6, shape: { k: 'cluster', c: 0x556b2f }, grow: 'tree' },
  oil: { name: 'aceite de oliva', emoji: '🍶', price: 14, shape: { k: 'bottle', c: 0xc0ca33, c2: 0x33691e } },
  tiramisu: { name: 'tiramisús', emoji: '🍮', price: 16, shape: { k: 'layered', c: 0xf5e6c8, c2: 0x6d4c41 } },

  // ── Panadería & Café
  strawberry: { name: 'fresas', emoji: '🍓', price: 5, shape: { k: 'strawberry' }, grow: 'bush', plant: 0x388e3c },
  coffeebean: { name: 'granos de café', emoji: '🍒', price: 0, shape: { k: 'cluster', c: 0xb71c1c }, grow: 'bush', plant: 0x2e7d32 },
  coffee: { name: 'cafés', emoji: '☕', price: 12, shape: { k: 'cup', c: 0xffffff, c2: 0x6d4c41 } },
  croissant: { name: 'cruasanes', emoji: '🥐', price: 12, shape: { k: 'croissant', c: 0xe0a040 } },
  honey: { name: 'miel', emoji: '🍯', price: 11, shape: { k: 'jar', c: 0xffb300, c2: 0x6d4c41 } },
  sugarcane: { name: 'caña de azúcar', emoji: '🎋', price: 0, shape: { k: 'bundle', c: 0x9ccc65, c2: 0x558b2f }, grow: 'stalks', plant: 0x7cb342 },
  candy: { name: 'caramelos', emoji: '🍬', price: 10, shape: { k: 'candy', c: 0xec407a, c2: 0xffffff } },
  donut: { name: 'dónuts', emoji: '🍩', price: 13, shape: { k: 'donut', c: 0xd7a86e, c2: 0xf06292 } },
  cocoa: { name: 'cacao', emoji: '🌰', price: 0, shape: { k: 'ball', c: 0x8d4a1f, r: 0.1, sy: 1.5 }, grow: 'tree' },
  chocolate: { name: 'chocolate', emoji: '🍫', price: 14, shape: { k: 'box', c: 0x5d4037, c2: 0xd32f2f, w: 0.4, h: 0.06, d: 0.22 } },
  milkshake: { name: 'batidos', emoji: '🥤', price: 14, shape: { k: 'cup', c: 0xf48fb1, c2: 0xffffff } },
  cake: { name: 'tartas de fresa', emoji: '🍰', price: 18, shape: { k: 'cake', c: 0xfff3e0, c2: 0xe91e63 } },

  // ── Supermercado
  potato: { name: 'patatas', emoji: '🥔', price: 3, shape: { k: 'ball', c: 0xc8a165, r: 0.14, sy: 0.75 }, grow: 'leafy' },
  chips: { name: 'patatas fritas', emoji: '🍟', price: 9, shape: { k: 'box', c: 0xffeb3b, c2: 0xe53935, w: 0.26, h: 0.3, d: 0.1 } },
  sugar: { name: 'azúcar', emoji: '🧂', price: 0, shape: { k: 'bag', c: 0xffffff, c2: 0x1e88e5 } },
  cookies: { name: 'galletas', emoji: '🍪', price: 10, shape: { k: 'cookie', c: 0xc68642 } },
  soda: { name: 'refrescos', emoji: '🥤', price: 9, shape: { k: 'can', c: 0xe53935, c2: 0xffffff } },
  cereal: { name: 'cereales', emoji: '🥣', price: 11, shape: { k: 'box', c: 0xffa000, c2: 0x1565c0, w: 0.24, h: 0.32, d: 0.1 } },
  water: { name: 'agua', emoji: '💧', price: 5, shape: { k: 'bottle', c: 0x81d4fa, c2: 0x1565c0 } },
  orange: { name: 'naranjas', emoji: '🍊', price: 4, shape: { k: 'ball', c: 0xff9800, r: 0.14, c2: 0x43a047 }, grow: 'tree' },
  orangejuice: { name: 'zumo de naranja', emoji: '🧃', price: 10, shape: { k: 'bottle', c: 0xffa726, c2: 0xffffff } },
  rice: { name: 'arroz', emoji: '🍚', price: 6, shape: { k: 'bag', c: 0xfafafa, c2: 0x43a047 }, grow: 'stalks', plant: 0xaed581 },
  yogurt: { name: 'yogures', emoji: '🍦', price: 9, shape: { k: 'cup', c: 0xffffff, c2: 0xec407a, r: 0.07, h: 0.13 } },

  // ── Autos & Recambios
  oilbarrel: { name: 'barriles de crudo', emoji: '🛢️', price: 0, shape: { k: 'barrel', c: 0x37474f, c2: 0xffb300 } },
  ironore: { name: 'mineral de hierro', emoji: '🪨', price: 0, shape: { k: 'rock', c: 0x795548, c2: 0xff7043 } },
  sand: { name: 'arena', emoji: '🏖️', price: 0, shape: { k: 'bag', c: 0xe0c08a, c2: 0x8d6e63 } },
  lithium: { name: 'litio', emoji: '💎', price: 0, shape: { k: 'crystal', c: 0x80deea } },
  latex: { name: 'caucho', emoji: '🫙', price: 0, shape: { k: 'bucket', c: 0xfafafa, c2: 0x78909c }, grow: 'tree' },
  steel: { name: 'acero', emoji: '🧱', price: 0, shape: { k: 'ingot', c: 0x90a4ae } },
  glass: { name: 'vidrio', emoji: '🧊', price: 0, shape: { k: 'pane', c: 0xb3e5fc, w: 0.34, d: 0.22 } },
  gasoline: { name: 'gasolina', emoji: '⛽', price: 12, shape: { k: 'canister', c: 0xd32f2f } },
  motoroil: { name: 'aceite de motor', emoji: '🧴', price: 12, shape: { k: 'bottle', c: 0xffb300, c2: 0x212121 } },
  paint: { name: 'pintura', emoji: '🎨', price: 14, shape: { k: 'can', c: 0x42a5f5, c2: 0xffffff, r: 0.1, h: 0.18 } },
  tyre: { name: 'neumáticos', emoji: '🛞', price: 16, shape: { k: 'tyre' } },
  windshield: { name: 'parabrisas', emoji: '🪟', price: 18, shape: { k: 'pane', c: 0x4fc3f7, w: 0.46, d: 0.28 } },
  headlights: { name: 'faros', emoji: '💡', price: 16, shape: { k: 'headlight', c: 0x9e9e9e } },
  battery: { name: 'baterías', emoji: '🔋', price: 20, shape: { k: 'battery', c: 0x263238, c2: 0x76ff03 } },
  wrench: { name: 'llaves inglesas', emoji: '🔧', price: 12, shape: { k: 'wrench', c: 0x90a4ae } },
  bolts: { name: 'tornillos', emoji: '🔩', price: 10, shape: { k: 'bolts', c: 0xb0bec5 } },
  engine: { name: 'motores', emoji: '⚙️', price: 30, shape: { k: 'engine', c: 0x455a64, c2: 0xcfd8dc } },
  car: { name: 'coches', emoji: '🚗', price: 50, shape: { k: 'car', c: 0xe53935, c2: 0x81d4fa } },

  cash: { name: 'dinero', emoji: '💵', price: 0, shape: { k: 'cash' } },
};

// ───────── Materiales compartidos ─────────

const matCache = new Map<number, THREE.MeshLambertMaterial>();
export function lambert(color: number): THREE.MeshLambertMaterial {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    matCache.set(color, m);
  }
  return m;
}

// ───────── Construcción de mallas ─────────

const PI = Math.PI;

function buildShape(s: Shape): THREE.Group {
  const g = new THREE.Group();
  const c = s.c ?? 0xffffff;
  const c2 = s.c2 ?? 0xffffff;
  const add = (geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, lambert(color));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    g.add(m);
    return m;
  };
  const sphere = (r: number) => new THREE.SphereGeometry(r, 12, 9);
  const cyl = (rt: number, rb: number, h: number, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

  switch (s.k) {
    case 'ball': {
      const r = s.r ?? 0.15;
      const sy = s.sy ?? 1;
      add(sphere(r), c, 0, r * sy).scale.set(1, sy, 1);
      if (s.c2 !== undefined) add(new THREE.ConeGeometry(0.06, 0.07, 5), c2, 0, r * 2 * sy + 0.02);
      break;
    }
    case 'carrot':
      add(new THREE.ConeGeometry(0.08, 0.36, 8), 0xff8f00, 0.04, 0.08, 0, 0, 0, -PI / 2);
      add(new THREE.ConeGeometry(0.06, 0.14, 5), 0x43a047, -0.2, 0.08, 0, 0, 0, PI / 2);
      break;
    case 'corn':
      add(new THREE.CapsuleGeometry(0.08, 0.24, 4, 10), 0xfdd835, 0, 0.08, 0, 0, 0, PI / 2);
      add(new THREE.ConeGeometry(0.09, 0.32, 6), 0x7cb342, -0.06, 0.07, 0.03, 0, 0, PI / 2).scale.set(1, 1, 0.4);
      break;
    case 'strawberry':
      add(new THREE.ConeGeometry(0.1, 0.2, 10), 0xe53935, 0, 0.1, 0, PI);
      add(cyl(0.085, 0.085, 0.025, 6), 0x2e7d32, 0, 0.21);
      break;
    case 'cluster':
      for (const [x, z] of [[-0.06, 0], [0.06, 0.02], [0, -0.07]]) add(sphere(0.07), c, x, 0.08, z).scale.set(1, 1.2, 1);
      break;
    case 'bundle':
      add(cyl(0.1, 0.1, 0.5, 8), c, 0, 0.1, 0, 0, 0, PI / 2);
      add(cyl(0.106, 0.106, 0.08, 8), c2, 0, 0.1, 0, 0, 0, PI / 2);
      break;
    case 'bottle':
      add(cyl(0.085, 0.085, 0.24), c, 0, 0.12);
      add(cyl(0.04, 0.07, 0.08), c, 0, 0.28);
      add(cyl(0.045, 0.045, 0.04), c2, 0, 0.34);
      break;
    case 'box': {
      const w = s.w ?? 0.3;
      const h = s.h ?? 0.2;
      const d = s.d ?? 0.2;
      add(box(w, h, d), c, 0, h / 2);
      if (s.c2 !== undefined) add(box(w * 0.3, h + 0.004, d + 0.004), c2, 0, h / 2);
      break;
    }
    case 'bag':
      add(box(0.28, 0.24, 0.18), c, 0, 0.12);
      add(box(0.29, 0.06, 0.19), c2, 0, 0.12);
      break;
    case 'wedge':
      add(cyl(0.2, 0.2, 0.16, 3), c, 0, 0.08);
      break;
    case 'loaf': {
      const r = s.r ?? 0.1;
      add(new THREE.CapsuleGeometry(r, s.w ?? 0.22, 4, 10), c, 0, r, 0, 0, 0, PI / 2);
      break;
    }
    case 'croissant':
      add(new THREE.TorusGeometry(0.13, 0.065, 8, 12, PI * 1.1), c, 0, 0.065, 0, PI / 2);
      break;
    case 'donut':
      add(new THREE.TorusGeometry(0.12, 0.055, 10, 16), c, 0, 0.055, 0, PI / 2);
      add(new THREE.TorusGeometry(0.12, 0.045, 10, 16), c2, 0, 0.08, 0, PI / 2).scale.set(1, 1, 0.5);
      break;
    case 'jar':
      add(cyl(0.11, 0.11, 0.2), c, 0, 0.1);
      add(cyl(0.115, 0.115, 0.05), c2, 0, 0.225);
      break;
    case 'cup': {
      const r = s.r ?? 0.1;
      const h = s.h ?? 0.22;
      add(cyl(r, r * 0.78, h), c, 0, h / 2);
      add(cyl(r * 1.05, r * 1.05, 0.035), c2, 0, h + 0.017);
      if (h > 0.15) add(cyl(0.012, 0.012, 0.15, 6), 0xe53935, r * 0.4, h + 0.08);
      break;
    }
    case 'can': {
      const r = s.r ?? 0.085;
      const h = s.h ?? 0.17;
      add(cyl(r, r, h), c, 0, h / 2);
      add(cyl(r + 0.002, r + 0.002, h * 0.4), c2, 0, h / 2);
      break;
    }
    case 'pie':
      add(cyl(0.17, 0.14, 0.08, 14), c, 0, 0.04);
      add(cyl(0.15, 0.15, 0.02, 14), c2, 0, 0.09);
      break;
    case 'cake':
      add(cyl(0.15, 0.15, 0.14, 14), c, 0, 0.07);
      add(cyl(0.152, 0.152, 0.03, 14), c2, 0, 0.155);
      add(sphere(0.035), 0xc62828, 0, 0.2);
      break;
    case 'popcorn':
      add(cyl(0.1, 0.08, 0.2, 8), c, 0, 0.1);
      for (const [x, z] of [[-0.04, 0], [0.04, 0.02], [0, -0.04], [0.01, 0.04]]) add(sphere(0.045), 0xfff8e1, x, 0.22, z);
      break;
    case 'candy':
      add(sphere(0.075), c, 0, 0.075).scale.set(1.3, 1, 1);
      add(new THREE.ConeGeometry(0.05, 0.08, 6), c2, 0.13, 0.075, 0, 0, 0, PI / 2);
      add(new THREE.ConeGeometry(0.05, 0.08, 6), c2, -0.13, 0.075, 0, 0, 0, -PI / 2);
      break;
    case 'cookie':
      add(cyl(0.13, 0.13, 0.045, 14), c, 0, 0.022);
      for (const [x, z] of [[-0.05, 0.02], [0.05, -0.03], [0.01, 0.06]]) add(sphere(0.02), 0x3e2723, x, 0.045, z);
      break;
    case 'pizzabox':
      add(box(0.42, 0.07, 0.42), c, 0, 0.035);
      add(cyl(0.12, 0.12, 0.005, 16), c2, 0, 0.072);
      break;
    case 'calzone':
      add(new THREE.CapsuleGeometry(0.1, 0.16, 4, 10), c, 0, 0.06, 0, 0, 0, PI / 2).scale.set(1, 0.6, 1.4);
      break;
    case 'leaf':
      for (const [x, z, ry] of [[-0.06, 0, 0.4], [0.06, 0.02, -0.5], [0, -0.07, 1.6]])
        add(sphere(0.1), c, x, 0.03, z, 0, ry).scale.set(1, 0.25, 0.55);
      break;
    case 'mushroom':
      add(cyl(0.04, 0.05, 0.1, 8), 0xfafafa, 0, 0.05);
      add(new THREE.SphereGeometry(0.11, 12, 8, 0, PI * 2, 0, PI / 2), c, 0, 0.09);
      break;
    case 'pepper':
      add(sphere(0.1), c, 0, 0.12).scale.set(1, 1.2, 1);
      add(cyl(0.015, 0.02, 0.06, 6), 0x33691e, 0, 0.27);
      break;
    case 'layered':
      add(box(0.26, 0.1, 0.26), c, 0, 0.05);
      add(box(0.262, 0.03, 0.262), c2, 0, 0.115);
      break;
    case 'tyre':
      add(new THREE.TorusGeometry(0.13, 0.06, 8, 16), 0x212121, 0, 0.06, 0, PI / 2);
      add(cyl(0.08, 0.08, 0.1, 12), 0xb0bec5, 0, 0.06);
      break;
    case 'canister':
      add(box(0.22, 0.28, 0.12), c, 0, 0.14);
      add(box(0.1, 0.04, 0.04), 0x212121, -0.03, 0.3);
      add(cyl(0.02, 0.025, 0.06, 8), 0xffd600, 0.08, 0.31);
      break;
    case 'battery':
      add(box(0.3, 0.18, 0.2), c, 0, 0.09);
      add(box(0.302, 0.05, 0.202), c2, 0, 0.12);
      add(cyl(0.025, 0.025, 0.04, 8), 0xe53935, 0.08, 0.2);
      add(cyl(0.025, 0.025, 0.04, 8), 0x9e9e9e, -0.08, 0.2);
      break;
    case 'pane':
      add(box(s.w ?? 0.4, 0.03, s.d ?? 0.26), c, 0, 0.015);
      break;
    case 'headlight':
      add(cyl(0.11, 0.1, 0.1, 14), c, 0, 0.05);
      add(cyl(0.09, 0.09, 0.02, 14), 0xfff9c4, 0, 0.105);
      break;
    case 'wrench':
      add(box(0.32, 0.03, 0.06), c, -0.03, 0.015);
      add(new THREE.TorusGeometry(0.055, 0.022, 6, 10, PI * 1.5), c, 0.17, 0.02, 0, PI / 2, 0, PI * 0.25);
      break;
    case 'bolts':
      for (const x of [-0.08, 0, 0.08]) {
        add(cyl(0.025, 0.025, 0.14, 8), c, x, 0.07);
        add(cyl(0.05, 0.05, 0.03, 6), c, x, 0.155);
      }
      break;
    case 'engine':
      add(box(0.3, 0.2, 0.24), c, 0, 0.1);
      for (const x of [-0.08, 0, 0.08]) add(cyl(0.035, 0.035, 0.1, 10), c2, x, 0.25);
      add(box(0.06, 0.12, 0.26), 0x212121, 0.17, 0.08);
      break;
    case 'car':
      add(box(0.4, 0.1, 0.2), c, 0, 0.09);
      add(box(0.22, 0.09, 0.18), c2, -0.02, 0.185);
      for (const [x, z] of [[0.13, 0.1], [-0.13, 0.1], [0.13, -0.1], [-0.13, -0.1]])
        add(cyl(0.05, 0.05, 0.04, 10), 0x212121, x, 0.05, z, PI / 2);
      break;
    case 'barrel':
      add(cyl(0.11, 0.11, 0.26), c, 0, 0.13);
      add(cyl(0.113, 0.113, 0.025), c2, 0, 0.06);
      add(cyl(0.113, 0.113, 0.025), c2, 0, 0.2);
      break;
    case 'rock':
      add(new THREE.DodecahedronGeometry(0.13), c, 0, 0.11);
      add(new THREE.DodecahedronGeometry(0.05), c2, 0.07, 0.16, 0.06);
      break;
    case 'crystal':
      add(new THREE.OctahedronGeometry(0.12), c, 0, 0.18).scale.set(1, 1.5, 1);
      break;
    case 'ingot':
      add(cyl(0.12, 0.16, 0.1, 4), c, 0, 0.05, 0, 0, PI / 4).scale.set(1.3, 1, 0.7);
      break;
    case 'bucket':
      add(cyl(0.1, 0.085, 0.16), c2, 0, 0.08);
      add(cyl(0.095, 0.095, 0.01), c, 0, 0.16);
      break;
    case 'cash':
      add(box(0.44, 0.06, 0.24), 0x43a047, 0, 0.03);
      add(box(0.1, 0.064, 0.244), 0xc8e6c9, 0, 0.03);
      break;
  }
  return g;
}

interface Proto {
  mesh: THREE.Object3D;
  height: number;
  width: number;
  depth: number;
}

const protos = new Map<string, Proto>();
const box3 = new THREE.Box3();
const size = new THREE.Vector3();

function proto(type: ItemType): Proto {
  let p = protos.get(type);
  if (p) return p;
  const def = PRODUCTS[type];
  if (!def) throw new Error(`Producto desconocido: ${type}`);
  const mesh = buildShape(def.shape);
  // Normaliza: la base de la malla queda en y = 0.
  mesh.updateMatrixWorld(true);
  box3.setFromObject(mesh);
  for (const ch of mesh.children) ch.position.y -= box3.min.y;
  box3.getSize(size);
  p = { mesh, height: size.y, width: size.x, depth: size.z };
  protos.set(type, p);
  return p;
}

export function createItemMesh(type: ItemType): THREE.Object3D {
  return proto(type).mesh.clone();
}

export function itemSize(type: ItemType) {
  const p = proto(type);
  return { height: p.height, width: p.width, depth: p.depth };
}

export const itemHeight = (type: ItemType) => proto(type).height;
export const itemEmoji = (type: ItemType) => PRODUCTS[type]?.emoji ?? '❓';
export const itemName = (type: ItemType) => PRODUCTS[type]?.name ?? type;

export function createCoinMesh(): THREE.Object3D {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14), lambert(0xffc107));
  c.rotation.x = Math.PI / 2;
  return c;
}
