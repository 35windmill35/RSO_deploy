import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type {
  StructurePart,
  StructureRow,
  TurnoverStructure as Structure,
} from "@Rso/entities/rso/lib/sales";
import { DASH, formatMoney, formatPct } from "@Rso/shared/lib/format";
import { Card } from "@Rso/shared/ui/Card/Card";
import { StackedBar } from "@Rso/shared/ui/StackedBar/StackedBar";
import styles from "./SalesBlocks.module.css";

const PART_COLOR: Record<StructurePart, string> = {
  parts: "var(--rso-accent-2)",
  work: "var(--rso-accent)",
  other: "var(--rso-neutral)",
};

const PART_TEXT: Record<StructurePart, string> = {
  parts: "var(--rso-on-chart-2)",
  work: "var(--rso-on-chart-1)",
  other: "var(--rso-on-neutral)",
};

const PARTS: readonly StructurePart[] = ["parts", "work", "other"];

interface TurnoverStructureProps {
  data: Structure | null;
  // Режим «без НДС»: суммы пересчитаны оценочно
  approx: boolean;
  fallback?: ReactNode;
  onOpen?: () => void;
}

// Запчасти / работы / прочее: по компании и по каждому отделу (clientSegment, итоговые строки)
export function TurnoverStructure({ data, approx, fallback, onOpen }: TurnoverStructureProps) {
  const { t } = useTranslation();

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.turnoverStructure.title")}
      subtitle={t("rso.block.turnoverStructure.subtitle")}
    >
      {content}
    </Card>
  );

  if (fallback || !data) return card(fallback);

  const row = (item: StructureRow, company: boolean) => {
    const name = company ? t("rso.sales.capacity.company") : (item.name ?? DASH);
    const segments = PARTS.map((part) => ({
      key: part,
      label: t(`rso.structure.${part}`),
      value: item[part],
      color: PART_COLOR[part],
      textColor: PART_TEXT[part],
      caption: formatPct(item.total > 0 ? (item[part] / item.total) * 100 : null),
    }));
    return (
      <div
        key={item.id}
        className={`${styles.structureRow} ${company ? styles.structureCompany : ""}`}
      >
        <div className={styles.structureHead}>
          <span className={styles.structureName}>{name}</span>
          <span className={styles.structureValue}>{formatMoney(item.total)}</span>
        </div>
        <StackedBar
          segments={segments}
          label={`${name}: ${segments.map((s) => `${s.label} ${s.caption}`).join(", ")}`}
          onSelect={onOpen ? () => onOpen() : undefined}
        />
      </div>
    );
  };

  return card(
    <div className={styles.stack}>
      <div className={styles.legend}>
        {PARTS.map((part) => (
          <span key={part} className={styles.legendStatic}>
            <span className={styles.swatch} style={{ background: PART_COLOR[part] }} />
            {t(`rso.structure.${part}`)}
          </span>
        ))}
      </div>
      {data.company && row(data.company, true)}
      {data.departments.map((item) => row(item, false))}
      <p className={styles.footnote}>
        {t("rso.sales.structure.ratio", { value: formatPct(data.ratio) })}
      </p>
      {approx && <p className={styles.footnote}>{t("rso.vat.approxHint")}</p>}
    </div>,
  );
}
