import type { ComponentType } from "react";
import { observer } from "mobx-react-lite";
import { NavLink } from "react-router-dom";
import { periodsStore } from "@GrowthPoints/entities/dashboard/model/periodsStore";
import styles from "./AppSidebar.module.css";
import { useTranslation } from "react-i18next";
import i18n from "@/APP/i18n";
import { URL_GROWTH_POINTS } from "@GrowthPoints/shared/config/urls";
import { IconCar, IconGrid, IconTrendUp, IconUsers, IconWrench } from "@/SHARED/icons";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  Icon: ComponentType;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    to: URL_GROWTH_POINTS.overview,
    label: i18n.t("growthPoints.nav.overview"),
    end: true,
    Icon: IconGrid,
  },
  {
    to: URL_GROWTH_POINTS.efficiency,
    label: i18n.t("growthPoints.nav.efficiency"),
    Icon: IconTrendUp,
  },
  {
    to: URL_GROWTH_POINTS.masters,
    label: i18n.t("growthPoints.nav.masters"),
    Icon: IconUsers,
  },
  {
    to: URL_GROWTH_POINTS.mechanics,
    label: i18n.t("growthPoints.nav.mechanics"),
    Icon: IconWrench,
  },
  { to: URL_GROWTH_POINTS.brands, label: i18n.t("growthPoints.nav.brands"), Icon: IconCar },
];

export const AppSidebar = observer(function AppSidebar() {
  const { t } = useTranslation();
  const periodLabel = periodsStore.selectedPeriodLabel;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.logo}>Т</span>
        <div>
          <div className={styles.brandName}>{t("growthPoints")}</div>
          {periodLabel && <div className={styles.brandPeriod}>{periodLabel}</div>}
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
            }
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
});
