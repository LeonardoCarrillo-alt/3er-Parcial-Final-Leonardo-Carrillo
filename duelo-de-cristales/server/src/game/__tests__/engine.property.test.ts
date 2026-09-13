// Property-Based Tests for applyAction (engine.ts)
// Propiedades 4, 8, 10, 11, 12, 13, 14, 15
// Validates: Requirements 3.1–3.6, 4.1–4.4, 5.1–5.5, 6.1–6.14

import * as fc from "fast-check";
import { applyAction } from "../engine";
import type { GameState, Cell, Unit, PlayerId } from "../types";

// ---------------------------------------------------------------------------
// Suppress random events so properties are not flaky from storm / crystal_double.
// Math.random returning 0.5 means the 10% event threshold never fires.
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers: deterministic state builders
// ---------------------------------------------------------------------------

/** Build a plain 10×10 empty board. */
function emptyBoard(): Cell[][] {
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, (): Cell => ({ type: "empty" }))
  );
}

/**
 * Minimal valid GameState with mages at safe centre positions so that
 * move(north/south/east/west) always stays in-bounds.
 */
function baseState(
  turn: PlayerId,
  overrides: Partial<GameState> = {}
): GameState {
  const board = emptyBoard();

  const units: Unit[] = [
    { id: "p1-core", type: "core",  owner: "P1", position: { x: 0, y: 0 }, hp: 10, armor: 0 },
    { id: "p2-core", type: "core",  owner: "P2", position: { x: 9, y: 9 }, hp: 10, armor: 0 },
    { id: "p1-mage", type: "mage",  owner: "P1", position: { x: 5, y: 5 }, hp: 10, armor: 0 },
    { id: "p2-mage", type: "mage",  owner: "P2", position: { x: 3, y: 7 }, hp: 10, armor: 0 },
  ];

  const base: GameState = {
    id: "prop-test",
    status: "playing",
    turn,
    turnNumber: 1,
    board,
    players: {
      P1: { id: "P1", name: "Alice", mana: 10, crystals: 0, armor: 0, position: { x: 5, y: 5 } },
      P2: { id: "P2", name: "Bob",   mana: 10, crystals: 0, armor: 0, position: { x: 3, y: 7 } },
    },
    units,
    projectiles: [],
    events: [],
    history: [],
    winner: null,
    crystalDoubleActive: false,
  };

  return { ...base, ...overrides };
}

