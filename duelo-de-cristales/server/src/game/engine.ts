// Duelo de Cristales — Game Engine
// applyAction: applies a validated action and resolves all turn effects.
// Assumes the action has already been validated by validateAction().

import { randomUUID } from "crypto";
import type {
  GameState,
  ActionRequest,
  PlayerId,
  Direction,
  Position,
  Unit,
  Cell,
  EventType,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CORE_P1: Position = { x: 0, y: 0 };
const CORE_P2: Position = { x: 9, y: 9 };

const DIRECTION_DELTA: Record<Direction, Position> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east:  { x: 1, y: 0 },
  west:  { x: -1, y: 0 },
};

const PRIORITY_DIRS: Direction[] = ["north", "east", "south", "west"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

function inBounds(p: Position): boolean {
  return p.x >= 0 && p.x <= 9 && p.y >= 0 && p.y <= 9;
}

function neighbour(pos: Position, dir: Direction): Position {
  const d = DIRECTION_DELTA[dir];
  return { x: pos.x + d.x, y: pos.y + d.y };
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Apply damage to a unit, returning the updated unit (or null if destroyed). */
function applyDamage(unit: Unit, damage: number): Unit {
  return { ...unit, hp: unit.hp - damage };
}

/** True if a cell blocks movement/placement. */
function isCellBlocked(cell: Cell): boolean {
  return cell.type === "obstacle" || cell.type === "temp_obstacle";
}

// ---------------------------------------------------------------------------
// applyAction — Task 6.1
// ---------------------------------------------------------------------------
export function applyAction(state: GameState, req: ActionRequest): GameState {
  // Start with a structural clone so every step works on mutable intermediates.
  let s: GameState = structuredClone(state);

  // =========================================================================
  // STEP 1 (6.2) — Expire temporary obstacles
  // =========================================================================
  s.board = s.board.map((row) =>
    row.map((cell) => {
      if (
        cell.type === "temp_obstacle" &&
        cell.tempObstacleExpiry === s.turnNumber
      ) {
        return { type: "empty" };
      }
      return cell;
    })
  );

  // =========================================================================
  // STEP 2 (6.3) — Random event (10% chance)
  // =========================================================================
  if (Math.random() < 0.1) {
    const roll = Math.random();
    let eventType: EventType;

    if (roll < 1 / 3) {
      // --- Storm: subtract 1 mana from both players (min 0) ---
      eventType = "storm";
      s.players = {
        P1: { ...s.players.P1, mana: Math.max(0, s.players.P1.mana - 1) },
        P2: { ...s.players.P2, mana: Math.max(0, s.players.P2.mana - 1) },
      };
    } else if (roll < 2 / 3) {
      // --- Crystal double: set flag ---
      eventType = "crystal_double";
      s.crystalDoubleActive = true;
    } else {
      // --- Block: place temp_obstacle on a random free cell ---
      eventType = "block";
      const occupiedKeys = new Set(s.units.map((u) => posKey(u.position)));
      const freeCells: Position[] = [];
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          const cell = s.board[y][x];
          if (
            cell.type === "empty" &&
            !occupiedKeys.has(posKey({ x, y }))
          ) {
            freeCells.push({ x, y });
          }
        }
      }
      if (freeCells.length > 0) {
        const idx = Math.floor(Math.random() * freeCells.length);
        const pos = freeCells[idx];
        s.board[pos.y][pos.x] = {
          type: "temp_obstacle",
          tempObstacleExpiry: s.turnNumber + 1,
        };
      }
    }

    s.events = [
      ...s.events,
      { type: eventType, turnNumber: s.turnNumber, affectedEntities: [] },
    ];
  }

  // =========================================================================
  // STEP 3 (6.4) — Crystal spawn every 4 turns
  // =========================================================================
  if (s.turnNumber % 4 === 0) {
    let crystalCount = 0;
    for (const row of s.board) {
      for (const cell of row) {
        if (cell.type === "crystal") crystalCount++;
      }
    }

    if (crystalCount < 10) {
      const occupiedKeys = new Set(s.units.map((u) => posKey(u.position)));
      const projKeys = new Set(s.projectiles.map((p) => posKey(p.position)));
      const freeCells: Position[] = [];
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (
            s.board[y][x].type === "empty" &&
            !occupiedKeys.has(posKey({ x, y })) &&
            !projKeys.has(posKey({ x, y }))
          ) {
            freeCells.push({ x, y });
          }
        }
      }
      if (freeCells.length > 0) {
        const idx = Math.floor(Math.random() * freeCells.length);
        const pos = freeCells[idx];
        s.board[pos.y][pos.x] = { type: "crystal", crystalValue: 1 };
      }
    }
  }

  // =========================================================================
  // STEP 5 — Apply player action
  // =========================================================================
  const activeId = req.playerId;
  const mageIdx = s.units.findIndex(
    (u) => u.type === "mage" && u.owner === activeId
  );
  const mage = s.units[mageIdx];

  switch (req.action) {
    // -----------------------------------------------------------------------
    // 5a (6.5) — move
    // -----------------------------------------------------------------------
    case "move": {
      const dir = req.target as Direction;
      const newPos = neighbour(mage.position, dir);

      // Update unit position
      const updatedUnits = s.units.map((u, i) =>
        i === mageIdx ? { ...u, position: newPos } : u
      );

      s.units = updatedUnits;
      s.players = {
        ...s.players,
        [activeId]: { ...s.players[activeId], position: newPos },
      };
      break;
    }

    // -----------------------------------------------------------------------
    // 5b (6.6) — collect
    // -----------------------------------------------------------------------
    case "collect": {
      const mp = mage.position;
      const gain = s.crystalDoubleActive ? 2 : 1;

      s.board[mp.y][mp.x] = { type: "empty" };
      s.players = {
        ...s.players,
        [activeId]: {
          ...s.players[activeId],
          crystals: s.players[activeId].crystals + gain,
          mana: s.players[activeId].mana + 2,
        },
      };
      if (s.crystalDoubleActive) {
        s.crystalDoubleActive = false;
      }
      break;
    }

    // -----------------------------------------------------------------------
    // 5c (6.7) — summon
    // -----------------------------------------------------------------------
    case "summon": {
      const occupiedKeys = new Set(s.units.map((u) => posKey(u.position)));
      let spawnPos: Position | null = null;

      for (const dir of PRIORITY_DIRS) {
        const nb = neighbour(mage.position, dir);
        if (!inBounds(nb)) continue;
        const cell = s.board[nb.y][nb.x];
        if (isCellBlocked(cell)) continue;
        if (occupiedKeys.has(posKey(nb))) continue;
        spawnPos = nb;
        break;
      }

      if (spawnPos) {
        const minion: Unit = {
          id: `${activeId.toLowerCase()}-minion-${Date.now()}`,
          type: "minion",
          owner: activeId,
          position: spawnPos,
          hp: 3,
          armor: 0,
        };
        s.units = [...s.units, minion];
        s.players = {
          ...s.players,
          [activeId]: {
            ...s.players[activeId],
            mana: s.players[activeId].mana - 2,
          },
        };
      }
      break;
    }

    // -----------------------------------------------------------------------
    // 5d (6.8) — spell
    // -----------------------------------------------------------------------
    case "spell": {
      const dir = req.target as Direction;
      const adjPos = neighbour(mage.position, dir);
      const opponentId: PlayerId = activeId === "P1" ? "P2" : "P1";

      // Check if there's an enemy unit at the adjacent cell
      const enemyIdx = inBounds(adjPos)
        ? s.units.findIndex(
            (u) =>
              u.owner === opponentId &&
              u.position.x === adjPos.x &&
              u.position.y === adjPos.y
          )
        : -1;

      if (enemyIdx !== -1) {
        // Hit immediately — no projectile
        const enemy = s.units[enemyIdx];
        const damaged = applyDamage(enemy, 3);
        if (damaged.hp <= 0) {
          s.units = s.units.filter((_, i) => i !== enemyIdx);
        } else {
          s.units = s.units.map((u, i) => (i === enemyIdx ? damaged : u));
        }
      } else {
        // Create projectile (even if out-of-bounds — engine step 6 will remove it)
        if (inBounds(adjPos)) {
          s.projectiles = [
            ...s.projectiles,
            {
              id: randomUUID(),
              owner: activeId,
              position: adjPos,
              direction: dir,
            },
          ];
        }
      }

      s.players = {
        ...s.players,
        [activeId]: {
          ...s.players[activeId],
          mana: s.players[activeId].mana - 3,
        },
      };
      break;
    }

    // -----------------------------------------------------------------------
    // 5e (6.9) — attack
    // -----------------------------------------------------------------------
    case "attack": {
      const opponentId: PlayerId = activeId === "P1" ? "P2" : "P1";
      let targetIdx = -1;

      for (const dir of PRIORITY_DIRS) {
        const nb = neighbour(mage.position, dir);
        if (!inBounds(nb)) continue;
        const idx = s.units.findIndex(
          (u) =>
            u.owner === opponentId &&
            u.position.x === nb.x &&
            u.position.y === nb.y
        );
        if (idx !== -1) {
          targetIdx = idx;
          break;
        }
      }

      if (targetIdx !== -1) {
        const target = s.units[targetIdx];
        const damage = Math.max(2 - target.armor, 1);
        const damaged = applyDamage(target, damage);
        if (damaged.hp <= 0) {
          s.units = s.units.filter((_, i) => i !== targetIdx);
        } else {
          s.units = s.units.map((u, i) => (i === targetIdx ? damaged : u));
        }
      }

      s.players = {
        ...s.players,
        [activeId]: {
          ...s.players[activeId],
          mana: s.players[activeId].mana - 1,
        },
      };
      break;
    }

    // -----------------------------------------------------------------------
    // 5f (6.10) — defend
    // -----------------------------------------------------------------------
    case "defend": {
      s.players = {
        ...s.players,
        [activeId]: {
          ...s.players[activeId],
          armor: 2,
        },
      };
      // Also set armor on the mage unit
      s.units = s.units.map((u, i) =>
        i === mageIdx ? { ...u, armor: 2 } : u
      );
      break;
    }
  }

  // =========================================================================
  // STEP 6 (6.11) — Move projectiles and resolve impacts
  // =========================================================================
  const survivingProjectiles = [];
  for (const proj of s.projectiles) {
    const newPos = neighbour(proj.position, proj.direction);

    // Out of bounds — discard
    if (!inBounds(newPos)) continue;

    // Check for enemy unit at new position
    const opponentId: PlayerId = proj.owner === "P1" ? "P2" : "P1";
    const hitIdx = s.units.findIndex(
      (u) =>
        u.owner === opponentId &&
        u.position.x === newPos.x &&
        u.position.y === newPos.y
    );

    if (hitIdx !== -1) {
      // Apply 3 damage; eliminate if hp <= 0
      const hit = s.units[hitIdx];
      const damaged = applyDamage(hit, 3);
      if (damaged.hp <= 0) {
        s.units = s.units.filter((_, i) => i !== hitIdx);
      } else {
        s.units = s.units.map((u, i) => (i === hitIdx ? damaged : u));
      }
      // Projectile is consumed — do NOT add to surviving list
    } else {
      // Move the projectile
      survivingProjectiles.push({ ...proj, position: newPos });
    }
  }
  s.projectiles = survivingProjectiles;

  // =========================================================================
  // STEP 7 (6.12) — Move active player's Minions toward enemy Core
  // =========================================================================
  const enemyCorePos: Position =
    activeId === "P1" ? { ...CORE_P2 } : { ...CORE_P1 };

  // Sort by id ascending for deterministic order
  const minionIndices = s.units
    .map((u, i) => ({ u, i }))
    .filter(({ u }) => u.type === "minion" && u.owner === activeId)
    .sort((a, b) => a.u.id.localeCompare(b.u.id))
    .map(({ i }) => i);

  for (const idx of minionIndices) {
    const minion = s.units[idx];
    if (!minion) continue; // may have been removed by core damage

    const currentDist = manhattan(minion.position, enemyCorePos);
    let bestDir: Direction | null = null;
    let bestDist = currentDist;

    for (const dir of PRIORITY_DIRS) {
      const nb = neighbour(minion.position, dir);
      if (!inBounds(nb)) continue;
      const cell = s.board[nb.y][nb.x];
      if (isCellBlocked(cell)) continue;
      // Check if occupied by any unit (except the enemy core — minion can "step on" it)
      const isCore =
        nb.x === enemyCorePos.x && nb.y === enemyCorePos.y;
      if (!isCore && s.units.some((u) => u.position.x === nb.x && u.position.y === nb.y)) {
        continue;
      }
      const d = manhattan(nb, enemyCorePos);
      if (d < bestDist) {
        bestDist = d;
        bestDir = dir;
      }
    }

    if (bestDir !== null) {
      const newMinionPos = neighbour(minion.position, bestDir);

      // Check if the minion reached the enemy core
      if (
        newMinionPos.x === enemyCorePos.x &&
        newMinionPos.y === enemyCorePos.y
      ) {
        // Deal 1 damage to the enemy core and eliminate the minion
        const coreIdx = s.units.findIndex(
          (u) => u.type === "core" && u.owner !== activeId
        );
        if (coreIdx !== -1) {
          const core = s.units[coreIdx];
          const damagedCore = applyDamage(core, 1);
          if (damagedCore.hp <= 0) {
            s.units = s.units.filter((_, i) => i !== coreIdx);
          } else {
            s.units = s.units.map((u, i) =>
              i === coreIdx ? damagedCore : u
            );
          }
        }
        // Remove the minion
        s.units = s.units.filter((_, i) => i !== idx);
      } else {
        // Move the minion
        s.units = s.units.map((u, i) =>
          i === idx ? { ...u, position: newMinionPos } : u
        );
      }
    }
  }

  // =========================================================================
  // STEP 8 (6.13) — Check win / draw condition
  // =========================================================================
  const coreP1 = s.units.find((u) => u.id === "p1-core");
  const coreP2 = s.units.find((u) => u.id === "p2-core");
  const mageP1 = s.units.find((u) => u.type === "mage" && u.owner === "P1");
  const mageP2 = s.units.find((u) => u.type === "mage" && u.owner === "P2");
  const p1CoreHp = coreP1 ? coreP1.hp : 0;
  const p2CoreHp = coreP2 ? coreP2.hp : 0;
  const p1Defeated = !mageP1 || p1CoreHp <= 0;
  const p2Defeated = !mageP2 || p2CoreHp <= 0;

  if (p1Defeated || p2Defeated) {
    s.status = "finished";
    if (p1Defeated && p2Defeated) {
      s.winner = "draw";
    } else if (p1Defeated) {
      s.winner = "P2";
    } else {
      s.winner = "P1";
    }
  } else if (s.turnNumber === 30) {
    s.status = "finished";
    const c1 = s.players.P1.crystals;
    const c2 = s.players.P2.crystals;
    if (c1 > c2) s.winner = "P1";
    else if (c2 > c1) s.winner = "P2";
    else s.winner = "draw";
  }

  // =========================================================================
  // STEP 9 (6.14) — Reset armor, record history, advance turn
  // =========================================================================
  // Reset armor of the active player
  s.players = {
    ...s.players,
    [activeId]: { ...s.players[activeId], armor: 0 },
  };
  // Also reset armor on the mage unit (unless defend was just used — but
  // armor is already applied to the PlayerState; unit armor resets here)
  s.units = s.units.map((u) =>
    u.type === "mage" && u.owner === activeId ? { ...u, armor: 0 } : u
  );

  // Append history entry
  s.history = [
    ...s.history,
    {
      player: activeId,
      action: req.action,
      turnNumber: s.turnNumber,
      timestamp: new Date().toISOString(),
    },
  ];

  // Advance turn and turnNumber
  s.turn = activeId === "P1" ? "P2" : "P1";
  s.turnNumber = s.turnNumber + 1;

  return s;
}
