/** Rutas bajo `public/team-logos/`. Puedes usar .png y cambiar `LOGO_EXT`. */
const LOGO_EXT = "svg";

/** `short_name` API: "TEN vs IND" → local vs visita. */
export function parseAbbrsFromShortName(shortName: string | undefined): {
  home: string | null;
  away: string | null;
} {
  if (!shortName || typeof shortName !== "string") {
    return { home: null, away: null };
  }
  const parts = shortName.split(/\s+vs\s+/i);
  if (parts.length !== 2) {
    return { home: null, away: null };
  }
  const home = parts[0].trim().toUpperCase();
  const away = parts[1].trim().toUpperCase();
  return {
    home: home || null,
    away: away || null
  };
}

export function teamLogoUrl(abbr: string): string {
  return `/team-logos/${abbr}.${LOGO_EXT}`;
}

export function teamInitials(teamName: string, maxLen = 3): string {
  const parts = teamName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].slice(0, maxLen).toUpperCase();
  }
  return "?";
}