import type { CollectionStats } from "../../types";

interface CollectionProgressBarProps {
  stats: CollectionStats | null;
}

export default function CollectionProgressBar({ stats }: CollectionProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, stats?.progress_percentage ?? 0));

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4">
      <span className="shrink-0 text-sm font-medium text-gray-500">
        Collection Progress
      </span>
      <div
        className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Collection progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0f1b2d] to-[#4B90CD] transition-[width] duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-sm font-bold text-[#4B90CD]">
        {percentage}%
      </span>
    </div>
  );
}
