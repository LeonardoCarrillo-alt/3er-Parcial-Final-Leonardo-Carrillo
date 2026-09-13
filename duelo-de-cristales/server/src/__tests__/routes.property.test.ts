// Duelo de Cristales — Property-based tests for HTTP routes
// **Validates: Requirements 3.1, 3.3, 3.7, 14.1**

import * as fc from "fast-check";
import request from "supertest";
import app, { server } from "../index";
import { gameStore } from "../routes/games";

beforeEach(() => {
  gameStore.clear();
});

afterAll(() => {
  server.close();
});

// =============================================================================
// Propiedad 3 (Task 8.7) — Rechazo de nombres inválidos
// POST /api/games debe responder 400 con ok: false cuando player1 o player2
// es "", "   " o está ausente (undefined/not sent).
// **Validates: Requirements 3.1**
// =============================================================================
describe("Propiedad 3 — POST /api/games rechaza nombres inválidos", () => {
  it("any combination of empty/whitespace/absent names → 400, ok: false", async () => {
    const invalidArb = fc.oneof(
      fc.constant(""),
      fc.constant("   "),
      fc.constant(undefined)
    );

    await fc.assert(
      fc.asyncProperty(invalidArb, invalidArb, async (p1, p2) => {
        const body: Record<string, string | undefined> = {};
        if (p1 !== undefined) body.player1 = p1;
        if (p2 !== undefined) body.player2 = p2;

        const res = await request(app).post("/api/games").send(body);

        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  it("valid player1 + invalid player2 → 400, ok: false", async () => {
    const invalidArb = fc.oneof(
      fc.constant(""),
      fc.constant("   "),
      fc.constant(undefined)
    );
    // Restrict to safe printable ASCII names to avoid HTTP-level issues
    const validNameArb = fc
      .stringOf(fc.char(), { minLength: 1, maxLength: 20 })
      .filter((s) => s.trim().length > 0 && /^[\x20-\x7E]+$/.test(s));

    await fc.assert(
      fc.asyncProperty(validNameArb, invalidArb, async (p1, p2) => {
        const body: Record<string, string | undefined> = { player1: p1 };
        if (p2 !== undefined) body.player2 = p2;

        const res = await request(app).post("/api/games").send(body);

        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
      }),
      { numRuns: 30 }
    );
  });
});

// =============================================================================
// Propiedad 7 (Task 8.8) — Historial append-only con estructura correcta
// Ejecutar N acciones válidas y verificar que el historial crece
// monotónicamente y cada entrada tiene la estructura requerida.
// **Validates: Requirements 14.1, 3.7**
// =============================================================================
describe("Propiedad 7 — Historial append-only con estructura correcta", () => {
  // P1 mage starts at (0,1). Valid moves: south (→ y=2), south (→ y=3), ...
  // P2 mage starts at (9,8). Valid moves: north (→ y=7), north (→ y=6), ...
  // We alternate P1 south / P2 north for a deterministic N-action sequence.
  const ACTIONS_P1 = ["south", "south", "south", "south", "south"] as const;
  const ACTIONS_P2 = ["north", "north", "north", "north", "north"] as const;

  it("history grows monotonically and entries have correct structure", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (numActions) => {
          gameStore.clear();

          // Create a fresh game
          const createRes = await request(app)
            .post("/api/games")
            .send({ player1: "Alice", player2: "Bob" });
          expect(createRes.status).toBe(201);
          const { gameId } = createRes.body;

          let prevHistoryLength = 0;

          for (let i = 0; i < numActions; i++) {
            const playerId = i % 2 === 0 ? "P1" : "P2";
            const target =
              playerId === "P1" ? ACTIONS_P1[i] : ACTIONS_P2[i];

            const actionRes = await request(app)
              .post(`/api/games/${gameId}/actions`)
              .send({ playerId, action: "move", target });

            // Action must succeed
            if (actionRes.status !== 200) {
              // If the move became invalid (e.g. obstacle), try defend (no target)
              const fallback = await request(app)
                .post(`/api/games/${gameId}/actions`)
                .send({ playerId, action: "defend" });
              expect(fallback.status).toBe(200);
            }

            // Fetch history after this action
            const histRes = await request(app).get(
              `/api/games/${gameId}/history`
            );
            expect(histRes.status).toBe(200);
            expect(histRes.body.ok).toBe(true);

            const history: Array<{
              player: string;
              action: string;
              turnNumber: number;
              timestamp: string;
            }> = histRes.body.history;

            // History must grow monotonically
            expect(history.length).toBeGreaterThan(prevHistoryLength);
            prevHistoryLength = history.length;

            // Every entry must have the required fields with correct types
            for (const entry of history) {
              // player must be P1 or P2
              expect(["P1", "P2"]).toContain(entry.player);

              // action must be a non-empty string
              expect(typeof entry.action).toBe("string");
              expect(entry.action.length).toBeGreaterThan(0);

              // turnNumber must be in range 1–30
              expect(entry.turnNumber).toBeGreaterThanOrEqual(1);
              expect(entry.turnNumber).toBeLessThanOrEqual(30);

              // timestamp must be a valid ISO 8601 string
              expect(typeof entry.timestamp).toBe("string");
              expect(new Date(entry.timestamp).toISOString()).toBe(
                entry.timestamp
              );
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
