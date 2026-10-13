# Plan: simulación tipo "My Mini Mart" (idle arcade de granja + tienda)

## 1. Análisis del juego de referencia

**Ficha (YouTube Playables):** "My Mini Mart" — *"running your own Mini Mart. Grow organic plants, tend to your animals, & sell produce to customers. Hire, Build and Expand!"*
Publicado en móvil por Supersonic Studios; más de 70 M de descargas, el idle arcade más descargado de 2022.

**Género:** *idle arcade* / hyper-casual tycoon, en 3D low-poly con cámara isométrica fija que sigue al jugador.

### Bucle principal
1. **Recolectar**: el jugador camina sobre una parcela (tomate, trigo…) y los productos se apilan en su espalda, con un tope de carga.
2. **Procesar** (opcional): lleva materia prima a una máquina (licuadora → ketchup, gallinero: tomate → huevos, molino: trigo → harina…). La máquina tarda unos segundos y deja el producto en su bandeja de salida.
3. **Reponer**: al pasar junto a una estantería, los productos se descargan solos, uno a uno, con animación.
4. **Vender**: los clientes (NPC) entran, recorren las estanterías de su lista, llenan una caja y van a la caja registradora. Alguien tiene que estar en la caja para cobrar, y el dinero se acumula en una pila.
5. **Invertir**: el jugador recoge el dinero y lo deposita sobre "zonas de compra" (un recuadro con su precio que se va llenando). Al completarse, aparece la estación, la cámara se desplaza hasta ella y se revela la siguiente zona.

### Mecánicas clave
- **Control de un solo dedo**: joystick virtual o click-and-drag; todas las interacciones son por proximidad, sin botones.
- **Cadenas de recursos**: unas 3 cadenas de profundidad 1-2 (p. ej., tomate → estantería / gallinero → huevos / licuadora → ketchup).
- **Personal (automatización)**: **cajero** (cobra solo), **reponedor** (lleva de la parcela a la estantería), y más adelante un ayudante que alimenta máquinas.
- **Mejoras**: capacidad de carga, velocidad del jugador, velocidad y capacidad del personal, velocidad de las máquinas, capacidad de las estanterías.
- **Evento de ladrón**: si se acumula mucho dinero sin recoger en la caja, aparece un ladrón y hay un minijuego de apuntar con una red.
- **Basura / clientes molestos**: se introducen más tarde, junto con una nueva zona.
- **Nuevo mercado** (a los 30-40 min): se limpia el mapa y se empieza otro con productos nuevos (meta a medio plazo).
- **Monetización** (no se replica): cupones como moneda premium, anuncios con recompensa e intersticiales.

### Por qué funciona (lo que hay que preservar)
- Distancias cortas al principio, objetivos siempre visibles (flecha/indicador) y decisiones de ahorro con sentido (¿zona de $95 o gallinero de $50?).
- Animaciones con mucho *juice*: productos que saltan en arco, pilas que se balancean, monedas que vuelan, *pop* al desbloquear.
- Cada desbloqueo revela algo nuevo; la cámara lo enseña.

---

## 2. Alcance de nuestra simulación (MVP)

Un juego web jugable en el navegador, de un solo mercado, unos 15-20 minutos de progresión, con:
- 3 cadenas: **Tomate**, **Trigo → Harina** y **Tomate → Gallinero → Huevos**.
- Clientes con listas de compra, caja registradora, dinero apilado.
- 8-10 zonas de compra en secuencia y 2 tipos de personal (cajero y reponedor).
- Panel de mejoras y guardado en `localStorage`.
- Fuera del MVP: ladrón, basura, segundo mercado, sonido avanzado.

## 3. Stack técnico

| Pieza | Elección | Motivo |
|---|---|---|
| Lenguaje | TypeScript | Tipado del estado del juego |
| Bundler | Vite | Arranque inmediato y HMR |
| Render | **Three.js** | 3D low-poly isométrico como el original; *assets* con primitivas (cajas, cilindros), sin modelos externos |
| Animación | Tweens propios o `@tweenjs/tween.js` | Arcos de productos y *pops* |
| UI | HTML/CSS superpuesto (dinero, mejoras) | Más simple que una UI en WebGL |
| Navegación de NPC | Waypoints sobre una rejilla, sin librería de *pathfinding* | El mapa es pequeño y fijo |

Alternativa más ligera: Phaser 3 en 2D con vista cenital (menos fiel, más rápido de hacer).

## 4. Arquitectura

