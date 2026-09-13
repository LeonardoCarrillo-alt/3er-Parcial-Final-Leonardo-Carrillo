# Implementation Plan: Duelo de Cristales

## Overview

Plan de implementación para un juego web por turnos de 2 jugadores construido con React + TypeScript (frontend) y Express + TypeScript (backend). El backend es el árbitro único del estado; el frontend es puramente reactivo. El plan está organizado en 5 días de trabajo (10–14 septiembre 2026), con deadline final el 15/09/2026 a las 16:00.

**Stack tecnológico:** TypeScript · React + Vite (frontend) · Express (backend) · Jest + fast-check (pruebas unitarias/propiedades) · Playwright (E2E) · GitHub Actions (CI/CD) · Render (despliegue).

---

## Tasks

- [x] 1. Setup del repositorio y configuración base
  - Crear la estructura monorepo con `client/` y `server/`, configurar herramientas de desarrollo y verificar que ambos procesos arrancan sin errores.
  - _Requisitos: 20, 21_

  - [x] 1.1 Crear repositorio GitHub con README.md inicial
    - Inicializar el repositorio `3er-Parcial-Final-Leonardo-Carrillo` en GitHub con una rama `main` y un README.md que incluya el nombre del proyecto, propósito y stack.
    - _Requisitos: 21.1, 21.2_

  - [x] 1.2 Crear `client/` con Vite React+TypeScript
    - Ejecutar `npm create vite@latest client -- --template react-ts` desde la raíz del repo. Eliminar los archivos de ejemplo innecesarios (`App.css` genérico, `counter.ts`, etc.).
    - _Requisitos: 15.1, 16.1_

  - [x] 1.3 Crear `server/` con dependencias Express + TypeScript
    - Ejecutar `npm init -y` en `server/`. Instalar dependencias de producción: `express`. Instalar dependencias de desarrollo: `typescript`, `tsx`, `@types/node`, `@types/express`, `ts-node`.
    - _Requisitos: 19.3_

  - [x] 1.4 Configurar `tsconfig.json` en `client/` y `server/`
    - En `server/tsconfig.json`: `strict: true`, `module: CommonJS`, `target: ES2020`, `outDir: dist`, `rootDir: src`. En `client/`: ya generado por Vite; verificar que `strict: true` está activo.
    - _Requisitos: 18.1_

  - [x] 1.5 Configurar ESLint en `client/` y `server/`
    - En `client/`: verificar que `eslint.config.js` generado por Vite está presente y funciona. En `server/`: instalar `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin` y crear `.eslintrc.json` con reglas TypeScript strict.
    - _Requisitos: 20.2_

  - [x] 1.6 Configurar `package.json` raíz con scripts de workspace
    - Crear `package.json` raíz con scripts: `dev:client` (Vite en :5173), `dev:server` (tsx watch en :3001), `build` (build client + compile server), `lint` (ESLint client + server), `test:e2e` (Playwright headless).
    - _Requisitos: 20.1, 20.4_

  - [x] 1.7 Configurar proxy en `vite.config.ts`
    - En `client/vite.config.ts`, añadir `server.proxy`: `{ '/api': { target: 'http://localhost:3001', changeOrigin: true } }` para que las rutas `/api/*` se proxien al backend en desarrollo sin problemas de CORS.
    - _Requisitos: 18.4, 19.2_

  - [x] 1.8 Crear carpeta `docs/` con archivos Markdown iniciales
    - Crear `docs/introduction.md`, `docs/reglas.md`, `docs/api.md`, `docs/decisiones.md`, `docs/investigacion.md`, `docs/ia.md` con encabezados vacíos. Se completarán en la Tarea 13.
    - _Requisitos: 21.1_

- [x] 2. Tipos TypeScript compartidos
  - Definir todas las interfaces y tipos que serán usados por el backend (fuente de verdad) y el frontend (espejo de solo lectura).
  - _Requisitos: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14_
  - [x] 2.1 Crear `server/src/game/types.ts` con todas las interfaces del backend
    - Declarar: `PlayerId`, `GameStatus`, `ActionType`, `Direction`, `UnitType`, `EventType`, `CellType`, `Position`, `Unit`, `Projectile`, `PlayerState`, `Cell`, `GameEvent`, `HistoryEntry`, `GameState`, `ValidationResult`, `CreateGameRequest`, `CreateGameResponse`, `ActionRequest`, `ActionResponse`, `HistoryResponse`.
    - _Requisitos: 1.6, 2.3, 3.6, 14.2_

  - [x] 2.2 Crear `client/src/types/game.ts` como espejo del backend
    - Duplicar todas las interfaces de `server/src/game/types.ts` en `client/src/types/game.ts`. Ambos archivos deben compilar con `tsc --noEmit` sin errores.
    - _Requisitos: 16.2, 17.1_

