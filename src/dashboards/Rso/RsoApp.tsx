import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { RsoLayout } from "@Rso/widgets/app-shell/RsoLayout";
import { RequireRsoAccess } from "@Rso/app/providers/RequireRsoAccess";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";

// Вкладки — отдельными чанками
const OverviewPage = lazy(() =>
  import("@Rso/pages/overview/OverviewPage").then((m) => ({ default: m.OverviewPage })),
);
const SalesPage = lazy(() =>
  import("@Rso/pages/sales/SalesPage").then((m) => ({ default: m.SalesPage })),
);
const StaffPage = lazy(() =>
  import("@Rso/pages/staff/StaffPage").then((m) => ({ default: m.StaffPage })),
);

const pageFallback = <BlockState kind="loading" />;

// Маршруты дашборда: /rso, /rso/sales, /rso/staff
function RsoApp() {
  return (
    <Routes>
      <Route
        element={
          <RequireRsoAccess>
            <RsoLayout />
          </RequireRsoAccess>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={pageFallback}>
              <OverviewPage />
            </Suspense>
          }
        />
        <Route
          path="sales"
          element={
            <Suspense fallback={pageFallback}>
              <SalesPage />
            </Suspense>
          }
        />
        <Route
          path="staff"
          element={
            <Suspense fallback={pageFallback}>
              <StaffPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

export default RsoApp;
