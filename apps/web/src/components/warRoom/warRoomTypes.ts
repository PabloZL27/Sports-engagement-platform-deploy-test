import type { CardRarity } from "../../types";
import {
  RARITY_HEADSHOT_BACKDROP,
  RARITY_HEADSHOT_IMAGE_OPACITY,
} from "../cards/cardLayout";

export type NegotiateStep = "closed" | "target" | "cards" | "confirm";

export const TIER_STYLES: Record<
  number,
  { bg: string; text: string; label: string }
> = {
  1: { bg: "bg-gray-500/80", text: "text-gray-200", label: "1 pt" },
  2: { bg: "bg-gray-500/80", text: "text-gray-200", label: "2 pts" },
  3: { bg: "bg-blue-600/90", text: "text-white", label: "3 pts" },
  4: { bg: "bg-purple-600/90", text: "text-white", label: "4 pts" },
  5: { bg: "bg-gradient-to-r from-red-700 to-blue-800", text: "text-white", label: "5 pts" },
};

export const TURN_SECONDS = 30;
export const TRADE_RESPONSE_SECONDS = 15;

/** Map War Room tier (1–5) to roster rarity for Team-style card chrome. */
export function tierToRarity(tier: number): CardRarity {
  if (tier >= 5) return "titan";
  if (tier >= 4) return "elite";
  if (tier >= 3) return "rare";
  return "common";
}

export const RARITY_BORDER: Record<CardRarity, string> = {
  common: "border-gray-400",
  rare: "border-blue-500",
  elite: "border-purple-500",
  titan: "border-red-600",
};

export const RARITY_GLOW: Record<CardRarity, string> = {
  common: "shadow-md",
  rare: "shadow-blue-500/25",
  elite: "shadow-purple-500/30",
  titan: "shadow-red-500/40",
};

export { RARITY_HEADSHOT_BACKDROP, RARITY_HEADSHOT_IMAGE_OPACITY };
