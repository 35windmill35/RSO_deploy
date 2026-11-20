import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { VatMode } from "@Rso/entities/rso/api/contract";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { accessStore } from "@Rso/entities/rso/model/accessStore";
import { periodsStore } from "@Rso/entities/rso/model/periodsStore";
import { formatPeriodLabel, PERIOD_TYPES } from "@Rso/entities/rso/lib/period";
import { Segmented } from "@Rso/shared/ui/Segmented/Segmented";
import styles from "./FiltersPanel.module.css";

const VAT_MODES: readonly VatMode[] = ["Brutto", "Netto"];

// Фильтры дашборда (§6 ТЗ): база, уровень и значение периода, НДС.
// «Сравнить с» скрыт до появления второго варианта сравнения (вопрос 10 ТЗ).
export const FiltersPanel = observer(function FiltersPanel() {
  const { t } = useTranslation();
  const period = filtersStore.period;
  const firms = accessStore.firmOptions;
  const periodsLoading = periodsStore.status === "loading";

  return (
    <div className={styles.panel}>
      {/* Выбор базы — только если право на дашборд есть в нескольких */}
      {firms.length > 1 && (
        <label className={styles.field}>
          <span className={styles.label}>{t("rso.filters.base")}</span>
          <select
            className={styles.select}
            value={accessStore.dbIndex ?? ""}
            onChange={(event) => accessStore.setDbIndex(Number(event.target.value))}
          >
            {firms.map((firm) => (
              <option key={firm.dbIndex} value={firm.dbIndex}>
                {firm.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className={styles.field}>
        <span className={styles.label}>{t("rso.filters.periodType")}</span>
        <Segmented
          label={t("rso.filters.periodType")}
          value={filtersStore.periodType}
          options={PERIOD_TYPES.map((type) => ({
            value: type,
            label: t(`rso.period.type.${type}`),
          }))}
          onChange={(type) => filtersStore.setPeriodType(type)}
        />
      </div>

      <label className={styles.field}>
        <span className={styles.label}>{t("rso.filters.period")}</span>
        <select
          className={styles.select}
          value={period?.key ?? ""}
          disabled={period === null}
          onChange={(event) => filtersStore.setPeriodKey(Number(event.target.value))}
        >
          {period === null && (
            <option value="">
              {periodsLoading ? t("rso.block.loading") : t("rso.periods.none")}
            </option>
          )}
          {filtersStore.periodOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {formatPeriodLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.field}>
        <span className={styles.label}>{t("rso.filters.vat")}</span>
        <Segmented
          label={t("rso.filters.vat")}
          value={filtersStore.vat}
          options={VAT_MODES.map((vat) => ({ value: vat, label: t(`rso.vat.${vat}`) }))}
          onChange={(vat) => filtersStore.setVat(vat)}
        />
      </div>
    </div>
  );
});
