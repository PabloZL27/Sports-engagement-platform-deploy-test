import { type WarRoomAgenda, type WarRoomMatch } from "../../services/warRoomService";
import { warRoomPlayerLabel } from "./warRoomPlayerLabel";

interface PickProps {
  agendas: WarRoomAgenda[];
  selected: number[];
  submitting: boolean;
  agendaError: string | null;
  onToggle: (id: number) => void;
  onConfirm: () => void;
}

export function WarRoomAgendaPickPhase({
  agendas,
  selected,
  submitting,
  agendaError,
  onToggle,
  onConfirm,
}: PickProps) {
  return (
    <div className="w-full min-w-0">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-8 lg:p-10">
        <h2 className="text-2xl font-black text-[#0B2A55] mb-1">Select Your Agendas</h2>
        <p className="text-sm text-gray-500 mb-6">
          Choose 2 secret objectives. They are revealed at the end and add bonus points to your final score.
        </p>
        {agendas.length === 0 && !agendaError && (
          <p className="text-center text-gray-400 animate-pulse py-8">Loading agendas...</p>
        )}
        {agendaError && (
          <p className="text-center text-red-500 font-semibold mb-4">{agendaError}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {agendas.map((a) => {
            const isSelected = selected.includes(a.agendaId);
            const isDisabled = !isSelected && selected.length >= 2;
            return (
              <button
                key={a.agendaId}
                type="button"
                disabled={isDisabled}
                onClick={() => onToggle(a.agendaId)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? "border-[#0f3d78] bg-[#0f3d78]/10"
                    : isDisabled
                      ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-40"
                      : "border-gray-200 hover:border-[#60A5FA] hover:bg-blue-50"
                }`}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-black text-[#0B2A55]">{a.name}</p>
                  <span className="shrink-0 rounded-full bg-[#0f3d78] px-2 py-0.5 text-xs font-bold text-white">
                    +{a.bonusPoints} / -{a.bonusPoints}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-gray-500">{a.description}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-400">{selected.length} / 2 selected</p>
          <button
            type="button"
            disabled={selected.length !== 2 || submitting}
            onClick={onConfirm}
            className="rounded-xl bg-[#0f3d78] px-8 py-3 font-bold text-white transition-colors hover:bg-[#0B2A55] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Locking in..." : "Lock In Agendas"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface WaitProps {
  match: WarRoomMatch;
  syncError?: string | null;
}

export function WarRoomAgendaWaitPhase({ match, syncError }: WaitProps) {
  const readyCount = match.players.filter((p) => p.agendaReady).length;
  const totalCount = match.players.length;
  return (
    <div className="w-full min-w-0 rounded-2xl bg-white p-4 text-center shadow sm:p-8 lg:p-10">
      <p className="mb-2 text-xl font-black text-[#0B2A55] sm:text-2xl">Agendas Locked In</p>
      <p className="mb-6 text-sm text-gray-500">
        Waiting for all Game Managers to select their agendas...
      </p>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
        {match.players.map((p) => {
          const label = warRoomPlayerLabel(p, match.you.seat);
          return (
            <div
              key={p.seat}
              className={`min-w-0 rounded-xl border-2 px-2 py-3 text-center sm:px-4 sm:py-3 ${
                p.agendaReady
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-gray-200 bg-gray-50 text-gray-400"
              }`}
            >
              <p className="truncate text-xs font-bold sm:text-sm" title={label}>
                {label}
              </p>
              <p className="mt-1 text-[10px] font-normal sm:text-xs">
                {p.agendaReady ? "Ready" : "Selecting..."}
              </p>
            </div>
          );
        })}
      </div>
      <p className="animate-pulse text-xs text-gray-400">
        {readyCount} / {totalCount} ready — checking every 3 seconds...
      </p>
      {syncError && (
        <p className="mt-4 text-sm font-semibold text-red-600">{syncError}</p>
      )}
      {readyCount === totalCount && totalCount > 0 && !syncError && (
        <p className="mt-3 text-xs text-gray-500">
          Starting the game… 
        </p>
      )}
    </div>
  );
}
