import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CalibrationForm from './components/CalibrationForm';
import FailureIndex from './components/FailureIndex';
import FixtureDetail from './components/FixtureDetail';
import StationDetail from './components/StationDetail';
import TesterDetail from './components/TesterDetail';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<CalibrationForm />} />
            <Route path="/calibration" element={<CalibrationForm />} />
            <Route path="/failure" element={<FailureIndex />} />
            <Route path="/fixture/:id" element={<FixtureDetail />} />
            <Route path="/station/:id" element={<StationDetail />} />
            <Route path="/tester/:id" element={<TesterDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
