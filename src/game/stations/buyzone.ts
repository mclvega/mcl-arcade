import * as THREE from 'three';
import type { UnlockDef } from '../config';
import type { Game } from '../game';
import { createCoinMesh } from '../items';
import { EMOJI_FONT, groundPlane, makeCanvasTexture, UI_FONT } from '../labels';
import { scene } from '../scene';
import { flyAndRemove } from '../stack';
import { popIn } from '../tween';

/** Recuadro en el suelo que se "llena" con dinero y desbloquea algo. */
export class BuyZone {
  readonly group = new THREE.Group();
  readonly pos: THREE.Vector3;
  paid = 0;
  revealed = false;
  done = false;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  constructor(
    private game: Game,
    readonly def: UnlockDef,
  ) {
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    const { ctx, texture } = makeCanvasTexture(256, 256);
    this.ctx = ctx;
    this.texture = texture;
    const plane = groundPlane(texture, 2.3);
    this.group.add(plane);
    this.group.position.set(def.x, 0.04, def.z);
    this.group.visible = false;
    scene.add(this.group);
    this.draw();

    game.addZone({
      pos: this.pos,
      radius: 1.15,
      interval: 0.045,
      enabled: () => this.revealed && !this.done,
      act: () => this.pay(),
    });
  }

  get remaining() {
    return Math.max(0, this.def.price - this.paid);
  }

  reveal(animate: boolean) {
    this.revealed = true;
    this.group.visible = true;
    if (animate) popIn(this.group);
  }

  hide() {
    this.done = true;
    this.group.visible = false;
  }

  private pay() {
    const game = this.game;
    if (this.remaining <= 0) {
      game.unlock(this.def.id);
      return;
    }
    if (game.money < 1) return;
    const step = Math.max(1, Math.ceil(this.def.price / 25));
    const amount = Math.min(step, Math.floor(game.money), this.remaining);
    game.spendMoney(amount);
    this.paid += amount;
    const coin = createCoinMesh();
    coin.position.copy(game.player.pos).setY(1.1);
    flyAndRemove(coin, this.pos.clone().setY(0.1), 0.25);
    game.sfx.pay();
    this.draw();
    if (this.remaining <= 0) game.unlock(this.def.id);
  }

  draw() {
    const c = this.ctx;
    const { icon, label } = this.def;
    c.clearRect(0, 0, 256, 256);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.beginPath();
    c.roundRect(12, 12, 232, 232, 28);
    c.fill();

    const k = this.def.price > 0 ? this.paid / this.def.price : 1;
    if (k > 0) {
      c.save();
      c.clip();
      c.fillStyle = 'rgba(102,187,106,0.85)';
      c.fillRect(12, 12 + 232 * (1 - k), 232, 232 * k);
      c.restore();
    }

    c.setLineDash([22, 14]);
    c.lineWidth = 8;
    c.strokeStyle = '#ffffff';
    c.beginPath();
    c.roundRect(12, 12, 232, 232, 28);
    c.stroke();
    c.setLineDash([]);

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `72px ${EMOJI_FONT}`;
    c.fillText(icon, 128, 78);
    c.shadowColor = 'rgba(0,0,0,0.45)';
    c.shadowBlur = 6;
    c.fillStyle = '#ffffff';
    c.font = `bold 30px ${UI_FONT}`;
    c.fillText(label, 128, 144);
    c.font = `bold 48px ${UI_FONT}`;
    c.fillText(`$${this.remaining}`, 128, 198);
    c.shadowBlur = 0;
    this.texture.needsUpdate = true;
  }
}
