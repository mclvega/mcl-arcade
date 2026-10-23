import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { DIFFICULTIES, DIFFICULTY_ORDER, difficultyFeatures, LAYOUT, STATS, UPGRADE_CATEGORIES, upgradeCost, UPGRADES } from '../src/game/config';
import { PRODUCTS } from '../src/game/items';
import { gridLayout, makeItem, Stack, transfer } from '../src/game/stack';
import { areaAt, buildUnlocks, MACHINES, startMoney, STORE_MAP, storeLayout, storeProducts, STORES } from '../src/game/stores';
import { addTween, clearTweens, easeOutBack, updateTweens } from '../src/game/tween';
import { boxAt, damp, formatMoney, lerpAngle, resolveCollisions } from '../src/game/util';

/** localStorage de mentira: las claves son propiedades propias (como el real, para Object.keys). */
function almacenFalso(): Storage {
  const s = {} as Record<string, string>;
  Object.defineProperties(s, {
    getItem: { value: (k: string) => (k in s ? s[k] : null) },
    setItem: { value: (k: string, v: string) => (s[k] = String(v)) },
    removeItem: { value: (k: string) => delete s[k] },
    clear: { value: () => Object.keys(s).forEach((k) => delete s[k]) },
  });
  return s as unknown as Storage;
}

describe('tiendas', () => {
  it('cada paso apunta a un producto, máquina o tienda que existe', () => {
    for (const store of STORES) {
      for (const step of store.steps) {
        const [kind, ref] = step.split(':');
        if (kind === 'shelf' || kind === 'field') expect(PRODUCTS[ref!], `${store.id}: ${step}`).toBeDefined();
        else if (kind === 'machine') expect(MACHINES[ref!], `${store.id}: ${step}`).toBeDefined();
        else if (kind === 'expansion') expect(STORE_MAP.get(ref!), `${store.id}: ${step}`).toBeDefined();
        else expect(['cashier', 'stocker']).toContain(kind);
        if (kind === 'field') expect(PRODUCTS[ref!].grow, `${store.id}: ${step} sin forma de cultivo`).toBeDefined();
      }
    }
  });

  it('las cadenas de producción están completas: lo que se vende y lo que consumen las máquinas se produce en la tienda', () => {
    for (const store of STORES) {
      const producidos = new Set<string>();
      for (const step of store.steps) {
        const [kind, ref] = step.split(':');
        if (kind === 'field') producidos.add(ref!);
        if (kind === 'machine') producidos.add(MACHINES[ref!].output);
      }
      for (const p of storeProducts(store)) expect(producidos.has(p), `${store.id}: ${p} se vende pero no se produce`).toBe(true);
      for (const step of store.steps.filter((s) => s.startsWith('machine:'))) {
        const input = MACHINES[step.slice(8)].input;
        if (input) expect(producidos.has(input), `${store.id}: ${step} necesita ${input}`).toBe(true);
      }
    }
  });

  it('los desbloqueos se generan sin errores, con ids únicos y precios positivos', () => {
    for (const store of STORES) {
      const unlocks = buildUnlocks(store);
      expect(new Set(unlocks.map((u) => u.id)).size, store.id).toBe(unlocks.length);
      for (const u of unlocks) {
        expect(u.price).toBeGreaterThan(0);
        expect(Number.isFinite(u.x) && Number.isFinite(u.z)).toBe(true);
        // Lo que está en una ampliación necesita comprarla antes.
        if (u.area) expect(unlocks.findIndex((a) => a.id === u.area)).toBeLessThan(unlocks.indexOf(u));
      }
      // Dos construcciones no comparten hueco.
      const huecos = unlocks.filter((u) => u.kind === 'shelf' || u.kind === 'field' || u.kind === 'machine').map((u) => `${u.x},${u.z}`);
      expect(new Set(huecos).size, store.id).toBe(huecos.length);
      // El dinero inicial alcanza para los primeros pasos.
      const primeros = unlocks.slice(0, store.startSteps).reduce((s, u) => s + u.price, 0);
      expect(startMoney(store, unlocks)).toBeGreaterThanOrEqual(primeros);
    }
  });

  it('la disposición de cada tienda es siempre la misma y cambia entre tiendas', () => {
    const a = storeLayout(STORES[0]);
    const b = storeLayout(STORES[0]);
    expect(a.shelfSlots.map((v) => v.toArray())).toEqual(b.shelfSlots.map((v) => v.toArray()));
    expect(LAYOUT.trashSpots).toContain(a.trash);
    if (STORES.length > 1) {
      const otras = STORES.slice(1).map((s) => JSON.stringify(storeLayout(s).shelfSlots.map((v) => v.toArray())));
      expect(otras.some((o) => o !== JSON.stringify(a.shelfSlots.map((v) => v.toArray())))).toBe(true);
    }
  });

  it('zonas de ampliación', () => {
    const r = LAYOUT.areas.store.rect;
    expect(areaAt((r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2)).toBe('store');
    const f = LAYOUT.areas.farm.rect;
    expect(areaAt((f.minX + f.maxX) / 2, (f.minZ + f.maxZ) / 2)).toBe('farm');
    expect(areaAt(LAYOUT.playerStart.x, LAYOUT.playerStart.z)).toBeUndefined();
  });
});

describe('dificultad y mejoras', () => {
  it('las dificultades van de más fácil a más difícil', () => {
    expect([...DIFFICULTY_ORDER].sort()).toEqual(Object.keys(DIFFICULTIES).sort());
    for (let i = 1; i < DIFFICULTY_ORDER.length; i++) {
      const antes = DIFFICULTIES[DIFFICULTY_ORDER[i - 1]];
      const ahora = DIFFICULTIES[DIFFICULTY_ORDER[i]];
      expect(ahora.patienceBase).toBeLessThan(antes.patienceBase);
      expect(ahora.penaltyMult).toBeGreaterThanOrEqual(antes.penaltyMult);
      expect(ahora.thiefIdle).toBeLessThan(antes.thiefIdle);
    }
    expect(DIFFICULTIES.relax.canLose).toBe(false);
    expect(difficultyFeatures(DIFFICULTIES.relax)).toContain('nunca cierra');
    expect(difficultyFeatures(DIFFICULTIES.hard)).toContain('averías');
  });

  it('las mejoras cuestan cada vez más, en múltiplos de 5, y mejoran las estadísticas', () => {
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length);
    const cats = UPGRADE_CATEGORIES.map((c) => c.id);
    for (const u of UPGRADES) {
      expect(cats).toContain(u.category);
      for (let lvl = 1; lvl <= u.max; lvl++) {
        expect(upgradeCost(u, lvl, 1)).toBeGreaterThan(upgradeCost(u, lvl - 1, 1));
        expect(upgradeCost(u, lvl, 1.3) % 5).toBe(0);
      }
    }
    expect(STATS.playerCapacity(3)).toBeGreaterThan(STATS.playerCapacity(0));
    expect(STATS.playerSpeed(3)).toBeGreaterThan(STATS.playerSpeed(0));
    expect(STATS.growTime(3)).toBeLessThan(STATS.growTime(0));
    expect(STATS.checkoutInterval(3)).toBeLessThan(STATS.checkoutInterval(0));
  });
});

