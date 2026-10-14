import { sfx } from './audio';
import { PRODUCTS } from './items';
import { toggleFullscreen } from './fullscreen';
import { openCustomizer } from './customize';
import { escapeHtml, openNameDialog, openPlayerNameDialog } from './nameDialog';
import { DIFFICULTIES } from './config';
import { clearAll, displayName, isStoreUnlocked, loadDifficulty, loadPlayerName, loadStore, loadStoreName } from './save';
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
          <h3>${escapeHtml(unlocked ? displayName(store) : store.name)}
            ${unlocked && loadStoreName(store.id) ? `<button type="button" class="rename" data-rename="${store.id}" title="Cambiar nombre" aria-label="Cambiar nombre">✏️</button>` : ''}
          </h3>
          <p>${loadStoreName(store.id) ? `${store.name} · ` : ''}${store.tagline}</p>
          <div class="chips" title="${products.map((p) => PRODUCTS[p].name).join(', ')}">${products.map((p) => PRODUCTS[p].emoji).join('')}</div>
          ${
            unlocked
              ? `<div class="progress"><div style="width:${pct}%"></div></div>
                 <small>${built}/${total} construcciones · ${products.length} productos${
                   save ? ` · ${DIFFICULTIES[loadDifficulty(store.id)].emoji} ${DIFFICULTIES[loadDifficulty(store.id)].label} · ⭐ ${Math.round(save.rep ?? DIFFICULTIES[loadDifficulty(store.id)].startRep)}` : ''
                 }</small>`
              : `<small>Desbloquéala comprando «Nueva tienda» en ${prev?.name ?? 'la tienda anterior'}</small>`
          }
        </div>
        <button type="button" data-store="${store.id}" ${unlocked ? '' : 'disabled'}>${action}</button>
      </article>`;
  }).join('');

  list.onclick = (e) => {
    const rename = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-rename]');
    const renamed = STORES.find((s) => s.id === rename?.dataset.rename);
    if (renamed) {
      openNameDialog(renamed, () => renderStores(onPlay), false);
      return;
    }
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-store]');
    const store = STORES.find((s) => s.id === btn?.dataset.store);
    if (!btn || btn.disabled || !store) return;
    sfx.click();
    onPlay(store);
  };
}

function renderGreeting() {
  const name = loadPlayerName();
  $('greeting').innerHTML = name
    ? `¡Hola, <b>${escapeHtml(name)}</b>! <button type="button" class="rename" id="rename-player" title="Cambiar tu nombre" aria-label="Cambiar tu nombre">✏️</button>
       <button type="button" class="rename" id="customize-player" title="Personalizar personaje">👕 Personaje</button>`
    : '';
  const btn = document.getElementById('rename-player');
  if (btn) btn.onclick = () => openPlayerNameDialog(renderGreeting, false);
  const look = document.getElementById('customize-player');
  if (look) look.onclick = () => openCustomizer();
}

export function showMenu(onPlay: (s: StoreDef) => void) {
  $('version').textContent = `v${__APP_VERSION__}`;
  $('menu').hidden = false;
  renderStores(onPlay);
  renderGreeting();
  if (!loadPlayerName()) openPlayerNameDialog(() => openCustomizer(renderGreeting));
  $('menu-settings').onclick = () => openSettings();
  $('menu-help').onclick = () => openModal('❓ Cómo jugar', HELP_HTML);
  $('menu-customize').onclick = () => openCustomizer();
  $('menu-fullscreen').onclick = () => toggleFullscreen();
  $('menu-reset').onclick = () =>
    openModal('Borrar progreso', '<p>Se borrarán todas las tiendas, mejoras y dinero. ¿Seguro?</p>', [
      { label: 'Cancelar' },
      {
        label: 'Borrar todo',
        danger: true,
        onClick: () => {
          clearAll();
          renderStores(onPlay);
          renderGreeting();
          openPlayerNameDialog(renderGreeting);
        },
      },
    ]);
}

export function hideMenu() {
  $('menu').hidden = true;
}
