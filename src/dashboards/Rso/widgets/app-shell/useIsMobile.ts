import { useEffect, useState } from "react";

// Мобильная раскладка каркаса (< 900 px, §8.2): сайдбар выезжает по ☰
const MOBILE_QUERY = "(max-width: 899px)";

export function useIsMobile(): boolean {
  const [isMobile, setMobile] = useState(() => window.matchMedia?.(MOBILE_QUERY).matches ?? false);

  useEffect(() => {
    const query = window.matchMedia?.(MOBILE_QUERY);
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setMobile(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
