import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardRsoData } from "@Rso/entities/rso/api/contract";
import { diff } from "@Rso/entities/rso/lib/money";
import {
  capacityDepartments,
  capacityRow,
  capacityView,
  type CapacityView,
} from "@Rso/entities/rso/lib/sales";
import {
  DASH,
  deltaTone,
  formatDelta,
  formatHours,
  formatNumber,
  formatPct,
} from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { Card } from "@Rso/shared/ui/Card/Card";
import { Skeleton } from "@Rso/shared/ui/Skeleton/Skeleton";
import styles from "./SalesBlocks.module.css";

interface CapacityBarsProps {
  data: DashboardRsoData | null;
  // Ответ за прошлый период — для дельт процентов
  prev: DashboardRsoData | null;
  // Ответ за прошлый период ещё грузится — у дельт скелетон
  prevLoading: boolean;
  fallback?: ReactNode;
  onOpen?: (departmentId: number, label: string | null) => void;
}

type BarId = "available" | "booked" | "sold";

const BAR_COLOR: Record<BarId, string> = {
  available: "var(--rso-neutral)",
  booked: "var(--rso-accent-2)",
  sold: "var(--rso-accent)",
};

// Загрузка ремзоны (§ЗК 3.5): доступно / записано / продано часов в одной шкале
export function CapacityBars({ data, prev, prevLoading, fallback, onOpen }: CapacityBarsProps) {
  const { t } = useTranslation();
  const [departmentId, setDepartmentId] = useState(-1);

  const departments = capacityDepartments(data);
  // Выбранного отдела нет в новом периоде — показываем компанию
  const selectedId = departments.some((row) => row.DEPARTMENT_ID === departmentId)
    ? departmentId
    : -1;
  const current = capacityRow(data, selectedId);
  const view = capacityView(current);
  const prevView = capacityView(capacityRow(prev, selectedId, current?.DEPARTMENT_NAME));
  const label = selectedId === -1 ? t("rso.sales.capacity.company") : (view?.name ?? DASH);

  const select =
    departments.length > 0 ? (
      <select
        className={styles.select}
        value={selectedId}
        aria-label={t("rso.col.department")}
        onChange={(event) => setDepartmentId(Number(event.target.value))}
      >
        <option value={-1}>{t("rso.sales.capacity.company")}</option>
        {departments.map((row) => (
          <option key={row.DEPARTMENT_ID} value={row.DEPARTMENT_ID}>
            {row.DEPARTMENT_NAME ?? DASH}
          </option>
        ))}
      </select>
    ) : null;

  // Один переход на всю карточку: бары не кликабельные, лишних остановок Tab нет
  const actions = (
    <div className={styles.actions}>
      {select}
      {onOpen && !fallback && view && (
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onOpen(selectedId, selectedId === -1 ? null : view.name)}
        >
          {t("rso.drill.details")}
        </button>
      )}
    </div>
  );

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.capacity.title")}
      subtitle={t("rso.block.capacity.subtitle")}
      actions={actions}
    >
      {content}
    </Card>
  );

  if (fallback) return card(fallback);
  if (!view) return card(<BlockState kind="empty" />);
  if (!view.available)
    return card(<BlockState kind="empty" message={t("rso.sales.capacity.noSchedule")} />);

  const pctOf = (id: BarId, item: CapacityView | null) =>
    id === "booked" ? (item?.loadPct ?? null) : id === "sold" ? (item?.soldPct ?? null) : null;

  const bar = (id: BarId) => {
    const value = view[id];
    const share = view.available && value !== null ? value / view.available : 0;
    const percent = pctOf(id, view);
    const delta = diff(percent, pctOf(id, prevView));
    const deltaText = formatDelta(delta, "pp");
    return (
      <div key={id} className={styles.capacityRow}>
        <span className={styles.capacityHead}>
          <span className={styles.capacityLabel}>{t(`rso.sales.capacity.${id}`)}</span>
          <span className={styles.capacityValue}>
            {formatHours(value)}
            {percent !== null && <span className={styles.capacityPct}>{formatPct(percent)}</span>}
            {percent !== null && prevLoading ? (
              <span className={styles.capacityDelta}>
                <Skeleton width={40} height={12} />
              </span>
            ) : (
              deltaText && (
                <span className={`${styles.capacityDelta} ${styles[deltaTone(delta)]}`}>
                  {deltaText}
                </span>
              )
            )}
          </span>
        </span>
        <span
          className={`${styles.capacityTrack} ${share > 1 ? styles.capacityOverflow : ""}`}
          aria-hidden="true"
        >
          <span
            className={styles.capacityFill}
            style={{ width: `${Math.min(1, share) * 100}%`, background: BAR_COLOR[id] }}
          />
        </span>
      </div>
    );
  };

  return card(
    <div className={styles.capacity} role="group" aria-label={label}>
      {(["available", "booked", "sold"] as const).map(bar)}
      <span className={styles.capacityPosts}>
        {t("rso.drill.postsValue", {
          posts: formatNumber(view.posts),
          stations: formatNumber(view.stations),
        })}
      </span>
      <p className={styles.footnote}>{t("rso.sales.capacity.note")}</p>
    </div>,
  );
}
