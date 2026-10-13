import { LAYOUT } from './config';
import { PRODUCTS } from './items';

// ───────── Máquinas y generadores ─────────

export type MachineStyle = 'oven' | 'barn' | 'factory' | 'pen' | 'water' | 'hive' | 'mill' | 'mine' | 'oilwell';

export interface MachineDef {
  name: string;
  emoji: string;
  style: MachineStyle;
  color: number;
  /** Sin entrada = generador (produce solo). */
  input?: string;
  output: string;
  animal?: 'cow' | 'hen';
}

export const MACHINES: Record<string, MachineDef> = {
  // Granja
  coop: { name: 'Gallinero', emoji: '🐔', style: 'barn', color: 0xd7a86e, input: 'corn', output: 'egg', animal: 'hen' },
  cowbarn: { name: 'Establo', emoji: '🐄', style: 'pen', color: 0xa1887f, output: 'milk', animal: 'cow' },
  oven: { name: 'Horno', emoji: '🔥', style: 'oven', color: 0xb0bec5, input: 'wheat', output: 'bread' },
  dairy: { name: 'Quesería', emoji: '🧀', style: 'factory', color: 0xfff176, input: 'milk', output: 'cheese' },
  ketchupper: { name: 'Embotelladora', emoji: '🥫', style: 'factory', color: 0xef5350, input: 'tomato', output: 'ketchup' },
  juicer: { name: 'Exprimidora', emoji: '🧃', style: 'factory', color: 0xffb74d, input: 'carrot', output: 'carrotjuice' },
  popper: { name: 'Palomitera', emoji: '🍿', style: 'factory', color: 0xe57373, input: 'corn', output: 'popcorn' },
  piebakery: { name: 'Pastelería', emoji: '🥧', style: 'oven', color: 0xd7ccc8, input: 'apple', output: 'applepie' },
  // Pizzería
  saucer: { name: 'Salsera', emoji: '🥫', style: 'factory', color: 0xef9a9a, input: 'tomato', output: 'sauce' },
  mill: { name: 'Molino', emoji: '🌾', style: 'mill', color: 0xeeeeee, input: 'wheat', output: 'flour' },
  kneader: { name: 'Amasadora', emoji: '🫓', style: 'factory', color: 0xffe0b2, input: 'flour', output: 'dough' },
  pizzaoven: { name: 'Horno de pizza', emoji: '🍕', style: 'oven', color: 0xbf8f6f, input: 'dough', output: 'pizza' },
  calzoneoven: { name: 'Horno calzone', emoji: '🥟', style: 'oven', color: 0xa1887f, input: 'dough', output: 'calzone' },
  garlicoven: { name: 'Horno de pan', emoji: '🥖', style: 'oven', color: 0xbcaaa4, input: 'dough', output: 'garlicbread' },
  oilpress: { name: 'Almazara', emoji: '🍶', style: 'factory', color: 0xc5e1a5, input: 'olives', output: 'oil' },
  dessert: { name: 'Postres', emoji: '🍮', style: 'factory', color: 0xf8bbd0, input: 'milk', output: 'tiramisu' },
  // Panadería & Café
  breadoven: { name: 'Horno', emoji: '🍞', style: 'oven', color: 0xb0bec5, input: 'flour', output: 'bread' },
  roaster: { name: 'Tostadora', emoji: '☕', style: 'factory', color: 0x8d6e63, input: 'coffeebean', output: 'coffee' },
  croissanter: { name: 'Hojaldrería', emoji: '🥐', style: 'oven', color: 0xffe0b2, input: 'flour', output: 'croissant' },
  beehive: { name: 'Colmenas', emoji: '🐝', style: 'hive', color: 0xffca28, output: 'honey' },
  candyfactory: { name: 'Dulcería', emoji: '🍬', style: 'factory', color: 0xce93d8, input: 'sugarcane', output: 'candy' },
  fryer: { name: 'Freidora', emoji: '🍩', style: 'factory', color: 0xf8bbd0, input: 'flour', output: 'donut' },
  chocolatier: { name: 'Chocolatera', emoji: '🍫', style: 'factory', color: 0x795548, input: 'cocoa', output: 'chocolate' },
  blender: { name: 'Batidora', emoji: '🥤', style: 'factory', color: 0x80deea, input: 'milk', output: 'milkshake' },
  cakeshop: { name: 'Repostería', emoji: '🍰', style: 'oven', color: 0xfce4ec, input: 'strawberry', output: 'cake' },
  // Supermercado
  chipsfryer: { name: 'Freidora', emoji: '🍟', style: 'factory', color: 0xfff59d, input: 'potato', output: 'chips' },
  refinery: { name: 'Refinería', emoji: '🧂', style: 'factory', color: 0xe0e0e0, input: 'sugarcane', output: 'sugar' },
  cookiefactory: { name: 'Galletera', emoji: '🍪', style: 'oven', color: 0xd7ccc8, input: 'sugar', output: 'cookies' },
  sodafactory: { name: 'Embotelladora', emoji: '🥤', style: 'factory', color: 0xef5350, input: 'sugar', output: 'soda' },
  cerealfactory: { name: 'Cereales', emoji: '🥣', style: 'factory', color: 0xffcc80, input: 'corn', output: 'cereal' },
  orangejuicer: { name: 'Exprimidora', emoji: '🧃', style: 'factory', color: 0xffb74d, input: 'orange', output: 'orangejuice' },
  spring: { name: 'Manantial', emoji: '💧', style: 'water', color: 0x8d6e63, output: 'water' },
  henhouse: { name: 'Gallinero', emoji: '🐔', style: 'pen', color: 0xd7a86e, output: 'egg', animal: 'hen' },
  yogurtfactory: { name: 'Yogurtera', emoji: '🍦', style: 'factory', color: 0xf8bbd0, input: 'milk', output: 'yogurt' },
  // Autos & Recambios
  oilwell: { name: 'Pozo petrolero', emoji: '🛢️', style: 'oilwell', color: 0x455a64, output: 'oilbarrel' },
  ironmine: { name: 'Mina de hierro', emoji: '⛏️', style: 'mine', color: 0x795548, output: 'ironore' },
  quarry: { name: 'Cantera', emoji: '🏖️', style: 'mine', color: 0xe0c08a, output: 'sand' },
  lithiummine: { name: 'Mina de litio', emoji: '💎', style: 'mine', color: 0x80deea, output: 'lithium' },
  foundry: { name: 'Fundición', emoji: '🔥', style: 'oven', color: 0x616161, input: 'ironore', output: 'steel' },
  fuelrefinery: { name: 'Refinería', emoji: '⛽', style: 'factory', color: 0xb0bec5, input: 'oilbarrel', output: 'gasoline' },
  lubricants: { name: 'Lubricantes', emoji: '🧴', style: 'factory', color: 0xffcc80, input: 'oilbarrel', output: 'motoroil' },
  paintshop: { name: 'Pinturas', emoji: '🎨', style: 'factory', color: 0x90caf9, input: 'oilbarrel', output: 'paint' },
  tyrefactory: { name: 'Neumáticos', emoji: '🛞', style: 'factory', color: 0x616161, input: 'latex', output: 'tyre' },
  glassworks: { name: 'Vidriería', emoji: '🧊', style: 'oven', color: 0xb3e5fc, input: 'sand', output: 'glass' },
  windshieldfactory: { name: 'Parabrisas', emoji: '🪟', style: 'factory', color: 0x81d4fa, input: 'glass', output: 'windshield' },
  headlightfactory: { name: 'Faros', emoji: '💡', style: 'factory', color: 0xfff59d, input: 'glass', output: 'headlights' },
  batteryfactory: { name: 'Baterías', emoji: '🔋', style: 'factory', color: 0xa5d6a7, input: 'lithium', output: 'battery' },
  toolshop: { name: 'Herramientas', emoji: '🔧', style: 'factory', color: 0xb0bec5, input: 'steel', output: 'wrench' },
  boltfactory: { name: 'Tornillería', emoji: '🔩', style: 'factory', color: 0x90a4ae, input: 'steel', output: 'bolts' },
  enginefactory: { name: 'Motores', emoji: '⚙️', style: 'factory', color: 0x78909c, input: 'steel', output: 'engine' },
  assembly: { name: 'Ensambladora', emoji: '🚗', style: 'factory', color: 0xff8a65, input: 'engine', output: 'car' },
};

