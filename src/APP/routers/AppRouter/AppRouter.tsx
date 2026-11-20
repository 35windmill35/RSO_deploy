import { PATH_GROWTH_POINTS, PATH_ROAD_ACCIDENTS, PATH_RSO } from "../utils/routePath";
import { Route, Routes } from "react-router-dom";
import { auth } from "@/APP/routers/utils/auth";
import NotFoundPage from "@/PAGES/404/NotFound";
import LoginPage from "@/PAGES/LoginPage";
import HomePage from "@/PAGES/HomePage";
import GrowthPoints from "@/PAGES/dashboards/GrowthPoints";
import RoadAccidents from "@/PAGES/dashboards/RoadAccidents";
import Rso from "@/PAGES/dashboards/Rso";

const AppRouter = () => {
  return (
    <Routes>
      <Route path={"/login"} element={<LoginPage />} />
      <Route path={"/"} element={auth(<HomePage />)} />
      <Route path={`/${PATH_GROWTH_POINTS}/*`} element={auth(<GrowthPoints />)} />
      <Route path={`/${PATH_ROAD_ACCIDENTS}/*`} element={auth(<RoadAccidents />)} />
      <Route path={`/${PATH_RSO}/*`} element={auth(<Rso />)} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
