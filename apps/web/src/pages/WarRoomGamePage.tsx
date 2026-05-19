import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { Auth } from "../context/AuthContext";
import {
  drawNews,
  forfeitBuy,
  getAgendas,
  getHand,
  getMatch,
  getResults,
  getRivalHand,
  passAction,
  pickAgendas,
  pickPlayer,
  proposeTrade,
  respondTrade,
  scoutPlayers,
  startMatch,
  type BuyResult,
  type HandCard,
  type MatchResults,
  type NewsActionResult,
  type RivalCard,
  type ScoutCard,
  type TradeCard,
  type TradeProposal,
  type WarRoomAgenda,
  type WarRoomMatch,
} from "../services/warRoomService";

type Phase =
  | "loading"
  | "error"
  | "lobby_wait"
  | "agenda_pick"
  | "agenda_wait"
  | "playing"
  | "ended";

type NegotiateStep = "closed" | "target" | "cards" | "confirm";

const TIER_STYLES: Record<number, { bg: string; text: string; label: string }> =
  {
    1: { bg: "bg-gray-100", text: "text-gray-600", label: "1 pt" },
    2: { bg: "bg-blue-100", text: "text-blue-700", label: "2 pts" },
    3: { bg: "bg-green-100", text: "text-green-700", label: "3 pts" },
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

const TURN_SECONDS = 30;
const TRADE_RESPONSE_SECONDS = 15;

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
  const [timer, setTimer] = useState(TURN_SECONDS);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newsResult, setNewsResult] = useState<NewsActionResult | null>(null);
  const [showNavConfirm, setShowNavConfirm] = useState(false);
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [scoutCards, setScoutCards] = useState<ScoutCard[] | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyTimer, setBuyTimer] = useState(20);
  const [selectedScout, setSelectedScout] = useState<ScoutCard | null>(null);
  const [discardMode, setDiscardMode] = useState(false);

  // Negotiate state
  const [negotiateStep, setNegotiateStep] = useState<NegotiateStep>("closed");
  const [negotiateTarget, setNegotiateTarget] = useState<number | null>(null);
  const [rivalHand, setRivalHand] = useState<RivalCard[]>([]);
  const [negotiateMyCards, setNegotiateMyCards] = useState<HandCard[]>([]);
  const [negotiateTheirCards, setNegotiateTheirCards] = useState<RivalCard[]>([]);
  const [negotiateCash, setNegotiateCash] = useState(0);
  const [negotiateLoading, setNegotiateLoading] = useState(false);
  const [negotiateError, setNegotiateError] = useState<string | null>(null);
  const [negotiateAttemptsLeft, setNegotiateAttemptsLeft] = useState(2);
  const [proposedSeats, setProposedSeats] = useState<number[]>([]);

  // Incoming trade proposal
  const [incomingTrade, setIncomingTrade] = useState<TradeProposal | null>(
    null,
  );
  const [incomingTradeTimer, setIncomingTradeTimer] = useState(
    TRADE_RESPONSE_SECONDS,
  );
  const [respondLoading, setRespondLoading] = useState(false);

  // Results
  const [results, setResults] = useState<MatchResults | null>(null);

  const token = session?.access_token ?? "";
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const buyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incomingTradeTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const autoPassingRef = useRef(false);

  const derivePhase = useCallback((m: WarRoomMatch): Phase => {
    if (m.status === "ENDED") return "ended";
    if (m.status === "PLAYING") return "playing";
    if (m.status === "AGENDA_PICKING") {
      if (!m.you.agendaSelected) return "agenda_pick";
      return "agenda_wait";
    }
    return "lobby_wait";
  }, []);

  // Initial match load
  useEffect(() => {
    if (!matchId || !token) return;
    getMatch(matchId, token)
      .then((m) => {
        setMatch(m);
        setNegotiateAttemptsLeft(m.negotiateAttemptsLeft ?? 2);
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

  // Poll while waiting for players to join the lobby
  useEffect(() => {
    if (phase !== "lobby_wait" || !matchId || !token) return;
    const interval = setInterval(async () => {
      try {
        const m = await getMatch(matchId, token);
        setMatch(m);
        if (m.status !== "LOBBY") setPhase(derivePhase(m));
      } catch {
        /* silent */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, matchId, token, derivePhase]);

  // Poll while waiting for others to pick agendas
  useEffect(() => {
    if (phase !== "agenda_wait" || !matchId || !token) return;
    const interval = setInterval(async () => {
      try {
        const m = await getMatch(matchId, token);
        setMatch(m);
        if (m.status !== "LOBBY") setPhase(derivePhase(m));
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
      .catch(() => {
        /* silent */
      });
  }, [phase, matchId, token]);

  // Fetch results when game ends
  useEffect(() => {
    if (phase !== "ended" || !matchId || !token) return;
    getResults(matchId, token)
      .then(setResults)
      .catch(() => {
        /* silent */
      });
  }, [phase, matchId, token]);

  const isMyTurn = match?.activeSeat === match?.you.seat;

  // Poll when it's NOT your turn — also detect incoming trade proposals
  useEffect(() => {
    if (phase !== "playing" || !matchId || !token || isMyTurn) return;
    const interval = setInterval(async () => {
      try {
        const m = await getMatch(matchId, token);
        setMatch(m);
        setNegotiateAttemptsLeft(m.negotiateAttemptsLeft ?? 2);

        if (m.pendingTradeForYou && !incomingTrade) {
          setIncomingTrade(m.pendingTradeForYou);
          setIncomingTradeTimer(TRADE_RESPONSE_SECONDS);
          if (incomingTradeTimerRef.current)
            clearInterval(incomingTradeTimerRef.current);
          incomingTradeTimerRef.current = setInterval(() => {
            setIncomingTradeTimer((prev) => {
              if (prev <= 1) {
                clearInterval(incomingTradeTimerRef.current!);
                setIncomingTrade(null);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }

        if (m.status === "ENDED") setPhase("ended");
      } catch {
        /* silent */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, matchId, token, isMyTurn, incomingTrade]);

  // Countdown timer when it IS your turn — auto-pass at 0
  useEffect(() => {
    if (!isMyTurn || phase !== "playing") return;
    setTimer(TURN_SECONDS);
    setActionError(null);
    autoPassingRef.current = false;
    setProposedSeats([]);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!autoPassingRef.current && matchId && token) {
            autoPassingRef.current = true;
            passAction(matchId, token)
              .then((result) => {
                setMatch((prevMatch) =>
                  prevMatch
                    ? {
                        ...prevMatch,
                        activeSeat: result.activeSeat ?? null,
                        currentRound: result.currentRound,
                        status: result.gameEnded ? "ENDED" : prevMatch.status,
                      }
                    : prevMatch,
                );
                if (result.gameEnded) setPhase("ended");
              })
              .catch(() => {
                /* silent */
              })
              .finally(() => {
                autoPassingRef.current = false;
              });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMyTurn, match?.activeSeat, phase, matchId, token]);

  // Background poll durante TU turno — detecta avance externo (trade aceptado por rival)
  useEffect(() => {
    if (!isMyTurn || phase !== "playing" || !matchId || !token) return;
    const mySeat = match?.you.seat;
    const interval = setInterval(async () => {
      try {
        const m = await getMatch(matchId, token);
        if (m.activeSeat !== mySeat) {
          // Turno avanzó externamente — limpiar timer y actualizar estado
          if (timerRef.current) clearInterval(timerRef.current);
          autoPassingRef.current = true; // evitar que el timer dispare auto-pass
          setMatch(m);
          setNegotiateAttemptsLeft(m.negotiateAttemptsLeft ?? 2);
          const updatedHand = await getHand(matchId, token);
          setHand(updatedHand);
          if (m.status === "ENDED") setPhase("ended");
        } else {
          // Sigo siendo el activo — actualizar titansCash en caso de trade reciente
          setMatch((prev) =>
            prev
              ? { ...prev, you: { ...prev.you, titansCash: m.you.titansCash } }
              : prev,
          );
        }
      } catch {
        /* silent */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isMyTurn, phase, matchId, token, match?.you.seat]);

  // Intercept navbar clicks while in game
  useEffect(() => {
    const active =
      phase === "playing" ||
      phase === "agenda_pick" ||
      phase === "agenda_wait";
    if (!active) return;
    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("/war-room")) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavHref(href);
      setShowNavConfirm(true);
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [phase]);

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
      setAgendaError(e instanceof Error ? e.message : "Could not save agendas");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNews() {
    if (!matchId || !token || !isMyTurn || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await drawNews(matchId, token);
      setNewsResult(result);
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              you: { ...prev.you, titansCash: result.newTitansCash },
              activeSeat: result.activeSeat ?? null,
              currentRound: result.currentRound,
              status: result.gameEnded ? "ENDED" : prev.status,
            }
          : prev,
      );
      if (result.gameEnded) setPhase("ended");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  function applyTurnResult(result: BuyResult) {
    if (buyTimerRef.current) clearInterval(buyTimerRef.current);
    setMatch((prev) =>
      prev
        ? {
            ...prev,
            you: { ...prev.you, titansCash: result.newTitansCash },
            activeSeat: result.activeSeat ?? null,
            currentRound: result.currentRound,
            status: result.gameEnded ? "ENDED" : prev.status,
          }
        : prev,
    );
    if (result.gameEnded) setPhase("ended");
  }

  function startBuyTimer(onExpire: () => void) {
    setBuyTimer(20);
    if (buyTimerRef.current) clearInterval(buyTimerRef.current);
    buyTimerRef.current = setInterval(() => {
      setBuyTimer((prev) => {
        if (prev <= 1) {
          clearInterval(buyTimerRef.current!);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleBuyScout() {
    if (!matchId || !token || !isMyTurn || buyLoading || actionLoading) return;
    setBuyLoading(true);
    setActionError(null);
    try {
      const cards = await scoutPlayers(matchId, token);
      setScoutCards(cards);
      setSelectedScout(null);
      setDiscardMode(false);
      startBuyTimer(async () => {
        try {
          const result = await forfeitBuy(matchId!, token);
          applyTurnResult(result);
        } catch {
          /* silent */
        }
        setScoutCards(null);
        setBuyLoading(false);
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not scout players");
    } finally {
      setBuyLoading(false);
    }
  }

  async function handlePickPlayer(poolId: number, discardHandId: number | null) {
    if (!matchId || !token) return;
    setBuyLoading(true);
    try {
      const result = await pickPlayer(matchId, poolId, discardHandId, token);
      applyTurnResult(result);
      setScoutCards(null);
      setSelectedScout(null);
      setDiscardMode(false);
      const updatedHand = await getHand(matchId, token);
      setHand(updatedHand);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not buy player");
      setScoutCards(null);
    } finally {
      setBuyLoading(false);
    }
  }

  async function handleStartMatch() {
    if (!matchId || !token) return;
    setStartLoading(true);
    setStartError(null);
    try {
      await startMatch(matchId, token);
      const m = await getMatch(matchId, token);
      setMatch(m);
      setPhase(derivePhase(m));
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Could not start match");
    } finally {
      setStartLoading(false);
    }
  }

  // ── Negotiate handlers ──────────────────────────────────────────────────

  function handleNegotiateOpen() {
    if (!isMyTurn || negotiateAttemptsLeft === 0) return;
    setNegotiateStep("target");
    setNegotiateTarget(null);
    setNegotiateMyCards([]);
    setNegotiateTheirCards([]);
    setNegotiateCash(0);
    setNegotiateError(null);
    setRivalHand([]);
  }

  function toggleMyCard(card: HandCard) {
    setNegotiateMyCards((prev) =>
      prev.some((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card],
    );
  }

  function toggleTheirCard(card: RivalCard) {
    setNegotiateTheirCards((prev) =>
      prev.some((c) => c.handId === card.handId)
        ? prev.filter((c) => c.handId !== card.handId)
        : [...prev, card],
    );
  }

  async function handleSelectTarget(seat: number) {
    if (!matchId || !token) return;
    setNegotiateTarget(seat);
    setNegotiateLoading(true);
    setNegotiateError(null);
    try {
      const rivalCards = await getRivalHand(matchId, seat, token);
      setRivalHand(rivalCards);
      setNegotiateStep("cards");
    } catch (e) {
      setNegotiateError(
        e instanceof Error ? e.message : "Could not load rival hand",
      );
    } finally {
      setNegotiateLoading(false);
    }
  }

  async function handleProposeConfirm() {
    if (!matchId || !token || !negotiateTarget || negotiateMyCards.length === 0 || negotiateTheirCards.length === 0) return;
    setNegotiateLoading(true);
    setNegotiateError(null);
    try {
      const result = await proposeTrade(
        matchId,
        negotiateTarget,
        negotiateMyCards.map((c) => c.id),
        negotiateTheirCards.map((c) => c.handId),
        negotiateCash,
        token,
      );
      setNegotiateAttemptsLeft(result.attemptsLeft);
      setProposedSeats((prev) => [...prev, negotiateTarget!]);
      setNegotiateStep("closed");
      const updatedHand = await getHand(matchId, token);
      setHand(updatedHand);
    } catch (e) {
      setNegotiateError(e instanceof Error ? e.message : "Trade proposal failed");
    } finally {
      setNegotiateLoading(false);
    }
  }

  async function handleRespondTrade(accept: boolean) {
    if (!matchId || !token || !incomingTrade) return;
    setRespondLoading(true);
    try {
      const result = await respondTrade(matchId, incomingTrade.proposalId, accept, token);
      if (incomingTradeTimerRef.current)
        clearInterval(incomingTradeTimerRef.current);
      setIncomingTrade(null);
      if (result.accepted && result.activeSeat !== undefined) {
        // Fetch match completo para traer titansCash actualizado tras el trade
        const freshMatch = await getMatch(matchId, token);
        setMatch(freshMatch);
        if (result.gameEnded) setPhase("ended");
        const updatedHand = await getHand(matchId, token);
        setHand(updatedHand);
      }
    } catch {
      /* silent */
    } finally {
      setRespondLoading(false);
    }
  }

  // ── Nav confirm modal ───────────────────────────────────────────────────
  const NavConfirmModal = showNavConfirm ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl text-center">
        <h2 className="text-xl font-black text-[#0B2A55] mb-2">
          Leave War Room?
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Your match stays active but your turns may be skipped while you are
          away.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowNavConfirm(false);
              setPendingNavHref(null);
            }}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNavConfirm(false);
              if (pendingNavHref) navigate(pendingNavHref);
            }}
            className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Shared banner ───────────────────────────────────────────────────────
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
          onClick={() => {
            setPendingNavHref("/offseason");
            setShowNavConfirm(true);
          }}
          className="mt-1 rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 transition-colors"
        >
          Leave War Room
        </button>
      </div>
    </section>
  );

  // ── ERROR ───────────────────────────────────────────────────────────────
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

  // ── LOADING ─────────────────────────────────────────────────────────────
  if (phase === "loading" || !match) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <p className="text-[#0B2A55] font-bold text-lg animate-pulse">
          Loading War Room...
        </p>
      </div>
    );
  }

  // ── LOBBY WAIT ──────────────────────────────────────────────────────────
  if (phase === "lobby_wait") {
    const isHost = match.you.seat === 1;
    const playerCount = match.players.length;
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <Navbar />
          {banner}
          <div className="rounded-2xl bg-white p-10 shadow text-center">
            <p className="text-2xl font-black text-[#0B2A55] mb-2">
              War Room Lobby
            </p>
            <p className="text-sm text-gray-500 mb-2">
              Share the invite code with your GMs
            </p>
            <p className="mb-8 font-mono text-3xl font-black tracking-widest text-[#0f3d78]">
              {match.inviteCode}
            </p>
            <div className="mb-8 flex justify-center gap-4">
              {[1, 2, 3].map((seat) => {
                const joined = match.players.some((p) => p.seat === seat);
                return (
                  <div
                    key={seat}
                    className={`rounded-xl border-2 px-6 py-4 text-sm font-bold ${
                      joined
                        ? "border-green-400 bg-green-50 text-green-700"
                        : "border-dashed border-gray-300 bg-gray-50 text-gray-400"
                    }`}
                  >
                    GM {seat}
                    {seat === match.you.seat ? " (You)" : ""}
                    <br />
                    <span className="text-xs font-normal">
                      {joined ? "Connected" : "Waiting..."}
                    </span>
                  </div>
                );
              })}
            </div>
            {startError && (
              <p className="mb-4 text-sm text-red-500 font-semibold">
                {startError}
              </p>
            )}
            {isHost ? (
              <button
                type="button"
                disabled={playerCount < 2 || startLoading}
                onClick={handleStartMatch}
                className="rounded-xl bg-[#0f3d78] px-10 py-3 font-bold text-white transition-colors hover:bg-[#0B2A55] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {startLoading
                  ? "Starting..."
                  : playerCount < 2
                    ? "Waiting for at least 1 more GM..."
                    : `Start Draft Night with ${playerCount} GM${playerCount > 1 ? "s" : ""}`}
              </button>
            ) : (
              <p className="animate-pulse text-sm text-gray-400">
                Waiting for the host (GM 1) to start the match...
              </p>
            )}
          </div>
        </main>
        {NavConfirmModal}
      </div>
    );
  }

  // ── AGENDA PICK ─────────────────────────────────────────────────────────
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
        {NavConfirmModal}
      </div>
    );
  }

  // ── AGENDA WAIT ─────────────────────────────────────────────────────────
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
        {NavConfirmModal}
      </div>
    );
  }

  // ── ENDED ───────────────────────────────────────────────────────────────
  if (phase === "ended") {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <Navbar />
          {banner}

          {!results ? (
            <div className="rounded-2xl bg-white p-10 shadow text-center">
              <p className="animate-pulse text-gray-400">
                Calculating results...
              </p>
            </div>
          ) : (
            <>
              {/* Winner banner */}
              <div className="mb-6 rounded-2xl bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-8 py-6 text-white text-center shadow">
                <p className="text-xs font-extrabold tracking-widest text-yellow-400 uppercase mb-1">
                  Draft Night — Final Results
                </p>
                <p className="text-3xl font-black">
                  {results.winnerSeat === match.you.seat
                    ? "You Win!"
                    : `GM ${results.winnerSeat} Wins!`}
                </p>
              </div>

              {/* Scores table */}
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                {results.results
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((pr, rank) => {
                    const isWinner = pr.seat === results.winnerSeat;
                    const isYou = pr.seat === match.you.seat;
                    return (
                      <div
                        key={pr.seat}
                        className={`rounded-2xl border-2 p-6 bg-white shadow ${
                          isWinner
                            ? "border-yellow-400"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-black text-[#0B2A55] text-lg">
                            GM {pr.seat}
                            {isYou ? " (You)" : ""}
                          </p>
                          {isWinner && (
                            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-black text-white">
                              #{rank + 1} Winner
                            </span>
                          )}
                          {!isWinner && (
                            <span className="rounded-full bg-gray-200 px-3 py-0.5 text-xs font-bold text-gray-600">
                              #{rank + 1}
                            </span>
                          )}
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
                            <span className="text-gray-500">Agenda bonus</span>
                            <span className="font-bold text-green-600">
                              +{pr.agendaBonus} pts
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-1 mt-1">
                            <span className="font-black text-[#0B2A55]">
                              Total
                            </span>
                            <span className="font-black text-[#0B2A55] text-lg">
                              {pr.totalScore} pts
                            </span>
                          </div>
                        </div>

                        {/* Agendas */}
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
                                  : "bg-gray-50 border border-gray-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1 mb-0.5">
                                <span
                                  className={`font-bold ${a.achieved ? "text-green-700" : "text-gray-500"}`}
                                >
                                  {a.name}
                                </span>
                                <span
                                  className={`shrink-0 font-black ${a.achieved ? "text-green-600" : "text-gray-400"}`}
                                >
                                  {a.achieved
                                    ? `+${a.bonusPoints} pts`
                                    : "Not achieved"}
                                </span>
                              </div>
                              <p
                                className={`leading-snug ${a.achieved ? "text-green-600" : "text-gray-400"}`}
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
                  onClick={() => navigate("/offseason")}
                  className="rounded-xl bg-[#0f3d78] px-10 py-3 font-bold text-white hover:bg-[#0B2A55] transition-colors"
                >
                  Back to Off-Season
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ── PLAYING ─────────────────────────────────────────────────────────────
  const emptySlots = Math.max(0, 6 - hand.length);
  const timerPct = (timer / TURN_SECONDS) * 100;
  const timerColor =
    timer > 15 ? "bg-green-400" : timer > 7 ? "bg-yellow-400" : "bg-red-400";

  const rivalSeats = match.players
    .map((p) => p.seat)
    .filter((s) => s !== match.you.seat);

  // Already proposed to which seats this turn
  const canNegotiate =
    isMyTurn && negotiateAttemptsLeft > 0 && !actionLoading && !buyLoading;

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="mx-auto w-full max-w-[1400px] p-6">
        <Navbar />
        {banner}

        <div
          className={`mb-4 rounded-2xl px-6 py-3 text-center font-black text-sm ${
            isMyTurn
              ? "bg-green-100 text-green-700 border-2 border-green-300"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {isMyTurn
            ? `Your turn — ${timer}s remaining`
            : `Waiting for GM ${match.activeSeat ?? "?"}...`}
        </div>

        {isMyTurn && (
          <div className="mb-4 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${timerColor}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        )}

        {actionError && (
          <p className="mb-4 text-center text-red-500 font-semibold text-sm">
            {actionError}
          </p>
        )}

        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-[#0B2A55]">Your Hand</h2>
            <span className="text-sm text-gray-400">
              {hand.length} / 6 cards —{" "}
              <span className="font-bold text-[#0B2A55]">
                {hand.reduce((sum, c) => sum + c.tier, 0)} pts total
              </span>
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

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-[#0B2A55] mb-4">
            {isMyTurn ? "Choose an action" : "Actions"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Breaking News */}
            <button
              type="button"
              disabled={!isMyTurn || actionLoading}
              onClick={handleNews}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                isMyTurn && !actionLoading
                  ? "border-[#0f3d78] bg-[#0f3d78]/5 hover:bg-[#0f3d78]/10 cursor-pointer"
                  : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
              }`}
            >
              <p className="font-black text-[#0B2A55] text-sm mb-1">
                {actionLoading ? "Drawing..." : "Breaking News"}
              </p>
              <p className="text-xs text-gray-500">
                Draw an event card that affects your TitanCash.
              </p>
              {isMyTurn && !actionLoading && (
                <span className="mt-2 inline-block text-[10px] text-green-600 border border-green-300 rounded px-1.5 py-0.5 bg-green-50">
                  Available
                </span>
              )}
            </button>

            {/* Buy Player */}
            <button
              type="button"
              disabled={
                !isMyTurn ||
                actionLoading ||
                buyLoading ||
                match.you.titansCash < 5
              }
              onClick={handleBuyScout}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                isMyTurn &&
                !actionLoading &&
                !buyLoading &&
                match.you.titansCash >= 5
                  ? "border-[#0f3d78] bg-[#0f3d78]/5 hover:bg-[#0f3d78]/10 cursor-pointer"
                  : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
              }`}
            >
              <p className="font-black text-[#0B2A55] text-sm mb-1">
                {buyLoading ? "Scouting..." : "Buy Player"}
              </p>
              <p className="text-xs text-gray-500">
                Spend 5 TitanCash to scout 3 players and pick one.
              </p>
              {isMyTurn && match.you.titansCash < 5 ? (
                <span className="mt-2 inline-block text-[10px] text-orange-500 border border-orange-300 rounded px-1.5 py-0.5 bg-orange-50">
                  Need 5 TitanCash
                </span>
              ) : isMyTurn && !buyLoading ? (
                <span className="mt-2 inline-block text-[10px] text-green-600 border border-green-300 rounded px-1.5 py-0.5 bg-green-50">
                  Available
                </span>
              ) : null}
            </button>

            {/* Negotiate */}
            <button
              type="button"
              disabled={!canNegotiate}
              onClick={handleNegotiateOpen}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                canNegotiate
                  ? "border-[#0f3d78] bg-[#0f3d78]/5 hover:bg-[#0f3d78]/10 cursor-pointer"
                  : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
              }`}
            >
              <p className="font-black text-[#0B2A55] text-sm mb-1">
                Negotiate
              </p>
              <p className="text-xs text-gray-500">
                Propose a trade with another GM.
              </p>
              {isMyTurn && negotiateAttemptsLeft === 0 ? (
                <span className="mt-2 inline-block text-[10px] text-red-500 border border-red-300 rounded px-1.5 py-0.5 bg-red-50">
                  No attempts left
                </span>
              ) : isMyTurn ? (
                <span className="mt-2 inline-block text-[10px] text-green-600 border border-green-300 rounded px-1.5 py-0.5 bg-green-50">
                  {negotiateAttemptsLeft} attempt
                  {negotiateAttemptsLeft !== 1 ? "s" : ""} left
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </main>

      {/* Breaking News modal */}
      {newsResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-6 py-4">
              <p className="text-[10px] font-extrabold tracking-widest text-red-400 uppercase mb-1">
                Breaking News
              </p>
              <h2 className="text-xl font-black text-white leading-tight">
                {newsResult.card.headline}
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm leading-relaxed text-gray-600 mb-6">
                {newsResult.card.story}
              </p>
              <div
                className={`rounded-xl px-5 py-3 text-center font-black text-lg mb-6 ${
                  newsResult.cashDelta > 0
                    ? "bg-green-100 text-green-700"
                    : newsResult.cashDelta < 0
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {newsResult.cashDelta > 0
                  ? `+${newsResult.cashDelta} TitanCash`
                  : newsResult.cashDelta < 0
                    ? `${newsResult.cashDelta} TitanCash`
                    : "No cash effect"}
                <p className="text-sm font-normal mt-1 opacity-75">
                  Your balance: {newsResult.newTitansCash}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewsResult(null)}
                className="w-full rounded-xl bg-[#0f3d78] px-6 py-3 font-bold text-white hover:bg-[#0B2A55] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav confirm modal */}
      {NavConfirmModal}

      {/* Buy Player modal */}
      {scoutCards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-blue-300 uppercase mb-1">
                  Scouting Report
                </p>
                <h2 className="text-xl font-black text-white">
                  {discardMode ? "Choose a card to discard" : "Pick a player"}
                </h2>
              </div>
              <div
                className={`text-2xl font-black ${buyTimer > 10 ? "text-green-300" : "text-red-400"}`}
              >
                {buyTimer}s
              </div>
            </div>
            <div className="p-6">
              {!discardMode ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Select one player to add to your hand. The 5 TitanCash is
                    charged regardless.
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {scoutCards.map((card) => {
                      const style = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
                      const isChosen = selectedScout?.poolId === card.poolId;
                      return (
                        <button
                          key={card.poolId}
                          type="button"
                          onClick={() => setSelectedScout(card)}
                          className={`rounded-xl border-2 p-3 text-left transition-all ${
                            isChosen
                              ? "border-[#0f3d78] bg-[#0f3d78]/10"
                              : "border-gray-200 hover:border-[#60A5FA] hover:bg-blue-50"
                          }`}
                        >
                          {card.headshotUrl ? (
                            <img
                              src={card.headshotUrl}
                              alt={card.displayName}
                              className="w-full h-24 object-cover object-top rounded-lg bg-gray-100 mb-2"
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                              <span className="text-gray-300 text-3xl font-black">
                                ?
                              </span>
                            </div>
                          )}
                          <p className="text-xs font-black text-[#0B2A55] leading-tight truncate">
                            {card.displayName}
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                            {card.position}
                          </p>
                          <span
                            className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}
                          >
                            {style.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={buyLoading}
                      onClick={async () => {
                        if (buyTimerRef.current)
                          clearInterval(buyTimerRef.current);
                        setBuyLoading(true);
                        try {
                          const result = await forfeitBuy(matchId!, token);
                          applyTurnResult(result);
                        } catch {
                          /* silent */
                        }
                        setScoutCards(null);
                        setBuyLoading(false);
                      }}
                      className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >
                      Pass (pay 5 TC, no card)
                    </button>
                    <button
                      type="button"
                      disabled={!selectedScout || buyLoading}
                      onClick={() => {
                        if (!selectedScout) return;
                        if (hand.length >= 6) {
                          setDiscardMode(true);
                        } else {
                          handlePickPlayer(selectedScout.poolId, null);
                        }
                      }}
                      className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {buyLoading ? "Picking..." : "Pick Player"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Your hand is full. Choose a card to discard to make room
                    for{" "}
                    <span className="font-bold text-[#0B2A55]">
                      {selectedScout?.displayName}
                    </span>
                    .
                  </p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 mb-6">
                    {hand.map((card) => {
                      const style = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
                      return (
                        <button
                          key={card.id}
                          type="button"
                          disabled={buyLoading}
                          onClick={() =>
                            handlePickPlayer(selectedScout!.poolId, card.id)
                          }
                          className="flex flex-col rounded-xl border-2 border-red-200 bg-red-50 overflow-hidden hover:border-red-500 hover:bg-red-100 transition-all"
                        >
                          {card.headshotUrl ? (
                            <img
                              src={card.headshotUrl}
                              alt={card.displayName}
                              className="w-full h-16 object-cover object-top"
                            />
                          ) : (
                            <div className="w-full h-16 bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-300 text-xl font-black">
                                ?
                              </span>
                            </div>
                          )}
                          <div className="p-1">
                            <p className="text-[9px] font-black text-[#0B2A55] leading-tight truncate">
                              {card.displayName}
                            </p>
                            <span
                              className={`text-[9px] font-bold ${style.text}`}
                            >
                              {style.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDiscardMode(false)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Negotiate modal */}
      {negotiateStep !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-6 py-4">
              <p className="text-[10px] font-extrabold tracking-widest text-blue-300 uppercase mb-1">
                Negotiate Trade
              </p>
              <h2 className="text-xl font-black text-white">
                {negotiateStep === "target" && "Choose a GM to negotiate with"}
                {negotiateStep === "cards" &&
                  `Trading with GM ${negotiateTarget}`}
                {negotiateStep === "confirm" && "Confirm your offer"}
              </h2>
            </div>

            <div className="p-6">
              {negotiateError && (
                <p className="mb-4 text-sm text-red-500 font-semibold text-center">
                  {negotiateError}
                </p>
              )}

              {/* Step 1: Choose target GM */}
              {negotiateStep === "target" && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Select which GM you want to propose a trade to.
                  </p>
                  {negotiateLoading ? (
                    <p className="text-center text-gray-400 animate-pulse">
                      Loading...
                    </p>
                  ) : rivalSeats.filter((s) => !proposedSeats.includes(s))
                      .length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Ya propusiste a todos los GMs disponibles este turno.
                    </p>
                  ) : (
                    rivalSeats
                      .filter((s) => !proposedSeats.includes(s))
                      .map((seat) => (
                        <button
                          key={seat}
                          type="button"
                          onClick={() => handleSelectTarget(seat)}
                          className="w-full rounded-xl border-2 border-gray-200 p-4 text-left hover:border-[#0f3d78] hover:bg-[#0f3d78]/5 transition-all"
                        >
                          <p className="font-black text-[#0B2A55]">GM {seat}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {match.players.find((p) => p.seat === seat)
                              ?.titansCash ?? 0}{" "}
                            TitanCash
                          </p>
                        </button>
                      ))
                  )}
                  <button
                    type="button"
                    onClick={() => setNegotiateStep("closed")}
                    className="w-full mt-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Step 2: Choose cards (multi-select) */}
              {negotiateStep === "cards" && (
                <>
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    {/* My cards (with tier, multi-select) */}
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-1">
                        Your offer
                      </p>
                      <p className="text-[10px] text-gray-400 mb-2">
                        Selecciona una o más cartas
                      </p>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {hand.map((card) => {
                          const style = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
                          const isChosen = negotiateMyCards.some((c) => c.id === card.id);
                          return (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => toggleMyCard(card)}
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
                                <span className="shrink-0 w-5 h-5 rounded-full bg-[#0f3d78] flex items-center justify-center text-white text-[10px] font-black">
                                  {negotiateMyCards.findIndex((c) => c.id === card.id) + 1}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Their cards (with tier, multi-select) */}
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-1">
                        Quieres recibir
                      </p>
                      <p className="text-[10px] text-gray-400 mb-2">
                        Selecciona una o más cartas
                      </p>
                      {rivalHand.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">
                          GM {negotiateTarget} no tiene cartas.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {rivalHand.map((card) => {
                            const style = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
                            const isChosen = negotiateTheirCards.some((c) => c.handId === card.handId);
                            return (
                              <button
                                key={card.handId}
                                type="button"
                                onClick={() => toggleTheirCard(card)}
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
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-[#0f3d78] flex items-center justify-center text-white text-[10px] font-black">
                                    {negotiateTheirCards.findIndex((c) => c.handId === card.handId) + 1}
                                  </span>
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
                      TitanCash extra (opcional)
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setNegotiateCash((prev) => Math.max(0, prev - 1))}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-bold text-gray-600 hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="font-black text-[#0B2A55] text-lg w-8 text-center">
                        {negotiateCash}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setNegotiateCash((prev) => Math.min(match.you.titansCash, prev + 1))
                        }
                        className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-bold text-gray-600 hover:bg-gray-50"
                      >
                        +
                      </button>
                      <span className="text-xs text-gray-400">
                        (tienes {match.you.titansCash} TC)
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNegotiateStep("target")}
                      className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={negotiateMyCards.length === 0 || negotiateTheirCards.length === 0}
                      onClick={() => setNegotiateStep("confirm")}
                      className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Review Offer ({negotiateMyCards.length} x {negotiateTheirCards.length})
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Confirm */}
              {negotiateStep === "confirm" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Revisa tu oferta antes de enviarla a GM {negotiateTarget}.
                    Tienen {TRADE_RESPONSE_SECONDS}s para responder.
                  </p>

                  <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Ofreces</p>
                      {negotiateMyCards.map((c) => {
                        const s = TIER_STYLES[c.tier] ?? TIER_STYLES[1];
                        return (
                          <p key={c.id} className="text-sm font-black text-[#0B2A55]">
                            {c.displayName}{" "}
                            <span className={`text-xs font-bold ${s.text}`}>({s.label})</span>
                          </p>
                        );
                      })}
                      {negotiateCash > 0 && (
                        <p className="text-sm font-bold text-green-600">+ {negotiateCash} TC</p>
                      )}
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-xs text-gray-400 mb-1">Quieres recibir</p>
                      {negotiateTheirCards.map((c) => {
                        const s = TIER_STYLES[c.tier] ?? TIER_STYLES[1];
                        return (
                          <p key={c.handId} className="text-sm font-black text-[#0B2A55]">
                            {c.displayName}{" "}
                            <span className={`text-xs font-bold ${s.text}`}>({s.label})</span>
                          </p>
                        );
                      })}
                    </div>
                    <div className="border-t pt-2 flex justify-between text-sm">
                      <span className="text-gray-400">Enviando a</span>
                      <span className="font-black text-[#0B2A55]">GM {negotiateTarget}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNegotiateStep("cards")}
                      disabled={negotiateLoading}
                      className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={negotiateLoading}
                      onClick={handleProposeConfirm}
                      className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors disabled:opacity-40"
                    >
                      {negotiateLoading ? "Enviando..." : "Enviar Oferta"}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={negotiateLoading}
                    onClick={() => setNegotiateStep("closed")}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Incoming trade proposal modal */}
      {incomingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-yellow-400 uppercase mb-1">
                  Trade Offer
                </p>
                <h2 className="text-xl font-black text-white">
                  GM {incomingTrade.fromSeat} wants to trade
                </h2>
              </div>
              <div
                className={`text-2xl font-black ${incomingTradeTimer > 8 ? "text-green-300" : "text-red-400"}`}
              >
                {incomingTradeTimer}s
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-gray-200 p-4 space-y-3 text-sm">
                {/* Cards they offer */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Te ofrecen</p>
                  <div className="space-y-2">
                    {(incomingTrade.offerCards ?? []).map((card) => {
                      const s = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
                      return (
                        <div key={card.handId} className="flex items-center gap-3">
                          {card.headshotUrl ? (
                            <img
                              src={card.headshotUrl}
                              alt={card.name}
                              className="w-10 h-10 object-cover object-top rounded-lg bg-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <span className="text-gray-300 font-black">?</span>
                            </div>
                          )}
                          <div>
                            <p className="font-black text-[#0B2A55]">{card.name}</p>
                            <p className="text-[10px] text-gray-500">{card.position}</p>
                            <span className={`text-[10px] font-bold ${s.text}`}>{s.label}</span>
                          </div>
                        </div>
                      );
                    })}
                    {incomingTrade.cashOffer > 0 && (
                      <p className="text-sm font-bold text-green-600 pl-1">
                        + {incomingTrade.cashOffer} TC extra
                      </p>
                    )}
                  </div>
                </div>

                {/* Cards they want */}
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-400 mb-2">A cambio quieren tus cartas</p>
                  <div className="space-y-2">
                    {(incomingTrade.requestCards ?? []).map((card) => {
                      const s = TIER_STYLES[card.tier] ?? TIER_STYLES[1];
                      return (
                        <div key={card.handId} className="flex items-center gap-3">
                          {card.headshotUrl ? (
                            <img
                              src={card.headshotUrl}
                              alt={card.name}
                              className="w-10 h-10 object-cover object-top rounded-lg bg-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <span className="text-gray-300 font-black">?</span>
                            </div>
                          )}
                          <div>
                            <p className="font-black text-[#0B2A55]">{card.name}</p>
                            <p className="text-[10px] text-gray-500">{card.position}</p>
                            <span className={`text-[10px] font-bold ${s.text}`}>{s.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={respondLoading}
                  onClick={() => handleRespondTrade(false)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={respondLoading}
                  onClick={() => handleRespondTrade(true)}
                  className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-40"
                >
                  {respondLoading ? "Accepting..." : "Accept"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WarRoomGamePage;
