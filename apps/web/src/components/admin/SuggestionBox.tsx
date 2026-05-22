import { useEffect, useState } from "react";
import { getFeedbackList } from "../../services/feedbackService";
import type { FeedbackRecord } from "../../services/feedbackService";

type CategoryKey = "bug" | "cards" | "feature" | "other";
type FilterKey = "all" | CategoryKey;

function getCategoryKey(category: string): CategoryKey {
  const c = category.toLowerCase();
  if (c.includes("bug") || c.includes("error") || c.includes("crash") || c.includes("issue") || c.includes("prueba")) return "bug";
  if (c.includes("card") || c.includes("pack") || c.includes("team") || c.includes("carta")) return "cards";
  if (c.includes("feature") || c.includes("request") || c.includes("improvement") || c.includes("suggestion")) return "feature";
  return "other";
}

const catBadgeClass: Record<CategoryKey, string> = {
  cards: "bg-[#e8edf8] text-[#3a5fa0]",
  bug: "bg-[#fde8e8] text-[#a03a3a]",
  feature: "bg-[#e8f4ec] text-[#2e7a4a]",
  other: "bg-[#ebebeb] text-[#555]",
};

const catLabel: Record<CategoryKey, string> = {
  cards: "Team Cards / Packs",
  bug: "Bug Report",
  feature: "Feature Request",
  other: "Other",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  return diffMs < 7 * 24 * 60 * 60 * 1000;
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[#0d1f3c] bg-[#0d1f3c] text-white"
          : "border-[#d0d4e0] bg-white text-[#3a4560]"
      }`}
    >
      {label}
    </button>
  );
}

const ImageIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#c0c8d8" strokeWidth="1.5"/>
    <circle cx="8.5" cy="8.5" r="1.5" fill="#c0c8d8"/>
    <path d="M3 16l5-5 4 4 3-3 6 6" stroke="#c0c8d8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function SuggestionBox() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    getFeedbackList()
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setFeedbacks(sorted);
      })
      .catch((err: Error) => setError(err.message || "Failed to load feedback"))
      .finally(() => setLoading(false));
  }, []);

  const total = feedbacks.length;
  const thisWeek = feedbacks.filter((f) => isThisWeek(f.created_at)).length;
  const withImages = feedbacks.filter((f) => f.image_urls && f.image_urls.length > 0).length;

  const visible = feedbacks.filter((f) => {
    if (filter === "all") return true;
    return getCategoryKey(f.category) === filter;
  });

  return (
    <div className="w-full">
      <h2 className="m-0 text-[22px] font-extrabold uppercase tracking-[1px] text-[#0d1f3c]">
        Suggestion Box
      </h2>
      <p className="mb-4 mt-1 text-[13px] text-[#9aa3b2]">
        User feedback and suggestions submitted through the platform
      </p>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5 rounded-xl bg-[#f8f9fc] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9aa3b2]">
            Total Suggestions
          </div>
          <div className="text-[28px] font-extrabold text-[#0d1f3c]">{total}</div>
          <div className="text-xs font-semibold text-[#22a85a]">↑ {thisWeek} this week</div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl bg-[#f8f9fc] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9aa3b2]">
            This Week
          </div>
          <div className="text-[28px] font-extrabold text-[#0d1f3c]">{thisWeek}</div>
          <div className={`text-xs font-semibold ${thisWeek > 0 ? "text-[#22a85a]" : "text-[#9aa3b2]"}`}>
            {thisWeek > 0 ? "New feedback" : "No new feedback"}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl bg-[#f8f9fc] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9aa3b2]">
            With Attachments
          </div>
          <div className="text-[28px] font-extrabold text-[#0d1f3c]">{withImages}</div>
          <div className="text-xs font-semibold text-[#9aa3b2]">Include images</div>
        </div>
      </div>

      <div className="rounded-[14px] bg-white p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", "bug", "cards", "feature", "other"] as FilterKey[]).map((f) => (
            <FilterChip
              key={f}
              label={f === "all" ? "All" : catLabel[f as CategoryKey]}
              active={filter === f}
              onClick={() => setFilter(f)}
            />
          ))}
        </div>

        {loading && (
          <div className="py-8 text-center text-sm text-[#9aa3b2]">
            Loading feedback...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-center">
            <p className="m-0 text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="py-8 text-center text-sm text-[#9aa3b2]">
            No suggestions in this category.
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="flex flex-col gap-3">
            {visible.map((item) => {
              const catKey = getCategoryKey(item.category);
              const hasImages = item.image_urls && item.image_urls.length > 0;

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-xl bg-[#f8f9fc] p-4"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-[10px] px-[9px] py-[3px] text-[10px] font-bold uppercase tracking-[0.6px] ${catBadgeClass[catKey]}`}
                      >
                        {catLabel[catKey]}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#0d1f3c]">{item.subject}</div>
                    <div className="text-[13px] leading-[1.55] text-[#5a6278]">{item.message}</div>
                    <div className="mt-1 flex items-center justify-end gap-2.5">
                      <div className="ml-auto text-[11px] text-[#b0b8cc]">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="w-[110px] shrink-0">
                    {hasImages ? (
                      <div className="flex flex-col gap-1.5">
                        {item.image_urls.slice(0, 1).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`Attachment ${i + 1}`}
                              className="block h-[90px] w-[110px] rounded-[10px] border border-[#e8eaf0] object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-[90px] w-[110px] flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#d0d4e0] bg-[#eef0f5] text-[10px] font-semibold uppercase tracking-[0.4px] text-[#b0b8cc]">
                        <ImageIcon />
                        <span>No image</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}