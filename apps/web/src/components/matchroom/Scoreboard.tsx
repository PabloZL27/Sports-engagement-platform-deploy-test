import { useEffect, useRef, useState } from "react";
import type { ApiMatch } from "../../types/match";
import TeamLogo from "./TeamLogo";
import { parseAbbrsFromShortName } from "../../utils/teamLogo";
import {
  formatMatchScoreLine,
  getMatchStatus,
  isLiveMatch,
} from "../../utils/matchHelpers";

type Props = {
  match: ApiMatch | null;
  loading: boolean;
  error: string | null;
  busy: boolean;
  onPlayDemo: () => void;
  onResetDemo: () => void;
};

function formatTag(status: ReturnType<typeof getMatchStatus>): {
  text: string;
  className: string;
} {
  if (status === "FINISHED") {
    return { text: "FINAL", className: "scoreboard-tag scoreboard-tag--final" };
  }
  if (status === "LIVE") {
    return { text: "LIVE", className: "scoreboard-tag scoreboard-tag--live" };
  }
  return { text: "UPCOMING", className: "scoreboard-tag scoreboard-tag--upcoming" };
}

function detailLine(match: ApiMatch): string {
  if (match.demo_active && match.demo_clock_label) {
    return match.demo_clock_label;
  }
  if (match.start_time) {
    try {
      return new Date(match.start_time).toLocaleString();
    } catch {
      return match.start_time;
    }
  }
  return "";
}

export default function Scoreboard({
  match,
  loading,
  error,
  busy,
  onPlayDemo,
  onResetDemo,
}: Props) {
  const [scoreSplash, setScoreSplash] = useState(false);
  const previousScoreRef = useRef<string>("");

  useEffect(() => {
    if (!match || !isLiveMatch(match)) return;

    const scoreLine = formatMatchScoreLine(match);
    if (previousScoreRef.current && previousScoreRef.current !== scoreLine) {
      setScoreSplash(false);
      requestAnimationFrame(() => setScoreSplash(true));
      const timer = window.setTimeout(() => setScoreSplash(false), 800);
      previousScoreRef.current = scoreLine;
      return () => window.clearTimeout(timer);
    }

    previousScoreRef.current = scoreLine;
  }, [match?.home_score, match?.away_score, match?.status, match]);

  if (loading) {
    return (
      <div className="scoreboard scoreboard--loading">
        <p className="scoreboard-empty-text">Loading scoreboard…</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="scoreboard scoreboard--empty">
        <p className="scoreboard-empty-text">{error || "No data"}</p>
      </div>
    );
  }

  const status = getMatchStatus(match);
  const tag = formatTag(status);
  const live = status === "LIVE";
  const home = match.home_team ?? "Home";
  const away = match.away_team ?? "Away";
  const { home: homeAbbr, away: awayAbbr } = parseAbbrsFromShortName(match.short_name);

  return (
    <div className={`scoreboard ${live ? "scoreboard--live" : ""}`}>
      <div className="team team--home">
        <TeamLogo
          abbr={homeAbbr ?? match.home_team_abbreviation ?? null}
          teamName={home}
          side="home"
          logoUrl={match.home_team_logo}
          size="lg"
        />
        <div className="team-text">
          <h2>{home}</h2>
          <span className="team-role">Home</span>
        </div>
      </div>

      <div className="score">
        <div>
          <span className={tag.className}>{tag.text}</span>
        </div>
        <h1
          className={
            live
              ? `scoreboard-score scoreboard-score--live${scoreSplash ? " score-splash" : ""}`
              : "scoreboard-score"
          }
        >
          {formatMatchScoreLine(match)}
        </h1>
        {detailLine(match) ? <p className="score-detail">{detailLine(match)}</p> : null}
        {match.demo_eligible ? (
          <div className="scoreboard-demo-bar">
            <button
              type="button"
              className="scoreboard-demo-btn"
              disabled={busy || !!match.demo_active}
              onClick={onPlayDemo}
            >
              Play demo
            </button>
            <button
              type="button"
              className="scoreboard-demo-btn scoreboard-demo-btn--secondary"
              disabled={busy || !match.demo_active}
              onClick={onResetDemo}
            >
              Reset
            </button>
          </div>
        ) : null}
      </div>

      <div className="team team--away">
        <div className="team-text">
          <h2>{away}</h2>
          <span className="team-role">Away</span>
        </div>
        <TeamLogo
          abbr={awayAbbr ?? match.away_team_abbreviation ?? null}
          teamName={away}
          side="away"
          logoUrl={match.away_team_logo}
          size="lg"
        />
      </div>
    </div>
  );
}
