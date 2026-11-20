// Период и режим НДС — структурно, без импорта из entities (shared — нижний слой)
interface CsvPeriod {
  type: string;
  key: number;
}

// Имя файла выгрузки: rso_<экран>_<блок>_<M|Q|Y><ключ>[_netto|_brutto].csv
export function csvName(
  screen: "sales" | "staff",
  block: string,
  period: CsvPeriod,
  vat?: string,
): string {
  const suffix = vat ? `_${vat.toLowerCase()}` : "";
  return `rso_${screen}_${block}_${period.type}${period.key}${suffix}.csv`;
}

// Заголовок денежной колонки в CSV с режимом НДС: «Оборот, без НДС» (ТЗ §21)
export function moneyHeader(label: string, vatLabel: string): string {
  return `${label}, ${vatLabel.toLowerCase()}`;
}

// Заголовки CSV из колонок таблицы: у денежных колонок — режим НДС
export function csvHeaders(
  columns: readonly { key: string; label: string }[],
  moneyKeys: readonly string[],
  vatLabel: string,
): string[] {
  return columns.map((column) =>
    moneyKeys.includes(column.key) ? moneyHeader(column.label, vatLabel) : column.label,
  );
}
