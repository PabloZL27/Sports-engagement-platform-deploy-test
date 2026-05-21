import type { CollectionStats } from "../../types";

interface CollectionHeaderProps {
  stats: CollectionStats | null;
}

export default function CollectionHeader({ stats }: CollectionHeaderProps) {
  return (
    <div className="pt-4">
      <h1 className="text-4xl font-black text-[#0f1b2d] tracking-tight uppercase">
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
