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

  constructor() {
    const { ctx, texture } = makeCanvasTexture(192, 96);
    this.ctx = ctx;
    this.texture = texture;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    this.sprite.scale.set(1.3, 0.65, 1);
    this.sprite.center.set(0.5, 0);
    this.sprite.renderOrder = 10;
  }

  set(text: string) {
    if (text === this.text) return;
    this.text = text;
    this.sprite.visible = text !== '';
    if (!text) return;
    const c = this.ctx;
    c.clearRect(0, 0, 192, 96);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(8, 6, 176, 66, 22);
    c.moveTo(84, 70);
    c.lineTo(96, 90);
    c.lineTo(108, 70);
    c.fill();
    c.fillStyle = '#333';
    c.font = `bold 40px ${EMOJI_FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 96, 42);
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}
