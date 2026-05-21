import { type MatchResults } from "../../services/warRoomService";

interface Props {
  results: MatchResults;
  youSeat: number;
  onBack: () => void;
}

export function WarRoomResultsScreen({ results, youSeat, onBack }: Props) {
  return (
    <>
      {/* Winner banner */}
      <div className="mb-6 rounded-2xl bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-8 py-6 text-white text-center shadow">
        <p className="text-xs font-extrabold tracking-widest text-yellow-400 uppercase mb-1">
          Draft Night — Final Results
        </p>
        <p className="text-3xl font-black">
          {results.winnerSeat === youSeat
            ? "You Win!"
            : `GM ${results.winnerSeat} Wins!`}
        </p>
      </div>

      {/* Scores */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {results.results
          .sort((a, b) => b.totalScore - a.totalScore)
          .map((pr, rank) => {
            const isWinner = pr.seat === results.winnerSeat;
            const isYou = pr.seat === youSeat;
            return (
              <div
                key={pr.seat}
                className={`rounded-2xl border-2 p-6 bg-white shadow ${
                  isWinner ? "border-yellow-400" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-black text-[#0B2A55] text-lg">
                    GM {pr.seat}
                    {isYou ? " (You)" : ""}
                  </p>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-black ${
                      isWinner
                        ? "bg-yellow-400 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    #{rank + 1}{isWinner ? " Winner" : ""}
                  </span>
                </div>

                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Hand ({pr.tiers.length} cards)
                    </span>
                    <span className="font-bold text-[#0B2A55]">
                      {pr.handTotal} pts
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Agendas</span>
                    <span
                      className={`font-bold ${
                        pr.agendaBonus > 0
                          ? "text-green-600"
                          : pr.agendaBonus < 0
                            ? "text-red-600"
                            : "text-gray-500"
                      }`}
                    >
                      {pr.agendaBonus > 0 ? "+" : ""}
                      {pr.agendaBonus} pts
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="font-black text-[#0B2A55]">Total</span>
                    <span className="font-black text-[#0B2A55] text-lg">
                      {pr.totalScore} pts
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide">
                    Secret Agendas
                  </p>
                  {pr.agendas.map((a) => (
                    <div
                      key={a.name}
                      className={`rounded-lg px-3 py-2 text-xs ${
                        a.achieved
                          ? "bg-green-50 border border-green-300"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <span
                          className={`font-bold ${a.achieved ? "text-green-700" : "text-red-700"}`}
                        >
                          {a.name}
                        </span>
                        <span
                          className={`shrink-0 font-black ${a.achieved ? "text-green-600" : "text-red-600"}`}
                        >
                          {a.achieved ? `+${a.bonusPoints} pts` : `-${a.bonusPoints} pts`}
                        </span>
                      </div>
                      <p
                        className={`leading-snug ${a.achieved ? "text-green-600" : "text-red-500"}`}
                      >
                        {a.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl bg-[#0f3d78] px-10 py-3 font-bold text-white hover:bg-[#0B2A55] transition-colors"
        >
          Back to Off-Season
        </button>
      </div>
    </>
  );
}