// ───────── Tiendas ─────────

export interface Theme {
  sky: number;
  ground: number;
  farm: number;
  floorA: number;
  floorB: number;
  wall: number;
  sign: number;
  shelf: number;
  shelfBack: number;
  trees: 'pine' | 'round';
  accent: string;
}

export interface StoreDef {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  /** Multiplica el precio de venta de los productos. */
  saleMult: number;
  /** Multiplica el precio de construcciones y mejoras. */
  costMult: number;
  /** Cuántos de los primeros pasos se pueden pagar con el dinero inicial. */
  startSteps: number;
  expansionPrice?: number;
  theme: Theme;
  /** Orden de construcción: 'shelf:tomato', 'field:tomato', 'machine:oven', 'cashier', 'stocker', 'expansion:pizzeria'. */
  steps: string[];
}

export const STORES: StoreDef[] = [
  {
    id: 'granja',
    name: 'La Granja',
    emoji: '🚜',
    tagline: 'Cultiva, ordeña y hornea productos frescos.',
    saleMult: 1,
    costMult: 1,
    startSteps: 2,
    expansionPrice: 1500,
    theme: { sky: 0x9ccc65, ground: 0x8bc34a, farm: 0x9ccc65, floorA: 0xf6e7c8, floorB: 0xecd9b2, wall: 0xefe2c8, sign: 0xe53935, shelf: 0x4fc3f7, shelfBack: 0x29b6f6, trees: 'pine', accent: '#e53935' },
    steps: [
      'shelf:tomato', 'field:tomato', 'field:carrot', 'shelf:carrot', 'cashier', 'field:corn', 'shelf:corn',
      'machine:coop', 'shelf:egg', 'field:apple', 'shelf:apple', 'stocker', 'machine:cowbarn', 'shelf:milk',
      'field:wheat', 'machine:oven', 'shelf:bread', 'machine:ketchupper', 'shelf:ketchup', 'machine:dairy',
      'shelf:cheese', 'stocker', 'machine:juicer', 'shelf:carrotjuice', 'machine:popper', 'shelf:popcorn',
      'machine:piebakery', 'shelf:applepie', 'stocker', 'expansion:pizzeria',
    ],
  },
  {
    id: 'pizzeria',
    name: 'Pizzería',
    emoji: '🍕',
    tagline: 'Del huerto al horno: pizzas, calzones y postres.',
    saleMult: 1.3,
    costMult: 1.5,
    startSteps: 2,
    expansionPrice: 3000,
    theme: { sky: 0x9ccc65, ground: 0x9ccc65, farm: 0xaed581, floorA: 0xffffff, floorB: 0xffcdd2, wall: 0xfff3e0, sign: 0x2e7d32, shelf: 0xef5350, shelfBack: 0xc62828, trees: 'round', accent: '#2e7d32' },
    steps: [
      'shelf:tomato', 'field:tomato', 'field:basil', 'shelf:basil', 'cashier', 'machine:saucer', 'shelf:sauce',
      'field:wheat', 'machine:mill', 'machine:kneader', 'machine:pizzaoven', 'shelf:pizza', 'stocker',
      'field:mushroom', 'shelf:mushroom', 'field:pepper', 'shelf:pepper', 'machine:cowbarn', 'machine:dairy',
      'shelf:cheese', 'stocker', 'field:olives', 'shelf:olives', 'machine:oilpress', 'shelf:oil',
      'machine:calzoneoven', 'shelf:calzone', 'machine:garlicoven', 'shelf:garlicbread', 'machine:dessert',
      'shelf:tiramisu', 'stocker', 'expansion:panaderia',
    ],
  },
  {
    id: 'panaderia',
    name: 'Panadería & Café',
    emoji: '🥐',
    tagline: 'Harina, café y dulces recién hechos.',
    saleMult: 1.6,
    costMult: 2.2,
    startSteps: 2,
    expansionPrice: 5000,
    theme: { sky: 0xa5c46b, ground: 0xa5c46b, farm: 0xb5cf7a, floorA: 0xfff3e0, floorB: 0xf3d9b1, wall: 0xffccbc, sign: 0x8d6e63, shelf: 0xffb74d, shelfBack: 0xf57c00, trees: 'round', accent: '#8d6e63' },
    steps: [
      'shelf:strawberry', 'field:strawberry', 'field:wheat', 'machine:mill', 'machine:breadoven', 'shelf:bread',
      'cashier', 'machine:cowbarn', 'shelf:milk', 'field:coffeebean', 'machine:roaster', 'shelf:coffee', 'stocker',
      'machine:croissanter', 'shelf:croissant', 'machine:beehive', 'shelf:honey', 'field:sugarcane',
      'machine:candyfactory', 'shelf:candy', 'stocker', 'machine:fryer', 'shelf:donut', 'field:cocoa',
      'machine:chocolatier', 'shelf:chocolate', 'machine:blender', 'shelf:milkshake', 'machine:cakeshop',
      'shelf:cake', 'stocker', 'expansion:supermercado',
    ],
  },
  {
    id: 'supermercado',
    name: 'Supermercado',
    emoji: '🛒',
    tagline: 'De todo un poco: snacks, bebidas y básicos.',
    saleMult: 2,
    costMult: 3,
    startSteps: 2,
    expansionPrice: 8000,
    theme: { sky: 0x8bc34a, ground: 0x8bc34a, farm: 0x9ccc65, floorA: 0xeceff1, floorB: 0xcfd8dc, wall: 0xffffff, sign: 0x1565c0, shelf: 0x66bb6a, shelfBack: 0x388e3c, trees: 'pine', accent: '#1565c0' },
    steps: [
      'shelf:potato', 'field:potato', 'field:orange', 'shelf:orange', 'cashier', 'machine:chipsfryer', 'shelf:chips',
      'machine:spring', 'shelf:water', 'machine:henhouse', 'shelf:egg', 'stocker', 'machine:cowbarn', 'shelf:milk',
      'field:sugarcane', 'machine:refinery', 'machine:sodafactory', 'shelf:soda', 'machine:cookiefactory',
      'shelf:cookies', 'stocker', 'field:corn', 'machine:cerealfactory', 'shelf:cereal', 'machine:orangejuicer',
      'shelf:orangejuice', 'field:rice', 'shelf:rice', 'machine:yogurtfactory', 'shelf:yogurt', 'stocker',
      'expansion:autos',
    ],
  },
  {
    id: 'autos',
    name: 'Autos & Recambios',
    emoji: '🚗',
    tagline: 'Extrae, refina y fabrica piezas… ¡y coches!',
    saleMult: 2.5,
    costMult: 4,
    startSteps: 3,
    theme: { sky: 0x8d9e6a, ground: 0x8d9e6a, farm: 0xb0b0b0, floorA: 0xcfd8dc, floorB: 0xb0bec5, wall: 0x90a4ae, sign: 0xff6f00, shelf: 0x546e7a, shelfBack: 0x37474f, trees: 'round', accent: '#ff6f00' },
    steps: [
      'machine:oilwell', 'machine:fuelrefinery', 'shelf:gasoline', 'cashier', 'machine:lubricants', 'shelf:motoroil',
      'field:latex', 'machine:tyrefactory', 'shelf:tyre', 'stocker', 'machine:ironmine', 'machine:foundry',
      'machine:toolshop', 'shelf:wrench', 'machine:boltfactory', 'shelf:bolts', 'machine:paintshop', 'shelf:paint',
      'stocker', 'machine:quarry', 'machine:glassworks', 'machine:windshieldfactory', 'shelf:windshield',
      'machine:headlightfactory', 'shelf:headlights', 'machine:lithiummine', 'machine:batteryfactory',
      'shelf:battery', 'stocker', 'machine:enginefactory', 'shelf:engine', 'machine:assembly', 'shelf:car',
    ],
  },
];

