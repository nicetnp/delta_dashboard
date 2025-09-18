import { Routes, Route, Navigate } from "react-router-dom";
import { routes } from "./config/routes";
import RouteHandler from "./components/RouteHandler";

export default function App() {
    return (
        <Routes>
            {routes.map((route) => (
                <Route
                    key={route.path}
                    path={route.path}
                    element={<RouteHandler />}
                />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}