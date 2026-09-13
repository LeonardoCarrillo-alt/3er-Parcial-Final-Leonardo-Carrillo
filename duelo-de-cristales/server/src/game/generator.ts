// Duelo de Cristales — Initial State Generator

import { randomUUID } from "crypto";
import type {
  GameState,
  PlayerId,
  PlayerState,
  Unit,
  Cell,
  GameEvent,
  Position,
} from "./types";

// ---------------------------------------------------------------------------
// Reserved unit positions (deterministic, never overwritten by random placement)
// ---------------------------------------------------------------------------
const CORE_P1: Position = { x: 0, y: 0 };
const CORE_P2: Position = { x: 9, y: 9 };
const MAGE_P1: Position = { x: 0, y: 1 };
const MAGE_P2: Position = { x: 9, y: 8 };

const RESERVED: ReadonlySet<string> = new Set([
  posKey(CORE_P1),
  posKey(CORE_P2),
  posKey(MAGE_P1),
  posKey(MAGE_P2),
]);

/** Stable string key for a (x,y) position used for collision checks. */
function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

// ---------------------------------------------------------------------------
// Fisher-Yates partial shuffle
// Selects `count` items from `arr` (in-place, returns first `count` elements).
// ---------------------------------------------------------------------------
function fisherYatesSample<T>(arr: T[], count: number): T[] {
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

// ---------------------------------------------------------------------------
// createInitialState — Task 3.1
// ---------------------------------------------------------------------------
export function createInitialState(player1: string, player2: string): GameState {
  // --- Build empty 10×10 board (Task 3.1) ---------------------------------
  const board: Cell[][] = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, (): Cell => ({ type: "empty" }))
  );

  // --- Pool of free cells (96 = 100 − 4 reserved) (Tasks 3.3–3.5) --------
  const freeCells: Position[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (!RESERVED.has(posKey({ x, y }))) {
        freeCells.push({ x, y });
      }
    }
  }
  // freeCells.length === 96 at this point

  // --- Task 3.3: Place 8 obstacles via Fisher-Yates partial shuffle -------
  const obstaclePositions = fisherYatesSample(freeCells, 8);
  const usedKeys = new Set(obstaclePositions.map(posKey));
  for (const pos of obstaclePositions) {
    board[pos.y][pos.x] = { type: "obstacle" };
  }

  // Remaining 88 free cells
  const remaining88 = freeCells.filter((p) => !usedKeys.has(posKey(p)));

  // --- Task 3.4: Place 4 crystals via Fisher-Yates -----------------------
  const crystalPositions = fisherYatesSample(remaining88, 4);
  const crystalKeys = new Set(crystalPositions.map(posKey));
  for (const pos of crystalPositions) {
    board[pos.y][pos.x] = { type: "crystal", crystalValue: 1 };
  }

  // Remaining 84 free cells
  const remaining84 = remaining88.filter((p) => !crystalKeys.has(posKey(p)));

  // --- Task 3.5: Select 2 hidden event positions via Fisher-Yates --------
  // Events are stored in state.events only — not placed on the board.
  const eventPositions = fisherYatesSample(remaining84, 2);

  // --- Task 3.2: Create the 4 fixed units ---------------------------------
  const units: Unit[] = [
    {
      id: "p1-core",
      type: "core",
      owner: "P1",
      position: { ...CORE_P1 },
      hp: 10,
      armor: 0,
    },
    {
      id: "p2-core",
      type: "core",
      owner: "P2",
      position: { ...CORE_P2 },
      hp: 10,
      armor: 0,
    },
    {
      id: "p1-mage",
      type: "mage",
      owner: "P1",
      position: { ...MAGE_P1 },
      hp: 10,
      armor: 0,
    },
    {
      id: "p2-mage",
      type: "mage",
      owner: "P2",
      position: { ...MAGE_P2 },
      hp: 10,
      armor: 0,
    },
  ];

  // --- Task 3.6: Build PlayerState records --------------------------------
  const players: Record<PlayerId, PlayerState> = {
    P1: {
      id: "P1",
      name: player1,
      mana: 3,
      crystals: 0,
      armor: 0,
      position: { ...MAGE_P1 },
    },
    P2: {
      id: "P2",
      name: player2,
      mana: 3,
      crystals: 0,
      armor: 0,
      position: { ...MAGE_P2 },
    },
  };

  // --- Task 3.5: Hidden events stored in state.events only ---------------
  const events: GameEvent[] = eventPositions.map((pos, i) => ({
    // Use an unused EventType as a placeholder.  "block" is the closest built-in
    // concept for a hidden positional event; the engine will activate these
    // based on game logic, not the board cell.
    type: "block" as const,
    turnNumber: 0,          // 0 = not yet triggered
    affectedEntities: [`hidden-event-${i + 1}@${posKey(pos)}`],
  }));

  // --- Assemble GameState (Task 3.1) --------------------------------------
  const state: GameState = {
    id: randomUUID(),
    status: "playing",
    turn: "P1",
    turnNumber: 1,
    board,
    players,
    units,
    projectiles: [],
    events,
    history: [],
    winner: null,
    crystalDoubleActive: false,
  };

  return state;
}
