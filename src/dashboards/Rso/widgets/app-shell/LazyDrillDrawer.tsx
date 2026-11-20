import { lazy, Suspense } from "react";

// Панель детализации — отдельным чанком, грузится при первом открытии
const DrillDrawer = lazy(() =>
  import("@Rso/features/drill/ui/DrillDrawer").then((m) => ({ default: m.DrillDrawer })),
);

export function LazyDrillDrawer() {
  return (
    <Suspense fallback={null}>
      <DrillDrawer />
    </Suspense>
  );
}
