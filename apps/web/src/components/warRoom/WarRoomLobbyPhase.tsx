import { type WarRoomMatch } from "../../services/warRoomService";

interface Props {
  match: WarRoomMatch;
  startLoading: boolean;
  startError: string | null;
  readyLoading: boolean;
  onStart: () => void;
  onReady: () => void;
  onOpenTutorial: () => void;
}

export function WarRoomLobbyPhase({
  match,
  startLoading,
  startError,
  readyLoading,
  onStart,
  onReady,
  onOpenTutorial,
}: Props) {
  const isHost = match.you.seat === 1;
  const playerCount = match.players.length;
  const iAmReady = match.you.isReady;
  const allReady = match.players.length >= 2 && match.players.every((p) => p.isReady);

  return (
    <div className="rounded-2xl bg-white p-10 shadow text-center">
      <p className="text-2xl font-black text-[#0B2A55] mb-2">War Room Lobby</p>
      <p className="text-sm text-gray-500 mb-2">Share the invite code with your GMs</p>
      <p className="mb-8 font-mono text-3xl font-black tracking-widest text-[#0f3d78]">
        {match.inviteCode}
      </p>

      {/* Player slots */}
      <div className="mb-8 flex justify-center gap-4">
        {[1, 2, 3].map((seat) => {
          const player = match.players.find((p) => p.seat === seat);
          const joined = !!player;
          const ready = player?.isReady ?? false;
          return (
            <div
              key={seat}
              className={`rounded-xl border-2 px-6 py-4 text-sm font-bold transition-colors ${
                !joined
                  ? "border-dashed border-gray-300 bg-gray-50 text-gray-400"
                  : ready
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-yellow-400 bg-yellow-50 text-yellow-700"
              }`}
            >
              GM {seat}{seat === match.you.seat ? " (You)" : ""}
              <br />
              <span className="text-xs font-normal">
                {!joined ? "Waiting..." : ready ? "Ready" : "Not ready"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tutorial + Ready buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 mb-6">
        <button
          type="button"
          onClick={onOpenTutorial}
          className="rounded-xl border-2 border-[#0f3d78] px-6 py-3 text-sm font-bold text-[#0f3d78] hover:bg-[#0f3d78]/5 transition-colors"
        >
          How to Play
        </button>
        {!iAmReady && (
          <button
            type="button"
            disabled={readyLoading}
            onClick={onReady}
            className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {readyLoading ? "Confirming..." : "I'm Ready"}
          </button>
        )}
        {iAmReady && (
          <div className="rounded-xl border-2 border-green-400 bg-green-50 px-6 py-3 text-sm font-bold text-green-700">
            You are Ready
          </div>
        )}
      </div>

      {startError && (
        <p className="mb-4 text-sm text-red-500 font-semibold">{startError}</p>
      )}

      {/* Start button (host only) */}
      {isHost ? (
        <div>
          <button
            type="button"
            disabled={playerCount < 2 || !allReady || startLoading}
            onClick={onStart}
            className="rounded-xl bg-[#0f3d78] px-10 py-3 font-bold text-white transition-colors hover:bg-[#0B2A55] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {startLoading
              ? "Starting..."
              : playerCount < 2
              ? "Waiting for at least 1 more GM..."
              : !allReady
              ? "Waiting for all GMs to be ready..."
              : `Start Draft Night with ${playerCount} GM${playerCount > 1 ? "s" : ""}`}
          </button>
          {playerCount >= 2 && !allReady && (
            <p className="mt-2 text-xs text-gray-400">
              All GMs must click "I'm Ready" before you can start.
            </p>
          )}
        </div>
      ) : (
        <p className="animate-pulse text-sm text-gray-400">
          Waiting for the host (GM 1) to start the match...
        </p>
      )}
    </div>
  );
}
