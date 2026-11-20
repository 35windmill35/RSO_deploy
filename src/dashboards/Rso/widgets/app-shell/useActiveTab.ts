import { matchPath, useLocation } from "react-router-dom";
import { RSO_NAV } from "@Rso/shared/config/navigation";

// Индекс активной вкладки — для плашек, которые переезжают между пунктами
export function useActiveTabIndex(): number {
  const { pathname } = useLocation();
  return RSO_NAV.findIndex(
    (item) => matchPath({ path: item.to, end: item.end }, pathname) !== null,
  );
}