- [x] 3. Generador del estado inicial (`generator.ts`)
  - Implementar la función que construye el `GameState` inicial con el tablero 10×10, unidades, recursos y metadatos de partida.
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.1 Implementar `createInitialState(player1, player2): GameState`
    - Crear `server/src/game/generator.ts`. Función que recibe los nombres de ambos jugadores y devuelve un `GameState` completo con todos los campos requeridos (`status: "playing"`, `turn: "P1"`, `turnNumber: 1`, etc.).
    - Generar `id` único con `crypto.randomUUID()`.
    - _Requisitos: 1.1, 1.6_

  - [x] 3.2 Posicionar Núcleos y Magos en coordenadas fijas
    - Crear las 4 `Unit` con posiciones deterministas: Núcleo P1 en `(0,0)`, Núcleo P2 en `(9,9)`, Mago P1 en `(0,1)`, Mago P2 en `(9,8)`. HP=10, armor=0 para todos.
    - _Requisitos: 1.3, 1.4_

  - [x] 3.3 Algoritmo Fisher-Yates para colocar 8 obstáculos sin colisión
    - Obtener la lista de las 96 casillas libres (100 − 4 reservadas). Aplicar Fisher-Yates parcial para seleccionar 8 posiciones aleatorias. Marcar esas casillas como `type: "obstacle"` en `board[y][x]`.
    - _Requisitos: 1.2_

  - [x] 3.4 Colocar 4 cristales en casillas libres restantes
    - De las 88 casillas restantes, seleccionar 4 con Fisher-Yates. Marcar esas casillas como `type: "crystal"` con `crystalValue: 1`.
    - _Requisitos: 1.2_

  - [x] 3.5 Colocar 2 eventos ocultos en casillas libres restantes
    - De las 84 casillas restantes, seleccionar 2 con Fisher-Yates. Almacenarlos en el campo `events` del estado como eventos de tipo oculto (no en el tablero, para mantenerlos opacos al frontend).
    - _Requisitos: 1.2_

  - [x] 3.6 Asignar valores iniciales de recursos a cada jugador
    - Construir el `Record<PlayerId, PlayerState>` con: `mana: 3`, `crystals: 0`, `armor: 0`, `name` y `position` del Mago respectivo para P1 y P2.
    - _Requisitos: 1.5_

  - [x] 3.7 Escribir tests unitarios para `generator.ts`
    - Verificar: tablero 10×10, exactamente 8 obstáculos, 4 cristales, posiciones de Núcleos y Magos correctas, maná=3, cristales=0, sin superposición.
    - _Requisitos: 1.2, 1.3, 1.4, 1.5_

  - [x]* 3.8 Escribir property test para el estado inicial (Propiedad 1)
    - **Propiedad 1: Estado inicial válido para cualquier par de nombres válidos**
    - **Valida: Requisitos 1.1, 1.5**
    - Usar fast-check con `fc.string({ minLength: 1, maxLength: 30 })` para ambos nombres. Verificar `status`, `turn`, `turnNumber`, `mana`, `crystals`, `armor`.
    - _Requisitos: 1.1, 1.5_

  - [x]* 3.9 Escribir property test para el tablero inicial (Propiedad 2)
    - **Propiedad 2: Tablero inicial con elementos correctos**
    - **Valida: Requisitos 1.2, 1.3, 1.4**
    - Verificar para cualquier par de nombres válidos: exactamente 8 obstáculos, 4 cristales, posiciones de Núcleos y Magos sin superposición.
    - _Requisitos: 1.2, 1.3, 1.4_

- [x] 4. Checkpoint — Verificar generación del estado inicial
  - Verificar que `createInitialState` produce un estado válido ejecutando los tests: `npm run test --prefix server`. Pedir al usuario que resuelva dudas antes de continuar.

- [x] 5. Validador de acciones (`validator.ts`)
  - Implementar todas las validaciones previas a la aplicación de una acción. Retorna `{ valid: true }` o `{ valid: false, error: string }`.
  - _Requisitos: 3.3, 3.4, 3.5, 4.2, 4.3, 4.4, 5.3, 5.4, 6.2, 6.3, 6.5, 7.5, 7.6, 8.3, 8.4_

  - [x] 5.1 Implementar `validateAction(state, req): ValidationResult`
    - Crear `server/src/game/validator.ts` con la función principal. Ejecutar cada validación en orden: status → turno → maná → límites → casilla → recurso → adyacencia → dirección.
    - _Requisitos: 3.3, 3.4, 3.5_

  - [x] 5.2 Validar que la partida no ha terminado (`status !== "finished"`)
    - Si `state.status === "finished"`, retornar `{ valid: false, error: "La partida ha terminado" }`. Esta condición debe producir HTTP 409 en la ruta.
    - _Requisitos: 3.4, 13.4_

  - [x] 5.3 Validar que la acción corresponde al jugador activo
    - Si `req.playerId !== state.turn`, retornar `{ valid: false, error: "No es tu turno" }`.
    - _Requisitos: 3.3, 4.4, 5.4, 6.5_

  - [x] 5.4 Validar maná suficiente según la acción
    - Costes: `move`=0, `collect`=0, `defend`=0, `attack`=1, `summon`=2, `spell`=3. Si el jugador activo tiene menos maná del requerido, retornar `{ valid: false, error: "Maná insuficiente" }`.
    - _Requisitos: 3.5, 6.2, 7.5, 8.4_

  - [x] 5.5 Validar límites del tablero para `move` y `spell` (coordenadas 0–9)
    - Calcular la casilla destino a partir de la posición actual del Mago y la dirección. Si `x < 0 || x > 9 || y < 0 || y > 9`, retornar `{ valid: false, error: "Movimiento fuera del tablero" }`.
    - _Requisitos: 4.3_

  - [x] 5.6 Validar casilla destino no bloqueada para `move`
    - Si la casilla destino es `type: "obstacle"` o `type: "temp_obstacle"`, o está ocupada por el Mago del oponente, retornar `{ valid: false, error: "Casilla bloqueada" }`.
    - _Requisitos: 4.2_

  - [x] 5.7 Validar existencia de cristal en casilla del Mago para `collect`
    - Si `board[mage.y][mage.x].type !== "crystal"`, retornar `{ valid: false, error: "No hay cristal en esta casilla" }`.
    - _Requisitos: 5.3_

  - [x] 5.8 Validar casilla adyacente libre para `summon` (prioridad N > E > S > O)
    - Buscar en orden Norte, Este, Sur, Oeste la primera casilla libre (dentro del tablero, sin obstáculo ni unidad). Si no hay ninguna, retornar `{ valid: false, error: "No hay casillas libres para invocar" }`.
    - _Requisitos: 6.3, 6.6_

  - [x] 5.9 Validar dirección válida para `move` y `spell`
    - Si `req.target` no es uno de `"north"`, `"south"`, `"east"`, `"west"`, retornar `{ valid: false, error: "Dirección inválida" }`.
    - _Requisitos: 7.6_

  - [x] 5.10 Escribir tests unitarios para `validator.ts`
    - Cubrir: turno incorrecto, maná insuficiente, fuera de tablero, casilla bloqueada, partida terminada, dirección inválida, sin cristal, sin casillas adyacentes.
    - _Requisitos: 3.3, 3.4, 3.5, 4.2, 4.3_

  - [x] 5.11 Escribir property test — Acción de jugador inactivo siempre rechazada (Propiedad 5)
    - **Propiedad 5: Acción de jugador inactivo siempre rechazada**
    - **Valida: Requisitos 3.3, 4.4, 5.4, 6.5**
    - Para cualquier estado activo y cualquier `playerId` diferente a `state.turn`, `validateAction` debe retornar `{ valid: false }` sin modificar el estado.
    - _Requisitos: 3.3, 4.4_

  - [x] 5.12 Escribir property test — Maná insuficiente rechaza la acción (Propiedad 6)
    - **Propiedad 6: Maná insuficiente rechaza la acción sin modificar el estado**
    - **Valida: Requisitos 3.5, 6.2, 7.5, 8.4**
    - Para cualquier acción con coste mayor al maná actual del jugador activo, `validateAction` debe retornar `{ valid: false }`.
    - _Requisitos: 3.5, 6.2, 7.5, 8.4_

