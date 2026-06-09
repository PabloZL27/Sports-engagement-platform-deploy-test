import { resolveTeamLogoUrl } from "../../utils/teamLogo";
import "../../styles/home.css";

interface MatchesStyleTeamLogoProps {
  abbr?: string;
  apiLogoUrl?: string | null;
  size?: "default" | "compact" | "compact-lg";
  className?: string;
}

export default function MatchesStyleTeamLogo({
  abbr = "TEN",
  apiLogoUrl,
  size = "default",
  className = "",
}: MatchesStyleTeamLogoProps) {
  const src = resolveTeamLogoUrl(abbr, apiLogoUrl);
  const sizeClass =
    size === "compact"
      ? "matches-card-logo--compact"
      : size === "compact-lg"
        ? "matches-card-logo--compact-lg"
        : "";

  return (
    <div className={`matches-card-logo ${sizeClass} ${className}`.trim()}>
      {src ? (
        <img src={src} alt="" className="matches-card-logo-img" draggable={false} />
      ) : (
        <span className="matches-card-logo-fallback">{abbr}</span>
      )}
    </div>
  );
}
