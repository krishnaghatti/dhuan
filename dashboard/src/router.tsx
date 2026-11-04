import { Route, Routes } from "react-router-dom";
import { CityPage } from "./pages/CityPage";
import { HomePage } from "./pages/HomePage";
import { StatePage } from "./pages/StatePage";
import { StationPage } from "./pages/StationPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/state/:stateSlug" element={<StatePage />} />
      <Route path="/state/:stateSlug/:citySlug" element={<CityPage />} />
      <Route path="/state/:stateSlug/:citySlug/:stationSlug" element={<StationPage />} />
    </Routes>
  );
}
