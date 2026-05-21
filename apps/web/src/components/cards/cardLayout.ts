import type { CardRarity } from "../../types";

/** Gradiente de fondo detrás de la foto (capa inferior). */
export const RARITY_HEADSHOT_BACKDROP: Record<CardRarity, string> = {
  common: "bg-gradient-to-b from-gray-700 to-gray-900",
  rare: "bg-gradient-to-br from-sky-200 via-sky-400 to-blue-800",
  elite: "bg-gradient-to-br from-violet-300 via-purple-500 to-indigo-950",
  titan: "bg-gradient-to-br from-red-600 via-fuchsia-700 to-blue-700",
};

/** Opacidad de la foto para que asome un poco el gradiente (common = opaco). */
export const RARITY_HEADSHOT_IMAGE_OPACITY: Record<CardRarity, string> = {
  common: "opacity-100",
  rare: "opacity-[0.93]",
  elite: "opacity-[0.92]",
  titan: "opacity-[0.9]",
};
