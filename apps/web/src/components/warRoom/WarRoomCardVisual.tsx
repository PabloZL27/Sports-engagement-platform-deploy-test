import RarityBadge from "../cards/RarityBadge";
import {
  RARITY_BORDER,
  RARITY_GLOW,
  RARITY_HEADSHOT_BACKDROP,
  RARITY_HEADSHOT_IMAGE_OPACITY,
  TIER_STYLES,
  tierToRarity,
} from "./warRoomTypes";

export interface WarRoomCardVisualProps {
  displayName: string;
  position: string;
  headshotUrl: string | null;
  tier: number;
  /** hand = grid in your hand; scout = buy modal; row = negotiate/trade list; mini = small discard */
  size?: "hand" | "scout" | "row" | "mini";
  showRarityBadge?: boolean;
  className?: string;
}

function HeadshotArea({
  headshotUrl,
  displayName,
  tier,
  heightClass,
}: {
  headshotUrl: string | null;
  displayName: string;
  tier: number;
  heightClass: string;
}) {
  const rarity = tierToRarity(tier);
  return (
    <div className={`relative overflow-hidden ${heightClass} ${RARITY_HEADSHOT_BACKDROP[rarity]}`}>
      {headshotUrl ? (
        <img
          src={headshotUrl}
          alt={displayName}
          className={`absolute inset-0 h-full w-full object-cover object-top ${RARITY_HEADSHOT_IMAGE_OPACITY[rarity]}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-black text-white/40 text-2xl">?</span>
        </div>
      )}
    </div>
  );
}

export function WarRoomCardVisual({
  displayName,
  position,
  headshotUrl,
  tier,
  size = "hand",
  showRarityBadge = false,
  className = "",
}: WarRoomCardVisualProps) {
  const rarity = tierToRarity(tier);
  const tierStyle = TIER_STYLES[tier] ?? TIER_STYLES[1];
  const chrome = `${RARITY_BORDER[rarity]} ${RARITY_GLOW[rarity]}`;

  const rowTierText: Record<number, string> = {
    1: "text-gray-600",
    2: "text-gray-600",
    3: "text-blue-700",
    4: "text-purple-700",
    5: "text-red-700",
  };

  if (size === "row") {
    return (
      <div className={`flex items-center gap-3 min-w-0 ${className}`}>
        <div
          className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${chrome}`}
        >
          <HeadshotArea
            headshotUrl={headshotUrl}
            displayName={displayName}
            tier={tier}
            heightClass="h-full w-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-[#0B2A55] truncate">{displayName}</p>
          <p className="text-[10px] text-gray-500 uppercase">{position}</p>
          {showRarityBadge ? (
            <RarityBadge rarity={rarity} size="sm" />
          ) : (
            <span className={`text-[10px] font-bold ${rowTierText[tier] ?? rowTierText[1]}`}>
              {tierStyle.label}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (size === "mini") {
    return (
      <div
        className={`flex flex-col overflow-hidden rounded-xl border-2 ${chrome} ${className}`}
      >
        <HeadshotArea
          headshotUrl={headshotUrl}
          displayName={displayName}
          tier={tier}
          heightClass="h-16 w-full"
        />
        <div className="bg-[#0f1b2d] p-1.5">
          <p className="text-[9px] font-black text-white leading-tight truncate">{displayName}</p>
          <span
            className={`text-[9px] font-bold ${tierStyle.text}`}
          >
            {tierStyle.label}
          </span>
        </div>
      </div>
    );
  }

  const isScout = size === "scout";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border-2 bg-[#0f1b2d] ${chrome} ${className}`}
    >
      <HeadshotArea
        headshotUrl={headshotUrl}
        displayName={displayName}
        tier={tier}
        heightClass={isScout ? "h-28 w-full" : "h-28 w-full"}
      />
      <div className="p-2 flex flex-col gap-1">
        <p className="text-xs font-black text-white leading-tight truncate">{displayName}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{position}</p>
        {showRarityBadge ? (
          <RarityBadge rarity={rarity} size="sm" />
        ) : (
          <span
            className={`self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${tierStyle.bg} ${tierStyle.text}`}
          >
            {tierStyle.label}
          </span>
        )}
      </div>
    </div>
  );
}
