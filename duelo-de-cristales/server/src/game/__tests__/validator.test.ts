// Unit tests for validateAction (validator.ts)
// Requisitos: 3.3, 3.4, 3.5, 4.2, 4.3

import { validateAction } from "../validator";
import type { GameState, Unit, Cell } from "../types";

// ---------------------------------------------------------------------------
// Helper: build a minimal but valid GameState for testing
// ---------------------------------------------------------------------------
function makeState(overrides: Partial<GameState> = {}): GameState {
  // 10×10 empty board
  const board: Cell[][] = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, (): Cell => ({ type: "empty" }))
  );

  const baseState: GameState = {
    id: "test-game",
    status: "playing",
    turn: "P1",
    turnNumber: 1,
    board,
    players: {
      P1: { id: "P1", name: "Alice", mana: 3, crystals: 0, armor: 0, position: { x: 0, y: 1 } },
      P2: { id: "P2", name: "Bob",   mana: 3, crystals: 0, armor: 0, position: { x: 9, y: 8 } },
    },
    units: [
      { id: "p1-core",  type: "core",  owner: "P1", position: { x: 0, y: 0 }, hp: 10, armor: 0 },
      { id: "p2-core",  type: "core",  owner: "P2", position: { x: 9, y: 9 }, hp: 10, armor: 0 },
      { id: "p1-mage",  type: "mage",  owner: "P1", position: { x: 0, y: 1 }, hp: 10, armor: 0 },
      { id: "p2-mage",  type: "mage",  owner: "P2", position: { x: 9, y: 8 }, hp: 10, armor: 0 },
    ],
    projectiles: [],
    events: [],
    history: [],
    winner: null,
    crystalDoubleActive: false,
    ...overrides,
  };

  return baseState;
}

/** Clone a state and apply a shallow patch. */
function patchState(base: GameState, patch: Partial<GameState>): GameState {
  return { ...base, ...patch };
}

/** Clone the units array and replace one unit by id with a patched version. */
function patchUnit(units: Unit[], id: string, patch: Partial<Unit>): Unit[] {
  return units.map((u) => (u.id === id ? { ...u, ...patch } : u));
}

