import { useEffect, useState } from "react";
import type { LegendaryPlayer } from "../../types/history";
import { getObjectPosition } from "./historyMedia";

type LegendaryPlayerModalProps = {
  player: LegendaryPlayer | null;
  isOpen: boolean;
  onClose: () => void;
};

function LegendaryPlayerModal({
  player,
  isOpen,
  onClose,
}: LegendaryPlayerModalProps) {
  const [showFallback, setShowFallback] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setShowFallback(!player?.imageUrl);
  }, [player?.id, player?.imageUrl]);

  if (!isOpen || !player) {
    return null;
  }

  const achievements = player.achievements.slice(0, 3);
  const stats = player.stats.slice(0, 4);
  const objectPosition = getObjectPosition(player.cardImagePositionClass) ?? "center 18%";

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(12,35,64,0.54)] p-4 backdrop-blur-[6px] md:p-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative grid max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-[#dbe3ef] bg-white shadow-[0_28px_90px_rgba(12,35,64,0.22)] md:grid-cols-[0.43fr_0.57fr]"
        onClick={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <button
          aria-label="Close player profile modal"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e1ed] bg-white text-2xl leading-none text-[#0C2340] transition hover:bg-slate-50"
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        <div className="border-b border-[#edf2f7] bg-[linear-gradient(180deg,rgba(12,35,64,0.03)_0%,rgba(75,146,219,0.08)_100%)] p-6 md:border-b-0 md:border-r md:p-7">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#153865_0%,#4B92DB_100%)]">
            {!showFallback && player.imageUrl ? (
              <img
                alt={player.name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setShowFallback(true)}
                src={player.imageUrl}
                style={{ objectPosition }}
              />
            ) : null}
            {!showFallback ? (
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,35,64,0.04)_0%,rgba(12,35,64,0.18)_100%)]" />
            ) : null}
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-7 pr-16 md:px-8 md:py-8 md:pr-[74px]">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex min-h-8 min-w-[68px] items-center justify-center rounded-full bg-[#0C2340] px-3 text-[10px] font-extrabold tracking-[0.08em] text-white">
                  {player.position}
                </span>
                <span className="inline-flex min-h-8 items-center justify-center rounded-full bg-[#edf4fd] px-3 text-[10px] font-bold text-[#1c4a86]">
                  {player.era}
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="m-0 text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#0C2340]">
                  {player.name}
                </h3>
                <p className="m-0 max-w-[42ch] text-[14px] leading-relaxed text-slate-500">
                  {player.subtitle}
                </p>
              </div>
            </div>

            <p className="m-0 max-w-[48ch] text-[14px] leading-[1.8] text-[#334155]">
              {player.bio}
            </p>

            <div className="space-y-3">
              <h4 className="m-0 text-[15px] font-extrabold text-[#0C2340]">
                Stats Snapshot
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex min-h-[76px] flex-col justify-center rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      {stat.label}
                    </span>
                    <span className="mt-1.5 truncate text-[15px] font-bold leading-tight text-[#0C2340]">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="m-0 text-[15px] font-extrabold text-[#0C2340]">
                Achievements
              </h4>
              <ul className="m-0 space-y-2 pl-5 text-[13px] leading-[1.7] text-slate-600">
                {achievements.map((achievement) => (
                  <li key={achievement}>{achievement}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LegendaryPlayerModal;
