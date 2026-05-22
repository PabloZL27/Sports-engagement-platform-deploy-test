import { type HandCard } from "../../services/warRoomService";
import { WarRoomCardVisual } from "./WarRoomCardVisual";

export function PlayerCard({ card }: { card: HandCard }) {
  return (
    <WarRoomCardVisual
      displayName={card.displayName}
      position={card.position}
      headshotUrl={card.headshotUrl}
      tier={card.tier}
      size="hand"
      className="hover:shadow-lg transition-shadow"
    />
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
