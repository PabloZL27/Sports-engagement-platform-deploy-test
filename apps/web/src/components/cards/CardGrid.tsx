import PlayerCard from "./PlayerCard";
import LockedCard from "./LockedCard";
import type { RosterCard } from "../../types";

interface CardGridProps {
  cards: RosterCard[];
  onViewStats: (athleteId: number) => void;
}

export default function CardGrid({ cards, onViewStats }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400 text-lg">No cards found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {cards.map((card) =>
        card.unlocked ? (
          <PlayerCard key={card.card_id} card={card} onViewStats={onViewStats} />
        ) : (
          <LockedCard key={card.card_id} card={card} />
        )
      )}
    </div>
  );
}
