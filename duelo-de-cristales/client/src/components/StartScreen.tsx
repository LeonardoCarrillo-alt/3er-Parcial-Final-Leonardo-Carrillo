import { useEffect, useState } from "react";
import { useGame } from "../hooks/useGame";
import type { GameState } from "../types/game";
import start from '../assets/principalScreen.jpeg'

interface StartScreenProps {
  onGameCreated: (gameId: string, initialState: GameState) => void;
}

export function StartScreen({ onGameCreated }: StartScreenProps) {
  const { gameId, state, createGame, error, loading } = useGame();
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [errorP1, setErrorP1] = useState<string | null>(null);
  const [errorP2, setErrorP2] = useState<string | null>(null);

  // When the hook resolves with a valid game, notify the parent.
  useEffect(() => {
    if (gameId && state) {
      onGameCreated(gameId, state);
    }
  }, [gameId, state, onGameCreated]);

  async function handleStart() {
    let valid = true;

    if (!player1.trim()) {
      setErrorP1("El nombre no puede estar vacío");
      valid = false;
    } else if (player1.length > 30) {
      setErrorP1("Máximo 30 caracteres");
      valid = false;
    } else {
      setErrorP1(null);
    }

    if (!player2.trim()) {
      setErrorP2("El nombre no puede estar vacío");
      valid = false;
    } else if (player2.length > 30) {
      setErrorP2("Máximo 30 caracteres");
      valid = false;
    } else {
      setErrorP2(null);
    }

    if (!valid) return;

    await createGame(player1.trim(), player2.trim());
  }

  return (
    <div className="start-background" style={{ backgroundImage: `url(${start})` }}>
      <div className="start-screen" >

        <div>
          <input
            data-testid="input-player1"
            type="text"
            placeholder="Nombre Jugador 1"
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            className={errorP1 ? "input-error" : ""}
            maxLength={31}
          />
          {errorP1 && (
            <div data-testid="error-p1" className="field-error">
              {errorP1}
            </div>
          )}
        </div>

        <div>
          <input
            data-testid="input-player2"
            type="text"
            placeholder="Nombre Jugador 2"
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
            className={errorP2 ? "input-error" : ""}
            maxLength={31}
          />
          {errorP2 && (
            <div data-testid="error-p2" className="field-error">
              {errorP2}
            </div>
          )}
        </div>

        {error && (
          <div className="field-error" role="alert">
            {error}
          </div>
        )}

        <button
          data-testid="btn-start"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? "Iniciando…" : "Iniciar Partida"}
        </button>
      </div>
    </div>
  );
}
