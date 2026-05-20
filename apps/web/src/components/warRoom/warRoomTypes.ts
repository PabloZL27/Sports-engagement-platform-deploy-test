export type NegotiateStep = "closed" | "target" | "cards" | "confirm";

export const TIER_STYLES: Record<
  number,
  { bg: string; text: string; label: string }
> = {
  1: { bg: "bg-gray-100", text: "text-gray-600", label: "1 pt" },
  2: { bg: "bg-blue-100", text: "text-blue-700", label: "2 pts" },
  3: { bg: "bg-green-100", text: "text-green-700", label: "3 pts" },
  4: { bg: "bg-purple-100", text: "text-purple-700", label: "4 pts" },
  5: { bg: "bg-yellow-100", text: "text-yellow-700", label: "5 pts" },
};

export const TURN_SECONDS = 30;
export const TRADE_RESPONSE_SECONDS = 15;
