import { type WarRoomAgenda, type WarRoomMatch } from "../../services/warRoomService";

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
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl bg-white p-8 shadow">
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
        <div className="grid gap-3 sm:grid-cols-2">
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
}

export function WarRoomAgendaWaitPhase({ match }: WaitProps) {
  const readyCount = match.players.filter((p) => p.agendaReady).length;
  const totalCount = match.players.length;
  return (
    <div className="rounded-2xl bg-white p-10 shadow text-center">
      <p className="text-2xl font-black text-[#0B2A55] mb-2">Agendas Locked In</p>
      <p className="text-sm text-gray-500 mb-6">
        Waiting for all GMs to select their agendas...
      </p>
      <div className="mb-6 flex justify-center gap-4">
        {match.players.map((p) => (
          <div
            key={p.seat}
            className={`rounded-xl border-2 px-5 py-3 text-sm font-bold ${
              p.agendaReady
                ? "border-green-400 bg-green-50 text-green-700"
                : "border-gray-200 bg-gray-50 text-gray-400"
            }`}
          >
            GM {p.seat}{p.seat === match.you.seat ? " (You)" : ""}
            <br />
            <span className="text-xs font-normal">
              {p.agendaReady ? "Ready" : "Selecting..."}
            </span>
          </div>
        ))}
      </div>
      <p className="animate-pulse text-xs text-gray-400">
        {readyCount} / {totalCount} ready — checking every 3 seconds...
      </p>
    </div>
  );
}
