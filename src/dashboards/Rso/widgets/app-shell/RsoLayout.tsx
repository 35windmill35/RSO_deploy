import { useEffect, useLayoutEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { Outlet, useLocation } from "react-router-dom";
import { drillStore } from "@Rso/features/drill/model/drillStore";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { LazyDrillDrawer } from "./LazyDrillDrawer";
import { useIsMobile } from "./useIsMobile";
import styles from "./RsoLayout.module.css";

// Каркас вкладок (§8.2): ≥ 900 px — сайдбар 260 px + контент;
// < 900 px — сайдбар выезжает по ☰, внизу фиксированная навигация.
export const RsoLayout = observer(function RsoLayout() {
  const { pathname } = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const isDrillOpen = drillStore.isOpen;

  // При смене вкладки — наверх. Сайдбар закрывается по клику на пункт меню.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSidebarOpen]);

  return (
    <div className={`rso ${styles.shell}`}>
      {/* inert: закрытый мобильный сайдбар и всё под открытой панелью
          не попадают в порядок табуляции и не читаются диктором */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        inert={isDrillOpen || (isMobile && !isSidebarOpen)}
      />

      {isSidebarOpen && (
        <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <div className={styles.content} inert={isDrillOpen || (isMobile && isSidebarOpen)}>
        <TopBar onOpenMenu={() => setSidebarOpen(true)} />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <BottomNav inert={isDrillOpen || (isMobile && isSidebarOpen)} />

      {isDrillOpen && <LazyDrillDrawer />}
    </div>
  );
});
