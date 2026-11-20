import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route } from "react-router-dom";
import { RequireAccidentsAccess } from "@Accidents/app/providers/RequireAccidentsAccess";
import { AccidentDrilldownModal } from "@Accidents/widgets/accident-drilldown/AccidentDrilldownModal";
import { PdfGeneratingOverlay } from "@Accidents/features/pdf-report/ui/PdfGeneratingOverlay";
import { Skeleton } from "@Accidents/shared/ui/Skeleton/Skeleton";

// Экраны с графиками — отдельными чанками
const OverviewPage = lazy(() =>
  import("@Accidents/pages/overview/OverviewPage").then((m) => ({ default: m.OverviewPage })),
);
const MotorcadePage = lazy(() =>
  import("@Accidents/pages/motorcade/MotorcadePage").then((m) => ({ default: m.MotorcadePage })),
);
const AnalyticsPage = lazy(() =>
  import("@Accidents/pages/analytics/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })),
);

function Protected({ children }: { children: ReactNode }) {
  return (
    <RequireAccidentsAccess>
      <Suspense fallback={<Skeleton height={320} />}>{children}</Suspense>
    </RequireAccidentsAccess>
  );
}
function AccidentsApp() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <Protected>
              <OverviewPage />
            </Protected>
          }
        />
        <Route
          path="motorcade"
          element={
            <Protected>
              <MotorcadePage />
            </Protected>
          }
        />
        <Route
          path="analytics"
          element={
            <Protected>
              <AnalyticsPage />
            </Protected>
          }
        />
      </Routes>
      <AccidentDrilldownModal />
      <PdfGeneratingOverlay />
    </>
  );
}

export default AccidentsApp;
