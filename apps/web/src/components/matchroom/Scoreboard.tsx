import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMatch,
  postMatchDemoPlay,
  postMatchDemoReset
} from "../../services/matchesService";
import type { ApiMatch } from "../../types";
import TeamLogo from "./TeamLogo";
import { parseAbbrsFromShortName } from "../../utils/teamLogo";

type Props = { matchId: number };

function formatTag(status: string | undefined): { text: string; className: string } {
  const s = (status || "").toLowerCase();
  if (s === "final" || s === "finished") {
    return { text: "FINAL", className: "scoreboard-tag scoreboard-tag--final" };
  }
  if (s === "in_progress" || s === "live") {
    return { text: "LIVE", className: "scoreboard-tag scoreboard-tag--live" };
  }
  return { text: "UPCOMING", className: "scoreboard-tag scoreboard-tag--upcoming" };
}

function formatScoreLine(match: ApiMatch): string {
  const h = match.home_score;
  const a = match.away_score;
  if (h == null && a == null) return "— —";
  return `${h ?? "—"} - ${a ?? "—"}`;
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

export default function Scoreboard({ matchId }: Props) {
  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(matchId) || matchId < 1) {
      setError("Invalid match");
      setLoading(false);
      return;
    }
    try {
      const m = await getMatch(matchId);
      setMatch(m);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setMatch(null);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (match?.demo_active) {
      pollRef.current = setInterval(() => void load(), 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [match?.demo_active, load]);

  async function onPlay() {
    setBusy(true);
    try {
      const m = await postMatchDemoPlay(matchId);
      setMatch(m);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error demo");
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    try {
      const m = await postMatchDemoReset(matchId);
      setMatch(m);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error demo");
    } finally {
      setBusy(false);
    }
  }

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

  const tag = formatTag(match.status);
  const home = match.home_team ?? "Home";
  const away = match.away_team ?? "Away";
  const { home: homeAbbr, away: awayAbbr } = parseAbbrsFromShortName(match.short_name);

  return (
    <div className="scoreboard">
      <div className="team team--home">
        <TeamLogo abbr={homeAbbr} teamName={home} side="home" />
        <div className="team-text">
          <h2>{home}</h2>
          <span className="team-role">Home</span>
        </div>
      </div>

      <div className="score">
        <div>
          <span className={tag.className}>{tag.text}</span>
        </div>
        <h1>{formatScoreLine(match)}</h1>
        {detailLine(match) ? <p className="score-detail">{detailLine(match)}</p> : null}
        {match.demo_eligible ? (
          <div className="scoreboard-demo-bar">
            <button
              type="button"
              className="scoreboard-demo-btn"
              disabled={busy || !!match.demo_active}
              onClick={() => void onPlay()}
            >
              Play demo
            </button>
            <button
              type="button"
              className="scoreboard-demo-btn scoreboard-demo-btn--secondary"
              disabled={busy || !match.demo_active}
              onClick={() => void onReset()}
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
        <TeamLogo abbr={awayAbbr} teamName={away} side="away" />
      </div>
    </div>
  );
}