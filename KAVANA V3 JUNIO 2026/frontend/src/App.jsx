import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import { Login } from './pages/Login.jsx';
import { OperatorDashboard } from './pages/operator/OperatorDashboard.jsx';
import { SupervisorDashboard } from './pages/supervisor/SupervisorDashboard.jsx';
import { ManagerDashboard } from './pages/manager/ManagerDashboard.jsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/operator"
        element={
          <RequireAuth>
            <AppLayout role="operator" />
          </RequireAuth>
        }
      >
        <Route index element={<OperatorDashboard />} />
      </Route>
      <Route
        path="/supervisor"
        element={
          <RequireAuth>
            <AppLayout role="supervisor" />
          </RequireAuth>
        }
      >
        <Route index element={<SupervisorDashboard />} />
      </Route>
      <Route
        path="/manager"
        element={
          <RequireAuth>
            <AppLayout role="manager" />
          </RequireAuth>
        }
      >
        <Route index element={<ManagerDashboard />} />
      </Route>
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AppLayout role="admin" />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
      </Route>
      <Route path="/" element={<Navigate to="/operator" replace />} />
      <Route path="*" element={<Navigate to="/operator" replace />} />
    </Routes>
  );
}
