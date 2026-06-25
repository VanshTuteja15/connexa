import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ConnectDatabase from './pages/ConnectDatabase';
import SchemaPage from './pages/Schema';
import AIQueryPage from './pages/AIQuery';
import QueryHistoryPage from './pages/QueryHistory';
import SettingsPage from './pages/Settings';
import LoadingSpinner from './components/LoadingSpinner';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner className="min-h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner className="min-h-screen" />;
  if (isAuthenticated) return <Navigate to="/ai-query" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/connect-database" element={<ProtectedRoute><ConnectDatabase /></ProtectedRoute>} />
      <Route path="/schema" element={<ProtectedRoute><SchemaPage /></ProtectedRoute>} />
      <Route path="/ai-query" element={<ProtectedRoute><AIQueryPage /></ProtectedRoute>} />
      <Route path="/query-history" element={<ProtectedRoute><QueryHistoryPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/home" element={<Navigate to="/ai-query" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
