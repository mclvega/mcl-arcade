import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from './config';
import { displayName, loadDifficulty, loadPlayerName, loadStoreName, saveDifficulty, savePlayerName, saveStoreName } from './save';
import type { StoreDef } from './stores';
import { openModal } from './ui';

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

interface PromptOptions {
  title: string;
  emoji: string;
  message: string;
  value: string;
  confirm: string;
  maxLen: number;
  /** Si existe, muestra el botón 🎲 para pedir otra idea. */
  suggest?: () => string;
  /** Contenido adicional bajo el campo de texto. */
  extra?: HTMLElement;
  /** Se llama una sola vez, al confirmar o al cerrar la ventana. */
  onDone: (value: string) => void;
}

function promptText(o: PromptOptions) {
  const el = document.createElement('div');
  el.className = 'name-dialog';
  el.innerHTML = `
    <p class="big-emoji">${o.emoji}</p>
    <p class="center muted">${o.message}</p>
    <div class="name-row">
      <input type="text" maxlength="${o.maxLen}" autocomplete="off" spellcheck="false" value="${escapeHtml(o.value)}" aria-label="${escapeHtml(o.title)}" />
      ${o.suggest ? '<button type="button" class="dice" title="Otra idea" aria-label="Otra idea">🎲</button>' : ''}
    </div>`;
  const input = el.querySelector<HTMLInputElement>('input')!;
  if (o.extra) el.append(o.extra);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    o.onDone(input.value.trim().replace(/\s+/g, ' ').slice(0, o.maxLen));
  };

  el.querySelector('.dice')?.addEventListener('click', () => {
    let next = o.suggest!();
    for (let i = 0; i < 5 && next === input.value; i++) next = o.suggest!();
    input.value = next;
    input.focus();
  });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') document.querySelector<HTMLButtonElement>('#modal-foot button.primary')?.click();
  });

  openModal(o.title, el, [{ label: o.confirm, primary: true, onClick: finish }], finish);
  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);
}

/** Pregunta el nombre del jugador (al abrir el juego por primera vez o desde el menú). */
export function openPlayerNameDialog(onDone: () => void, firstTime = true) {
  promptText({
    title: firstTime ? '¡Bienvenido a McL Arcade!' : '✏️ Cambiar tu nombre',
    emoji: '🧑‍🌾',
    message: firstTime ? '¿Cómo te llamas?' : 'Escribe tu nuevo nombre.',
    value: loadPlayerName() ?? '',
    confirm: firstTime ? 'Continuar ▶' : 'Guardar',
    maxLen: 16,
    onDone: (name) => {
      savePlayerName(name || loadPlayerName() || 'Jugador');
      onDone();
    },
  });
}

/** Pide el nombre de la tienda (al abrirla por primera vez o desde el menú). */
export function openNameDialog(store: StoreDef, onDone: () => void, firstTime = true) {
  const player = loadPlayerName();
  const ideas = player ? [`${store.name} de ${player}`, ...store.names] : store.names;
  let i = 0;
  const suggest = () => ideas[++i % ideas.length];

  // La dificultad solo se elige al abrir (o reabrir tras cerrar) la tienda.
  let difficulty: DifficultyId = loadDifficulty(store.id);
  let extra: HTMLElement | undefined;
  if (firstTime) {
    extra = document.createElement('div');
    extra.className = 'set-block difficulty-pick';
    const render = () => {
      const d = DIFFICULTIES[difficulty];
      extra!.innerHTML = `
        <b>Dificultad</b>
        <div class="segmented" role="radiogroup" style="grid-template-columns: repeat(${DIFFICULTY_ORDER.length}, 1fr)">
          ${DIFFICULTY_ORDER.map(
            (id) =>
              `<button type="button" role="radio" data-diff="${id}" class="${id === difficulty ? 'on' : ''}" aria-checked="${id === difficulty}">${DIFFICULTIES[id].emoji}<br><span>${DIFFICULTIES[id].label}</span></button>`,
          ).join('')}
        </div>
        <small>${d.desc}${d.canLose ? ' Si la reputación baja de 0, la tienda cierra.' : ''}</small>`;
    };
    render();
    extra.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-diff]');
      if (!btn) return;
      difficulty = btn.dataset.diff as DifficultyId;
      render();
    });
  }
  promptText({
    title: firstTime ? 'Ponle nombre a tu tienda' : '✏️ Cambiar nombre',
    emoji: store.emoji,
    message: firstTime ? `Tu nueva tienda: <b>${escapeHtml(store.name)}</b>. ¿Cómo se va a llamar?` : 'Elige un nuevo nombre para tu tienda.',
    value: loadStoreName(store.id) ?? ideas[0],
    confirm: firstTime ? 'Abrir tienda ▶' : 'Guardar',
    maxLen: 24,
    suggest,
    extra,
    onDone: (name) => {
      saveStoreName(store.id, name || displayName(store));
      if (firstTime) saveDifficulty(store.id, difficulty);
      onDone();
    },
  });
}
