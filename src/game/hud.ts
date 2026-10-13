import { UPGRADES } from './config';
import type { Game } from './game';
import { openSettings } from './settingsPanel';
import type { Zone } from './types';
import { $, isModalOpen, openModal, toast } from './ui';
import { formatMoney } from './util';

export class Hud {
  private moneyEl = $('money');
  private moneyValue = $('money-value');
  private hintEl = $('hint');
  private actionBtn = $<HTMLButtonElement>('action-btn');
  private actionIcon = this.actionBtn.querySelector<HTMLElement>('.act-icon')!;
  private actionLabel = this.actionBtn.querySelector<HTMLElement>('.act-label')!;
  private upgradesEl: HTMLElement | null = null;
  private shownMoney = -1;
  private hint = '';
  private action: Zone | null | undefined;
  private bumpTimer = 0;

  constructor(private game: Game) {
    $('hud').hidden = false;
    $('store-name').textContent = `${game.store.emoji} ${game.store.name}`;
    $('btn-home').addEventListener('click', () => game.goToMenu());
    $('btn-upgrades').addEventListener('click', () => this.openUpgrades());
    $('btn-settings').addEventListener('click', () => openSettings());

    const btn = this.actionBtn;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      btn.classList.add('pressed');
      game.actionDown();
    });
    const up = () => {
      btn.classList.remove('pressed');
      game.actionUp();
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
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
    const rows = UPGRADES.filter((u) => !u.requires || g.hasBuilt(u.requires)).map((u) => {
      const lvl = g.level(u.id);
      const maxed = lvl >= u.max;
      const cost = g.upgradePrice(u.id);
      return `<div class="upg">
        <div class="upg-icon">${u.icon}</div>
        <div class="upg-info"><b>${u.name}</b><span class="lvl">Nv ${lvl}/${u.max}</span><small>${u.desc}</small></div>
        <button type="button" data-id="${u.id}" ${maxed || g.money < cost ? 'disabled' : ''}>${maxed ? 'MÁX' : `$${formatMoney(cost)}`}</button>
      </div>`;
    });
    const built = g.unlocks.filter((d) => g.unlocked.has(d.id)).length;
    rows.push(`<p class="muted center">Construcciones: ${built}/${g.unlocks.length}</p>`);
    el.innerHTML = rows.join('');
  }
}
