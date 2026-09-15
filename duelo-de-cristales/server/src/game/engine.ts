// Duelo de Cristales — Game Engine
// applyAction: valida acciones y maneja los turnos

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

const CORE_P1: Position = { x: 0, y: 0 };
const CORE_P2: Position = { x: 9, y: 9 };

const DIRECTION_DELTA: Record<Direction, Position> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east:  { x: 1, y: 0 },
  west:  { x: -1, y: 0 },
};

const PRIORITY_DIRS: Direction[] = ["north", "east", "south", "west"];


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

function applyDamage(unit: Unit, damage: number): Unit {
  return { ...unit, hp: unit.hp - damage };
}

function isCellBlocked(cell: Cell): boolean {
  return cell.type === "obstacle" || cell.type === "temp_obstacle";
}


export function applyAction(state: GameState, req: ActionRequest): GameState {
  let s: GameState = structuredClone(state);

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

  if (Math.random() < 0.1) {
    const roll = Math.random();
    let eventType: EventType;

    if (roll < 1 / 3) {
      eventType = "storm";
      s.players = {
        P1: { ...s.players.P1, mana: Math.max(0, s.players.P1.mana - 1) },
        P2: { ...s.players.P2, mana: Math.max(0, s.players.P2.mana - 1) },
      };
    } else if (roll < 2 / 3) {
      eventType = "crystal_double";
      s.crystalDoubleActive = true;
    } else {
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

  //cada 4 turnos aparece un cristal
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

  //acciones del jugador
  const activeId = req.playerId;
  const mageIdx = s.units.findIndex(
    (u) => u.type === "mage" && u.owner === activeId
  );
  const mage = s.units[mageIdx];

  switch (req.action) {
    case "move": {
      const dir = req.target as Direction;
      const newPos = neighbour(mage.position, dir);

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

    case "defend": {
      s.players = {
        ...s.players,
        [activeId]: {
          ...s.players[activeId],
          armor: 2,
        },
      };
      s.units = s.units.map((u, i) =>
        i === mageIdx ? { ...u, armor: 2 } : u
      );
      break;
    }
  }

  const survivingProjectiles = [];
  for (const proj of s.projectiles) {
    const newPos = neighbour(proj.position, proj.direction);

    // fuera del tablero, lo descarta
    if (!inBounds(newPos)) continue;

    // revisa subdito en una nueva posicion
    const opponentId: PlayerId = proj.owner === "P1" ? "P2" : "P1";
    const hitIdx = s.units.findIndex(
      (u) =>
        u.owner === opponentId &&
        u.position.x === newPos.x &&
        u.position.y === newPos.y
    );

    if (hitIdx !== -1) {
    // aplica 3 de daño
      const hit = s.units[hitIdx];
      const damaged = applyDamage(hit, 3);
      if (damaged.hp <= 0) {
        s.units = s.units.filter((_, i) => i !== hitIdx);
      } else {
        s.units = s.units.map((u, i) => (i === hitIdx ? damaged : u));
      }
    } else {
      // movimiento proyectil
      survivingProjectiles.push({ ...proj, position: newPos });
    }
  }
  s.projectiles = survivingProjectiles;

  const enemyCorePos: Position =
    activeId === "P1" ? { ...CORE_P2 } : { ...CORE_P1 };

  // posicion de los subditos del jugador actual
  const minionIndices = s.units
    .map((u, i) => ({ u, i }))
    .filter(({ u }) => u.type === "minion" && u.owner === activeId)
    .sort((a, b) => a.u.id.localeCompare(b.u.id))
    .map(({ i }) => i);

  for (const idx of minionIndices) {
    const minion = s.units[idx];
    if (!minion) continue; 

    const currentDist = manhattan(minion.position, enemyCorePos);
    let bestDir: Direction | null = null;
    let bestDist = currentDist;

    for (const dir of PRIORITY_DIRS) {
      const nb = neighbour(minion.position, dir);
      if (!inBounds(nb)) continue;
      const cell = s.board[nb.y][nb.x];
      if (isCellBlocked(cell)) continue;
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
//manejo de daño subdito
      if (
        newMinionPos.x === enemyCorePos.x &&
        newMinionPos.y === enemyCorePos.y
      ) {
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
        // elimina subdito
        s.units = s.units.filter((_, i) => i !== idx);
      } else {
        // movimiento subdito
        s.units = s.units.map((u, i) =>
          i === idx ? { ...u, position: newMinionPos } : u
        );
      }
    }
  }

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

  s.players = {
    ...s.players,
    [activeId]: { ...s.players[activeId], armor: 0 },
  };
  s.units = s.units.map((u) =>
    u.type === "mage" && u.owner === activeId ? { ...u, armor: 0 } : u
  );

  s.history = [
    ...s.history,
    {
      player: activeId,
      action: req.action,
      turnNumber: s.turnNumber,
      timestamp: new Date().toISOString(),
    },
  ];

  s.turn = activeId === "P1" ? "P2" : "P1";
  s.turnNumber = s.turnNumber + 1;

  return s;
}
