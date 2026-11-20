import { useState } from "react";

export interface CollapsedRows<T> {
  // Строки к показу: в свёрнутом виде — первые preview + одна «под шторкой»
  rows: T[];
  collapsed: boolean;
  // Список длиннее превью — есть что раскрывать
  collapsible: boolean;
  total: number;
  toggle: () => void;
}

// Длинная таблица в карточке: сначала первые строки, остальное — по кнопке.
// Одна лишняя строка не прячется: кнопка ради одной строки только мешает
export function useCollapsedRows<T>(
  rows: readonly T[],
  preview: number | undefined,
): CollapsedRows<T> {
  const [expanded, setExpanded] = useState(false);
  const collapsible = preview !== undefined && rows.length > preview + 1;
  const collapsed = collapsible && !expanded;
  return {
    rows: collapsed ? rows.slice(0, preview + 1) : [...rows],
    collapsed,
    collapsible,
    total: rows.length,
    toggle: () => setExpanded((value) => !value),
  };
}
