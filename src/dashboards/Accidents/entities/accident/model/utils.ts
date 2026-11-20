import type { IFirmInfo } from "@/APP/store/types/IFirmInfo";
import { REJECT_REASON_LABELS, type RejectReason } from "../lib/parseRow";

export function firmDbIndex(firm: IFirmInfo, index: number): number {
  return typeof firm.DBIndex === "number" && Number.isInteger(firm.DBIndex) ? firm.DBIndex : index;
}

export function describeRejects(reasons: Partial<Record<RejectReason, number>>): string {
  return Object.entries(reasons)
    .map(([reason, count]) => `${REJECT_REASON_LABELS[reason as RejectReason]} — ${count}`)
    .join(", ");
}
