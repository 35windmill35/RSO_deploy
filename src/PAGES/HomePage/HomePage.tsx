import DashboardCard from "@/WIDGETS/DashboardCard";
import classes from "./HomePage.module.scss";
import type { IDashboardDefinition } from "@/APP/store/types/IDashboardDefinition";
import { useNavigate } from "react-router-dom";
import LogoutIcon from "@/SHARED/icons/LogoutIcon";
import { useTranslation } from "react-i18next";
import store from "@/APP/store/root";

const HomePage = () => {
  const { t } = useTranslation();
  // Показываем все дашборды, без фильтра по типу клиента (АТП / СТО)
  const dashboards = store.dashboard.getDashboard();
  const navigate = useNavigate();
  const handleDashboardOpen = (dashboard: IDashboardDefinition) => {
    if (dashboard.availability === "available") navigate(dashboard.to);
  };

  const availableCount = dashboards.filter((item) => item.availability === "available").length;

  return (
    <main className={classes.dashboard_page}>
      <header className={classes.dashboard_page__header}>
        <div>
          <h1 className={classes.dashboard_page__title}>{t("dashboards")}</h1>
          <p className={classes.dashboard_page__subtitle}>{t("home.description")}</p>
        </div>
        <button className={classes.logout} onClick={() => store.auth.logout()}>
          <LogoutIcon />
        </button>
      </header>

      <section className={classes.dashboard_page__intro} aria-labelledby="choose-dashboard-title">
        <div>
          <h2 className={classes.dashboard_page__heading}>{t("home.select")}</h2>
          <p className={classes.dashboard_page__description}>{t("home.select.description")}</p>
        </div>
      </section>

      <section>
        <div className={classes.dashboard_page__section_header}>
          <h2>{t("home.dashboards.available")}</h2>
          <span>{t("availableFrom", { count: availableCount, total: dashboards.length })}</span>
        </div>

        <div className={classes.dashboard_grid}>
          {dashboards.map((dashboard) => (
            <DashboardCard key={dashboard.id} dashboard={dashboard} onOpen={handleDashboardOpen} />
          ))}
        </div>
      </section>
    </main>
  );
};

export default HomePage;
