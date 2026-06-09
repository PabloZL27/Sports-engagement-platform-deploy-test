import { useEffect, useMemo, useState } from "react";
import { Card } from "@heroui/react";
import GridCard from "../community-reports/GridCard";
import ReportPost from "../community-reports/ReportPost";
import { ModalComp } from "../general/modal";
import {
  banReportedUser,
  countBannedUsers,
  countCriticalUserReports,
  countPendingUserReports,
  listUserReports,
  updateUserReport,
  type UserReport,
} from "../../services/userReportsService";
import { 
  normalizeStatus,
  statusToSeverity,
  isStatusHigher,
  statusRank,
  formatReasons,
  formatDateTime,
  formatTimeAgo,
  isAfter,
  compareDatesDesc
 } from "../../utils/userReports";
import { getInitials } from "../../utils/postUtils";
import { getProfilesBatch } from "../../services/profileService";

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
  const [reporterNameMap, setReporterNameMap] = useState<Record<string,string>>({});

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

  // when a group is selected, fetch reporter usernames for the reports if needed
  useEffect(() => {
    let isMounted = true;
    async function fetchReporterNames() {
      if (!selectedGroup) return;

      const ids = Array.from(new Set(selectedGroup.reports.map((r) => r.reported_by).filter(Boolean) as string[]));
      const missing = ids.filter((id) => !reporterNameMap[id]);
      if (missing.length === 0) return;

      try {
        const profiles = await getProfilesBatch(missing);
        if (!isMounted) return;
        const map: Record<string,string> = {};
        for (const p of profiles) {
          if (p.user_id) {
            map[p.user_id] = p.username || `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.user_id;
          }
        }
        setReporterNameMap((prev) => ({ ...prev, ...map }));
      } catch (e) {
        // ignore profile resolution errors; UI will fallback to id
        console.error("Error fetching reporter profiles:", e);
      }
    }

    void fetchReporterNames();

    return () => {
      isMounted = false;
    };
  }, [selectedGroup]);

  async function handleResolveGroup(group: ReportGroup, resolvedType: string) {
    try {
      if (resolvedType === "Banned" && group.userId) {
        await banReportedUser(group.userId);
      }

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

      const [critical, pending, banned] = await Promise.all([
        countCriticalUserReports(),
        countPendingUserReports(),
        resolvedType === "Banned"
          ? countBannedUsers()
          : Promise.resolve(stats.banned),
      ]);

      setStats((prev) => ({
        ...prev,
        critical,
        pending,
        banned,
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
    { label: "Pending", value: stats.pending },
    { label: "Critical", value: stats.critical },
    { label: "Banned", value: stats.banned },
  ];

  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6">
        <h2 className="m-0 text-lg font-extrabold uppercase tracking-[1px] text-[#0d1f3c] sm:text-[22px]">
          User Reports
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-[#9aa3b2]">
          Review and moderation of users reported by the community
        </p>
      </div>

      <Card className="rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] sm:rounded-[24px]">
        <div className="flex flex-col gap-4 p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {userReportStats.map((stat) => (
              <GridCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
              />
            ))}
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
          {error ? (
            <p className="rounded-2xl bg-[#fff3f3] px-4 py-3 text-sm font-semibold text-[#b42318] sm:text-[14px]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:gap-4">
            {isLoading ? (
              <p className="m-0 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm font-semibold text-[#8a94ab] sm:px-6 sm:py-5 sm:text-[15px]">
                Loading reports...
              </p>
            ) : filteredReports.length === 0 ? (
              <p className="m-0 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm font-semibold text-[#8a94ab] sm:px-6 sm:py-5 sm:text-[15px]">
                No user reports to display.
              </p>
            ) : (
              filteredReports.map((group) => (
                <ReportPost
                  key={group.key}
                  username={
                    group.userName ||
                    (group.userId ? `user` : "anonymous")
                  }
                  severity={statusToSeverity(group.status)}
                  timeAgo={formatTimeAgo(group.latestCreatedAt)}
                  content={group.contentPreview || "No report content available."}
                  reportReason={formatReasons(group.reasons)}
                  reportedByCount={group.reporterIds.length}
                    showActions={false}
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
                disabled={selectedGroup.status === "resolved"}
                onClick={() => handleResolveGroup(selectedGroup, "Banned")}
                className="cursor-pointer rounded-3xl border-2 border-[#d7dce6] bg-white px-5 py-2.5 text-[15px] font-extrabold leading-none text-[#344363] transition hover:border-[#c61d1d] hover:bg-[#c61d1d] hover:text-white disabled:cursor-not-allowed disabled:border-[#e6e9ee] disabled:bg-[#f5f6f8] disabled:text-[#9aa3af] disabled:shadow-none"
              >
                Ban user
              </button> 
              <button
                type="button"
                disabled={selectedGroup.status === "resolved"}
                onClick={() => handleResolveGroup(selectedGroup, "Dismissed")}
                className="cursor-pointer rounded-3xl border-2 border-[#d7dce6] bg-white px-5 py-2.5 text-[15px] font-extrabold leading-none text-[#344363] transition hover:border-[#c6ccd9] hover:bg-[#fbfcff] disabled:cursor-not-allowed disabled:border-[#e6e9ee] disabled:bg-[#f5f6f8] disabled:text-[#9aa3af] disabled:shadow-none"
              >
                Dismiss
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-4xl bg-[#f7f8fc] p-4">
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
              <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
                {selectedGroup.reports.map((report) => {
                  const reporterId = report.reported_by || "";
                  const reporterName = report.reporter_name || reporterNameMap[reporterId] || (report as any).reported_by_name || (report as any).reported_by_user_name || (report as any).reporter_user_name || reporterId || "Unknown";

                  return (
                    <div
                      key={report.report_id}
                      className="rounded-[14px] border border-[#e1e6f0] bg-white p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#eef2f8] text-[12px] font-bold text-[#0B2A55] flex items-center justify-center">
                          {getInitials(reporterName)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="m-0 text-[14px] font-semibold text-[#0B2A55]">
                              {reporterName}
                            </p>
                            <span className="text-[13px] font-semibold text-[#8a94ab]">{formatDateTime(report.createdat)}</span>
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
                            {report.resolved_type ? ` (${report.resolved_type})` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ModalComp>
      ) : null}
    </div>
  );
}

export default UserManagement;

