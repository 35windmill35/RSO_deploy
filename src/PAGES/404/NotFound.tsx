import { useTranslation } from "react-i18next";
import classes from "./NotFoundPage.module.scss";
import { Link } from "react-router-dom";
import { useEffect } from "react";

const NotFoundPage = () => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t("pageNotFound");
  }, []);
  return (
    <div className={classes.ts_page_404}>
      <p className={classes.ts_404_title}>{t("pageNotFound")}</p>
      <Link className={classes.ts_link_404} to={"/"}>
        {t("goHome")}
      </Link>
    </div>
  );
};

export default NotFoundPage;
