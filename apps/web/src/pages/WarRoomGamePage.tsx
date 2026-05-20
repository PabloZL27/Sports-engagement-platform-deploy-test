import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { Auth } from "../context/AuthContext";
import { WarRoomAgendaPickPhase, WarRoomAgendaWaitPhase } from "../components/warRoom/WarRoomAgendaPhases";
import { WarRoomLobbyPhase } from "../components/warRoom/WarRoomLobbyPhase";
import { WarRoomPlayingPhase } from "../components/warRoom/WarRoomPlayingPhase";
import { WarRoomResultsScreen } from "../components/warRoom/WarRoomResultsScreen";
import { WarRoomTutorialModal } from "../components/warRoom/WarRoomTutorialModal";
import { TRADE_RESPONSE_SECONDS, TURN_SECONDS, type NegotiateStep } from "../components/warRoom/warRoomTypes";
import {
  drawNews,
  forfeitBuy,
  getAgendas,
  getHand,
  getMatch,
  getResults,
  getRivalHand,
  markReady,
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

export default function WarRoomGamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { session } = Auth();
  const navigate = useNavigate();
  const token = session?.access_token ?? "";

  // ── Core state ────────────────────────────────────────────────────────────
  const [match, setMatch] = useState<WarRoomMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [hand, setHand] = useState<HandCard[]>([]);
  const [timer, setTimer] = useState(TURN_SECONDS);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [results, setResults] = useState<MatchResults | null>(null);

  // ── Agenda state ──────────────────────────────────────────────────────────
  const [agendas, setAgendas] = useState<WarRoomAgenda[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);

  // ── Lobby state ───────────────────────────────────────────────────────────
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [readyLoading, setReadyLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // ── Nav confirm state ─────────────────────────────────────────────────────
  const [showNavConfirm, setShowNavConfirm] = useState(false);
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);

  // ── News state ────────────────────────────────────────────────────────────
  const [newsResult, setNewsResult] = useState<NewsActionResult | null>(null);

  // ── Buy state ─────────────────────────────────────────────────────────────
  const [scoutCards, setScoutCards] = useState<ScoutCard[] | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyTimer, setBuyTimer] = useState(20);
  const [selectedScout, setSelectedScout] = useState<ScoutCard | null>(null);
  const [discardMode, setDiscardMode] = useState(false);

  // ── Negotiate state ───────────────────────────────────────────────────────
  const [negotiateStep, setNegotiateStep] = useState<NegotiateStep>("closed");
  const [negotiateTarget, setNegotiateTarget] = useState<number | null>(null);
  const [rivalHand, setRivalHand] = useState<RivalCard[]>([]);
  const [negotiateMyCard, setNegotiateMyCard] = useState<HandCard | null>(null);
  const [negotiateTheirCard, setNegotiateTheirCard] = useState<RivalCard | null>(null);
  const [negotiateCash, setNegotiateCash] = useState(0);
  const [negotiateLoading, setNegotiateLoading] = useState(false);
  const [negotiateError, setNegotiateError] = useState<string | null>(null);
  const [negotiateAttemptsLeft, setNegotiateAttemptsLeft] = useState(2);
  const [proposedSeats, setProposedSeats] = useState<number[]>([]);

  // ── Incoming trade state ──────────────────────────────────────────────────
  const [incomingTrade, setIncomingTrade] = useState<TradeProposal | null>(null);
  const [incomingTradeTimer, setIncomingTradeTimer] = useState(TRADE_RESPONSE_SECONDS);
  const [respondLoading, setRespondLoading] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const buyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incomingTradeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPassingRef = useRef(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const derivePhase = useCallback((m: WarRoomMatch): Phase => {
    if (m.status === "ENDED") return "ended";
    if (m.status === "PLAYING") return "playing";
    if (m.status === "AGENDA_PICKING") {
      return m.you.agendaSelected ? "agenda_wait" : "agenda_pick";
    }
    return "lobby_wait";
  }, []);

  const isMyTurn = match?.activeSeat === match?.you.seat;

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

  // ── Effects ───────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (phase !== "agenda_pick" || !token) return;
    getAgendas(token)
      .then(setAgendas)
      .catch(() => setAgendaError("Could not load agendas. Try refreshing."));
  }, [phase, token]);

  useEffect(() => {
    if ((phase !== "lobby_wait" && phase !== "agenda_wait") || !matchId || !token) return;
    const interval = setInterval(async () => {
      try {
        const m = await getMatch(matchId, token);
        setMatch(m);
        if (m.status !== "LOBBY") setPhase(derivePhase(m));
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, matchId, token, derivePhase]);

  useEffect(() => {
    if (phase !== "playing" || !matchId || !token) return;
    getHand(matchId, token).then(setHand).catch(() => { /* silent */ });
  }, [phase, matchId, token]);

  useEffect(() => {
    if (phase !== "ended" || !matchId || !token) return;
    getResults(matchId, token).then(setResults).catch(() => { /* silent */ });
  }, [phase, matchId, token]);

  // Poll when NOT your turn — detect incoming trades
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
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, matchId, token, isMyTurn, incomingTrade]);

  // Countdown timer when your turn — auto-pass at 0
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
                setMatch((prev) =>
                  prev
                    ? {
                        ...prev,
                        activeSeat: result.activeSeat ?? null,
                        currentRound: result.currentRound,
                        status: result.gameEnded ? "ENDED" : prev.status,
                      }
                    : prev,
                );
                if (result.gameEnded) setPhase("ended");
              })
              .catch(() => { /* silent */ })
              .finally(() => { autoPassingRef.current = false; });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isMyTurn, match?.activeSeat, phase, matchId, token]);

  // Background poll during your turn — detect external advance (trade accepted)
  useEffect(() => {
    if (!isMyTurn || phase !== "playing" || !matchId || !token) return;
    const mySeat = match?.you.seat;
    const interval = setInterval(async () => {
      try {
        const m = await getMatch(matchId, token);
        if (m.activeSeat !== mySeat) {
          if (timerRef.current) clearInterval(timerRef.current);
          autoPassingRef.current = true;
          setMatch(m);
          setNegotiateAttemptsLeft(m.negotiateAttemptsLeft ?? 2);
          const updatedHand = await getHand(matchId, token);
          setHand(updatedHand);
          if (m.status === "ENDED") setPhase("ended");
        } else {
          setMatch((prev) =>
            prev ? { ...prev, you: { ...prev.you, titansCash: m.you.titansCash } } : prev,
          );
        }
      } catch { /* silent */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [isMyTurn, phase, matchId, token, match?.you.seat]);

  // Intercept navbar clicks while in game
  useEffect(() => {
    const active = phase === "playing" || phase === "agenda_pick" || phase === "agenda_wait";
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

  // ── Handlers ──────────────────────────────────────────────────────────────
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
        } catch { /* silent */ }
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

  async function handleForfeit() {
    if (buyTimerRef.current) clearInterval(buyTimerRef.current);
    setBuyLoading(true);
    try {
      const result = await forfeitBuy(matchId!, token);
      applyTurnResult(result);
    } catch { /* silent */ }
    setScoutCards(null);
    setBuyLoading(false);
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

  async function handleReady() {
    if (!matchId || !token) return;
    setReadyLoading(true);
    try {
      await markReady(matchId, true, token);
      const m = await getMatch(matchId, token);
      setMatch(m);
    } catch { /* silent */ }
    finally { setReadyLoading(false); }
  }

  async function handleOpenTutorial() {
    setShowTutorial(true);
    if (!matchId || !token || !match?.you.isReady) return;
    try {
      await markReady(matchId, false, token);
      const m = await getMatch(matchId, token);
      setMatch(m);
    } catch { /* silent */ }
  }

  async function handleNegotiateOpen() {
    if (!isMyTurn || negotiateAttemptsLeft === 0 || !matchId || !token) return;
    // Always refresh hand before opening so card IDs are current
    try {
      const freshHand = await getHand(matchId, token);
      setHand(freshHand);
    } catch { /* silent */ }
    setNegotiateStep("target");
    setNegotiateTarget(null);
    setNegotiateMyCard(null);
    setNegotiateTheirCard(null);
    setNegotiateCash(0);
    setNegotiateError(null);
    setRivalHand([]);
  }

  async function handleSelectTarget(seat: number) {
    if (!matchId || !token) return;
    setNegotiateTarget(seat);
    setNegotiateLoading(true);
    setNegotiateError(null);
    try {
      const cards = await getRivalHand(matchId, seat, token);
      setRivalHand(cards);
      setNegotiateStep("cards");
    } catch (e) {
      setNegotiateError(e instanceof Error ? e.message : "Could not load rival hand");
    } finally {
      setNegotiateLoading(false);
    }
  }

  async function handleProposeConfirm() {
    if (!matchId || !token || !negotiateTarget || !negotiateMyCard || !negotiateTheirCard) return;
    setNegotiateLoading(true);
    setNegotiateError(null);
    try {
      const result = await proposeTrade(
        matchId,
        negotiateTarget,
        negotiateMyCard.id,
        negotiateTheirCard.handId,
        negotiateCash,
        token,
      );
      setNegotiateAttemptsLeft(result.attemptsLeft);
      setProposedSeats((prev) => [...prev, negotiateTarget!]);
      setNegotiateStep("closed");
      // Poll immediately to catch fast accept/reject from rival
      try {
        const m = await getMatch(matchId, token);
        const mySeat = match?.you.seat;
        if (m.activeSeat !== mySeat) {
          if (timerRef.current) clearInterval(timerRef.current);
          autoPassingRef.current = true;
          setMatch(m);
          const updatedHand = await getHand(matchId, token);
          setHand(updatedHand);
          if (m.status === "ENDED") setPhase("ended");
        } else {
          const updatedHand = await getHand(matchId, token);
          setHand(updatedHand);
        }
      } catch { /* silent */ }
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
        const freshMatch = await getMatch(matchId, token);
        setMatch(freshMatch);
        if (result.gameEnded) setPhase("ended");
        const updatedHand = await getHand(matchId, token);
        setHand(updatedHand);
      }
    } catch { /* silent */ }
    finally { setRespondLoading(false); }
  }

  // ── Nav confirm modal ─────────────────────────────────────────────────────
  const NavConfirmModal = showNavConfirm ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl text-center">
        <h2 className="text-xl font-black text-[#0B2A55] mb-2">Leave War Room?</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your match stays active but your turns may be skipped while you are away.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setShowNavConfirm(false); setPendingNavHref(null); }}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={() => { setShowNavConfirm(false); if (pendingNavHref) navigate(pendingNavHref); }}
            className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Shared banner ─────────────────────────────────────────────────────────
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
            <p className="text-2xl font-black">Round {match.currentRound} / 12</p>
            <p className="text-sm opacity-80">
              TitanCash: <span className="font-black">{match.you.titansCash}</span>
            </p>
          </>
        )}
        <p className="text-sm opacity-70">GM Seat {match.you.seat}</p>
        <button
          type="button"
          onClick={() => { setPendingNavHref("/offseason"); setShowNavConfirm(true); }}
          className="mt-1 rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 transition-colors"
        >
          Leave War Room
        </button>
      </div>
    </section>
  );

  // ── Phase renders ─────────────────────────────────────────────────────────
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

  if (phase === "loading" || !match) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <p className="text-[#0B2A55] font-bold text-lg animate-pulse">
          Loading War Room...
        </p>
      </div>
    );
  }

  if (phase === "lobby_wait") {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <Navbar />
          {banner}
          <WarRoomLobbyPhase
            match={match}
            startLoading={startLoading}
            startError={startError}
            readyLoading={readyLoading}
            onStart={handleStartMatch}
            onReady={handleReady}
            onOpenTutorial={handleOpenTutorial}
          />
        </main>
        {NavConfirmModal}
        {showTutorial && (
          <WarRoomTutorialModal onClose={() => setShowTutorial(false)} />
        )}
      </div>
    );
  }

  if (phase === "agenda_pick") {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <Navbar />
          {banner}
          <WarRoomAgendaPickPhase
            agendas={agendas}
            selected={selected}
            submitting={submitting}
            agendaError={agendaError}
            onToggle={toggleAgenda}
            onConfirm={handleConfirmAgendas}
          />
        </main>
        {NavConfirmModal}
      </div>
    );
  }

  if (phase === "agenda_wait") {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <Navbar />
          {banner}
          <WarRoomAgendaWaitPhase match={match} />
        </main>
        {NavConfirmModal}
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <Navbar />
          {banner}
          {!results ? (
            <div className="rounded-2xl bg-white p-10 shadow text-center">
              <p className="animate-pulse text-gray-400">Calculating results...</p>
            </div>
          ) : (
            <WarRoomResultsScreen
              results={results}
              youSeat={match.you.seat}
              onBack={() => navigate("/offseason")}
            />
          )}
        </main>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  const rivalSeats = match.players.map((p) => p.seat).filter((s) => s !== match.you.seat);

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="mx-auto w-full max-w-[1400px] p-6">
        <Navbar />
        {banner}
        <WarRoomPlayingPhase
          match={match}
          hand={hand}
          timer={timer}
          isMyTurn={isMyTurn}
          actionLoading={actionLoading}
          buyLoading={buyLoading}
          actionError={actionError}
          negotiateAttemptsLeft={negotiateAttemptsLeft}
          negotiateStep={negotiateStep}
          negotiateTarget={negotiateTarget}
          negotiateMyCard={negotiateMyCard}
          negotiateTheirCard={negotiateTheirCard}
          negotiateCash={negotiateCash}
          negotiateLoading={negotiateLoading}
          negotiateError={negotiateError}
          rivalHand={rivalHand}
          rivalSeats={rivalSeats}
          proposedSeats={proposedSeats}
          newsResult={newsResult}
          scoutCards={scoutCards}
          buyTimer={buyTimer}
          selectedScout={selectedScout}
          discardMode={discardMode}
          incomingTrade={incomingTrade}
          incomingTradeTimer={incomingTradeTimer}
          respondLoading={respondLoading}
          showNavConfirm={showNavConfirm}
          onNews={handleNews}
          onBuyScout={handleBuyScout}
          onPickPlayer={handlePickPlayer}
          onForfeit={handleForfeit}
          onNegotiateOpen={handleNegotiateOpen}
          onSelectTarget={handleSelectTarget}
          onSelectMyCard={setNegotiateMyCard}
          onSelectTheirCard={setNegotiateTheirCard}
          onSetCash={setNegotiateCash}
          onSetStep={setNegotiateStep}
          onProposeTrade={handleProposeConfirm}
          onCloseNegotiate={() => setNegotiateStep("closed")}
          onRespond={handleRespondTrade}
          onSelectScout={setSelectedScout}
          onSetDiscardMode={setDiscardMode}
          onCloseNews={() => setNewsResult(null)}
          onNavConfirm={() => { setShowNavConfirm(false); if (pendingNavHref) navigate(pendingNavHref); }}
          onNavCancel={() => { setShowNavConfirm(false); setPendingNavHref(null); }}
        />
      </main>
    </div>
  );
}
