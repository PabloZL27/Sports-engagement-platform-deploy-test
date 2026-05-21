import { useEffect, useMemo, useState } from "react";
import { Card } from "@heroui/react";
import GridCard from "../community-reports/GridCard";
import ReportPost from "../community-reports/ReportPost";
import { ModalComp } from "../general/modal";
import {
  countBannedUsers,
  countCriticalUserReports,
  countPendingUserReports,
  listUserReports,
  updateUserReport,
  type UserReport,
} from "../../services/userReportsService";

type ReportFilterKey = "all" | "pending" | "critical" | "resolved";

type ReportGroup = {
  key: string;
  userId: string | null;
  userName: string | null;
  reports: UserReport[];
  status: ReportFilterKey;
  latestCreatedAt: string;
  reasons: string[];
  reporterIds: string[];
  contentPreview: string | null;
};

const reportFilterLabel: Record<ReportFilterKey, string> = {
  all: "All",
  pending: "Pending",
  critical: "Critical",
  resolved: "Resolved",
};

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
      className={`cursor-pointer rounded-full border px-7 py-2.5 text-base font-semibold transition ${
        active
          ? "border-[#0d1f3c] bg-[#0d1f3c] text-white"
          : "border-[#d0d4e0] bg-white text-[#3a4560]"
      }`}
    >
      {label}
    </button>
  );
}

