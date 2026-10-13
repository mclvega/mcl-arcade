# McL Arcade 🕹️

Juego *idle arcade* en 3D para el navegador. Cultiva, extrae y fabrica productos, repón las estanterías, cobra a los clientes y reinvierte para hacer crecer una cadena de **6 tiendas**, cuidando la reputación de cada una.

Hecho con **Vite + TypeScript + Three.js**. Es un sitio 100 % estático, listo para publicar gratis en Netlify.

## Tiendas

| Tienda | Productos a la venta | Producción |
|---|---|---|
| 🚜 **La Granja** | 12: tomates, zanahorias, maíz, huevos, manzanas, leche, pan, kétchup, queso, zumo, palomitas, tarta | Huertos, frutales, establo, gallinero, horno, quesería… |
| 🐾 **Tienda de Mascotas** | 12: cachorros, gatitos, conejos, pájaros, hámsteres, peces de colores, pienso, comida para gatos, semillas, zanahorias, pelotas, camas | Hábitats que **hay que alimentar**, estanques, fábrica de pienso, juguetería… |
| 🍕 **Pizzería** | 12: pizzas, calzones, pan de ajo, salsa, queso, aceite, tiramisú, albahaca, champiñones, pimientos, aceitunas, tomates | Molino → amasadora → hornos, almazara, postres… |
| 🥐 **Panadería & Café** | 11: pan, cruasanes, dónuts, café, chocolate, batidos, tartas, miel, caramelos, fresas, leche | Molino, tostadora, colmenas, chocolatera, freidora… |
| 🛒 **Supermercado** | 12: patatas fritas, galletas, refrescos, cereales, agua, zumo, yogures, arroz, huevos, leche, naranjas, patatas | Manantial, refinería de azúcar, galletera, embotelladora… |
| 🚗 **Autos & Recambios** | 11: gasolina, aceite de motor, pintura, neumáticos, parabrisas, faros, baterías, llaves, tornillos, motores, **coches** | Pozo petrolero, minas, fundición, vidriería, ensambladora… |

Cada tienda se desbloquea comprando la zona **«Nueva tienda»** al final de la anterior. Cada una tiene su propio dinero, mejoras y progreso.

**Inicio guiado:** al abrir una tienda solo se ofrece lo imprescindible para empezar a vender (la primera estantería y su producción). Así el dinero inicial no se puede gastar en algo que deje la tienda sin generar.

**🗺️ Zonas:** al empezar solo están abiertas la parte delantera de la tienda (6 estanterías) y las dos primeras columnas de producción (10 puestos). El resto está acordonado. Cuando hace falta más espacio aparece **«Ampliar tienda»** o **«Ampliar producción»**; al comprarla desaparecen la cinta y la sombra, y la cámara enseña la zona nueva.

## Cómo se juega

| Acción | Cómo |
|---|---|
| Moverse | `WASD` / flechas, o arrastrar en la pantalla (joystick táctil) |
| Recoger | En huertos, minas, corrales o en la salida de una máquina |
| Soltar | En una estantería o en la entrada de una máquina |
| Cobrar | Quédate en el círculo 🧾 de la caja y recoge los billetes 💵 |
| Comprar | Párate sobre un recuadro con precio hasta llenarlo |
| Tirar | Lleva lo que no necesites al cubo de basura 🗑️ |

Cuanto más llevas encima, **más lento caminas** (−2,5 % por cosa, hasta −45 %); las *Zapatillas* lo compensan. Cualquier estantería abierta **atrae clientes aunque aún no tenga producto**: si no la llenas a tiempo, se irán enfadados.

## Reputación y dificultad

Al abrir una tienda eliges la **dificultad**:

