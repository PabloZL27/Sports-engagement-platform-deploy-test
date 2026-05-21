import { Card, Button } from "@heroui/react";
import type { PackOpeningState } from "../../types";

interface PackSectionProps {
  packsRemaining: number;
  isOpening: boolean;
  packState: PackOpeningState | null;
  secondsRemaining: number | null;
  onStartOpening: () => void;
  onClaim: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function EnvelopePreview() {
  return (
    <div className="[perspective:1100px] shrink-0">
      <div className="relative h-48 w-40" style={{ transformStyle: "preserve-3d" }}>
        {/* Soft inner glow */}
        <div
          className="absolute inset-[10%] top-[24%] rounded-md bg-gradient-to-b from-amber-400/15 via-[#4B90CD]/15 to-transparent opacity-80"
          aria-hidden
        />

        {/* Body */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#1a2a42] to-[#0f1b2d] shadow-[0_18px_45px_rgba(0,0,0,0.45)] ring-1 ring-white/10" />

        {/* Pocket */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[58%] rounded-b-lg bg-gradient-to-b from-[#243652] to-[#152238] shadow-inner"
          style={{
            clipPath: "polygon(0 12%, 50% 0, 100% 12%, 100% 100%, 0 100%)",
          }}
          aria-hidden
        />

        {/* Seal */}
        <div
          className="absolute left-1/2 top-[42%] z-20 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-[#8b2942] to-[#5c1528] shadow-lg ring-2 ring-[#c94d6a]/50"
          aria-hidden
        >
          <span className="text-base font-black text-[#f5d0a8]">TC</span>
        </div>

        {/* Flap (closed) */}
        <div className="absolute left-0 right-0 top-0 h-[48%] origin-top">
          <div
            className="h-full w-full bg-gradient-to-br from-[#3d5270] to-[#2a3d56] shadow-md ring-1 ring-white/5 [backface-visibility:hidden]"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              WebkitBackfaceVisibility: "hidden",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PackSection({
  packsRemaining,
  isOpening,
  packState,
  secondsRemaining,
  onStartOpening,
  onClaim,
}: PackSectionProps) {
  const status = packState?.status ?? "NONE";
  const canStart = packsRemaining > 0 && status === "NONE" && !isOpening;
  const canClaim = status === "READY" && !isOpening;
  const isCountingDown = status === "OPENING";
  const countdown = secondsRemaining != null ? formatCountdown(secondsRemaining) : null;

  const buttonLabel = canClaim
    ? "Open now"
    : isCountingDown
      ? `Opening… ${countdown ?? ""}`.trim()
      : isOpening
        ? "Starting…"
        : "Start opening (10s)";

  return (
    <div className="bg-gradient-to-b from-[#0f1b2d] to-[#1a2d47] rounded-2xl p-8 mt-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold">Digital Card Packs</h2>
          <p className="text-gray-400 text-sm mt-1">
            Start opening a pack, wait 24 hours, then claim your cards
          </p>
        </div>
        <span className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white">
          {packsRemaining} Packs Left
        </span>
      </div>

      <Card className="bg-[#1a2d47] border border-gray-600">
        <Card.Content className="flex flex-row items-center gap-8 p-6">
          {/* Pack visual */}
          <EnvelopePreview />

          {/* Pack contents */}
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-3">Pack Contents</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-gray-300 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                3 Guaranteed Common Cards
              </li>
              <li className="flex items-center gap-2 text-gray-300 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                1 Rare or Elite Card
              </li>
              <li className="flex items-center gap-2 text-gray-300 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Chance for Titan Rarity
              </li>
            </ul>
          </div>

          {/* Open button */}
          <div className="shrink-0">
            <Button
              size="lg"
              className="bg-white text-[#0f1b2d] font-bold px-10 hover:bg-gray-100"
              onPress={() => {
                if (canClaim) onClaim();
                else onStartOpening();
              }}
              isDisabled={(!canStart && !canClaim) || isOpening}
            >
              {buttonLabel}
            </Button>
            {isCountingDown ? (
              <p className="mt-2 text-center text-xs text-gray-400">
                Come back when it’s ready to claim.
              </p>
            ) : null}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
