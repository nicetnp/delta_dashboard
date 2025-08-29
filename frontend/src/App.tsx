import { BrowserRouter, Routes, Route } from "react-router-dom";
import FailuresSummary from "./pages/FailuresSummary";
import FixtureDetail from "./pages/FixtureDetail";
import TesterDetail from "./pages/TesterDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FailuresSummary />} />
        {<Route path="/fixture-detail" element={<FixtureDetail />} />}
        {<Route path="/tester-detail" element={<TesterDetail />} />}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
