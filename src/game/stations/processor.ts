import * as THREE from 'three';
import { CARE, EVENTS, GENERATOR_TIME_MULT, PROCESSOR_CAPACITY } from '../config';
import type { Game } from '../game';
import { createItemMesh, itemEmoji, itemSize, lambert, type ItemType } from '../items';
import { emojiGroundLabel, emojiSprite, ring } from '../labels';
import { castShadows, mesh } from '../props';
import { scene } from '../scene';
import { consumeItem, gridLayout, makeItem, Stack, transfer } from '../stack';
import type { MachineDef } from '../stores';
import type { Sink, Source } from '../types';
import { boxAt } from '../util';

const PALLET_GEO = new THREE.BoxGeometry(0.95, 0.12, 0.95);
const BAR_BG = new THREE.MeshBasicMaterial({ color: 0x333333 });
const BAR_FG = new THREE.MeshBasicMaterial({ color: 0x76ff03 });
const PI = Math.PI;

interface Visual {
  group: THREE.Group;
  /** Altura del cartel con el emoji. */
  signY: number;
  animate?: (t: number, working: boolean) => void;
}

function cow(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.3, 0.6), 0xffffff, 0, 0.42, 0));
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.22, 0.24), 0xffffff, 0, 0.55, 0.38));
  g.add(mesh(new THREE.BoxGeometry(0.36, 0.14, 0.2), 0x212121, 0, 0.48, -0.08));
  g.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), 0xf8bbd0, 0, 0.48, 0.5));
  for (const [x, z] of [[0.11, 0.2], [-0.11, 0.2], [0.11, -0.2], [-0.11, -0.2]]) g.add(mesh(new THREE.BoxGeometry(0.07, 0.28, 0.07), 0xeeeeee, x, 0.14, z));
  return g;
}

function hen(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), 0xffffff, 0, 0.2, 0));
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.1, 0.12), 0xe53935, 0, 0.42, 0.08));
  g.add(mesh(new THREE.ConeGeometry(0.04, 0.08, 4), 0xffa000, 0, 0.3, 0.22).rotateX(PI / 2));
  return g;
}

