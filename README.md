# Granja & Tienda 🍅

Juego *idle arcade* en 3D para el navegador, inspirado en el género de **My Mini Mart**. Cultivas, procesas, repones estanterías, cobras a los clientes y reinviertes para hacer crecer tu tienda de granja.

Hecho con **Vite + TypeScript + Three.js**. Es un sitio 100 % estático, listo para publicar gratis en Netlify.

## Cómo se juega

| Acción | Cómo |
|---|---|
| Moverse | `WASD` / flechas, o arrastrar en la pantalla (joystick táctil) |
| Recoger | Pasa por un huerto o por la salida de una máquina |
| Reponer | Acércate a una estantería o a la entrada de una máquina con productos |
| Cobrar | Quédate en el círculo 🧾 detrás de la caja |
| Comprar | Párate sobre un recuadro con precio hasta llenarlo |

**Cadenas de producción**

- 🍅 Huerto → estantería ($3)
- 🌾 Trigal → 🔥 Horno → 🍞 Pan ($8)
- 🍅 Tomates → 🐔 Gallinero → 🥚 Huevos ($6)

Puedes contratar un **cajero** (cobra solo) y **reponedores** (llevan productos a estanterías y máquinas). En **⬆ Mejoras** hay mochila, velocidad, abono, maquinaria y formación del personal. La partida se guarda sola en el navegador (`localStorage`).

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

En modo desarrollo, el objeto `game` está disponible en la consola del navegador, por ejemplo `game.money = 999` para probar.

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
  main.ts                 arranque
  style.css               HUD, panel y joystick
  game/
    game.ts               orquestador: bucle, desbloqueos, pistas, cámara, guardado
    config.ts             economía, mapa, desbloqueos y mejoras (equilibrar aquí)
    stack.ts              pilas de ítems y animación de transferencia en arco
    items.ts              tipos de producto y mallas low-poly
    world.ts              suelo, luces, tienda y decorado
    input.ts · hud.ts · audio.ts · save.ts · labels.ts · tween.ts · util.ts
    actors/               jugador, clientes, cajero/reponedores
    stations/             estantería, huerto, máquina, caja, zona de compra
```

Para cambiar precios, tiempos o el orden de los desbloqueos, edita [src/game/config.ts](src/game/config.ts). La lógica no lleva números de economía.

## Licencia y créditos

Proyecto propio con fines educativos. Toma la mecánica de un género, no la marca, el nombre ni el arte de ningún juego existente. Todos los modelos se generan con geometría de Three.js y los sonidos con WebAudio.
