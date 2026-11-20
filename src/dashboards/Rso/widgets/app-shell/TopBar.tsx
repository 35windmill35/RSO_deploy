import { observer } from "mobx-react-lite";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RSO_NAV } from "@Rso/shared/config/navigation";
import { useActiveTabIndex } from "./useActiveTab";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { dashboardStore } from "@Rso/entities/rso/model/dashboardStore";
import { accessStore } from "@Rso/entities/rso/model/accessStore";
import { formatPeriodLabel } from "@Rso/entities/rso/lib/period";
import { IconHome, IconMenu, IconRefresh } from "./icons";
import styles from "./TopBar.module.css";

interface TopBarProps {
  onOpenMenu: () => void;
}

export const TopBar = observer(function TopBar({ onOpenMenu }: TopBarProps) {
  const { t } = useTranslation();
  const activeIndex = useActiveTabIndex();
  const tab = activeIndex >= 0 ? RSO_NAV[activeIndex] : undefined;
  const title = tab ? t(`rso.nav.${tab.id}`) : t("rso.appTitle");
  const period = filtersStore.period;
  // Название базы — только когда их несколько
  const firm =
    accessStore.firmOptions.length > 1
      ? accessStore.firmOptions.find((option) => option.dbIndex === accessStore.dbIndex)?.name
      : undefined;
  const meta = [
    firm,
    period ? formatPeriodLabel(period) : t("rso.periods.none"),
    t(`rso.vat.${filtersStore.vat}`),
  ]
    .filter(Boolean)
    .join(" · ");
  const busy = dashboardStore.isLoading || dashboardStore.isRefreshing;
  // Обновление не удалось — на экране остались прежние данные
  const refreshFailed = dashboardStore.status === "ready" && dashboardStore.error !== null;

  return (
    <header className={styles.bar}>
      <button
        type="button"
        className={`${styles.iconButton} ${styles.menu}`}
        onClick={onOpenMenu}
        aria-label={t("rso.topBar.openMenu")}
      >
        <IconMenu />
      </button>

      <div className={styles.titleBlock}>
        {/* key — заголовок и подпись заново проявляются при смене вкладки и фильтров */}
        <h1 key={title} className={styles.title}>
          {title}
        </h1>
        <span key={meta} className={styles.meta}>
          {meta}
          {refreshFailed && (
            <span className={styles.metaError}> · {t("rso.topBar.refreshFailed")}</span>
          )}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.iconButton} ${dashboardStore.isRefreshing ? styles.spin : ""}`}
          disabled={busy || period === null}
          onClick={() => dashboardStore.reload()}
          title={t("rso.topBar.refresh")}
        >
          <IconRefresh size={16} />
          <span className={styles.actionText}>{t("rso.topBar.refresh")}</span>
        </button>
        {/* Своя кнопка вместо общего GoHomeBtn: тот оформлен под шапку главной
            (SCSS приложения), а здесь кнопки в стиле панели дашборда */}
        <Link to="/" className={styles.iconButton} title={t("goHome")}>
          <IconHome size={16} />
          <span className={styles.actionText}>{t("rso.topBar.home")}</span>
        </Link>
      </div>
    </header>
  );
});
