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
    <article className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:rounded-[24px]">
      <div className="relative h-[180px] overflow-hidden bg-[linear-gradient(135deg,#153865_0%,#4B92DB_100%)] sm:h-[240px] lg:h-[292px]">
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

      <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
        <div className="space-y-2 sm:space-y-2.5">
          <p className="text-[11px] font-medium text-slate-400 sm:text-[12px]">
            {player.era}
          </p>
          <h3 className="text-lg font-semibold leading-[1.08] tracking-[-0.02em] text-[#0C2340] sm:text-[24px]">
            {player.name}
          </h3>
          <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-500 sm:line-clamp-1 sm:text-[13px]">
            {player.subtitle}
          </p>
        </div>

        <button
          aria-label={`Open profile for ${player.name}`}
          className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-semibold text-[#0C2340] transition hover:border-[#0C2340] hover:bg-slate-50 sm:h-10 sm:text-[12px]"
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
