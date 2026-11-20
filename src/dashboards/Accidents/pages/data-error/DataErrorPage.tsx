import { useNavigate } from "react-router-dom";
import { accidentsStore } from "@Accidents/entities/accident/model/accidentsStore";
import { StatusScreen } from "@Accidents/shared/ui/StatusScreen/StatusScreen";
import { useTranslation } from "react-i18next";
import i18n from "@/APP/i18n";

interface DataErrorPageProps {
  message?: string;
  onRetry?: () => void;
}

// Данные не загрузились ни по одной базе или не удалось проверить права
export function DataErrorPage({
  message = i18n.t("roadAccidents.access.dataErrorMessage"),
  onRetry = () => accidentsStore.reload(),
}: DataErrorPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleHome = () => {
    navigate("/");
  };

  return (
    <StatusScreen tone="error" title={t("roadAccidents.access.dataErrorTitle")} message={message}>
      <button type="button" onClick={onRetry}>
        {t("roadAccidents.common.retry")}
      </button>
      <button type="button" onClick={handleHome}>
        {t("goHomeHeader")}
      </button>
    </StatusScreen>
  );
}
