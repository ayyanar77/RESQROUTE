import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmergencyRequest from './pages/EmergencyRequest';
import AmbulanceDashboard from './pages/AmbulanceDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import TrafficDashboard from './pages/TrafficDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import UsersPage from './pages/UsersPage';
import MapPage from './pages/MapPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="emergency" element={<EmergencyRequest />} />
        <Route path="ambulance" element={<AmbulanceDashboard />} />
        <Route path="hospital" element={<HospitalDashboard />} />
        <Route path="traffic" element={<TrafficDashboard />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="map" element={<MapPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
