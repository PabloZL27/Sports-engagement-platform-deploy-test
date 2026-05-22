import type { ApiMatch } from "../types/match";

export type NormalizedMatchStatus = "LIVE" | "FINISHED" | "UPCOMING";

export function getMatchStatus(match: Pick<ApiMatch, "status">): NormalizedMatchStatus {
  const status = String(match.status || "").toLowerCase();

  if (
    status === "live" ||
    status.includes("in_progress") ||
    status.includes("in progress")
  ) {
    return "LIVE";
  }

  if (
    status === "finished" ||
    status.includes("final") ||
    status.includes("completed")
  ) {
    return "FINISHED";
  }

  return "UPCOMING";
}

export function isLiveMatch(match: Pick<ApiMatch, "status">): boolean {
  return getMatchStatus(match) === "LIVE";
}

export function formatMatchScoreLine(
  match: Pick<ApiMatch, "home_score" | "away_score">,
): string {
  const h = match.home_score;
  const a = match.away_score;
  if (h == null && a == null) return "— —";
  return `${h ?? "—"} - ${a ?? "—"}`;
}

export function titansFirstTeams(match: ApiMatch) {
  const titansIsHome = match.home_team_abbreviation === "TEN";

  const left = titansIsHome
    ? {
        logo: match.home_team_logo,
        abbr: match.home_team_abbreviation,
        name: match.home_team,
      }
    : {
        logo: match.away_team_logo,
        abbr: match.away_team_abbreviation,
        name: match.away_team,
      };

  const right = titansIsHome
    ? {
        logo: match.away_team_logo,
        abbr: match.away_team_abbreviation,
        name: match.away_team,
      }
    : {
        logo: match.home_team_logo,
        abbr: match.home_team_abbreviation,
        name: match.home_team,
      };

  return { left, right, titansIsHome };
}
