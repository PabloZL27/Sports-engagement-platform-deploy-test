import { useState } from "react";
import { teamInitials, teamLogoUrl } from "../../utils/teamLogo";

type Props = {
  abbr: string | null;
  teamName: string;
  side: "home" | "away";
};

export default function TeamLogo({ abbr, teamName, side }: Props) {
  const [broken, setBroken] = useState(false);
  const initials = teamInitials(teamName);

  if (!abbr || broken) {
    return (
      <div
        className={`team-logo team-logo--fallback team-logo--${side}`}
        aria-hidden
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={teamLogoUrl(abbr)}
      alt=""
      className={`team-logo team-logo--${side}`}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}