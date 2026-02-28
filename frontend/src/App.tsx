import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import OverviewPage from "./pages/OverviewPage";
import DailyTrendsPage from "./pages/DailyTrendsPage";
import HeatmapPage from "./pages/HeatmapPage";
import ModelAnalysisPage from "./pages/ModelAnalysisPage";
import ProjectsPage from "./pages/ProjectsPage";
import InsightsPage from "./pages/InsightsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/daily" element={<DailyTrendsPage />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/models" element={<ModelAnalysisPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
      </Route>
    </Routes>
  );
}
