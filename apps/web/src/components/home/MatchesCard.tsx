import { useEffect, useState } from "react";
import { Button, Card } from "@heroui/react";
import { FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { getMatches } from "../../services/matchesService";
import type { ApiMatch } from "../../types/match";
import {
  formatMatchScoreLine,
  isLiveMatch,
  titansFirstTeams,
} from "../../utils/matchHelpers";
import MatchesStyleTeamLogo from "../common/MatchesStyleTeamLogo";
import "../../styles/home.css";

function selectLiveMatch(matches: ApiMatch[]): ApiMatch | null {
  return matches.find((match) => isLiveMatch(match)) ?? null;
}

function formatMatchDate(value?: string): string {
  if (!value) {
    return "Live now";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Live now";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(parsedDate);
}

function MatchesCard() {
  const navigate = useNavigate();
  const [liveMatch, setLiveMatch] = useState<ApiMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMatches() {
      try {
        const matches = await getMatches();

        if (!isMounted) {
          return;
        }

        setLiveMatch(selectLiveMatch(matches));
      } catch (error) {
        console.error("Error loading matches card data:", error);
        if (isMounted) {
          setLiveMatch(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadMatches();

    const interval = window.setInterval(() => {
      void loadMatches();
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  function openMatchRoom() {
    if (liveMatch?.match_id) {
      navigate(`/matches/${liveMatch.match_id}`);
      return;
    }

    navigate("/matches");
  }

  if (loading) {
    return (
      <section className="matches-card-wrapper">
        <Card className="matches-card">
          <Card.Content className="matches-card-content">
            <p className="matches-card-date">Loading live match...</p>
          </Card.Content>
        </Card>
      </section>
    );
  }

  if (!liveMatch) {
    return (
      <section className="matches-card-wrapper">
        <Card className="matches-card">
          <Card.Content className="matches-card-content">
            <div className="matches-card-header">
              <h2 className="matches-card-title">Live Match</h2>
              <p className="matches-card-date">No live match right now</p>
            </div>
            <Button className="matches-card-cta" onPress={() => navigate("/matches")}>
              View Match Calendar
              <FiArrowRight className="matches-card-cta-icon" />
            </Button>
          </Card.Content>
        </Card>
      </section>
    );
  }

  const { left, right, titansIsHome } = titansFirstTeams(liveMatch);
  const scoreLine = formatMatchScoreLine(liveMatch);

  return (
    <section className="matches-card-wrapper">
      <Card className="matches-card">
        <div className="matches-card-bubble" aria-hidden />

        <div className="matches-card-days">
          <span className="matches-card-days-number">0</span>
          <span className="matches-card-days-label">Days Left</span>
        </div>

        <Card.Content className="matches-card-content">
          <div className="matches-card-header">
            <h2 className="matches-card-title">Live Match</h2>
            <p className="matches-card-date">
              {scoreLine !== "— —" ? `${scoreLine} · ` : ""}
              {formatMatchDate(liveMatch.start_time)}
            </p>
          </div>

          <div className="matches-card-teams">
            <div className="matches-card-team">
              <MatchesStyleTeamLogo abbr={left.abbr ?? "TEN"} apiLogoUrl={left.logo} />
              <div className="matches-card-team-text">
                <h3 className="matches-card-team-name">{left.name ?? "Tennessee Titans"}</h3>
                <p className="matches-card-team-label">{titansIsHome ? "Home" : "Away"}</p>
              </div>
            </div>

            <div className="matches-card-vs">VS</div>

            <div className="matches-card-team">
              <MatchesStyleTeamLogo abbr={right.abbr ?? "NFL"} apiLogoUrl={right.logo} />
              <div className="matches-card-team-text">
                <h3 className="matches-card-team-name">{right.name ?? "Opponent"}</h3>
                <p className="matches-card-team-label">{titansIsHome ? "Away" : "Home"}</p>
              </div>
            </div>
          </div>

          <Button className="matches-card-cta" onPress={openMatchRoom}>
            Enter Match Room
            <FiArrowRight className="matches-card-cta-icon" />
          </Button>
        </Card.Content>
      </Card>
    </section>
  );
}

export default MatchesCard;
