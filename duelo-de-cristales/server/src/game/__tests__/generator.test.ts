// Unit tests for createInitialState (generator.ts)
// Requisitos: 1.2, 1.3, 1.4, 1.5

import { createInitialState } from "../generator";
import type { GameState, Cell } from "../types";

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

function allPositionKeys(state: GameState): string[] {
  return state.units.map((u) => `${u.position.x},${u.position.y}`);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("createInitialState", () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState("Alice", "Bob");
  });

  // -------------------------------------------------------------------------
  // 1. Board dimensions — Req 1.2
  // -------------------------------------------------------------------------
  describe("board dimensions", () => {
    it("has exactly 10 rows", () => {
      expect(state.board).toHaveLength(10);
    });

    it("has exactly 10 columns in every row", () => {
      for (const row of state.board) {
        expect(row).toHaveLength(10);
      }
    });

    it("contains exactly 100 cells total", () => {
      const total = state.board.reduce((sum, row) => sum + row.length, 0);
      expect(total).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Obstacles — Req 1.2
  // -------------------------------------------------------------------------
  describe("obstacles", () => {
    it("places exactly 8 obstacles on the board", () => {
      expect(countCellType(state.board, "obstacle")).toBe(8);
    });

    it("does not place obstacles on reserved unit positions", () => {
      const reserved = [
        { x: 0, y: 0 },  // Core P1
        { x: 9, y: 9 },  // Core P2
        { x: 0, y: 1 },  // Mage P1
        { x: 9, y: 8 },  // Mage P2
      ];
      for (const pos of reserved) {
        expect(state.board[pos.y][pos.x].type).not.toBe("obstacle");
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. Crystals — Req 1.2
  // -------------------------------------------------------------------------
  describe("crystals", () => {
    it("places exactly 4 crystals on the board", () => {
      expect(countCellType(state.board, "crystal")).toBe(4);
    });

    it("each crystal cell has crystalValue = 1", () => {
      for (const row of state.board) {
        for (const cell of row) {
          if (cell.type === "crystal") {
            expect(cell.crystalValue).toBe(1);
          }
        }
      }
    });

    it("does not place crystals on reserved unit positions", () => {
      const reserved = [
        { x: 0, y: 0 },
        { x: 9, y: 9 },
        { x: 0, y: 1 },
        { x: 9, y: 8 },
      ];
      for (const pos of reserved) {
        expect(state.board[pos.y][pos.x].type).not.toBe("crystal");
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. Nucleus positions — Req 1.3
  // -------------------------------------------------------------------------
  describe("nucleus positions", () => {
    it("places Nucleus P1 at (0, 0)", () => {
      const core = state.units.find((u) => u.id === "p1-core");
      expect(core).toBeDefined();
      expect(core!.position).toEqual({ x: 0, y: 0 });
    });

    it("places Nucleus P2 at (9, 9)", () => {
      const core = state.units.find((u) => u.id === "p2-core");
      expect(core).toBeDefined();
      expect(core!.position).toEqual({ x: 9, y: 9 });
    });

    it("Nucleus P1 has hp=10 and armor=0", () => {
      const core = state.units.find((u) => u.id === "p1-core")!;
      expect(core.hp).toBe(10);
      expect(core.armor).toBe(0);
    });

    it("Nucleus P2 has hp=10 and armor=0", () => {
      const core = state.units.find((u) => u.id === "p2-core")!;
      expect(core.hp).toBe(10);
      expect(core.armor).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Mage positions — Req 1.4
  // -------------------------------------------------------------------------
  describe("mage positions", () => {
    it("places Mage P1 at (0, 1)", () => {
      const mage = state.units.find((u) => u.id === "p1-mage");
      expect(mage).toBeDefined();
      expect(mage!.position).toEqual({ x: 0, y: 1 });
    });

    it("places Mage P2 at (9, 8)", () => {
      const mage = state.units.find((u) => u.id === "p2-mage");
      expect(mage).toBeDefined();
      expect(mage!.position).toEqual({ x: 9, y: 8 });
    });

    it("Mage P1 has hp=10 and armor=0", () => {
      const mage = state.units.find((u) => u.id === "p1-mage")!;
      expect(mage.hp).toBe(10);
      expect(mage.armor).toBe(0);
    });

    it("Mage P2 has hp=10 and armor=0", () => {
      const mage = state.units.find((u) => u.id === "p2-mage")!;
      expect(mage.hp).toBe(10);
      expect(mage.armor).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 6 & 7. Initial player resources — Req 1.5
  // -------------------------------------------------------------------------
  describe("initial player resources", () => {
    it("P1 starts with mana = 3", () => {
      expect(state.players["P1"].mana).toBe(3);
    });

    it("P2 starts with mana = 3", () => {
      expect(state.players["P2"].mana).toBe(3);
    });

    it("P1 starts with crystals = 0", () => {
      expect(state.players["P1"].crystals).toBe(0);
    });

    it("P2 starts with crystals = 0", () => {
      expect(state.players["P2"].crystals).toBe(0);
    });

    it("P1 starts with armor = 0", () => {
      expect(state.players["P1"].armor).toBe(0);
    });

    it("P2 starts with armor = 0", () => {
      expect(state.players["P2"].armor).toBe(0);
    });

    it("PlayerState names match the arguments passed", () => {
      expect(state.players["P1"].name).toBe("Alice");
      expect(state.players["P2"].name).toBe("Bob");
    });
  });

  // -------------------------------------------------------------------------
  // 8. No position overlap between units — Req 1.2, 1.3, 1.4
  // -------------------------------------------------------------------------
  describe("no position overlap", () => {
    it("all 4 units occupy distinct positions", () => {
      const keys = allPositionKeys(state);
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    });

    it("obstacles do not overlap with unit positions", () => {
      const unitKeys = new Set(allPositionKeys(state));
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (state.board[y][x].type === "obstacle") {
            expect(unitKeys.has(`${x},${y}`)).toBe(false);
          }
        }
      }
    });

    it("crystals do not overlap with unit positions", () => {
      const unitKeys = new Set(allPositionKeys(state));
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (state.board[y][x].type === "crystal") {
            expect(unitKeys.has(`${x},${y}`)).toBe(false);
          }
        }
      }
    });

    it("obstacles and crystals do not share any cell", () => {
      for (const row of state.board) {
        for (const cell of row) {
          expect((cell.type as string) === "obstacle" && (cell.type as string) === "crystal").toBe(false);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // 9. Initial game metadata — Req 1.1
  // -------------------------------------------------------------------------
  describe("initial game metadata", () => {
    it("status is 'playing'", () => {
      expect(state.status).toBe("playing");
    });

    it("first turn belongs to P1", () => {
      expect(state.turn).toBe("P1");
    });

    it("turnNumber starts at 1", () => {
      expect(state.turnNumber).toBe(1);
    });

    it("has a non-empty unique id", () => {
      expect(typeof state.id).toBe("string");
      expect(state.id.length).toBeGreaterThan(0);
    });

    it("each call produces a different id", () => {
      const stateB = createInitialState("X", "Y");
      expect(state.id).not.toBe(stateB.id);
    });

    it("winner is null", () => {
      expect(state.winner).toBeNull();
    });

    it("crystalDoubleActive is false", () => {
      expect(state.crystalDoubleActive).toBe(false);
    });

    it("projectiles array is empty", () => {
      expect(state.projectiles).toHaveLength(0);
    });

    it("history array is empty", () => {
      expect(state.history).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 10. PlayerState mage position mirrors unit position — Req 1.5
  // -------------------------------------------------------------------------
  describe("PlayerState position matches Mage unit", () => {
    it("P1 PlayerState.position matches Mage P1 unit position", () => {
      const mage = state.units.find((u) => u.id === "p1-mage")!;
      expect(state.players["P1"].position).toEqual(mage.position);
    });

    it("P2 PlayerState.position matches Mage P2 unit position", () => {
      const mage = state.units.find((u) => u.id === "p2-mage")!;
      expect(state.players["P2"].position).toEqual(mage.position);
    });
  });
});
