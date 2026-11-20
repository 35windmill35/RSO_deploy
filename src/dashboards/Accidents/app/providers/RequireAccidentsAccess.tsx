import { observer } from "mobx-react-lite";
import { Navigate, useLocation } from "react-router-dom";
import { accidentsStore } from "@Accidents/entities/accident/model/accidentsStore";
import { StatusScreen } from "@Accidents/shared/ui/StatusScreen/StatusScreen";
import { NoAccessPage } from "@Accidents/pages/no-access/NoAccessPage";
import { DataErrorPage } from "@Accidents/pages/data-error/DataErrorPage";
import { AppShell } from "@Accidents/widgets/app-shell/AppShell";
import { useTranslation } from "react-i18next";
import store from "@/APP/store/root";

interface RequireAccidentsAccessProps {
  children?: React.ReactNode;
}

// Guard защищённых экранов: сессия → права по базам → загрузка данных.
// Частичный отказ баз не блокирует экран — его показывает DataStatusBanner.
export const RequireAccidentsAccess = observer(function RequireAccidentsAccess({
  children,
}: RequireAccidentsAccessProps) {
  const { t } = useTranslation();
  const location = useLocation();

  if (!store.auth.isAuthenticated) {
    return <Navigate to={"/login"} state={{ from: location }} replace />;
  }

  // Повторная проверка прав экран не прячет
  if (store.auth.isLoading || accidentsStore.allowedDbIndexes === null) {
    return (
      <StatusScreen
        tone="loading"
        title={t("roadAccidents.access.checkingTitle")}
        message={t("roadAccidents.access.checkingMessage")}
        progress={null}
      />
    );
  }

  if (accidentsStore.rightsCheckFailed) {
    return (
      <DataErrorPage
        message={t("roadAccidents.access.checkFailed", {
          bases: accidentsStore.rightsCheckErrors.join(", "),
        })}
        onRetry={() => void accidentsStore.retry()}
      />
    );
  }

  if (!accidentsStore.hasAccidentsAccess) {
    return <NoAccessPage />;
  }

  if (accidentsStore.isInitialLoad) {
    const total = accidentsStore.totalCount;
    return (
      <StatusScreen
        tone="loading"
        title={t("roadAccidents.access.loadingTitle")}
        message={
          total > 0
            ? t("roadAccidents.common.loadedBases", {
                count: accidentsStore.loadedCount,
                total: total,
              })
            : t("roadAccidents.access.loadingMessage")
        }
        progress={total > 0 ? accidentsStore.loadedCount / total : null}
      />
    );
  }

  if (accidentsStore.status === "failed") {
    return <DataErrorPage />;
  }

  return <AppShell>{children}</AppShell>;
});
