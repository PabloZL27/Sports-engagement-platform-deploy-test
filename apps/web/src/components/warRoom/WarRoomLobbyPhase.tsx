import { type WarRoomMatch } from "../../services/warRoomService";
import { warRoomPlayerLabel, warRoomSeatLabel } from "./warRoomPlayerLabel";

interface Props {
  match: WarRoomMatch;
  startLoading: boolean;
  startError: string | null;
  readyLoading: boolean;
  onStart: () => void;
  onReady: () => void;
  onOpenTutorial: () => void;
}

function PlayerSlot({
  label,
  status,
  joined,
  ready,
}: {
  label: string;
  status: string;
  joined: boolean;
  ready: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border-2 px-2 py-3 text-center sm:px-4 sm:py-4 ${
        !joined
          ? "border-dashed border-gray-300 bg-gray-50 text-gray-400"
          : ready
            ? "border-green-400 bg-green-50 text-green-700"
            : "border-yellow-400 bg-yellow-50 text-yellow-700"
      }`}
    >
      <p className="truncate text-xs font-bold sm:text-sm" title={label}>
        {label}
      </p>
      <p className="mt-1 text-[10px] font-normal sm:text-xs">{status}</p>
    </div>
  );
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
    <div className="w-full min-w-0 rounded-2xl bg-white p-4 text-center shadow sm:p-8 lg:p-10">
      <p className="mb-2 text-xl font-black text-[#0B2A55] sm:text-2xl">War Room Lobby</p>
      <p className="mb-2 text-sm text-gray-500">Share the invite code with your Game Managers</p>
      <p className="mb-6 font-mono text-2xl font-black tracking-widest text-[#0f3d78] sm:mb-8 sm:text-3xl">
        {match.inviteCode}
      </p>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:mb-8 sm:gap-4">
        {[1, 2, 3].map((seat) => {
          const player = match.players.find((p) => p.seat === seat);
          const joined = !!player;
          const ready = player?.isReady ?? false;
          const label = player
            ? warRoomPlayerLabel(player, match.you.seat)
            : warRoomSeatLabel(seat, match.players, match.you.seat);

          return (
            <PlayerSlot
              key={seat}
              label={label}
              joined={joined}
              ready={ready}
              status={!joined ? "Waiting..." : ready ? "Ready" : "Not ready"}
            />
          );
        })}
      </div>

      <div className="mb-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onOpenTutorial}
          className="rounded-xl border-2 border-[#0f3d78] px-5 py-3 text-sm font-bold text-[#0f3d78] transition-colors hover:bg-[#0f3d78]/5"
        >
          How to Play
        </button>
        {!iAmReady && (
          <button
            type="button"
            disabled={readyLoading}
            onClick={onReady}
            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {readyLoading ? "Confirming..." : "I'm Ready"}
          </button>
        )}
        {iAmReady && (
          <div className="rounded-xl border-2 border-green-400 bg-green-50 px-5 py-3 text-sm font-bold text-green-700">
            You are Ready
          </div>
        )}
      </div>

      {startError && (
        <p className="mb-4 text-sm font-semibold text-red-500">{startError}</p>
      )}

      {isHost ? (
        <div>
          <button
            type="button"
            disabled={playerCount < 2 || !allReady || startLoading}
            onClick={onStart}
            className="w-full max-w-xl rounded-xl bg-[#0f3d78] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0B2A55] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-10 sm:text-base"
          >
            {startLoading
              ? "Starting..."
              : playerCount < 2
                ? "Waiting for at least 1 more Game Manager..."
                : !allReady
                  ? "Waiting for all Game Managers to be ready..."
                  : `Start Draft Night with ${playerCount} Game Manager${playerCount > 1 ? "s" : ""}`}
          </button>
          {playerCount >= 2 && !allReady && (
            <p className="mt-2 text-xs text-gray-400">
              All Game Managers must click &quot;I&apos;m Ready&quot; before you can start.
            </p>
          )}
        </div>
      ) : (
        <p className="animate-pulse text-sm text-gray-400">
          Waiting for the host ({warRoomSeatLabel(1, match.players)}) to start the match...
        </p>
      )}
    </div>
  );
}