- [x] 6. Motor de juego (`engine.ts`)
  - Implementar la aplicación de acciones validadas y la resolución completa del turno. Es el árbitro único de toda la lógica de juego.
  - _Requisitos: 4.1, 5.1, 6.1, 6.4, 6.6, 7.1–7.4, 7.7, 8.1, 8.2, 8.3, 9.1, 9.2, 10.1–10.3, 11.1, 11.2, 12.1–12.6, 13.1, 13.2_

  - [x] 6.1 Implementar `applyAction(state, req): GameState` — función principal
    - Crear `server/src/game/engine.ts`. La función recibe el estado actual y la acción ya validada, ejecuta los 9 pasos del motor en orden y devuelve el nuevo estado inmutable (copias profundas con spread/structuredClone).
    - _Requisitos: 3.1, 3.2_

  - [x] 6.2 Paso 1: Expirar obstáculos temporales (`Bloqueo`)
    - Al inicio del turno, recorrer `board` y eliminar celdas con `type: "temp_obstacle"` cuyo `tempObstacleExpiry === state.turnNumber`. Restaurarlas a `type: "empty"`.
    - _Requisitos: 12.4_

  - [x] 6.3 Paso 2: Evaluar evento aleatorio (10% de probabilidad, 3 tipos)
    - Generar número aleatorio [0,1). Si < 0.1, activar evento. Seleccionar entre `storm`, `crystal_double`, `block` con igual probabilidad. Registrar en `state.events`.
    - Sub-implementaciones:
      - **Tormenta:** restar 1 maná a ambos jugadores (mínimo 0).
      - **Cristal_Doble:** establecer `crystalDoubleActive: true`.
      - **Bloqueo:** colocar `type: "temp_obstacle"` con `tempObstacleExpiry: turnNumber + 1` en casilla libre aleatoria.
    - _Requisitos: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 6.4 Paso 3: Spawn de cristal cada 4 turnos
    - Si `turnNumber % 4 === 0` y el número de cristales en tablero < 10, colocar 1 cristal en casilla libre aleatoria.
    - _Requisitos: 11.1, 11.2_

  - [x] 6.5 Paso 5a: Acción `move` — desplazar Mago sin consumir maná
    - Actualizar `position` del Mago en `units` y la `position` del `PlayerState` correspondiente. No modificar `mana`.
    - _Requisitos: 4.1_

  - [x] 6.6 Paso 5b: Acción `collect` — recolectar cristal
    - Eliminar el cristal de `board[mage.y][mage.x]` (establecer a `type: "empty"`). Si `crystalDoubleActive`, incrementar `crystals` en 2 y desactivar el flag; si no, incrementar en 1. No modificar `mana`.
    - _Requisitos: 5.1, 5.2, 12.3_

  - [x] 6.7 Paso 5c: Acción `summon` — crear Minion adyacente
    - Encontrar la primera casilla libre adyacente (N > E > S > O). Crear `Unit` con `type: "minion"`, `owner`, `hp: 3`, `armor: 0`, `id: "p1-minion-<n>"`. Restar 2 de maná al jugador activo.
    - _Requisitos: 6.1, 6.4, 6.6_

  - [x] 6.8 Paso 5d: Acción `spell` — crear Proyectil en la dirección indicada
    - Calcular la casilla adyacente en la dirección dada. Si hay unidad enemiga, aplicar 3 daño inmediatamente y no crear proyectil. Si está libre, añadir `Projectile` al array `projectiles`. Restar 3 de maná.
    - _Requisitos: 7.1, 7.7_

  - [x] 6.9 Paso 5e: Acción `attack` — atacar unidad enemiga adyacente
    - Buscar unidades enemigas en las 4 casillas adyacentes al Mago. Aplicar `max(2 - armadura_objetivo, 1)` de daño. Restar 1 de maná. Eliminar unidad si HP ≤ 0.
    - _Requisitos: 8.1, 8.2_

  - [x] 6.10 Paso 5f: Acción `defend` — asignar armadura al Mago
    - Establecer `armor: 2` en el `PlayerState` del jugador activo (reemplaza, no acumula).
    - _Requisitos: 9.1_

  - [x] 6.11 Paso 6: Mover proyectiles y resolver impactos
    - Para cada `Projectile` en `state.projectiles`: avanzar 1 casilla en su dirección. Si hay unidad enemiga en esa casilla, aplicar 3 daño y eliminar el proyectil. Si sale del tablero (< 0 o > 9), eliminar el proyectil sin daño.
    - _Requisitos: 7.2, 7.3, 7.4_

  - [x] 6.12 Paso 7: Mover Minions hacia el Núcleo enemigo
    - Para cada Minion (ordenados por `id` ascendente): calcular distancia Manhattan a Núcleo enemigo en las 4 direcciones ortogonales. Mover a la que minimice la distancia (empate: N > E > S > O). Si la casilla destino está bloqueada, el Minion no se mueve. Si alcanza la casilla del Núcleo enemigo, infligir 1 daño al Núcleo y eliminar el Minion.
    - _Requisitos: 10.1, 10.2, 10.3_

  - [x] 6.13 Paso 8: Verificar condición de victoria o empate
    - Si HP del Núcleo de cualquier jugador ≤ 0: `status: "finished"`, `winner` = jugador contrario.
    - Si `turnNumber === 30` y ningún Núcleo destruido: `status: "finished"`, comparar cristales → `winner: "P1"` | `"P2"` | `"draw"`.
    - _Requisitos: 13.1, 13.2_

  - [x] 6.14 Paso 9: Resetear armadura, registrar en history, cambiar turno, incrementar turnNumber
    - Resetear `armor: 0` del jugador que acaba de jugar (si usó `defend` en un turno anterior, la armadura se aplica durante el turno del oponente y se resetea al volver su turno). Añadir entrada a `history` con `player`, `action`, `turnNumber`, `timestamp` ISO 8601. Cambiar `turn`. Incrementar `turnNumber`.
    - _Requisitos: 3.1, 3.6, 9.2, 14.2_

  - [x]* 6.15 Escribir tests unitarios para `engine.ts`
    - Cubrir cada acción con entradas válidas: move desplaza Mago, collect incrementa cristales, summon crea Minion, spell crea proyectil, attack aplica daño, defend asigna armadura. Probar movimiento de Minions, resolución de proyectiles, victoria, empate.
    - _Requisitos: 4.1, 5.1, 6.1, 8.1, 9.1, 10.1, 13.1, 13.2_

  - [x]* 6.16 Escribir property test — Alternancia de turno e incremento de turnNumber (Propiedad 4)
    - **Propiedad 4: Alternancia de turno e incremento de turnNumber**
    - **Valida: Requisito 3.1**
    - Para cualquier secuencia de acciones válidas, cada `applyAction` debe alternar `turn` y sumar exactamente 1 a `turnNumber`.
    - _Requisitos: 3.1_

  - [x]* 6.17 Escribir property test — Movimiento del Mago sin consumir maná (Propiedad 8)
    - **Propiedad 8: Movimiento del Mago en dirección libre no consume maná**
    - **Valida: Requisito 4.1**
    - Para cualquier posición válida con casilla libre adyacente, la acción `move` no debe modificar `mana`.
    - _Requisitos: 4.1_

  - [x]* 6.18 Escribir property test — Recolección de cristal (Propiedad 10)
    - **Propiedad 10: Recolección de cristal incrementa contador y limpia casilla**
    - **Valida: Requisitos 5.1, 5.2**
    - Verificar que `collect` incrementa `crystals` (+1 normal, +2 si `crystalDoubleActive`) y elimina el cristal de la casilla.
    - _Requisitos: 5.1, 5.2_

  - [x]* 6.19 Escribir property test — Invocación de Minion (Propiedad 11)
    - **Propiedad 11: Invocación de Minion reduce maná y crea unidad con atributos correctos**
    - **Valida: Requisitos 6.1, 6.4, 6.6**
    - Verificar que `summon` crea un Minion con `hp: 3`, `armor: 0`, `owner` correcto y resta exactamente 2 de maná.
    - _Requisitos: 6.1, 6.4, 6.6_

  - [x]* 6.20 Escribir property test — Daño de ataque con armadura (Propiedad 12)
    - **Propiedad 12: Daño de ataque respeta la fórmula con armadura**
    - **Valida: Requisito 8.1**
    - Para cualquier unidad enemiga adyacente con armadura `a ≥ 0`, `attack` aplica exactamente `max(2 − a, 1)` daño y resta 1 maná.
    - _Requisitos: 8.1_

  - [x]* 6.21 Escribir property test — Victoria al destruir Núcleo (Propiedad 13)
    - **Propiedad 13: Victoria inmediata cuando el HP del Núcleo llega a 0**
    - **Valida: Requisitos 8.2, 13.1**
    - Para cualquier acción que deje HP del Núcleo ≤ 0, el estado resultante debe tener `status: "finished"` y `winner` correcto.
    - _Requisitos: 8.2, 13.1_

  - [x]* 6.22 Escribir property test — Victoria/empate al turno 30 (Propiedad 14)
    - **Propiedad 14: Victoria o empate por cristales al llegar al turno 30**
    - **Valida: Requisito 13.2**
    - Verificar que al llegar al turno 30 con ambos Núcleos en pie, el resultado es `"P1"`, `"P2"` o `"draw"` según cristales.
    - _Requisitos: 13.2_

  - [x]* 6.23 Escribir property test — Minion reduce distancia Manhattan (Propiedad 15)
    - **Propiedad 15: Minion reduce distancia Manhattan al Núcleo enemigo en cada turno**
    - **Valida: Requisito 10.1**
    - Para cualquier Minion no bloqueado, la distancia Manhattan al Núcleo enemigo después del turno es exactamente 1 menor que antes.
    - _Requisitos: 10.1_

