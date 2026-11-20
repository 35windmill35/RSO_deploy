import { useTranslation } from "react-i18next";
import {
  deltaTone,
  formatDecimal,
  formatDelta,
  formatMoney,
  formatNumber,
  formatPct,
} from "@Rso/shared/lib/format";
import type { SegmentsData, SegmentStats } from "../model/overviewData";
import styles from "./OverviewBlocks.module.css";

interface ClientSegmentsProps {
  data: SegmentsData;
  // Режим «без НДС»: суммы пересчитаны оценочно — показать пометку
  approx?: boolean;
  // Drill-down: сегменты по отделам за период
  onOpen?: () => void;
}

function Delta({ value }: { value: number | null }) {
  const text = formatDelta(value);
  if (!text) return null;
  return <span className={`${styles.delta} ${styles[deltaTone(value)]}`}>{text}</span>;
}

// Подпись внутри полосы доли видна, только если сегмент шире 8 %
const MIN_LABEL_SHARE = 0.08;

// Первичные и повторные клиенты: доля заездов и сравнение показателей
export function ClientSegments({ data, approx, onOpen }: ClientSegmentsProps) {
  const { t } = useTranslation();
  const share = data.primaryShare;

  const rows: { id: string; render: (s: SegmentStats) => string }[] = [
    { id: "avgCheck", render: (s) => formatMoney(s.avgCheck) },
    {
      id: "avgNormHours",
      render: (s) => formatDecimal(s.avgNormHours),
    },
    { id: "turnover", render: (s) => formatMoney(s.turnover) },
    { id: "discount", render: (s) => formatPct(s.discountPct) },
  ];

  return (
    <div className={styles.segments}>
      <div className={styles.segmentHeads}>
        <div className={styles.segmentHead}>
          <span className={`${styles.swatch} ${styles.swatchPrimary}`} />
          <span className={styles.segmentName}>{t("rso.segment.primary")}</span>
          <span className={styles.segmentCount}>{formatNumber(data.primary.accountCount)}</span>
          <Delta value={data.primaryCountDelta} />
        </div>
        <div className={styles.segmentHead}>
          <span className={`${styles.swatch} ${styles.swatchRepeat}`} />
          <span className={styles.segmentName}>{t("rso.segment.repeat")}</span>
          <span className={styles.segmentCount}>{formatNumber(data.repeat.accountCount)}</span>
          <Delta value={data.repeatCountDelta} />
        </div>
      </div>

      {/* Без заездов доля не определена — полосу не показываем */}
      {share !== null && (
        <div
          className={styles.shareBar}
          role="img"
          aria-label={`${t("rso.segment.share")}: ${formatPct(share * 100)}`}
        >
          <span className={styles.sharePrimary} style={{ flexGrow: share }}>
            {share >= MIN_LABEL_SHARE && formatPct(share * 100)}
          </span>
          <span className={styles.shareRepeat} style={{ flexGrow: 1 - share }}>
            {1 - share >= MIN_LABEL_SHARE && formatPct((1 - share) * 100)}
          </span>
        </div>
      )}

      <table className={styles.segmentTable}>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">{t("rso.segment.primary")}</th>
            <th scope="col">{t("rso.segment.repeat")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{t(`rso.segment.${row.id}`)}</th>
              <td>{row.render(data.primary)}</td>
              <td>{row.render(data.repeat)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {approx && <p className={styles.footnote}>{t("rso.vat.approxHint")}</p>}

      {onOpen && (
        <button type="button" className={styles.moreButton} onClick={onOpen}>
          {t("rso.drill.details")}
        </button>
      )}
    </div>
  );
}
