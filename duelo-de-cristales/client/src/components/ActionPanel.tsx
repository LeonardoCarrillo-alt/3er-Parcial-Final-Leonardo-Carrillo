import { useEffect, useState } from "react";
import type { ActionRequest, GameState, PlayerId } from "../types/game";

interface ActionPanelProps {
  state: GameState;
  activePlayer: PlayerId;
  onAction: (req: ActionRequest) => void;
  error: string | null;
}

export function ActionPanel({
  state,
  activePlayer,
  onAction,
  error,
}: ActionPanelProps) {
  const [visibleError, setVisibleError] = useState<string | null>(null);
  const [prevError, setPrevError] = useState<string | null>(null);

  
  if (error !== prevError) {
    setPrevError(error);
    setVisibleError(error);
  }

  // limpia el error despues de 3 segundos
  useEffect(() => {
    if (!visibleError) return;
    const timer = setTimeout(() => {
      setVisibleError(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [visibleError]);

  const isActive = activePlayer === state.turn;
  const panelClass = `action-panel ${activePlayer === "P1" ? "p1-panel" : "p2-panel"}`;

  function handleAction(req: ActionRequest) {
    onAction({ ...req, playerId: activePlayer });
  }

  return (
    <div>
      <div className="hud-label" style={{ textAlign: "center", marginBottom: 4 }}>
        Jugador {activePlayer}
      </div>

      <div className={panelClass}>
        <button
          data-testid="btn-move-north"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "move", target: "north" })}
        >
          ⬆️ Mover Norte
        </button>

        <button
          data-testid="btn-move-south"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "move", target: "south" })}
        >
          ⬇️ Mover Sur
        </button>

        <button
          data-testid="btn-move-west"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "move", target: "west" })}
        >
          ⬅️ Mover Oeste
        </button>

        <button
          data-testid="btn-move-east"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "move", target: "east" })}
        >
          ➡️ Mover Este
        </button>

        <button
          data-testid="btn-collect"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "collect" })}
        >
          💎 Recolectar
        </button>

        <button
          data-testid="btn-summon"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "summon" })}
        >
          👾 Invocar
        </button>

        <button
          data-testid="btn-spell-north"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "spell", target: "north" })}
        >
          ✨ Hechizo Norte
        </button>

        <button
          data-testid="btn-spell-south"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "spell", target: "south" })}
        >
          ✨ Hechizo Sur
        </button>

        <button
          data-testid="btn-spell-east"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "spell", target: "east" })}
        >
          ✨ Hechizo Este
        </button>

        <button
          data-testid="btn-spell-west"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "spell", target: "west" })}
        >
          ✨ Hechizo Oeste
        </button>

        <button
          data-testid="btn-attack"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "attack" })}
        >
          ⚔️ Atacar
        </button>

        <button
          data-testid="btn-defend"
          disabled={!isActive}
          onClick={() => handleAction({ playerId: activePlayer, action: "defend" })}
        >
          🛡️ Defender
        </button>
      </div>

      {visibleError && (
        <div
          data-testid="error-message"
          className="error-message error-visible"
          role="alert"
        >
          {visibleError}
        </div>
      )}
    </div>
  );
}
