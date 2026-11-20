import { observer } from "mobx-react-lite";
import { periodsStore } from "@GrowthPoints/entities/dashboard/model/periodsStore";
import type { PeriodMode } from "@GrowthPoints/shared/lib/periodFormat";
import styles from "./AppTopBar.module.css";
import { useTranslation } from "react-i18next";
import GoHomeBtn from "@/SHARED/buttons/GoHomeBtn";
import store from "@/APP/store/root";

// Узкая полоса фильтров над контентом: автоцентр (скрыт, если база одна),
// период, выход. В референсе (ТЗ) это отдельный, визуально лёгкий блок —
// не часть сайдбара и не полноразмерная шапка. id стабильный (в отличие от
// хэшированного CSS-модуль класса) — используется для расчёта высоты при
// скролле к якорю (см. EfficiencyPage.jsx, scrollToElement).
export const AppTopBar = observer(function AppTopBar() {
  const { t } = useTranslation();
  return (
    <div id="app-header" className={styles.bar}>
      {store.auth.firms.length > 1 ? (
        <select
          className={styles.select}
          value={store.auth.dbIndex}
          onChange={(e) => store.auth.setDbIndex(Number(e.target.value))}
        >
          {store.auth.firms.map((firm, index) => (
            <option key={index} value={index}>
              {firm.FIRM_SHORT_NAME}
            </option>
          ))}
        </select>
      ) : (
        <span className={styles.firmName}>{store.auth.currentFirm?.FIRM_SHORT_NAME}</span>
      )}

      {periodsStore.periodOptions.length > 0 && (
        <>
          {/* Первый комбобокс — режим (Месяц/Квартал/Год), второй — само
              значение в этом режиме. Бэкенд с 16.08.2026 принимает один из
              PERIOD_YM/PERIOD_YQ/PERIOD_YEAR (см. dashboardApi.js). */}
          <select
            className={styles.select}
            value={periodsStore.periodMode}
            onChange={(e) => periodsStore.setPeriodMode(e.target.value as PeriodMode)}
          >
            <option value="month">{t("growthPoints.periodMode.month")}</option>
            <option value="quarter">{t("growthPoints.periodMode.quarter")}</option>
            <option value="year">{t("growthPoints.periodMode.year")}</option>
          </select>

          {periodsStore.periodMode === "month" && (
            <select
              className={styles.select}
              value={periodsStore.selectedPeriodYm || ""}
              onChange={(e) => periodsStore.setSelectedPeriod(Number(e.target.value))}
            >
              {periodsStore.periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {periodsStore.periodMode === "quarter" && (
            <select
              className={styles.select}
              value={periodsStore.selectedYq || ""}
              onChange={(e) => periodsStore.setSelectedQuarter(Number(e.target.value))}
            >
              {periodsStore.quarterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {periodsStore.periodMode === "year" && (
            <select
              className={styles.select}
              value={periodsStore.selectedYear || ""}
              onChange={(e) => periodsStore.setSelectedYear(Number(e.target.value))}
            >
              {periodsStore.yearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </>
      )}
      <GoHomeBtn />
    </div>
  );
});