function buildVisual(def: MachineDef): Visual {
  const g = new THREE.Group();
  const c = def.color;
  let signY = 2.1;
  let animate: Visual['animate'];
  const animals: THREE.Object3D[] = [];
  const addAnimals = (spots: [number, number][]) => {
    for (const [x, z] of spots) {
      const a = def.animal === 'cow' ? cow() : hen();
      a.position.set(x, 0, z);
      animals.push(a);
      g.add(a);
    }
  };

  switch (def.style) {
    case 'oven': {
      g.add(mesh(new THREE.BoxGeometry(1.9, 1.3, 1.9), c, 0, 0.65, 0));
      g.add(mesh(new THREE.BoxGeometry(2.0, 0.12, 2.0), 0x78909c, 0, 1.36, 0));
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.05), new THREE.MeshBasicMaterial({ color: 0xff9800 }));
      mouth.position.set(0, 0.55, 0.96);
      g.add(mouth, mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 10), 0x8d6e63, 0.5, 1.8, -0.4));
      signY = 2.3;
      break;
    }
    case 'barn': {
      g.add(mesh(new THREE.BoxGeometry(1.9, 1.0, 1.9), c, 0, 0.5, 0));
      const roof = mesh(new THREE.ConeGeometry(1.6, 0.9, 4), 0xc62828, 0, 1.45, 0);
      roof.rotation.y = PI / 4;
      g.add(roof, mesh(new THREE.BoxGeometry(0.5, 0.6, 0.05), 0x5d4037, 0, 0.3, 0.96));
      if (def.animal) addAnimals([[-0.45, 1.3], [0.55, 1.35]]);
      signY = 2.4;
      break;
    }
    case 'factory': {
      g.add(mesh(new THREE.BoxGeometry(1.9, 1.2, 1.9), c, 0, 0.6, 0));
      g.add(mesh(new THREE.BoxGeometry(1.95, 0.15, 1.95), 0x546e7a, 0, 1.22, 0));
      g.add(mesh(new THREE.BoxGeometry(1.0, 0.4, 0.05), 0x81d4fa, 0, 0.75, 0.96));
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.9, 10), 0x90a4ae, -0.5, 1.7, -0.5));
      const gear = mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 8), 0xffc107, 0.97, 0.6, 0.3);
      gear.rotation.y = PI / 2;
      g.add(gear);
      animate = (t, w) => {
        if (w) gear.rotation.x = t * 3;
      };
      signY = 2.3;
      break;
    }
    case 'pen': {
      g.add(mesh(new THREE.BoxGeometry(1.9, 0.04, 1.9), 0xe6c96a, 0, 0.02, 0));
      for (const [x, z, w, d] of [[0, -0.95, 1.9, 0.08], [0, 0.95, 1.9, 0.08], [-0.95, 0, 0.08, 1.9], [0.95, 0, 0.08, 1.9]]) {
        g.add(mesh(new THREE.BoxGeometry(w, 0.08, d), c, x, 0.45, z), mesh(new THREE.BoxGeometry(w, 0.08, d), c, x, 0.25, z));
      }
      for (const [x, z] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) g.add(mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), c, x, 0.3, z));
      addAnimals(def.animal === 'cow' ? [[-0.4, -0.1], [0.4, 0.25]] : [[-0.4, -0.3], [0.35, 0.2], [-0.1, 0.45]]);
      signY = 1.6;
      break;
    }
    case 'water': {
      g.add(mesh(new THREE.BoxGeometry(1.9, 0.16, 1.9), c, 0, 0.08, 0));
      const water = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 1.6), new THREE.MeshLambertMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.9 }));
      water.position.y = 0.17;
      g.add(water);
      const bob = new THREE.Group();
      bob.add(mesh(new THREE.BoxGeometry(0.5, 0.12, 0.24), 0xffffff, 0, 0.24, 0), mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), 0x1565c0, 0, 0.45, 0));
      g.add(bob);
      animate = (t) => {
        bob.position.set(Math.sin(t * 0.8) * 0.3, Math.sin(t * 2) * 0.03, Math.cos(t * 0.6) * 0.3);
      };
      signY = 1.4;
      break;
    }
    case 'hive': {
      g.add(mesh(new THREE.BoxGeometry(1.6, 0.3, 1.0), 0x8d6e63, 0, 0.15, 0));
      for (const x of [-0.45, 0.45]) {
        for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(0.7, 0.28, 0.7), i % 2 ? 0xffe082 : c, x, 0.44 + i * 0.29, 0));
        g.add(mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), 0xffffff, x, 1.3, 0));
      }
      const bees = [0, 1, 2].map(() => mesh(new THREE.SphereGeometry(0.06, 6, 5), 0x212121));
      g.add(...bees);
      animate = (t) =>
        bees.forEach((b, i) => b.position.set(Math.sin(t * 2 + i * 2) * 0.9, 1.5 + Math.sin(t * 5 + i) * 0.15, Math.cos(t * 2 + i * 2) * 0.6));
      signY = 2.0;
      break;
    }
    case 'mill': {
      g.add(mesh(new THREE.CylinderGeometry(0.75, 0.95, 1.8, 10), c, 0, 0.9, 0));
      g.add(mesh(new THREE.ConeGeometry(0.85, 0.7, 10), 0xc62828, 0, 2.15, 0));
      const blades = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const b = mesh(new THREE.BoxGeometry(0.16, 1.2, 0.04), 0x8d6e63, 0, 0.6, 0);
        const holder = new THREE.Group();
        holder.rotation.z = (i * PI) / 2;
        holder.add(b);
        blades.add(holder);
      }
      blades.position.set(0, 1.7, 0.85);
      g.add(blades);
      animate = (t, w) => {
        blades.rotation.z = t * (w ? 2.5 : 0.6);
      };
      signY = 3.0;
      break;
    }
    case 'mine': {
      g.add(mesh(new THREE.DodecahedronGeometry(1.0), 0x8d8d8d, 0, 0.5, -0.2));
      g.add(mesh(new THREE.DodecahedronGeometry(0.55), c, 0.6, 0.35, 0.4));
      g.add(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1), 0x212121, -0.2, 0.45, 0.72));
      const cart = new THREE.Group();
      cart.add(mesh(new THREE.BoxGeometry(0.45, 0.25, 0.3), 0x6d4c41, 0, 0.2, 0), mesh(new THREE.DodecahedronGeometry(0.14), c, 0, 0.38, 0));
      g.add(cart);
      animate = (t, w) => {
        cart.position.set(-0.6 + (w ? Math.sin(t * 1.5) * 0.3 : 0), 0, 1.05);
      };
      signY = 2.1;
      break;
    }
    case 'oilwell': {
      g.add(mesh(new THREE.BoxGeometry(1.6, 0.15, 1.2), 0x616161, 0, 0.075, 0));
      g.add(mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), c, 0, 0.75, 0));
      const beam = new THREE.Group();
      beam.add(mesh(new THREE.BoxGeometry(1.7, 0.14, 0.14), 0xffa000, 0, 0, 0), mesh(new THREE.BoxGeometry(0.3, 0.4, 0.2), 0x37474f, 0.85, -0.15, 0));
      beam.position.set(0, 1.4, 0);
      g.add(beam, mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 10), 0x37474f, -0.8, 0.45, 0.2));
      animate = (t, w) => {
        beam.rotation.z = w ? Math.sin(t * 3) * 0.3 : 0;
      };
      signY = 2.3;
      break;
    }
  }

  if (def.style === 'habitat' || def.style === 'aquarium') {
    animate = buildHabitat(g, def);
    signY = def.style === 'aquarium' ? 2.1 : 1.9;
  }

  if (animals.length) {
    const prev = animate;
    animate = (t, w) => {
      prev?.(t, w);
      animals.forEach((a, i) => (a.rotation.y = Math.sin(t * 0.8 + i * 1.7) * 1.2));
    };
  }
  castShadows(g, true);
  return { group: g, signY, animate };
}

