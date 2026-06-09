import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export type ScrollNavMode = "home" | "default";

const REVEAL_THRESHOLD = 120;
const SCROLL_DELTA = 6;

export function useScrollRevealNav(mode: ScrollNavMode) {
  const location = useLocation();
  const [showScrollNav, setShowScrollNav] = useState(mode === "default");
  const lastScrollY = useRef(0);

  useEffect(() => {
    setShowScrollNav(mode === "default");
    lastScrollY.current = window.scrollY;
  }, [location.pathname, mode]);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;

      if (mode === "home") {
        if (currentScrollY < REVEAL_THRESHOLD) {
          setShowScrollNav(false);
        } else if (scrollDelta < -SCROLL_DELTA) {
          setShowScrollNav(true);
        } else if (scrollDelta > SCROLL_DELTA) {
          setShowScrollNav(false);
        }
      } else if (currentScrollY < REVEAL_THRESHOLD) {
        setShowScrollNav(true);
      } else if (scrollDelta < -SCROLL_DELTA) {
        setShowScrollNav(true);
      } else if (scrollDelta > SCROLL_DELTA) {
        setShowScrollNav(false);
      }

      lastScrollY.current = currentScrollY;
    }

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [mode]);

  return showScrollNav;
}
