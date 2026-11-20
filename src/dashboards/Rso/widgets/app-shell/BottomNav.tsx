import type { CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RSO_NAV } from "@Rso/shared/config/navigation";
import { NAV_ICONS } from "./navIcons";
import { useActiveTabIndex } from "./useActiveTab";
import styles from "./BottomNav.module.css";

// Нижняя навигация по 3 вкладкам — только < 900 px (§8.2)
export function BottomNav({ inert = false }: { inert?: boolean }) {
  const { t } = useTranslation();
  const activeIndex = useActiveTabIndex();
  const style = { "--count": RSO_NAV.length, "--active-index": activeIndex } as CSSProperties;

  return (
    <nav
      className={styles.bottomNav}
      aria-label={t("rso.sidebar.sections")}
      style={style}
      inert={inert}
    >
      {activeIndex >= 0 && <span className={styles.indicator} aria-hidden="true" />}
      {RSO_NAV.map(({ id, to, end }) => {
        const Icon = NAV_ICONS[id];
        return (
          <NavLink
            key={id}
            to={to}
            end={end}
            className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
          >
            <Icon size={20} />
            <span>{t(`rso.nav.short.${id}`)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
