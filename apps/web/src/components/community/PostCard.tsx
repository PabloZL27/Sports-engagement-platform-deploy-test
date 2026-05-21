// apps/web/src/components/community/PostCard.tsx
import { useState } from "react";
import { Card } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Auth } from "../../context/AuthContext";
import { postReportsService } from "../../services/postReportsService";
import type { Post } from "../../types/community";
import { getInitials, getPostTime } from "../../utils/postUtils";

const reportReasons = [
  {
    label: "Spam / Misleading advertising",
    description:
      "Use this when the post promotes scams, repeated ads, suspicious links, or misleading offers.",
  },
  {
    label: "Offensive language / Harassment",
    description:
      "Use this when the post attacks, threatens, bullies, or targets another person or group.",
  },
  {
    label: "Violence or harmful content",
    description:
      "Use this when the post encourages harm, violence, dangerous behavior, or self-harm.",
  },
  {
    label: "False information",
    description:
      "Use this when the post shares claims that appear intentionally false or misleading.",
  },
  {
    label: "Hate speech",
    description:
      "Use this when the post attacks protected identities or promotes hateful content.",
  },
  {
    label: "Sexual content",
    description:
      "Use this when the post contains inappropriate sexual content for the community.",
  },
  {
    label: "Other",
    description:
      "Use this when the issue does not fit the other categories but still needs admin review.",
  },
] as const;

type ReportReason = (typeof reportReasons)[number]["label"];

type PostCardProps = {
  post: Post;
  expanded?: boolean;
  onClick?: (postId: number) => void;
  onLike?: (postId: number) => void;
  onOpenDetail?: (post: Post) => void;
  showActions?: boolean;
  showReplies?: boolean;
  isLiked?: boolean;
  onRequireAuth?: () => void;
};

