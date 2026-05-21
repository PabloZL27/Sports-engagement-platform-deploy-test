import { useEffect, useState } from "react";
import { Button, Card } from "@heroui/react";
import { FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { getMatches } from "../../services/matchesService";
import type { ApiMatch } from "../../types";
import { parseAbbrsFromShortName, teamLogoUrl } from "../../utils/teamLogo";

type MatchesCardProps = {
  statusLabel?: string;
  title?: string;
  dateText?: string;
  homeTeam?: string;
  homeLabel?: string;
  awayTeam?: string;
  awayLabel?: string;
  daysLeft?: string | number;
  buttonLabel?: string;
};

function selectFeaturedMatch(matches: ApiMatch[]): ApiMatch | null {
  if (matches.length === 0) {
    return null;
  }

  const now = Date.now();

  const liveMatch = matches.find((match) => isLiveMatch(match));

  if (liveMatch) {
    return liveMatch;
  }

  const upcomingMatches = matches
    .filter((match) => {
      if (!match.start_time) {
        return false;
      }

      return new Date(match.start_time).getTime() >= now;
    })
    .sort((a, b) => {
      const firstTime = new Date(a.start_time || "").getTime();
      const secondTime = new Date(b.start_time || "").getTime();

      return firstTime - secondTime;
    });

  return upcomingMatches[0] ?? matches[0];
}

function isLiveMatch(match?: ApiMatch | null): boolean {
  const status = String(match?.status || "").toLowerCase();

  return (
    status.includes("live") ||
    status.includes("in_progress") ||
    status.includes("in progress")
  );
}

function getStatusLabel(match?: ApiMatch | null): string {
  if (isLiveMatch(match)) {
    return "LIVE NOW";
  }

  return "LIVE SOON";
}

function formatMatchDate(value?: string): string {
  if (!value) {
    return "Schedule to be confirmed";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Schedule to be confirmed";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(parsedDate);
}

function getDaysUntilMatch(value?: string): number {
  if (!value) {
    return 0;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 0;
  }

  const difference = parsedDate.getTime() - Date.now();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function getHomeAwayLabel(match: ApiMatch | null, side: "home" | "away"): string {
  if (!match) {
    return side === "home" ? "Home" : "Away";
  }

  return side === "home" ? "Home" : "Away";
}


function MatchesCard({
  statusLabel,
  title = "Next Match",
  dateText,
  homeTeam,
  homeLabel,
  awayTeam,
  awayLabel,
  daysLeft,
  buttonLabel = "Enter Match Room",
}: MatchesCardProps) {
  const navigate = useNavigate();
  const [featuredMatch, setFeaturedMatch] = useState<ApiMatch | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMatches() {
      try {
        const matches = await getMatches();

        if (!isMounted) {
          return;
        }

        setFeaturedMatch(selectFeaturedMatch(matches));
      } catch (error) {
        console.error("Error loading matches card data:", error);
      }
    }

    void loadMatches();

    return () => {
      isMounted = false;
    };
  }, []);

  const resolvedStatusLabel =
    statusLabel ?? getStatusLabel(featuredMatch);
  const resolvedDateText =
    dateText ?? formatMatchDate(featuredMatch?.start_time);
  const resolvedHomeTeam = homeTeam ?? featuredMatch?.home_team ?? "Tennessee Titans";
  const resolvedHomeLabel =
    homeLabel ?? getHomeAwayLabel(featuredMatch, "home");
  const resolvedAwayTeam = awayTeam ?? featuredMatch?.away_team ?? "Houston Texans";
  const resolvedAwayLabel =
    awayLabel ?? getHomeAwayLabel(featuredMatch, "away");
  const resolvedDaysLeft =
    daysLeft ?? getDaysUntilMatch(featuredMatch?.start_time);

  const { home: abbrHome, away: abbrAway } = parseAbbrsFromShortName(
    featuredMatch?.short_name
  );
  const homeLogoAbbr = abbrHome ?? "TEN";
  const awayLogoAbbr = abbrAway ?? "HOU";

  function openMatchRoom() {
    navigate("/matches");
  }

  return (
    <section style={styles.wrapper}>
      <Card style={styles.card}>
        <div style={styles.topRightBubble} />

        <div style={styles.daysCounter}>
          <span style={styles.daysNumber}>{resolvedDaysLeft}</span>
          <span style={styles.daysLabel}>Days Left</span>
        </div>

        <Card.Content style={styles.content}>

          <div style={styles.headerBlock}>
            <h2 style={styles.title}>{title}</h2>
            <p style={styles.date}>{resolvedDateText}</p>
          </div>

          <div style={styles.matchRow}>
            <div style={styles.teamBlockLeft}>
              <div style={styles.teamTextWrapRight}>
                <h3 style={styles.teamName}>{resolvedHomeTeam}</h3>
                <p style={styles.teamLabel}>{resolvedHomeLabel}</p>
              </div>

              <div style={styles.logoPlaceholderLeft}>
                <img
                  src={teamLogoUrl(homeLogoAbbr)}
                  alt=""
                  style={styles.teamLogoImg}
                />
                <div style={styles.logoShadow} aria-hidden />
              </div>
            </div>

            <div style={styles.versus}>VS</div>

            <div style={styles.teamBlockRight}>
              <div style={styles.logoPlaceholderRight}>
                <img
                  src={teamLogoUrl(awayLogoAbbr)}
                  alt=""
                  style={styles.teamLogoImg}
                />
                <div style={styles.logoShadow} aria-hidden />
              </div>

              <div style={styles.teamTextWrapLeft}>
                <h3 style={styles.teamName}>{resolvedAwayTeam}</h3>
                <p style={styles.teamLabel}>{resolvedAwayLabel}</p>
              </div>
            </div>
          </div>

          <Button style={styles.ctaButton} onPress={openMatchRoom}>
            {buttonLabel}
            <FiArrowRight style={styles.buttonIcon} />
          </Button>
        </Card.Content>
      </Card>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: "100%",
    marginBottom: "24px"
  },
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "38px",
    padding: 0,
    background:
      "linear-gradient(180deg, #0d2e59 0%, #0b3567 100%)",
    border: "none",
    boxShadow: "0 28px 70px rgba(8, 29, 58, 0.25)",
  },
  topRightBubble: {
    position: "absolute",
    top: "-130px",
    right: "-90px",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    background: "rgba(58, 113, 178, 0.3)",
    pointerEvents: "none",
  },
  daysCounter: {
    position: "absolute",
    top: "22px",
    right: "28px",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    color: "#ffffff",
  },
  daysNumber: {
    fontSize: "clamp(4.5rem, 9vw, 5.9rem)",
    lineHeight: 0.9,
    fontWeight: 800,
  },
  daysLabel: {
    marginTop: "6px",
    fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)",
    color: "rgba(255,255,255,0.82)",
  },
  content: {
    position: "relative",
    zIndex: 1,
    padding: "34px 42px 36px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  statusChip: {
    width: "fit-content",
    height: "52px",
    padding: "0 18px",
    borderRadius: "24px",
    background: "#d80e37",
    color: "#ffffff",
    fontSize: "1rem",
    fontWeight: 800,
    border: "none",
    boxShadow: "none",
  },
  liveDot: {
    display: "inline-block",
    width: "13px",
    height: "13px",
    marginRight: "14px",
    borderRadius: "50%",
    background: "#ffa3b4",
  },
  headerBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  title: {
    margin: 0,
    color: "#ffffff",
    fontSize: "clamp(2.7rem, 5vw, 3.5rem)",
    lineHeight: 0.96,
    fontWeight: 800,
    letterSpacing: "-0.04em",
  },
  date: {
    margin: 0,
    color: "rgba(238, 242, 248, 0.82)",
    fontSize: "clamp(1.2rem, 1.8vw, 1.45rem)",
    fontWeight: 400,
  },
  matchRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    alignItems: "center",
    gap: "22px",
    marginTop: "4px",
    marginBottom: "4px",
  },
  teamBlockLeft: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 132px",
    alignItems: "center",
    gap: "16px",
  },
  teamBlockRight: {
    display: "grid",
    gridTemplateColumns: "132px minmax(0, 1fr)",
    alignItems: "center",
    gap: "16px",
  },
  teamTextWrapRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    textAlign: "right",
    gap: "10px",
  },
  teamTextWrapLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    textAlign: "left",
    gap: "10px",
  },
  teamName: {
    margin: 0,
    color: "#ffffff",
    fontSize: "clamp(1.7rem, 2.4vw, 2.4rem)",
    lineHeight: 1.04,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  teamLabel: {
    margin: 0,
    color: "rgba(223, 232, 245, 0.64)",
    fontSize: "clamp(1rem, 1.2vw, 1.2rem)",
  },
  versus: {
    color: "rgba(228, 236, 246, 0.78)",
    fontWeight: 700,
    fontSize: "clamp(1.8rem, 2.5vw, 2.4rem)",
    letterSpacing: "-0.03em",
  },
  logoPlaceholderLeft: {
    position: "relative",
    width: "132px",
    height: "132px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, rgba(121, 168, 234, 0.12) 0%, rgba(38, 84, 142, 0.08) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoPlaceholderRight: {
    position: "relative",
    width: "132px",
    height: "132px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(148, 163, 184, 0.08) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  teamLogoImg: {
    position: "relative",
    zIndex: 1,
    width: "auto",
    height: "auto",
    maxWidth: "96px",
    maxHeight: "96px",
    objectFit: "contain",
    borderRadius: "50%",
  },
  logoShadow: {
    position: "absolute",
    left: "50%",
    bottom: "10px",
    transform: "translateX(-50%)",
    width: "72px",
    height: "22px",
    borderRadius: "50%",
    background: "rgba(5, 20, 43, 0.28)",
    zIndex: 0,
  },
  ctaButton: {
    width: "100%",
    minHeight: "72px",
    borderRadius: "32px",
    background: "#ffffff",
    color: "#0b2a55",
    fontSize: "clamp(1.2rem, 1.5vw, 1.45rem)",
    fontWeight: 800,
    boxShadow: "0 14px 28px rgba(6, 24, 48, 0.12)",
  },
  buttonIcon: {
    marginLeft: "8px",
    fontSize: "1.4rem",
  },
};


export default MatchesCard;
