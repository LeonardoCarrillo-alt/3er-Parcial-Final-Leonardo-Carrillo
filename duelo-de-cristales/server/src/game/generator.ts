// Duelo de Cristales — estado inicial

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

/** comparacion y orden de posiciones sin colisiones */
function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

//primeros espacios que ocupará los primeros items como ser los 4 cristales iniciales, y nuevas posiciones cada 4 turnos.
function fisherYatesSample<T>(arr: T[], count: number): T[] {
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function createInitialState(player1: string, player2: string): GameState {
  // creacion tablero 10x10
  const board: Cell[][] = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, (): Cell => ({ type: "empty" }))
  );

  //celdas libres (96 = 100 − 4 reserved) 
  const freeCells: Position[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (!RESERVED.has(posKey({ x, y }))) {
        freeCells.push({ x, y });
      }
    }
  }

  // colocar 8 obstacculos en posiciones aleatorias
  const obstaclePositions = fisherYatesSample(freeCells, 8);
  const usedKeys = new Set(obstaclePositions.map(posKey));
  for (const pos of obstaclePositions) {
    board[pos.y][pos.x] = { type: "obstacle" };
  }

  //quedan 88 celdas libres
  const remaining88 = freeCells.filter((p) => !usedKeys.has(posKey(p)));

  // colocar 4 cristales en posiciones aleatorias
  const crystalPositions = fisherYatesSample(remaining88, 4);
  const crystalKeys = new Set(crystalPositions.map(posKey));
  for (const pos of crystalPositions) {
    board[pos.y][pos.x] = { type: "crystal", crystalValue: 1 };
  }

  //quedan 84 celdas libres
  const remaining84 = remaining88.filter((p) => !crystalKeys.has(posKey(p)));

  // los eventos esta guardados solo en state.events — no estan plasmados en el tablero.
  const eventPositions = fisherYatesSample(remaining84, 2);

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
//eventos ocultos guardados
  const events: GameEvent[] = eventPositions.map((pos, i) => ({
    type: "block" as const,
    turnNumber: 0,
    affectedEntities: [`hidden-event-${i + 1}@${posKey(pos)}`],
  }));

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
