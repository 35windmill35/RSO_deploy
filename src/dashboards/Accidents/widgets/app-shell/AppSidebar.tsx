import type { ComponentType, CSSProperties } from "react";
import { observer } from "mobx-react-lite";
import { NavLink, matchPath, useLocation } from "react-router-dom";
import { IconGrid, IconBus, IconChart } from "./icons";
import styles from "./AppSidebar.module.css";
import i18n from "@/APP/i18n";
import { useTranslation } from "react-i18next";
import { URL_ACCIDENT } from "@Accidents/shared/config/urls";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  Icon: ComponentType;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: URL_ACCIDENT.overview,
    label: i18n.t("roadAccidents.nav.overview"),
    end: true,
    Icon: IconGrid,
  },
  {
    to: URL_ACCIDENT.motorcade,
    label: i18n.t("roadAccidents.nav.motorcade"),
    Icon: IconBus,
  },
  {
    to: URL_ACCIDENT.analytics,
    label: i18n.t("roadAccidents.nav.analytics"),
    Icon: IconChart,
  },
];

interface AppSidebarProps {
  isOpen: boolean;
  onNavigate: () => void;
}

// Активный пункт — одна плашка, которая переезжает между пунктами
export const AppSidebar = observer(function AppSidebar({ isOpen, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const activeIndex = NAV_ITEMS.findIndex(
    (item) => matchPath({ path: item.to, end: item.end ?? false }, location.pathname) !== null,
  );

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
      <div className={styles.brand}>
        <div className={styles.brandText}>
          <span className={styles.brandName}>{t("roadAccidents.appTitle")}</span>
          <span className={styles.brandCaption}>{t("roadAccidents.appSubtitle")}</span>
        </div>
      </div>

      <span className={styles.sectionLabel}>{t("roadAccidents.nav.sections")}</span>

      <nav className={styles.nav} aria-label={t("roadAccidents.nav.sections")}>
        {activeIndex >= 0 && (
          <span
            className={styles.indicator}
            style={{ "--active-index": activeIndex } as CSSProperties}
            aria-hidden="true"
          />
        )}
        {NAV_ITEMS.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
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
