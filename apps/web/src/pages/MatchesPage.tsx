import { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import MatchCard from "../components/matches/MatchCard";
import { Button } from "@heroui/react";
import { getMatches } from "../services/matchesService";
import { getProfile } from "../services/profileService";
import type { ApiMatch, Match, } from "../types/match";


function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName ? firstName.charAt(0).toUpperCase() : "";
  const last = lastName ? lastName.charAt(0).toUpperCase() : "";
  return `${first}${last}`;
}

function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const visibleMatches = matches.slice(0, visibleCount);
  const hasMoreMatches = visibleCount < matches.length;
  const upcomingCount = matches.filter(
  (m) => m.status === "UPCOMING"
  ).length;

  useEffect(() => {
    async function loadPageData() {
      setLoading(true);
      setError(null);
      setProfileError("");

      try {
        const [matchesResult, profileResult] = await Promise.allSettled([
          getMatches(),
          getProfile(1),
        ]);

        if (matchesResult.status === "fulfilled") {
          const mappedMatches = matchesResult.value.map(mapMatchToCardModel);

          setMatches(mappedMatches);

          if (mappedMatches.length === 0) {
            console.warn("No matches available");
          }
        } else {
          console.error("Error loading matches:", matchesResult.reason);
          setError("Match calendar is temporarily unavailable.");
        }

        if (profileResult.status === "rejected") {
          console.error("Error loading profile:", profileResult.reason);
          setProfileError("Could not load profile data.");
        }

      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadPageData();
  }, []);

  useEffect(() => {
    async function pollMatches() {
      try {
        if (document.visibilityState !== "visible") return;

        const matchesResult = await getMatches();
        const mappedMatches = matchesResult.map(mapMatchToCardModel);

        setMatches(mappedMatches);
        setError(null);
      } catch (err) {
        console.error("Error polling matches:", err);
      }
    }

    const interval = setInterval(pollMatches, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
    <main className="mx-auto max-w-[1400px] px-6 py-6">
      <Navbar />
        <section className="mb-7 flex flex-wrap items-start justify-between gap-6 rounded-[28px] bg-gradient-to-r from-[#0B2A55] via-[#1D4E89] to-[#60A5FA] px-10 py-10 text-white shadow-xl">
          <div>
            <h1 className="mb-3 text-5xl font-black tracking-tight md:text-6xl">
              MATCH CALENDAR
            </h1>

            <p className="mb-6 text-xl text-blue-50">
              Full season schedule and real-time match room access.
            </p>

            <div className="flex flex-wrap gap-10">
              <div>
                <span className="mr-2 text-4xl font-black">{matches.length}</span>
                <span className="text-lg text-blue-50">Games This Season</span>
              </div>

              <div>
                <span className="mr-2 text-4xl font-black">{upcomingCount}</span>
                <span className="text-lg text-blue-50">Upcoming Matches</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button
              variant="ghost"
              className="h-14 min-w-44 rounded-2xl border border-white/30 bg-white/10 px-6 text-lg font-semibold text-white">
              2025 Season
            </Button>

            <Button
              variant="ghost"
              className="h-14 min-w-44 rounded-2xl border border-white/30 bg-white/10 px-6 text-lg font-semibold text-white">
              All Venues
            </Button>
          </div>
        </section>

          {loading && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
            Loading match calendar...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <h2 className="mb-2 text-xl font-bold text-red-700">
              Match calendar unavailable
            </h2>
            <p className="mb-4 text-red-600">{error}</p>

            <Button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white font-bold"
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="mb-2 text-xl font-bold text-[#0B2A55]">
              No matches available
            </h2>
            <p className="text-slate-500">
              There are no scheduled matches to display right now.
            </p>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <>
            <section className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
              {visibleMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </section>

            {hasMoreMatches && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="ghost"
                  className="rounded-full border-2 border-[#0B2A55] px-8 py-4 text-base font-bold text-[#0B2A55]"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                >
                  View More Matches
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function mapMatchToCardModel(match: ApiMatch): Match {
  const opponent = getOpponentName(match);

  return {
    id: match.match_id,
    status: getMatchStatus(match),
    opponent,
    date: formatMatchDate(match.start_time),
    venue: buildVenueText(match),
    resultLabel: getResultLabel(match),
    resultValue: getResultValue(match),

    homeTeam: match.home_team,
    awayTeam: match.away_team,
    homeTeamLogo: match.home_team_logo,
    awayTeamLogo: match.away_team_logo,
    homeTeamAbbreviation: match.home_team_abbreviation,
    awayTeamAbbreviation: match.away_team_abbreviation,
    homeScore: match.home_score,
    awayScore: match.away_score,
  };
}

function getOpponentName(match: ApiMatch): string {
  const isTitansHome = match.home_team === "Tennessee Titans";
  const isTitansAway = match.away_team === "Tennessee Titans";

  if (isTitansHome) {
    return simplifyTeamName(match.away_team);
  }

  if (isTitansAway) {
    return simplifyTeamName(match.home_team);
  }

  return simplifyTeamName(match.away_team || match.home_team || "TBD");
}

function simplifyTeamName(teamName?: string): string {
  if (!teamName) {
    return "TBD";
  }

  return teamName
    .replace("Tennessee Titans", "Titans")
    .replace("Houston Texans", "Texans")
    .replace("Indianapolis Colts", "Colts")
    .replace("Jacksonville Jaguars", "Jaguars")
    .replace("Kansas City Chiefs", "Chiefs")
    .replace("Buffalo Bills", "Bills")
    .replace("Miami Dolphins", "Dolphins");
}

function buildVenueText(match: ApiMatch): string {
  if (match.venue_name && match.venue_city) {
    return `${match.venue_name}, ${match.venue_city}`;
  }

  if (match.venue_name) {
    return match.venue_name;
  }

  return "Venue TBD";
}

function getMatchStatus(match: ApiMatch): "LIVE" | "FINISHED" | "UPCOMING" {
  const status = String(match.status || "").toLowerCase();

  if (status === "live" || status.includes("in_progress") || status.includes("in progress")) {
    return "LIVE";
  }

  if (status === "finished" || status.includes("final") || status.includes("completed")) {
    return "FINISHED";
  }

  return "UPCOMING";
}

function getResultLabel(match: ApiMatch): string {
  const status = getMatchStatus(match);

  if (status === "LIVE") {
    return "CURRENT SCORE";
  }

  if (status === "FINISHED") {
    return "RESULT";
  }

  return "COUNTDOWN";
}

function getResultValue(match: ApiMatch): string {
  const status = getMatchStatus(match);

  if (status === "LIVE" || status === "FINISHED") {
    const homeScore = match.home_score ?? 0;
    const awayScore = match.away_score ?? 0;
    return `${homeScore}-${awayScore}`;
  }

  return "Scheduled";
}

function getCountdownText(startTime: string): string {
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Starting soon";
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days === 1) {
    return "Starts in 1 day";
  }

  return `Starts in ${days} days`;
}

function formatMatchDate(dateString?: string): string {
  if (!dateString) {
    return "Date TBD";
  }

  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default MatchesPage;
