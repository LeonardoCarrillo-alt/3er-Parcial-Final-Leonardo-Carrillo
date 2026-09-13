import type { PlayerId } from "../types/game";

interface ResultScreenProps {
  winner: PlayerId | "draw";
  onRestart: () => void;
}

export function ResultScreen({ winner, onRestart }: ResultScreenProps) {
  let winnerText: string;
  if (winner === "P1") {
    winnerText = "¡Ganó P1!";
  } else if (winner === "P2") {
    winnerText = "¡Ganó P2!";
  } else {
    winnerText = "¡Empate!";
  }

  return (
    <div className="result-screen" data-testid="result-screen">
      <div className="winner-text" data-testid="winner-text">
        {winnerText}
      </div>
      <button data-testid="btn-restart" onClick={onRestart}>
        Jugar de nuevo
      </button>
    </div>
  );
}
