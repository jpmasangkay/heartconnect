import { useRef, useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { UnreadProvider } from './context/UnreadContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import PageTransition from './components/PageTransition';
import OnboardingTour from './components/OnboardingTour';
import Navbar from './components/Navbar';

// Eagerly loaded (small / critical path)
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy-loaded (heavy pages)
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const JobBoard = lazy(() => import('./pages/JobBoard'));
const JobDetail = lazy(() => import('./pages/JobDetail'));
const PostJob = lazy(() => import('./pages/PostJob'));
const EditJob = lazy(() => import('./pages/EditJob'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Chat = lazy(() => import('./pages/Chat'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SavedJobs = lazy(() => import('./pages/SavedJobs'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

// TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function getBaseRoute(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] || '';
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const showTour = isAuthenticated && !!user && !user.hasCompletedOnboarding && !dismissed;

  return (
    <>
      {showTour && <OnboardingTour onComplete={() => setDismissed(true)} />}
      {children}
    </>
  );
}

function SuspenseFallback() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="animate-pulse text-sm text-stone-muted">Loading…</div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const prevBase = useRef(getBaseRoute(location.pathname));

  const currentBase = getBaseRoute(location.pathname);
  const transitionKey = currentBase || 'root';

  useEffect(() => {
    if (currentBase !== prevBase.current) {
      prevBase.current = currentBase;
      window.scrollTo({ top: 0 });
    }
  });

  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <PageTransition key={transitionKey}>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes location={location}>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute requiredRole="student">
                  <JobBoard />
                </ProtectedRoute>
              }
            />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/users/:id" element={<UserProfile />} />

            {/* Protected routes */}
            <Route
              path="/jobs/post"
              element={
                <ProtectedRoute requiredRole="client">
                  <PostJob />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:id/edit"
              element={
                <ProtectedRoute requiredRole="client">
                  <EditJob />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:conversationId"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/saved-jobs"
              element={
                <ProtectedRoute>
                  <SavedJobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </PageTransition>
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <UnreadProvider>
                <NotificationProvider>
                  <OnboardingGate>
                    <AnimatedRoutes />
                  </OnboardingGate>
                </NotificationProvider>
              </UnreadProvider>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
