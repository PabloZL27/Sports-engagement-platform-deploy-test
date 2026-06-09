import MatchesStyleTeamLogo from "../common/MatchesStyleTeamLogo";
import { TITANS_ESPN_LOGO_URL } from "../../utils/teamLogo";

interface EnvelopeVisualProps {
  variant?: "preview" | "opening";
  flapOpen?: boolean;
  className?: string;
}

const sizeClasses = {
  preview: "h-32 w-28 sm:h-40 sm:w-32 lg:h-48 lg:w-40",
  opening: "h-44 w-[min(16rem,78vw)] sm:h-52 sm:w-[min(18rem,85vw)]",
} as const;

export default function EnvelopeVisual({
  variant = "preview",
  flapOpen = false,
  className = "",
}: EnvelopeVisualProps) {
  const flapDuration =
    variant === "opening"
      ? "duration-[1000ms] motion-reduce:duration-200 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
      : "";

  const logoSize = variant === "preview" ? "compact-lg" : "compact";

  return (
    <div className={`[perspective:1100px] ${className}`}>
      <div
        className={`relative ${sizeClasses[variant]}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className={`absolute left-[6%] right-[6%] top-1/2 z-[1] h-[22%] -translate-y-1/2 rounded-md bg-gradient-to-b from-amber-400/25 via-[#4B90CD]/20 to-transparent transition-opacity duration-500 ${
            flapOpen ? "opacity-100" : variant === "preview" ? "opacity-80" : "opacity-0"
          }`}
          aria-hidden
        />

        <div className="absolute inset-0 z-0 rounded-lg bg-gradient-to-br from-[#1a2a42] to-[#0f1b2d] shadow-[0_20px_50px_rgba(0,0,0,0.45)] ring-1 ring-white/10" />

        <div
          className="absolute bottom-0 left-0 right-0 z-[5] h-1/2 rounded-b-lg bg-gradient-to-b from-[#243652] to-[#152238] shadow-inner"
          style={{
            clipPath: "polygon(0 10%, 50% 0, 100% 10%, 100% 100%, 0 100%)",
          }}
          aria-hidden
        />

        <div
          className={`absolute left-1/2 top-1/2 z-[30] transition-all duration-500 motion-reduce:duration-150 ${
            flapOpen ? "scale-75 opacity-0" : "opacity-100"
          }`}
          style={{
            transform: flapOpen
              ? "translate3d(-50%, -50%, 12px) scale(0.75)"
              : "translate3d(-50%, -50%, 12px)",
          }}
          aria-hidden
        >
          <MatchesStyleTeamLogo
            abbr="TEN"
            apiLogoUrl={TITANS_ESPN_LOGO_URL}
            size={logoSize}
          />
        </div>

        <div
          className={`absolute left-0 right-0 top-0 z-[20] h-1/2 origin-top transition-transform ${flapDuration}`}
          style={{
            transformStyle: "preserve-3d",
            transform: flapOpen ? "rotateX(178deg) translateZ(2px)" : "rotateX(0deg) translateZ(1px)",
          }}
        >
          <div
            className="h-full w-full bg-gradient-to-br from-[#3d5270] to-[#2a3d56] shadow-md ring-1 ring-white/5 [backface-visibility:hidden]"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              WebkitBackfaceVisibility: "hidden",
            }}
          />
        </div>
      </div>
    </div>
  );
}
