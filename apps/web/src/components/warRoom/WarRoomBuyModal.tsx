import { type HandCard, type ScoutCard } from "../../services/warRoomService";
import { WarRoomCardVisual } from "./WarRoomCardVisual";

interface Props {
  scoutCards: ScoutCard[];
  hand: HandCard[];
  buyTimer: number;
  discardMode: boolean;
  selectedScout: ScoutCard | null;
  buyLoading: boolean;
  onSelectScout: (card: ScoutCard) => void;
  onPickPlayer: (poolId: number, discardHandId: number | null) => void;
  onForfeit: () => void;
  onSetDiscardMode: (val: boolean) => void;
}

export function WarRoomBuyModal({
  scoutCards,
  hand,
  buyTimer,
  discardMode,
  selectedScout,
  buyLoading,
  onSelectScout,
  onPickPlayer,
  onForfeit,
  onSetDiscardMode,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-4">
      <div className="max-h-[min(92vh,720px)] w-full max-w-[min(100%,520px)] overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-w-2xl">
        <div className="flex items-center justify-between bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 pr-3">
            <p className="mb-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-blue-300 sm:mb-1 sm:text-[10px] sm:tracking-widest">
              Scouting Report
            </p>
            <h2 className="text-lg font-black leading-tight text-white sm:text-xl">
              {discardMode ? "Choose a card to discard" : "Pick a player"}
            </h2>
          </div>
          <div
            className={`shrink-0 text-xl font-black sm:text-2xl ${
              buyTimer > 10 ? "text-green-300" : "text-red-400"
            }`}
          >
            {buyTimer}s
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {!discardMode ? (
            <>
              <p className="mb-3 text-xs leading-relaxed text-gray-500 sm:mb-4 sm:text-sm">
                Select one player to add to your hand. The 5 TitanCash is charged regardless.
              </p>
              <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-4">
                {scoutCards.map((card) => {
                  const isChosen = selectedScout?.poolId === card.poolId;
                  return (
                    <button
                      key={card.poolId}
                      type="button"
                      onClick={() => onSelectScout(card)}
                      className={`min-w-0 rounded-lg p-0.5 text-left transition-all sm:rounded-xl sm:p-1 ${
                        isChosen
                          ? "ring-2 ring-[#0f3d78] ring-offset-1 sm:ring-offset-2"
                          : "hover:opacity-95"
                      }`}
                    >
                      <WarRoomCardVisual
                        displayName={card.displayName}
                        position={card.position}
                        headshotUrl={card.headshotUrl}
                        tier={card.tier}
                        size="scout"
                      />
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  disabled={buyLoading}
                  onClick={onForfeit}
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 sm:px-4 sm:py-3 sm:text-sm"
                >
                  <span className="sm:hidden">Pass (5 TC)</span>
                  <span className="hidden sm:inline">Pass (pay 5 TC, no card)</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedScout || buyLoading}
                  onClick={() => {
                    if (!selectedScout) return;
                    if (hand.length >= 6) {
                      onSetDiscardMode(true);
                    } else {
                      onPickPlayer(selectedScout.poolId, null);
                    }
                  }}
                  className="flex-1 rounded-xl bg-[#0f3d78] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0B2A55] disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-3 sm:text-sm"
                >
                  {buyLoading ? "Picking..." : "Pick Player"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-xs leading-relaxed text-gray-500 sm:mb-4 sm:text-sm">
                Your hand is full. Choose a card to discard to make room for{" "}
                <span className="font-bold text-[#0B2A55]">
                  {selectedScout?.displayName}
                </span>
                .
              </p>
              <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:grid-cols-6 sm:gap-3">
                {hand.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    disabled={buyLoading}
                    onClick={() => onPickPlayer(selectedScout!.poolId, card.id)}
                    className="min-w-0 rounded-lg ring-2 ring-red-400 ring-offset-1 transition-all hover:ring-red-600 sm:rounded-xl sm:ring-offset-2"
                  >
                    <WarRoomCardVisual
                      displayName={card.displayName}
                      position={card.position}
                      headshotUrl={card.headshotUrl}
                      tier={card.tier}
                      size="mini"
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onSetDiscardMode(false)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 sm:py-3 sm:text-sm"
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
