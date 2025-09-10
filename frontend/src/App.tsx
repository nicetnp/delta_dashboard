import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import StationDetail from "./pages/StationDetail";
import TesterDetail from "./pages/TesterDetail";
import FixtureDetail from "./pages/FixtureDetail";
import Calibration from "./pages/Calibration";

export default function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/station-detail" element={<StationDetail />} />
                <Route path="/tester-detail" element={<TesterDetail />} />
                <Route path="/fixture-detail" element={<FixtureDetail />} />
                <Route path="/calibration" element={<Calibration />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
}