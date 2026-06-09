import { useEffect, useMemo, useState } from "react";
import { Card } from "@heroui/react";
import ConfirmActionModal from "../community-reports/ConfirmActionModal";
import GridCard from "../community-reports/GridCard";
import ReportPost from "../community-reports/ReportPost";
import {
  postReportsService,
  type CommunityPostReport,
} from "../../services/postReportsService";

type ReportFilterKey = "all" | "pending" | "critical" | "resolved";

type ReportStats = {
  pending: number;
  critical: number;
  resolvedThisMonth: number;
};

type ConfirmAction =
  | {
      type: "dismiss" | "delete";
      postId: number;
      title: string;
    }
  | null;

const reportFilterLabel: Record<ReportFilterKey, string> = {
  all: "All",
  pending: "Pending",
  critical: "Critical",
  resolved: "Resolved",
};

function getReportSeverity(report: CommunityPostReport): Exclude<ReportFilterKey, "all"> {
  const status = report.report_status?.toLowerCase();

  if (status === "critical" || report.reports_count >= 5) return "critical";
  if (status === "resolved") return "resolved";

  return "pending";
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition sm:px-7 sm:py-2.5 sm:text-base ${
        active
          ? "border-[#0d1f3c] bg-[#0d1f3c] text-white"
          : "border-[#d0d4e0] bg-white text-[#3a4560]"
      }`}
    >
      {label}
    </button>
  );
}

function PostManagement() {
  const [filter, setFilter] = useState<ReportFilterKey>("all");
  const [reports, setReports] = useState<CommunityPostReport[]>([]);
  const [disabledPostIds, setDisabledPostIds] = useState<number[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats>({
    pending: 0,
    critical: 0,
    resolvedThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModerating, setIsModerating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadReports() {
    try {
      setIsLoading(true);
      setError(null);

      const [reportsPayload, pendingPayload, criticalPayload, resolvedPayload] =
        await Promise.all([
          postReportsService.listCommunityReports(),
          postReportsService.countPendingReports(),
          postReportsService.countCriticalReports(),
          postReportsService.countResolvedThisMonth(),
        ]);

      setReports(reportsPayload.result);
      setReportStats({
        pending: pendingPayload.result.total,
        critical: criticalPayload.result.total,
        resolvedThisMonth: resolvedPayload.result.total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reports");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    if (filter === "all") return reports;

    return reports.filter((report) => getReportSeverity(report) === filter);
  }, [filter, reports]);

  function requestDismiss(postId: number, title: string) {
    setConfirmAction({
      type: "dismiss",
      postId,
      title,
    });
  }

  function requestDeletePost(postId: number, title: string) {
    setConfirmAction({
      type: "delete",
      postId,
      title,
    });
  }

  async function handleDismiss(postId: number) {
    setDisabledPostIds((currentIds) => [...new Set([...currentIds, postId])]);

    try {
      await postReportsService.dismissReport(postId);
      await loadReports();
    } catch (err) {
      setDisabledPostIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== postId),
      );
      setError(err instanceof Error ? err.message : "Unable to dismiss report");
    }
  }

  async function handleDeletePost(postId: number) {
    setDisabledPostIds((currentIds) => [...new Set([...currentIds, postId])]);

    try {
      await postReportsService.deletePost(postId);
      await loadReports();
    } catch (err) {
      setDisabledPostIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== postId),
      );
      setError(err instanceof Error ? err.message : "Unable to remove post");
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;

    setIsModerating(true);

    try {
      if (confirmAction.type === "dismiss") {
        await handleDismiss(confirmAction.postId);
      } else {
        await handleDeletePost(confirmAction.postId);
      }

      setConfirmAction(null);
    } finally {
      setIsModerating(false);
    }
  }

  const confirmModalCopy =
    confirmAction?.type === "delete"
      ? {
          title: "Are you sure?",
          message: `This will remove "${confirmAction.title}" from the community feed. This action will mark the report as resolved.`,
          confirmLabel: "Delete post",
          confirmVariant: "danger" as const,
        }
      : {
          title: "Are you sure?",
          message: `This will dismiss the report for "${confirmAction?.title ?? "this post"}" and mark it as resolved.`,
          confirmLabel: "Dismiss report",
          confirmVariant: "neutral" as const,
        };

  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6">
        <h2 className="m-0 text-lg font-extrabold uppercase tracking-[1px] text-[#0d1f3c] sm:text-[22px]">
          Community Reports
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-[#9aa3b2]">
          General overview of activity and community management
        </p>
      </div>

      <Card className="rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] sm:rounded-[24px]">
        <div className="flex flex-col gap-4 p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <GridCard label="Pending" value={reportStats.pending} />
            <GridCard label="Critical" value={reportStats.critical} />
            <GridCard
              label="Resolved"
              value={reportStats.resolvedThisMonth}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "critical", "resolved"] as ReportFilterKey[]).map(
              (f) => (
                <FilterChip
                  key={f}
                  label={reportFilterLabel[f]}
                  active={filter === f}
                  onClick={() => setFilter(f)}
                />
              ),
            )}
          </div>
          {isLoading ? (
            <p className="m-0 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm font-semibold text-[#596175] sm:rounded-4xl sm:px-6 sm:py-5 sm:text-base">
              Loading community reports...
            </p>
          ) : error ? (
            <p className="m-0 rounded-2xl bg-[#fff3f3] px-4 py-4 text-sm font-semibold text-[#9f2f2f] sm:rounded-4xl sm:px-6 sm:py-5 sm:text-base">
              {error}
            </p>
          ) : filteredReports.length === 0 ? (
            <p className="m-0 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm font-semibold text-[#596175] sm:rounded-4xl sm:px-6 sm:py-5 sm:text-base">
              No reports found.
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {filteredReports.map((report) => {
                const severity = getReportSeverity(report);

                return (
                  <ReportPost
                    key={report.post_id}
                    username={report.user_name}
                    severity={severity}
                    timeAgo={report.reported_ago}
                    title={report.title}
                    content={report.content}
                    reportReason={report.report_categories.join(", ")}
                    reportedByCount={report.reports_count}
                    isDisabled={
                      severity === "resolved" ||
                      disabledPostIds.includes(report.post_id)
                    }
                    onDismiss={() => requestDismiss(report.post_id, report.title)}
                    onRemovePost={() =>
                      requestDeletePost(report.post_id, report.title)
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <ConfirmActionModal
        isOpen={confirmAction !== null}
        title={confirmModalCopy.title}
        message={confirmModalCopy.message}
        confirmLabel={confirmModalCopy.confirmLabel}
        confirmVariant={confirmModalCopy.confirmVariant}
        isLoading={isModerating}
        onCancel={() => {
          if (!isModerating) setConfirmAction(null);
        }}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  );
}

export default PostManagement;
