// Duelo de Cristales — Games Router

import { Router, Request, Response } from "express";
import type {
  GameState,
  ActionRequest,
  PlayerId,
  ActionType,
  Direction,
} from "../game/types";
import { createInitialState } from "../game/generator";
import { validateAction } from "../game/validator";
import { applyAction } from "../game/engine";

// ---------------------------------------------------------------------------
// In-memory game store — exported so tests can clear it between runs
// ---------------------------------------------------------------------------
export const gameStore = new Map<string, GameState>();

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = Router();

// ---------------------------------------------------------------------------
// GET /health — Health check (usado por la configuración de Playwright)
// ---------------------------------------------------------------------------
router.get("/health", (_req: Request, res: Response): void => {
  res.status(200).json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /games — Create a new game
// ---------------------------------------------------------------------------
router.post("/games", (req: Request, res: Response): void => {
  try {
    const { player1, player2 } = (req.body ?? {}) as {
      player1?: unknown;
      player2?: unknown;
    };

    if (
      !player1 ||
      !player2 ||
      typeof player1 !== "string" ||
      typeof player2 !== "string" ||
      player1.trim() === "" ||
      player2.trim() === ""
    ) {
      res
        .status(400)
        .json({ ok: false, error: "Nombres de jugadores requeridos" });
      return;
    }

    const state = createInitialState(player1, player2);
    gameStore.set(state.id, state);
    res.status(201).json({ ok: true, gameId: state.id, state });
  } catch {
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
});

// ---------------------------------------------------------------------------
// GET /games/:id — Get game state
// ---------------------------------------------------------------------------
router.get("/games/:id", (req: Request, res: Response): void => {
  try {
    const state = gameStore.get(req.params.id as string);
    if (!state) {
      res.status(404).json({ ok: false, error: "Partida no encontrada" });
      return;
    }
    res.status(200).json({ ok: true, state });
  } catch {
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
});

// ---------------------------------------------------------------------------
// POST /games/:id/actions — Submit an action
// ---------------------------------------------------------------------------
router.post("/games/:id/actions", (req: Request, res: Response): void => {
  try {
    const state = gameStore.get(req.params.id as string);
    if (!state) {
      res.status(404).json({ ok: false, error: "Partida no encontrada" });
      return;
    }

    const { playerId, action, target } = (req.body ?? {}) as {
      playerId?: unknown;
      action?: unknown;
      target?: unknown;
    };
    if (!playerId || !action) {
      res
        .status(400)
        .json({ ok: false, error: "Campos requeridos: playerId, action" });
      return;
    }

    if (state.status === "finished") {
      res.status(409).json({ ok: false, error: "La partida ha terminado" });
      return;
    }

    const actionReq: ActionRequest = {
      playerId: playerId as PlayerId,
      action: action as ActionType,
      target: target as Direction | undefined,
    };

    const result = validateAction(state, actionReq);
    if (!result.valid) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }

    const newState = applyAction(state, actionReq);
    gameStore.set(req.params.id as string, newState);
    res.status(200).json({ ok: true, state: newState });
  } catch {
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
});

// ---------------------------------------------------------------------------
// GET /games/:id/history — Get game history
// ---------------------------------------------------------------------------
router.get("/games/:id/history", (req: Request, res: Response): void => {
  try {
    const state = gameStore.get(req.params.id as string);
    if (!state) {
      res.status(404).json({ ok: false, error: "Partida no encontrada" });
      return;
    }
    res.status(200).json({ ok: true, history: state.history });
  } catch {
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
});

export default router;
