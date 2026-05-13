import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import DeviceConfig from "./pages/DeviceConfig";
import JobCreate from "./pages/JobCreate";
import HistoricalViewer from "./pages/HistoricalViewer";
import AIAnalysis from "./pages/AIAnalysis";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices" element={<DeviceConfig />} />
          <Route path="/jobs/new" element={<JobCreate />} />
          <Route path="/jobs/:id/edit" element={<JobCreate />} />
          <Route path="/jobs/:id/view" element={<HistoricalViewer />} />
          <Route path="/jobs/:id/analysis" element={<AIAnalysis />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
