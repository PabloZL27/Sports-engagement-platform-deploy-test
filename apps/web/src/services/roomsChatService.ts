import { apiFetch } from "./api";

export type ChatMessageRow = {
  id: number;
  room_id: number;
  user_id: string;
  content: string;
  sent_at: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type ChatParticipantRow = {
  user_id: string;
  display_name?: string | null;
  last_message_at: string;
};

export async function bootstrapMatchRoom(
  matchId: number,
  userId: string,
): Promise<{ room_id: number; match_id: number }> {
  return apiFetch(`/api/rooms/match/${matchId}/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function getMatchMessages(
  matchId: number,
  limit = 100
): Promise<{ messages: ChatMessageRow[] }> {
  return apiFetch(`/api/rooms/match/${matchId}/messages?limit=${limit}`);
}

export async function getMatchParticipants(
  matchId: number,
): Promise<{ participants: ChatParticipantRow[] }> {
  return apiFetch(`/api/rooms/match/${matchId}/participants`);
}

export async function postMatchMessage(
  matchId: number,
  userId: string,
  content: string,
  displayName?: string | null,
  avatarUrl?: string | null,
): Promise<{ message: ChatMessageRow }> {
  return apiFetch(`/api/rooms/match/${matchId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      content,
      ...(displayName != null && String(displayName).trim() !== ""
        ? { display_name: String(displayName).trim() }
        : {}),
      ...(avatarUrl != null && String(avatarUrl).trim() !== ""
        ? { avatar_url: String(avatarUrl).trim() }
        : {}),
    }),
  });
}