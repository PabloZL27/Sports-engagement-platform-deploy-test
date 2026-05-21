import { apiFetch } from "./api";
import type {
  RosterCard,
  AthleteDetail,
  CollectionStats,
  PackOpenResult,
  PackOpeningState,
} from "../types";

export async function getRoster(userId?: string): Promise<RosterCard[]> {
  const query = userId != null ? `?user_id=${userId}` : "";
  const rows = await apiFetch<Record<string, unknown>[]>(`/api/cards/roster${query}`);
  // headshot_url sin sobrescribir: el hook prueba DB + fallbacks ESPN; evita perder la href original de la API.
  return rows.map((row) => ({ ...(row as unknown as RosterCard) }));
}

export async function getAthleteDetail(athleteId: number): Promise<AthleteDetail> {
  const row = await apiFetch<Record<string, unknown>>(`/api/cards/roster/${athleteId}`);
  return { ...(row as unknown as AthleteDetail) };
}

export async function getCollectionStats(userId: string): Promise<CollectionStats> {
  return await apiFetch<CollectionStats>(`/api/cards/collection/${userId}`);
}

export async function getPackStatus(userId: string): Promise<PackOpeningState> {
  return await apiFetch<PackOpeningState>(`/api/cards/pack/status?user_id=${userId}`);
}

export async function startPackOpening(userId: string): Promise<PackOpeningState> {
  return await apiFetch<PackOpeningState>("/api/cards/pack/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function claimPack(userId: string): Promise<PackOpenResult> {
  return await apiFetch<PackOpenResult>("/api/cards/pack/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
}
