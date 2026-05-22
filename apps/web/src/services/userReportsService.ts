import { apiFetch } from "./api";
import { supabase } from "../supabaseClient";

export type UserReport = {
  report_id: number;
  user_id: string | null;
  reason: string;
  content: string;
  status: string | null;
  reported_by: string | null;
  createdat: string;
  reviewed_at?: string | null;
  resolved_type?: string | null;
  user_name?: string | null;
};

type ListReportsResponse = {
  success: boolean;
  result: UserReport[];
};

type CountResponse = {
  success?: boolean;
  status?: string;
  total: number;
};

type UpdateReportResponse = {
  success: boolean;
  result: UserReport;
};

type BanUserResponse = {
  status?: string;
  profile?: unknown;
};

export type CreateUserReportPayload = {
  user_id: string;
  reported_by_user_id: string;
  reason: string;
  content: string;
};

type CreateReportResponse = {
  success: boolean;
  result: UserReport;
};

export async function createUserReport(
  payload: CreateUserReportPayload,
): Promise<UserReport> {
  const data = await apiFetch<CreateReportResponse>(
    "/reports/user/create-report",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  return data.result;
}

export async function listUserReports(): Promise<UserReport[]> {
  const data = await apiFetch<ListReportsResponse>(
    "/reports/user/list-reports",
  );
  return data.result ?? [];
}

export async function countCriticalUserReports(): Promise<number> {
  const data = await apiFetch<CountResponse>("/reports/user/count-critical");
  return data.total ?? 0;
}

export async function countPendingUserReports(): Promise<number> {
  const data = await apiFetch<CountResponse>("/reports/user/count-pending");
  return data.total ?? 0;
}

export async function countBannedUsers(): Promise<number> {
  const data = await apiFetch<CountResponse>("/reports/user/count-banned");
  return data.total ?? 0;
}

type UpdateUserReportPayload = {
  reportId: number;
  status: string;
  resolvedType: string;
};

export async function updateUserReport(
  payload: UpdateUserReportPayload,
): Promise<UserReport> {
  const data = await apiFetch<UpdateReportResponse>(
    "/reports/user/edit-report",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_id: payload.reportId,
        status: payload.status,
        resolved_type: payload.resolvedType,
      }),
    },
  );

  return data.result;
}

export async function banReportedUser(userId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("You must be signed in to ban a user");
  }

  await apiFetch<BanUserResponse>("/reports/user/ban-user", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ user_id: userId }),
  });
}
