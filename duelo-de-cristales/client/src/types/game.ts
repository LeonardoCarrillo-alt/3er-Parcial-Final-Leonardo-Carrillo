// ============================================================
// Duelo de Cristales — Shared Game Types (Frontend mirror)
// Kept in sync with server/src/game/types.ts
// ============================================================

// ── Primitive unions ─────────────────────────────────────────

export type PlayerId = "P1" | "P2";

export type GameStatus = "playing" | "finished";

export type ActionType = "move" | "collect" | "defend" | "attack" | "summon" | "spell";

export type Direction = "north" | "south" | "east" | "west";

export type UnitType = "mage" | "minion" | "core";

export type EventType = "storm" | "crystal_double" | "block";

export type CellType = "empty" | "obstacle" | "crystal" | "temp_obstacle";

// ── Structural interfaces ─────────────────────────────────────

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

/** Efecto visual transitorio de hechizo (solo cliente) */
export interface SpellEffect {
  id: number;
  x: number;
  y: number;
}

export interface GameEvent {
  type: EventType;
  turnNumber: number;
  affectedEntities: string[];
}

/** Req 3.6, 14.2 — turnNumber in range 1–30, timestamp ISO 8601 */
export interface HistoryEntry {
  player: PlayerId;
  action: ActionType;
  turnNumber: number;
  timestamp: string;
}

/** Req 1.6, 2.3 — complete authoritative game state */
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

// ── Validation ────────────────────────────────────────────────

export type ValidationResult = { valid: true } | { valid: false; error: string };

// ── API request / response shapes ─────────────────────────────

/** Req 1.7 */
export interface CreateGameRequest {
  player1: string;
  player2: string;
}

/** Req 1.6 */
export interface CreateGameResponse {
  ok: boolean;
  gameId?: string;
  state?: GameState;
  error?: string;
}

/** Req 3.7 */
export interface ActionRequest {
  playerId: PlayerId;
  action: ActionType;
  target?: Direction;
}

/** Req 3.2 */
export interface ActionResponse {
  ok: boolean;
  state?: GameState;
  error?: string;
}

/** Req 14.1 */
export interface HistoryResponse {
  ok: boolean;
  history?: HistoryEntry[];
  error?: string;
}