- [x] 7. Checkpoint — Verificar lógica de juego completa
  - Ejecutar `npm run test --prefix server`. Verificar que todos los tests unitarios y de propiedades pasan. Probar manualmente el motor con llamadas directas a las funciones. Preguntar al usuario si hay dudas antes de continuar.

- [x] 8. Rutas Express y servidor (`routes/games.ts` + `index.ts`)
  - Exponer los 4 endpoints REST que conectan las funciones del motor con el mundo exterior.
  - _Requisitos: 1.6, 1.7, 2.1, 2.2, 2.4, 3.1, 3.2, 3.7, 3.8, 14.1, 14.3, 14.4, 19.1, 19.2, 19.3_

  - [x] 8.1 Implementar `POST /api/games` — crear partida
    - En `server/src/routes/games.ts`: parsear `{ player1, player2 }`, validar que ambos campos existen y no son vacíos/solo espacios. Si no, responder 400 con `{ ok: false, error: "Nombres de jugadores requeridos" }`. Si válidos, llamar `createInitialState`, guardar en `Map<string, GameState>`, responder 201 con `{ ok: true, gameId, state }`.
    - _Requisitos: 1.1, 1.6, 1.7_

  - [x] 8.2 Implementar `GET /api/games/:id` — obtener estado
    - Buscar `id` en el `Map`. Si no existe, responder 404 con `{ ok: false, error: "Partida no encontrada" }`. Si existe, responder 200 con `{ ok: true, state }`.
    - _Requisitos: 2.1, 2.2, 2.4_

  - [x] 8.3 Implementar `POST /api/games/:id/actions` — ejecutar acción
    - Buscar la partida (404 si no existe). Parsear `{ playerId, action, target }` (400 si malformado). Llamar `validateAction`. Si inválida: responder 400/409 con `{ ok: false, error }` sin modificar el estado. Si válida: llamar `applyAction`, actualizar el `Map`, responder 200 con `{ ok: true, state }`.
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8_

  - [x] 8.4 Implementar `GET /api/games/:id/history` — obtener historial
    - Buscar la partida (404 si no existe). Responder 200 con `{ ok: true, history: state.history }` (ya está ordenado cronológicamente).
    - _Requisitos: 14.1, 14.3, 14.4_

  - [x] 8.5 Implementar `server/src/index.ts` — entrada del servidor
    - Configurar `express.json()`. Añadir CORS solo si `NODE_ENV !== "production"` (origen: `http://localhost:5173`). Montar el router en `/api`. En producción: `express.static("client/dist")` + fallback a `index.html` para rutas no-API. Escuchar en `process.env.PORT || 3001`.
    - _Requisitos: 19.1, 19.2, 19.3_

  - [x]* 8.6 Escribir tests unitarios para `routes/games.ts`
    - Cubrir: respuestas HTTP correctas por endpoint, IDs inexistentes (404), body malformado (400), partida terminada (409).
    - _Requisitos: 1.7, 2.2, 3.7, 3.8, 14.3_

  - [x]* 8.7 Escribir property test — Rechazo de nombres inválidos en creación (Propiedad 3)
    - **Propiedad 3: Rechazo de nombres inválidos en creación**
    - **Valida: Requisito 1.7**
    - Para cualquier combinación de nombres vacíos, con solo espacios o ausentes, el endpoint debe responder 400 con `ok: false` sin crear partida.
    - _Requisitos: 1.7_

  - [x]* 8.8 Escribir property test — Historial append-only con estructura correcta (Propiedad 7)
    - **Propiedad 7: Historial append-only con estructura correcta**
    - **Valida: Requisitos 3.6, 14.2**
    - Para cualquier secuencia de acciones válidas, `history` debe crecer monotónicamente y cada entrada debe tener `player`, `action`, `turnNumber` (1–30) y `timestamp` ISO 8601.
    - _Requisitos: 3.6, 14.2_