export const STORE_MAP = new Map(STORES.map((s) => [s.id, s]));

// ───────── Resolución de pasos → desbloqueos con posición ─────────

export type UnlockKind = 'shelf' | 'field' | 'machine' | 'cashier' | 'stocker' | 'expansion';

export interface UnlockDef {
  id: string;
  kind: UnlockKind;
  /** shelf/field: producto · machine: id de máquina · expansion: id de tienda. */
  ref?: string;
  label: string;
  icon: string;
  price: number;
  x: number;
  z: number;
}

const KIND_MULT: Record<UnlockKind, number> = { shelf: 0.9, field: 1, machine: 1.2, cashier: 1.4, stocker: 2.2, expansion: 1 };

const nicePrice = (p: number) => (p < 50 ? Math.round(p / 5) * 5 : p < 500 ? Math.round(p / 10) * 10 : Math.round(p / 50) * 50);

export function buildUnlocks(store: StoreDef): UnlockDef[] {
  let shelfI = 0;
  let farmI = 0;
  let staffI = 0;
  const counts: Record<string, number> = {};

  return store.steps.map((step, i) => {
    const [kind, ref] = step.split(':') as [UnlockKind, string | undefined];
    let pos;
    let label: string;
    let icon: string;
    switch (kind) {
      case 'shelf':
        pos = LAYOUT.shelfSlots[shelfI++];
        label = 'Estantería';
        icon = PRODUCTS[ref!].emoji;
        break;
      case 'field': {
        pos = LAYOUT.farmSlots[farmI++];
        const grow = PRODUCTS[ref!].grow;
        label = grow === 'tree' ? 'Frutales' : grow === 'stalks' ? 'Campo' : 'Huerto';
        icon = PRODUCTS[ref!].emoji;
        break;
      }
      case 'machine':
        pos = LAYOUT.farmSlots[farmI++];
        label = MACHINES[ref!].name;
        icon = MACHINES[ref!].emoji;
        break;
      case 'cashier':
        pos = LAYOUT.cashierZone;
        label = 'Cajero';
        icon = '🙋';
        break;
      case 'stocker':
        pos = LAYOUT.staffHomes[staffI++];
        label = 'Reponedor';
        icon = '🧺';
        break;
      case 'expansion':
        pos = LAYOUT.expansionZone;
        label = 'Nueva tienda';
        icon = STORE_MAP.get(ref!)?.emoji ?? '🏪';
        break;
    }
    if (!pos) throw new Error(`Sin hueco en el mapa para ${step} (${store.id})`);
    const key = ref ? `${kind}:${ref}` : kind;
    counts[key] = (counts[key] ?? 0) + 1;
    const base = 10 + 4 * i + 0.55 * i * i;
    const price = kind === 'expansion' ? store.expansionPrice ?? 1000 : nicePrice(base * KIND_MULT[kind] * store.costMult);
    return { id: counts[key] > 1 ? `${key}#${counts[key]}` : key, kind, ref, label, icon, price, x: pos.x, z: pos.z };
  });
}

export function startMoney(store: StoreDef, unlocks: UnlockDef[]) {
  return unlocks.slice(0, store.startSteps).reduce((s, u) => s + u.price, 0) + 5;
}

/** Productos que se venden en una tienda (para el menú). */
export function storeProducts(store: StoreDef): string[] {
  return store.steps.filter((s) => s.startsWith('shelf:')).map((s) => s.slice(6));
}
