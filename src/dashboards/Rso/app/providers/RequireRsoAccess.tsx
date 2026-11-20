import type { ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { accessStore } from "@Rso/entities/rso/model/accessStore";
import { StatusScreen } from "@Rso/shared/ui/StatusScreen/StatusScreen";

// Guard дашборда: право на дашборд (RSO_RIGHT_CODE) по всем базам пользователя.
// Сессию проверяет общий auth() приложения.
export const RequireRsoAccess = observer(function RequireRsoAccess({
  children,
}: {
  children: ReactNode;
}) {
  const { t } = useTranslation();

  if (accessStore.allowedDbIndexes === null) {
    return <StatusScreen tone="loading" title={t("rso.access.checking")} />;
  }

  if (accessStore.checkFailed) {
    return (
      <StatusScreen
        tone="error"
        title={t("rso.access.checkFailedTitle")}
        message={t("rso.access.checkFailedMessage", {
          bases: accessStore.rightsCheckErrors.join(", "),
        })}
      >
        <button type="button" onClick={() => accessStore.retry()}>
          {t("rso.block.retry")}
        </button>
        <Link to="/">{t("rso.topBar.home")}</Link>
      </StatusScreen>
    );
  }

  if (!accessStore.hasAccess) {
    return (
      <StatusScreen
        tone="locked"
        title={t("rso.access.noAccessTitle")}
        message={t("rso.access.noAccessMessage")}
      >
        <Link to="/">{t("rso.topBar.home")}</Link>
      </StatusScreen>
    );
  }

  return <>{children}</>;
});