describe('utilidades', () => {
  it('ángulos por el camino corto, suavizado y dinero', () => {
    expect(lerpAngle(0, Math.PI * 2 - 0.1, 1)).toBeCloseTo(-0.1);
    expect(lerpAngle(3, -3, 0.5)).toBeCloseTo(3 + (2 * Math.PI - 6) / 2);
    expect(damp(0.016, 10)).toBeGreaterThan(0);
    expect(damp(0.016, 10)).toBeLessThan(1);
    expect(formatMoney(1500.7)).toBe('1500');
    expect(formatMoney(12345)).toBe('12.3K');
    expect(formatMoney(2_500_000)).toBe('2.5M');
  });

  it('un círculo sale de las cajas por el lado más cercano', () => {
    const pos = new THREE.Vector3(0.9, 0, 0);
    resolveCollisions(pos, 0.3, [boxAt(0, 0, 2, 2)]);
    expect(pos.x).toBeCloseTo(1.3);
    const fuera = new THREE.Vector3(5, 0, 5);
    resolveCollisions(fuera, 0.3, [boxAt(0, 0, 2, 2)]);
    expect(fuera.toArray()).toEqual([5, 0, 5]);
  });

  it('animaciones: empiezan en 0, avanzan y avisan al terminar', () => {
    clearTweens();
    const ks: number[] = [];
    let fin = false;
    addTween(1, (k) => ks.push(k), () => (fin = true));
    expect(ks).toEqual([0]);
    updateTweens(0.5);
    expect(ks.at(-1)).toBeCloseTo(0.5);
    updateTweens(0.6);
    expect(ks.at(-1)).toBe(1);
    expect(fin).toBe(true);
    updateTweens(1);
    expect(ks).toHaveLength(3);
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
    expect(Math.max(...[0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1);
  });
});

describe('pilas de productos', () => {
  it('rejilla por capas', () => {
    const lay = gridLayout(2, 2, 1, 1, 0.5);
    const v = new THREE.Vector3();
    lay(0, [], v);
    expect(v.toArray()).toEqual([-0.5, 0, -0.5]);
    lay(3, [], v);
    expect(v.toArray()).toEqual([0.5, 0, 0.5]);
    lay(4, [], v);
    expect(v.toArray()).toEqual([-0.5, 0.5, -0.5]);
  });

  it('meter, contar, sacar por tipo y pasar de una pila a otra respetando la capacidad', () => {
    clearTweens();
    const a = new Stack(new THREE.Object3D(), 3, gridLayout(3, 1, 0.5, 0.5, 0.4));
    const b = new Stack(new THREE.Object3D(), 1, gridLayout(1, 1, 0.5, 0.5, 0.4));
    const origen = new THREE.Vector3(1, 0, 1);
    a.push(makeItem('tomato', origen));
    a.push(makeItem('carrot', origen));
    a.push(makeItem('tomato', origen));
    expect(a.count).toBe(3);
    expect(a.full).toBe(true);
    expect(a.countOf('tomato')).toBe(2);
    expect(a.has('carrot')).toBe(true);
    expect(a.pop('carrot')?.type).toBe('carrot');
    expect(a.has('carrot')).toBe(false);
    expect(transfer(a, b)).toBe(true);
    expect(transfer(a, b)).toBe(false);
    expect(b.count).toBe(1);
    expect(a.count).toBe(1);
    // Los productos llegan a su hueco al terminar la animación.
    updateTweens(1);
    expect(b.items[0].mesh.position.distanceTo(b.items[0].target)).toBeLessThan(1e-6);
  });
});

describe('guardado y ajustes', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = almacenFalso();
  });

  it('tiendas desbloqueadas, progreso y borrado', async () => {
    const save = await import('../src/game/save');
    expect(save.isStoreUnlocked(STORES[0].id)).toBe(true);
    if (STORES[1]) {
      expect(save.isStoreUnlocked(STORES[1].id)).toBe(false);
      save.unlockStore(STORES[1].id);
      save.unlockStore(STORES[1].id);
      expect(save.isStoreUnlocked(STORES[1].id)).toBe(true);
    }
    save.unlockAllStores();
    for (const s of STORES) expect(save.isStoreUnlocked(s.id)).toBe(true);
    save.saveStore('granja', { money: 50, unlocked: ['shelf:tomato'], paid: {}, upgrades: { speed: 2 } });
    expect(save.loadStore('granja')?.upgrades.speed).toBe(2);
    save.clearStoreProgress('granja');
    expect(save.loadStore('granja')).toBeNull();
    expect(save.loadDifficulty('granja')).toBe('normal');
    save.saveDifficulty('granja', 'hard');
    expect(save.loadDifficulty('granja')).toBe('hard');
    localStorage.setItem('otro-juego', 'x');
    save.clearAll();
    expect(save.loadDifficulty('granja')).toBe('normal');
    expect(localStorage.getItem('otro-juego')).toBe('x');
  });

  it('el bigote antiguo pasa a vello facial y los datos rotos no rompen nada', async () => {
    const save = await import('../src/game/save');
    localStorage.setItem('mcl-arcade:v1:look', JSON.stringify({ accessory: 'mustache', shirt: 0xe53935 }));
    const look = save.loadLook();
    expect(look.accessory).toBe('none');
    expect(look.facialHair).toBe('mustache');
    expect(look.shirt).toBe(0xe53935);
    localStorage.setItem('mcl-arcade:v1:store:granja', '{roto');
    expect(save.loadStore('granja')).toBeNull();
  });

  it('los ajustes se guardan y avisan a quien escucha', async () => {
    const { settings, updateSettings, onSettingsChange } = await import('../src/game/settings');
    let avisos = 0;
    const quitar = onSettingsChange(() => avisos++);
    updateSettings({ quality: 'low', fpsLimit: 30 });
    expect(settings.quality).toBe('low');
    expect(JSON.parse(localStorage.getItem('mcl-arcade:settings')!).fpsLimit).toBe(30);
    expect(avisos).toBe(1);
    quitar();
    updateSettings({ showFps: true });
    expect(avisos).toBe(1);
  });
});
