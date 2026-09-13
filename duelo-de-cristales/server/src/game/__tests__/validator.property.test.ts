// Property-Based Tests for validateAction — Propiedad 5
// Validates: Requirements 3.3, 4.4, 5.4, 6.5
//
// **Validates: Requirements 3.3, 4.4, 5.4, 6.5**
//
// Propiedad 5: Acción de jugador inactivo siempre rechazada
// Para cualquier estado activo y cualquier playerId diferente a state.turn,
// validateAction debe retornar { valid: false } sin modificar el estado.

import * as fc from "fast-check";
import { validateAction } from "../validator";
import type { GameState, Cell, Unit } from "../types";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a valid PlayerId ("P1" | "P2"). */
const fcPlayerId = fc.constantFrom("P1" as const, "P2" as const);

/** Generates a valid ActionType. */
const fcActionType = fc.constantFrom(
  "move" as const,
  "collect" as const,
  "defend" as const,
  "attack" as const,
  "summon" as const,
  "spell" as const
);

/** Generates an optional Direction (including undefined to represent no target). */
const fcOptionalDirection = fc.option(
  fc.constantFrom("north" as const, "south" as const, "east" as const, "west" as const),
  { nil: undefined }
);

// ---------------------------------------------------------------------------
// State builder helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal but valid active GameState for any combination of turn
 * and mana values. The mage positions are safe (well within the board) and
 * the board is empty so no spatial validations interfere with the turn check.
 *
 * Using mana: 10 guarantees that mana-related rejections cannot fire before
 * the turn check, keeping the property focused on the turn guard.
 */
function buildActiveState(
  turn: "P1" | "P2",
  p1Mana: number,
  p2Mana: number
): GameState {
  const board: Cell[][] = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, (): Cell => ({ type: "empty" }))
  );

  // Place P1 mage at (5,5), P2 mage at (3,3) — both far from edges,
  // surrounded by empty cells so no spatial guard fires first.
  const units: Unit[] = [
    { id: "p1-core", type: "core",  owner: "P1", position: { x: 0, y: 0 }, hp: 10, armor: 0 },
    { id: "p2-core", type: "core",  owner: "P2", position: { x: 9, y: 9 }, hp: 10, armor: 0 },
    { id: "p1-mage", type: "mage",  owner: "P1", position: { x: 5, y: 5 }, hp: 10, armor: 0 },
    { id: "p2-mage", type: "mage",  owner: "P2", position: { x: 3, y: 3 }, hp: 10, armor: 0 },
  ];

  return {
    id: "prop-test-game",
    status: "playing",
    turn,
    turnNumber: 1,
    board,
    players: {
      P1: { id: "P1", name: "Alice", mana: p1Mana, crystals: 0, armor: 0, position: { x: 5, y: 5 } },
      P2: { id: "P2", name: "Bob",   mana: p2Mana, crystals: 0, armor: 0, position: { x: 3, y: 3 } },
    },
    units,
    projectiles: [],
    events: [],
    history: [],
    winner: null,
    crystalDoubleActive: false,
  };
}

