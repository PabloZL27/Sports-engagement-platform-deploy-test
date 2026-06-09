type ReportSeverity = "critical" | "pending" | "resolved";

type ReportPostProps = {
  username?: string;
  severity?: ReportSeverity;
  timeAgo?: string;
  title?: string;
  content?: string | null;
  reportReason?: string | null;
  reportedByCount?: number;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  isDisabled?: boolean;
  onRemovePost?: () => void;
  showActions?: boolean;
  onDismiss?: () => void;
  onOpenDetails?: () => void;
};

const severityLabel: Record<ReportSeverity, string> = {
  critical: "CRITICAL",
  pending: "PENDING",
  resolved: "RESOLVED",
};

const severityClass: Record<ReportSeverity, string> = {
  critical: "bg-[#e4e4e4] text-[#303030]",
  pending: "bg-[#fff3d6] text-[#8a5b00]",
  resolved: "bg-[#dcf4e6] text-[#25633d]",
};

function ReportPost({
  username,
  severity = "critical",
  timeAgo,
  title,
  content,
  reportReason,
  reportedByCount,
  primaryActionLabel = "Remove post",
  secondaryActionLabel = "Dismiss",
  isDisabled = false,
  showActions = true,
  onRemovePost,
  onDismiss,
  onOpenDetails,
}: ReportPostProps) {
  const isClickable = typeof onOpenDetails === "function";
  const initials = (username || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <article
      className={`w-full rounded-2xl bg-[#f7f8fc] px-4 py-4 shadow-[0_6px_16px_rgba(15,23,42,0.03)] sm:rounded-[20px] sm:px-6 sm:py-5 ${
        isClickable ? "cursor-pointer" : ""
      }`}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? "View report details" : undefined}
      onClick={onOpenDetails}
      onKeyDown={(event) => {
        if (!isClickable) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0b2e63] text-xs font-extrabold text-white sm:h-10 sm:w-10 sm:text-[14px]">
            {initials}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-1 sm:gap-x-3 sm:gap-y-2 sm:pt-3">
            {username ? (
              <h3 className="m-0 truncate text-sm font-extrabold leading-none text-[#15233d] sm:text-[18px]">
                @{username}
              </h3>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold leading-none tracking-[0.02em] sm:px-3.5 sm:py-1.5 sm:text-[14px] ${severityClass[severity]}`}
          >
            {severityLabel[severity]}
          </span>
          {timeAgo ? (
            <time className="text-[11px] font-semibold leading-none text-[#a5aec4] sm:text-[14px]">
              {timeAgo}
            </time>
          ) : null}
        </div>
      </div>
      {title ? (
        <h3 className="m-0 mt-2 text-base font-extrabold leading-snug text-[#15233d] sm:text-[20px] sm:leading-none">
          {title}
        </h3>
      ) : null}
      {reportReason ? (
        <p className="m-0 mt-2 text-xs leading-snug text-[#778198] sm:mt-3 sm:text-[16px] sm:leading-[1.35]">
          Report reason:{" "}
          <span className="font-extrabold text-[#596175]">{reportReason}</span>
          {typeof reportedByCount === "number" ? (
            <>
              <span className="mx-1.5 text-[#778198] sm:mx-2">·</span>
              Reported by {reportedByCount} users
            </>
          ) : null}
        </p>
      ) : null}
      {content ? (
        <p className="m-0 mt-2 rounded-xl border-2 border-gray-300 bg-white p-3 text-sm font-medium italic leading-snug text-[#596175] sm:p-[18px] sm:text-[20px] sm:leading-[1.25]">
          {content}
        </p>
      ) : null}


      {showActions ? (
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-4 sm:gap-3">
          <button
            type="button"
            disabled={isDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onRemovePost?.();
            }}
            className="rounded-[10px] border-2 border-[#c61d1d] bg-white px-3.5 py-2 text-xs font-extrabold leading-none text-[#c61d1d] transition hover:border-[#c61d1d] hover:bg-[#c61d1d] hover:text-white disabled:cursor-not-allowed disabled:border-[#d7dce6] disabled:bg-[#f3f4f6] disabled:text-[#a5aec4] disabled:hover:border-[#d7dce6] disabled:hover:bg-[#f3f4f6] sm:rounded-[12px] sm:px-5 sm:py-2.5 sm:text-[16px]"
          >
            {primaryActionLabel}
          </button>
          <button
            type="button"
            disabled={isDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onDismiss?.();
            }}
            className="rounded-[10px] border-2 border-[#d7dce6] bg-white px-3.5 py-2 text-xs font-extrabold leading-none text-[#344363] transition hover:border-[#c6ccd9] hover:bg-[#fbfcff] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#a5aec4] disabled:hover:border-[#d7dce6] disabled:hover:bg-[#f3f4f6] sm:rounded-[12px] sm:px-5 sm:py-2.5 sm:text-[16px]"
          >
            {secondaryActionLabel}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default ReportPost;
