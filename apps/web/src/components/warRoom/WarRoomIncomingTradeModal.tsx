import { type TradeProposal } from "../../services/warRoomService";
import { TIER_STYLES } from "./warRoomTypes";

interface Props {
  trade: TradeProposal;
  timer: number;
  loading: boolean;
  onRespond: (accept: boolean) => void;
}

export function WarRoomIncomingTradeModal({ trade, timer, loading, onRespond }: Props) {
  const offerStyle = TIER_STYLES[trade.offerCard?.tier] ?? TIER_STYLES[1];
  const requestStyle = TIER_STYLES[trade.requestCard?.tier] ?? TIER_STYLES[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-yellow-400 uppercase mb-1">
              Trade Offer
            </p>
            <h2 className="text-xl font-black text-white">
              GM {trade.fromSeat} wants to trade
            </h2>
          </div>
          <div className={`text-2xl font-black ${timer > 8 ? "text-green-300" : "text-red-400"}`}>
            {timer}s
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-gray-200 p-4 space-y-3 text-sm">
            {/* Card they offer */}
            <div>
              <p className="text-xs text-gray-400 mb-2">They offer</p>
              {trade.offerCard ? (
                <div className="flex items-center gap-3">
                  {trade.offerCard.headshotUrl ? (
                    <img
                      src={trade.offerCard.headshotUrl}
                      alt={trade.offerCard.name}
                      className="w-10 h-10 object-cover object-top rounded-lg bg-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-gray-300 font-black">?</span>
                    </div>
                  )}
                  <div>
                    <p className="font-black text-[#0B2A55]">{trade.offerCard.name}</p>
                    <p className="text-[10px] text-gray-500">{trade.offerCard.position}</p>
                    <span className={`text-[10px] font-bold ${offerStyle.text}`}>
                      {offerStyle.label}
                    </span>
                  </div>
                </div>
              ) : null}
              {trade.cashOffer > 0 && (
                <p className="text-sm font-bold text-green-600 pl-1 mt-1">
                  + {trade.cashOffer} TC
                </p>
              )}
            </div>

            {/* Card they want */}
            <div className="border-t pt-3">
              <p className="text-xs text-gray-400 mb-2">In exchange for your card</p>
              {trade.requestCard ? (
                <div className="flex items-center gap-3">
                  {trade.requestCard.headshotUrl ? (
                    <img
                      src={trade.requestCard.headshotUrl}
                      alt={trade.requestCard.name}
                      className="w-10 h-10 object-cover object-top rounded-lg bg-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-gray-300 font-black">?</span>
                    </div>
                  )}
                  <div>
                    <p className="font-black text-[#0B2A55]">{trade.requestCard.name}</p>
                    <p className="text-[10px] text-gray-500">{trade.requestCard.position}</p>
                    <span className={`text-[10px] font-bold ${requestStyle.text}`}>
                      {requestStyle.label}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => onRespond(false)}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onRespond(true)}
              className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-40"
            >
              {loading ? "Accepting..." : "Accept"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
