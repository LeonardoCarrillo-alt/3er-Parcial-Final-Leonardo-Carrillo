// Duelo de Cristales —  Game Types compartidos (Backend source of truth)


export type PlayerId = "P1" | "P2";

export type GameStatus = "playing" | "finished";

export type ActionType = "move" | "collect" | "defend" | "attack" | "summon" | "spell";

export type Direction = "north" | "south" | "east" | "west";

export type UnitType = "mage" | "minion" | "core";

export type EventType = "storm" | "crystal_double" | "block";

export type CellType = "empty" | "obstacle" | "crystal" | "temp_obstacle";

export interface Position {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  owner: PlayerId;
  position: Position;
  hp: number;
  armor: number;
}

export interface Projectile {
  id: string;
  owner: PlayerId;
  position: Position;
  direction: Direction;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  mana: number;
  crystals: number;
  armor: number;
  position: Position;
}

export interface Cell {
  type: CellType;
  crystalValue?: number;
  tempObstacleExpiry?: number;
}

export interface GameEvent {
  type: EventType;
  turnNumber: number;
  affectedEntities: string[];
}

/** turnos en rango de 1 - 30 */
export interface HistoryEntry {
  player: PlayerId;
  action: ActionType;
  turnNumber: number;
  timestamp: string;
}

/**estado de juego completo */
export interface GameState {
  id: string;
  status: GameStatus;
  turn: PlayerId;
  turnNumber: number;
  board: Cell[][];
  players: Record<PlayerId, PlayerState>;
  units: Unit[];
  projectiles: Projectile[];
  events: GameEvent[];
  history: HistoryEntry[];
  winner: PlayerId | "draw" | null;
  crystalDoubleActive: boolean;
}
 

export type ValidationResult = { valid: true } | { valid: false; error: string };


export interface CreateGameRequest {
  player1: string;
  player2: string;
}

export interface CreateGameResponse {
  ok: boolean;
  gameId?: string;
  state?: GameState;
  error?: string;
}

export interface ActionRequest {
  playerId: PlayerId;
  action: ActionType;
  target?: Direction;
}

export interface ActionResponse {
  ok: boolean;
  state?: GameState;
  error?: string;
}

export interface HistoryResponse {
  ok: boolean;
  history?: HistoryEntry[];
  error?: string;
}
