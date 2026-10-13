/** Teclado (WASD/flechas) + joystick flotante táctil/ratón. */
export class Input {
  private keys = new Set<string>();
  private joy = { id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
  private readonly radius = 55;

  constructor(
    target: HTMLElement,
    private base: HTMLElement,
    private knob: HTMLElement,
  ) {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.release();
    });

    target.addEventListener('pointerdown', (e) => {
      if (this.joy.id !== -1) return;
      this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 };
      target.setPointerCapture(e.pointerId);
      this.base.style.left = `${e.clientX}px`;
      this.base.style.top = `${e.clientY}px`;
      this.base.classList.add('active');
      this.knob.style.transform = '';
    });
    target.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.ox;
      let dy = e.clientY - this.joy.oy;
      const len = Math.hypot(dx, dy);
      if (len > this.radius) {
        dx *= this.radius / len;
        dy *= this.radius / len;
      }
      this.joy.dx = dx;
      this.joy.dy = dy;
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId === this.joy.id) this.release();
    };
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }

  private release() {
    this.joy.id = -1;
    this.joy.dx = this.joy.dy = 0;
    this.base.classList.remove('active');
  }

  /** Espacio o E: botón de acción en modo manual. */
  get actionHeld() {
    return this.keys.has('Space') || this.keys.has('KeyE');
  }

  /** x: derecha, y: arriba (en pantalla). Magnitud ≤ 1. */
  vector(): { x: number; y: number } {
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (x || y) {
      const l = Math.hypot(x, y);
      return { x: x / l, y: y / l };
    }
    if (this.joy.id === -1) return { x: 0, y: 0 };
    const jx = this.joy.dx / this.radius;
    const jy = -this.joy.dy / this.radius;
    return Math.hypot(jx, jy) < 0.12 ? { x: 0, y: 0 } : { x: jx, y: jy };
  }
}
