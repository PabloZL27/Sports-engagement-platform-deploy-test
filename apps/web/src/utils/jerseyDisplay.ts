/**
 * Dorsal en base de datos / ESPN puede ser NULL (práctica, IR sin número asignado, etc.).
 */

export function hasJerseyNumber(num: number | null | undefined): boolean {
  if (num == null || Number.isNaN(Number(num))) return false;
  return Math.trunc(Number(num)) > 0;
}

/** Línea tipo "WR · #11" o solo "WR" si no hay dorsal (sin guion ni placeholder). */
export function positionAndJersey(
  position: string | null | undefined,
  num: number | null | undefined
): string {
  const pos = (position ?? "").trim() || "—";
  if (!hasJerseyNumber(num)) return pos;
  return `${pos} · #${Math.trunc(Number(num))}`;
}
