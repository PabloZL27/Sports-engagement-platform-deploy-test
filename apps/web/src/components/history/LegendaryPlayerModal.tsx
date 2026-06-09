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
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-[rgba(12,35,64,0.54)] p-0 backdrop-blur-[6px] sm:items-center sm:p-4 md:p-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative flex h-[min(92dvh,920px)] w-full min-h-0 max-w-5xl flex-col overflow-hidden rounded-t-[28px] border border-[#dbe3ef] bg-white shadow-[0_28px_90px_rgba(12,35,64,0.22)] sm:h-auto sm:max-h-[85vh] sm:rounded-[32px] md:grid md:h-auto md:grid-cols-[0.43fr_0.57fr]"
        onClick={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <button
          aria-label="Close player profile modal"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#d8e1ed] bg-white text-xl leading-none text-[#0C2340] shadow-sm transition hover:bg-slate-50 sm:right-4 sm:top-4 sm:h-10 sm:w-10 sm:text-2xl"
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        <div className="shrink-0 border-b border-[#edf2f7] bg-[linear-gradient(180deg,rgba(12,35,64,0.03)_0%,rgba(75,146,219,0.08)_100%)] p-3 sm:p-6 md:border-b-0 md:border-r md:p-7">
          <div className="relative mx-auto aspect-[16/10] max-h-[24dvh] w-full overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#153865_0%,#4B92DB_100%)] sm:max-h-[38dvh] sm:rounded-[20px] md:aspect-[4/5] md:max-h-none md:rounded-[24px]">
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 [-webkit-overflow-scrolling:touch] sm:px-6 sm:py-7 md:px-8 md:py-8">
          <div className="space-y-5 sm:space-y-6">
            <div className="space-y-4 pr-8 sm:space-y-5 sm:pr-10">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex min-h-7 items-center justify-center rounded-full bg-[#0C2340] px-2.5 text-[10px] font-extrabold tracking-[0.06em] text-white sm:min-h-8 sm:px-3 sm:tracking-[0.08em]">
                  {player.position}
                </span>
                <span className="inline-flex min-h-7 items-center justify-center rounded-full bg-[#edf4fd] px-2.5 text-[10px] font-bold text-[#1c4a86] sm:min-h-8 sm:px-3">
                  {player.era}
                </span>
              </div>

              <div className="space-y-2 sm:space-y-2.5">
                <h3 className="m-0 text-xl font-extrabold leading-tight tracking-[-0.02em] text-[#0C2340] sm:text-[30px] sm:leading-[1.05]">
                  {player.name}
                </h3>
                <p className="m-0 text-sm leading-relaxed text-slate-500 sm:max-w-[42ch]">
                  {player.subtitle}
                </p>
              </div>
            </div>

            <p className="m-0 text-sm leading-[1.7] text-[#475569] sm:max-w-[48ch] sm:leading-[1.8] sm:text-[#334155]">
              {player.bio}
            </p>
          </div>

          <div className="mt-7 space-y-3.5 sm:mt-8 sm:space-y-4">
            <h4 className="m-0 text-[15px] font-extrabold text-[#0C2340]">
              Stats Snapshot
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3 sm:min-h-[76px] sm:rounded-2xl sm:px-4 sm:py-3.5"
                >
                  <span className="block text-[11px] font-bold uppercase leading-tight tracking-[0.06em] text-slate-500 sm:tracking-[0.08em]">
                    {stat.label}
                  </span>
                  <span className="mt-2 block text-lg font-extrabold leading-none text-[#0C2340] sm:mt-2.5 sm:text-[15px]">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-3.5 pb-3 sm:mt-7 sm:space-y-4 sm:pb-2">
            <h4 className="m-0 text-[15px] font-extrabold text-[#0C2340]">
              Achievements
            </h4>
            <ul className="m-0 list-disc space-y-2.5 pl-4 text-[13px] leading-relaxed text-slate-600 sm:space-y-3 sm:pl-5 sm:leading-[1.75]">
              {achievements.map((achievement) => (
                <li key={achievement}>{achievement}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LegendaryPlayerModal;