/** Corral de mascotas (o acuario) con animales que se mueven. */
function buildHabitat(g: THREE.Group, def: MachineDef): Visual['animate'] {
  const pets: THREE.Object3D[] = [];
  if (def.style === 'aquarium') {
    g.add(mesh(new THREE.BoxGeometry(1.8, 0.5, 1.2), def.color, 0, 0.25, 0));
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.9, 1.1),
      new THREE.MeshLambertMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.4, depthWrite: false }),
    );
    glass.position.y = 0.95;
    g.add(glass, mesh(new THREE.BoxGeometry(1.6, 0.06, 1.0), 0xfff59d, 0, 0.53, 0));
    for (let i = 0; i < 4; i++) {
      const fish = new THREE.Group();
      fish.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), i % 2 ? 0xff7043 : 0xffca28), mesh(new THREE.ConeGeometry(0.06, 0.1, 4), 0xff7043, -0.1, 0, 0).rotateZ(PI / 2));
      fish.children[0].scale.set(1.4, 1, 0.7);
      g.add(fish);
      pets.push(fish);
    }
    return (t) =>
      pets.forEach((f, i) => {
        const a = t * (0.6 + i * 0.15) + i * 1.7;
        f.position.set(Math.cos(a) * 0.6, 0.8 + Math.sin(t * 1.3 + i) * 0.2, Math.sin(a) * 0.35);
        f.rotation.y = -a - PI / 2;
      });
  }
  g.add(mesh(new THREE.BoxGeometry(1.9, 0.05, 1.9), 0x9ccc65, 0, 0.025, 0));
  for (const [x, z, w, d] of [[0, -0.95, 1.9, 0.06], [0, 0.95, 1.9, 0.06], [-0.95, 0, 0.06, 1.9], [0.95, 0, 0.06, 1.9]])
    g.add(mesh(new THREE.BoxGeometry(w, 0.3, d), 0xffffff, x, 0.15, z));
  const house = new THREE.Group();
  const roof = mesh(new THREE.ConeGeometry(0.55, 0.4, 4), 0xc62828, 0, 0.7, 0);
  roof.rotation.y = PI / 4;
  house.add(mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), def.color, 0, 0.25, 0), roof, mesh(new THREE.BoxGeometry(0.25, 0.3, 0.02), 0x3e2723, 0, 0.15, 0.31));
  house.position.set(-0.45, 0, -0.45);
  g.add(house, mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.08, 10), 0x90a4ae, 0.55, 0.06, -0.55));
  for (let i = 0; i < 3; i++) {
    const pet = createItemMesh(def.output);
    pet.scale.setScalar(1.8);
    g.add(pet);
    pets.push(pet);
  }
  return (t, working) =>
    pets.forEach((p, i) => {
      const a = t * 0.5 + i * 2.1;
      p.position.set(0.2 + Math.cos(a) * 0.45, working ? Math.abs(Math.sin(t * 6 + i)) * 0.06 : 0, 0.15 + Math.sin(a * 1.3) * 0.4);
      p.rotation.y = -a * 1.3;
    });
}

