// Property-Based Tests for createInitialState — Board Layout (Propiedad 2)
// Validates: Requirements 1.2, 1.3, 1.4
//
// **Validates: Requirements 1.2, 1.3, 1.4**
//
// Propiedad 2: Tablero inicial con elementos correctos
// Verifica para cualquier par de nombres válidos:
//   - Tablero 10×10 completo
//   - Exactamente 8 obstáculos
//   - Exactamente 4 cristales
//   - Posiciones de Núcleos y Magos correctas y sin superposición
//   - Ningún obstáculo ni cristal superpuesto con las unidades

import * as fc from "fast-check";
import { createInitialState } from "../generator";
import type { Cell } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function countCellType(board: Cell[][], type: Cell["type"]): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.type === type) count++;
    }
  }
  return count;
}

function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

// ---------------------------------------------------------------------------
// Propiedad 2: Tablero inicial con elementos correctos
// Validates: Requirements 1.2, 1.3, 1.4
// ---------------------------------------------------------------------------
describe("Property 2: Tablero inicial con elementos correctos", () => {
  it("para cualquier par de nombres válidos el tablero es correcto", () => {
    const playerName = fc.string({ minLength: 1, maxLength: 30 });

    fc.assert(
      fc.property(playerName, playerName, (player1, player2) => {
        const state = createInitialState(player1, player2);
        const { board, units } = state;

        // --- Dimensiones del tablero (Req 1.2) ---
        if (board.length !== 10) return false;
        for (const row of board) {
          if (row.length !== 10) return false;
        }

        // --- Exactamente 8 obstáculos (Req 1.2) ---
        if (countCellType(board, "obstacle") !== 8) return false;

        // --- Exactamente 4 cristales (Req 1.2) ---
        if (countCellType(board, "crystal") !== 4) return false;

        // --- Posiciones fijas de Núcleos (Req 1.3) ---
        const coreP1 = units.find((u) => u.id === "p1-core");
        const coreP2 = units.find((u) => u.id === "p2-core");
        if (!coreP1 || coreP1.position.x !== 0 || coreP1.position.y !== 0) return false;
        if (!coreP2 || coreP2.position.x !== 9 || coreP2.position.y !== 9) return false;

        // --- Posiciones fijas de Magos (Req 1.4) ---
        const mageP1 = units.find((u) => u.id === "p1-mage");
        const mageP2 = units.find((u) => u.id === "p2-mage");
        if (!mageP1 || mageP1.position.x !== 0 || mageP1.position.y !== 1) return false;
        if (!mageP2 || mageP2.position.x !== 9 || mageP2.position.y !== 8) return false;

        // --- Las 4 unidades ocupan posiciones distintas (Req 1.2) ---
        const unitKeys = units.map((u) => posKey(u.position.x, u.position.y));
        if (new Set(unitKeys).size !== unitKeys.length) return false;

        // --- Ningún obstáculo se superpone con una unidad (Req 1.2) ---
        const unitKeySet = new Set(unitKeys);
        for (let y = 0; y < 10; y++) {
          for (let x = 0; x < 10; x++) {
            if (board[y][x].type === "obstacle" && unitKeySet.has(posKey(x, y))) {
              return false;
            }
          }
        }

        // --- Ningún cristal se superpone con una unidad (Req 1.2) ---
        for (let y = 0; y < 10; y++) {
          for (let x = 0; x < 10; x++) {
            if (board[y][x].type === "crystal" && unitKeySet.has(posKey(x, y))) {
              return false;
            }
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
