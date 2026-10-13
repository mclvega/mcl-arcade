import { settings, updateSettings, type Settings } from './settings';
import { openModal } from './ui';

type Toggle = Exclude<keyof Settings, 'mode'>;

const TOGGLES: { key: Toggle; title: string; desc: string }[] = [
  { key: 'sound', title: '🔊 Sonido', desc: 'Efectos al recoger, cobrar y construir' },
  { key: 'shadows', title: '🌗 Sombras', desc: 'Desactívalas si el juego va lento' },
  { key: 'hints', title: '🧭 Pistas', desc: 'Texto de ayuda y flecha guía' },
];

function render(el: HTMLElement) {
  const modeHelp =
    settings.mode === 'auto'
      ? 'Recoges, sueltas, cobras, compras y tiras con solo acercarte.'
      : 'Acércate y mantén pulsado el botón de acción (o Espacio / E) para recoger, soltar, cobrar, comprar o tirar.';
  el.innerHTML = `
    <div class="set-block">
      <b>Modo de interacción</b>
      <div class="segmented" role="radiogroup">
        <button type="button" data-mode="auto" class="${settings.mode === 'auto' ? 'on' : ''}">🤖 Automático</button>
        <button type="button" data-mode="manual" class="${settings.mode === 'manual' ? 'on' : ''}">👆 Con botón</button>
      </div>
      <small>${modeHelp}</small>
    </div>
    ${TOGGLES.map(
      (t) => `
      <label class="set-row">
        <span><b>${t.title}</b><small>${t.desc}</small></span>
        <input type="checkbox" class="switch" data-key="${t.key}" ${settings[t.key] ? 'checked' : ''} />
      </label>`,
    ).join('')}`;
}

export function openSettings() {
  const el = document.createElement('div');
  el.className = 'settings';
  render(el);
  el.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-mode]');
    if (!btn) return;
    updateSettings({ mode: btn.dataset.mode as Settings['mode'] });
    render(el);
  });
  el.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const key = input.dataset.key as Toggle | undefined;
    if (key) updateSettings({ [key]: input.checked });
  });
  openModal('⚙️ Configuración', el, [{ label: 'Listo', primary: true }]);
}
