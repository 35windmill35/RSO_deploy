import type { IDashboardDefinition, TDashboardId } from "@/APP/store/types/IDashboardDefinition";
import { Link } from "react-router-dom";
import ArrowRightIcon from "./components/icons/ArrowRightIcon";
import GrowthIcon from "./components/icons/GrowthIcon";
import CarAlertIcon from "./components/icons/CarAlertIcon";
import classes from "./DashboardCard.module.scss";
import { useTranslation } from "react-i18next";
import UnavailableImage from "@/APP/assets/images/lock.png";
import InDevelopmentImage from "@/APP/assets/images/development.png";

interface IProps {
  dashboard: IDashboardDefinition;
  onOpen?: (dashboard: IDashboardDefinition) => void;
}

const STATUS_IMAGE_BY_AVAILABILITY = {
  unavailable: UnavailableImage,
  developed: InDevelopmentImage,
} as const;

const TITLE_LINK_BY_AVAILABILITY = {
  unavailable: "unavailable",
  developed: "developed",
} as const;

const DashboardCard = ({ dashboard, onOpen }: IProps) => {
  const { t } = useTranslation();

  const getIcon = (id: TDashboardId) => {
    switch (id) {
      case "growthPoints":
        return <GrowthIcon />;
      case "roadAccidents":
        return <CarAlertIcon />;
    }
  };

  const statusImage =
    dashboard.availability === "available"
      ? undefined
      : STATUS_IMAGE_BY_AVAILABILITY[dashboard.availability];

  const linkClass = [
    classes.dashboard_card,
    classes[`dashboard_card--${dashboard.accent}`],
    dashboard.availability !== "available" && classes.disabled,
  ]
    .filter(Boolean)
    .join(" ");

  const titleLink =
    dashboard.availability === "available"
      ? undefined
      : t(TITLE_LINK_BY_AVAILABILITY[dashboard.availability]);

  const content = (
    <>
      {dashboard.availability !== "available" && (
        <img className={classes.dashboard_card__status_image} src={statusImage} alt="unavailable" />
      )}
      <span className={classes.dashboard_card__icon} aria-hidden="true">
        {getIcon(dashboard.id)}
      </span>
      <h3 className={classes.dashboard_card__title}>{dashboard.title}</h3>
      <p className={classes.dashboard_card__description}>{dashboard.description}</p>
      <div className={classes.dashboard_card__metrics}>
        {dashboard.metrics.map((metric) => (
          <span key={metric} className={classes.dashboard_card__metric}>
            {metric}
          </span>
        ))}
      </div>
      <div className={classes.dashboard_card__footer}>
        <span>{dashboard.summary}</span>
        {dashboard.availability === "available" && (
          <span className={classes.dashboard_card__action}>
            {t("open")}
            <ArrowRightIcon />
          </span>
        )}
      </div>
    </>
  );

  return dashboard.availability === "available" ? (
    <Link
      title={titleLink}
      className={linkClass}
      to={dashboard.to}
      onClick={() => onOpen?.(dashboard)}
    >
      {content}
    </Link>
  ) : (
    <article title={titleLink} className={linkClass}>
      {content}
    </article>
  );
};

export default DashboardCard;