- [x] 9. Checkpoint — Verificar backend completo
  - Probar todos los endpoints con curl o Postman: crear partida, mover Mago, atacar, ver historial. Verificar que los errores devuelven los códigos HTTP correctos. Ejecutar todos los tests del servidor.

- [x] 10. Hook `useGame` y lógica de comunicación del frontend
  - Centralizar todo el estado del juego y las llamadas `fetch` en un único hook React.
  - _Requisitos: 15.2, 15.3, 18.1, 18.2, 18.3, 18.4_

  - [x] 10.1 Implementar `client/src/hooks/useGame.ts` — estado y operaciones
    - Crear el hook con estado: `gameId: string | null`, `state: GameState | null`, `error: string | null`, `loading: boolean`. Exponer `createGame`, `fetchState`, `sendAction`.
    - _Requisitos: 18.1, 18.2_

  - [x] 10.2 Implementar `createGame(player1, player2)` con `fetch` nativo
    - `POST /api/games` (ruta relativa). En éxito: guardar `gameId` y `state`. En error: extraer mensaje del JSON y asignarlo a `error`.
    - _Requisitos: 15.2, 18.1, 18.4_

  - [x] 10.3 Implementar `fetchState()` con `fetch` nativo
    - `GET /api/games/:id` (ruta relativa). Actualizar `state` en éxito. Mantener el último estado válido en error.
    - _Requisitos: 2.1, 18.2_

  - [x] 10.4 Implementar `sendAction(req)` con `fetch` nativo
    - `POST /api/games/:id/actions` (ruta relativa). Actualizar `state` en éxito. En error HTTP 4xx/5xx, preservar el último `state` válido y asignar el mensaje a `error`.
    - _Requisitos: 18.2, 18.3_

  - [x] 10.5 Manejo de errores: preservar estado válido ante 4xx/5xx
    - En todos los métodos, usar `try/catch` para errores de red. Nunca limpiar `state` en un error: sólo actualizar `error` con el mensaje descriptivo.
    - _Requisitos: 18.3_

