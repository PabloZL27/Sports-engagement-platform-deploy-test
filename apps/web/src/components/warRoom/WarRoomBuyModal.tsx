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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-blue-300 uppercase mb-1">
              Scouting Report
            </p>
            <h2 className="text-xl font-black text-white">
              {discardMode ? "Choose a card to discard" : "Pick a player"}
            </h2>
          </div>
          <div
            className={`text-2xl font-black ${buyTimer > 10 ? "text-green-300" : "text-red-400"}`}
          >
            {buyTimer}s
          </div>
        </div>

        <div className="p-6">
          {!discardMode ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Select one player to add to your hand. The 5 TitanCash is
                charged regardless.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {scoutCards.map((card) => {
                  const isChosen = selectedScout?.poolId === card.poolId;
                  return (
                    <button
                      key={card.poolId}
                      type="button"
                      onClick={() => onSelectScout(card)}
                      className={`rounded-xl p-1 text-left transition-all ${
                        isChosen
                          ? "ring-2 ring-[#0f3d78] ring-offset-2"
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
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={buyLoading}
                  onClick={onForfeit}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  Pass (pay 5 TC, no card)
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
                  className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {buyLoading ? "Picking..." : "Pick Player"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Your hand is full. Choose a card to discard to make room for{" "}
                <span className="font-bold text-[#0B2A55]">
                  {selectedScout?.displayName}
                </span>
                .
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 mb-6">
                {hand.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    disabled={buyLoading}
                    onClick={() => onPickPlayer(selectedScout!.poolId, card.id)}
                    className="rounded-xl ring-2 ring-red-400 ring-offset-2 transition-all hover:ring-red-600"
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
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
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
