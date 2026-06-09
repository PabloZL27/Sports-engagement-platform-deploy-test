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
    <article className="group flex items-start gap-3 rounded-2xl border border-[#e5eaf1] bg-white p-3 shadow-[0_3px_14px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d7e0eb] hover:shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:gap-5 sm:rounded-[24px] sm:p-4 lg:p-6">
      <div className="w-[108px] shrink-0 sm:w-[180px] lg:w-[214px]">
        <a
          className="relative block aspect-video overflow-hidden rounded-xl bg-[linear-gradient(135deg,#173a67_0%,#4B92DB_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:rounded-[20px]"
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
          <div className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(11,37,69,0.88)] text-white shadow-[0_8px_20px_rgba(11,37,69,0.24)] sm:left-3 sm:top-3 sm:h-9 sm:w-9">
            <svg
              aria-hidden="true"
              className="h-2.5 w-2.5 fill-current sm:h-3.5 sm:w-3.5"
              viewBox="0 0 20 20"
            >
              <path d="M6 4.5v11l9-5.5-9-5.5Z" />
            </svg>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,35,64,0.08)_0%,rgba(12,35,64,0.22)_100%)]" />
        </a>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 sm:gap-3 sm:pt-1">
        <div className="space-y-1 sm:space-y-1.5">
          <span className="block text-[10px] font-medium leading-none text-slate-400 sm:text-[12px]">
            {match.season}
          </span>
          <h3 className="line-clamp-2 text-sm font-bold leading-tight tracking-[-0.02em] text-[#0C2340] sm:text-[22px] sm:leading-[1.05]">
            {match.title}
          </h3>
          <p className="line-clamp-1 text-[11px] font-medium text-slate-400 sm:text-[14px]">
            vs {match.opponent}
          </p>
          <div className="pt-0.5 text-xl font-extrabold leading-none tracking-[-0.04em] text-[#0C2340] sm:text-[36px]">
            {match.score}
          </div>
          <p className="hidden max-w-[34ch] text-[14px] leading-[1.65] text-slate-400 sm:line-clamp-2 sm:block lg:line-clamp-none">
            {match.description}
          </p>
        </div>

        <a
          className="hidden h-10 w-fit items-center gap-2 self-start rounded-full bg-[#0B2545] px-4 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(11,37,69,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0a1f3a] hover:shadow-[0_14px_24px_rgba(11,37,69,0.2)] sm:inline-flex sm:h-11 sm:gap-2.5 sm:px-5 sm:text-[14px]"
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