- [x] 11. Componentes React
  - Implementar todos los componentes visuales del juego con accesibilidad, `data-testid` para E2E y estilos diferenciados por jugador.
  - _Requisitos: 15.1, 15.3, 15.4, 16.1, 16.2, 16.3, 16.4, 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 11.1 Crear `StartScreen.tsx` — pantalla de inicio con validación
    - Dos `<input>` para nombres de P1 y P2. Validación local: no vacíos, no solo espacios, máximo 30 caracteres. Mostrar mensajes de error inline bajo cada campo. Botón "Iniciar Partida" que llama `createGame` al pasar la validación.
    - Props: `onGameCreated: (gameId: string, initialState: GameState) => void`
    - _Requisitos: 15.1, 15.3, 15.4_

  - [x] 11.2 Crear `Board.tsx` — cuadrícula 10×10 CSS Grid
    - CSS Grid de 10 columnas y 10 filas que ocupe al menos el 80% del área visible. Renderizar 100 componentes `Cell` en orden `board[y][x]`. Añadir `data-testid="board"`.
    - Props: `state: GameState`
    - _Requisitos: 16.1_

  - [x] 11.3 Crear `Cell.tsx` — renderizado de casillas con iconos y colores
    - Renderizar el contenido de una casilla: obstáculo (gris), cristal (amarillo), mago P1 (azul), mago P2 (rojo), minion P1 (azul claro), minion P2 (rojo claro), núcleo P1/P2, proyectil, vacío. Añadir `data-testid` por tipo y jugador.
    - Props: `cell: Cell; units: Unit[]; projectiles: Projectile[]; x: number; y: number`
    - _Requisitos: 16.2_

  - [x] 11.4 Crear `Hud.tsx` — HUD permanente con estadísticas
    - Mostrar: HP del Núcleo de cada jugador, maná de cada jugador, cristales de cada jugador, `turnNumber`. No colapsable. Añadir `data-testid="hud-p1-hp"`, `data-testid="hud-p2-hp"`, `data-testid="hud-turn"`, etc.
    - Props: `state: GameState`
    - _Requisitos: 17.1_

  - [x] 11.5 Crear `ActionPanel.tsx` — panel de 6 botones con control de turno
    - Botones: Mover, Recolectar, Invocar, Hechizo, Atacar, Defender. Establecer atributo `disabled` en los botones del jugador inactivo según `state.turn`. Mostrar mensaje de error con `data-testid="error-message"` durante al menos 3 segundos usando `useEffect` + `setTimeout`.
    - Props: `state: GameState; activePlayer: PlayerId; onAction: (req: ActionRequest) => void; error: string | null`
    - _Requisitos: 17.2, 17.3, 17.4_

  - [x] 11.6 Crear `ResultScreen.tsx` — pantalla de resultado final
    - Mostrar ganador ("¡Ganó P1!", "¡Ganó P2!") o empate ("¡Empate!"). Botón "Jugar de nuevo" que llama `onRestart`. Añadir `data-testid="result-screen"` y `data-testid="winner-text"`.
    - Props: `winner: PlayerId | 'draw'; onRestart: () => void`
    - _Requisitos: 17.5_

  - [x] 11.7 Actualizar `App.tsx` — orquestar la navegación entre pantallas
    - Usar `useGame` para gestionar el ciclo de vida. Mostrar `StartScreen` cuando `gameId === null`. Mostrar `GameScreen` (Board + Hud + ActionPanel) cuando la partida está activa. Mostrar `ResultScreen` cuando `state.status === "finished"`.
    - _Requisitos: 15.2, 17.5_

  - [x] 11.8 Crear `styles.css` — estilos globales con animaciones CSS
    - CSS Grid a pantalla completa. Paleta por jugador: P1 azul (`#2563EB`), P2 rojo (`#DC2626`). Transiciones CSS de 100–400 ms para proyectiles y minions (`transition: transform 200ms ease`). Estilos visibles para estado de error y evento aleatorio.
    - _Requisitos: 16.3, 16.4_

  - [x]* 11.9 Escribir property test — Validación del formulario de inicio (Propiedad 16)
    - **Propiedad 16: Validación del formulario de inicio rechaza nombres inválidos**
    - **Valida: Requisito 15.3**
    - Para cualquier string de solo espacios o longitud 0, `StartScreen` no debe enviar la solicitud y debe mostrar un mensaje de error.
    - _Requisitos: 15.3_

  - [x]* 11.10 Escribir property test — Panel deshabilita botones del jugador inactivo (Propiedad 17)
    - **Propiedad 17: Panel de acciones deshabilita controles del jugador inactivo**
    - **Valida: Requisito 17.3**
    - Para cualquier estado con `turn === "P1"`, todos los botones de P2 deben tener `disabled`; y viceversa.
    - _Requisitos: 17.3_

- [x] 12. Integración y conexión frontend-backend
  - Conectar el frontend con el backend real, verificar el flujo completo y confirmar que las animaciones y mensajes de error son visibles.
  - _Requisitos: 16.3, 16.4, 18.1, 18.2, 18.3, 18.4_

  - [x] 12.1 Conectar `fetch` al backend real via proxy de Vite
    - Verificar que las rutas relativas `/api/*` en `useGame` se proxían correctamente a `http://localhost:3001` gracias a `vite.config.ts`. Comprobar que no hay errores CORS en consola.
    - _Requisitos: 18.4_

  - [x] 12.2 Probar flujo completo de juego manualmente desde el navegador
    - Abrir la app en `http://localhost:5173`. Ingresar nombres → crear partida → mover Mago (P1 y P2 alternados) → recolectar cristal → invocar Minion → lanzar Hechizo → atacar → defender → llegar a condición de victoria. Verificar que el estado se actualiza en la UI en cada paso.
    - _Requisitos: 4.1, 5.1, 6.1, 7.1, 8.1, 9.1_

  - [x] 12.3 Verificar animaciones CSS de proyectiles y Minions
    - Confirmar que los proyectiles y Minions muestran transiciones CSS visibles (100–400 ms) al moverse entre casillas.
    - _Requisitos: 16.3, 16.4_

  - [x] 12.4 Verificar mensajes de error del backend en el frontend
    - Provocar errores intencionalmente (maná insuficiente, turno incorrecto, etc.) y confirmar que el mensaje del backend se muestra en `ActionPanel` durante al menos 3 segundos sin limpiar el tablero.
    - _Requisitos: 17.4_

- [x] 13. Tests E2E con Playwright
  - Automatizar el flujo completo de juego con los 12 casos de prueba requeridos.
  - _Requisitos: 20.3, 20.5_

  - [x] 13.1 Instalar Playwright y configurar `playwright.config.ts`
    - Instalar: `npm install -D @playwright/test && npx playwright install`. Crear `playwright.config.ts` en la raíz con `baseURL: "http://localhost:5173"`, un proyecto `chromium` headless para CI y un proyecto `chromium-visual` con `headless: false` para local.
    - _Requisitos: 20.3, 20.5_

  - [x] 13.2 Escribir `tests/e2e/game.spec.ts` con los 12 casos de prueba
    - Implementar todos los casos:
      1. Pantalla de inicio visible al cargar la app.
      2. Validación: campo vacío muestra error, sin enviar fetch.
      3. Validación: solo espacios muestra error, sin enviar fetch.
      4. Validación: >30 caracteres muestra error, sin enviar fetch.
      5. Crear partida con nombres válidos → navegar al tablero (verificar `data-testid="board"`).
      6. Mover Mago de P1 hacia el norte → verificar nueva posición en HUD/tablero.
      7. Turno de P2 → mover Mago de P2, verificar alternancia.
      8. Recolectar cristal (posicionar Mago sobre cristal → `collect`).
      9. Invocar Minion (con maná ≥ 2 → `summon`).
      10. Lanzar Hechizo (con maná ≥ 3 → `spell`).
      11. Atacar unidad adyacente (`attack`).
      12. Acción Defender (`defend` → verificar armadura en HUD).
      13. Condición de victoria: Núcleo con 1 HP + ataque → `data-testid="result-screen"` visible.
      14. Pantalla de resultado muestra ganador → botón "Jugar de nuevo" regresa a `StartScreen`.
      15. Error backend: intentar acción con maná 0 → `data-testid="error-message"` visible ≥ 3 s.
    - _Requisitos: 20.3_

  - [x] 13.3 Ejecutar E2E en modo headless y verificar que pasan
    - Ejecutar `npx playwright test --project=chromium` desde la raíz. Todos los tests deben pasar con estado verde. Corregir selectores o flujos si algún test falla.
    - _Requisitos: 20.3_

