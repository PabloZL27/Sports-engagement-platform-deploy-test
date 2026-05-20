import { type TradeProposal } from "../../services/warRoomService";
import { WarRoomCardVisual } from "./WarRoomCardVisual";

interface Props {
  trade: TradeProposal;
  timer: number;
  loading: boolean;
  onRespond: (accept: boolean) => void;
}

export function WarRoomIncomingTradeModal({ trade, timer, loading, onRespond }: Props) {
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
            <div>
              <p className="text-xs text-gray-400 mb-2">They offer</p>
              {trade.offerCard ? (
                <WarRoomCardVisual
                  displayName={trade.offerCard.name}
                  position={trade.offerCard.position}
                  headshotUrl={trade.offerCard.headshotUrl}
                  tier={trade.offerCard.tier}
                  size="row"
                />
              ) : null}
              {trade.cashOffer > 0 && (
                <p className="text-sm font-bold text-green-600 mt-2">
                  + {trade.cashOffer} TC
                </p>
              )}
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-gray-400 mb-2">In exchange for your card</p>
              {trade.requestCard ? (
                <WarRoomCardVisual
                  displayName={trade.requestCard.name}
                  position={trade.requestCard.position}
                  headshotUrl={trade.requestCard.headshotUrl}
                  tier={trade.requestCard.tier}
                  size="row"
                />
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
