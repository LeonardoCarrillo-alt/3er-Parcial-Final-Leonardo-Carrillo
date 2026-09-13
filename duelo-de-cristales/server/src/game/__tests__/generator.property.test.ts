// Property-based tests for createInitialState (generator.ts)
// Propiedad 1: Estado inicial válido para cualquier par de nombres válidos
// Validates: Requirements 1.1, 1.5

import * as fc from "fast-check";
import { createInitialState } from "../generator";

describe("createInitialState — Propiedad 1: Estado inicial válido para cualquier par de nombres válidos", () => {
  /**
   * **Validates: Requirements 1.1, 1.5**
   *
   * For any pair of valid player names (1–30 characters), createInitialState
   * must return a GameState with the correct initial metadata and resource values.
   */
  it("Propiedad 1 — estado inicial válido para cualquier par de nombres válidos", () => {
    const playerName = fc.string({ minLength: 1, maxLength: 30 });

    fc.assert(
      fc.property(playerName, playerName, (name1, name2) => {
        const state = createInitialState(name1, name2);

        // --- Req 1.1: Game metadata ---
        expect(state.status).toBe("playing");
        expect(state.turn).toBe("P1");
        expect(state.turnNumber).toBe(1);
        expect(state.winner).toBeNull();
        expect(typeof state.id).toBe("string");
        expect(state.id.length).toBeGreaterThan(0);

        // --- Req 1.5: Initial resource values ---
        expect(state.players["P1"].mana).toBe(3);
        expect(state.players["P2"].mana).toBe(3);
        expect(state.players["P1"].crystals).toBe(0);
        expect(state.players["P2"].crystals).toBe(0);
        expect(state.players["P1"].armor).toBe(0);
        expect(state.players["P2"].armor).toBe(0);

        // --- Req 1.5: Player names are preserved ---
        expect(state.players["P1"].name).toBe(name1);
        expect(state.players["P2"].name).toBe(name2);
      }),
      { numRuns: 100 }
    );
  });
});
