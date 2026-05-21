import type { RosterCard } from "../types";

export function normalizeHeadshotUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const u = String(url).trim();
  if (!u) return null;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("http://")) return `https://${u.slice(7)}`;
  // ESPN a veces devuelve href relativo; sin host el <img> pide a tu origen y falla.
  if (u.startsWith("/")) return `https://a.espncdn.com${u}`;
  return u;
}

/** Variantes públicas NFL por espn_athlete_id (directas, otro host, combiner). */
function espnNflHeadshotCandidates(espnId: number): string[] {
  const id = Math.trunc(espnId);
  const relBase = `/i/headshots/nfl/players/full/${id}`;
  const hosts = ["https://a.espncdn.com", "https://secure.espncdn.com"] as const;
  const exts = [".png", ".jpg", ".jpeg", ".webp"] as const;
  const direct: string[] = [];
  for (const host of hosts) {
    for (const ext of exts) {
      direct.push(`${host}${relBase}${ext}`);
    }
  }
  const combiner = [
    `https://a.espncdn.com/combiner/i?img=${relBase}.png&w=350&h=254`,
    `https://a.espncdn.com/combiner/i?img=${relBase}.jpg&w=350&h=254`,
  ];
  return [...direct, ...combiner];
}

function pickEspnAthleteId(row: Record<string, unknown>): number | null {
  const candidates = [
    row.espn_athlete_id,
    row.espnAthleteId,
    row.espn_athleteId,
    row.espnId,
  ];
  for (const v of candidates) {
    if (v == null) continue;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  }
  return null;
}

/** Lista ordenada: URL guardada (si hay) y luego variantes ESPN (.png / .jpg). */
export function orderedHeadshotUrlsFromRow(row: Record<string, unknown>): string[] {
  const raw =
    (row.headshot_url as string | undefined) ??
    (row.headshotUrl as string | undefined) ??
    null;
  const normalized = normalizeHeadshotUrl(raw);
  const id = pickEspnAthleteId(row);
  const espnUrls = id != null ? espnNflHeadshotCandidates(id) : [];

  const out: string[] = [];
  const add = (u: string | null | undefined) => {
    if (!u) return;
    if (!out.includes(u)) out.push(u);
  };

  add(normalized);
  espnUrls.forEach((u) => add(u));
  return out;
}

export function orderedHeadshotUrlsForCard(card: RosterCard): string[] {
  return orderedHeadshotUrlsFromRow(card as unknown as Record<string, unknown>);
}

export function resolveHeadshotForRosterCard(card: RosterCard): string | null {
  return resolveHeadshotFromRow(card as unknown as Record<string, unknown>);
}

/** Une snake_case / camelCase del API; primera URL candidata (misma semántica que antes). */
export function resolveHeadshotFromRow(row: Record<string, unknown>): string | null {
  const urls = orderedHeadshotUrlsFromRow(row);
  return urls[0] ?? null;
}
