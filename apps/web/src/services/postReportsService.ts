import { apiFetch } from "./api";
import type { ApiListResponse } from "../types/community";

export type PostReportStatus = "Pending" | "Critical" | "Resolved";

export type PostReportResolvedType = "Dismiss" | "Delete" | null;

export type ModerateReportAction = "DISMISS_REPORT" | "DELETE_POST";

export interface CommunityPostReport {
  post_id: number;
  user_id: string;
  user_name: string;
  title: string;
  content: string;
  report_status: PostReportStatus;
  resolved_type: PostReportResolvedType;
  reviewed_at: string | null;
  reports_count: number;
  report_categories: string[];
  last_reported_at: string;
  reported_ago: string;
}

export interface CreatePostReportPayload {
  post_id: number;
  reported_by_user_id: string;
  reason: string;
}

export interface ModerateReportPayload {
  post_id: number;
  action: ModerateReportAction;
}

export interface PostReportMutationResponse {
  success: boolean;
  message: string;
}

export interface ReportCountResponse {
  success: boolean;
  result: {
    total: number;
  };
}

function jsonOptions(method: "POST" | "PATCH", body: unknown): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export const postReportsService = {
  async listCommunityReports() {
    return apiFetch<ApiListResponse<CommunityPostReport[]>>(
      "/api/reports/list-community-reports",
    );
  },

  async countCriticalReports() {
    return apiFetch<ReportCountResponse>(
      "/api/reports/count-critical-reports",
    );
  },

  async countPendingReports() {
    return apiFetch<ReportCountResponse>(
      "/api/reports/count-pending-reports",
    );
  },

  async countResolvedThisMonth() {
    return apiFetch<ReportCountResponse>(
      "/api/reports/count-resolved-this-month",
    );
  },

  async createPostReport(payload: CreatePostReportPayload) {
    return apiFetch<PostReportMutationResponse>(
      "/api/reports/create-post-report",
      jsonOptions("POST", payload),
    );
  },

  async moderateReport(payload: ModerateReportPayload) {
    return apiFetch<PostReportMutationResponse>(
      "/api/reports/moderate-report",
      jsonOptions("PATCH", payload),
    );
  },

  async dismissReport(post_id: number) {
    return this.moderateReport({
      post_id,
      action: "DISMISS_REPORT",
    });
  },

  async deletePost(post_id: number) {
    return this.moderateReport({
      post_id,
      action: "DELETE_POST",
    });
  },
};
