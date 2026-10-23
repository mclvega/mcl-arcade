import { offlineBlock } from './offline';
import { unlockAllStores } from './save';
import { settings, updateSettings, type Settings } from './settings';
import { openModal } from './ui';

/** Código que desbloquea todas las tiendas. */
const CODIGO_TIENDAS = 'mcl';

type Toggle = 'sound' | 'music' | 'hints' | 'fullscreen' | 'showFps';
type Choice = 'mode' | 'quality' | 'fpsLimit';

const TOGGLES: { key: Toggle; title: string; desc: string }[] = [
  { key: 'sound', title: '🔊 Sonido', desc: 'Efectos al recoger, cobrar y construir' },
  { key: 'music', title: '🎵 Música', desc: 'Alegre con buena reputación, tensa cuando baja' },
  { key: 'hints', title: '🧭 Pistas', desc: 'Texto de ayuda y flecha guía' },
  { key: 'fullscreen', title: '⛶ Pantalla completa', desc: 'Activarla al empezar a jugar' },
  { key: 'showFps', title: '📈 Mostrar FPS', desc: 'Contador de fotogramas por segundo en pantalla' },
];

const CHOICES: { key: Choice; title: string; options: { value: string; label: string }[]; help: (s: Settings) => string }[] = [
  {
    key: 'mode',
    title: 'Modo de interacción',
    options: [
      { value: 'auto', label: '🤖 Automático' },
      { value: 'manual', label: '👆 Con botón' },
    ],
    help: (s) =>
      s.mode === 'auto'
        ? 'Recoges, sueltas, cobras, compras y tiras con solo acercarte.'
        : 'Acércate y mantén pulsado el botón de acción (o Espacio / E) para recoger, soltar, cobrar, comprar o tirar.',
  },
  {
    key: 'quality',
    title: '🎨 Calidad gráfica',
    options: [
      { value: 'low', label: 'Baja' },
      { value: 'medium', label: 'Media' },
      { value: 'high', label: 'Alta' },
    ],
    help: (s) =>
      ({
        low: 'Menor resolución, sin sombras ni suavizado. Para móviles lentos.',
        medium: 'Resolución media y sombras simples. Equilibrada.',
        high: 'Resolución completa, sombras suaves y bordes suavizados.',
      })[s.quality],
  },
  {
    key: 'fpsLimit',
    title: '🎞️ FPS máximos',
    options: [
      { value: '30', label: '30' },
      { value: '60', label: '60' },
      { value: '0', label: 'Máx.' },
    ],
    help: (s) =>
      s.fpsLimit === 30
        ? 'Ahorra batería y calienta menos el móvil.'
        : s.fpsLimit === 60
          ? 'Fluido en la mayoría de pantallas.'
          : 'Tantos como permita tu pantalla (90, 120, 144…). Gasta más batería.',
  },
];

function render(el: HTMLElement) {
  el.innerHTML = `
    ${CHOICES.map(
      (c) => `
      <div class="set-block">
        <b>${c.title}</b>
        <div class="segmented" role="radiogroup" style="grid-template-columns: repeat(${c.options.length}, 1fr)">
          ${c.options
            .map(
              (o) =>
                `<button type="button" role="radio" data-choice="${c.key}" data-value="${o.value}"
                  class="${String(settings[c.key]) === o.value ? 'on' : ''}" aria-checked="${String(settings[c.key]) === o.value}">${o.label}</button>`,
            )
            .join('')}
        </div>
        <small>${c.help(settings)}</small>
      </div>`,
    ).join('')}
    ${TOGGLES.map(
      (t) => `
      <label class="set-row">
        <span><b>${t.title}</b><small>${t.desc}</small></span>
        <input type="checkbox" class="switch" data-key="${t.key}" ${settings[t.key] ? 'checked' : ''} />
      </label>${
        t.key === 'music'
          ? `<label class="set-row slider-row"><span><b>Volumen de la música</b></span>
               <input type="range" min="0" max="100" step="5" data-range="musicVolume" value="${Math.round(settings.musicVolume * 100)}" ${settings.music ? '' : 'disabled'} /></label>`
          : ''
      }`,
    ).join('')}
    <div class="set-block">
      <b>🔑 Código de acceso</b>
      <form class="name-row" data-pass>
        <input type="password" name="codigo" autocomplete="off" placeholder="Código" aria-label="Código de acceso" />
        <button type="submit" class="primary">Desbloquear</button>
      </form>
      <small data-pass-msg>Escribe el código para desbloquear todas las tiendas.</small>
    </div>`;
}

export function openSettings(closed?: () => void) {
  const el = document.createElement('div');
  el.className = 'settings';
  // El bloque «Jugar sin conexión» se crea una vez y se vuelve a poner tras cada repintado.
  const offline = offlineBlock();
  const paint = () => {
    render(el);
    el.append(offline);
  };
  paint();
  el.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-choice]');
    if (!btn) return;
    const key = btn.dataset.choice as Choice;
    const raw = btn.dataset.value!;
    const value = key === 'fpsLimit' ? (Number(raw) as Settings['fpsLimit']) : raw;
    updateSettings({ [key]: value } as Partial<Settings>);
    paint();
  });
  el.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const key = input.dataset.key as Toggle | undefined;
    if (!key) return;
    updateSettings({ [key]: input.checked });
    if (key === 'music') paint();
  });
  el.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem('codigo') as HTMLInputElement;
    const msg = el.querySelector<HTMLElement>('[data-pass-msg]')!;
    if (input.value.trim().toLowerCase() === CODIGO_TIENDAS) {
      unlockAllStores();
      msg.textContent = '✅ ¡Todas las tiendas desbloqueadas!';
    } else msg.textContent = '❌ Código incorrecto.';
    input.value = '';
  });
  el.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.dataset.range === 'musicVolume') updateSettings({ musicVolume: Number(input.value) / 100 });
  });
  openModal('⚙️ Configuración', el, [{ label: 'Listo', primary: true }], closed);
}
