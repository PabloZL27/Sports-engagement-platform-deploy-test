import type { CardRarity } from "../../types";

type RarityBadgeSize = "sm" | "md" | "lg";

interface RarityBadgeProps {
  rarity: CardRarity;
  /** Por defecto `sm` (esquinas de carta). `lg` en reverso / modales. */
  size?: RarityBadgeSize;
}

const sizeLayout: Record<RarityBadgeSize, string> = {
  sm: "rounded px-1 py-0 text-[10px]",
  md: "rounded-md px-2 py-0.5 text-xs",
  lg: "rounded-lg px-3 py-1 text-sm",
};

const rarityStyles: Record<CardRarity, { className: string; label: string }> = {
  common: { className: "bg-gray-500 text-white", label: "Common" },
  rare: { className: "bg-blue-600 text-white", label: "Rare" },
  elite: { className: "bg-purple-600 text-white", label: "Elite" },
  titan: {
    className: "bg-gradient-to-r from-red-700 to-blue-800 text-white",
    label: "Titan",
  },
};

export default function RarityBadge({ rarity, size = "sm" }: RarityBadgeProps) {
  const style = rarityStyles[rarity];
  const layout = sizeLayout[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center font-bold uppercase tracking-wider ${layout} ${style.className}`}
    >
      {style.label}
    </span>
  );
}
