import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { Navigate, useLocation } from "react-router-dom";
import styles from "./ProtectedLayout.module.css";
import { AppSidebar } from "@GrowthPoints/widgets/app-sidebar/AppSidebar";
import { AppTopBar } from "@GrowthPoints/widgets/app-sidebar/AppTopBar";
import { periodsStore } from "@GrowthPoints/entities/dashboard/model/periodsStore";
import store from "@/APP/store/root";

interface ProtectedLayoutProps {
  children?: ReactNode;
}

// Оборачивает защищённые страницы: нет сессии — редирект на /login, иначе
// рендерит глобальную шапку (фильтры + навигация, см. ТЗ §3) и контент.
export const ProtectedLayout = observer(function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const { pathname } = useLocation();

  // Только на смену экрана, не на смену фильтров
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if (
      store.auth.isAuthenticated &&
      periodsStore.periods.length === 0 &&
      !periodsStore.isLoading
    ) {
      periodsStore.load(store.auth.dbIndex);
    }
  }, []);

  if (!store.auth.isAuthenticated) {
    return <Navigate to={"/login"} state={{ from: location }} replace />;
  }

  return (
    <div className={styles.wrapper}>
      <AppSidebar />
      <div className={styles.contentColumn}>
        <div className={styles.contentInner}>
          <AppTopBar />
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </div>
  );
});
