import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LandingPage from './pages/LandingPage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PlotDetails from './pages/PlotDetails.jsx';
import AISuggestions from './pages/AISuggestions.jsx';
import CostEstimation from './pages/CostEstimation.jsx';
import MaterialEstimation from './pages/MaterialEstimation.jsx';
import FloorPlan from './pages/FloorPlan.jsx';
import Chatbot from './pages/Chatbot.jsx';
import PDFReport from './pages/PDFReport.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Authenticated */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/project/:id/plot-details" element={<ProtectedRoute><PlotDetails /></ProtectedRoute>} />
      <Route path="/project/:id/ai-suggestions" element={<ProtectedRoute><AISuggestions /></ProtectedRoute>} />
      <Route path="/project/:id/cost-estimation" element={<ProtectedRoute><CostEstimation /></ProtectedRoute>} />
      <Route path="/project/:id/materials" element={<ProtectedRoute><MaterialEstimation /></ProtectedRoute>} />
      <Route path="/project/:id/floor-plan" element={<ProtectedRoute><FloorPlan /></ProtectedRoute>} />
      <Route path="/project/:id/report" element={<ProtectedRoute><PDFReport /></ProtectedRoute>} />
      <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
