import i18n from "@/APP/i18n";
import type { Period } from "../api/contract";
import { periodPart, periodYear } from "./periodKey";

export * from "./periodKey";

const QUARTER_ROMAN = ["I", "II", "III", "IV"];

function monthName(month: number, short = false): string {
  return i18n.t(`${short ? "short." : ""}month_${month - 1}`);
}

// «Март 2026», «II кв. 2026», «2026»
export function formatPeriodLabel(period: Period): string {
  const year = periodYear(period);
  const part = periodPart(period);
  if (period.type === "M") return `${monthName(part)} ${year}`;
  if (period.type === "Q") {
    return i18n.t("rso.period.quarterLabel", { quarter: QUARTER_ROMAN[part - 1] ?? part, year });
  }
  return String(year);
}

// Подписи осей: «мар 26», «II кв. 26», «2026»
export function formatPeriodShortLabel(period: Period): string {
  const year = periodYear(period);
  const part = periodPart(period);
  const yy = String(year).slice(-2);
  if (period.type === "M") return `${monthName(part, true)} ${yy}`;
  if (period.type === "Q") {
    return i18n.t("rso.period.quarterLabel", {
      quarter: QUARTER_ROMAN[part - 1] ?? part,
      year: yy,
    });
  }
  return String(year);
}
