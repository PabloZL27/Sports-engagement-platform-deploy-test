import type { CollectionStats } from "../../types";

interface CollectionHeaderProps {
  stats: CollectionStats | null;
}

export default function CollectionHeader({ stats }: CollectionHeaderProps) {
  return (
    <div className="pt-2 sm:pt-4 lg:pt-4">
      <h1 className="text-[clamp(1.5rem,6vw,2.25rem)] font-black uppercase tracking-tight text-[#0f1b2d] lg:text-4xl">
        Titan Roster Cards
      </h1>
      {stats && (
        <p className="text-gray-500 text-sm mt-2">
          {stats.unlocked_cards} / {stats.total_cards} Cards Collected
        </p>
      )}
    </div>
  );
}
