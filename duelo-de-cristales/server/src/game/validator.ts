// Duelo de Cristales — Action Validator

import type {
  GameState,
  ActionRequest,
  ValidationResult,
  Direction,
  Position,
} from "./types";

// ---------------------------------------------------------------------------
// Mana cost table (Req 3.5, 6.2, 7.5, 8.4)
// ---------------------------------------------------------------------------
const MANA_COST: Record<string, number> = {
  move: 0,
  collect: 0,
  defend: 0,
  attack: 1,
  summon: 2,
  spell: 3,
};

// ---------------------------------------------------------------------------
// Direction delta helpers
// ---------------------------------------------------------------------------
const DIRECTION_DELTA: Record<Direction, Position> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east:  { x: 1, y:  0 },
  west:  { x: -1, y: 0 },
};

const VALID_DIRECTIONS: ReadonlySet<string> = new Set([
  "north", "south", "east", "west",
]);

/** Returns the neighbour position in the given direction, or null if out of bounds. */
function getNeighbour(pos: Position, dir: Direction): Position | null {
  const delta = DIRECTION_DELTA[dir];
  const nx = pos.x + delta.x;
  const ny = pos.y + delta.y;
  if (nx < 0 || nx > 9 || ny < 0 || ny > 9) return null;
  return { x: nx, y: ny };
}

/** Returns true if (x,y) is occupied by any unit (by checking the units array). */
function isCellOccupiedByUnit(
  state: GameState,
  x: number,
  y: number
): boolean {
  return state.units.some((u) => u.position.x === x && u.position.y === y);
}

// ---------------------------------------------------------------------------
// validateAction — Task 5.1
// Runs each check in order: status → turn → mana → bounds → cell → resource
//                           → adjacency → direction
// Returns { valid: true } or { valid: false, error: string }
// ---------------------------------------------------------------------------
export function validateAction(
  state: GameState,
  req: ActionRequest
): ValidationResult {
  // 5.2 — Partida activa (Req 3.4, 13.4)
  if (state.status === "finished") {
    return { valid: false, error: "La partida ha terminado" };
  }

  // 5.3 — Turno correcto (Req 3.3, 4.4, 5.4, 6.5)
  if (req.playerId !== state.turn) {
    return { valid: false, error: "No es tu turno" };
  }

  // 5.4 — Maná suficiente (Req 3.5, 6.2, 7.5, 8.4)
  const cost = MANA_COST[req.action] ?? 0;
  const currentMana = state.players[req.playerId].mana;
  if (currentMana < cost) {
    return { valid: false, error: "Maná insuficiente" };
  }

  // Locate the active player's mage
  const mage = state.units.find(
    (u) => u.type === "mage" && u.owner === req.playerId
  );
  if (!mage) {
    // Should never happen in a valid game state, but guard anyway
    return { valid: false, error: "Mago no encontrado" };
  }

  // -------------------------------------------------------------------------
  // Action-specific validations
  // -------------------------------------------------------------------------

  if (req.action === "move") {
    // 5.9 — Dirección válida (Req 7.6)
    if (!req.target || !VALID_DIRECTIONS.has(req.target)) {
      return { valid: false, error: "Dirección inválida" };
    }

    const dir = req.target;
    const dest = getNeighbour(mage.position, dir);

    // 5.5 — Límites del tablero (Req 4.3)
    if (!dest) {
      return { valid: false, error: "Movimiento fuera del tablero" };
    }

    // 5.6 — Casilla no bloqueada (Req 4.2)
    const destCell = state.board[dest.y][dest.x];
    if (
      destCell.type === "obstacle" ||
      destCell.type === "temp_obstacle"
    ) {
      return { valid: false, error: "Casilla bloqueada" };
    }

    // Check if the opponent's mage occupies the destination
    const opponentId = req.playerId === "P1" ? "P2" : "P1";
    const opponentMage = state.units.find(
      (u) => u.type === "mage" && u.owner === opponentId
    );
    if (
      opponentMage &&
      opponentMage.position.x === dest.x &&
      opponentMage.position.y === dest.y
    ) {
      return { valid: false, error: "Casilla bloqueada" };
    }
  }

  if (req.action === "collect") {
    // 5.7 — Cristal en casilla del Mago (Req 5.3)
    const mageCell = state.board[mage.position.y][mage.position.x];
    if (mageCell.type !== "crystal") {
      return { valid: false, error: "No hay cristal en esta casilla" };
    }
  }

  if (req.action === "summon") {
    // 5.8 — Casilla adyacente libre (Req 6.3, 6.6) — priority N > E > S > O
    const adjDirections: Direction[] = ["north", "east", "south", "west"];
    const hasFreeCellAdj = adjDirections.some((dir) => {
      const nb = getNeighbour(mage.position, dir);
      if (!nb) return false;
      const cell = state.board[nb.y][nb.x];
      if (cell.type === "obstacle" || cell.type === "temp_obstacle") return false;
      if (isCellOccupiedByUnit(state, nb.x, nb.y)) return false;
      return true;
    });

    if (!hasFreeCellAdj) {
      return { valid: false, error: "No hay casillas libres para invocar" };
    }
  }

  if (req.action === "spell") {
    // 5.9 — Dirección válida (Req 7.6)
    if (!req.target || !VALID_DIRECTIONS.has(req.target)) {
      return { valid: false, error: "Dirección inválida" };
    }

    // 5.5 — The spell's direction itself doesn't strictly require the adjacent
    // cell to be in bounds for creation; the projectile can be born on a cell
    // outside bounds only if the mage is at the edge.  However, the design
    // states that if the adjacent cell is out of bounds the projectile exits
    // immediately — we do NOT block the spell in that case; the engine will
    // handle it.  So only check that the direction is valid (already done above).
  }

  // attack and defend have no further spatial constraints checked at validation time
  // (the engine handles "no adjacent enemy" for attack)

  return { valid: true };
}
