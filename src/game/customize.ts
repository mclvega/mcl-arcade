import * as THREE from 'three';
import { createAvatar, LOOK_OPTIONS, randomLook, type Look } from './characters';
import { loadLook, saveLook } from './save';
import { openModal } from './ui';

type ChoiceKey = 'gender' | 'hair' | 'bottom' | 'hat' | 'accessory';
type ColorKey = 'skin' | 'hairColor' | 'shirt' | 'bottomColor' | 'hatColor';

const SECTIONS: ({ kind: 'choice'; key: ChoiceKey; title: string } | { kind: 'color'; key: ColorKey; title: string })[] = [
  { kind: 'choice', key: 'gender', title: 'Género' },
  { kind: 'color', key: 'skin', title: 'Tono de piel' },
  { kind: 'choice', key: 'hair', title: 'Peinado' },
  { kind: 'color', key: 'hairColor', title: 'Color de pelo' },
  { kind: 'color', key: 'shirt', title: 'Camiseta' },
  { kind: 'choice', key: 'bottom', title: 'Parte de abajo' },
  { kind: 'color', key: 'bottomColor', title: 'Color de abajo' },
  { kind: 'choice', key: 'hat', title: 'Gorro' },
  { kind: 'color', key: 'hatColor', title: 'Color del gorro' },
  { kind: 'choice', key: 'accessory', title: 'Accesorio' },
];

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** Vista previa 3D que gira, en su propio renderer pequeño. */
function createPreview(canvasHost: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(200, 240);
  canvasHost.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(2, 4, 3);
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshLambertMaterial({ color: 0xc5e1a5 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const camera = new THREE.PerspectiveCamera(32, 200 / 240, 0.1, 20);
  camera.position.set(0, 1.3, 4.2);
  camera.lookAt(0, 0.85, 0);
  let avatar: THREE.Group | null = null;
  let angle = 0.5;
  let dragging = false;
  let lastX = 0;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    angle += (e.clientX - lastX) * 0.02;
    lastX = e.clientX;
  });
  renderer.domElement.addEventListener('pointerup', () => (dragging = false));

  renderer.setAnimationLoop(() => {
    if (!dragging) angle += 0.012;
    if (avatar) avatar.rotation.y = angle;
    renderer.render(scene, camera);
  });
  return {
    show(look: Look) {
      if (avatar) scene.remove(avatar);
      avatar = createAvatar(look).group;
      scene.add(avatar);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

/** Menú para personalizar al personaje del jugador. */
export function openCustomizer(onDone?: () => void) {
  const look: Look = { ...loadLook() };
  const el = document.createElement('div');
  el.className = 'customizer';
  el.innerHTML = `
    <div class="cz-preview">
      <div class="cz-canvas"></div>
      <button type="button" class="cz-random">🎲 Aleatorio</button>
      <small class="muted">Arrastra para girar</small>
    </div>
    <div class="cz-options"></div>`;
  const options = el.querySelector<HTMLElement>('.cz-options')!;
  const preview = createPreview(el.querySelector<HTMLElement>('.cz-canvas')!);

  const render = () => {
    options.innerHTML = SECTIONS.filter((s) => s.key !== 'hatColor' || (look.hat !== 'none' && look.hat !== 'chef' && look.hat !== 'crown'))
      .map((s) => {
        if (s.kind === 'choice') {
          const opts = LOOK_OPTIONS[s.key] as readonly { id: string; label: string }[];
          return `<div class="cz-section"><b>${s.title}</b><div class="cz-chips">${opts
            .map((o) => `<button type="button" data-key="${s.key}" data-value="${o.id}" class="${look[s.key] === o.id ? 'on' : ''}">${o.label}</button>`)
            .join('')}</div></div>`;
        }
        const colors = LOOK_OPTIONS[s.key] as readonly number[];
        return `<div class="cz-section"><b>${s.title}</b><div class="cz-swatches">${colors
          .map((c) => `<button type="button" data-key="${s.key}" data-color="${c}" class="${look[s.key] === c ? 'on' : ''}" style="background:${hex(c)}" aria-label="Color ${hex(c)}"></button>`)
          .join('')}</div></div>`;
      })
      .join('');
    preview.show(look);
    saveLook(look);
  };

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.cz-random')) {
      Object.assign(look, randomLook());
      render();
      return;
    }
    const btn = t.closest<HTMLButtonElement>('button[data-key]');
    if (!btn) return;
    const key = btn.dataset.key as keyof Look;
    if (btn.dataset.color) (look as unknown as Record<string, number>)[key] = Number(btn.dataset.color);
    else (look as unknown as Record<string, string>)[key] = btn.dataset.value!;
    render();
  });

  render();
  openModal('👕 Tu personaje', el, [{ label: 'Listo', primary: true }], () => {
    preview.dispose();
    onDone?.();
  });
}
