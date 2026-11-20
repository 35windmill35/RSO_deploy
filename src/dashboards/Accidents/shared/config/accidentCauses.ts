import i18n from "@/APP/i18n";

// Виновник ДТП — по ACCIDENT_CAUSER_NAME
export type CauserKind = "DRIVER_EMPLOYEE" | "OTHER_PARTY" | "MUTUAL_CULPRIT" | "UNKNOWN";

export function normalizeName(name: string | null | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

const CAUSER_KINDS = new Map<string, CauserKind>([
  [normalizeName(i18n.t("roadAccidents.causer.ownDriver")), "DRIVER_EMPLOYEE"],
  [normalizeName(i18n.t("roadAccidents.causer.otherParty")), "OTHER_PARTY"],
  [normalizeName(i18n.t("roadAccidents.causer.mutual")), "MUTUAL_CULPRIT"],
]);

export function getCauserKind(name: string | null | undefined): CauserKind {
  const key = normalizeName(name);
  const data = CAUSER_KINDS.get(key);
  return data ?? "UNKNOWN";
}

// «неизвестен» → «Неизвестен»
export function displayName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// Ключ сводного среза «Прочие»
export const OTHER_SLICE_KEY = "__other";