// ---------------------------------------------------------------------------
// 1. Partida terminada — Req 3.4, 13.4
// ---------------------------------------------------------------------------
describe("validateAction — partida terminada", () => {
  it("returns invalid when status is 'finished'", () => {
    const state = makeState({ status: "finished" });
    const result = validateAction(state, { playerId: "P1", action: "move", target: "south" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("La partida ha terminado");
  });

  it("blocks every action type when the game is finished", () => {
    const state = makeState({ status: "finished" });
    const actions = ["move", "collect", "defend", "attack", "summon", "spell"] as const;
    for (const action of actions) {
      const result = validateAction(state, { playerId: "P1", action });
      expect(result.valid).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Turno incorrecto — Req 3.3, 4.4, 5.4, 6.5
// ---------------------------------------------------------------------------
describe("validateAction — turno incorrecto", () => {
  it("rejects an action from P2 when it is P1's turn", () => {
    const state = makeState({ turn: "P1" });
    const result = validateAction(state, { playerId: "P2", action: "defend" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("No es tu turno");
  });

  it("rejects an action from P1 when it is P2's turn", () => {
    const state = makeState({ turn: "P2" });
    const result = validateAction(state, { playerId: "P1", action: "defend" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("No es tu turno");
  });

  it("accepts an action from the active player", () => {
    const state = makeState({ turn: "P1" });
    const result = validateAction(state, { playerId: "P1", action: "defend" });
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Maná insuficiente — Req 3.5, 6.2, 7.5, 8.4
// ---------------------------------------------------------------------------
describe("validateAction — maná insuficiente", () => {
  it("rejects 'attack' (cost 1) when P1 has 0 mana", () => {
    const state = makeState();
    state.players.P1.mana = 0;
    const result = validateAction(state, { playerId: "P1", action: "attack" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Maná insuficiente");
  });

  it("rejects 'summon' (cost 2) when P1 has 1 mana", () => {
    const state = makeState();
    state.players.P1.mana = 1;
    const result = validateAction(state, { playerId: "P1", action: "summon" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Maná insuficiente");
  });

  it("rejects 'spell' (cost 3) when P1 has 2 mana", () => {
    const state = makeState();
    state.players.P1.mana = 2;
    const result = validateAction(state, { playerId: "P1", action: "spell", target: "south" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Maná insuficiente");
  });

  it("accepts 'attack' when P1 has exactly 1 mana", () => {
    // P1 mage is at (0,1); place an enemy unit at an adjacent cell (1,1) so
    // attack is spatially valid too. (The validator itself doesn't check
    // adjacency for attack, so no setup needed here.)
    const state = makeState();
    state.players.P1.mana = 1;
    const result = validateAction(state, { playerId: "P1", action: "attack" });
    expect(result.valid).toBe(true);
  });

  it("accepts 'spell' when P1 has exactly 3 mana", () => {
    const state = makeState();
    state.players.P1.mana = 3;
    const result = validateAction(state, { playerId: "P1", action: "spell", target: "south" });
    expect(result.valid).toBe(true);
  });

  it("free actions (move, collect, defend) are accepted with 0 mana", () => {
    // 'move' needs a valid direction + destination, 'collect' needs a crystal,
    // so test 'defend' which has no extra spatial requirements.
    const state = makeState();
    state.players.P1.mana = 0;
    const result = validateAction(state, { playerId: "P1", action: "defend" });
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Fuera del tablero — Req 4.3
// ---------------------------------------------------------------------------
describe("validateAction — fuera del tablero", () => {
  it("rejects 'move north' when P1 mage is at y=0 (top edge)", () => {
    // Move P1 mage to top-left corner
    const state = makeState();
    const units = patchUnit(state.units, "p1-mage", { position: { x: 1, y: 0 } });
    state.players.P1.position = { x: 1, y: 0 };
    const patched = patchState(state, { units });
    const result = validateAction(patched, { playerId: "P1", action: "move", target: "north" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Movimiento fuera del tablero");
  });

  it("rejects 'move south' when P1 mage is at y=9 (bottom edge)", () => {
    const state = makeState();
    const units = patchUnit(state.units, "p1-mage", { position: { x: 1, y: 9 } });
    state.players.P1.position = { x: 1, y: 9 };
    const patched = patchState(state, { units });
    const result = validateAction(patched, { playerId: "P1", action: "move", target: "south" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Movimiento fuera del tablero");
  });

  it("rejects 'move west' when P1 mage is at x=0 (left edge)", () => {
    const state = makeState(); // P1 mage is already at (0,1)
    const result = validateAction(state, { playerId: "P1", action: "move", target: "west" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Movimiento fuera del tablero");
  });

  it("rejects 'move east' when P1 mage is at x=9 (right edge)", () => {
    const state = makeState();
    const units = patchUnit(state.units, "p1-mage", { position: { x: 9, y: 1 } });
    state.players.P1.position = { x: 9, y: 1 };
    const patched = patchState(state, { units });
    // x=9 is the right edge; moving east would exceed the board
    const result = validateAction(patched, { playerId: "P1", action: "move", target: "east" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Movimiento fuera del tablero");
  });
});

// ---------------------------------------------------------------------------
// 5. Casilla bloqueada — Req 4.2
// ---------------------------------------------------------------------------
describe("validateAction — casilla bloqueada", () => {
  it("rejects 'move' into an obstacle cell", () => {
    const state = makeState();
    // P1 mage is at (0,1); place obstacle at (0,2) = south
    state.board[2][0] = { type: "obstacle" };
    const result = validateAction(state, { playerId: "P1", action: "move", target: "south" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Casilla bloqueada");
  });

  it("rejects 'move' into a temp_obstacle cell", () => {
    const state = makeState();
    state.board[2][0] = { type: "temp_obstacle", tempObstacleExpiry: 5 };
    const result = validateAction(state, { playerId: "P1", action: "move", target: "south" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Casilla bloqueada");
  });

  it("rejects 'move' into a cell occupied by the opponent's mage", () => {
    const state = makeState();
    // Move P2 mage to (0,2) = south of P1 mage at (0,1)
    const units = patchUnit(state.units, "p2-mage", { position: { x: 0, y: 2 } });
    state.players.P2.position = { x: 0, y: 2 };
    const patched = patchState(state, { units });
    const result = validateAction(patched, { playerId: "P1", action: "move", target: "south" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Casilla bloqueada");
  });

  it("allows 'move' into an empty cell", () => {
    const state = makeState();
    // (1,1) = east of P1 mage at (0,1), which is empty in default state
    const result = validateAction(state, { playerId: "P1", action: "move", target: "east" });
    expect(result.valid).toBe(true);
  });

  it("allows 'move' over a crystal cell (crystals don't block movement)", () => {
    const state = makeState();
    state.board[2][0] = { type: "crystal", crystalValue: 1 };
    const result = validateAction(state, { playerId: "P1", action: "move", target: "south" });
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Dirección inválida — Req 7.6
// ---------------------------------------------------------------------------
describe("validateAction — dirección inválida", () => {
  it("rejects 'move' with no target", () => {
    const state = makeState();
    const result = validateAction(state, { playerId: "P1", action: "move" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Dirección inválida");
  });

  it("rejects 'move' with an unrecognised direction string", () => {
    const state = makeState();
    const result = validateAction(state, {
      playerId: "P1",
      action: "move",
      target: "up" as never,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Dirección inválida");
  });

  it("rejects 'spell' with no target", () => {
    const state = makeState();
    const result = validateAction(state, { playerId: "P1", action: "spell" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Dirección inválida");
  });

  it("rejects 'spell' with an unrecognised direction", () => {
    const state = makeState();
    const result = validateAction(state, {
      playerId: "P1",
      action: "spell",
      target: "diagonal" as never,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Dirección inválida");
  });

  it("accepts 'move' with each of the 4 valid directions (when in-bounds and unblocked)", () => {
    // Place P1 mage in the centre so all 4 directions are within bounds
    const state = makeState();
    const units = patchUnit(state.units, "p1-mage", { position: { x: 5, y: 5 } });
    state.players.P1.position = { x: 5, y: 5 };
    const patched = patchState(state, { units });

    for (const dir of ["north", "south", "east", "west"] as const) {
      const result = validateAction(patched, { playerId: "P1", action: "move", target: dir });
      expect(result.valid).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Sin cristal en casilla del Mago para 'collect' — Req 5.3
// ---------------------------------------------------------------------------
describe("validateAction — sin cristal para collect", () => {
  it("rejects 'collect' when the mage's cell is empty", () => {
    const state = makeState(); // (0,1) starts as empty
    const result = validateAction(state, { playerId: "P1", action: "collect" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("No hay cristal en esta casilla");
  });

  it("rejects 'collect' when the mage's cell is an obstacle", () => {
    const state = makeState();
    state.board[1][0] = { type: "obstacle" };
    const result = validateAction(state, { playerId: "P1", action: "collect" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("No hay cristal en esta casilla");
  });

  it("accepts 'collect' when the mage stands on a crystal", () => {
    const state = makeState();
    // Put a crystal on P1 mage's cell (0,1)
    state.board[1][0] = { type: "crystal", crystalValue: 1 };
    const result = validateAction(state, { playerId: "P1", action: "collect" });
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Sin casillas adyacentes libres para 'summon' — Req 6.3, 6.6
// ---------------------------------------------------------------------------
describe("validateAction — sin casillas adyacentes para summon", () => {
  it("rejects 'summon' when all 4 adjacent cells are out of bounds or blocked", () => {
    const state = makeState();
    // P1 mage at (0,1): north=(0,0), east=(1,1), south=(0,2), west=out-of-bounds
    // Block north and south with obstacles, and east with a unit
    state.board[0][0] = { type: "obstacle" };  // north — also where p1-core is, patch unit
    state.board[2][0] = { type: "obstacle" };  // south
    state.board[1][1] = { type: "obstacle" };  // east

    // west is out of bounds (x=-1), so all 4 neighbours are blocked/OOB
    const result = validateAction(state, { playerId: "P1", action: "summon" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("No hay casillas libres para invocar");
  });

  it("rejects 'summon' when adjacent cells are occupied by units", () => {
    const state = makeState();
    // Place P1 mage in centre (5,5) and surround with units on all 4 sides
    const units: Unit[] = [
      ...patchUnit(state.units, "p1-mage", { position: { x: 5, y: 5 } }),
      { id: "blocker-n", type: "minion", owner: "P2", position: { x: 5, y: 4 }, hp: 3, armor: 0 },
      { id: "blocker-s", type: "minion", owner: "P2", position: { x: 5, y: 6 }, hp: 3, armor: 0 },
      { id: "blocker-e", type: "minion", owner: "P2", position: { x: 6, y: 5 }, hp: 3, armor: 0 },
      { id: "blocker-w", type: "minion", owner: "P2", position: { x: 4, y: 5 }, hp: 3, armor: 0 },
    ];
    state.players.P1.position = { x: 5, y: 5 };
    const patched = patchState(state, { units });
    const result = validateAction(patched, { playerId: "P1", action: "summon" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("No hay casillas libres para invocar");
  });

  it("accepts 'summon' when at least one adjacent cell is free", () => {
    const state = makeState();
    // P1 mage at (0,1): east=(1,1) is empty in default state
    const result = validateAction(state, { playerId: "P1", action: "summon" });
    expect(result.valid).toBe(true);
  });

  it("accepts 'summon' when an adjacent cell holds a crystal (crystals are not blockers)", () => {
    const state = makeState();
    // P1 mage at (0,1); put crystal east at (1,1)
    state.board[1][1] = { type: "crystal", crystalValue: 1 };
    const result = validateAction(state, { playerId: "P1", action: "summon" });
    expect(result.valid).toBe(true);
  });
});
