export function downloadText(text: string, filename = "document.txt"): void {
  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  // Освобождаем URL после запуска скачивания.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
