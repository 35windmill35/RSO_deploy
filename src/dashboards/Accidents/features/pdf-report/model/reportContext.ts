import { accidentsStore } from "@Accidents/entities/accident/model/accidentsStore";
import type { PeriodComparison } from "@Accidents/entities/accident/lib/period";
import { partialPeriodNote } from "@Accidents/entities/accident/lib/period";
import type { ReportDataContext } from "../lib/pdfChrome";

// Актуальность и полнота данных для шапки PDF
export function getReportDataContext(comparison: PeriodComparison | null): ReportDataContext {
  const staleNames = new Set(accidentsStore.staleFirms.map((firm) => firm.name));
  const unavailable = Array.from(
    new Set([...accidentsStore.rightsCheckErrors, ...accidentsStore.failedFirms]),
  ).filter((name) => !staleNames.has(name));

  return {
    loadedAt: accidentsStore.loadedAt,
    unavailableFirms: unavailable,
    staleFirms: accidentsStore.staleFirms,
    partialNote: comparison ? partialPeriodNote(comparison) : null,
  };
}