| | 😌 Relajado | 🙂 Fácil | 😐 Normal | 😤 Difícil | 💀 Experto | 🔥 Pesadilla |
|---|---|---|---|---|---|---|
| Paciencia del cliente | 70 s + 8 s/prod. | 50 s + 6 s | 38 s + 5 s | 27 s + 4 s | 22 s + 3,5 s | 17 s + 3 s |
| Penalización | ×0,5 | ×0,6 | ×1 | ×1,5 | ×2 | ×2,5 |
| Propinas | ×0,5 | ×0,8 | ×1 | ×1,6 | ×2 | ×2,5 |
| Reputación inicial | 50 | 60 | 50 | 40 | 35 | 30 |
| Reponedor: viajes / descanso | 8 / 4 s | 6 / 6 s | 4 / 8 s | 3 / 12 s | 3 / 14 s | 2 / 16 s |
| Cajero: turno / descanso | 120 / 6 s | 90 / 8 s | 60 / 10 s | 45 / 14 s | 40 / 16 s | 35 / 18 s |
| Ladrón: dinero sin recoger | 45 s | 32 s | 24 s | 16 s | 12 s | 9 s |
| Clientes VIP | ×0,5 | ×0,8 | ×1 | ×1,3 | ×1,6 | ×2 |
| 🔥 Horas punta | — | — | cada 4 min | cada 3 min | cada 2,5 min | cada 2 min |
| 🔧 Averías | — | — | — | sí | frecuentes | muy frecuentes |
| ¿Puede cerrar? | No | Sí | Sí | Sí | Sí | Sí |

- **🔥 Horas punta:** durante 30 s llegan clientes casi tres veces más a menudo y caben más en la tienda.
- **🔧 Averías:** una máquina deja de producir hasta que te quedas a su lado unos segundos para repararla (o pulsas *Reparar* en el modo con botón).

- **⭐ Reputación (0–100):** cada cliente tiene una barra de paciencia sobre la cabeza para toda su visita, incluida la cola.
  - Servido rápido (más de la mitad de la paciencia): **+3 ⭐ y propina**.
  - Servido tarde: +1 ⭐.
  - Se cansó y pagó solo una parte: −3 ⭐.
  - Se fue sin comprar: −8 ⭐.
- Con más reputación llegan más clientes y la música es más alegre; con poca, menos clientes y música tensa. Por debajo de 20 hay aviso.
- **Si la reputación baja de 0, la tienda cierra y se pierde su progreso** (salvo en Relajado). Sale un resumen y puedes volver a empezar, también con otra dificultad.
- **👑 Clientes VIP:** piden más y tienen menos paciencia, pero dan el doble de reputación y propina (y quitan el doble si se van).
- **📦 Pedidos especiales:** cada 2–3 minutos llega un camión que pide varios productos con tiempo límite. Si lo entregas, ganas un buen premio y +6 ⭐; si caduca, pierdes reputación; rechazarlo con ✕ no penaliza.
- **🦹 Ladrones:** si dejas dinero sin recoger en la caja demasiado tiempo, entra un ladrón a robarlo. **Choca con él para detenerlo:** recuperas el dinero y ganas reputación. Si escapa, pierdes lo robado y reputación.
- **☕ Descansos del personal:** los reponedores descansan tras varios viajes y el cajero se toma descansos, durante los que tienes que cubrir tú la caja.
- **🐾 Mascotas:** los hábitats tienen una barra de comida que se vacía. Si se queda vacía, los animales dejan de criar (😿) y la tienda pierde reputación cada pocos segundos.

**Nombres:** al abrir el juego por primera vez se pregunta tu nombre (aparece sobre tu personaje). La primera vez que entras en una tienda le pones nombre; sale en el cartel de la tienda y en el menú. Ambos se pueden cambiar desde el menú con ✏️.

**Al bloquear el móvil o cambiar de app/pestaña** el juego se detiene solo: el navegador deja de dibujar fotogramas, el audio se suspende y la partida se guarda. Al volver continúa donde estaba, sin «saltos» de tiempo.

**Pantalla completa:** se activa al pulsar *Jugar* y se puede quitar o poner con el botón ⛶. El iPhone no permite pantalla completa en páginas web; ahí se consigue con *Compartir → Añadir a pantalla de inicio* (la web incluye un `manifest` para ello).

**⚙️ Configuración** (desde el menú o en partida):

- **Modo de interacción**: *Automático* (todo se hace al acercarte) o *Con botón*. En el modo con botón aparece un botón de acción abajo a la derecha con la acción disponible (Recoger, Soltar, Cobrar, Comprar o Tirar). También funciona con `Espacio` o `E`.
- **Calidad gráfica** (Baja / Media / Alta: resolución, sombras y suavizado de bordes) y **FPS máximos** (30 / 60 / máximo de la pantalla), con opción de **mostrar FPS**.
- Sonido, **música** (con volumen; cambia según la reputación), pistas con flecha guía y pantalla completa automática.

