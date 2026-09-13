import type { GameState } from "../types/game";
import coreIcon from "../assets/image_7290542.png";
import manaIcon from "../assets/8-bit_pixel_art_icon_of_a_blue_man_1.png";
import crystalIcon from "../assets/image_7290421.png";

interface HudProps {
  state: GameState;
}

export function Hud({ state }: HudProps) {
  const { players, units, turnNumber, turn } = state;

  const p1Core = units.find((u) => u.id === "p1-core");
  const p2Core = units.find((u) => u.id === "p2-core");

  const p1CoreHp = p1Core?.hp ?? 0;
  const p2CoreHp = p2Core?.hp ?? 0;

  return (
    <div className="hud">
      <div className="hud-stat hud-p1">
        <span className="hud-label">
          <img className="hud-icon" src={coreIcon} alt="" /> Core P1
        </span>
        <span className="hud-value" data-testid="hud-p1-hp">{p1CoreHp}</span>
      </div>

      <div className="hud-stat hud-p1">
        <span className="hud-label">
          <img className="hud-icon" src={manaIcon} alt="" /> Maná P1
        </span>
        <span className="hud-value" data-testid="hud-p1-mana">{players.P1.mana}</span>
      </div>

      <div className="hud-stat hud-p1">
        <span className="hud-label">
          <img className="hud-icon" src={crystalIcon} alt="" /> Cristales P1
        </span>
        <span className="hud-value" data-testid="hud-p1-crystals">{players.P1.crystals}</span>
      </div>

      <div className="hud-stat">
        <span className="hud-hidden" data-testid="hud-turn">{turnNumber}</span>
        <span className="hud-hidden" data-testid="hud-active-player">{turn}</span>
      </div>

      <div className="hud-stat hud-p2">
        <span className="hud-label">
          <img className="hud-icon" src={crystalIcon} alt="" /> Cristales P2
        </span>
        <span className="hud-value" data-testid="hud-p2-crystals">{players.P2.crystals}</span>
      </div>

      <div className="hud-stat hud-p2">
        <span className="hud-label">
          <img className="hud-icon" src={manaIcon} alt="" /> Maná P2
        </span>
        <span className="hud-value" data-testid="hud-p2-mana">{players.P2.mana}</span>
      </div>

      <div className="hud-stat hud-p2">
        <span className="hud-label">
          <img className="hud-icon" src={coreIcon} alt="" /> Core P2
        </span>
        <span className="hud-value" data-testid="hud-p2-hp">{p2CoreHp}</span>
      </div>
    </div>
  );
}