function UserManagement() {
  const [filter, setFilter] = useState<ReportFilterKey>("all");
  const [reports, setReports] = useState<UserReport[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ReportGroup | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    critical: 0,
    banned: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      setIsLoading(true);
      setError(null);

      try {
        const [list, critical, pending, banned] = await Promise.all([
          listUserReports(),
          countCriticalUserReports(),
          countPendingUserReports(),
          countBannedUsers(),
        ]);

        if (!isMounted) return;

        setReports(list);
        setStats({
          critical,
          pending,
          banned,
        });
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load user reports",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const groupedReports = useMemo(() => {
    const groups = new Map<string, ReportGroup>();

    for (const report of reports) {
      const key = report.user_id ?? "anonymous";
      const normalizedStatus = normalizeStatus(report.status);
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          key,
          userId: report.user_id ?? null,
          userName: report.user_name ?? null,
          reports: [report],
          status: normalizedStatus,
          latestCreatedAt: report.createdat,
          reasons: report.reason ? [report.reason] : [],
          reporterIds: report.reported_by ? [report.reported_by] : [],
          contentPreview: report.content ?? null,
        });
        continue;
      }

      existing.reports.push(report);

      if (isStatusHigher(normalizedStatus, existing.status)) {
        existing.status = normalizedStatus;
      }

      if (report.user_name && !existing.userName) {
        existing.userName = report.user_name;
      }

      if (report.reason && !existing.reasons.includes(report.reason)) {
        existing.reasons.push(report.reason);
      }

      if (report.reported_by && !existing.reporterIds.includes(report.reported_by)) {
        existing.reporterIds.push(report.reported_by);
      }

      if (isAfter(report.createdat, existing.latestCreatedAt)) {
        existing.latestCreatedAt = report.createdat;
        existing.contentPreview = report.content ?? existing.contentPreview;
      }
    }

    return [...groups.values()].sort((a, b) =>
      compareDatesDesc(a.latestCreatedAt, b.latestCreatedAt),
    );
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (filter === "all") {
      return groupedReports;
    }

    return groupedReports.filter((group) => group.status === filter);
  }, [filter, groupedReports]);

  async function handleResolveGroup(group: ReportGroup, resolvedType: string) {
    try {
      const updates = await Promise.all(
        group.reports.map((report) =>
          updateUserReport({
            reportId: report.report_id,
            status: "Resolved",
            resolvedType,
          }),
        ),
      );

      setReports((prev) =>
        prev.map((report) => {
          const updated = updates.find(
            (item) => item.report_id === report.report_id,
          );
          return updated ? { ...report, ...updated } : report;
        }),
      );

      if (selectedGroup?.key === group.key) {
        setSelectedGroup(null);
      }

      const [critical, pending] = await Promise.all([
        countCriticalUserReports(),
        countPendingUserReports(),
      ]);

      setStats((prev) => ({
        ...prev,
        critical,
        pending,
      }));
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update report",
      );
    }
  }

  const userReportStats = [
    {
      label: "Pending",
      value: stats.pending,
      description: "Pending",
    },
    {
      label: "Critical",
      value: stats.critical,
      description: "Critical",
    },
    {
      label: "Banned this month",
      value: stats.banned,
      description: "Banned this month",
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-7">
        <h2 className="m-0 text-[2.15rem] font-extrabold leading-[1.05] text-[#0b2e63]">
          REPORTED USERS
        </h2>
        <p className="mt-[10px] text-[0.95rem] text-[#9aa3af]">
          Review and moderation of users reported by the community
        </p>
      </div>

      <Card className="rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <div className="px-4 py-4">
          <div className="mb-5 grid grid-cols-3 gap-3 max-[1200px]:grid-cols-2 max-[640px]:grid-cols-1">
            {userReportStats.map((stat) => (
              <GridCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                description={stat.description}
              />
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
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
          {error ? (
            <p className="mb-4 text-[14px] font-semibold text-[#b42318]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <p className="text-[15px] font-semibold text-[#8a94ab]">
                Loading reports...
              </p>
            ) : filteredReports.length === 0 ? (
              <p className="text-[15px] font-semibold text-[#8a94ab]">
                No user reports to display.
              </p>
            ) : (
              filteredReports.map((group) => (
                <ReportPost
                  key={group.key}
                  username={
                    group.userName ||
                    (group.userId ? `user_${group.userId}` : "anonymous")
                  }
                  severity={statusToSeverity(group.status)}
                  timeAgo={formatTimeAgo(group.latestCreatedAt)}
                  meta={
                    group.userId
                      ? `User id: ${group.userId}`
                      : "User id: unknown"
                  }
                  content={group.contentPreview || "No report content available."}
                  reportReason={formatReasons(group.reasons)}
                  reportedByCount={group.reporterIds.length}
                  primaryActionLabel="Ban user"
                  secondaryActionLabel="Dismiss"
                  onRemovePost={() => handleResolveGroup(group, "Banned")}
                  onDismiss={() => handleResolveGroup(group, "Dismissed")}
                  onOpenDetails={() => setSelectedGroup(group)}
                />
              ))
            )}
          </div>
        </div>
      </Card>

      {selectedGroup ? (
        <ModalComp
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setSelectedGroup(null);
            }
          }}
          title={
            <div className="flex flex-col">
              <span className="text-[18px] font-extrabold text-[#15233d]">
                User report details
              </span>
              <span className="text-[13px] font-semibold text-[#8a94ab]">
                {selectedGroup.userName
                  ? `@${selectedGroup.userName}`
                  : "Anonymous user"}
              </span>
            </div>
          }
          footer={
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleResolveGroup(selectedGroup, "Banned")}
                className="rounded-[12px] border-2 border-[#d7dce6] bg-white px-5 py-2.5 text-[15px] font-extrabold leading-none text-[#344363] transition hover:border-[#c6ccd9] hover:bg-[#fbfcff]"
              >
                Ban user
              </button>
              <button
                type="button"
                onClick={() => handleResolveGroup(selectedGroup, "Dismissed")}
                className="rounded-[12px] border-2 border-[#d7dce6] bg-white px-5 py-2.5 text-[15px] font-extrabold leading-none text-[#344363] transition hover:border-[#c6ccd9] hover:bg-[#fbfcff]"
              >
                Dismiss
              </button>
            </div>
          }
          dialogClassName="max-w-[720px]"
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-[16px] bg-[#f7f8fc] p-4">
              <p className="m-0 text-[14px] font-semibold text-[#8a94ab]">
                User id
              </p>
              <p className="m-0 mt-1 break-all text-[15px] font-extrabold text-[#15233d]">
                {selectedGroup.userId || "Unknown"}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-[14px] font-semibold text-[#596175]">
                <span>Total reports: {selectedGroup.reports.length}</span>
                <span>Unique reporters: {selectedGroup.reporterIds.length}</span>
              </div>
            </div>

            <div>
              <p className="m-0 text-[14px] font-semibold text-[#8a94ab]">
                Report reasons
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedGroup.reasons.length > 0
                  ? selectedGroup.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full bg-[#e9edf6] px-3 py-1 text-[13px] font-bold text-[#3a4560]"
                      >
                        {reason}
                      </span>
                    ))
                  : "No reasons available"}
              </div>
            </div>

            <div>
              <p className="m-0 text-[14px] font-semibold text-[#8a94ab]">
                Reports detail
              </p>
              <div className="mt-3 max-h-[320px] space-y-3 overflow-y-auto">
                {selectedGroup.reports.map((report) => (
                  <div
                    key={report.report_id}
                    className="rounded-[14px] border border-[#e1e6f0] bg-white p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-[#8a94ab]">
                      <span>
                        Reporter: {report.reported_by || "Unknown"}
                      </span>
                      <span>{formatDateTime(report.createdat)}</span>
                    </div>
                    <p className="m-0 mt-2 text-[15px] font-semibold text-[#15233d]">
                      Reason: {report.reason}
                    </p>
                    {report.content ? (
                      <p className="m-0 mt-1 text-[14px] text-[#596175]">
                        {report.content}
                      </p>
                    ) : null}
                    <div className="mt-2 text-[13px] font-semibold text-[#596175]">
                      Status: {report.status || "Pending"}
                      {report.resolved_type
                        ? ` (${report.resolved_type})`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalComp>
      ) : null}
    </div>
  );
}

export default UserManagement;

function normalizeStatus(status?: string | null): ReportFilterKey {
  const normalized = (status || "").toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "resolved") return "resolved";
  if (normalized === "pending") return "pending";
  return "pending";
}

function statusToSeverity(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (normalized === "critical") return "critical" as const;
  if (normalized === "resolved") return "resolved" as const;
  return "pending" as const;
}

function isStatusHigher(next: ReportFilterKey, current: ReportFilterKey) {
  return statusRank(next) > statusRank(current);
}

function statusRank(status: ReportFilterKey) {
  if (status === "critical") return 3;
  if (status === "pending") return 2;
  return 1;
}

function formatReasons(reasons: string[]) {
  if (reasons.length === 0) return "No report reason";
  if (reasons.length <= 2) return reasons.join(", ");
  return `${reasons.slice(0, 2).join(", ")} +${reasons.length - 2} more`;
}

function formatTimeAgo(isoDate?: string | null) {
  if (!isoDate) return "";
  const now = Date.now();
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return "";
  const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSeconds < 60) return "just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
}

function formatDateTime(isoDate?: string | null) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function isAfter(next?: string | null, current?: string | null) {
  if (!next) return false;
  if (!current) return true;
  return new Date(next).getTime() > new Date(current).getTime();
}

function compareDatesDesc(a?: string | null, b?: string | null) {
  const aTime = a ? new Date(a).getTime() : 0;
  const bTime = b ? new Date(b).getTime() : 0;
  return bTime - aTime;
}

