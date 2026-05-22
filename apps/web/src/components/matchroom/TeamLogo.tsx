import { useState } from "react";
import { resolveTeamLogoUrl, teamInitials } from "../../utils/teamLogo";

type Props = {
  abbr: string | null;
  teamName: string;
  side: "home" | "away";
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

export default function TeamLogo({
  abbr,
  teamName,
  side,
  logoUrl,
  size = "md",
}: Props) {
  const [broken, setBroken] = useState(false);
  const initials = teamInitials(teamName);
  const resolved = broken ? null : resolveTeamLogoUrl(abbr, logoUrl);

  if (!resolved) {
    return (
      <div
        className={`team-logo team-logo--${size} team-logo--fallback team-logo--${side}`}
        aria-hidden
      >
        {abbr || initials}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt=""
      className={`team-logo team-logo--${size} team-logo--${side}`}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
