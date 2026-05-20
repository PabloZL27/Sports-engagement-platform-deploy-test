import { type HandCard, type ScoutCard } from "../../services/warRoomService";
import { TIER_STYLES } from "./warRoomTypes";

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
                  const style = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
                  const isChosen = selectedScout?.poolId === card.poolId;
                  return (
                    <button
                      key={card.poolId}
                      type="button"
                      onClick={() => onSelectScout(card)}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        isChosen
                          ? "border-[#0f3d78] bg-[#0f3d78]/10"
                          : "border-gray-200 hover:border-[#60A5FA] hover:bg-blue-50"
                      }`}
                    >
                      {card.headshotUrl ? (
                        <img
                          src={card.headshotUrl}
                          alt={card.displayName}
                          className="w-full h-24 object-cover object-top rounded-lg bg-gray-100 mb-2"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                          <span className="text-gray-300 text-3xl font-black">
                            ?
                          </span>
                        </div>
                      )}
                      <p className="text-xs font-black text-[#0B2A55] leading-tight truncate">
                        {card.displayName}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                        {card.position}
                      </p>
                      <span
                        className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}
                      >
                        {style.label}
                      </span>
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
                {hand.map((card) => {
                  const style = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
                  return (
                    <button
                      key={card.id}
                      type="button"
                      disabled={buyLoading}
                      onClick={() =>
                        onPickPlayer(selectedScout!.poolId, card.id)
                      }
                      className="flex flex-col rounded-xl border-2 border-red-200 bg-red-50 overflow-hidden hover:border-red-500 hover:bg-red-100 transition-all"
                    >
                      {card.headshotUrl ? (
                        <img
                          src={card.headshotUrl}
                          alt={card.displayName}
                          className="w-full h-16 object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-16 bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-300 text-xl font-black">
                            ?
                          </span>
                        </div>
                      )}
                      <div className="p-1">
                        <p className="text-[9px] font-black text-[#0B2A55] leading-tight truncate">
                          {card.displayName}
                        </p>
                        <span className={`text-[9px] font-bold ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
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
