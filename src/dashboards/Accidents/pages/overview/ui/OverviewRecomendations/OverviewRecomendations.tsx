import AnalyticsIcon from "@/SHARED/icons/AnalyticsIcon";
import styles from "./OverviewRecomendations.module.scss";
import { useRef, useState } from "react";
import { filtersStore } from "@/dashboards/Accidents/entities/accident/model/filtersStore";
import { accidentsStore } from "@/dashboards/Accidents/entities/accident/model/accidentsStore";
import { computeOverview } from "../../model/overviewData";
import { getReportDataContext } from "@/dashboards/Accidents/features/pdf-report/model/reportContext";
import { useTranslation } from "react-i18next";
import { buildOverviewJsonReport } from "@/dashboards/Accidents/features/pdf-report/lib/buildOverviewJsonReport";
import { getCurrencyCode } from "@/dashboards/Accidents/shared/lib/formatters";

interface IProps {
  disabled?: boolean;
}

const OverviewRecomendations = ({ disabled = false }: IProps) => {
  const { t } = useTranslation();
  const requestInProgress = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReportFile = async () => {
    const currentPeriod = filtersStore.period;
    const currentData = computeOverview(
      accidentsStore.rows,
      currentPeriod,
      filtersStore.motorcadeLabels,
    );
    const report = buildOverviewJsonReport({
      data: currentData,
      period: currentPeriod,
      context: getReportDataContext(currentData.comparison),
      currencyCode: getCurrencyCode(),
      includeAccidents: false,
    });
    return report;
  };

  const handleButtonClick = async (): Promise<void> => {
    if (disabled || requestInProgress.current) return;
    requestInProgress.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const data = await createReportFile();
      //downloadText(JSON.stringify(data));
      //console.log(JSON.stringify(data));
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("err.recomendation.ai"));
    } finally {
      requestInProgress.current = false;
      setIsLoading(false);
    }
  };
  console.log(disabled);

  const classPanel = [styles.panel, disabled && styles.panelDisabled].filter(Boolean).join(" ");

  return (
    <section className={classPanel}>
      <div className={styles.main}>
        <div className={styles.icon}>
          <AnalyticsIcon />
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>{t("roadAccidents.ai.recommendations.title")}</h2>
          <p className={styles.description}>{t("roadAccidents.ai.recommendations.description")}</p>
        </div>

        <button
          className={styles.button}
          disabled={disabled || isLoading}
          onClick={handleButtonClick}
        >
          {isLoading && <span className={styles.spinner} />}
          {isLoading ? t("preloader.analyzing") : t("recommendation.get")}
        </button>
      </div>

      <span className={styles.srOnly} role="status">
        {isLoading ? t("preloader.reports") : ""}
      </span>

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
};

export default OverviewRecomendations;