/** Máquina (entrada → salida) o generador (solo salida). */
export class Processor implements Source {
  readonly group = new THREE.Group();
  readonly input?: Stack;
  readonly output: Stack;
  readonly sink?: Sink;
  readonly access: THREE.Vector3;
  readonly type: ItemType;
  readonly inputType?: ItemType;
  private t = 0;
  private elapsed = Math.random() * 10;
  private visual: Visual;
  private bar: THREE.Mesh;
  private barBg: THREE.Mesh;
  private center: THREE.Vector3;
  /** Solo hábitats: nivel de comida (0–1). */
  hunger = 1;
  private hungryT = 0;
  private foodBar?: THREE.Mesh;
  private sign: THREE.Sprite;
  private sadSign?: THREE.Sprite;
  /** Avería (dificultades altas): deja de producir hasta que el jugador la repara. */
  broken = false;
  private repair = 0;
  private brokenSign: THREE.Sprite;

  constructor(
    private game: Game,
    readonly def: MachineDef,
    x: number,
    z: number,
  ) {
    this.type = def.output;
    this.inputType = def.input;
    this.group.position.set(x, 0, z);
    this.visual = buildVisual(def);
    this.group.add(this.visual.group);

    const sign = emojiSprite(def.emoji, 0.75);
    sign.position.set(0, this.visual.signY, 0);
    this.sign = sign;
    // Barra de progreso girada 45° para verse horizontal desde la cámara isométrica.
    const barHolder = new THREE.Group();
    barHolder.position.set(0, this.visual.signY - 0.6, 0);
    barHolder.rotation.y = PI / 4;
    this.barBg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.06), BAR_BG);
    this.bar = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.12, 0.08).translate(0.57, 0, 0), BAR_FG);
    this.bar.position.x = -0.57;
    barHolder.add(this.barBg, this.bar);
    this.group.add(sign, barHolder);

    if (def.care) {
      // Barra de comida y cartel triste cuando tienen hambre.
      const foodBg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.06), BAR_BG);
      foodBg.position.y = -0.22;
      this.foodBar = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.09, 0.08).translate(0.57, 0, 0), new THREE.MeshBasicMaterial({ color: 0x43a047 }));
      this.foodBar.position.set(-0.57, -0.22, 0);
      const bowl = emojiSprite('🍽️', 0.3);
      bowl.position.set(-0.78, -0.22, 0);
      barHolder.add(foodBg, this.foodBar, bowl);
      this.sadSign = emojiSprite('😿', 0.75);
      this.sadSign.position.copy(sign.position);
      this.sadSign.visible = false;
      this.group.add(this.sadSign);
    }

    const makePallet = (dx: number, type: ItemType) => {
      const pallet = new THREE.Mesh(PALLET_GEO, lambert(0xbcaaa4));
      pallet.position.set(dx, 0.06, 0);
      pallet.receiveShadow = true;
      const r = ring(0.8);
      r.position.set(dx, 0.025, 0);
      const label = emojiGroundLabel(itemEmoji(type), 0.55);
      label.position.set(dx, 0.03, 0.95);
      const anchor = new THREE.Object3D();
      anchor.position.set(dx, 0.12, 0);
      this.group.add(pallet, r, label, anchor);
      const { height } = itemSize(type);
      return new Stack(anchor, PROCESSOR_CAPACITY, gridLayout(2, 2, 0.42, 0.42, height + 0.01));
    };

    const player = game.player.stack;
    if (def.input) {
      const input = makePallet(-1.9, def.input);
      this.input = input;
      this.sink = {
        type: def.input,
        stack: input,
        access: new THREE.Vector3(x - 1.9, 0, z + 1.1),
        isShelf: false,
        priority: def.care ? () => (1 - this.hunger) * 1.5 : undefined,
      };
      game.addZone({
        pos: new THREE.Vector3(x - 1.9, 0, z),
        radius: 1.05,
        interval: 0.09,
        label: 'Soltar',
        icon: itemEmoji(def.input),
        canAct: () => !input.full && player.has(def.input),
        act: () => {
          if (transfer(player, input, def.input)) game.sfx.drop();
        },
      });
    }
    this.output = makePallet(1.9, def.output);
    game.addZone({
      pos: new THREE.Vector3(x + 1.9, 0, z),
      radius: 1.05,
      interval: 0.09,
      label: 'Recoger',
      icon: itemEmoji(def.output),
      canAct: () => this.output.count > 0 && !player.full,
      act: () => {
        if (transfer(this.output, player)) game.sfx.pick();
      },
    });

    this.brokenSign = emojiSprite('🔧', 0.85);
    this.brokenSign.position.copy(sign.position);
    this.brokenSign.visible = false;
    this.group.add(this.brokenSign);
    if (!def.care) {
      game.addZone({
        pos: new THREE.Vector3(x, 0, z),
        radius: 1.75,
        interval: 0.1,
        label: 'Reparar',
        icon: '🔧',
        enabled: () => this.broken,
        canAct: () => this.broken,
        act: () => {
          this.repair += 0.1 / EVENTS.repairTime;
          game.sfx.pay();
          if (this.repair >= 1) this.fix();
        },
      });
    }

    this.center = new THREE.Vector3(x, 1.0, z);
    this.access = new THREE.Vector3(x + 1.9, 0, z + 1.1);
    scene.add(this.group);
    game.obstacles.push(boxAt(x, z, 1.9, 1.9));
  }

  private breakDown() {
    this.broken = true;
    this.repair = 0;
    this.game.onMachineBroken(this);
  }

  private fix() {
    this.broken = false;
    this.repair = 0;
    this.visual.group.rotation.set(0, 0, 0);
    this.game.onMachineFixed(this);
  }

  get hungry() {
    return !!this.def.care && this.hunger <= 0;
  }

  /** Hábitats: comen de su comedero; si se vacía, dejan de criar y la tienda pierde reputación. */
  private updateCare(dt: number) {
    this.hunger = Math.max(0, this.hunger - dt / CARE.drainTime);
    if (this.hunger < CARE.feedAt && this.input && this.input.count > 0) {
      const it = this.input.pop();
      if (it) consumeItem(it, this.center, undefined, 0.3);
      this.hunger = Math.min(1, this.hunger + CARE.feedAmount);
    }
    if (this.hungry) {
      this.hungryT += dt;
      if (this.hungryT >= CARE.penaltyEvery) {
        this.hungryT = 0;
        this.game.onPetsHungry(this);
      }
    } else this.hungryT = 0;
    const bar = this.foodBar!;
    bar.scale.x = Math.max(0.001, this.hunger);
    (bar.material as THREE.MeshBasicMaterial).color.setHSL(this.hunger * 0.33, 0.85, 0.45);
    this.sign.visible = !this.hungry;
    this.sadSign!.visible = this.hungry;
  }

  update(dt: number, processTime: number) {
    this.elapsed += dt;
    if (this.def.care) this.updateCare(dt);
    const time = this.input ? processTime : processTime * GENERATOR_TIME_MULT;
    let working = (!this.input || this.input.count > 0) && !this.output.full && !this.hungry;
    const rate = this.game.difficulty.breakdownRate;
    if (working && rate > 0 && !this.def.care && !this.broken && Math.random() < (rate / 60) * dt) this.breakDown();
    if (this.broken) working = false;
    if (working) {
      this.t += dt;
      if (this.t >= time) {
        this.t = 0;
        const it = this.input?.pop();
        if (it) consumeItem(it, this.center, undefined, 0.25);
        this.output.push(makeItem(this.type, this.center.clone().setY(1.6)), 0.8, 0.35);
      }
    }
    // Averiada: la barra muestra el progreso de la reparación y la máquina tiembla.
    this.bar.scale.x = Math.max(0.001, this.broken ? this.repair : this.t / time);
    (this.bar.material as THREE.MeshBasicMaterial).color.set(this.broken ? 0xffa000 : 0x76ff03);
    this.bar.visible = this.barBg.visible = working || this.broken;
    this.brokenSign.visible = this.broken;
    if (this.broken) {
      this.sign.visible = false;
      this.visual.group.rotation.z = Math.sin(this.elapsed * 30) * 0.03;
    } else if (!this.def.care) this.sign.visible = true;
    this.visual.animate?.(this.elapsed, working);
    if (this.def.style === 'oven' || this.def.style === 'factory') {
      const pulse = working ? 1 + Math.sin(this.elapsed * 14) * 0.02 : 1;
      this.visual.group.scale.set(pulse, 2 - pulse, pulse);
    }
  }

  available() {
    return this.output.count;
  }

  take(to: Stack): boolean {
    return transfer(this.output, to);
  }
}
