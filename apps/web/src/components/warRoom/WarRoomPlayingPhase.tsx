import {
  type HandCard,
  type NewsActionResult,
  type RivalCard,
  type ScoutCard,
  type TradeProposal,
  type WarRoomMatch,
} from "../../services/warRoomService";
import { type NegotiateStep, TURN_SECONDS } from "./warRoomTypes";
import { EmptySlot, PlayerCard } from "./WarRoomPlayerCard";
import { WarRoomNewsModal } from "./WarRoomNewsModal";
import { WarRoomBuyModal } from "./WarRoomBuyModal";
import { WarRoomNegotiateModal } from "./WarRoomNegotiateModal";
import { WarRoomIncomingTradeModal } from "./WarRoomIncomingTradeModal";

interface Props {
  match: WarRoomMatch;
  hand: HandCard[];
  timer: number;
  isMyTurn: boolean;
  actionLoading: boolean;
  buyLoading: boolean;
  actionError: string | null;
  negotiateAttemptsLeft: number;
  negotiateStep: NegotiateStep;
  negotiateTarget: number | null;
  negotiateMyCard: HandCard | null;
  negotiateTheirCard: RivalCard | null;
  negotiateCash: number;
  negotiateLoading: boolean;
  negotiateError: string | null;
  rivalHand: RivalCard[];
  rivalSeats: number[];
  proposedSeats: number[];
  newsResult: NewsActionResult | null;
  scoutCards: ScoutCard[] | null;
  buyTimer: number;
  selectedScout: ScoutCard | null;
  discardMode: boolean;
  incomingTrade: TradeProposal | null;
  incomingTradeTimer: number;
  respondLoading: boolean;
  showNavConfirm: boolean;
  onNews: () => void;
  onBuyScout: () => void;
  onPickPlayer: (poolId: number, discardHandId: number | null) => void;
  onForfeit: () => void;
  onNegotiateOpen: () => void;
  onSelectTarget: (seat: number) => void;
  onSelectMyCard: (card: HandCard) => void;
  onSelectTheirCard: (card: RivalCard) => void;
  onSetCash: (val: number) => void;
  onSetStep: (step: NegotiateStep) => void;
  onProposeTrade: () => void;
  onCloseNegotiate: () => void;
  onRespond: (accept: boolean) => void;
  onSelectScout: (card: ScoutCard | null) => void;
  onSetDiscardMode: (val: boolean) => void;
  onCloseNews: () => void;
  onNavConfirm: () => void;
  onNavCancel: () => void;
}

