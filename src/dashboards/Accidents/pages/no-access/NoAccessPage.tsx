import { useNavigate } from "react-router-dom";
import { StatusScreen } from "@Accidents/shared/ui/StatusScreen/StatusScreen";
import { useTranslation } from "react-i18next";

export function NoAccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <StatusScreen
      tone="locked"
      title={t("roadAccidents.access.noAccessTitle")}
      message={t("roadAccidents.access.noAccessMessage")}
    >
      <button type="button" onClick={handleLogout}>
        {t("goHomeHeader")}
      </button>
    </StatusScreen>
  );
}