```
src/
  main.ts                 // bootstrap, loop (requestAnimationFrame, dt fijo)
  core/
    Game.ts               // estado global, tick de sistemas
    EventBus.ts           // eventos: unlock, sale, moneyChanged…
    SaveSystem.ts         // serializa/deserializa a localStorage
    config.ts             // DATOS: precios, tiempos, capacidades, orden de desbloqueo
  render/
    SceneSetup.ts         // cámara ortográfica isométrica, luces, suelo
    Factory.ts            // mallas low-poly por tipo (tomate, saco, huevo, estación…)
    Tween.ts              // arcos de salto, escalado pop
  entities/
    Player.ts             // movimiento, pila de carga (Stack)
    Stack.ts              // pila genérica de ítems (jugador, NPC, bandejas)
    Station.ts            // base: zona de interacción por radio
    CropPlot.ts           // genera materia prima con un temporizador
    Processor.ts          // entrada → (tiempo) → salida (licuadora, molino, gallinero)
    Shelf.ts              // almacena un tipo de producto y recibe/entrega
    Register.ts           // cola de clientes, cobro, pila de dinero
    BuyZone.ts            // recibe dinero hasta llegar al precio y desbloquea
    Customer.ts           // máquina de estados: entrar → estanterías → cola → pagar → salir
    Worker.ts             // máquina de estados por rol (cajero / reponedor)
  systems/
    InteractionSystem.ts  // proximidad jugador/NPC ↔ estación, transferencia por intervalos
    CustomerSpawner.ts    // ritmo de llegada según las estanterías desbloqueadas
    ProgressionSystem.ts  // orden de BuyZones y revelado con paneo de cámara
    UpgradeSystem.ts
  ui/
    Hud.ts                // dinero, flecha guía al objetivo
    Joystick.ts           // táctil y ratón; WASD como extra
    UpgradePanel.ts
```

**Principio clave:** toda la economía va en `config.ts` (datos, no código) para poder equilibrarla sin tocar la lógica.

### Modelo de transferencia (corazón del juego)
Toda interacción es un `Stack → Stack` con intervalo:
```
cada 0.1 s mientras (A en radio de B):
  si A.puedeDar(tipo) y B.puedeRecibir(tipo): mover 1 ítem con tween en arco
```
Con esto se resuelven parcela→jugador, jugador→máquina, máquina→jugador, jugador→estantería, estantería→cliente, caja→dinero y dinero→BuyZone.

## 5. Fases de implementación

| # | Fase | Entregable verificable |
|---|---|---|
| 1 | **Base** | Vite + TS + Three.js; escena isométrica, suelo y jugador (cápsula) movido con joystick/WASD; la cámara lo sigue |
| 2 | **Stack + recolección** | La parcela de tomates genera ítems; el jugador los recoge en una pila visible en la espalda, con tope |
| 3 | **Estantería + cliente** | Se repone la estantería; un cliente entra, coge tomates y va a la caja |
| 4 | **Caja + dinero** | El jugador en la caja cobra; la pila de billetes crece y él la recoge; HUD de dinero |
| 5 | **BuyZones + progresión** | Zonas con precio que se llenan con dinero; desbloqueo en secuencia con paneo de cámara y flecha guía |
| 6 | **Procesadores** | Molino (trigo→harina) y gallinero (tomate→huevos), con entrada, temporizador y bandeja de salida |
| 7 | **Personal** | Cajero y reponedor con máquinas de estados y su propia BuyZone de contratación |
| 8 | **Mejoras + guardado** | Panel de mejoras (carga, velocidad, personal); guardado y carga automáticos |
| 9 | **Juice + equilibrado** | Arcos, *pop*, partículas de monedas, sonidos simples; ajuste de la curva para unos 15-20 min |
| 10 | *(Extra)* | Evento de ladrón con minijuego de red, basura, segundo mercado |

## 6. Equilibrado inicial (borrador en `config.ts`)

| Desbloqueo | Precio | Nota |
|---|---|---|
| Estantería de tomate | 0 (tutorial) | La estantería va antes que la parcela, como en el original |
| Parcela de tomate | 10 | |
| Caja registradora | 0 (tutorial) | |
| 2.ª parcela de tomate | 30 | |
| Parcela de trigo + molino | 60 | |
| Estantería de harina | 40 | |
| Cajero | 80 | Primer alivio de rutina |
| Gallinero | 50 | Dilema frente a ahorrar para la zona de $95 |
| Ampliación de zona | 95 | |
| Estantería de huevos | 60 | |
| Reponedor | 150 | |

Precios de venta: tomate $2, harina $5, huevo $6. Llega un cliente cada 4-6 s, con una lista de 1 a 4 productos de las estanterías activas.

## 7. Riesgos y decisiones

- **Rendimiento con muchos ítems apilados**: usar `InstancedMesh` por tipo de producto.
- **Atascos de NPC**: rutas por waypoints y colas como listas de posiciones fijas; sin física.
- **Ritmo**: el mayor riesgo de diseño. Hay que hacer playtests desde la fase 5 y tocar solo `config.ts`.
- **Propiedad intelectual**: replicar mecánicas, no marca, nombre ni arte. Nombre y estética propios (p. ej., "Granja & Tienda").

## 8. Siguiente paso
Arrancar la **fase 1** (scaffold Vite + TS + Three.js con el jugador moviéndose) y avanzar fase a fase, verificando cada entregable en el navegador.
