type ReportSeverity = "critical" | "pending" | "resolved";

type ReportPostProps = {
  username?: string;
  severity?: ReportSeverity;
  timeAgo?: string;
  title?: string | null;
  meta?: string;
  content?: string | null;
  reportReason?: string | null;
  reportedByCount?: number;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onRemovePost?: () => void;
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
  meta,
  content,
  reportReason,
  reportedByCount,
  primaryActionLabel = "Remove post",
  secondaryActionLabel = "Dismiss",
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
      className={`w-full rounded-[20px] bg-[#f7f8fc] px-6 py-5 shadow-[0_6px_16px_rgba(15,23,42,0.03)] ${
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b2e63] text-[14px] font-extrabold text-white">
            {initials}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            {username ? (
              <h3 className="m-0 text-[18px] font-extrabold leading-none text-[#15233d]">
                @{username}
              </h3>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-3.5 py-1.5 text-[14px] font-extrabold leading-none tracking-[0.02em] ${severityClass[severity]}`}
          >
            {severityLabel[severity]}
          </span>
          {timeAgo ? (
            <time className="text-[14px] font-semibold leading-none text-[#a5aec4]">
              {timeAgo}
            </time>
          ) : null}
        </div>
      </div>
      {meta ? (
        <p className="m-0 mt-2 text-[15px] font-semibold leading-none text-[#8a94ab]">
          {meta}
        </p>
      ) : null}
      {title ? (
        <h3 className="m-0 mt-2 text-[20px] font-extrabold leading-none text-[#15233d]">
          {title}
        </h3>
      ) : null}
      {reportReason ? (
        <p className="m-0 mt-3 text-[16px] leading-[1.35] text-[#778198]">
          Report reason:{" "}
          <span className="font-extrabold text-[#596175]">{reportReason}</span>
          {typeof reportedByCount === "number" ? (
            <>
              <span className="mx-2 text-[#778198]">·</span>
              Reported by {reportedByCount} users
            </>
          ) : null}
        </p>
      ) : null}
      {content ? (
        <p className="m-0 mt-2 rounded-xl text-[20px] font-medium leading-[1.25] text-[#596175] bg-white border-[2px] border-gray-300 p-[18px] italic ">
          {content}
        </p>
      ) : null}


      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemovePost?.();
          }}
          className="rounded-[12px] border-2 border-[#d7dce6] bg-white px-5 py-2.5 text-[16px] font-extrabold leading-none text-[#344363] transition hover:border-[#c6ccd9] hover:bg-[#fbfcff]"
        >
          {primaryActionLabel}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss?.();
          }}
          className="rounded-[12px] border-2 border-[#d7dce6] bg-white px-5 py-2.5 text-[16px] font-extrabold leading-none text-[#344363] transition hover:border-[#c6ccd9] hover:bg-[#fbfcff] "
        >
          {secondaryActionLabel}
        </button>
      </div>
    </article>
  );
}

export default ReportPost;
