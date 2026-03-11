import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/useAuthStore';
import useThemeStore from './store/useThemeStore';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Projects from './pages/projects/Projects';
import ProjectDetails from './pages/projects/ProjectDetails';
import Finance from './pages/finance/Finance';
import Wallets from './pages/wallets/Wallets';
import Withdrawals from './pages/withdrawals/Withdrawals';
import Expenses from './pages/expenses/Expenses';
import Leads from './pages/crm/Leads';
import AuditLog from './pages/audit/AuditLog';
import Proposals from './pages/proposals/Proposals';
import Subscriptions from './pages/subscriptions/Subscriptions';
import DocumentCenter from './pages/documents/DocumentCenter';
import KnowledgeBase from './pages/knowledge/KnowledgeBase';
import OperationsHub from './pages/operations/OperationsHub';
import InternalChat from './pages/chat/InternalChat';
import AiChatPage from './pages/chat/AiChatPage';
import Notifications from './pages/notifications/Notifications';
import Profile from './pages/profile/Profile';
import CalendarPage from './pages/calendar/CalendarPage';
import AutomationBuilder from './pages/automations/AutomationBuilder';
import AnalyticsDashboard from './pages/dashboard/AnalyticsDashboard';
import SprintDetails from './pages/projects/SprintDetails';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '0.75rem', color: 'var(--text-tertiary)' }}>
        <div className="spinner" />
        Loading...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/projects/:id/sprints/:sprintId" element={<SprintDetails />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/withdrawals" element={<Withdrawals />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/documents" element={<DocumentCenter />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/operations" element={<OperationsHub />} />
          <Route path="/chat" element={<InternalChat />} />
          <Route path="/ai-chat" element={<AiChatPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/automations" element={<AutomationBuilder />} />
          <Route path="/profile/:id" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