- [x] 14. Checkpoint — Verificar E2E completo
  - Confirmar que todos los tests de Playwright pasan en modo headless. Pedir al usuario que resuelva dudas antes de configurar CI/CD.

- [ ] 15. GitHub Actions workflows (CI/CD)
  - Crear los 3 workflows requeridos para lint, E2E y despliegue automático.
  - _Requisitos: 20.1, 20.2, 20.3, 20.4_

  - [x] 15.1 Crear `.github/workflows/lint.yml`
    - Trigger: `push` y `pull_request` a `main`. Pasos: checkout, setup Node.js, `npm ci` en `client/` y `server/`, ejecutar `npm run lint` en ambos. Fallar si hay errores de lint (código de salida ≠ 0).
    - _Requisitos: 20.1, 20.2_

  - [x] 15.2 Crear `.github/workflows/e2e.yml`
    - Trigger: `push` y `pull_request` a `main`. Pasos: checkout, setup Node.js, `npm ci`, `npm run build`, iniciar servidor de producción (`node server/dist/index.js &`), esperar que esté listo (`wait-on http://localhost:3001`), ejecutar `npx playwright test --project=chromium`. Reportar resultados JUnit.
    - _Requisitos: 20.1, 20.3_

  - [x] 15.3 Crear `.github/workflows/deploy.yml`
    - Trigger: solo `push` a `main`. Pasos: ejecutar `lint.yml` → `e2e.yml` y, si ambos pasan con código 0, invocar el webhook de despliegue de Render via `curl` con el token almacenado en GitHub Secrets (`RENDER_DEPLOY_HOOK_URL`).
    - _Requisitos: 20.1, 20.4_

  - [x] 15.4 Verificar que los 3 workflows pasan en GitHub Actions
    - Hacer un push de prueba a `main`. Confirmar en la pestaña Actions que los 3 workflows se ejecutan y terminan en verde. Corregir errores de configuración YAML si los hay.
    - _State: 3 workflows en verde en GitHub Actions (lint ✓, e2e ✓ 15/15, deploy ✓ con `RENDER_DEPLOY_HOOK_URL`). App publicada en https://threeer-parcial-final-leonardo-carrillo.onrender.com (`/api/health` → 200)._
    - _Requisitos: 20.1_

- [ ] 16. Despliegue en Render
  - Publicar la aplicación con frontend y backend en el mismo dominio bajo un único servicio.
  - _Requisitos: 19.1, 19.2, 19.3_

  - [x] 16.1 Configurar Express para servir `client/dist` en producción
    - Verificar que `server/src/index.ts` tiene `express.static(path.join(__dirname, "../../client/dist"))` y el fallback `res.sendFile("index.html")` para rutas no-API cuando `NODE_ENV === "production"`.
    - _Requisitos: 19.1_

  - [x] 16.2 Crear `render.yaml` o configurar servicio manualmente en Render
    - Tipo: Web Service. Build command: `npm ci && npm run build`. Start command: `node server/dist/index.js`. Variable de entorno: `NODE_ENV=production`, `PORT` gestionado por Render. Añadir `RENDER_DEPLOY_HOOK_URL` como secreto en GitHub.
    - _Requisitos: 19.2_

  - [x] 16.3 Publicar y obtener URL pública de Render
    - Hacer el primer deploy manual desde el dashboard de Render. Verificar que el build y el start completan sin errores. Copiar la URL pública (ej. `https://duelo-de-cristales.onrender.com`).
    - _Requisitos: 19.2_

  - [x] 16.4 Probar partida completa contra la URL pública
    - Abrir la URL en el navegador. Jugar una partida completa (inicio → acciones → victoria) para confirmar que el frontend sirve desde Express y las rutas `/api/*` responden correctamente en producción.
    - _Requisitos: 19.1, 19.2, 19.3_

- [ ] 17. Documentación completa
  - Completar todos los archivos Markdown en `docs/` y el `README.md` raíz.
  - _Requisitos: 21.1, 21.2_

  - [x] 17.1 Completar `docs/introduction.md`
    - Nombre del proyecto, propósito, descripción de la experiencia de juego, tipo de jugadores objetivo y tecnologías usadas.
    - _Requisitos: 21.1_

  - [x] 17.2 Completar `docs/reglas.md`
    - Todas las reglas del juego: acciones válidas e inválidas con sus costes de maná, movimiento de Minions, proyectiles, eventos aleatorios, condiciones de victoria y empate, límite de 30 turnos.
    - _Requisitos: 21.1_

  - [x] 17.3 Completar `docs/api.md`
    - Documentar los 4 endpoints REST: método, URL, cuerpo de solicitud, cuerpo de respuesta exitosa, cuerpos de error, códigos HTTP. Incluir ejemplos JSON completos para cada caso.
    - _Requisitos: 21.1_

  - [x] 17.4 Completar `docs/decisiones.md`
    - Decisiones técnicas tomadas (Map en memoria vs DB, Vite proxy vs CORS, fast-check para PBT, Render single-service), justificación, riesgos identificados y cómo se mitigan.
    - _Requisitos: 21.1_

  - [x] 17.5 Completar `docs/investigacion.md`
    - Investigación sobre Playwright (configuración headless/visual, modos de reporte), Render (variables de entorno, puertos, webhooks), Docker (por qué se descartó o adoptó), puertos y variables de entorno del proyecto.
    - _Requisitos: 21.1_

  - [x] 17.6 Completar `docs/ia.md`  (omitido: el docente confirmó que no es necesario)
    - Registro cronológico del uso de IA en el proyecto: solicitudes hechas, respuestas incorporadas, verificación manual realizada, partes generadas automáticamente vs escritas a mano.
    - _Requisitos: 21.1_

  - [x] 17.7 Completar `README.md` raíz
    - Secciones: descripción breve, requisitos previos (Node.js, npm), comandos de instalación y ejecución local, arquitectura (diagrama Mermaid), referencia de endpoints JSON, variables de entorno, enlace al deploy en Render, enlace al video de demostración.
    - _Requisitos: 21.1, 21.2_

