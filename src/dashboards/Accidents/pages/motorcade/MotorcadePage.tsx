import { useCallback, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { accidentsStore } from "@Accidents/entities/accident/model/accidentsStore";
import { filtersStore } from "@Accidents/entities/accident/model/filtersStore";
import { getMotorcadeKey } from "@Accidents/entities/accident/lib/motorcade";
import { ErrorState } from "@Accidents/shared/ui/ErrorState/ErrorState";
import { pdfReportStore } from "@Accidents/features/pdf-report/model/pdfReportStore";
import { getReportDataContext } from "@Accidents/features/pdf-report/model/reportContext";
import { formatPeriodLabel, partialPeriodNote } from "@Accidents/entities/accident/lib/period";
import { formatNumber } from "@Accidents/shared/lib/formatters";
import { PageHeader } from "@Accidents/widgets/page-header/PageHeader";
import { SectionDivider } from "@Accidents/shared/ui/SectionDivider/SectionDivider";
import { computeMotorcade } from "./model/motorcadeData";
import { MotorcadeKpiRow } from "./ui/MotorcadeKpiRow";
import { MotorcadeCharts } from "./ui/MotorcadeCharts";
import { MotorcadeTables } from "./ui/MotorcadeTables";
import styles from "./MotorcadePage.module.css";
import { useTranslation } from "react-i18next";
import store from "@/APP/store/root";

export const MotorcadePage = observer(function MotorcadePage() {
  const { t } = useTranslation();
  const period = filtersStore.period;
  const selectedKey = filtersStore.selectedMotorcadeKey;
  const selectedOption = filtersStore.motorcadeOptions.find((o) => o.key === selectedKey);

  // Данные берутся из сторов в момент клика
  const exportPdf = useCallback(async () => {
    const currentPeriod = filtersStore.period;
    const currentKey = filtersStore.selectedMotorcadeKey;
    const currentOption = filtersStore.motorcadeOptions.find((o) => o.key === currentKey);
    if (!currentKey || !currentOption) return;

    const { saveMotorcadeReport } =
      await import("@Accidents/features/pdf-report/lib/buildMotorcadeReport");
    const currentRows = accidentsStore.rows.filter((row) => getMotorcadeKey(row) === currentKey);
    const currentData = computeMotorcade(currentRows, currentPeriod);
    return saveMotorcadeReport({
      data: currentData,
      context: getReportDataContext(currentData.comparison),
      period: currentPeriod,
      motorcadeName: currentOption.name,
      onSection: (done, total) => pdfReportStore.setProgress(done, total),
    });
  }, []);

  useEffect(() => {
    pdfReportStore.register(exportPdf);
    return () => pdfReportStore.unregister(exportPdf);
  }, [exportPdf]);

  if (!selectedKey || !selectedOption) {
    return (
      <div className={styles.page}>
        <ErrorState message={t("roadAccidents.motorcade.noMotorcades")} />
      </div>
    );
  }

  const motorcadeRows = accidentsStore.rows.filter((row) => getMotorcadeKey(row) === selectedKey);
  const data = computeMotorcade(motorcadeRows, period);
  const partialNote = partialPeriodNote(data.comparison);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={t("roadAccidents.nav.motorcade")}
        title={selectedOption.name}
        meta={[
          formatPeriodLabel(period),
          t("roadAccidents.motorcade.accidentsForPeriod", { count: formatNumber(data.kpi.count) }),
          ...(partialNote ? [partialNote] : []),
        ]}
      />

      <MotorcadeKpiRow data={data} period={period} />
      <SectionDivider title={t("roadAccidents.common.dynamicsAndStructure")} />
      <MotorcadeCharts key={store.theme.theme} data={data} period={period} />
      <SectionDivider title={t("roadAccidents.common.details")} />
      <MotorcadeTables data={data} period={period} />
    </div>
  );
});
