# McL Arcade 🕹️

Juego *idle arcade* en 3D para el navegador. Cultiva, extrae y fabrica productos, repón las estanterías, cobra a los clientes y reinvierte para hacer crecer una cadena de **5 tiendas**.

Hecho con **Vite + TypeScript + Three.js**. Es un sitio 100 % estático, listo para publicar gratis en Netlify.

## Tiendas

| Tienda | Productos a la venta | Producción |
|---|---|---|
| 🚜 **La Granja** | 12: tomates, zanahorias, maíz, huevos, manzanas, leche, pan, kétchup, queso, zumo, palomitas, tarta | Huertos, frutales, establo, gallinero, horno, quesería… |
| 🍕 **Pizzería** | 12: pizzas, calzones, pan de ajo, salsa, queso, aceite, tiramisú, albahaca, champiñones, pimientos, aceitunas, tomates | Molino → amasadora → hornos, almazara, postres… |
| 🥐 **Panadería & Café** | 11: pan, cruasanes, dónuts, café, chocolate, batidos, tartas, miel, caramelos, fresas, leche | Molino, tostadora, colmenas, chocolatera, freidora… |
| 🛒 **Supermercado** | 12: patatas fritas, galletas, refrescos, cereales, agua, zumo, yogures, arroz, huevos, leche, naranjas, patatas | Manantial, refinería de azúcar, galletera, embotelladora… |
| 🚗 **Autos & Recambios** | 11: gasolina, aceite de motor, pintura, neumáticos, parabrisas, faros, baterías, llaves, tornillos, motores, **coches** | Pozo petrolero, minas, fundición, vidriería, ensambladora… |

Cada tienda se desbloquea comprando la zona **«Nueva tienda»** al final de la anterior. Cada una tiene su propio dinero, mejoras y progreso.

## Cómo se juega

| Acción | Cómo |
|---|---|
| Moverse | `WASD` / flechas, o arrastrar en la pantalla (joystick táctil) |
| Recoger | En huertos, minas, corrales o en la salida de una máquina |
| Soltar | En una estantería o en la entrada de una máquina |
| Cobrar | Quédate en el círculo 🧾 de la caja y recoge los billetes 💵 |
| Comprar | Párate sobre un recuadro con precio hasta llenarlo |
| Tirar | Lleva lo que no necesites al cubo de basura 🗑️ |

**Nombres:** al abrir el juego por primera vez se pregunta tu nombre (aparece sobre tu personaje). La primera vez que entras en una tienda le pones nombre; sale en el cartel de la tienda y en el menú. Ambos se pueden cambiar desde el menú con ✏️.

**Pantalla completa:** se activa al pulsar *Jugar* y se puede quitar o poner con el botón ⛶. El iPhone no permite pantalla completa en páginas web; ahí se consigue con *Compartir → Añadir a pantalla de inicio* (la web incluye un `manifest` para ello).

**⚙️ Configuración** (desde el menú o en partida):

- **Modo de interacción**: *Automático* (todo se hace al acercarte) o *Con botón*. En el modo con botón aparece un botón de acción abajo a la derecha con la acción disponible (Recoger, Soltar, Cobrar, Comprar o Tirar). También funciona con `Espacio` o `E`.
- Sonido, sombras (desactívalas si va lento), pistas con flecha guía y pantalla completa automática.

En **⬆ Mejoras** compras mochila, velocidad, abono, maquinaria y formación del personal. Puedes contratar un **cajero** y **reponedores** que abastecen las estanterías y las máquinas. La partida se guarda sola en el `localStorage` del navegador (no en cookies ni en un servidor). Eso significa que el progreso queda en ese dispositivo y en ese navegador: no pasa de un móvil a un PC, y se pierde si se borran los datos del sitio.

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
    world.ts · props.ts   suelo, luces, paredes y decorado según el tema de la tienda
    input.ts · audio.ts · save.ts · labels.ts · tween.ts · util.ts
    actors/               jugador, clientes, cajero/reponedores
    stations/             estantería, huerto/frutales, máquina/generador, caja, zona de compra, basura
```

### Añadir una tienda o un producto

1. **Producto**: añade una entrada en `PRODUCTS` ([items.ts](src/game/items.ts)) con nombre, emoji, precio y forma (`shape`). Si se cultiva, indica `grow`.
2. **Máquina**: añade una entrada en `MACHINES` ([stores.ts](src/game/stores.ts)) con estilo visual, entrada y salida. Sin entrada, es un generador.
3. **Tienda**: añade un `StoreDef` en `STORES` con tema de colores y la lista de `steps` (`'shelf:x'`, `'field:x'`, `'machine:x'`, `'cashier'`, `'stocker'`, `'expansion:otra'`). Las posiciones y los precios se calculan solos.

El mapa admite hasta 12 estanterías y 20 estaciones de producción por tienda.

## Licencia y créditos

Proyecto propio con fines educativos. Toma la mecánica de un género, no la marca, el nombre ni el arte de ningún juego existente. Todos los modelos se generan con geometría de Three.js y los sonidos con WebAudio.
