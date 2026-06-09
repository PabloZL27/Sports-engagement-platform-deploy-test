import { Card, Button } from "@heroui/react";
import EnvelopeVisual from "./EnvelopeVisual";
import type { PackOpeningState } from "../../types";

interface PackSectionProps {
  packsRemaining: number;
  isOpening: boolean;
  packState: PackOpeningState | null;
  secondsRemaining: number | null;
  onStartOpening: () => void;
  onClaim: () => void;
}

const DEFAULT_PACKS_TOTAL = 12;
const PACK_OPENING_BASE_SECONDS = 10;
const PACK_OPENING_MULTIPLIER = 2;

function getNextPackOpeningSeconds(packsRemaining: number): number {
  const packNumber = DEFAULT_PACKS_TOTAL + 1 - packsRemaining;
  const n = Math.max(1, Math.min(packNumber, DEFAULT_PACKS_TOTAL));
  return PACK_OPENING_BASE_SECONDS * Math.pow(PACK_OPENING_MULTIPLIER, n - 1);
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
  return <EnvelopeVisual variant="preview" className="shrink-0" />;
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

  const nextOpeningSeconds = getNextPackOpeningSeconds(packsRemaining);

  const buttonLabel = canClaim
    ? "Open now"
    : isCountingDown
      ? `Opening… ${countdown ?? ""}`.trim()
      : isOpening
        ? "Starting…"
        : `Start opening (${formatCountdown(nextOpeningSeconds)})`;

  return (
    <div className="mt-8 rounded-2xl bg-gradient-to-b from-[#0f1b2d] to-[#1a2d47] p-4 sm:mt-10 sm:p-6 lg:mt-10 lg:p-8">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4 lg:mb-6 lg:items-center">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white sm:text-2xl lg:text-2xl">Digital Card Packs</h2>
          <p className="mt-1 text-xs text-gray-400 sm:text-sm lg:mt-1 lg:text-sm">
            Each pack takes longer to open — wait time doubles with every pack you start
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white sm:px-4 sm:py-2 sm:text-sm lg:px-4 lg:py-2 lg:text-sm">
          {packsRemaining} Packs Left
        </span>
      </div>

      <Card className="border border-gray-600 bg-[#1a2d47]">
        <Card.Content className="flex flex-col items-center gap-5 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6 lg:flex-row lg:gap-8 lg:p-6">
          <EnvelopePreview />

          <div className="w-full min-w-0 flex-1 text-center sm:text-left lg:text-left">
            <h3 className="mb-2 text-base font-bold text-white sm:mb-3 sm:text-lg lg:mb-3 lg:text-lg">
              Pack Contents
            </h3>
            <ul className="space-y-1.5 sm:space-y-2 lg:space-y-2">
              <li className="flex items-center justify-center gap-2 text-xs text-gray-300 sm:justify-start sm:text-sm lg:justify-start lg:text-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                3 Guaranteed Common Cards
              </li>
              <li className="flex items-center justify-center gap-2 text-xs text-gray-300 sm:justify-start sm:text-sm lg:justify-start lg:text-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                1 Rare or Elite Card
              </li>
              <li className="flex items-center justify-center gap-2 text-xs text-gray-300 sm:justify-start sm:text-sm lg:justify-start lg:text-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                Chance for Titan Rarity
              </li>
            </ul>
          </div>

          <div className="w-full shrink-0 sm:w-auto lg:w-auto">
            <Button
              size="lg"
              className="w-full bg-white px-6 font-bold text-[#0f1b2d] hover:bg-gray-100 sm:w-auto sm:px-10 lg:px-10"
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
