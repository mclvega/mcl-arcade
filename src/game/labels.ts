import * as THREE from 'three';

export const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
export const UI_FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

export function makeCanvasTexture(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, ctx, texture };
}

/** Plano tumbado en el suelo y girado 45° para leerse derecho desde la cámara isométrica. */
export function groundPlane(texture: THREE.Texture, size: number): THREE.Object3D {
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.x = -Math.PI / 2;
  const holder = new THREE.Group();
  holder.rotation.y = Math.PI / 4;
  holder.add(m);
  return holder;
}

/** Etiqueta de suelo con un emoji. */
export function emojiGroundLabel(emoji: string, size = 0.7): THREE.Object3D {
  const { ctx, texture } = makeCanvasTexture(128, 128);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `76px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 70);
  texture.needsUpdate = true;
  return groundPlane(texture, size);
}

/** Cartel vertical con emoji (mira hacia +z). */
export function emojiSign(emoji: string, size = 0.5): THREE.Mesh {
  const { ctx, texture } = makeCanvasTexture(128, 128);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(4, 4, 120, 120, 24);
  ctx.fill();
  ctx.font = `84px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 70);
  texture.needsUpdate = true;
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
}

/** Texto flotante («+3 ⭐», «+$5») que sube y se desvanece. */
export function floatingText(text: string, color: string): THREE.Sprite {
  const { ctx, texture } = makeCanvasTexture(256, 72);
  ctx.font = `900 46px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(text, 128, 38, 240);
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 38, 240);
  texture.needsUpdate = true;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  s.scale.set(1.8, 0.5, 1);
  s.renderOrder = 12;
  return s;
}

/** Etiqueta con texto que siempre mira a la cámara (nombre del jugador). */
export function nameTag(text: string): THREE.Sprite {
  const { ctx, canvas, texture } = makeCanvasTexture(256, 64);
  ctx.font = `bold 34px ${UI_FONT}`;
  const w = Math.min(248, ctx.measureText(text).width + 32);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect((canvas.width - w) / 2, 6, w, 52, 26);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34, 232);
  texture.needsUpdate = true;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  s.scale.set(1.6, 0.4, 1);
  s.renderOrder = 11;
  return s;
}

/** Emoji flotante que siempre mira a la cámara. */
export function emojiSprite(emoji: string, size = 0.7): THREE.Sprite {
  const { ctx, texture } = makeCanvasTexture(128, 128);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.roundRect(6, 6, 116, 116, 30);
  ctx.fill();
  ctx.font = `80px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 70);
  texture.needsUpdate = true;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  s.scale.set(size, size, 1);
  return s;
}

export function ring(radius: number, color = 0xffffff, opacity = 0.7): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.07, radius, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.025;
  return m;
}

/** Bocadillo sobre la cabeza de un cliente. */
export class Bubble {
  readonly sprite: THREE.Sprite;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private text = '\u0000';
  private mood = -1;

  constructor() {
    const { ctx, texture } = makeCanvasTexture(192, 112);
    this.ctx = ctx;
    this.texture = texture;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    this.sprite.scale.set(1.3, 0.76, 1);
    this.sprite.center.set(0.5, 0);
    this.sprite.renderOrder = 10;
  }

  /**
   * `mood` (0–1) dibuja la barra de paciencia: verde → amarillo → rojo.
   * Se cuantiza para no redibujar el canvas en cada fotograma.
   */
  set(text: string, mood?: number, vip = false) {
    const m = mood === undefined ? -1 : Math.round(Math.max(0, Math.min(1, mood)) * 20) / 20;
    if (text === this.text && m === this.mood) return;
    this.text = text;
    this.mood = m;
    this.sprite.visible = text !== '';
    if (!text) return;
    const c = this.ctx;
    c.clearRect(0, 0, 192, 112);
    c.fillStyle = vip ? '#fff3c4' : '#ffffff';
    c.beginPath();
    c.roundRect(8, 6, 176, 82, 22);
    c.moveTo(84, 86);
    c.lineTo(96, 106);
    c.lineTo(108, 86);
    c.fill();
    if (vip) {
      c.strokeStyle = '#ffb300';
      c.lineWidth = 4;
      c.stroke();
    }
    c.fillStyle = '#333';
    c.font = `bold 38px ${EMOJI_FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 96, m < 0 ? 47 : 38, 168);
    if (m >= 0) {
      c.fillStyle = '#e0e0e0';
      c.beginPath();
      c.roundRect(24, 66, 144, 12, 6);
      c.fill();
      c.fillStyle = `hsl(${Math.round(m * 120)}, 85%, 45%)`;
      c.beginPath();
      c.roundRect(24, 66, Math.max(12, 144 * m), 12, 6);
      c.fill();
    }
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}
