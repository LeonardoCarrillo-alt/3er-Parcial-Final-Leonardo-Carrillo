// Duelo de Cristales — Route integration tests (supertest)

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
// POST /api/games
// =============================================================================
describe("POST /api/games", () => {
  it("creates a game with valid player names → 201, ok: true, gameId, state", async () => {
    const res = await request(app)
      .post("/api/games")
      .send({ player1: "Alice", player2: "Bob" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.gameId).toBe("string");
    expect(res.body.gameId.length).toBeGreaterThan(0);

    const { state } = res.body;
    expect(state).toBeDefined();
    expect(state.status).toBe("playing");
    expect(state.turn).toBe("P1");
    expect(state.turnNumber).toBe(1);
    expect(Array.isArray(state.board)).toBe(true);
    expect(state.board.length).toBe(10);
    expect(Array.isArray(state.units)).toBe(true);
    expect(state.players.P1.name).toBe("Alice");
    expect(state.players.P2.name).toBe("Bob");
  });

  it("rejects empty player1 → 400, ok: false", async () => {
    const res = await request(app)
      .post("/api/games")
      .send({ player1: "", player2: "Bob" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(typeof res.body.error).toBe("string");
  });

  it("rejects whitespace-only player2 → 400, ok: false", async () => {
    const res = await request(app)
      .post("/api/games")
      .send({ player1: "Alice", player2: "   " });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("rejects body with no fields → 400, ok: false", async () => {
    const res = await request(app).post("/api/games").send({});

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

// =============================================================================
// GET /api/games/:id
// =============================================================================
describe("GET /api/games/:id", () => {
  it("returns state for an existing game → 200, ok: true, state", async () => {
    // Create a game first
    const create = await request(app)
      .post("/api/games")
      .send({ player1: "Alice", player2: "Bob" });
    const { gameId } = create.body;

    const res = await request(app).get(`/api/games/${gameId}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.state).toBeDefined();
    expect(res.body.state.id).toBe(gameId);
  });

  it("returns 404 for a non-existent game id → 404, ok: false", async () => {
    const res = await request(app).get("/api/games/non-existent-id");

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
});

// =============================================================================
// POST /api/games/:id/actions
// =============================================================================
describe("POST /api/games/:id/actions", () => {
  async function createGame() {
    const res = await request(app)
      .post("/api/games")
      .send({ player1: "Alice", player2: "Bob" });
    return res.body as { gameId: string };
  }

  it("valid action (move north for P1) → 200, ok: true, updated state", async () => {
    const { gameId } = await createGame();

    // P1 mage starts at (0,1). Moving north → (0,0), the own Core cell, which is
    // never an obstacle (the generator reserves Core/Mage positions).
    const res = await request(app)
      .post(`/api/games/${gameId}/actions`)
      .send({ playerId: "P1", action: "move", target: "north" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.state).toBeDefined();
    // Turn should have advanced to P2
    expect(res.body.state.turn).toBe("P2");
  });

  it("malformed body (missing action) → 400, ok: false", async () => {
    const { gameId } = await createGame();

    const res = await request(app)
      .post(`/api/games/${gameId}/actions`)
      .send({ playerId: "P1" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("wrong-turn action (P2 playing on P1's turn) → 400, ok: false", async () => {
    const { gameId } = await createGame();

    const res = await request(app)
      .post(`/api/games/${gameId}/actions`)
      .send({ playerId: "P2", action: "move", target: "north" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBeTruthy();
  });

  it("non-existent game id → 404, ok: false", async () => {
    const res = await request(app)
      .post("/api/games/does-not-exist/actions")
      .send({ playerId: "P1", action: "move", target: "south" });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it("action on a finished game → 409, ok: false", async () => {
    const { gameId } = await createGame();

    // Manually set the game as finished in the store
    const state = gameStore.get(gameId)!;
    gameStore.set(gameId, { ...state, status: "finished", winner: "P1" });

    const res = await request(app)
      .post(`/api/games/${gameId}/actions`)
      .send({ playerId: "P1", action: "move", target: "south" });

    expect(res.status).toBe(409);
    expect(res.body.ok).toBe(false);
  });
});

// =============================================================================
// GET /api/games/:id/history
// =============================================================================
describe("GET /api/games/:id/history", () => {
  it("returns empty history for a new game → 200, ok: true, history: []", async () => {
    const create = await request(app)
      .post("/api/games")
      .send({ player1: "Alice", player2: "Bob" });
    const { gameId } = create.body;

    const res = await request(app).get(`/api/games/${gameId}/history`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBe(0);
  });

  it("returns 1-entry history after one action", async () => {
    const create = await request(app)
      .post("/api/games")
      .send({ player1: "Alice", player2: "Bob" });
    const { gameId } = create.body;

    // Submit a valid action (move north to the own Core cell — never blocked)
    await request(app)
      .post(`/api/games/${gameId}/actions`)
      .send({ playerId: "P1", action: "move", target: "north" });

    const res = await request(app).get(`/api/games/${gameId}/history`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.history.length).toBe(1);

    const entry = res.body.history[0];
    expect(entry.player).toBe("P1");
    expect(entry.action).toBe("move");
    expect(typeof entry.turnNumber).toBe("number");
    expect(typeof entry.timestamp).toBe("string");
    // Validate ISO 8601
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it("returns 404 for a non-existent game id → 404, ok: false", async () => {
    const res = await request(app).get("/api/games/no-such-game/history");

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
});
