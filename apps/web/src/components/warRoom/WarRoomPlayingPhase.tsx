import {
  type HandCard,
  type NewsActionResult,
  type RivalCard,
  type ScoutCard,
  type TradeProposal,
  type WarRoomMatch,
} from "../../services/warRoomService";
import { type NegotiateStep, TURN_SECONDS } from "./warRoomTypes";
import { warRoomSeatLabel } from "./warRoomPlayerLabel";
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
  awaitingTradeSeat: number | null;
  tradeWaiting: boolean;
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
  awaitingTradeSeat,
  tradeWaiting,
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
  const timerColor = timer > 22 ? "bg-green-400" : timer > 11 ? "bg-yellow-400" : "bg-red-400";
  const canNegotiate =
    isMyTurn && negotiateAttemptsLeft > 0 && !actionLoading && !buyLoading && !tradeWaiting;

  return (
    <>
      <div className="flex min-h-0 flex-col gap-2 pb-2">
        {/* Turn indicator */}
        <div className="shrink-0 space-y-1.5">
          <div
            className={`rounded-xl px-5 py-3 text-center font-black text-sm sm:text-base ${
              isMyTurn
                ? "border-2 border-green-300 bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {isMyTurn
              ? `Your turn — ${timer}s remaining`
              : `Waiting for ${warRoomSeatLabel(match.activeSeat ?? 0, match.players)}...`}
            {isMyTurn && awaitingTradeSeat !== null && (
              <span className="mt-1 block text-xs font-semibold text-amber-700 sm:text-sm">
                Waiting for {warRoomSeatLabel(awaitingTradeSeat, match.players)} — timer paused
              </span>
            )}
          </div>
          {isMyTurn && (
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${timerColor}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Secret Agendas panel */}
        {match.you.agendas && match.you.agendas.length > 0 && (
          <div className="shrink-0 rounded-xl bg-[#0B2A55] p-3 shadow sm:rounded-2xl sm:p-4">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-yellow-400 sm:mb-3 sm:text-sm sm:tracking-widest">
              Your Secret Agendas — only you can see these
            </p>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              {match.you.agendas.map((a) => {
                const done = a.achieved === true;
                const missed = a.achieved === false;
                return (
                  <div
                    key={a.agendaId}
                    className={`rounded-lg border p-2.5 sm:rounded-xl sm:p-3.5 ${
                      done
                        ? "border-green-400 bg-green-500/15"
                        : missed
                          ? "border-red-400 bg-red-500/15"
                          : "border-white/20 bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                      <p
                        className={`text-sm font-black leading-tight sm:text-lg ${
                          done ? "text-green-100" : missed ? "text-red-100" : "text-white"
                        }`}
                      >
                        {a.name}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black sm:px-2.5 sm:py-1 sm:text-xs ${
                          done
                            ? "bg-green-400 text-[#0B2A55]"
                            : missed
                              ? "bg-red-400 text-white"
                              : "bg-yellow-400 text-[#0B2A55]"
                        }`}
                      >
                        {done
                          ? `+${a.bonusPoints} pts`
                          : missed
                            ? `-${a.bonusPoints} pts`
                            : `±${a.bonusPoints} pts`}
                      </span>
                    </div>
                    <p
                      className={`mt-1 line-clamp-2 text-xs leading-snug sm:mt-1.5 sm:line-clamp-none sm:text-sm ${
                        done
                          ? "text-green-100/90"
                          : missed
                            ? "text-red-100/90"
                            : "text-white/80"
                      }`}
                    >
                      {a.description}
                    </p>
                    {a.achieved !== undefined && (
                      <p
                        className={`mt-0.5 text-[10px] font-bold uppercase tracking-wide sm:mt-1 sm:text-xs ${
                          done ? "text-green-300" : "text-red-300"
                        }`}
                      >
                        {done ? "Completed" : "Not completed"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {actionError && (
          <p className="shrink-0 text-center text-xs font-semibold text-red-500 sm:text-sm">
            {actionError}
          </p>
        )}

        {/* Hand — card grid size unchanged */}
        <div className="shrink-0 rounded-2xl bg-white p-3 shadow sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#0B2A55] sm:text-xl">Your Hand</h2>
              <p className="text-sm text-gray-500">
                {hand.length} / 6 cards —{" "}
                <span className="font-bold text-[#0B2A55]">
                  {hand.reduce((sum, c) => sum + c.tier, 0)} pts total
                </span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400">
                TitanCash
              </p>
              <p className="text-4xl font-black leading-none text-[#0f3d78]">
                {match.you.titansCash}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-6">
            {hand.map((card) => <PlayerCard key={card.id} card={card} />)}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 rounded-2xl bg-white p-4 shadow sm:p-5">
          <h2 className="mb-3 text-lg font-black text-[#0B2A55] sm:text-xl">
            {isMyTurn ? "Choose an action" : "Actions"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
          {/* Breaking News */}
          <button
            type="button"
            disabled={!isMyTurn || actionLoading || tradeWaiting}
            onClick={onNews}
            className={`rounded-xl border-2 p-3.5 text-left transition-all sm:p-4 ${
              isMyTurn && !actionLoading && !tradeWaiting
                ? "border-[#0f3d78] bg-[#0f3d78]/5 hover:bg-[#0f3d78]/10 cursor-pointer"
                : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-black leading-tight text-[#0B2A55] sm:text-lg">
                {actionLoading ? "Drawing..." : "Breaking News"}
              </p>
              {isMyTurn && !actionLoading && !tradeWaiting && (
                <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-green-700 border border-green-300 bg-green-50">
                  Available
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-snug text-gray-600">
              Draw an event card that affects your TitanCash.
            </p>
          </button>

          {/* Buy Player */}
          <button
            type="button"
            disabled={
              !isMyTurn || actionLoading || buyLoading || tradeWaiting || match.you.titansCash < 5
            }
            onClick={onBuyScout}
            className={`rounded-xl border-2 p-3.5 text-left transition-all sm:p-4 ${
              isMyTurn &&
              !actionLoading &&
              !buyLoading &&
              !tradeWaiting &&
              match.you.titansCash >= 5
                ? "border-[#0f3d78] bg-[#0f3d78]/5 hover:bg-[#0f3d78]/10 cursor-pointer"
                : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-black leading-tight text-[#0B2A55] sm:text-lg">
                {buyLoading ? "Scouting..." : "Buy Player"}
              </p>
              {isMyTurn && !tradeWaiting && match.you.titansCash < 5 ? (
                <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-orange-600 border border-orange-300 bg-orange-50">
                  Need 5 TC
                </span>
              ) : isMyTurn && !buyLoading && !tradeWaiting ? (
                <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-green-700 border border-green-300 bg-green-50">
                  Available
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-sm leading-snug text-gray-600">
              Spend 5 TitanCash to scout 3 players and pick one.
            </p>
          </button>

          {/* Negotiate */}
          <button
            type="button"
            disabled={!canNegotiate}
            onClick={onNegotiateOpen}
            className={`rounded-xl border-2 p-3.5 text-left transition-all sm:p-4 ${
              canNegotiate
                ? "border-[#0f3d78] bg-[#0f3d78]/5 hover:bg-[#0f3d78]/10 cursor-pointer"
                : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-black leading-tight text-[#0B2A55] sm:text-lg">
                Negotiate
              </p>
              {isMyTurn && negotiateAttemptsLeft === 0 ? (
                <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-red-600 border border-red-300 bg-red-50">
                  None left
                </span>
              ) : isMyTurn ? (
                <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-green-700 border border-green-300 bg-green-50">
                  {negotiateAttemptsLeft} left
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-sm leading-snug text-gray-600">
              Propose a trade with another Game Manager.
            </p>
          </button>
        </div>
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
          fromLabel={warRoomSeatLabel(incomingTrade.fromSeat, match.players)}
          timer={incomingTradeTimer}
          loading={respondLoading}
          onRespond={onRespond}
        />
      )}
    </>
  );
}