export function WarRoomPlayingPhase({
  match,
  hand,
  timer,
  isMyTurn,
  actionLoading,
  buyLoading,
  actionError,
  negotiateAttemptsLeft,
  negotiateStep,
  negotiateTarget,
  negotiateMyCard,
  negotiateTheirCard,
  negotiateCash,
  negotiateLoading,
  negotiateError,
  rivalHand,
  rivalSeats,
  proposedSeats,
  newsResult,
  scoutCards,
  buyTimer,
  selectedScout,
  discardMode,
  incomingTrade,
  incomingTradeTimer,
  respondLoading,
  showNavConfirm,
  onNews,
  onBuyScout,
  onPickPlayer,
  onForfeit,
  onNegotiateOpen,
  onSelectTarget,
  onSelectMyCard,
  onSelectTheirCard,
  onSetCash,
  onSetStep,
  onProposeTrade,
  onCloseNegotiate,
  onRespond,
  onSelectScout,
  onSetDiscardMode,
  onCloseNews,
  onNavConfirm,
  onNavCancel,
}: Props) {
  const emptySlots = Math.max(0, 6 - hand.length);
  const timerPct = (timer / TURN_SECONDS) * 100;
  const timerColor = timer > 15 ? "bg-green-400" : timer > 7 ? "bg-yellow-400" : "bg-red-400";
  const canNegotiate = isMyTurn && negotiateAttemptsLeft > 0 && !actionLoading && !buyLoading;

  return (
    <>
      {/* Turn indicator */}
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
        <p className="mb-4 text-center text-red-500 font-semibold text-sm">{actionError}</p>
      )}

      {/* Hand */}
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
          {hand.map((card) => <PlayerCard key={card.id} card={card} />)}
          {Array.from({ length: emptySlots }).map((_, i) => <EmptySlot key={`empty-${i}`} />)}
        </div>
      </div>

      {/* Secret Agendas panel */}
      {match.you.agendas && match.you.agendas.length > 0 && (
        <div className="mb-6 rounded-2xl bg-[#0B2A55] p-4 shadow">
          <p className="text-[10px] font-extrabold tracking-widest text-yellow-400 uppercase mb-3">
            Your Secret Agendas — only you can see these
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {match.you.agendas.map((a) => (
              <div
                key={a.agendaId}
                className="rounded-xl bg-white/10 border border-white/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-black text-white text-sm leading-tight">{a.name}</p>
                  <span className="shrink-0 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-[#0B2A55]">
                    +{a.bonusPoints} / -{a.bonusPoints}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-white/70 leading-snug">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-lg font-black text-[#0B2A55] mb-4">
          {isMyTurn ? "Choose an action" : "Actions"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Breaking News */}
          <button
            type="button"
            disabled={!isMyTurn || actionLoading}
            onClick={onNews}
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
            disabled={!isMyTurn || actionLoading || buyLoading || match.you.titansCash < 5}
            onClick={onBuyScout}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              isMyTurn && !actionLoading && !buyLoading && match.you.titansCash >= 5
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
            onClick={onNegotiateOpen}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              canNegotiate
                ? "border-[#0f3d78] bg-[#0f3d78]/5 hover:bg-[#0f3d78]/10 cursor-pointer"
                : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
            }`}
          >
            <p className="font-black text-[#0B2A55] text-sm mb-1">Negotiate</p>
            <p className="text-xs text-gray-500">Propose a trade with another GM.</p>
            {isMyTurn && negotiateAttemptsLeft === 0 ? (
              <span className="mt-2 inline-block text-[10px] text-red-500 border border-red-300 rounded px-1.5 py-0.5 bg-red-50">
                No attempts left
              </span>
            ) : isMyTurn ? (
              <span className="mt-2 inline-block text-[10px] text-green-600 border border-green-300 rounded px-1.5 py-0.5 bg-green-50">
                {negotiateAttemptsLeft} attempt{negotiateAttemptsLeft !== 1 ? "s" : ""} left
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Modals */}
      {newsResult && <WarRoomNewsModal result={newsResult} onClose={onCloseNews} />}

      {showNavConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl text-center">
            <h2 className="text-xl font-black text-[#0B2A55] mb-2">Leave War Room?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your match stays active but your turns may be skipped while you are away.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onNavCancel}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={onNavConfirm}
                className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {scoutCards && (
        <WarRoomBuyModal
          scoutCards={scoutCards}
          hand={hand}
          buyTimer={buyTimer}
          discardMode={discardMode}
          selectedScout={selectedScout}
          buyLoading={buyLoading}
          onSelectScout={onSelectScout}
          onPickPlayer={onPickPlayer}
          onForfeit={onForfeit}
          onSetDiscardMode={onSetDiscardMode}
        />
      )}

      {negotiateStep !== "closed" && (
        <WarRoomNegotiateModal
          step={negotiateStep}
          rivalSeats={rivalSeats}
          proposedSeats={proposedSeats}
          players={match.players}
          rivalHand={rivalHand}
          myHand={hand}
          myCard={negotiateMyCard}
          theirCard={negotiateTheirCard}
          cash={negotiateCash}
          maxCash={match.you.titansCash}
          loading={negotiateLoading}
          error={negotiateError}
          target={negotiateTarget}
          onSelectTarget={onSelectTarget}
          onSelectMyCard={onSelectMyCard}
          onSelectTheirCard={onSelectTheirCard}
          onSetCash={onSetCash}
          onSetStep={onSetStep}
          onConfirm={onProposeTrade}
          onClose={onCloseNegotiate}
        />
      )}

      {incomingTrade && (
        <WarRoomIncomingTradeModal
          trade={incomingTrade}
          timer={incomingTradeTimer}
          loading={respondLoading}
          onRespond={onRespond}
        />
      )}
    </>
  );
}