/** Replace all units with a patched version of one unit by id. */
function patchUnit(units: Unit[], id: string, patch: Partial<Unit>): Unit[] {
  return units.map((u) => (u.id === id ? { ...u, ...patch } : u));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const fcPlayerId = fc.constantFrom("P1" as const, "P2" as const);
const fcDirection = fc.constantFrom(
  "north" as const, "south" as const, "east" as const, "west" as const
);
const fcPlayerName = fc.string({ minLength: 1, maxLength: 30 });

/**
 * Generates a direction that is guaranteed to keep the mage at (5,5) inside
 * the 10×10 board.  All 4 directions from (5,5) are safe, so we allow all.
 */
const fcSafeDirection = fcDirection;

// ---------------------------------------------------------------------------
// Propiedad 4 — Turn alternation + turnNumber increment
// Validates: Requirements 3.3, 4.4
// ---------------------------------------------------------------------------
describe("Property 4: Alternancia de turno e incremento de turnNumber", () => {
  /**
   * **Validates: Requirements 3.3, 4.4**
   *
   * For any valid `move` action applied to an active game state:
   * - `turn` alternates (P1 → P2 or P2 → P1)
   * - `turnNumber` is exactly `previous + 1`
   */
  it("Propiedad 4 — el turno alterna y turnNumber aumenta en 1 tras cualquier movimiento válido", () => {
    fc.assert(
      fc.property(
        fcPlayerId,
        fcPlayerName,
        fcPlayerName,
        fc.integer({ min: 1, max: 29 }),
        fcSafeDirection,
        (turn, name1, name2, turnNumber, dir) => {
          // P2 mage is at (3,7); make sure north/west won't go OOB for P2 either
          // We only test P1 moving from (5,5) and P2 moving from (3,7).
          // All 4 directions stay in-bounds from both positions.

          const state = baseState(turn, {
            turnNumber,
            players: {
              P1: { id: "P1", name: name1, mana: 10, crystals: 0, armor: 0, position: { x: 5, y: 5 } },
              P2: { id: "P2", name: name2, mana: 10, crystals: 0, armor: 0, position: { x: 3, y: 7 } },
            },
          });

          const next = applyAction(state, { playerId: turn, action: "move", target: dir });

          const expectedNextTurn: PlayerId = turn === "P1" ? "P2" : "P1";

          expect(next.turn).toBe(expectedNextTurn);
          expect(next.turnNumber).toBe(turnNumber + 1);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 8 — move does not consume mana
// Validates: Requirements 4.1, 5.1
// ---------------------------------------------------------------------------
describe("Property 8: move no consume maná", () => {
  /**
   * **Validates: Requirements 4.1, 5.1**
   *
   * For any game state where the active player performs `move`, their mana
   * must remain unchanged.
   */
  it("Propiedad 8 — move nunca modifica el maná del jugador activo", () => {
    fc.assert(
      fc.property(
        fcPlayerId,
        fc.integer({ min: 0, max: 20 }),
        fcSafeDirection,
        (turn, mana, dir) => {
          const p1Mana = turn === "P1" ? mana : 10;
          const p2Mana = turn === "P2" ? mana : 10;

          const state = baseState(turn, {
            players: {
              P1: { id: "P1", name: "Alice", mana: p1Mana, crystals: 0, armor: 0, position: { x: 5, y: 5 } },
              P2: { id: "P2", name: "Bob",   mana: p2Mana, crystals: 0, armor: 0, position: { x: 3, y: 7 } },
            },
          });

          const next = applyAction(state, { playerId: turn, action: "move", target: dir });

          expect(next.players[turn].mana).toBe(mana);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 10 — collect increments crystals and clears cell
// Validates: Requirements 5.3, 5.5
// ---------------------------------------------------------------------------
describe("Property 10: collect incrementa cristales y limpia la celda", () => {
  /**
   * **Validates: Requirements 5.3, 5.5**
   *
   * For any game state where the active player's mage stands on a crystal:
   * - `crystals` increases by 1 (normal) or 2 (if crystalDoubleActive)
   * - The mage's cell becomes `type: "empty"` after collect
   */
  it("Propiedad 10 — collect suma cristales correctamente y vacía la celda", () => {
    fc.assert(
      fc.property(
        fcPlayerId,
        fc.boolean(),
        fc.integer({ min: 0, max: 30 }),
        (turn, crystalDoubleActive, existingCrystals) => {
          // Mage position depends on turn
          const magePos = turn === "P1" ? { x: 5, y: 5 } : { x: 3, y: 7 };

          const board = emptyBoard();
          board[magePos.y][magePos.x] = { type: "crystal", crystalValue: 1 };

          const state = baseState(turn, {
            board,
            crystalDoubleActive,
            players: {
              P1: {
                id: "P1", name: "Alice", mana: 10,
                crystals: turn === "P1" ? existingCrystals : 0,
                armor: 0, position: { x: 5, y: 5 },
              },
              P2: {
                id: "P2", name: "Bob", mana: 10,
                crystals: turn === "P2" ? existingCrystals : 0,
                armor: 0, position: { x: 3, y: 7 },
              },
            },
          });

          const next = applyAction(state, { playerId: turn, action: "collect" });

          const gain = crystalDoubleActive ? 2 : 1;
          expect(next.players[turn].crystals).toBe(existingCrystals + gain);
          expect(next.board[magePos.y][magePos.x].type).toBe("empty");
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 11 — summon creates Minion with correct attributes
// Validates: Requirements 6.3, 6.6, 7.5
// ---------------------------------------------------------------------------
describe("Property 11: summon crea un Minion con atributos correctos", () => {
  /**
   * **Validates: Requirements 6.3, 6.6, 7.5**
   *
   * For any state where the active player's mage has at least one free adjacent
   * cell, `summon` must add exactly one new unit with type: "minion", hp: 3,
   * armor: 0 and the correct owner. Active player's mana decreases by 2.
   */
  it("Propiedad 11 — summon añade un minion con hp:3, armor:0 y propietario correcto", () => {
    fc.assert(
      fc.property(
        fcPlayerId,
        fc.integer({ min: 2, max: 20 }),
        (turn, mana) => {
          // Mage at safe centre with free adjacent cells
          const state = baseState(turn, {
            players: {
              P1: { id: "P1", name: "Alice", mana: turn === "P1" ? mana : 10, crystals: 0, armor: 0, position: { x: 5, y: 5 } },
              P2: { id: "P2", name: "Bob",   mana: turn === "P2" ? mana : 10, crystals: 0, armor: 0, position: { x: 3, y: 7 } },
            },
          });

          const minionsBefore = state.units.filter(
            (u) => u.type === "minion" && u.owner === turn
          ).length;

          const next = applyAction(state, { playerId: turn, action: "summon" });

          const minionsAfter = next.units.filter(
            (u) => u.type === "minion" && u.owner === turn
          );

          expect(minionsAfter.length).toBe(minionsBefore + 1);

          const newMinion = minionsAfter[minionsAfter.length - 1];
          expect(newMinion.hp).toBe(3);
          expect(newMinion.armor).toBe(0);
          expect(newMinion.owner).toBe(turn);
          expect(next.players[turn].mana).toBe(mana - 2);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 12 — attack damage respects armor formula max(2 - armor, 1)
// Validates: Requirements 7.1, 7.2, 7.5
// ---------------------------------------------------------------------------
describe("Property 12: attack aplica max(2 - armor, 1) de daño y descuenta 1 maná", () => {
  /**
   * **Validates: Requirements 7.1, 7.2, 7.5**
   *
   * For any adjacent enemy unit with armor a ≥ 0:
   * - `attack` applies exactly max(2 − a, 1) damage
   * - Active player's mana decreases by 1
   */
  it("Propiedad 12 — daño de ataque sigue la fórmula max(2-armor, 1)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),  // enemy armor
        fc.integer({ min: 2, max: 20 }),  // enemy hp (must survive to verify formula)
        fc.integer({ min: 1, max: 20 }),  // active player mana
        (enemyArmor, enemyHp, mana) => {
          // Force enemy hp to be high enough that it survives the hit
          const safeHp = Math.max(enemyHp, 10);

          const enemy: Unit = {
            id: "p2-enemy-atk",
            type: "minion",
            owner: "P2",
            // Place directly east of P1 mage at (5,5)
            position: { x: 6, y: 5 },
            hp: safeHp,
            armor: enemyArmor,
          };

          const state = baseState("P1", {
            units: [...baseState("P1").units, enemy],
            players: {
              P1: { id: "P1", name: "Alice", mana, crystals: 0, armor: 0, position: { x: 5, y: 5 } },
              P2: { id: "P2", name: "Bob",   mana: 10, crystals: 0, armor: 0, position: { x: 3, y: 7 } },
            },
          });

          const next = applyAction(state, { playerId: "P1", action: "attack" });

          const expectedDamage = Math.max(2 - enemyArmor, 1);
          const damagedEnemy = next.units.find((u) => u.id === "p2-enemy-atk")!;

          expect(damagedEnemy.hp).toBe(safeHp - expectedDamage);
          expect(next.players.P1.mana).toBe(mana - 1);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 13 — immediate victory when Core HP reaches 0
// Validates: Requirements 9.1, 9.2
// ---------------------------------------------------------------------------
describe("Property 13: victoria inmediata cuando el Núcleo llega a 0 HP", () => {
  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * When a P1 minion reaches the P2 Core (hp=1) and deals its 1 damage,
   * the resulting state must have status: "finished" and winner: "P1".
   * Similarly for P2 destroying P1 Core.
   */
  it("Propiedad 13 — P1 gana cuando el Núcleo P2 llega a 0 HP", () => {
    fc.assert(
      fc.property(
        // P2 core starting HP from 1 to 3 (minion deals exactly 1 per step)
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 28 }),
        (p2CoreHp, turnNumber) => {
          // Place P1 minion at (8,9) — 1 step east to P2 core at (9,9)
          const minion: Unit = {
            id: "p1-minion-kill",
            type: "minion",
            owner: "P1",
            position: { x: 8, y: 9 },
            hp: 3,
            armor: 0,
          };

          const units = patchUnit(baseState("P1").units, "p2-core", { hp: p2CoreHp });
          const state = baseState("P1", {
            units: [...units, minion],
            turnNumber,
            players: {
              P1: { id: "P1", name: "Alice", mana: 10, crystals: 5, armor: 0, position: { x: 5, y: 5 } },
              P2: { id: "P2", name: "Bob",   mana: 10, crystals: 3, armor: 0, position: { x: 3, y: 7 } },
            },
          });

          const next = applyAction(state, { playerId: "P1", action: "move", target: "south" });

          if (p2CoreHp <= 1) {
            // Core destroyed this turn
            expect(next.status).toBe("finished");
            expect(next.winner).toBe("P1");
          } else {
            // Core still alive — game continues (unless turn 30)
            if (turnNumber < 30) {
              expect(next.status).toBe("playing");
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Propiedad 13 — P2 gana cuando el Núcleo P1 llega a 0 HP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (p1CoreHp) => {
          // P2 minion at (1,0) — 1 step west to P1 core at (0,0)
          const minion: Unit = {
            id: "p2-minion-kill",
            type: "minion",
            owner: "P2",
            position: { x: 1, y: 0 },
            hp: 3,
            armor: 0,
          };

          const units = patchUnit(baseState("P2").units, "p1-core", { hp: p1CoreHp });
          const state = baseState("P2", { units: [...units, minion] });

          const next = applyAction(state, { playerId: "P2", action: "move", target: "east" });

          if (p1CoreHp <= 1) {
            expect(next.status).toBe("finished");
            expect(next.winner).toBe("P2");
          } else {
            expect(next.status).toBe("playing");
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 14 — victory or draw at turn 30
// Validates: Requirements 9.3, 9.4
// ---------------------------------------------------------------------------
describe("Property 14: victoria o empate al llegar al turno 30", () => {
  /**
   * **Validates: Requirements 9.3, 9.4**
   *
   * With a state at turnNumber: 29 and both Cores alive, after applying one
   * final valid action the resulting turnNumber is 30, status is "finished",
   * and winner matches the crystal-count comparison.
   */
  it("Propiedad 14 — al llegar a turnNumber=30 la partida termina con el ganador correcto", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),   // P1 crystals
        fc.integer({ min: 0, max: 20 }),   // P2 crystals
        (p1Crystals, p2Crystals) => {
          const state = baseState("P1", {
            turnNumber: 30,
            players: {
              P1: { id: "P1", name: "Alice", mana: 10, crystals: p1Crystals, armor: 0, position: { x: 5, y: 5 } },
              P2: { id: "P2", name: "Bob",   mana: 10, crystals: p2Crystals, armor: 0, position: { x: 3, y: 7 } },
            },
          });

          const next = applyAction(state, { playerId: "P1", action: "move", target: "south" });

          expect(next.status).toBe("finished");

          if (p1Crystals > p2Crystals) {
            expect(next.winner).toBe("P1");
          } else if (p2Crystals > p1Crystals) {
            expect(next.winner).toBe("P2");
          } else {
            expect(next.winner).toBe("draw");
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 15 — Minion reduces Manhattan distance by exactly 1
// Validates: Requirements 6.7, 6.8
// ---------------------------------------------------------------------------
describe("Property 15: Minion reduce distancia Manhattan en exactamente 1", () => {
  /**
   * **Validates: Requirements 6.7, 6.8**
   *
   * For any Minion that is not blocked on all sides and is not already
   * adjacent to the enemy Core, after applyAction the Minion's Manhattan
   * distance to the enemy Core decreases by exactly 1.
   */
  it("Propiedad 15 — minion activo avanza exactamente 1 paso hacia el Núcleo enemigo cuando tiene camino libre", () => {
    fc.assert(
      fc.property(
        // Minion x in [2,7] — leave room for the mage and avoid cores
        fc.integer({ min: 2, max: 7 }),
        // Minion y in [2,7]
        fc.integer({ min: 2, max: 7 }),
        (mx, my) => {
          // P1 minion at (mx, my); P2 core at (9,9)
          // Distance = |mx-9| + |my-9|, which is at least 4 from (7,7) down
          // Ensure the minion is not adjacent to core (distance > 1)
          const dist = Math.abs(mx - 9) + Math.abs(my - 9);
          if (dist <= 1) return; // skip trivial positions near core

          const minion: Unit = {
            id: "p1-minion-prop",
            type: "minion",
            owner: "P1",
            position: { x: mx, y: my },
            hp: 3,
            armor: 0,
          };

          // Use a fully clear board — no obstacles blocking the minion
          const state = baseState("P1", {
            units: [...baseState("P1").units, minion],
          });

          // P1 mage does a neutral action
          const next = applyAction(state, { playerId: "P1", action: "move", target: "south" });

          const movedMinion = next.units.find((u) => u.id === "p1-minion-prop");
          // Minion should still exist (it didn't reach the core)
          expect(movedMinion).toBeDefined();

          const newDist =
            Math.abs(movedMinion!.position.x - 9) + Math.abs(movedMinion!.position.y - 9);
          expect(newDist).toBe(dist - 1);
        }
      ),
      { numRuns: 200 }
    );
  });
});
