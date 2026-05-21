import RarityBadge from "./RarityBadge";
import {
  RARITY_HEADSHOT_BACKDROP,
  RARITY_HEADSHOT_IMAGE_OPACITY,
} from "./cardLayout";
import { useRosterHeadshotSrc } from "../../hooks/useRosterHeadshotSrc";
import { hasJerseyNumber, positionAndJersey } from "../../utils/jerseyDisplay";
import type { RosterCard } from "../../types";

interface PlayerCardProps {
  card: RosterCard;
  onViewStats: (athleteId: number) => void;
}

const rarityBorder: Record<string, string> = {
  common: "border-gray-400",
  rare: "border-blue-500",
  elite: "border-purple-500",
  titan: "border-red-600",
};

const rarityGlow: Record<string, string> = {
  common: "",
  rare: "shadow-blue-500/20",
  elite: "shadow-purple-500/30",
  titan: "shadow-red-500/40",
};

const rarityBackTint: Record<string, string> = {
  common: "from-[#1a2332] via-[#0f1b2d] to-[#0a121f]",
  rare: "from-[#0f2847] via-[#0f3053] to-[#0a1f38]",
  elite: "from-[#2a1f47] via-[#1a1740] to-[#0f1428]",
  titan: "from-[#3a1528] via-[#1a1538] to-[#0d1220]",
};

function formatHeightInches(totalInches: number): string {
  const n = Math.round(totalInches);
  const ft = Math.floor(n / 12);
  const inch = n % 12;
  return `${ft}'${inch}"`;
}

function StatBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-center backdrop-blur-[2px]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-white sm:text-lg">{value}</p>
    </div>
  );
}

export default function PlayerCard({ card, onViewStats }: PlayerCardProps) {
  const {
    src: headshotSrc,
    showPlaceholder,
    onImgError,
    onImgLoad,
    loaded,
    attemptKey,
  } = useRosterHeadshotSrc(card);
  const ageLabel =
    card.age != null && !Number.isNaN(Number(card.age)) ? String(card.age) : "—";
  const heightLabel =
    card.height != null && !Number.isNaN(Number(card.height))
      ? formatHeightInches(Number(card.height))
      : "—";
  const weightLabel =
    card.weight != null && !Number.isNaN(Number(card.weight))
      ? `${Math.round(Number(card.weight))} lbs`
      : "—";

  const borderGlow = `${rarityBorder[card.rarity]} ${rarityGlow[card.rarity]}`;

  return (
    <article
      className="group relative mx-auto w-full max-w-sm [perspective:1200px]"
      aria-label={`${card.display_name} card. Hover to flip for vitals.`}
    >
      <div
        className={`relative aspect-[3/4] w-full rounded-xl border-2 bg-gradient-to-b from-gray-900 to-gray-800 shadow-lg transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] will-change-transform motion-reduce:duration-200 ${borderGlow} [@media(hover:hover)]:group-hover:[transform:rotateY(180deg)_scale(1.03)] [@media(hover:hover)]:group-hover:shadow-2xl motion-reduce:[@media(hover:hover)]:group-hover:[transform:none]`}
      >
        {/* Front — translateZ evita que hijos con su propia capa (img, z-index) ignoren backface-visibility */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden rounded-[10px] [transform:rotateY(0deg)_translateZ(1px)] [backface-visibility:hidden]"
          style={{ WebkitBackfaceVisibility: "hidden" }}
        >
          <div className="absolute top-2 right-2 z-10">
            <RarityBadge rarity={card.rarity} size="md" />
          </div>
          {hasJerseyNumber(card.jersey_num) ? (
            <div className="absolute top-2 left-3 z-10">
              <span className="text-2xl font-bold tabular-nums text-white/80">
                {Math.trunc(Number(card.jersey_num))}
              </span>
            </div>
          ) : null}

          <div className="relative isolate min-h-0 flex-1 basis-0 overflow-hidden">
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
                className={`absolute inset-0 z-[1] h-full w-full object-cover object-top [transform:translate3d(0,0,0.02px)] [backface-visibility:hidden] ${RARITY_HEADSHOT_IMAGE_OPACITY[card.rarity]} ${loaded ? "opacity-100" : "opacity-0"}`}
                style={{ WebkitBackfaceVisibility: "hidden" }}
              />
            ) : null}

            {/* Placeholder mientras carga / o si se agotaron URLs */}
            {showPlaceholder || !loaded ? (
              <div className="absolute inset-0 z-[1] flex items-center justify-center">
                <div className="flex size-24 items-center justify-center rounded-full bg-black/35 ring-2 ring-white/20 backdrop-blur-[2px]">
                  <span className="text-3xl font-bold text-white">
                    {card.display_name.charAt(0)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative z-[1] shrink-0">
            {/* Fuera del flujo de la barra para igualar altura con LockedCard */}
            <p className="pointer-events-none absolute bottom-full left-0 right-0 z-20 hidden px-3 pb-1 text-center text-[10px] font-medium uppercase tracking-wider text-gray-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] [@media(hover:hover)]:block motion-reduce:[@media(hover:hover)]:hidden">
              Hover to flip
            </p>
            <div className="bg-[#0f1b2d] px-3 py-2.5 text-center">
              <p className="line-clamp-2 text-sm font-bold uppercase tracking-wide text-white">
                {card.display_name}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{positionAndJersey(card.position, card.jersey_num)}</p>
              <p className="mt-1.5 block text-[10px] leading-snug text-gray-400 [@media(hover:hover)]:hidden motion-reduce:[@media(hover:hover)]:block">
                {ageLabel} yrs · {heightLabel} · {weightLabel}
              </p>
              <button
                type="button"
                className="mt-2 hidden w-full rounded-lg bg-[#4B90CD] py-2 text-sm font-semibold text-white [@media(hover:none)]:block motion-reduce:[@media(hover:hover)]:block"
                onClick={() => onViewStats(card.athlete_id)}
              >
                Full stats
              </button>
            </div>
          </div>
        </div>

        {/* Back — vitals */}
        <div
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-[10px] bg-gradient-to-br px-3 py-3 [transform:rotateY(180deg)_translateZ(1px)] [backface-visibility:hidden] ${rarityBackTint[card.rarity]}`}
          style={{ WebkitBackfaceVisibility: "hidden" }}
        >
          <div className="mb-2 flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0 pr-1">
              <p className="line-clamp-2 text-lg font-bold uppercase leading-snug tracking-wide text-white sm:text-xl">
                {card.display_name}
              </p>
              <p className="mt-1 text-sm text-gray-400">{positionAndJersey(card.position, card.jersey_num)}</p>
            </div>
            <RarityBadge rarity={card.rarity} size="lg" />
          </div>

          <p className="mb-2 shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-500">
            Vitals
          </p>

          <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
            <StatBlock label="Age" value={ageLabel} />
            <StatBlock label="Height" value={heightLabel} />
            <StatBlock label="Weight" value={weightLabel} />
          </div>

          <div className="mt-2 shrink-0">
            <button
              type="button"
              className="w-full rounded-lg bg-[#4B90CD] py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#3a7ab8] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              onClick={() => onViewStats(card.athlete_id)}
            >
              Full stats
            </button>
            <p className="mt-1.5 text-center text-[10px] text-gray-500">
              Season totals &amp; career detail
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
