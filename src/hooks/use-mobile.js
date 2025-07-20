import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
    );

    const onChange = (e) => setIsMobile(e.matches);

    mediaQuery.addEventListener("change", onChange);

    // Set initial value
    setIsMobile(mediaQuery.matches);

    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
