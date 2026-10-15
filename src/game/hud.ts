import { REPUTATION, UPGRADE_CATEGORIES, UPGRADES, type DifficultyDef } from './config';
import type { Game } from './game';
import { toggleFullscreen } from './fullscreen';
import { openSettings } from './settingsPanel';
import { settings } from './settings';
import type { SpecialOrder } from './stations/order';
import type { Zone } from './types';
import { itemEmoji } from './items';
import { $, closeModal, isModalOpen, openModal, toast } from './ui';
import { formatMoney } from './util';

export class Hud {
  private moneyEl = $('money');
  private moneyValue = $('money-value');
  private hintEl = $('hint');
  private fpsEl = $('fps');
  private repEl = $('rep');
  private orderEl = $('order');
  private orderKey = '';
  private actionBtn = $<HTMLButtonElement>('action-btn');
  private actionIcon = this.actionBtn.querySelector<HTMLElement>('.act-icon')!;
  private actionLabel = this.actionBtn.querySelector<HTMLElement>('.act-label')!;
  private upgradesEl: HTMLElement | null = null;
  private placeBar = $('place-bar');
  private shownMoney = -1;
  private hint = '';
  private action: Zone | null | undefined;
  private bumpTimer = 0;
  private abort = new AbortController();

  constructor(private game: Game) {
    const opts = { signal: this.abort.signal };
    $('hud').hidden = false;
    $('store-name').textContent = `${game.store.emoji} ${game.name}`;
    // En vertical solo se ve ☰; al pulsarlo se despliegan los demás y se recogen al elegir uno.
    const hudButtons = document.querySelector<HTMLElement>('.hud-buttons')!;
    const menuBtn = $('btn-hud-menu');
    hudButtons.classList.remove('open');
    hudButtons.addEventListener('click', (e) => {
      const open = e.target === menuBtn ? !hudButtons.classList.contains('open') : false;
      hudButtons.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    }, opts);
    $('btn-home').addEventListener('click', () => game.goToMenu(), opts);
    $('btn-upgrades').addEventListener('click', () => this.openUpgrades(), opts);
    $('btn-move').addEventListener('click', () => this.openMove(), opts);
    this.placeBar.querySelector('.place-ok')!.addEventListener('click', () => game.confirmPlacing(), opts);
    this.placeBar.querySelector('.place-cancel')!.addEventListener('click', () => game.cancelPlacing(), opts);
    window.addEventListener('keydown', (e) => {
      if (!game.isPlacing || isModalOpen()) return;
      if (e.code === 'Enter') game.confirmPlacing();
      else if (e.code === 'Escape') game.cancelPlacing();
    }, opts);
    $('btn-settings').addEventListener('click', () => openSettings(), opts);
    $('btn-fullscreen').addEventListener('click', () => toggleFullscreen(), opts);
    this.orderEl.querySelector('.order-close')!.addEventListener('click', () => game.rejectOrder(), opts);

    const btn = this.actionBtn;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      btn.classList.add('pressed');
      game.actionDown();
    }, opts);
    const up = () => {
      btn.classList.remove('pressed');
      game.actionUp();
    };
    btn.addEventListener('pointerup', up, opts);
    btn.addEventListener('pointercancel', up, opts);
    btn.addEventListener('contextmenu', (e) => e.preventDefault(), opts);
  }

  /** Barra de reputación (0–100) con el emoji de la dificultad. */
  setRep(rep: number, d: DifficultyDef) {
    const pct = Math.max(0, Math.min(100, rep));
    const color = rep < REPUTATION.warning ? '#e53935' : rep < 50 ? '#ffb300' : '#43a047';
    this.repEl.style.setProperty('--rep', `${pct}%`);
    this.repEl.style.setProperty('--rep-color', color);
    this.repEl.querySelector('.rep-value')!.textContent = `${Math.round(rep)}`;
    this.repEl.querySelector('.rep-diff')!.textContent = d.emoji;
    this.repEl.title = `Reputación ${Math.round(rep)}/100 · Dificultad ${d.label}`;
    this.repEl.classList.toggle('danger', rep < REPUTATION.warning);
  }

  /** Tarjeta del pedido especial (null la oculta). */
  setOrder(o: SpecialOrder | null) {
    if (!o || !o.active) {
      this.orderEl.hidden = true;
      this.orderKey = '';
      return;
    }
    const secs = Math.max(0, Math.ceil(o.timeLeft));
    const key = `${secs}|${o.lines.map((l) => l.got).join(',')}`;
    if (key === this.orderKey) return;
    this.orderKey = key;
    this.orderEl.hidden = false;
    this.orderEl.querySelector('.order-time')!.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    this.orderEl.querySelector('.order-lines')!.innerHTML = o.lines
      .map((l) => `<span class="${l.got >= l.qty ? 'done' : ''}">${itemEmoji(l.type)} ${l.got}/${l.qty}</span>`)
      .join('');
    const frac = o.timeLeft / o.total;
    const bar = this.orderEl.querySelector<HTMLElement>('.order-bar div')!;
    bar.style.width = `${Math.max(0, frac * 100)}%`;
    bar.style.background = `hsl(${Math.round(frac * 120)}, 80%, 45%)`;
    this.orderEl.querySelector('.order-reward')!.textContent = `Recompensa: $${formatMoney(o.reward)} y ⭐`;
  }

  /** Contador de FPS (opción «Mostrar FPS»). `null` lo reinicia. */
  setFps(fps: number | null) {
    this.fpsEl.hidden = !settings.showFps;
    if (settings.showFps) this.fpsEl.textContent = fps === null ? '… FPS' : `${Math.round(fps)} FPS`;
  }

  dispose() {
    this.abort.abort();
    this.fpsEl.hidden = true;
    this.orderEl.hidden = true;
    this.placeBar.hidden = true;
    $('hud').hidden = true;
    this.actionBtn.hidden = true;
    this.hintEl.classList.add('hidden');
  }

  update() {
    const m = Math.floor(this.game.money);
    if (m === this.shownMoney) return;
    if (m > this.shownMoney && this.shownMoney >= 0) {
      this.moneyEl.classList.add('bump');
      clearTimeout(this.bumpTimer);
      this.bumpTimer = window.setTimeout(() => this.moneyEl.classList.remove('bump'), 120);
    }
    this.shownMoney = m;
    this.moneyValue.textContent = formatMoney(m);
    if (this.upgradesEl?.isConnected && isModalOpen()) this.renderUpgrades();
  }

  setHint(text: string) {
    if (text === this.hint) return;
    this.hint = text;
    if (text) this.hintEl.textContent = text;
    this.hintEl.classList.toggle('hidden', !text);
  }

  /** Botón de acción del modo manual: visible solo si hay algo que hacer. */
  setAction(zone: Zone | null) {
    if (zone === this.action) return;
    this.action = zone;
    this.actionBtn.hidden = !zone;
    if (!zone) {
      this.actionBtn.classList.remove('pressed');
      return;
    }
    this.actionIcon.textContent = zone.icon;
    this.actionLabel.textContent = zone.label;
  }

  toast(msg: string, ms?: number) {
    toast(msg, ms);
  }

  openUpgrades() {
    const el = document.createElement('div');
    this.upgradesEl = el;
    el.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]');
      if (btn && !btn.disabled) {
        this.game.buyUpgrade(btn.dataset.id!);
        this.renderUpgrades();
      }
    });
    this.renderUpgrades();
    openModal('⬆ Mejoras', el, [{ label: 'Cerrar', primary: true }]);
  }

  private renderUpgrades() {
    const g = this.game;
    const el = this.upgradesEl!;
    const rows: string[] = [];
    for (const cat of UPGRADE_CATEGORIES) {
      const list = UPGRADES.filter((u) => u.category === cat.id && (!u.requires || g.hasBuilt(u.requires)));
      if (!list.length) continue;
      rows.push(`<h3 class="upg-cat">${cat.title}</h3>`);
      for (const u of list) {
        const lvl = g.level(u.id);
        const maxed = lvl >= u.max;
        const cost = g.upgradePrice(u.id);
        rows.push(`<div class="upg">
          <div class="upg-icon">${u.icon}</div>
          <div class="upg-info"><b>${u.name}</b><span class="lvl">Nv ${lvl}/${u.max}</span><small>${u.desc}</small></div>
          <button type="button" data-id="${u.id}" ${maxed || g.money < cost ? 'disabled' : ''}>${maxed ? 'MÁX' : `$${formatMoney(cost)}`}</button>
        </div>`);
      }
    }
    const built = g.unlocks.filter((d) => g.unlocked.has(d.id)).length;
    const s = g.stats;
    rows.push(`<p class="muted center">Construcciones: ${built}/${g.unlocks.length}<br>
      ${g.difficulty.emoji} ${g.difficulty.label} · ⭐ ${Math.round(g.rep)} · ${s.served} clientes atendidos · ${s.lost} perdidos · $${formatMoney(s.tips)} en propinas</p>`);
    el.innerHTML = rows.join('');
  }

  /** Elegir qué mover; luego se coloca caminando por el mapa. */
  openMove() {
    const g = this.game;
    g.cancelPlacing();
    const el = document.createElement('div');
    const rows = g.movables().map((m) => {
      const cost = g.moveCost(m.id);
      return `<div class="upg">
        <div class="upg-icon">${m.icon}</div>
        <div class="upg-info"><b>${m.label}</b><small>Colócala donde quieras</small></div>
        <button type="button" data-id="${m.id}" ${g.money < cost ? 'disabled' : ''}>$${formatMoney(cost)}</button>
      </div>`;
    });
    el.innerHTML = `<p class="muted center">Elige qué mover y camina hasta el sitio nuevo. Los productos que tenga encima se pierden al moverla.</p>${rows.join('')}`;
    el.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]');
      if (!btn || btn.disabled) return;
      closeModal();
      g.startPlacing(btn.dataset.id!);
    });
    openModal('🏗️ Mover estructuras', el, [{ label: 'Cerrar', primary: true }]);
  }

  /** Barra del modo colocar (null la oculta). */
  setPlacing(label: string | null, cost = 0) {
    this.placeBar.hidden = !label;
    if (!label) return;
    this.placeBar.querySelector('.place-text')!.textContent = `🏗️ Mover ${label}: camina hasta el sitio nuevo`;
    this.placeBar.querySelector('.place-ok')!.textContent = `✅ Colocar aquí · $${formatMoney(cost)}`;
  }

  setPlaceOk(ok: boolean) {
    this.placeBar.querySelector('.place-ok')!.classList.toggle('blocked', !ok);
  }
}
