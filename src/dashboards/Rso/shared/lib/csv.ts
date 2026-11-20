// CSV: разделитель «;», UTF-8 с BOM — под русский Excel (как в дашборде ДТП)

// Защита от CSV-инъекции: ячейки, похожие на формулу, превращаются в текст
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCell(raw: string): string {
  const isPlainNumber = /^-?\d+([.,]\d+)?$/.test(raw);
  const value = !isPlainNumber && FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const text =
    "\uFEFF" + [headers, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8;" }));

  // Ссылка в DOM и отложенный revoke — иначе Firefox не скачивает файл
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 0);
}
