import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import StationDetail from "./pages/StationDetail";
import TesterDetail from "./pages/TesterDetail";
import FixtureDetail from "./pages/FixtureDetail";


export default function App() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/station-detail" element={<StationDetail />} />
                <Route path="/tester-detail" element={<TesterDetail />} />
                <Route path="/fixture-detail" element={<FixtureDetail />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}