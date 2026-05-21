import type { CollectionStats } from "../../types";

interface CollectionProgressBarProps {
  stats: CollectionStats | null;
}

export default function CollectionProgressBar({ stats }: CollectionProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, stats?.progress_percentage ?? 0));

  return (
    <div className="flex items-center gap-4 rounded-xl bg-white px-5 py-4 shadow-sm border border-gray-100">
      <span className="whitespace-nowrap text-sm font-medium text-gray-500">
        Collection Progress
      </span>
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100"
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
