# Duelo de Cristales — API REST

- **Base URL local**: `http://localhost:3001/api`
- **Base URL producción**: `https://threeer-parcial-final-leonardo-carrillo.onrender.com/api`
- Formato: JSON, `Content-Type: application/json`.
- Errores: siempre responden `{ "ok": false, "error": "<mensaje>" }`.

> El campo `state` de las respuestas contiene el **estado autoritativo completo** del juego (ver [Estructura de `GameState`](#estructura-de-gamestate)).

---

## 1. `GET /api/health` — Verificar servicio

Verifica que el servidor está vivo.

**Respuesta exitosa** — `200 OK`

```json
{ "ok": true }
```

---

## 2. `POST /api/games` — Crear partida

Crea una partida nueva con los nombres de ambos jugadores.

**Cuerpo de solicitud**

```json
{ "player1": "Leo", "player2": "Rival" }
```

**Respuesta exitosa** — `201 Created`

```json
{
  "ok": true,
  "gameId": "08bc9504-2e88-4897-8f1a-9deaa2371fa5",
  "state": { }
}
```

El `state` es el del ejemplo del apartado [Estructura de `GameState`](#estructura-de-gamestate).

**Errores**

- `400 Bad Request` — `player1`/`player2` faltan o no son strings no vacíos:

```json
{ "ok": false, "error": "Faltan los nombres de los jugadores" }
```

- `500 Internal Server Error`:

```json
{ "ok": false, "error": "Error interno del servidor" }
```

---

## 3. `GET /api/games/:id` — Obtener estado

Devuelve el estado actual de una partida.

**Respuesta exitosa** — `200 OK`

```json
{ "ok": true, "state": { } }
```

**Errores**

- `404 Not Found` — la partida no existe:

```json
{ "ok": false, "error": "Partida no encontrada" }
```

- `500 Internal Server Error`.

---

## 4. `POST /api/games/:id/actions` — Realizar acción

Ejecuta una acción del jugador activo y devuelve el estado actualizado.

**Cuerpo de solicitud**

| Campo | Tipo | Descripción |
|---|---|---|
| `playerId` | `"P1" \| "P2"` | Jugador que intenta la acción. Debe ser quien lleva el turno. |
| `action` | `"move" \| "collect" \| "defend" \| "attack" \| "summon" \| "spell"` | Acción a ejecutar. |
| `target` | `"north" \| "south" \| "east" \| "west"` (opcional) | Dirección. Requerida por `move` y `spell`. |

Ejemplos:

```json
{ "playerId": "P1", "action": "move", "target": "east" }
```

```json
{ "playerId": "P1", "action": "collect" }
```

```json
{ "playerId": "P1", "action": "summon" }
```

```json
{ "playerId": "P1", "action": "attack" }
```

```json
{ "playerId": "P1", "action": "defend" }
```

```json
{ "playerId": "P1", "action": "spell", "target": "north" }
```

**Respuesta exitosa** — `200 OK`

```json
{ "ok": true, "state": { } }
```

**Errores**

- `400 Bad Request` — body malformado (falta `playerId`/`action`, `playerId` inválido o `action` desconocida):

```json
{ "ok": false, "error": "Solicitud inválida: falta playerId o action" }
```

- `404 Not Found` — partida inexistente:

```json
{ "ok": false, "error": "Partida no encontrada" }
```

- `400 Bad Request` — no es el turno del jugador que envía la acción:

```json
{ "ok": false, "error": "No es el turno de P2" }
```

- `409 Conflict` — la partida ya terminó:

```json
{ "ok": false, "error": "La partida ha terminado" }
```

- `400 Bad Request` — la acción no es válida en el estado actual (turno de quien no corresponde, destino bloqueado, movimiento fuera del tablero, atacar sin enemigo adyacente, recolectar sin cristal, invocar sin casilla libre, maná insuficiente o dirección inválida) — el mensaje describe el motivo:

```json
{ "ok": false, "error": "No hay un enemigo adyacente para atacar" }
```

- `500 Internal Server Error`.

---

## 5. `GET /api/games/:id/history` — Historial de acciones

Devuelve el historial cronológico de acciones de la partida.

**Respuesta exitosa** — `200 OK`

```json
{
  "ok": true,
  "history": [
    {
      "player": "P1",
      "action": "move",
      "turnNumber": 1,
      "timestamp": "2026-09-13T12:00:00.000Z"
    }
  ]
}
```

**Errores**

- `404 Not Found` — partida inexistente.
- `500 Internal Server Error`.

---

## Estructura de `GameState`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador de la partida. |
| `status` | `"playing" \| "finished"` | Estado de la partida. |
| `turn` | `"P1" \| "P2"` | Jugador con el turno actual. |
| `turnNumber` | number (1–30) | Turno actual. |
| `board` | `Cell[][]` (10×10) | Celdas: `empty`, `obstacle`, `crystal`, `temp_obstacle`. |
| `players` | `{ P1, P2 }` | `name`, `mana`, `crystals`, `armor`, `position`. |
| `units` | `Unit[]` | `mage`, `minion`, `core` con `hp`, `armor`, `position`. |
| `projectiles` | `Projectile[]` | Proyectiles activos con su `direction`. |
| `events` | `GameEvent[]` | `storm`, `crystal_double`, `block`. |
| `history` | `HistoryEntry[]` | Acciones jugadas. |
| `winner` | `"P1" \| "P2" \| "draw" \| null` | Ganador, empate o partida en curso. |
| `crystalDoubleActive` | boolean | Si el evento cristal doble está vigente. |

Ejemplo completo de creación de partida:

```json
{
  "ok": true,
  "gameId": "08bc9504-2e88-4897-8f1a-9deaa2371fa5",
  "state": {
    "id": "08bc9504-2e88-4897-8f1a-9deaa2371fa5",
    "status": "playing",
    "turn": "P1",
    "turnNumber": 1,
    "board": [
      [{"type":"empty"},{"type":"empty"},{"type":"empty"},{"type":"empty"},{"type":"empty"},{"type":"crystal","crystalValue":1},{"type":"empty"},{"type":"empty"},{"type":"empty"}],
      [{"type":"empty"}],
      [{"type":"empty"},{"type":"obstacle"}]
    ],
    "players": {
      "P1": { "id": "P1", "name": "Leo", "mana": 3, "crystals": 0, "armor": 0, "position": { "x": 0, "y": 1 } },
      "P2": { "id": "P2", "name": "Rival", "mana": 3, "crystals": 0, "armor": 0, "position": { "x": 9, "y": 8 } }
    },
    "units": [
      { "id": "p1-core", "type": "core", "owner": "P1", "position": { "x": 0, "y": 0 }, "hp": 10, "armor": 0 },
      { "id": "p2-core", "type": "core", "owner": "P2", "position": { "x": 9, "y": 9 }, "hp": 10, "armor": 0 },
      { "id": "p1-mage", "type": "mage", "owner": "P1", "position": { "x": 0, "y": 1 }, "hp": 10, "armor": 0 },
      { "id": "p2-mage", "type": "mage", "owner": "P2", "position": { "x": 9, "y": 8 }, "hp": 10, "armor": 0 }
    ],
    "projectiles": [],
    "events": [
      { "type": "block", "turnNumber": 0, "affectedEntities": ["hidden-event-1@1,4"] },
      { "type": "block", "turnNumber": 0, "affectedEntities": ["hidden-event-2@1,5"] }
    ],
    "history": [],
    "winner": null,
    "crystalDoubleActive": false
  }
}
```

> En producción el estado es el mismo servido contra la URL pública. El tablero real contiene las 100 celdas (10 filas × 10 columnas); aquí se muestra abreviado por legibilidad.