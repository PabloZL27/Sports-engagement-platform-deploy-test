import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Scoreboard from "../components/matchroom/Scoreboard";
import FanChat from "../components/matchroom/FanChat";
import { TwitterFeed } from "../components/matchroom/TwitterFeed";
import {
  getMatch,
  postMatchDemoPlay,
  postMatchDemoReset,
} from "../services/matchesService";
import type { ApiMatch } from "../types/match";
import "../styles/matchroom.css";
import "../styles/matchCard.css";

function MatchRoomPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const matchId = Number(id);

  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMatch = useCallback(async () => {
    if (!Number.isFinite(matchId) || matchId < 1) {
      setError("Invalid match");
      setLoading(false);
      return;
    }

    try {
      const data = await getMatch(matchId);
      setMatch(data);
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
    void loadMatch();
  }, [loadMatch]);

  useEffect(() => {
    const pollMs = match?.demo_active ? 2000 : 10000;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadMatch();
      }
    }, pollMs);

    return () => window.clearInterval(interval);
  }, [loadMatch, match?.demo_active]);

  async function onPlayDemo() {
    setBusy(true);
    try {
      const updated = await postMatchDemoPlay(matchId);
      setMatch(updated as ApiMatch);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error demo");
    } finally {
      setBusy(false);
    }
  }

  async function onResetDemo() {
    setBusy(true);
    try {
      const updated = await postMatchDemoReset(matchId);
      setMatch(updated as ApiMatch);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error demo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="match-room">
      <button
        type="button"
        onClick={() => navigate("/matches")}
        className="close-button"
        aria-label="Close"
      >
        x
      </button>

      <Scoreboard
        match={match}
        loading={loading}
        error={error}
        busy={busy}
        onPlayDemo={() => void onPlayDemo()}
        onResetDemo={() => void onResetDemo()}
      />

      <div className="match-room-content">
        {Number.isFinite(matchId) ? (
          <FanChat matchId={matchId} match={match} />
        ) : (
          <div className="fan-chat fan-chat--placeholder">Invalid match.</div>
        )}
        <TwitterFeed />
      </div>
    </div>
  );
}

export default MatchRoomPage;
