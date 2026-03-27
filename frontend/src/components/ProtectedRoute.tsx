import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FadePresence } from './ui/loading-fade';
import { Skeleton } from './ui/skeleton';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const didRedirect = useRef(false);

  // Redirect unauthenticated users — fires only once via ref guard,
  // avoiding the replaceState() spam that <Navigate> causes when
  // AnimatePresence keeps this component mounted during exit animation.
  useEffect(() => {
    if (isLoading || didRedirect.current) return;

    if (!isAuthenticated) {
      didRedirect.current = true;
      navigate('/login', { state: { from: location.pathname }, replace: true });
    } else if (requiredRole && user?.role !== requiredRole) {
      didRedirect.current = true;
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, isAuthenticated, user?.role, requiredRole, navigate, location.pathname]);

  if (isLoading) {
    return (
      <FadePresence activeKey="loading">
        <div className="min-h-screen bg-cream flex items-center justify-center px-6">
          <div className="w-full max-w-sm space-y-4" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-9 w-40 rounded-lg mx-auto" />
            <Skeleton className="h-36 w-full rounded-lg" />
            <div className="flex gap-3 justify-center">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        </div>
      </FadePresence>
    );
  }

  // While the useEffect redirect is pending, show nothing (prevents flash)
  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
}
