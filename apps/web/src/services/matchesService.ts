import { apiFetch } from "./api";
import type { ApiMatch } from "../types/match";

export async function getMatches(): Promise<ApiMatch[]> {
  return await apiFetch<ApiMatch[]>("/matches/");
}

export async function getMatch(id: number): Promise<ApiMatch> {
  return await apiFetch<ApiMatch>(`/matches/${id}`);
}

export async function postMatchDemoPlay(id: number): Promise<ApiMatch> {
  return await apiFetch<ApiMatch>(`/matches/${id}/demo/play`, { method: "POST" });
}

export async function postMatchDemoReset(id: number): Promise<ApiMatch> {
  return await apiFetch<ApiMatch>(`/matches/${id}/demo/reset`, { method: "POST" });
}