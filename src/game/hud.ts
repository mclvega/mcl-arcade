import { isMuted, setMuted } from './audio';
import { UNLOCKS, upgradeCost, UPGRADES } from './config';
import type { Game } from './game';
import { formatMoney } from './util';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export class Hud {
  private moneyEl = $('money');
  private moneyValue = $('money-value');
  private hintEl = $('hint');
  private toastEl = $('toast');
  private panel = $('panel');
  private list = $('upgrade-list');
  private soundBtn = $<HTMLButtonElement>('btn-sound');
  private shownMoney = -1;
  private hint = '';
  private toastTimer = 0;
  private bumpTimer = 0;

  constructor(private game: Game) {
    $('btn-upgrades').addEventListener('click', () => this.openPanel());
    $('panel-close').addEventListener('click', () => this.closePanel());
    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) this.closePanel();
    });
    this.list.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]');
      if (btn && !btn.disabled) {
        game.buyUpgrade(btn.dataset.id!);
        this.renderPanel();
      }
    });
    $('btn-reset').addEventListener('click', () => {
      if (confirm('¿Seguro que quieres empezar de cero? Se perderá el progreso.')) game.reset();
    });
    this.soundBtn.addEventListener('click', () => {
      setMuted(!isMuted());
      this.renderSound();
    });
    this.renderSound();
  }

  get panelOpen() {
    return !this.panel.hidden;
  }

  update() {
    const m = Math.floor(this.game.money);
    if (m !== this.shownMoney) {
      if (m > this.shownMoney && this.shownMoney >= 0) {
        this.moneyEl.classList.add('bump');
        clearTimeout(this.bumpTimer);
        this.bumpTimer = window.setTimeout(() => this.moneyEl.classList.remove('bump'), 120);
      }
      this.shownMoney = m;
      this.moneyValue.textContent = formatMoney(m);
      if (this.panelOpen) this.renderPanel();
    }
  }

  setHint(text: string) {
    if (text === this.hint) return;
    this.hint = text;
    if (text) this.hintEl.textContent = text;
    this.hintEl.classList.toggle('hidden', !text);
  }

  toast(msg: string, ms = 2600) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  openPanel() {
    this.renderPanel();
    this.panel.hidden = false;
  }

  closePanel() {
    this.panel.hidden = true;
  }

  private renderPanel() {
    const g = this.game;
    const rows = UPGRADES.filter((u) => !u.requiresAny || u.requiresAny.some((id) => g.unlocked.has(id))).map((u) => {
      const lvl = g.level(u.id);
      const maxed = lvl >= u.max;
      const cost = upgradeCost(u, lvl);
      const label = maxed ? 'MÁX' : `$${formatMoney(cost)}`;
      return `<div class="upg">
        <div class="upg-icon">${u.icon}</div>
        <div class="upg-info"><b>${u.name}</b><span class="lvl">Nv ${lvl}/${u.max}</span><small>${u.desc}</small></div>
        <button type="button" data-id="${u.id}" ${maxed || g.money < cost ? 'disabled' : ''}>${label}</button>
      </div>`;
    });
    const bought = UNLOCKS.filter((d) => g.unlocked.has(d.id)).length;
    rows.push(`<p style="text-align:center;color:#666;margin:12px 0 0">Construcciones: ${bought}/${UNLOCKS.length}</p>`);
    this.list.innerHTML = rows.join('');
  }

  private renderSound() {
    this.soundBtn.textContent = isMuted() ? '🔇' : '🔊';
  }
}
