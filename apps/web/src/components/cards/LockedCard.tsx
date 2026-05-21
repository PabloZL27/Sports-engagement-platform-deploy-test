import {
  RARITY_HEADSHOT_BACKDROP,
  RARITY_HEADSHOT_IMAGE_OPACITY,
} from "./cardLayout";
import { useRosterHeadshotSrc } from "../../hooks/useRosterHeadshotSrc";
import { positionAndJersey } from "../../utils/jerseyDisplay";
import type { RosterCard } from "../../types";

interface LockedCardProps {
  card: RosterCard;
}

export default function LockedCard({ card }: LockedCardProps) {
  const {
    src: headshotSrc,
    showPlaceholder,
    onImgError,
    onImgLoad,
    loaded,
    attemptKey,
  } = useRosterHeadshotSrc(card);

  return (
    <article className="relative mx-auto w-full max-w-sm">
      {/* Misma caja 3:4 que PlayerCard: retrato + barra dentro del aspect-ratio */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#0f1b2d] shadow-lg ring-2 ring-inset ring-gray-600">
        <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="relative isolate min-h-0 flex-1 basis-0 overflow-hidden bg-[#0f1b2d]">
            <div
              className={`absolute inset-0 z-0 ${RARITY_HEADSHOT_BACKDROP[card.rarity]}`}
              aria-hidden
            />
            {headshotSrc ? (
              <img
                key={attemptKey}
                src={headshotSrc}
                alt={card.display_name}
                loading="lazy"
                decoding="async"
                onError={onImgError}
                onLoad={onImgLoad}
                className={`absolute inset-0 z-[1] h-full w-full object-cover object-top [transform:translate3d(0,0,0.02px)] [backface-visibility:hidden] brightness-[0.28] grayscale ${RARITY_HEADSHOT_IMAGE_OPACITY[card.rarity]} ${loaded ? "opacity-100" : "opacity-0"}`}
                style={{ WebkitBackfaceVisibility: "hidden" }}
              />
            ) : null}

            {showPlaceholder || !loaded ? (
              <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/25" aria-hidden>
                <span className="text-5xl font-bold text-white/20">
                  {card.display_name.charAt(0)}
                </span>
              </div>
            ) : null}

            <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center bg-black/40">
              <div className="mb-2 flex size-14 items-center justify-center rounded-xl border-2 border-gray-500/50 bg-gray-700/80 backdrop-blur-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-7 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-300">
                Locked
              </span>
            </div>
          </div>

          <div className="relative z-[1] shrink-0 bg-[#0f1b2d] px-3 py-2.5 text-center">
            <p className="line-clamp-2 text-sm font-bold uppercase tracking-wide text-gray-400">
              {card.display_name}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{positionAndJersey(card.position, card.jersey_num)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
