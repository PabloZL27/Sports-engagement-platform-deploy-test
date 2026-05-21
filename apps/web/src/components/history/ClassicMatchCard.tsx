import { useEffect, useState } from "react";
import type { ClassicMatch } from "../../types/history";
import { getYoutubeThumbnailUrl } from "./historyMedia";

type ClassicMatchCardProps = {
  match: ClassicMatch;
};

function ClassicMatchCard({ match }: ClassicMatchCardProps) {
  const previewImageUrl = match.imageUrl || getYoutubeThumbnailUrl(match.youtubeUrl);
  const [showFallback, setShowFallback] = useState(!previewImageUrl);

  useEffect(() => {
    setShowFallback(!previewImageUrl);
  }, [match.id, previewImageUrl]);

  return (
    <article className="group flex flex-col gap-4 rounded-[24px] border border-[#e5eaf1] bg-white p-4 shadow-[0_3px_14px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d7e0eb] hover:shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:flex-row sm:items-start sm:gap-5 sm:p-6">
      <div className="w-full shrink-0 sm:w-[214px]">
        <a
          className="relative block aspect-video overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#173a67_0%,#4B92DB_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          href={match.youtubeUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {!showFallback && previewImageUrl ? (
            <img
              alt={match.title}
              className="absolute inset-0 h-full w-full object-cover object-center"
              onError={() => setShowFallback(true)}
              src={previewImageUrl}
            />
          ) : null}
          <div className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(11,37,69,0.88)] text-white shadow-[0_8px_20px_rgba(11,37,69,0.24)]">
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5 fill-current"
              viewBox="0 0 20 20"
            >
              <path d="M6 4.5v11l9-5.5-9-5.5Z" />
            </svg>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,35,64,0.08)_0%,rgba(12,35,64,0.22)_100%)]" />
        </a>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 sm:pt-1">
        <div className="space-y-1.5">
          <span className="block text-[12px] font-medium leading-none text-slate-400">
            {match.season}
          </span>
          <h3 className="text-[22px] font-bold leading-[1.05] tracking-[-0.02em] text-[#0C2340]">
            {match.title}
          </h3>
          <p className="text-[13px] font-medium text-slate-400 sm:text-[14px]">
            vs {match.opponent}
          </p>
          <div className="pt-0.5 text-[36px] font-extrabold leading-none tracking-[-0.04em] text-[#0C2340]">
            {match.score}
          </div>
          <p className="max-w-[34ch] text-[14px] leading-[1.65] text-slate-400">
            {match.description}
          </p>
        </div>

        <a
          className="inline-flex h-11 w-fit items-center gap-2.5 self-start rounded-full bg-[#0B2545] px-5 text-[14px] font-bold text-white shadow-[0_8px_18px_rgba(11,37,69,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0a1f3a] hover:shadow-[0_14px_24px_rgba(11,37,69,0.2)]"
          href={match.youtubeUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 fill-current"
            viewBox="0 0 20 20"
          >
            <path d="M6 4.5v11l9-5.5-9-5.5Z" />
          </svg>
          {match.buttonLabel.trim()}
        </a>
      </div>
    </article>
  );
}

export default ClassicMatchCard;
