import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { Auth } from "../context/AuthContext";
import {
  getAgendas,
  getHand,
  getMatch,
  pickAgendas,
  type HandCard,
  type WarRoomAgenda,
  type WarRoomMatch,
} from "../services/warRoomService";

type Phase =
  | "loading"
  | "error"
  | "agenda_pick"
  | "agenda_wait"
  | "playing"
  | "ended";

const TIER_STYLES: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-gray-100",    text: "text-gray-600",   label: "1 pt" },
  2: { bg: "bg-blue-100",   text: "text-blue-700",   label: "2 pts" },
  3: { bg: "bg-green-100",  text: "text-green-700",  label: "3 pts" },
  4: { bg: "bg-purple-100", text: "text-purple-700", label: "4 pts" },
  5: { bg: "bg-yellow-100", text: "text-yellow-700", label: "5 pts" },
};

function PlayerCard({ card }: { card: HandCard }) {
  const style = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
  return (
    <div className="flex flex-col rounded-xl border-2 border-[#0B2A55]/20 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {card.headshotUrl ? (
        <img
          src={card.headshotUrl}
          alt={card.displayName}
          className="w-full h-24 object-cover object-top bg-gray-100"
        />
      ) : (
        <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-300 text-3xl font-black">?</span>
        </div>
      )}
      <div className="p-2 flex flex-col gap-1">
        <p className="text-xs font-black text-[#0B2A55] leading-tight truncate">
          {card.displayName}
        </p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
          {card.position}
        </p>
        <span
          className={`self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
      </div>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 h-[148px]">
      <span className="text-gray-300 text-2xl font-black">+</span>
      <span className="text-[10px] text-gray-300 mt-1">Empty</span>
    </div>
  );
}

function WarRoomGamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { session } = Auth();
  const navigate = useNavigate();

  const [match, setMatch] = useState<WarRoomMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  const [agendas, setAgendas] = useState<WarRoomAgenda[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);

  const [hand, setHand] = useState<HandCard[]>([]);

  const token = session?.access_token ?? "";

  const derivePhase = useCallback((m: WarRoomMatch): Phase => {
    if (m.status === "ENDED") return "ended";
    if (m.status === "PLAYING") return "playing";
    if (!m.you.agendaSelected) return "agenda_pick";
    return "agenda_wait";
  }, []);

  // Initial match load
  useEffect(() => {
    if (!matchId || !token) return;
    getMatch(matchId, token)
      .then((m) => {
        setMatch(m);
        setPhase(derivePhase(m));
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load match");
        setPhase("error");
      });
  }, [matchId, token, derivePhase]);

  // Load agendas when picking
  useEffect(() => {
    if (phase !== "agenda_pick" || !token) return;
    getAgendas(token)
      .then(setAgendas)
      .catch(() => setAgendaError("Could not load agendas. Try refreshing."));
  }, [phase, token]);

  // Poll while waiting for others to pick agendas
  useEffect(() => {
    if (phase !== "agenda_wait" || !matchId || !token) return;
    const interval = setInterval(async () => {
      try {
        const m = await getMatch(matchId, token);
        setMatch(m);
        if (m.status !== "LOBBY") {
          setPhase(derivePhase(m));
        }
      } catch {
        /* silent */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, matchId, token, derivePhase]);

  // Load hand when game starts
  useEffect(() => {
    if (phase !== "playing" || !matchId || !token) return;
    getHand(matchId, token)
      .then(setHand)
      .catch(() => {/* silent */});
  }, [phase, matchId, token]);

  function toggleAgenda(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  async function handleConfirmAgendas() {
    if (selected.length !== 2 || !matchId || !token) return;
    setSubmitting(true);
    setAgendaError(null);
    try {
      await pickAgendas(matchId, selected[0], selected[1], token);
      setPhase("agenda_wait");
    } catch (e) {
      setAgendaError(
        e instanceof Error ? e.message : "Could not save agendas",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Shared banner ──────────────────────────────────────────────────────
  const banner = match && (
    <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_50%,#60A5FA_100%)] px-10 py-8 text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
      <div>
        <h1 className="m-0 text-4xl font-black">TITANS WAR ROOM</h1>
        <p className="mt-1 text-sm opacity-70">
          Invite code:{" "}
          <span className="font-mono font-bold tracking-widest text-base">
            {match.inviteCode}
          </span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {match.status === "PLAYING" && (
          <>
            <p className="text-2xl font-black">
              Round {match.currentRound} / 12
            </p>
            <p className="text-sm opacity-80">
              TitanCash:{" "}
              <span className="font-black">{match.you.titansCash}</span>
            </p>
          </>
        )}
        <p className="text-sm opacity-70">GM Seat {match.you.seat}</p>
        <button
          type="button"
          onClick={() => navigate("/offseason")}
          className="mt-1 rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 transition-colors"
        >
          Leave War Room
        </button>
      </div>
    </section>
  );

  // ── ERROR ──────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-bold text-lg mb-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/offseason")}
            className="rounded-xl bg-[#0f3d78] px-6 py-3 text-white font-bold"
          >
            Back to Off-Season
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING ────────────────────────────────────────────────────────────
  if (phase === "loading" || !match) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <p className="text-[#0B2A55] font-bold text-lg animate-pulse">
          Loading War Room...
        </p>
      </div>
    );
  }

  // ── AGENDA PICK ────────────────────────────────────────────────────────
  if (phase === "agenda_pick") {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <Navbar />
          {banner}
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl bg-white p-8 shadow">
              <h2 className="text-2xl font-black text-[#0B2A55] mb-1">
                Select Your Agendas
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Choose 2 secret objectives. They are revealed at the end and
                add bonus points to your final score.
              </p>

              {agendas.length === 0 && !agendaError && (
                <p className="text-center text-gray-400 animate-pulse py-8">
                  Loading agendas...
                </p>
              )}
              {agendaError && (
                <p className="text-center text-red-500 font-semibold mb-4">
                  {agendaError}
                </p>
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
                      onClick={() => toggleAgenda(a.agendaId)}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected
                          ? "border-[#0f3d78] bg-[#0f3d78]/10"
                          : isDisabled
                            ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-40"
                            : "border-gray-200 hover:border-[#60A5FA] hover:bg-blue-50"
                      }`}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-[#0B2A55]">
                          {a.name}
                        </p>
                        <span className="shrink-0 rounded-full bg-[#0f3d78] px-2 py-0.5 text-xs font-bold text-white">
                          +{a.bonusPoints} pts
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-gray-500">
                        {a.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  {selected.length} / 2 selected
                </p>
                <button
                  type="button"
                  disabled={selected.length !== 2 || submitting}
                  onClick={handleConfirmAgendas}
                  className="rounded-xl bg-[#0f3d78] px-8 py-3 font-bold text-white transition-colors hover:bg-[#0B2A55] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? "Locking in..." : "Lock In Agendas"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── AGENDA WAIT ────────────────────────────────────────────────────────
  if (phase === "agenda_wait") {
    const readyCount = match.players.filter((p) => p.agendaReady).length;
    const totalCount = match.players.length;

    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <Navbar />
          {banner}
          <div className="rounded-2xl bg-white p-10 shadow text-center">
            <p className="text-2xl font-black text-[#0B2A55] mb-2">
              Agendas Locked In
            </p>
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
                  GM {p.seat}
                  {p.seat === match.you.seat ? " (You)" : ""}
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
        </main>
      </div>
    );
  }

  // ── ENDED ──────────────────────────────────────────────────────────────
  if (phase === "ended") {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <Navbar />
          {banner}
          <div className="rounded-2xl bg-white p-10 shadow text-center">
            <p className="text-2xl font-black text-[#0B2A55] mb-2">
              Draft Night — Game Over
            </p>
            <p className="text-sm text-gray-400">Results coming soon.</p>
          </div>
        </main>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────
  const isMyTurn = match.activeSeat === match.you.seat;
  const emptySlots = Math.max(0, 6 - hand.length);

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="mx-auto w-full max-w-[1400px] p-6">
        <Navbar />
        {banner}

        {/* Turn indicator */}
        <div
          className={`mb-4 rounded-2xl px-6 py-3 text-center font-black text-sm ${
            isMyTurn
              ? "bg-green-100 text-green-700 border-2 border-green-300"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {isMyTurn
            ? "Your turn — choose an action below"
            : `Waiting for GM ${match.activeSeat ?? "?"}...`}
        </div>

        {/* Hand */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-[#0B2A55]">Your Hand</h2>
            <span className="text-sm text-gray-400">
              {hand.length} / 6 cards
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {hand.map((card) => (
              <PlayerCard key={card.id} card={card} />
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-[#0B2A55] mb-4">Actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Breaking News",
                desc: "Draw an event card that affects your TitanCash.",
              },
              {
                label: "Buy Player",
                desc: "Spend 5 TitanCash to scout 3 players and pick one.",
              },
              {
                label: "Negotiate",
                desc: "Propose a trade with another GM.",
              },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                disabled
                className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-left opacity-50 cursor-not-allowed"
              >
                <p className="font-black text-[#0B2A55] text-sm mb-1">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500">{action.desc}</p>
                <span className="mt-2 inline-block text-[10px] text-gray-400 border border-gray-300 rounded px-1.5 py-0.5">
                  Coming next update
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default WarRoomGamePage;