// ---------------------------------------------------------------------------
// Propiedad 5: Acción de jugador inactivo siempre rechazada
// Validates: Requirements 3.3, 4.4, 5.4, 6.5
// ---------------------------------------------------------------------------
describe("Property 5: Acción de jugador inactivo siempre rechazada", () => {
  /**
   * **Validates: Requirements 3.3, 4.4, 5.4, 6.5**
   *
   * For any active game state (status: "playing") and any action submitted by
   * the player who is NOT state.turn, validateAction must return { valid: false }.
   * The inactive player is guaranteed to be the one NOT currently taking a turn.
   */
  it("Propiedad 5 — cualquier acción del jugador inactivo es rechazada", () => {
    fc.assert(
      fc.property(
        // Which player currently holds the turn
        fcPlayerId,
        // Action type the inactive player tries to submit
        fcActionType,
        // Optional direction target
        fcOptionalDirection,
        // Mana for each player (generous: 10 each, so mana checks can't fire first)
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (turn, action, target, p1Mana, p2Mana) => {
          // The inactive player is always the one NOT holding the turn
          const inactivePlayer = turn === "P1" ? "P2" : "P1";

          const state = buildActiveState(turn, p1Mana, p2Mana);

          // Capture a deep copy of the state to verify immutability afterward
          const stateSnapshot = JSON.stringify(state);

          const result = validateAction(state, {
            playerId: inactivePlayer,
            action,
            target,
          });

          // The result MUST be invalid
          if (result.valid !== false) return false;

          // The state MUST NOT have been mutated
          if (JSON.stringify(state) !== stateSnapshot) return false;

          return true;
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Complementary check: the ACTIVE player's actions are NOT rejected by the
   * turn guard alone (other guards may still fire, but the "No es tu turno"
   * error must never appear for the active player).
   *
   * **Validates: Requirements 3.3, 4.4**
   */
  it("Propiedad 5 (complemento) — el jugador activo nunca es rechazado por turno incorrecto", () => {
    fc.assert(
      fc.property(
        fcPlayerId,
        fcActionType,
        fcOptionalDirection,
        (turn, action, target) => {
          // Active player has generous mana (10) so mana guard won't fire.
          // Both mages are at centre positions with empty surroundings.
          const state = buildActiveState(turn, 10, 10);

          const result = validateAction(state, {
            playerId: turn,
            action,
            target,
          });

          // If validation fails, it must NOT be due to the turn guard
          if (!result.valid) {
            return result.error !== "No es tu turno";
          }

          return true;
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 6: Maná insuficiente rechaza la acción sin modificar el estado
// Validates: Requirements 3.5, 6.2, 7.5, 8.4
// ---------------------------------------------------------------------------

/**
 * Mana cost table — mirrors the one in validator.ts so the property can
 * compute "cost > mana" independently without importing internals.
 */
const MANA_COST_TABLE: Record<string, number> = {
  move: 0,
  collect: 0,
  defend: 0,
  attack: 1,
  summon: 2,
  spell: 3,
};

/**
 * Returns only those ActionTypes whose mana cost is strictly positive,
 * i.e. the actions that CAN be rejected by the mana guard.
 */
const fcCostlyAction = fc.constantFrom(
  "attack" as const,
  "summon" as const,
  "spell" as const
);

describe("Property 6: Maná insuficiente rechaza la acción sin modificar el estado", () => {
  /**
   * **Validates: Requirements 3.5, 6.2, 7.5, 8.4**
   *
   * For any active game state where the active player's current mana is
   * strictly less than the mana cost of the requested action, validateAction
   * must return { valid: false } and must not mutate the state.
   */
  it("Propiedad 6 — acción costosa con maná insuficiente siempre es rechazada", () => {
    fc.assert(
      fc.property(
        // The player whose turn it is
        fcPlayerId,
        // An action with mana cost > 0
        fcCostlyAction,
        // Optional direction (some costly actions require one)
        fcOptionalDirection,
        // Active player mana: always strictly less than the action cost
        // attack=1 → mana in [0,0]; summon=2 → mana in [0,1]; spell=3 → mana in [0,2]
        // We generate mana separately using flatMap to respect the cost constraint.
        (turn, action, target) => {
          const cost = MANA_COST_TABLE[action];
          // mana is in [0, cost - 1]
          return fc.assert(
            fc.property(
              fc.integer({ min: 0, max: cost - 1 }),
              (insufficientMana) => {
                // Give the inactive player generous mana so it won't matter
                const p1Mana = turn === "P1" ? insufficientMana : 10;
                const p2Mana = turn === "P2" ? insufficientMana : 10;

                const state = buildActiveState(turn, p1Mana, p2Mana);
                const stateSnapshot = JSON.stringify(state);

                const result = validateAction(state, {
                  playerId: turn,
                  action,
                  target,
                });

                // Must be rejected
                if (result.valid !== false) return false;
                // Error message must indicate mana problem
                if (result.error !== "Maná insuficiente") return false;
                // State must not have been mutated
                if (JSON.stringify(state) !== stateSnapshot) return false;

                return true;
              }
            ),
            { numRuns: 50 }
          ) === undefined; // fc.assert returns void on success; undefined === undefined → true
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.5, 6.2, 7.5, 8.4**
   *
   * Complementary check: when the active player has exactly the required
   * mana, the "Maná insuficiente" error must NOT appear (other guards may
   * still fire, but not the mana guard).
   */
  it("Propiedad 6 (complemento) — maná exactamente suficiente no dispara el error de maná", () => {
    fc.assert(
      fc.property(
        fcPlayerId,
        fcCostlyAction,
        fcOptionalDirection,
        (turn, action, target) => {
          const cost = MANA_COST_TABLE[action];

          // Give the active player exactly the required mana
          const p1Mana = turn === "P1" ? cost : 10;
          const p2Mana = turn === "P2" ? cost : 10;

          const state = buildActiveState(turn, p1Mana, p2Mana);

          const result = validateAction(state, {
            playerId: turn,
            action,
            target,
          });

          // If validation fails, it must NOT be because of insufficient mana
          if (!result.valid) {
            return result.error !== "Maná insuficiente";
          }

          return true;
        }
      ),
      { numRuns: 200 }
    );
  });
});