En **⬆ Mejoras**, agrupadas por categorías:
- 👤 **Jugador:** capacidad de carga y velocidad.
- 🏭 **Producción:** cultivos, rendimiento de las máquinas y capacidad de sus palés.
- 🏪 **Tienda:** capacidad de las estanterías, rapidez de la caja, paciencia de los clientes y publicidad.
- 👷 **Personal:** carga y velocidad de los reponedores, y descansos más cortos.
 Puedes contratar un **cajero** y **reponedores** que abastecen las estanterías y las máquinas. La partida se guarda sola en el `localStorage` del navegador (no en cookies ni en un servidor). Eso significa que el progreso queda en ese dispositivo y en ese navegador: no pasa de un móvil a un PC, y se pierde si se borran los datos del sitio.

## Desarrollo local

Requiere Node 20.19+ (recomendado 22).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # compila a dist/
npm run preview    # sirve dist/ en http://localhost:4173
```

En VS Code, la pestaña **Run and Debug** (F5) incluye estas configuraciones:

- **Jugar en local (Chrome / Edge)**: arranca `npm run dev` y abre el navegador con depuración.
- **Probar build de producción (Chrome)**: compila y sirve `dist/`, igual que en Netlify.

Para entrar directamente en una tienda ya desbloqueada, usa `?tienda=<id>` (por ejemplo `?tienda=pizzeria`). En modo desarrollo, el objeto `game` está disponible en la consola del navegador, por ejemplo `game.money = 99999` para probar.

## Publicar en Netlify (gratis)

La configuración está en [netlify.toml](netlify.toml): comando `npm run build`, carpeta `dist` y Node 22.

**Opción A: repositorio conectado (despliegue automático)**

1. En Netlify, entra en *Add new site → Import an existing project* y elige este repositorio.
2. Netlify lee `netlify.toml`, así que no hay que configurar nada.
3. Cada `git push` a `main` publica una versión nueva en `https://<tu-sitio>.netlify.app`.

**Opción B: arrastrar y soltar**

1. Ejecuta `npm run build`.
2. Arrastra la carpeta `dist/` a <https://app.netlify.com/drop>.

## Estructura

```
src/
  main.ts                 arranque: menú de inicio o tienda (?tienda=)
  style.css               menú, HUD, modales, configuración y botón de acción
  game/
    stores.ts             DATOS: máquinas, tiendas y orden de construcción
    items.ts              DATOS: catálogo de productos y sus mallas low-poly
    config.ts             ritmo, capacidades, mapa común y mejoras
    game.ts               orquestador: bucle, zonas, desbloqueos, pistas, cámara, guardado
    menu.ts · hud.ts · nameDialog.ts · settingsPanel.ts · settings.ts · fullscreen.ts · ui.ts
    stack.ts              pilas de ítems y animación de transferencia en arco
    music.ts              música procedural (WebAudio) según la reputación
    world.ts · props.ts   suelo, luces, paredes y decorado según el tema de la tienda
    input.ts · audio.ts · save.ts · labels.ts · tween.ts · util.ts
    actors/               jugador, clientes (paciencia, VIP), cajero/reponedores (descansos), ladrón
    stations/             estantería, huerto/frutales, máquina/generador/hábitat, caja, zona de compra, basura, camión de pedidos
```

### Añadir una tienda o un producto

1. **Producto**: añade una entrada en `PRODUCTS` ([items.ts](src/game/items.ts)) con nombre, emoji, precio y forma (`shape`). Si se cultiva, indica `grow`.
2. **Máquina**: añade una entrada en `MACHINES` ([stores.ts](src/game/stores.ts)) con estilo visual, entrada y salida. Sin entrada, es un generador.
3. **Tienda**: añade un `StoreDef` en `STORES` con tema de colores y la lista de `steps` (`'shelf:x'`, `'field:x'`, `'machine:x'`, `'cashier'`, `'stocker'`, `'expansion:otra'`). Las posiciones y los precios se calculan solos.

El mapa admite hasta 12 estanterías y 20 estaciones de producción por tienda.

## Licencia y créditos

Proyecto propio con fines educativos. Toma la mecánica de un género, no la marca, el nombre ni el arte de ningún juego existente. Todos los modelos se generan con geometría de Three.js y los sonidos con WebAudio.
