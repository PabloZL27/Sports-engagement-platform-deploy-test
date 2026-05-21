import { useMemo, useState } from "react";
import willCard from "../../assets/team/Will.png";
import derickCard from "../../assets/team/Derick.png";
import deandreCard from "../../assets/team/Deandre.png";

type CardRarity = "Elite" | "Titans" | "Rare";

interface PlayerCard {
  id: number;
  name: string;
  position: string;
  rarity: CardRarity;
  image: string;
}

const players: PlayerCard[] = [
  {
    id: 1,
    name: "Will Levis",
    position: "QB",
    rarity: "Elite",
    image: willCard,
  },
  {
    id: 2,
    name: "Derrick Henry",
    position: "RB",
    rarity: "Titans",
    image: derickCard,
  },
  {
    id: 3,
    name: "DeAndre Hopkins",
    position: "WR",
    rarity: "Rare",
    image: deandreCard,
  },
];

function TeamCardsDemo() {
  const [unlocked, setUnlocked] = useState<number[]>([]);
  const [showStats, setShowStats] = useState<number[]>([]);

  const unlockedSet = useMemo(() => new Set(unlocked), [unlocked]);
  const statsSet = useMemo(() => new Set(showStats), [showStats]);

  function unlockCard(id: number) {
    setUnlocked((previous) => {
      if (previous.includes(id)) {
        return previous.filter((cardId) => cardId !== id);
      }

      return [...previous, id];
    });

    setShowStats((previous) => previous.filter((cardId) => cardId !== id));
  }

  function toggleStats(id: number) {
    setShowStats((previous) =>
      previous.includes(id)
        ? previous.filter((cardId) => cardId !== id)
        : [...previous, id],
    );
  }

  return (
    <section className="team-cards-panel">
      <header className="team-cards-header">
        <div>
          <p className="team-cards-kicker">TEAM COLLECTION</p>
        </div>
        <div className="team-cards-accent" />
      </header>

      <div className="team-cards-grid">
        {players.map((player) => {
          const isUnlocked = unlockedSet.has(player.id);
          const isFlipped = statsSet.has(player.id);

          return (
            <article
              key={player.id}
              className={`team-card-shell team-card-shell-${player.rarity.toLowerCase()} ${
                isUnlocked ? "team-card-shell-unlocked" : ""
              }`}
            >
              <div className="team-card-chrome" />
              <div className="team-card-frame" />

              <div className="team-card-body">
                <div className="team-card-badge-row">
                  <span className="team-card-badge">{player.rarity}</span>
                </div>

                <div className="team-card-stage">
                  <div
                    className={`team-card-flip ${isFlipped ? "team-card-flip-active" : ""} ${
                      isUnlocked ? "team-card-flip-unlocked" : ""
                    }`}
                  >
                    <div className="team-card-face team-card-face-front">
                      <img
                        src={player.image}
                        alt={player.name}
                        className={`team-card-image ${
                          isUnlocked ? "team-card-image-live" : "team-card-image-locked"
                        }`}
                      />

                      <div className="team-card-image-glow" />
                      <div className="team-card-caption">
                        <p className="team-card-position">{player.position}</p>
                        <p className="team-card-name">{player.name}</p>
                      </div>
                    </div>

                    <div className="team-card-face team-card-face-back">
                      <div className="team-card-stats-center">
                        <p className="team-card-stats-label">STATS</p>
                      </div>
                    </div>
                  </div>

                  {!isUnlocked ? (
                    <div className="team-card-lock">
                      <div className="team-card-lock-box">
                        <p className="team-card-lock-icon">LOCK</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="team-card-actions">
                  <button
                    type="button"
                    onClick={() => unlockCard(player.id)}
                    className={`team-card-action team-card-action-primary ${
                      isUnlocked ? "team-card-action-primary-active" : ""
                    }`}
                  >
                    {isUnlocked ? "Lock" : "Unlock"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStats(player.id)}
                    disabled={!isUnlocked}
                    className="team-card-action team-card-action-secondary"
                  >
                    {isFlipped ? "Hide Stats" : "View Stats"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default TeamCardsDemo;
