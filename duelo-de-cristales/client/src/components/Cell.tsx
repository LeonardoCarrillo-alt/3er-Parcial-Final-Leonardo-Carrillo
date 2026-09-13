import type { ReactNode } from "react";
import type {
  Cell as CellType,
  Unit,
  Projectile,
  SpellEffect,
} from "../types/game";
import mageBlue from "../assets/Text to Image-1789058205000.png";
import mageRed from "../assets/image_7290316.png";
import obstacle from "../assets/image_7290514.png";
import spellFx from "../assets/image_7290478.png";
import coreP1 from "../assets/image_7290380.png";
import coreP2 from "../assets/image_7290403.png";
import crystalSprite from "../assets/image_7290421.png";
import minionSprite from "../assets/image_7290444.png";

interface CellProps {
  cell: CellType;
  units: Unit[];
  projectiles: Projectile[];
  x: number;
  y: number;
  effect?: SpellEffect | null;
}

export function Cell({ cell, units, projectiles, x, y, effect }: CellProps) {
  // Priority: unit > projectile > cell type
  const unit = units.find((u) => u.position.x === x && u.position.y === y);
  const projectile = !unit
    ? projectiles.find((p) => p.position.x === x && p.position.y === y)
    : undefined;

  let className = "cell";
  let testId = "cell-empty";
  let content: ReactNode = null;

  if (unit) {
    if (unit.type === "core") {
      if (unit.owner === "P1") {
        className += " cell-unit cell-core-p1";
        testId = "cell-core-p1";
        content = <img className="core-sprite" src={coreP1} alt="Núcleo P1" />;
      } else {
        className += " cell-unit cell-core-p2";
        testId = "cell-core-p2";
        content = <img className="core-sprite" src={coreP2} alt="Núcleo P2" />;
      }
    } else if (unit.type === "mage") {
      if (unit.owner === "P1") {
        className += " cell-unit cell-mage-p1";
        testId = "cell-mage-p1";
        content = (
          <>
            <img className="mage-sprite" src={mageBlue} alt="Mago P1" />
            <span className="unit-hp">{unit.hp}</span>
          </>
        );
      } else {
        className += " cell-unit cell-mage-p2";
        testId = "cell-mage-p2";
        content = (
          <>
            <img className="mage-sprite" src={mageRed} alt="Mago P2" />
            <span className="unit-hp">{unit.hp}</span>
          </>
        );
      }
    } else {
      if (unit.owner === "P1") {
        className += " cell-unit cell-minion-p1";
        testId = "cell-minion-p1";
        content = (
          <img className="minion-sprite" src={minionSprite} alt="Súbdito P1" />
        );
      } else {
        className += " cell-unit cell-minion-p2";
        testId = "cell-minion-p2";
        content = (
          <img className="minion-sprite" src={minionSprite} alt="Súbdito P2" />
        );
      }
    }
  } else if (projectile) {
    if (projectile.owner === "P1") {
      className += " cell-projectile cell-proj-p1";
      testId = "cell-projectile-p1";
      content = (
        <img className="projectile-sprite" src={spellFx} alt="Proyectil P1" />
      );
    } else {
      className += " cell-projectile cell-proj-p2";
      testId = "cell-projectile-p2";
      content = (
        <img className="projectile-sprite" src={spellFx} alt="Proyectil P2" />
      );
    }
  } else {
    switch (cell.type) {
      case "crystal":
        className += " cell-crystal";
        testId = "cell-crystal";
        content = (
          <img className="crystal-sprite" src={crystalSprite} alt="Cristal" />
        );
        break;
      case "obstacle":
        className += " cell-obstacle";
        testId = "cell-obstacle";
        content = (
          <img className="obstacle-sprite" src={obstacle} alt="Obstacle" />
        );
        break;
      case "temp_obstacle":
        className += " cell-temp-obstacle";
        testId = "cell-temp-obstacle";
        content = (
          <img className="obstacle-sprite" src={obstacle} alt="Obstáculo temporal" />
        );
        break;
      default:
        className += " cell-empty";
        break;
    }
  }

  return (
    <div className={className} data-testid={testId}>
      {content}
      {effect && (
        <div className="spell-overlay" data-testid="spell-overlay">
          <img className="spell-sprite" src={spellFx} alt="Hechizo" />
        </div>
      )}
    </div>
  );
}