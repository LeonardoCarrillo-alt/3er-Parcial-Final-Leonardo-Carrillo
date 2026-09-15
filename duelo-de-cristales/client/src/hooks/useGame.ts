import { useState } from "react";
import type {
  GameState,
  ActionRequest,
  CreateGameResponse,
  ActionResponse,
} from "../types/game";

interface UseGameReturn {
  gameId: string | null;
  state: GameState | null;
  error: string | null;
  loading: boolean;
  createGame: (player1: string, player2: string) => Promise<void>;
  fetchState: () => Promise<void>;
  sendAction: (req: ActionRequest) => Promise<void>;
}

export function useGame(): UseGameReturn {
  const [gameId, setGameId] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  async function createGame(player1: string, player2: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1, player2 }),
      });

      const data: CreateGameResponse = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }

      setGameId(data.gameId ?? null);
      setState(data.state ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function fetchState(): Promise<void> {
    if (!gameId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}`);
      const data = await res.json();

      if (res.ok && data.ok) {
        setState(data.state as GameState);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function sendAction(req: ActionRequest): Promise<void> {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      const data: ActionResponse = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }

      setState(data.state ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return { gameId, state, error, loading, createGame, fetchState, sendAction };
}
