import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import EnvelopeVisual from "./EnvelopeVisual";
import PlayerCard from "./PlayerCard";
import type { PackOpenResult, RosterCard } from "../../types";

/** Minimum envelope animation time before showing pulls (ms). */
const ENVELOPE_REVEAL_MS = 1900;

interface PackOpeningExperienceProps {
  result: PackOpenResult | null;
  rosterCards: RosterCard[];
  onViewStats?: (athleteId: number) => void;
  onClose: () => void;
}

function resolveUnlockedCards(
  unlocked: PackOpenResult["cards_unlocked"],
  roster: RosterCard[],
): RosterCard[] {
  const byId = new Map(roster.map((card) => [card.card_id, card]));

  return unlocked.map((card) => {
    const full = byId.get(card.card_id);
    if (full) {
      return { ...full, unlocked: true };
    }

    return {
      card_id: card.card_id,
      card_image: null,
      rarity: card.rarity,
      athlete_id: 0,
      espn_athlete_id: 0,
      display_name: card.display_name,
      position: card.position,
      jersey_num: card.jersey_num,
      headshot_url: null,
      age: 0,
      weight: 0,
      height: 0,
      unlocked: true,
    };
  });
}

export default function PackOpeningExperience({
  result,
  rosterCards,
  onViewStats,
  onClose,
}: PackOpeningExperienceProps) {
  const [flapOpen, setFlapOpen] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const openedAtRef = useRef<number>(Date.now());

  const unlockedCards = useMemo(
    () => (result ? resolveUnlockedCards(result.cards_unlocked, rosterCards) : []),
    [result, rosterCards],
  );

  useEffect(() => {
    openedAtRef.current = Date.now();
    const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flapDelay = prefersReduce ? 80 : 550;
    const flapId = window.setTimeout(() => setFlapOpen(true), flapDelay);
    return () => window.clearTimeout(flapId);
  }, []);

  useEffect(() => {
    if (!result) return;
    const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduce) {
      setShowRewards(true);
      return;
    }
    const elapsed = Date.now() - openedAtRef.current;
    const wait = Math.max(0, ENVELOPE_REVEAL_MS - elapsed);
    const id = window.setTimeout(() => setShowRewards(true), wait);
    return () => window.clearTimeout(id);
  }, [result]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md motion-reduce:backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pack-opening-title"
    >
      <button
        type="button"
        className="absolute right-3 top-3 z-[110] rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white sm:right-4 sm:top-4"
        onClick={onClose}
      >
        Close
      </button>

      {!showRewards ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-5 py-8">
          <h2 id="pack-opening-title" className="text-center text-lg font-bold tracking-wide text-white">
            {result ? "Your pack is ready" : "Opening your pack…"}
          </h2>

          <div className="relative flex justify-center">
            <EnvelopeVisual variant="opening" flapOpen={flapOpen} />

            {!result ? (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3">
                <div
                  className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-[#4B90CD]"
                  aria-hidden
                />
              </div>
            ) : null}
          </div>

          <p className="max-w-xs text-center text-sm text-gray-400">
            {result
              ? "Slide the cards out of the envelope."
              : "Tearing the seal and revealing your pulls…"}
          </p>
        </div>
      ) : null}

      {showRewards && result ? (
        <div className="my-auto w-full max-w-[min(100%,40rem)] animate-[pack-reward-in_0.55s_ease-out_both] rounded-2xl border border-gray-600/80 bg-gradient-to-b from-[#0f1b2d] to-[#1a2d47] p-4 shadow-2xl sm:p-6">
          <div className="mb-4 text-center sm:mb-6">
            <h3 id="pack-opening-title" className="text-xl font-black text-white sm:text-2xl">
              PACK OPENED!
            </h3>
            <p className="mt-1 text-xs text-gray-400 sm:text-sm">
              You unlocked {result.cards_unlocked.length} new card
              {result.cards_unlocked.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {unlockedCards.map((card, i) => (
              <div
                key={card.card_id}
                className="min-w-0 opacity-0 animate-[pack-card-pop_0.45s_ease-out_both]"
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                <PlayerCard
                  card={card}
                  onViewStats={(athleteId) => {
                    onClose();
                    onViewStats?.(athleteId);
                  }}
                />
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-gray-400 sm:mt-6 sm:text-sm">
            {result.packs_remaining} packs remaining
          </p>

          <div className="mt-4 flex justify-center sm:mt-6">
            <Button
              size="lg"
              className="w-full bg-white px-8 font-bold text-[#0f1b2d] sm:w-auto sm:px-12"
              onPress={onClose}
            >
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes pack-reward-in {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pack-card-pop {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
