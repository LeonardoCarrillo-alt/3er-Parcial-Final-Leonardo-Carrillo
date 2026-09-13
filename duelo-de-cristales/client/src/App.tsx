import "./styles.css";
import { useState } from "react";
import { StartScreen } from "./components/StartScreen";
import { Board } from "./components/Board";
import { Hud } from "./components/Hud";
import { ActionPanel } from "./components/ActionPanel";
import { ResultScreen } from "./components/ResultScreen";
import type { ActionRequest, Direction, GameState, PlayerId, SpellEffect } from "./types/game";

const DIR_OFFSETS: Record<Direction, { x: number; y: number }> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

export default function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentState, setCurrentState] = useState<GameState | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  function handleGameCreated(_id: string, initialState: GameState) {
    setCurrentGameId(_id);
    setCurrentState(initialState);
    setGameStarted(true);
  }

  function handleRestart() {
    window.location.reload();
  }

  if (!gameStarted || !currentState) {
    return <StartScreen onGameCreated={handleGameCreated} />;
  }

  if (currentState.status === "finished") {
    const winner = currentState.winner ?? "draw";
    return <ResultScreen winner={winner} onRestart={handleRestart} />;
  }

  return (
    <PlayingScreen
      initialState={currentState}
      gameId={currentGameId!}
      onRestart={handleRestart}
    />
  );
}

interface PlayingScreenProps {
  initialState: GameState;
  gameId: string;
  onRestart: () => void;
}

function PlayingScreen({ initialState, gameId: _gameId, onRestart }: PlayingScreenProps) {
  const [currentState, setCurrentState] = useState<GameState>(initialState);
  const [actionError, setActionError] = useState<string | null>(null);
  const [spellFx, setSpellFx] = useState<SpellEffect[]>([]);

  function showSpellFx(req: ActionRequest) {
    if (req.action !== "spell" || !req.target) return;
    const off = DIR_OFFSETS[req.target];
    const mage = currentState.units.find(
      (u) => u.type === "mage" && u.owner === req.playerId
    );
    if (!mage) return;
    const tx = mage.position.x + off.x;
    const ty = mage.position.y + off.y;
    if (tx < 0 || tx > 9 || ty < 0 || ty > 9) return;

    const id = Date.now();
    setSpellFx((fx) => [...fx, { id, x: tx, y: ty }]);
    setTimeout(
      () => setSpellFx((fx) => fx.filter((f) => f.id !== id)),
      1600
    );
  }

  async function handleAction(req: ActionRequest) {
    setActionError(null);
    try {
      const res = await fetch(`/api/games/${_gameId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActionError(data.error ?? `Error ${res.status}`);
        return;
      }
      if (data.state) {
        setCurrentState(data.state);
        showSpellFx(req);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error de red");
    }
  }

  if (currentState.status === "finished") {
    const winner = currentState.winner ?? "draw";
    return <ResultScreen winner={winner} onRestart={onRestart} />;
  }

  function handleP1Action(req: ActionRequest) {
    handleAction({ ...req, playerId: "P1" });
  }

  function handleP2Action(req: ActionRequest) {
    handleAction({ ...req, playerId: "P2" });
  }

  return (
    <div className="game-layout">
      <Hud state={currentState} />
      <Board state={currentState} effects={spellFx} />
      <div className="panels-row">
        <ActionPanel
          state={currentState}
          activePlayer={"P1" as PlayerId}
          onAction={handleP1Action}
          error={actionError}
        />
        <ActionPanel
          state={currentState}
          activePlayer={"P2" as PlayerId}
          onAction={handleP2Action}
          error={actionError}
        />
      </div>
    </div>
  );
}
