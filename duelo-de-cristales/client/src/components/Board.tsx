import type { GameState, SpellEffect } from "../types/game";
import { Cell } from "./Cell";
import preview from "../assets/preview.jpg";

interface BoardProps {
  state: GameState;
  effects?: SpellEffect[];
}

export function Board({ state, effects = [] }: BoardProps) {
  const { board, units, projectiles } = state;

  return (
    <div className="board" data-testid="board" style={{backgroundImage: `url(${preview})`}}>
      {board.map((row, y) =>
        row.map((cell, x) => (
          <Cell
            key={`${x}-${y}`}
            cell={cell}
            units={units}
            projectiles={projectiles}
            x={x}
            y={y}
            effect={effects.find((e) => e.x === x && e.y === y)}
          />
        ))
      )}
    </div>
  );
}
