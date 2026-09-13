# Duelo de Cristales — Reglas del juego

## Objetivo

Ser el primer jugador en destruir el **Núcleo** (castillo) del oponente, o tener más **cristales** recolectados cuando se alcanza el turno 30.

## Tablero y unidades iniciales

- Tablero **10×10** (coordenadas x: 0–9 horizontal, y: 0–9 vertical).
- Cada partida se genera al azar: hay 4 cristales iniciales, obstáculos permanentes y 2 posiciones de evento ocultas.
- Unidades fijas con 10 de vida:

| Unidad | Jugador | Posición inicial |
|---|---|---|
| Núcleo P1 (castillo azul) | P1 | (0, 0) |
| Núcleo P2 (castillo rojo) | P2 | (9, 9) |
| Mago P1 (azul) | P1 | (0, 1) |
| Mago P2 (rojo) | P2 | (9, 8) |

- P1 empieza la partida (turno 1) y los turnos se alternan hasta el turno 30 inclusive.

## Maná (economía)

- Cada jugador comienza con **3 de maná**.
- El maná **no se regenera solo**: la única fuente es **recolectar cristales**, que otorga **+2 de maná**.
- Cada acción tiene un coste fijo en maná:

| Acción | Coste de maná |
|---|---|
| `move` (moverse) | 0 |
| `collect` (recolectar cristal) | 0 |
| `defend` (defenderse) | 0 |
| `attack` (atacar) | 1 |
| `summon` (invocar súbdito) | 2 |
| `spell` (lanzar hechizo) | 3 |

- Solo se puede realizar **la acción cuyo coste le alcance** al jugador activo. Si no hay maná suficiente, la acción se rechaza (400).

## Cristales

- El tablero inicia con **4 cristales**. Cada **4 turnos** aparece **1 cristal nuevo** en una celda libre (hasta un máximo de 10 cristales en el tablero).
- Valor de cada cristal: **1 punto**.
- Si hay cristales en la posición del mago, la acción `collect` los recoge: **+cristales (puntos)** y **+2 de maná**.
- Bajo el evento **cristal doble**, el siguiente cristal recolectado otorga el **doble de puntos** (2 en lugar de 1) y el evento se consume.

## Acciones válidas e inválidas

### `move` — moverse (0 maná)
- **Válido**: a una casilla adyacente (norte/sur/este/oeste) que esté dentro del tablero, vacía y sin unidad ocupándola.
- **Inválido**: casilla fuera del tablero, con obstáculo (permanente o temporal), con cristal, o ocupada por otra unidad.

### `collect` — recolectar (0 maná)
- **Válido**: solo si la casilla actual del mago tiene un cristal.
- **Inválido**: si no hay cristal en la posición (la API devuelve 400).

### `defend` — defenderse (0 maná)
- Otorga **armadura 2** al mago durante el turno en curso. La armadura se pierde al terminar el turno del jugador.
- La armadura reduce el daño del ataque cuerpo a cuerpo: `max(2 - armadura, 1)`. Los hechizos/proyectiles **ignoran la armadura** (siempre 3 de daño).

### `attack` — atacar (1 maná)
- **Válido**: si hay una unidad enemiga en alguna casilla adyacente al mago.
- **Inválido**: si no hay un enemigo adyacente (400).
- Daño: **2** (menos la armadura del objetivo, mínimo 1).

### `summon` — invocar súbdito (2 maná)
- **Válido**: si existe una casilla libre adyacente al mago para colocar al súbdito.
- **Inválido**: si todas las casillas adyacentes están ocupadas o fuera de límites (400).
- El súbdito tiene **3 de vida** y aparece en la casilla adyacente elegida.

### `spell` — lanzar hechizo (3 maná)
- Se lanza en una dirección (norte/sur/este/oeste).
- Si hay una unidad enemiga en la casilla adyacente en esa dirección: **impacto inmediato de 3 de daño** (sin proyectil).
- Si no: se crea un **proyectil** que viaja en esa dirección **(1 casilla por turno)** haciendo **3 de daño** al primer objetivo (unidad u obstáculo) que encuentre. Fuera del tablero desaparece.
- **Inválido**: dirección inválida o maná insuficiente.

## Movimiento de los Súbditos (Minions)

- Los súbditos se mueven **únicamente en el turno de su dueño**.
- Se desplazan **hacia el Núcleo enemigo** (recorrido manhattan), eligiendo la dirección que más los acerque.
- No pueden atravesar obstáculos ni casillas ocupadas por otras unidades.
- **No atacan al mago contrario**: ignoran a otras unidades en su camino (las evitan), aunque pueden **pisar el Núcleo enemigo**.
- Al llegar al Núcleo enemigo: le quitan **1 de vida** y el súbdito **desaparece**.

## Proyectiles

- Avanzan **1 casilla por turno** en su dirección.
- Al chocar con una unidad u obstáculo: **3 de daño** a la primera unidad alcanzada; si muere, se elimina la unidad.
- Al salir del tablero se eliminan.

## Eventos aleatorios (10% de probabilidad por turno)

Al inicio de cada turno, con 10% de probabilidad ocurre uno de tres eventos (equiprobables):

| Evento | Efecto |
|---|---|
| `storm` (tormenta) | Ambos jugadores pierden **1 de maná** (mínimo 0). |
| `crystal_double` (cristal doble) | El próximo cristal recolectado por el jugador activo otorga el **doble** de puntos. |
| `block` (bloqueo) | Se coloca un **obstáculo temporal** en una casilla libre al azar; expira en el siguiente turno. |

## Condiciones de victoria y empate

Evaluadas al final de cada turno, en orden:

1. **Mago destruido** → el dueño pierde; gana el oponente.
2. **Núcleo destruido** (0 de vida) → gana el dueño del Núcleo que sobrevivió. Si ambos Núcleos llegan a 0 en el mismo turno → **empate**.
3. **Turno 30 alcanzado** → gana el jugador con **más cristales**; si hay igualdad de cristales → **empate**.

- La partida queda en estado `finished` y rechaza nuevas acciones (HTTP 409).

## Límite de turnos

- El juego dura como máximo **30 turnos** (turnNumber 1–30). Al terminar el turno 30 se aplica la regla de desempate por cristales.