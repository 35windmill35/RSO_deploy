import type { CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RSO_NAV } from "@Rso/shared/config/navigation";
import { FiltersPanel } from "./FiltersPanel";
import { IconClose } from "./icons";
import { NAV_ICONS } from "./navIcons";
import { useActiveTabIndex } from "./useActiveTab";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  // Недоступен для фокуса и диктора (закрыт на мобильном или открыта панель детализации)
  inert?: boolean;
}

export function Sidebar({ isOpen, onClose, inert = false }: SidebarProps) {
  const { t } = useTranslation();
  const activeIndex = useActiveTabIndex();

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`} inert={inert}>
      <div className={styles.brand}>
        <div className={styles.brandText}>
          <span className={styles.brandName}>{t("rso.appTitle")}</span>
          <span className={styles.brandCaption}>{t("rso.appSubtitle")}</span>
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label={t("rso.topBar.closeMenu")}
        >
          <IconClose />
        </button>
      </div>

      <span className={styles.sectionLabel}>{t("rso.sidebar.sections")}</span>
      <nav className={styles.nav} aria-label={t("rso.sidebar.sections")}>
        {/* Активный пункт — одна плашка, которая переезжает между пунктами */}
        {activeIndex >= 0 && (
          <span
            className={styles.indicator}
            style={{ "--active-index": activeIndex } as CSSProperties}
            aria-hidden="true"
          />
        )}
        {RSO_NAV.map(({ id, to, end }) => {
          const Icon = NAV_ICONS[id];
          return (
            <NavLink
              key={id}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
            >
              <Icon />
              <span>{t(`rso.nav.${id}`)}</span>
            </NavLink>
          );
        })}
      </nav>

      <span className={styles.sectionLabel}>{t("rso.sidebar.filters")}</span>
      <FiltersPanel />
    </aside>
  );
}
