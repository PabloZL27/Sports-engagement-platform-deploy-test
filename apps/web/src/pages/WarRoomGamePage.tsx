import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Auth } from "../context/AuthContext";
import { WarRoomAgendaPickPhase, WarRoomAgendaWaitPhase } from "../components/warRoom/WarRoomAgendaPhases";
import { WarRoomLobbyPhase } from "../components/warRoom/WarRoomLobbyPhase";
import { WarRoomPlayingPhase } from "../components/warRoom/WarRoomPlayingPhase";
import { WarRoomResultsScreen } from "../components/warRoom/WarRoomResultsScreen";
import { WarRoomTutorialModal } from "../components/warRoom/WarRoomTutorialModal";
import { MAX_ROUNDS, TRADE_RESPONSE_SECONDS, TURN_SECONDS, type NegotiateStep } from "../components/warRoom/warRoomTypes";
import { warRoomPlayerLabel, warRoomSeatLabel } from "../components/warRoom/warRoomPlayerLabel";
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
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [awaitingTradeSeat, setAwaitingTradeSeat] = useState<number | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const buyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevIsMyTurnRef = useRef(false);
  const incomingTradeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPassingRef = useRef(false);
  const awaitingTradeSeatRef = useRef<number | null>(null);

  useEffect(() => {
    awaitingTradeSeatRef.current = awaitingTradeSeat;
  }, [awaitingTradeSeat]);

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

  const refreshMatchState = useCallback(async () => {
    if (!matchId || !token) return null;
    const m = await getMatch(matchId, token);
    setMatch(m);
    setNegotiateAttemptsLeft(m.negotiateAttemptsLeft ?? 2);
    return m;
  }, [matchId, token]);

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
    if (result.gameEnded) {
      setPhase("ended");
    } else if (matchId && token) {
      refreshMatchState().catch(() => { /* silent */ });
    }
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

  // Toast when your turn starts
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current && phase === "playing") {
      setStatusToast("Your turn! Pick an action.");
      const t = setTimeout(() => setStatusToast(null), 4000);
      return () => clearTimeout(t);
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, phase]);

  // Resume paused trade wait if match still has outbound proposal
  useEffect(() => {
    if (phase !== "playing" || !match || !isMyTurn) return;
    if (match.pendingTradeFromYou) {
      setAwaitingTradeSeat(match.pendingTradeFromYou.toSeat);
    }
  }, [phase, match?.pendingTradeFromYou, isMyTurn, match?.you.seat]);

  // New turn: reset timer and proposals (not while waiting on trade response)
  useEffect(() => {
    if (!isMyTurn || phase !== "playing" || awaitingTradeSeat !== null) return;
    setTimer(TURN_SECONDS);
    setProposedSeats([]);
    setActionError(null);
    autoPassingRef.current = false;
  }, [isMyTurn, match?.activeSeat, phase, awaitingTradeSeat]);

  // Countdown timer when your turn — paused while waiting on a trade response
  useEffect(() => {
    if (!isMyTurn || phase !== "playing") return;

    if (awaitingTradeSeat !== null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!autoPassingRef.current && matchId && token) {
            autoPassingRef.current = true;
            passAction(matchId, token)
              .then((result) => {
                setMatch((prevM) =>
                  prevM
                    ? {
                        ...prevM,
                        activeSeat: result.activeSeat ?? null,
                        currentRound: result.currentRound,
                        status: result.gameEnded ? "ENDED" : prevM.status,
                      }
                    : prevM,
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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMyTurn, match?.activeSeat, phase, matchId, token, awaitingTradeSeat]);

  // After trade wait window, resume turn timer if still your turn
  useEffect(() => {
    if (awaitingTradeSeat === null || !isMyTurn || phase !== "playing") return;
    const t = setTimeout(() => {
      setAwaitingTradeSeat(null);
      setStatusToast("Trade ended — your turn continues.");
      setTimer(TURN_SECONDS);
      setTimeout(() => setStatusToast(null), 4000);
    }, TRADE_RESPONSE_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [awaitingTradeSeat, isMyTurn, phase]);

  // Background poll during your turn — detect trade accept / turn advance
  useEffect(() => {
    if (!isMyTurn || phase !== "playing" || !matchId || !token) return;
    const mySeat = match?.you.seat;
    const interval = setInterval(async () => {
      try {
        const m = await getMatch(matchId, token);
        if (m.activeSeat !== mySeat) {
          if (timerRef.current) clearInterval(timerRef.current);
          autoPassingRef.current = true;
          if (awaitingTradeSeatRef.current !== null) {
            setStatusToast("Trade accepted! Turn updated.");
            setTimeout(() => setStatusToast(null), 4000);
          }
          setAwaitingTradeSeat(null);
          setMatch(m);
          setNegotiateAttemptsLeft(m.negotiateAttemptsLeft ?? 2);
          const updatedHand = await getHand(matchId, token);
          setHand(updatedHand);
          if (m.status === "ENDED") setPhase("ended");
        } else {
          setMatch(m);
          setNegotiateAttemptsLeft(m.negotiateAttemptsLeft ?? 2);
          if (awaitingTradeSeatRef.current !== null && !m.pendingTradeFromYou) {
            setAwaitingTradeSeat(null);
            setStatusToast("Trade declined — your turn continues.");
            setTimer(TURN_SECONDS);
            setTimeout(() => setStatusToast(null), 4000);
            const updatedHand = await getHand(matchId, token);
            setHand(updatedHand);
          }
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
    if (!matchId || !token || !isMyTurn || actionLoading || awaitingTradeSeat !== null) return;
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
      if (result.gameEnded) {
        setPhase("ended");
      } else {
        await refreshMatchState();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyScout() {
    if (
      !matchId ||
      !token ||
      !isMyTurn ||
      buyLoading ||
      actionLoading ||
      awaitingTradeSeat !== null
    )
      return;
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
    if (
      !isMyTurn ||
      negotiateAttemptsLeft === 0 ||
      !matchId ||
      !token ||
      awaitingTradeSeat !== null
    )
      return;
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

      setAwaitingTradeSeat(negotiateTarget);
      if (timerRef.current) clearInterval(timerRef.current);
      const targetLabel = match
        ? warRoomSeatLabel(negotiateTarget, match.players)
        : `Game Manager ${negotiateTarget}`;
      setStatusToast(`Trade sent — waiting for ${targetLabel}…`);

      // Poll immediately to catch fast accept/reject from rival
      try {
        const m = await getMatch(matchId, token);
        const mySeat = match?.you.seat;
        if (m.activeSeat !== mySeat) {
          if (timerRef.current) clearInterval(timerRef.current);
          autoPassingRef.current = true;
          setAwaitingTradeSeat(null);
          setStatusToast("Trade accepted! Turn updated.");
          setTimeout(() => setStatusToast(null), 4000);
          setMatch(m);
          const updatedHand = await getHand(matchId, token);
          setHand(updatedHand);
          if (m.status === "ENDED") setPhase("ended");
        } else if (!m.pendingTradeFromYou) {
          setAwaitingTradeSeat(null);
          setStatusToast("Trade declined — your turn continues.");
          setTimer(TURN_SECONDS);
          setTimeout(() => setStatusToast(null), 4000);
          setMatch(m);
          const updatedHand = await getHand(matchId, token);
          setHand(updatedHand);
        } else {
          setMatch(m);
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
      setStatusToast(accept ? "Trade accepted!" : "Trade rejected.");
      setTimeout(() => setStatusToast(null), 4000);
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
  const bannerCompact = match?.status === "PLAYING";
  const youPlayerLabel = match
    ? warRoomPlayerLabel(
        match.players.find((p) => p.seat === match.you.seat) ?? {
          seat: match.you.seat,
          username: null,
        },
        match.you.seat,
      )
    : "";
  const warRoomMainClass =
    "page-main max-w-full overflow-x-hidden lg:mx-auto lg:max-w-[1400px] lg:px-6 lg:pb-6";

  const banner = match && (
    <section
      className={`w-full min-w-0 overflow-hidden rounded-2xl bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_50%,#60A5FA_100%)] text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:rounded-[28px] ${
        bannerCompact
          ? "mb-2.5 shrink-0 px-3 py-2.5 sm:px-6 sm:py-4"
          : "mb-6 px-5 py-5 sm:px-10 sm:py-8"
      }`}
    >
      {bannerCompact ? (
        <>
          <div className="flex min-w-0 flex-col gap-2 sm:hidden">
            <div className="flex items-start justify-between gap-3">
              <h1 className="m-0 text-base font-black leading-tight tracking-tight">
                TITANS WAR ROOM
              </h1>
              <p className="shrink-0 pt-0.5 text-right text-[11px] leading-tight opacity-90">
                Code{" "}
                <span className="font-mono text-sm font-bold tracking-wide">
                  {match.inviteCode}
                </span>
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <p className="shrink-0 text-sm font-black">
                Round {match.currentRound} / {MAX_ROUNDS}
              </p>
              <p
                className="min-w-0 flex-1 truncate text-xs opacity-90"
                title={youPlayerLabel}
              >
                {youPlayerLabel}
              </p>
              <button
                type="button"
                onClick={() => { setPendingNavHref("/offseason"); setShowNavConfirm(true); }}
                className="shrink-0 rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
              >
                Leave
              </button>
            </div>
          </div>

          <div className="hidden min-w-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="m-0 text-2xl font-black leading-tight lg:text-3xl">
                TITANS WAR ROOM
              </h1>
              <p className="text-sm opacity-90 lg:text-base">
                Code{" "}
                <span className="font-mono text-base font-bold tracking-widest lg:text-lg">
                  {match.inviteCode}
                </span>
              </p>
            </div>
            <div className="flex min-w-0 shrink-0 items-center gap-4 lg:gap-5">
              <p className="text-lg font-black lg:text-xl">
                Round {match.currentRound} / {MAX_ROUNDS}
              </p>
              <p
                className="max-w-[14rem] truncate text-sm opacity-90 lg:max-w-[16rem] lg:text-base"
                title={youPlayerLabel}
              >
                {youPlayerLabel}
              </p>
              <button
                type="button"
                onClick={() => { setPendingNavHref("/offseason"); setShowNavConfirm(true); }}
                className="rounded-lg border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20 lg:text-base"
              >
                Leave
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="m-0 text-2xl font-black leading-tight sm:text-4xl">
              TITANS WAR ROOM
            </h1>
            <p className="mt-1 text-sm opacity-80">
              Invite code:{" "}
              <span className="font-mono text-base font-bold tracking-widest">
                {match.inviteCode}
              </span>
            </p>
          </div>
          <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:items-end">
            {match.status === "PLAYING" && (
              <p className="text-lg font-black sm:text-xl">
                Round {match.currentRound} / {MAX_ROUNDS}
              </p>
            )}
            <p
              className="max-w-full truncate text-sm opacity-80 sm:max-w-[16rem]"
              title={youPlayerLabel}
            >
              {youPlayerLabel}
            </p>
            <button
              type="button"
              onClick={() => { setPendingNavHref("/offseason"); setShowNavConfirm(true); }}
              className="w-full rounded-lg border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20 sm:w-auto"
            >
              Leave War Room
            </button>
          </div>
        </div>
      )}
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
      <div className="min-h-screen overflow-x-hidden bg-[#F4F5F7]">
        <main className={warRoomMainClass}>
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
        <main className={warRoomMainClass}>
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
      <div className="min-h-screen overflow-x-hidden bg-[#F4F5F7]">
        <main className={warRoomMainClass}>
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
        <main className={warRoomMainClass}>
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
    <div className="min-h-screen overflow-x-hidden bg-[#F4F5F7]">
      <main className={`${warRoomMainClass} flex min-h-screen flex-col !pb-3`}>
        {banner}
        {statusToast && (
          <p className="mb-2 shrink-0 rounded-xl bg-[#0f3d78] px-4 py-2 text-center text-sm font-bold text-white">
            {statusToast}
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-6 [-webkit-overflow-scrolling:touch]">
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
          awaitingTradeSeat={awaitingTradeSeat}
          tradeWaiting={awaitingTradeSeat !== null}
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
        </div>
      </main>
    </div>
  );
}
