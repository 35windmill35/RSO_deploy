import { IconExit } from "@/SHARED/icons";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import classes from "./GoHomeBtn.module.scss";

const GoHomeBtn = () => {
  const { t } = useTranslation();
  return (
    <Link className={classes.logout} to={"/"}>
      <IconExit />
      {t("goHomeHeader")}
    </Link>
  );
};

export default GoHomeBtn;
