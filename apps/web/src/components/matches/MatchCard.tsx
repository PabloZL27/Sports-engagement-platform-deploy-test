import { Card, CardContent, Chip, Button } from "@heroui/react";
import { useNavigate } from "react-router-dom";
import type { Match } from "../../types/match";
import "../../styles/matchCard.css";
import { useEffect, useRef, useState } from "react";

interface MatchCardProps {
  match: Match;
}

function MatchCard({ match }: MatchCardProps) {
  const navigate = useNavigate();

  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const isUpcoming = match.status === "UPCOMING";
  const [scoreSplash, setScoreSplash] = useState(false);
  const previousScoreRef = useRef(match.resultValue);

  function openMatch() {
    if (isFinished) return;
    navigate(`/matches/${match.id}`);
  }

  const borderClass = isLive
    ? "border-t-[#E11D48]"
    : isFinished
      ? "border-t-[#D1D5DB]"
      : "border-t-[#60A5FA]";

  const chipClass = isLive
    ? "bg-[#E11D48] text-white"
    : isFinished
      ? "bg-[#9CA3AF] text-white"
      : "bg-[#0B2A55] text-white";

  const actionLabel = isLive
    ? "Join Match Room"
    : isFinished
      ? "Match Summary"
      : "View Match";
  
  const TITANS_ABBR = "TEN";

  const titansIsHome = match.homeTeamAbbreviation === TITANS_ABBR;

  const leftTeam = titansIsHome
    ? {
        logo: match.homeTeamLogo,
        abbreviation: match.homeTeamAbbreviation,
        name: match.homeTeam,
      }
    : {
        logo: match.awayTeamLogo,
        abbreviation: match.awayTeamAbbreviation,
        name: match.awayTeam,
      };

  const rightTeam = titansIsHome
    ? {
        logo: match.awayTeamLogo,
        abbreviation: match.awayTeamAbbreviation,
        name: match.awayTeam,
      }
    : {
        logo: match.homeTeamLogo,
        abbreviation: match.homeTeamAbbreviation,
        name: match.homeTeam,
      };
  
  useEffect(() => {
    if (!isLive) return;

    if (previousScoreRef.current !== match.resultValue) {
      setScoreSplash(false);

      requestAnimationFrame(() => {
        setScoreSplash(true);
      });

      const timer = setTimeout(() => {
        setScoreSplash(false);
      }, 800);

      previousScoreRef.current = match.resultValue;

      return () => clearTimeout(timer);
    }

    previousScoreRef.current = match.resultValue;
  }, [match.resultValue, isLive]);

  return (
    <Card
      onClick={openMatch}
      className={isFinished ? "cursor-default" : "cursor-pointer"}
    >
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <Chip
            size="sm"
            className={`rounded-md px-3 py-1 text-xs font-bold uppercase ${chipClass}`}
          >
            {match.status}
          </Chip>

          <span className="text-sm font-medium text-slate-400">{match.date}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <TeamBlock
            logo={leftTeam.logo}
            abbreviation={leftTeam.abbreviation}
            name={leftTeam.name}
          />

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#60A5FA] text-sm font-black text-white shadow">
            VS
          </div>

          <TeamBlock
            logo={rightTeam.logo}
            abbreviation={rightTeam.abbreviation}
            name={rightTeam.name}
            align="right"
          />
        </div>

        <div className="flex flex-col items-center justify-center text-center mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {isUpcoming ? "KICKOFF" : "RESULT"}
          </p>

          <p
            className={`mt-2 font-black transition-all duration-300 ${
              isLive
                ? `text-4xl text-[#E11D48] ${scoreSplash ? "score-splash" : ""}`
                : isFinished
                ? "text-4xl text-[#0B2A55] font-extrabold"
                : "text-2xl text-[#2563EB]"
            }`}
          >
            {isUpcoming ? match.date : match.resultValue}
          </p>
        </div>

        <div className="mt-auto border-t border-slate-200 pt-4">
          <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
            <span>{match.venue}</span>
            <span>{">"}</span>
          </div>

          {!isFinished ? (
            <Button
              onClick={(event) => {
                event.stopPropagation();
                openMatch();
              }}
              variant={isLive ? "primary" : "ghost"}
              className={
                isLive
                  ? "h-11 w-full rounded-xl bg-[#E11D48] text-sm font-bold text-white"
                  : "h-11 w-full rounded-xl border border-[#0B2A55] text-sm font-bold text-[#0B2A55]"
              }
            >
              {actionLabel}
            </Button>
          ) : (
            <div className="h-11 w-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TeamBlockProps {
  logo?: string;
  abbreviation?: string;
  name?: string;
  align?: "left" | "right";
}

function TeamBlock({ logo, abbreviation, name, align = "left" }: TeamBlockProps) {
  return (
    <div className={`min-w-0 flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={`mb-2 flex ${align === "right" ? "justify-end" : "justify-start"}`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 shadow-sm">
          {logo ? (
            <img
              src={logo}
              alt={name || abbreviation || "Team logo"}
              className="h-10 w-10 object-contain"
            />
          ) : (
            <span className="text-sm font-black text-[#0B2A55]">
              {abbreviation || "NFL"}
            </span>
          )}
        </div>
      </div>

      {/* 🔥 Abreviación grande */}
      <p className="text-xl font-black text-[#0B2A55]">
        {abbreviation}
      </p>

      {/* 👇 Nombre más discreto */}
      <p className="truncate text-xs font-semibold text-slate-400">
        {name}
      </p>
    </div>
  );
}

export default MatchCard;