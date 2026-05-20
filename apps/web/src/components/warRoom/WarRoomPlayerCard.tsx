import { type HandCard } from "../../services/warRoomService";
import { TIER_STYLES } from "./warRoomTypes";

export function PlayerCard({ card }: { card: HandCard }) {
  const style = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
  return (
    <div className="flex flex-col rounded-xl border-2 border-[#0B2A55]/20 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {card.headshotUrl ? (
        <img
          src={card.headshotUrl}
          alt={card.displayName}
          className="w-full h-24 object-cover object-top bg-gray-100"
        />
      ) : (
        <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-300 text-3xl font-black">?</span>
        </div>
      )}
      <div className="p-2 flex flex-col gap-1">
        <p className="text-xs font-black text-[#0B2A55] leading-tight truncate">
          {card.displayName}
        </p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
          {card.position}
        </p>
        <span
          className={`self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
      </div>
    </div>
  );
}

export function EmptySlot() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 h-[148px]">
      <span className="text-gray-300 text-2xl font-black">+</span>
      <span className="text-[10px] text-gray-300 mt-1">Empty</span>
    </div>
  );
}
