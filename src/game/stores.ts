import { LAYOUT, type AreaId } from './config';
import { PRODUCTS } from './items';

// ───────── Máquinas y generadores ─────────

export type MachineStyle = 'oven' | 'barn' | 'factory' | 'pen' | 'water' | 'hive' | 'mill' | 'mine' | 'oilwell' | 'habitat' | 'aquarium';

export interface MachineDef {
  name: string;
  emoji: string;
  style: MachineStyle;
  color: number;
  /** Sin entrada = generador (produce solo). */
  input?: string;
  output: string;
  animal?: 'cow' | 'hen';
  /** Hábitat de mascotas: hay que mantener su comedero lleno o pierde reputación. */
  care?: boolean;
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
  // Tienda de Mascotas
  fishpond: { name: 'Estanque', emoji: '🐟', style: 'water', color: 0x8d6e63, output: 'fish' },
  algaepond: { name: 'Estanque de algas', emoji: '🌿', style: 'water', color: 0x4db6ac, output: 'algae' },
  petfoodfactory: { name: 'Fábrica de pienso', emoji: '🦴', style: 'factory', color: 0xbcaaa4, input: 'corn', output: 'dogfood' },
  catcannery: { name: 'Conservera', emoji: '🥫', style: 'factory', color: 0xb39ddb, input: 'fish', output: 'catfood' },
  toyfactory: { name: 'Juguetería', emoji: '🎾', style: 'factory', color: 0xdce775, input: 'latex', output: 'ball' },
  bedworkshop: { name: 'Taller de camas', emoji: '🛏️', style: 'factory', color: 0x9fa8da, input: 'cotton', output: 'bed' },
  kennel: { name: 'Criadero', emoji: '🐶', style: 'habitat', color: 0xd7a86e, input: 'dogfood', output: 'puppy', care: true },
  cattery: { name: 'Gatera', emoji: '🐱', style: 'habitat', color: 0xb0bec5, input: 'catfood', output: 'kitten', care: true },
  hutch: { name: 'Conejera', emoji: '🐰', style: 'habitat', color: 0xf8bbd0, input: 'carrot', output: 'bunny', care: true },
  aviary: { name: 'Pajarera', emoji: '🐦', style: 'habitat', color: 0x90caf9, input: 'seeds', output: 'bird', care: true },
  hamstery: { name: 'Hamstería', emoji: '🐹', style: 'habitat', color: 0xffcc80, input: 'seeds', output: 'hamster', care: true },
  aquarium: { name: 'Acuario', emoji: '🐠', style: 'aquarium', color: 0x6d4c41, input: 'algae', output: 'goldfish', care: true },
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
  /** Ideas de nombre para la tienda. */
  names: string[];
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
    names: ['Granja Feliz', 'El Rancho de McL', 'Huerta del Sol', 'La Vaca Contenta', 'Granja Los Pinos'],
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
      'machine:piebakery', 'shelf:applepie', 'stocker', 'expansion:mascotas',
    ],
  },
  {
    id: 'mascotas',
    name: 'Tienda de Mascotas',
    emoji: '🐾',
    tagline: 'Cría, alimenta y cuida mascotas felices.',
    names: ['Patitas Felices', 'Mundo Mascota', 'El Arca de McL', 'Huellitas', 'Bigotes y Colas'],
    saleMult: 1.15,
    costMult: 1.25,
    startSteps: 3,
    expansionPrice: 2200,
    theme: { sky: 0x9ccc65, ground: 0x9ccc65, farm: 0xaed581, floorA: 0xe3f2fd, floorB: 0xbbdefb, wall: 0xede7f6, sign: 0x8e24aa, shelf: 0xffb74d, shelfBack: 0xfb8c00, trees: 'round', accent: '#8e24aa' },
    steps: [
      'field:carrot', 'machine:hutch', 'shelf:bunny', 'cashier', 'shelf:carrot', 'field:seeds', 'machine:aviary',
      'shelf:bird', 'shelf:seeds', 'stocker', 'field:corn', 'machine:petfoodfactory', 'machine:kennel', 'shelf:puppy',
      'shelf:dogfood', 'machine:hamstery', 'shelf:hamster', 'machine:fishpond', 'machine:catcannery', 'machine:cattery',
      'shelf:kitten', 'shelf:catfood', 'stocker', 'machine:algaepond', 'machine:aquarium', 'shelf:goldfish',
      'field:latex', 'machine:toyfactory', 'shelf:ball', 'field:cotton', 'machine:bedworkshop', 'shelf:bed', 'stocker',
      'expansion:pizzeria',
    ],
  },
  {
    id: 'pizzeria',
    name: 'Pizzería',
    emoji: '🍕',
    tagline: 'Del huerto al horno: pizzas, calzones y postres.',
    names: ['Pizza Loca', 'Bella Napoli', 'Pizzería McL', 'Mamma Mia', 'La Masa Mágica'],
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
    names: ['Dulce Aroma', 'Café del Horno', 'Pan y Miel', 'La Espiga Dorada', 'Café McL'],
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
    names: ['Súper Ahorro', 'Mercado Central', 'McL Market', 'El Carrito Lleno', 'Súper Barrio'],
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
    names: ['Turbo Garage', 'Motor McL', 'Rueda Veloz', 'Pistón de Oro', 'Taller Nitro'],
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

export type UnlockKind = 'shelf' | 'field' | 'machine' | 'cashier' | 'stocker' | 'expansion' | 'area';

export interface UnlockDef {
  id: string;
  kind: UnlockKind;
  /** shelf/field: producto · machine: id de máquina · expansion: id de tienda · area: id de zona. */
  ref?: string;
  /** Zona que hay que haber comprado antes (si el hueco está en una ampliación). */
  area?: string;
  label: string;
  icon: string;
  price: number;
  x: number;
  z: number;
}

const KIND_MULT: Record<UnlockKind, number> = { shelf: 0.9, field: 1, machine: 1.2, cashier: 1.4, stocker: 2.2, expansion: 1, area: 2.5 };

const nicePrice = (p: number) => (p < 50 ? Math.round(p / 5) * 5 : p < 500 ? Math.round(p / 10) * 10 : Math.round(p / 50) * 50);

export function buildUnlocks(store: StoreDef): UnlockDef[] {
  let shelfI = 0;
  let farmI = 0;
  let staffI = 0;
  const counts: Record<string, number> = {};
  const out: UnlockDef[] = [];
  const priceAt = (i: number, kind: UnlockKind) => nicePrice((10 + 4 * i + 0.55 * i * i) * KIND_MULT[kind] * store.costMult);

  /** La primera vez que un paso cae en una ampliación, se añade antes la compra de esa zona. */
  const needArea = (id: AreaId, i: number): string => {
    const areaId = `area:${id}`;
    if (!out.some((u) => u.id === areaId)) {
      const a = LAYOUT.areas[id];
      out.push({ id: areaId, kind: 'area', ref: id, label: a.label, icon: a.icon, price: priceAt(i, 'area'), x: a.buy.x, z: a.buy.z });
    }
    return areaId;
  };

  store.steps.forEach((step, i) => {
    const [kind, ref] = step.split(':') as [UnlockKind, string | undefined];
    let pos;
    let label: string;
    let icon: string;
    let area: string | undefined;
    switch (kind) {
      case 'shelf':
        if (shelfI >= LAYOUT.areas.store.fromShelf) area = needArea('store', i);
        pos = LAYOUT.shelfSlots[shelfI++];
        label = 'Estantería';
        icon = PRODUCTS[ref!].emoji;
        break;
      case 'field': {
        if (farmI >= LAYOUT.areas.farm.fromFarm) area = needArea('farm', i);
        pos = LAYOUT.farmSlots[farmI++];
        const grow = PRODUCTS[ref!].grow;
        label = grow === 'tree' ? 'Frutales' : grow === 'stalks' ? 'Campo' : 'Huerto';
        icon = PRODUCTS[ref!].emoji;
        break;
      }
      case 'machine':
        if (farmI >= LAYOUT.areas.farm.fromFarm) area = needArea('farm', i);
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
      default:
        throw new Error(`Paso desconocido: ${step}`);
    }
    if (!pos) throw new Error(`Sin hueco en el mapa para ${step} (${store.id})`);
    const key = ref ? `${kind}:${ref}` : kind;
    counts[key] = (counts[key] ?? 0) + 1;
    const price = kind === 'expansion' ? store.expansionPrice ?? 1000 : priceAt(i, kind);
    out.push({ id: counts[key] > 1 ? `${key}#${counts[key]}` : key, kind, ref, area, label, icon, price, x: pos.x, z: pos.z });
  });
  return out;
}

export function startMoney(store: StoreDef, unlocks: UnlockDef[]) {
  return unlocks.slice(0, store.startSteps).reduce((s, u) => s + u.price, 0) + 5;
}

/** Productos que se venden en una tienda (para el menú). */
export function storeProducts(store: StoreDef): string[] {
  return store.steps.filter((s) => s.startsWith('shelf:')).map((s) => s.slice(6));
}
