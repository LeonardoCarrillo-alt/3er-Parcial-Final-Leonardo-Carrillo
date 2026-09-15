// Duelo de Cristales — validacion de acciones

import type {
  GameState,
  ActionRequest,
  ValidationResult,
  Direction,
  Position,
} from "./types";


// tabla de costos de Maná
const MANA_COST: Record<string, number> = {
  move: 0,
  collect: 0,
  defend: 0,
  attack: 1,
  summon: 2,
  spell: 3,
};

// direccion iniciales
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

export function validateAction(
  state: GameState,
  req: ActionRequest
): ValidationResult {
  // Partida activa 
  if (state.status === "finished") {
    return { valid: false, error: "La partida ha terminado" };
  }

  // Turno correcto 
  if (req.playerId !== state.turn) {
    return { valid: false, error: "No es tu turno" };
  }

  // Maná suficiente 
  const cost = MANA_COST[req.action] ?? 0;
  const currentMana = state.players[req.playerId].mana;
  if (currentMana < cost) {
    return { valid: false, error: "Maná insuficiente" };
  }

  // localizar posicion de mago
  const mage = state.units.find(
    (u) => u.type === "mage" && u.owner === req.playerId
  );
  if (!mage) {
    return { valid: false, error: "Mago no encontrado" };
  }

  
  // validacion de acciones especificas
  
  if (req.action === "move") {
    // Dirección válida 
    if (!req.target || !VALID_DIRECTIONS.has(req.target)) {
      return { valid: false, error: "Dirección inválida" };
    }

    const dir = req.target;
    const dest = getNeighbour(mage.position, dir);

    // Límites del tablero
    if (!dest) {
      return { valid: false, error: "Movimiento fuera del tablero" };
    }

    //Casilla no bloqueada 
    const destCell = state.board[dest.y][dest.x];
    if (
      destCell.type === "obstacle" ||
      destCell.type === "temp_obstacle"
    ) {
      return { valid: false, error: "Casilla bloqueada" };
    }

    // verifica que un mago no este en una casilla de destino
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
    // Cristal en casilla del Mago 
    const mageCell = state.board[mage.position.y][mage.position.x];
    if (mageCell.type !== "crystal") {
      return { valid: false, error: "No hay cristal en esta casilla" };
    }
  }

  if (req.action === "summon") {
    // Casilla adyacente libre - prioridad N > E > S > O
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
    // Dirección válida 
    if (!req.target || !VALID_DIRECTIONS.has(req.target)) {
      return { valid: false, error: "Dirección inválida" };
    }

  }

  return { valid: true };
}
