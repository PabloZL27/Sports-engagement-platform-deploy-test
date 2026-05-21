import { apiFetch } from "./api";
import type {
  ClassicMatch,
  HistoryPageData,
  HistoryStat,
  LegendaryPlayer,
  TimelineEvent,
} from "../types/history";

const DEFAULT_HISTORY_TEAM_SLUG = "tennessee-titans";

export async function getHistoryPageData(
  teamSlug = DEFAULT_HISTORY_TEAM_SLUG,
): Promise<HistoryPageData> {
  return await apiFetch<HistoryPageData>(`/history/history-page/${teamSlug}`);
}

export async function getHistoryStats(
  teamSlug = DEFAULT_HISTORY_TEAM_SLUG,
): Promise<HistoryStat[]> {
  return await apiFetch<HistoryStat[]>(`/history/stats?teamSlug=${teamSlug}`);
}

export async function getTimelineEvents(
  teamSlug = DEFAULT_HISTORY_TEAM_SLUG,
): Promise<TimelineEvent[]> {
  return await apiFetch<TimelineEvent[]>(`/history/timeline?teamSlug=${teamSlug}`);
}

export async function getLegendaryPlayers(
  teamSlug = DEFAULT_HISTORY_TEAM_SLUG,
): Promise<LegendaryPlayer[]> {
  return await apiFetch<LegendaryPlayer[]>(`/history/players?teamSlug=${teamSlug}`);
}

export async function getClassicMatches(
  teamSlug = DEFAULT_HISTORY_TEAM_SLUG,
): Promise<ClassicMatch[]> {
  return await apiFetch<ClassicMatch[]>(`/history/matches?teamSlug=${teamSlug}`);
}
