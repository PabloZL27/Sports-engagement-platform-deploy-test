export type MatchStatus = "LIVE" | "FINISHED" | "UPCOMING";

export interface ApiMatch {
  match_id: number;
  name: string;
  short_name: string;
  start_time: string;
  status: string;
  week: string;
  week_num: number;

  venue_name: string;
  venue_city: string;
  venue_state?: string;

  home_team: string;
  away_team: string;
  home_team_logo?: string;
  away_team_logo?: string;
  home_team_abbreviation?: string;
  away_team_abbreviation?: string;

  home_score?: number | null;
  away_score?: number | null;
}

export interface Match {
  id: number;
  status: MatchStatus;
  opponent: string;
  date: string;
  venue: string;
  resultLabel: string;
  resultValue: string;

  homeTeam?: string;
  awayTeam?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  homeTeamAbbreviation?: string;
  awayTeamAbbreviation?: string;
  homeScore?: number | null;
  awayScore?: number | null;
}