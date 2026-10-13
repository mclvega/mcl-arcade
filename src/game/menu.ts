import { sfx } from './audio';
import { PRODUCTS } from './items';
import { clearAll, isStoreUnlocked, loadStore } from './save';
import { openSettings } from './settingsPanel';
import { buildUnlocks, STORES, storeProducts, type StoreDef } from './stores';
import { $, HELP_HTML, openModal } from './ui';

function previousStore(store: StoreDef) {
  return STORES.find((s) => s.steps.includes(`expansion:${store.id}`));
}

function renderStores(onPlay: (s: StoreDef) => void) {
  const list = $('store-list');
  list.innerHTML = STORES.map((store) => {
    const unlocked = isStoreUnlocked(store.id);
    const save = loadStore(store.id);
    const total = buildUnlocks(store).length;
    const built = save?.unlocked.length ?? 0;
    const pct = Math.round((built / total) * 100);
    const products = storeProducts(store);
    const prev = previousStore(store);
    const action = !unlocked ? '🔒 Bloqueada' : built > 0 ? 'Continuar ▶' : 'Jugar ▶';
    return `
      <article class="store-card ${unlocked ? '' : 'locked'}" style="--accent:${store.theme.accent}">
        <div class="store-emoji">${store.emoji}</div>
        <div class="store-body">
          <h3>${store.name}</h3>
          <p>${store.tagline}</p>
          <div class="chips" title="${products.map((p) => PRODUCTS[p].name).join(', ')}">${products.map((p) => PRODUCTS[p].emoji).join('')}</div>
          ${
            unlocked
              ? `<div class="progress"><div style="width:${pct}%"></div></div>
                 <small>${built}/${total} construcciones · ${products.length} productos</small>`
              : `<small>Desbloquéala comprando «Nueva tienda» en ${prev?.name ?? 'la tienda anterior'}</small>`
          }
        </div>
        <button type="button" data-store="${store.id}" ${unlocked ? '' : 'disabled'}>${action}</button>
      </article>`;
  }).join('');

  list.onclick = (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-store]');
    const store = STORES.find((s) => s.id === btn?.dataset.store);
    if (!btn || btn.disabled || !store) return;
    sfx.click();
    onPlay(store);
  };
}

export function showMenu(onPlay: (s: StoreDef) => void) {
  $('menu').hidden = false;
  renderStores(onPlay);
  $('menu-settings').onclick = () => openSettings();
  $('menu-help').onclick = () => openModal('❓ Cómo jugar', HELP_HTML);
  $('menu-reset').onclick = () =>
    openModal('Borrar progreso', '<p>Se borrarán todas las tiendas, mejoras y dinero. ¿Seguro?</p>', [
      { label: 'Cancelar' },
      {
        label: 'Borrar todo',
        danger: true,
        onClick: () => {
          clearAll();
          renderStores(onPlay);
        },
      },
    ]);
}

export function hideMenu() {
  $('menu').hidden = true;
}
