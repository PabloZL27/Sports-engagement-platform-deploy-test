import { useEffect, useState } from "react";
import type { LegendaryPlayer } from "../../types/history";
import { getObjectPosition } from "./historyMedia";

type LegendaryPlayerCardProps = {
  player: LegendaryPlayer;
  onOpenProfile: (player: LegendaryPlayer) => void;
};

function LegendaryPlayerCard({
  player,
  onOpenProfile,
}: LegendaryPlayerCardProps) {
  const [showFallback, setShowFallback] = useState(!player.imageUrl);
  const objectPosition = getObjectPosition(player.cardImagePositionClass) ?? "center 18%";

  useEffect(() => {
    setShowFallback(!player.imageUrl);
  }, [player.id, player.imageUrl]);

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
      <div className="relative h-[292px] overflow-hidden bg-[linear-gradient(135deg,#153865_0%,#4B92DB_100%)]">
        {!showFallback && player.imageUrl ? (
          <img
            alt={player.name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setShowFallback(true)}
            src={player.imageUrl}
            style={{ objectPosition }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,35,64,0.02)_0%,rgba(12,35,64,0.24)_100%)]" />
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2.5">
          <p className="text-[12px] font-medium text-slate-400">
            {player.era}
          </p>
          <h3 className="text-[24px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#0C2340]">
            {player.name}
          </h3>
          <p className="line-clamp-1 text-[13px] leading-relaxed text-slate-500">
            {player.subtitle}
          </p>
        </div>

        <button
          aria-label={`Open profile for ${player.name}`}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-[#0C2340] transition hover:border-[#0C2340] hover:bg-slate-50"
          onClick={() => onOpenProfile(player)}
          type="button"
        >
          View Profile
        </button>
      </div>
    </article>
  );
}

export default LegendaryPlayerCard;
