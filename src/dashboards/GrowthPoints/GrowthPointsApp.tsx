import { Routes, Route } from "react-router-dom";
import { OverviewPage } from "@GrowthPoints/pages/overview/OverviewPage";
import { EfficiencyPage } from "@GrowthPoints/pages/efficiency/EfficiencyPage";
import { MastersPage } from "@GrowthPoints/pages/masters/MastersPage";
import { MechanicsPage } from "@GrowthPoints/pages/mechanics/MechanicsPage";
import { BrandsPage } from "@GrowthPoints/pages/brands/BrandsPage";
import { ProtectedLayout } from "./app/layouts/ProtectedLayout";

function GrowthPointsApp() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <OverviewPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="efficiency"
        element={
          <ProtectedLayout>
            <EfficiencyPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="masters"
        element={
          <ProtectedLayout>
            <MastersPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="mechanics"
        element={
          <ProtectedLayout>
            <MechanicsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="brands"
        element={
          <ProtectedLayout>
            <BrandsPage />
          </ProtectedLayout>
        }
      />
    </Routes>
  );
}

export default GrowthPointsApp;
