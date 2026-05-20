import { type NewsActionResult } from "../../services/warRoomService";

interface Props {
  result: NewsActionResult;
  onClose: () => void;
}

export function WarRoomNewsModal({ result, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-6 py-4">
          <p className="text-[10px] font-extrabold tracking-widest text-red-400 uppercase mb-1">
            Breaking News
          </p>
          <h2 className="text-xl font-black text-white leading-tight">
            {result.card.headline}
          </h2>
        </div>
        <div className="p-6">
          <p className="text-sm leading-relaxed text-gray-600 mb-6">
            {result.card.story}
          </p>
          <div
            className={`rounded-xl px-5 py-3 text-center font-black text-lg mb-6 ${
              result.cashDelta > 0
                ? "bg-green-100 text-green-700"
                : result.cashDelta < 0
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {result.cashDelta > 0
              ? `+${result.cashDelta} TitanCash`
              : result.cashDelta < 0
                ? `${result.cashDelta} TitanCash`
                : "No cash effect"}
            <p className="text-sm font-normal mt-1 opacity-75">
              Your balance: {result.newTitansCash}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#0f3d78] px-6 py-3 font-bold text-white hover:bg-[#0B2A55] transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
