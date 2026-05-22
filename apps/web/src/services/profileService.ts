import { apiFetch } from "./api";
import type { Profile, InsertNewUserRequest, ProfileResponse } from "../types";

export async function getProfile(id = ""): Promise<Profile> {
  const data = await apiFetch<ProfileResponse>(`/profile/${id}`);
  return "profile" in data ? data.profile : data;
}

export async function insertNewUser(data: InsertNewUserRequest){
  return await apiFetch<{ new_user: Profile }>("/profile/new/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export async function getMyProfile(accessToken: string): Promise<{status: string; profile: Profile}> {
  return await apiFetch<{status: string; profile: Profile}>("/profile/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

type BatchProfileRow = {
  user_id: string;
  avatar_url?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export async function getProfilesBatch(
  userIds: string[],
): Promise<BatchProfileRow[]> {
  if (userIds.length === 0) return [];

  const data = await apiFetch<{ status: string; profiles: BatchProfileRow[] }>(
    "/profile/profiles/batch",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profiles_ids: userIds }),
    },
  );

  return data.profiles ?? [];
}