export default function PostCard({
  post,
  expanded = false,
  onClick,
  onLike,
  onOpenDetail,
  showActions = true,
  showReplies = true,
  isLiked = false,
  onRequireAuth,
}: PostCardProps) {
  const { session } = Auth();
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const selectedReportReason = reportReasons.find(
    (reason) => reason.label === selectedReason,
  );

  function openReportModal() {
    if (!session?.user?.id) {
      onRequireAuth?.();
      return;
    }

    setIsReportMenuOpen(false);
    setIsReportModalOpen(true);
    setReportError(null);
    setReportMessage(null);
  }

  function closeReportModal() {
    if (isSubmittingReport) return;

    setIsReportModalOpen(false);
    setSelectedReason(null);
    setReportError(null);
    setReportMessage(null);
  }

  async function handleSubmitReport() {
    if (!session?.user?.id) {
      onRequireAuth?.();
      return;
    }

    if (!selectedReason) {
      setReportError("Choose a report category first.");
      return;
    }

    try {
      setIsSubmittingReport(true);
      setReportError(null);
      setReportMessage(null);

      await postReportsService.createPostReport({
        post_id: post.post_id,
        reported_by_user_id: session.user.id,
        reason: selectedReason,
      });

      setReportMessage("Report submitted. Thank you for helping keep the community safe.");
      window.setTimeout(() => {
        setIsReportModalOpen(false);
        setSelectedReason(null);
        setReportMessage(null);
      }, 1200);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Unable to report this post.");
    } finally {
      setIsSubmittingReport(false);
    }
  }

  return (
    <>
      <Card
        className="border-l-4 border-blue-500 transition-shadow hover:shadow-md cursor-pointer"
        onClick={() => onClick?.(post.post_id)}
      >
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-sky-700">
                {post.category_name}
              </span>
              <span className="text-xs text-gray-500">
                {getPostTime(post.created_at || "")}
              </span>
            </div>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label="Post options"
                aria-expanded={isReportMenuOpen}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100"
                onClick={() => setIsReportMenuOpen((isOpen) => !isOpen)}
              >
                <Icon icon="mdi:dots-horizontal" width={22} />
              </button>

              {isReportMenuOpen && (
                <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-[0_12px_36px_rgba(15,23,42,0.16)]">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#344363] transition hover:bg-gray-100"
                    onClick={openReportModal}
                  >
                    <Icon icon="mdi:flag-outline" width={18} />
                    Report post
                  </button>
                </div>
              )}
            </div>
          </div>

          <h3 className="mb-3 text-lg font-bold text-gray-900">{post.title}</h3>

          <div className="mb-4 flex items-start gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                {getInitials(post.user_name)}
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {post.user_name}
              </span>
            </div>
          </div>

          {expanded && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <p className="mb-4 text-sm text-black">{post.content}</p>
              {showReplies && onOpenDetail && (
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(post);
                  }}
                >
                  Ver respuestas
                </button>
              )}
            </div>
          )}

          {showActions && (
            <div className="flex items-center gap-6 border-t border-gray-100 pt-3 text-sm text-gray-500">
              <button
                type="button"
                className="flex items-center gap-2 rounded-md p-1 hover:cursor-pointer hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail?.(post);
                }}
              >
                <Icon icon="mdi:message-outline" width={18} />
                <span className="font-semibold text-gray-900">
                  {post.replies_count ?? 0}
                </span>
                <span>Replies</span>
              </button>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Icon icon="mdi:eye-outline" width={18} />
                <span className="font-semibold text-gray-900">{post.views_count}</span>
                <span>Views</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLike?.(post.post_id);
                }}
                className={`flex items-center gap-2 rounded-full px-2 py-1 transition-colors ${
                  isLiked ? "bg-gray-100 text-gray-500 cursor-default" : "hover:bg-gray-100"
                }`}
                disabled={isLiked}
              >
                <Icon icon="mdi:thumb-up-outline" width={18} />
                <span className="font-semibold text-gray-900">{post.upvotes_count}</span>
                <span>Upvotes</span>
              </button>
            </div>
          )}
        </div>
      </Card>

      {isReportModalOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0b1220]/55 p-4 backdrop-blur-[6px]"
          onClick={closeReportModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-post-title"
            className="w-full max-w-[520px] rounded-[22px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.30)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="report-post-title"
                  className="m-0 text-[24px] font-extrabold leading-tight text-[#15233d]"
                >
                  Report post
                </h2>
                <p className="m-0 mt-2 text-sm font-medium leading-[1.45] text-[#596175]">
                  Choose the category that best describes the issue.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close report modal"
                disabled={isSubmittingReport}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={closeReportModal}
              >
                <Icon icon="mdi:close" width={22} />
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {reportReasons.map((reason) => (
                <button
                  key={reason.label}
                  type="button"
                  disabled={isSubmittingReport}
                  className={`rounded-[14px] border-2 px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    selectedReason === reason.label
                      ? "border-[#0d1f3c] bg-[#f4f7fb]"
                      : "border-[#d7dce6] bg-white hover:border-[#c6ccd9] hover:bg-[#fbfcff]"
                  }`}
                  onClick={() => {
                    setSelectedReason(reason.label);
                    setReportError(null);
                  }}
                >
                  <span className="block text-[15px] font-extrabold text-[#15233d]">
                    {reason.label}
                  </span>
                </button>
              ))}
            </div>

            {selectedReportReason && (
              <p className="m-0 mt-4 rounded-[14px] bg-[#f7f8fc] px-4 py-3 text-sm font-medium leading-[1.45] text-[#596175]">
                {selectedReportReason.description}
              </p>
            )}

            {reportError && (
              <p className="m-0 mt-4 rounded-[12px] bg-[#fff3f3] px-4 py-3 text-sm font-bold text-[#a72b2b]">
                {reportError}
              </p>
            )}

            {reportMessage && (
              <p className="m-0 mt-4 rounded-[12px] bg-[#ecfdf3] px-4 py-3 text-sm font-bold text-[#25633d]">
                {reportMessage}
              </p>
            )}

            <button
              type="button"
              disabled={isSubmittingReport || !selectedReason}
              className="mt-5 w-full rounded-[14px] bg-[#0d1f3c] px-5 py-3 text-[16px] font-extrabold text-white transition hover:bg-[#172f59] disabled:cursor-not-allowed disabled:bg-[#c7ceda]"
              onClick={handleSubmitReport}
            >
              {isSubmittingReport ? "Submitting report..." : "Submit report"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
