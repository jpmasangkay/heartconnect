import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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

  const gateKey = isLoading
    ? 'loading'
    : !isAuthenticated
      ? 'login'
      : requiredRole && user?.role !== requiredRole
        ? 'role'
        : 'ok';

  return (
    <FadePresence activeKey={gateKey}>
      {isLoading ? (
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
      ) : !isAuthenticated ? (
        <Navigate to="/login" state={{ from: location }} replace />
      ) : requiredRole && user?.role !== requiredRole ? (
        <Navigate to="/dashboard" replace />
      ) : (
        <>{children}</>
      )}
    </FadePresence>
  );
}
