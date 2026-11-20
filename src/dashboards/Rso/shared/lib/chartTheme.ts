// Оформление графиков Recharts. Цвета — CSS-переменные темы дашборда:
// var() работает в атрибутах SVG, тема переключается без перерисовки (как в ДТП)

export const CHART_COLOR = {
  primary: "var(--rso-accent)",
  secondary: "var(--rso-accent-2)",
  positive: "var(--rso-pos)",
  negative: "var(--rso-neg)",
  neutral: "var(--rso-neutral)",
  card: "var(--rso-card)",
} as const;

// Цвета рядов по рангу: отделы, виды услуг. Дальше пятого — «прочие» нейтральным
export const SERIES_COLORS = [
  "var(--rso-accent)",
  "var(--rso-accent-2)",
  "var(--rso-chart-3)",
  "var(--rso-chart-4)",
  "var(--rso-chart-5)",
] as const;

const AXIS_TICK = { fill: "var(--rso-text-muted)", fontSize: 11.5 };

export const GRID_PROPS = { stroke: "var(--rso-border)", vertical: false } as const;

export const X_AXIS_PROPS = {
  stroke: "var(--rso-border)",
  tickLine: false,
  tick: AXIS_TICK,
  tickMargin: 8,
} as const;

export const Y_AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
  tick: AXIS_TICK,
  tickMargin: 8,
  width: 64,
} as const;

export const LINE_CURSOR = { stroke: "var(--rso-neutral)", strokeWidth: 1 } as const;

// Анимация серий — как в дашборде ДТП
export const CHART_ANIMATION = { animationDuration: 1100, animationEasing: "ease-out" } as const;
