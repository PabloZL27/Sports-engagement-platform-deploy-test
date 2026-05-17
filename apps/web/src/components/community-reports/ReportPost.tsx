type ReportSeverity = "critical" | "pending" | "resolved";

type ReportPostProps = {
  username?: string;
  severity?: ReportSeverity;
  timeAgo?: string;
  content?: string;
  reportReason?: string;
  reportedByCount?: number;
  onRemovePost?: () => void;
  onDismiss?: () => void;
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
  username = "xxspammer99",
  severity = "critical",
  timeAgo = "1 hr ago",
  content = '"Earn $5000 a day from home effortlessly, click here → [link]..."',
  reportReason = "Spam / Misleading advertising",
  reportedByCount = 7,
  onRemovePost,
  onDismiss,
}: ReportPostProps) {
  return (
    <article className="w-full rounded-[20px] bg-[#f7f8fc] px-6 py-5 shadow-[0_6px_16px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="m-0 text-[18px] font-extrabold leading-none text-[#15233d]">
            @{username}
          </h3>
          <span
            className={`rounded-full px-3.5 py-1.5 text-[14px] font-extrabold leading-none tracking-[0.02em] ${severityClass[severity]}`}
          >
            {severityLabel[severity]}
          </span>
        </div>

        <time className="shrink-0 text-[14px] font-semibold leading-none text-[#a5aec4]">
          {timeAgo}
        </time>
      </div>

      <p className="m-0 mt-4 text-[20px] font-medium leading-[1.25] text-[#344363]">
        {content}
      </p>

      <p className="m-0 mt-3 text-[16px] leading-[1.35] text-[#778198]">
        Report reason:{" "}
        <span className="font-extrabold text-[#596175]">{reportReason}</span>
        <span className="mx-2 text-[#778198]">·</span>
        Reported by {reportedByCount} users
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRemovePost}
          className="rounded-[12px] border-2 border-[#d7dce6] bg-white px-5 py-2.5 text-[16px] font-extrabold leading-none text-[#344363] transition hover:border-[#c6ccd9] hover:bg-[#fbfcff]"
        >
          Remove post
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-[12px] border-2 border-[#d7dce6] bg-white px-5 py-2.5 text-[16px] font-extrabold leading-none text-[#344363] transition hover:border-[#c6ccd9] hover:bg-[#fbfcff]"
        >
          Dismiss
        </button>
      </div>
    </article>
  );
}

export default ReportPost;
