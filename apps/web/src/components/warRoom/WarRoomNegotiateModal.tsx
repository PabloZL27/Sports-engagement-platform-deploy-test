import {
  type HandCard,
  type RivalCard,
  type WarRoomPlayer,
} from "../../services/warRoomService";
import { type NegotiateStep, TIER_STYLES, TRADE_RESPONSE_SECONDS } from "./warRoomTypes";

interface Props {
  step: NegotiateStep;
  rivalSeats: number[];
  proposedSeats: number[];
  players: WarRoomPlayer[];
  rivalHand: RivalCard[];
  myHand: HandCard[];
  myCard: HandCard | null;
  theirCard: RivalCard | null;
  cash: number;
  maxCash: number;
  loading: boolean;
  error: string | null;
  target: number | null;
  onSelectTarget: (seat: number) => void;
  onSelectMyCard: (card: HandCard) => void;
  onSelectTheirCard: (card: RivalCard) => void;
  onSetCash: (val: number) => void;
  onSetStep: (step: NegotiateStep) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function WarRoomNegotiateModal({
  step,
  rivalSeats,
  proposedSeats,
  players,
  rivalHand,
  myHand,
  myCard,
  theirCard,
  cash,
  maxCash,
  loading,
  error,
  target,
  onSelectTarget,
  onSelectMyCard,
  onSelectTheirCard,
  onSetCash,
  onSetStep,
  onConfirm,
  onClose,
}: Props) {
  const availableSeats = rivalSeats.filter((s) => !proposedSeats.includes(s));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-6 py-4">
          <p className="text-[10px] font-extrabold tracking-widest text-blue-300 uppercase mb-1">
            Negotiate Trade
          </p>
          <h2 className="text-xl font-black text-white">
            {step === "target" && "Choose a GM to negotiate with"}
            {step === "cards" && `Trading with GM ${target}`}
            {step === "confirm" && "Confirm your offer"}
          </h2>
        </div>

        <div className="p-6">
          {error && (
            <p className="mb-4 text-sm text-red-500 font-semibold text-center">
              {error}
            </p>
          )}

          {/* Step 1: Choose target GM */}
          {step === "target" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                Select which GM you want to propose a trade to.
              </p>
              {loading ? (
                <p className="text-center text-gray-400 animate-pulse">Loading...</p>
              ) : availableSeats.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  You have already proposed to all available GMs this turn.
                </p>
              ) : (
                availableSeats.map((seat) => (
                  <button
                    key={seat}
                    type="button"
                    onClick={() => onSelectTarget(seat)}
                    className="w-full rounded-xl border-2 border-gray-200 p-4 text-left hover:border-[#0f3d78] hover:bg-[#0f3d78]/5 transition-all"
                  >
                    <p className="font-black text-[#0B2A55]">GM {seat}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {players.find((p) => p.seat === seat)?.titansCash ?? 0} TitanCash
                    </p>
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Step 2: Choose one card each */}
          {step === "cards" && (
            <>
              <div className="grid grid-cols-2 gap-6 mb-4">
                {/* My card */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-1">
                    Your offer
                  </p>
                  <p className="text-[10px] text-gray-400 mb-2">Select one card</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {myHand.map((card) => {
                      const style = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
                      const isChosen = myCard?.id === card.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => onSelectMyCard(card)}
                          className={`w-full flex items-center gap-3 rounded-xl border-2 p-2 text-left transition-all ${
                            isChosen
                              ? "border-[#0f3d78] bg-[#0f3d78]/10"
                              : "border-gray-200 hover:border-[#60A5FA]"
                          }`}
                        >
                          {card.headshotUrl ? (
                            <img
                              src={card.headshotUrl}
                              alt={card.displayName}
                              className="w-10 h-10 object-cover object-top rounded-lg bg-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <span className="text-gray-300 text-lg font-black">?</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-[#0B2A55] truncate">
                              {card.displayName}
                            </p>
                            <p className="text-[10px] text-gray-500">{card.position}</p>
                            <span className={`text-[10px] font-bold ${style.text}`}>
                              {style.label}
                            </span>
                          </div>
                          {isChosen && (
                            <span className="shrink-0 w-4 h-4 rounded-full bg-[#0f3d78]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Their card */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-1">
                    You want
                  </p>
                  <p className="text-[10px] text-gray-400 mb-2">Select one card</p>
                  {rivalHand.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">GM {target} has no cards.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {rivalHand.map((card) => {
                        const style = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
                        const isChosen = theirCard?.handId === card.handId;
                        return (
                          <button
                            key={card.handId}
                            type="button"
                            onClick={() => onSelectTheirCard(card)}
                            className={`w-full flex items-center gap-3 rounded-xl border-2 p-2 text-left transition-all ${
                              isChosen
                                ? "border-[#0f3d78] bg-[#0f3d78]/10"
                                : "border-gray-200 hover:border-[#60A5FA]"
                            }`}
                          >
                            {card.headshotUrl ? (
                              <img
                                src={card.headshotUrl}
                                alt={card.displayName}
                                className="w-10 h-10 object-cover object-top rounded-lg bg-gray-100 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-gray-300 text-lg font-black">?</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-[#0B2A55] truncate">
                                {card.displayName}
                              </p>
                              <p className="text-[10px] text-gray-500">{card.position}</p>
                              <span className={`text-[10px] font-bold ${style.text}`}>
                                {style.label}
                              </span>
                            </div>
                            {isChosen && (
                              <span className="shrink-0 w-4 h-4 rounded-full bg-[#0f3d78]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Cash sweetener */}
              <div className="mb-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">
                  TitanCash bonus (optional)
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSetCash(Math.max(0, cash - 1))}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-bold text-gray-600 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="font-black text-[#0B2A55] text-lg w-8 text-center">
                    {cash}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetCash(Math.min(maxCash, cash + 1))}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-bold text-gray-600 hover:bg-gray-50"
                  >
                    +
                  </button>
                  <span className="text-xs text-gray-400">(you have {maxCash} TC)</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onSetStep("target")}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!myCard || !theirCard}
                  onClick={() => onSetStep("confirm")}
                  className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Review Offer
                </button>
              </div>
            </>
          )}

          {/* Step 3: Confirm */}
          {step === "confirm" && myCard && theirCard && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Review your offer before sending it to GM {target}. They have{" "}
                {TRADE_RESPONSE_SECONDS}s to respond.
              </p>

              <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">You offer</p>
                  <p className="text-sm font-black text-[#0B2A55]">
                    {myCard.displayName}{" "}
                    <span className={`text-xs font-bold ${(TIER_STYLES[myCard.tier] ?? TIER_STYLES[1]).text}`}>
                      ({(TIER_STYLES[myCard.tier] ?? TIER_STYLES[1]).label})
                    </span>
                  </p>
                  {cash > 0 && (
                    <p className="text-sm font-bold text-green-600">+ {cash} TC</p>
                  )}
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-400 mb-1">You want</p>
                  <p className="text-sm font-black text-[#0B2A55]">
                    {theirCard.displayName}{" "}
                    <span className={`text-xs font-bold ${(TIER_STYLES[theirCard.tier] ?? TIER_STYLES[1]).text}`}>
                      ({(TIER_STYLES[theirCard.tier] ?? TIER_STYLES[1]).label})
                    </span>
                  </p>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm">
                  <span className="text-gray-400">Sending to</span>
                  <span className="font-black text-[#0B2A55]">GM {target}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onSetStep("cards")}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={onConfirm}
                  className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors disabled:opacity-40"
                >
                  {loading ? "Sending..." : "Send Offer"}
                </button>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