- [x] 18. Checkpoint — Verificar repositorio antes del deadline
  - Ejecutar `git status` para confirmar que no hay cambios sin confirmar. Revisar que `npm run lint`, `npm run build` y `npx playwright test` pasan. Verificar el deploy en Render está actualizado.

- [ ] 19. Ensayo de defensa y cierre
  - Preparar y ensayar la presentación, simular un cambio de defensa y confirmar que el repositorio está limpio antes del deadline.
  - _Requisitos: 21.2_

  - [~] 19.1 Grabar video de demostración (3–5 minutos)
    - Grabar pantalla con: partida completa en el navegador, pestaña Network de DevTools mostrando una solicitud JSON y su respuesta, ejecución de E2E en Chrome visual, GitHub Actions con los 3 workflows verdes, URL pública de Render.
    - _Requisitos: 21.2_

  - [~] 19.2 Simular cambio de defensa en `engine.ts`
    - Modificar el daño de `attack` de 2 a 3 en `engine.ts`. Hacer `git commit` y `git push` a `main`. Verificar que GitHub Actions ejecuta lint → E2E → deploy. Confirmar que la URL pública de Render se actualiza con el cambio.
    - _Requisitos: 20.4, 21.2_

  - [~] 19.3 Restaurar o mantener el cambio del daño según decisión final
    - Si se prefiere mantener daño=2 original, hacer `git revert` o nuevo commit. Si se prefiere daño=3, dejar como está y documentar la decisión en `docs/decisiones.md`.
    - _Requisitos: 21.2_

  - [~] 19.4 Ejecutar E2E visual en Chrome contra la URL pública
    - Ejecutar `npx playwright test --project=chromium-visual` apuntando a la URL pública de Render como ensayo final. Confirmar que todos los tests pasan contra el entorno de producción.
    - _Requisitos: 20.5_

  - [~] 19.5 Verificar commit final antes del deadline (15/09/2026 a las 16:00)
    - Ejecutar `git status` para confirmar que no hay `uncommitted changes`. Hacer un commit final con el mensaje "feat: proyecto completo - Duelo de Cristales" si hay cambios pendientes. Verificar en GitHub que el último commit aparece antes de las 16:00.
    - _Requisitos: 21.2_

---

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse si se necesita avanzar más rápido hacia el MVP.
- Cada tarea referencia los requisitos específicos para trazabilidad con `requirements.md`.
- Los checkpoints (Tareas 4, 7, 9, 14, 18) son puntos de pausa para validar el progreso antes de continuar.
- Las pruebas de propiedades usan [fast-check](https://github.com/dubzzz/fast-check) con mínimo 100 iteraciones por ejecución (`numRuns: 100`).
- El diseño usa TypeScript para cliente y servidor; no se requiere selección de lenguaje adicional.
- **Plan de 5 días:**
  - **Día 1 (10/09):** Tareas 1–2 (Setup + Tipos)
  - **Día 2 (11/09):** Tareas 3–8 (Backend completo: generator, validator, engine, routes)
  - **Día 3 (12/09):** Tareas 10–12 (Frontend completo e integración)
  - **Día 4 (13/09):** Tareas 13–16 (E2E, GitHub Actions y deploy)
  - **Día 5 (14/09):** Tareas 17–19 (Documentación y ensayo de defensa)
  - **Deadline:** 15/09/2026 a las 16:00 (Tarea 19.5)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "1.5", "1.6", "1.7", "1.8"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["3.1", "5.1", "10.1"] },
    { "id": 5, "tasks": ["3.2", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9"] },
    { "id": 6, "tasks": ["3.3", "3.4", "3.5", "3.6"] },
    { "id": 7, "tasks": ["3.7", "3.8", "3.9", "5.10", "5.11", "5.12"] },
    { "id": 8, "tasks": ["6.1"] },
    { "id": 9, "tasks": ["6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10"] },
    { "id": 10, "tasks": ["6.11", "6.12"] },
    { "id": 11, "tasks": ["6.13"] },
    { "id": 12, "tasks": ["6.14"] },
    { "id": 13, "tasks": ["6.15", "6.16", "6.17", "6.18", "6.19", "6.20", "6.21", "6.22", "6.23"] },
    { "id": 14, "tasks": ["8.1", "10.2", "10.3", "10.4", "10.5"] },
    { "id": 15, "tasks": ["8.2", "8.3", "8.4", "8.5"] },
    { "id": 16, "tasks": ["8.6", "8.7", "8.8", "11.1"] },
    { "id": 17, "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6"] },
    { "id": 18, "tasks": ["11.7", "11.8"] },
    { "id": 19, "tasks": ["11.9", "11.10", "12.1"] },
    { "id": 20, "tasks": ["12.2", "12.3", "12.4"] },
    { "id": 21, "tasks": ["13.1"] },
    { "id": 22, "tasks": ["13.2"] },
    { "id": 23, "tasks": ["13.3"] },
    { "id": 24, "tasks": ["15.1", "15.2"] },
    { "id": 25, "tasks": ["15.3", "16.1"] },
    { "id": 26, "tasks": ["15.4", "16.2"] },
    { "id": 27, "tasks": ["16.3"] },
    { "id": 28, "tasks": ["16.4"] },
    { "id": 29, "tasks": ["17.1", "17.2", "17.3", "17.4", "17.5", "17.6"] },
    { "id": 30, "tasks": ["17.7"] },
    { "id": 31, "tasks": ["19.1", "19.2"] },
    { "id": 32, "tasks": ["19.3", "19.4"] },
    { "id": 33, "tasks": ["19.5"] }
  ]
}
```
