import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import useAuthStore from './store/useAuthStore';
import useThemeStore from './store/useThemeStore';
import DashboardLayout from './components/layout/DashboardLayout';

const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Projects = lazy(() => import('./pages/projects/Projects'));
const Finance = lazy(() => import('./pages/finance/Finance'));
const Wallets = lazy(() => import('./pages/wallets/Wallets'));
const Withdrawals = lazy(() => import('./pages/withdrawals/Withdrawals'));
const Expenses = lazy(() => import('./pages/expenses/Expenses'));
const Leads = lazy(() => import('./pages/crm/Leads'));
const AuditLog = lazy(() => import('./pages/audit/AuditLog'));
const Proposals = lazy(() => import('./pages/proposals/Proposals'));
const Subscriptions = lazy(() => import('./pages/subscriptions/Subscriptions'));
const DocumentCenter = lazy(() => import('./pages/documents/DocumentCenter'));
const KnowledgeBase = lazy(() => import('./pages/knowledge/KnowledgeBase'));
const OperationsHub = lazy(() => import('./pages/operations/OperationsHub'));
const InternalChat = lazy(() => import('./pages/chat/InternalChat'));
const AiChatPage = lazy(() => import('./pages/chat/AiChatPage'));
const Notifications = lazy(() => import('./pages/notifications/Notifications'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage'));
const AutomationBuilder = lazy(() => import('./pages/automations/AutomationBuilder'));
const AnalyticsDashboard = lazy(() => import('./pages/dashboard/AnalyticsDashboard'));
const ActiveWork = lazy(() => import('./pages/devtracker/ActiveWork'));
const MyTasks = lazy(() => import('./pages/tasks/MyTasks'));
const GrowthLayout = lazy(() => import('./pages/growth/GrowthLayout'));
const GrowthOverview = lazy(() => import('./pages/growth/GrowthOverview'));
const GrowthSettings = lazy(() => import('./pages/growth/GrowthSettings'));
const GrowthTasks = lazy(() => import('./pages/growth/GrowthTasks'));
const GrowthSchedule = lazy(() => import('./pages/growth/GrowthSchedule'));
const GrowthGaming = lazy(() => import('./pages/growth/GrowthGaming'));
const GrowthXP = lazy(() => import('./pages/growth/GrowthXP'));
const GrowthTeams = lazy(() => import('./pages/growth/GrowthTeams'));
const ProjectDetails = lazy(() => import('./pages/projects/ProjectDetails'));
const SprintDetails = lazy(() => import('./pages/projects/SprintDetails'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '0.75rem', color: 'var(--text-tertiary)' }}>
    <div className="spinner" /> Loading...
  </div>
);

function ProtectedRoute({ children, role }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '0.75rem', color: 'var(--text-tertiary)' }}>
        <div className="spinner" />
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Basic role guard if role prop is passed
  if (role && user?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    checkAuth();
  }, [initTheme, checkAuth]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
            <Route path="/active-work" element={<ActiveWork />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/growth" element={<GrowthLayout />}>
              <Route index element={<GrowthOverview />} />
              <Route path="tasks" element={<GrowthTasks />} />
              <Route path="schedule" element={<GrowthSchedule />} />
              <Route path="gaming" element={<GrowthGaming />} />
              <Route path="xp" element={<GrowthXP />} />
              <Route path="teams" element={<GrowthTeams />} />
              <Route path="settings" element={<GrowthSettings />} />
            </Route>
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
