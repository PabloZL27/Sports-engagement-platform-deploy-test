import { useMemo } from "react";
import type { WordleLeaderboardEntry } from "../../types/wordle";

interface WordleStatsProps {
  entries: WordleLeaderboardEntry[];
  errorMessage: string | null;
  isLoading: boolean;
  puzzleDate: string | null;
}

function formatPlaytime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

const COPY_CLASS = "m-0 text-sm leading-[1.5] text-[#49617f]";

function WordleStats({
  entries,
  errorMessage,
  isLoading,
  puzzleDate,
}: WordleStatsProps) {
  const topEntries = useMemo(() => {
    const seenUsers = new Set<string>();

    return entries.filter((entry) => {
      const userKey = String(entry.userId);

      if (seenUsers.has(userKey)) {
        return false;
      }

      seenUsers.add(userKey);
      return true;
    }).slice(0, 5);
  }, [entries]);

  return (
    <section className="flex min-h-[360px] h-full flex-col justify-start gap-5 rounded-[14px] border border-[#d8dee5] bg-[#f5f8fb] p-6 text-[#0b2a55]">
      <div className="flex flex-col gap-1.5">
        <p className="m-0 text-[12px] font-extrabold tracking-[0.12em] text-[#0f3d78]">TOP 5</p>
        <h3 className="m-0 text-2xl font-extrabold">Leaderboard</h3>
        <p className={COPY_CLASS}>
          {puzzleDate
            ? `Top 5 scores for ${puzzleDate}.`
            : "Top 5 scores for the day by attempts, time, and finish order."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? <p className={COPY_CLASS}>Loading leaderboard...</p> : null}
        {errorMessage ? <p className={COPY_CLASS}>{errorMessage}</p> : null}

        {!isLoading && !errorMessage && topEntries.length === 0 ? (
          <p className={COPY_CLASS}>No scores for this puzzle yet.</p>
        ) : null}

        {topEntries.map((player) => (
          <article
            key={`${player.puzzleDate}-${player.userId}`}
            className="grid grid-cols-[auto_1fr] items-center gap-3.5 rounded-[14px] border border-[#d6deea] bg-white px-4 py-3.5 shadow-[0_10px_24px_rgba(15,61,120,0.08)]"
          >
            <div className="inline-flex h-12 min-w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f3d78,#2b6cb0)] text-base font-extrabold text-white">
              #{player.rank}
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <p className="m-0 text-base font-extrabold">{player.playerName}</p>
              <p className="m-0 text-[13px] font-semibold text-[#58718d]">
                {player.attemptCount} attempts · {formatPlaytime(player.playtimeSeconds)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default WordleStats;
