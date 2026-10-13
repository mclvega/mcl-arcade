import { sfx } from './audio';

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export interface ModalButton {
  label: string;
  primary?: boolean;
  danger?: boolean;
  onClick?: () => void;
}

let onClose: (() => void) | undefined;

/** Ventana modal compartida por el menú y el juego. */
export function openModal(title: string, body: string | HTMLElement, buttons: ModalButton[] = [{ label: 'Cerrar', primary: true }], closed?: () => void) {
  const modal = $('modal');
  $('modal-title').textContent = title;
  const b = $('modal-body');
  b.replaceChildren();
  if (typeof body === 'string') b.innerHTML = body;
  else b.append(body);
  const foot = $('modal-foot');
  foot.replaceChildren(
    ...buttons.map((btn) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = btn.label;
      if (btn.primary) el.classList.add('primary');
      if (btn.danger) el.classList.add('danger');
      el.addEventListener('click', () => {
        sfx.click();
        closeModal();
        btn.onClick?.();
      });
      return el;
    }),
  );
  onClose = closed;
  modal.hidden = false;
}

export function closeModal() {
  $('modal').hidden = true;
  const fn = onClose;
  onClose = undefined;
  fn?.();
}

export const isModalOpen = () => !$('modal').hidden;

export function initModal() {
  $('modal-close').addEventListener('click', closeModal);
  $('modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && isModalOpen()) closeModal();
  });
}

let toastTimer = 0;
export function toast(msg: string, ms = 2600) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), ms);
}

export const HELP_HTML = `
<ul class="help">
  <li>🕹️ <b>Moverse:</b> WASD / flechas, o arrastra en la pantalla.</li>
  <li>🌱 <b>Cultiva y fabrica:</b> recoge en huertos, minas y salidas de máquinas; lleva la materia prima a la entrada de cada máquina.</li>
  <li>🛒 <b>Repón:</b> deja los productos en su estantería; los clientes los cogen y van a la caja.</li>
  <li>🧾 <b>Cobra:</b> quédate en el círculo de la caja y luego recoge los billetes 💵.</li>
  <li>🏗️ <b>Construye:</b> gasta dinero en los recuadros del suelo para ampliar la tienda y contratar personal.</li>
  <li>🗑️ <b>Basura:</b> tira lo que llevas encima si no lo necesitas.</li>
  <li>⚙️ <b>Configuración:</b> elige si todo se hace solo al acercarte o con el botón de acción (Espacio / E).</li>
  <li>🚚 <b>Nuevas tiendas:</b> al final de cada tienda puedes comprar la siguiente.</li>
</ul>`;
