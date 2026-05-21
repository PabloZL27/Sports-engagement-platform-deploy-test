import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RosterCard } from "../types";
import { orderedHeadshotUrlsForCard } from "../utils/headshotUrl";

/**
 * Prueba varias URLs (API truncada, rutas relativas, variantes ESPN) hasta que cargue o se agoten.
 */
export function useRosterHeadshotSrc(card: RosterCard) {
  const urls = useMemo(
    () => orderedHeadshotUrlsForCard(card),
    [card.card_id, card.headshot_url, card.espn_athlete_id],
  );

  const resetKey = useMemo(
    () => `${card.card_id}\u0001${urls.join("\u0001")}`,
    [card.card_id, urls],
  );

  const [index, setIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  /** Strict Mode / desmontaje: abortar <img> dispara onError y no debe consumir fallbacks. */
  const ignoreImgErrorRef = useRef(false);

  useEffect(() => {
    ignoreImgErrorRef.current = false;
    setIndex(0);
    setExhausted(false);
    setLoaded(false);
    return () => {
      ignoreImgErrorRef.current = true;
    };
  }, [resetKey]);

  const src = urls[index] ?? null;

  const urlsRef = useRef(urls);
  urlsRef.current = urls;

  // Cuando cambia el candidato (src), reinicia el estado de carga.
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  /** Actualización funcional: varios onError seguidos antes de re-render no saltan índices. */
  const onImgError = useCallback(() => {
    if (ignoreImgErrorRef.current) return;
    setIndex((i) => {
      const list = urlsRef.current;
      const next = i + 1;
      if (next < list.length) return next;
      setExhausted(true);
      return i;
    });
  }, []);

  const onImgLoad = useCallback(() => {
    if (ignoreImgErrorRef.current) return;
    setLoaded(true);
  }, []);

  // Placeholder cuando no hay src o ya se agotaron los intentos.
  // El "no cargado aún" se maneja como overlay en la UI (el <img> debe montarse para poder cargar).
  const showPlaceholder = urls.length === 0 || exhausted;

  return {
    src,
    showPlaceholder,
    onImgError,
    onImgLoad,
    loaded,
    attemptKey: `${index}|${src ?? ""}`,
  };
}
