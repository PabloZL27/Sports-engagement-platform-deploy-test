import { useEffect, useState } from "react";
import { getFeedbackList } from "../../services/feedbackService";
import type { FeedbackRecord } from "../../services/feedbackService";

const NAVY = "#0d1f3c";
const LABEL_COLOR = "#9aa3b2";

type CategoryKey = "bug" | "cards" | "feature" | "other";
type FilterKey = "all" | CategoryKey;

function getCategoryKey(category: string): CategoryKey {
  const c = category.toLowerCase();
  if (c.includes("bug") || c.includes("error") || c.includes("crash") || c.includes("issue") || c.includes("prueba")) return "bug";
  if (c.includes("card") || c.includes("pack") || c.includes("team") || c.includes("carta")) return "cards";
  if (c.includes("feature") || c.includes("request") || c.includes("improvement") || c.includes("suggestion")) return "feature";
  return "other";
}

const catBadgeStyle: Record<CategoryKey, React.CSSProperties> = {
  cards: { background: "#e8edf8", color: "#3a5fa0" },
  bug: { background: "#fde8e8", color: "#a03a3a" },
  feature: { background: "#e8f4ec", color: "#2e7a4a" },
  other: { background: "#ebebeb", color: "#555" },
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

const badge: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
  padding: "3px 9px", borderRadius: 10, textTransform: "uppercase",
};

const s: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: 22, fontWeight: 800, color: NAVY, textTransform: "uppercase", letterSpacing: 1, margin: 0 },
  pageSubtitle: { fontSize: 13, color: LABEL_COLOR, marginTop: 4, marginBottom: 16 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 },
  statCard: { background: "#f8f9fc", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 11, fontWeight: 600, color: LABEL_COLOR, textTransform: "uppercase", letterSpacing: 0.8 },
  statValue: { fontSize: 28, fontWeight: 800, color: NAVY },
  card: { background: "#fff", borderRadius: 14, padding: 20 },
  filtersRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  sugCard: { display: "flex", gap: 16, alignItems: "flex-start", padding: 16, background: "#f8f9fc", borderRadius: 12 },
  sugLeft: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 },
  sugTop: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sugTitle: { fontSize: 14, fontWeight: 700, color: NAVY },
  sugBody: { fontSize: 13, color: "#5a6278", lineHeight: 1.55 },
  sugFooter: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  sugTime: { fontSize: 11, color: "#b0b8cc", marginLeft: "auto" },
  imgPlaceholder: { width: 110, height: 90, borderRadius: 10, background: "#eef0f5", border: "1.5px dashed #d0d4e0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "#b0b8cc", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 },
};

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
        cursor: "pointer", border: "1.5px solid",
        borderColor: active ? NAVY : "#d0d4e0",
        background: active ? NAVY : "#fff",
        color: active ? "#fff" : "#3a4560",
        transition: "all .15s",
      }}
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
      <h2 style={s.pageTitle}>Suggestion Box</h2>
      <p style={s.pageSubtitle}>User feedback and suggestions submitted through the platform</p>

      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Suggestions</div>
          <div style={s.statValue}>{total}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#22a85a" }}>↑ {thisWeek} this week</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>This Week</div>
          <div style={s.statValue}>{thisWeek}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: thisWeek > 0 ? "#22a85a" : LABEL_COLOR }}>
            {thisWeek > 0 ? "New feedback" : "No new feedback"}
          </div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>With Attachments</div>
          <div style={s.statValue}>{withImages}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>Include images</div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.filtersRow}>
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
          <div style={{ padding: "32px 0", textAlign: "center", color: LABEL_COLOR, fontSize: 14 }}>
            Loading feedback...
          </div>
        )}

        {!loading && error && (
          <div style={{ borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", padding: "20px 16px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#dc2626" }}>{error}</p>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div style={{ padding: "32px 0", textAlign: "center", color: LABEL_COLOR, fontSize: 14 }}>
            No suggestions in this category.
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visible.map((item) => {
              const catKey = getCategoryKey(item.category);
              const hasImages = item.image_urls && item.image_urls.length > 0;

              return (
                <div key={item.id} style={s.sugCard}>
                  <div style={s.sugLeft}>
                    <div style={s.sugTop}>
                      <span style={{ ...badge, ...catBadgeStyle[catKey] }}>
                        {catLabel[catKey]}
                      </span>
                    </div>
                    <div style={s.sugTitle}>{item.subject}</div>
                    <div style={s.sugBody}>{item.message}</div>
                    <div style={s.sugFooter}>
                      <div style={s.sugTime}>{formatDate(item.created_at)}</div>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, width: 110 }}>
                    {hasImages ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {item.image_urls.slice(0, 1).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`Attachment ${i + 1}`}
                              style={{ width: 110, height: 90, borderRadius: 10, objectFit: "cover", border: "1.5px solid #e8eaf0", display: "block" }}
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div style={s.imgPlaceholder}>
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
