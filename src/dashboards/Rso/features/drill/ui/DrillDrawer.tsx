import { useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { METRICS } from "@Rso/entities/rso/lib/metrics";
import { formatPeriodLabel } from "@Rso/entities/rso/lib/period";
import { formatDay } from "@Rso/shared/lib/format";
import { drillStore, type DrillNode } from "../model/drillStore";
import { DrillNodeView } from "./DrillNodeView";
import { TargetNodeView } from "./targets/TargetNodeView";
import styles from "./DrillDrawer.module.css";

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Нижняя выдвижная панель drill-down (§7 ТЗ заказчика): хлебные крошки,
// показатели уровня и таблица — дочерние периоды, дни месяца или список ЗН
export const DrillDrawer = observer(function DrillDrawer() {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const { isOpen, target, stack, node } = drillStore;

  // Esc закрывает, Tab не уходит из панели, страница под панелью не прокручивается,
  // после закрытия фокус возвращается на элемент, с которого открыли
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        drillStore.close();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !sheetRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !sheetRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen || !target || !node) return null;

  // Заголовок: показатель — из словаря, срез — его название и вид
  const hint =
    target.kind === "metric"
      ? t(`rso.kpi.${target.metricId}.hint`)
      : t(`rso.drill.target.${target.kind}.hint`);

  const targetLabel = (item: DrillNode) =>
    item.target.kind === "metric"
      ? t(`rso.kpi.${item.target.metricId}.label`)
      : (item.target.label ?? t(`rso.drill.target.${item.target.kind}.unknown`));

  const title = targetLabel(node);

  // Уровень со сменой цели («марка → модель») подписан целью, остальные — периодом или днём.
  // Если цель в стеке менялась, первая крошка называет и исходную цель: «AUDI · Ноябрь 2024»
  const targetChanged = stack.some(
    (item, index) => index > 0 && stack[index - 1].target !== item.target,
  );
  const crumbLabel = (item: DrillNode, index: number) => {
    if (index > 0 && stack[index - 1].target !== item.target) return targetLabel(item);
    const label =
      item.day === "all"
        ? t("rso.drill.allAccounts")
        : item.day
          ? formatDay(item.day)
          : formatPeriodLabel(item.period);
    return index === 0 && targetChanged ? `${targetLabel(item)} · ${label}` : label;
  };

  return (
    <>
      <div className={styles.overlay} onClick={() => drillStore.close()} aria-hidden="true" />
      <section
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rso-drill-title"
        aria-describedby="rso-drill-hint"
      >
        <header className={styles.header}>
          {stack.length > 1 && (
            <button
              type="button"
              className={styles.back}
              onClick={() => drillStore.goTo(stack.length - 2)}
              aria-label={t("rso.drill.backTo", {
                level: crumbLabel(stack[stack.length - 2], stack.length - 2),
              })}
            >
              <span aria-hidden="true">←</span>
              <span className={styles.backText}>{t("rso.drill.back")}</span>
            </button>
          )}
          <div className={styles.heading}>
            <h2 id="rso-drill-title" className={styles.title}>
              {title}
            </h2>
            {/* Описание показателя: на сенсорных экранах подсказка карточки недоступна */}
            <p id="rso-drill-hint" className={styles.hint}>
              {hint}
            </p>
            <nav className={styles.crumbs} aria-label={t("rso.drill.breadcrumbs")}>
              {stack.map((item, index) => {
                const isLast = index === stack.length - 1;
                return (
                  <span key={index} className={styles.crumbItem}>
                    {index > 0 && <span className={styles.crumbSep}>›</span>}
                    {isLast ? (
                      <span className={styles.crumbCurrent} aria-current="page">
                        {crumbLabel(item, index)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={styles.crumb}
                        onClick={() => drillStore.goTo(index)}
                      >
                        {crumbLabel(item, index)}
                      </button>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={() => drillStore.close()}
            aria-label={t("close")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </header>

        {/* key — уровень заново проявляется при переходе */}
        <div key={stack.length} className={styles.body}>
          {target.kind === "metric" ? (
            <DrillNodeView node={node} metric={METRICS[target.metricId]} />
          ) : (
            <TargetNodeView target={target} node={node} />
          )}
        </div>
      </section>
    </>
  );
});
