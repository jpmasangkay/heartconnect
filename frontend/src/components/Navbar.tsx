import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MessageSquare, Bell, Bookmark, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUnread } from '../context/UnreadContext';
import { useNotifications } from '../context/NotificationContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useUnread();
  const { unreadCount: notifCount } = useNotifications();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    window.location.replace(`${window.location.origin}/login`);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-navy text-white w-full z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="text-sm font-bold tracking-widest uppercase text-white hover:opacity-80 transition-opacity"
        >
          HEARTCONNECT
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {isAuthenticated ? (
            <>
              {user?.role === 'admin' ? (
                /* ── Admin-only nav ── */
                <Link
                  to="/admin"
                  className={`text-sm text-white transition-colors ${
                    isActive('/admin') ? 'underline underline-offset-4' : 'hover:opacity-80'
                  }`}
                >
                  Admin Dashboard
                </Link>
              ) : (
                /* ── Student / Client nav ── */
                <>
                  {user?.role === 'student' && (
                    <Link
                      to="/jobs"
                      className={`text-sm text-white transition-colors ${
                        isActive('/jobs') ? 'underline underline-offset-4' : 'hover:opacity-80'
                      }`}
                    >
                      Find Work
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    className={`text-sm text-white transition-colors ${
                      isActive('/dashboard') ? 'underline underline-offset-4' : 'hover:opacity-80'
                    }`}
                  >
                    {user?.role === 'client' ? 'My Jobs' : 'My Applications'}
                  </Link>

                  {/* Saved Jobs (students only) */}
                  {user?.role === 'student' && (
                    <Link
                      to="/saved-jobs"
                      className="relative text-white hover:opacity-80 transition-opacity"
                      title="Saved Jobs"
                    >
                      <Bookmark size={18} />
                    </Link>
                  )}

                  {/* Messages icon with red dot badge */}
                  <Link
                    to="/chat"
                    className="relative text-white hover:opacity-80 transition-opacity"
                  >
                    <MessageSquare size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>

                  {/* Notifications bell */}
                  <Link
                    to="/notifications"
                    className="relative text-white hover:opacity-80 transition-opacity"
                    title="Notifications"
                  >
                    <Bell size={18} />
                    {notifCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {notifCount > 9 ? '9+' : notifCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {/* Profile + logout */}
              <div className="flex items-center gap-3 ml-2 pl-4 border-l border-white/20">
                <Link
                  to="/profile"
                  className="text-sm text-white hover:opacity-80 transition-opacity"
                >
                  {user?.name?.split(' ')[0]}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-white/15 hover:bg-white/25 px-3 py-1 rounded border border-white/30 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/jobs"
                className="text-sm text-white hover:opacity-80 transition-opacity"
              >
                Browse Jobs
              </Link>
              <Link
                to="/login"
                className="text-sm text-white hover:opacity-80 transition-opacity"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm bg-white/15 hover:bg-white/25 border border-white/30 px-4 py-1.5 rounded transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden opacity-70 hover:opacity-100 transition-opacity"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-navy-light border-t border-white/10 px-6 py-4 flex flex-col gap-4">
          {isAuthenticated ? (
            <>
              {user?.role === 'admin' ? (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm opacity-80 hover:opacity-100 flex items-center gap-2"
                >
                  <Shield size={14} />
                  Admin Dashboard
                </Link>
              ) : (
                <>
                  {user?.role === 'student' && (
                    <Link
                      to="/jobs"
                      onClick={() => setMobileOpen(false)}
                      className="text-sm opacity-80 hover:opacity-100"
                    >
                      Find Work
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm opacity-80 hover:opacity-100"
                  >
                    {user?.role === 'client' ? 'My Jobs' : 'My Applications'}
                  </Link>
                  {user?.role === 'student' && (
                    <Link
                      to="/saved-jobs"
                      onClick={() => setMobileOpen(false)}
                      className="text-sm opacity-80 hover:opacity-100 flex items-center gap-2"
                    >
                      <Bookmark size={14} />
                      Saved Jobs
                    </Link>
                  )}
                  <Link
                    to="/chat"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm opacity-80 hover:opacity-100 flex items-center gap-2"
                  >
                    <MessageSquare size={14} />
                    Messages
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/notifications"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm opacity-80 hover:opacity-100 flex items-center gap-2"
                  >
                    <Bell size={14} />
                    Notifications
                    {notifCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {notifCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="text-sm opacity-80 hover:opacity-100"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-left opacity-80 hover:opacity-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/jobs"
                onClick={() => setMobileOpen(false)}
                className="text-sm opacity-80 hover:opacity-100"
              >
                Browse Jobs
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="text-sm opacity-80 hover:opacity-100"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="text-sm border border-white/30 bg-white/15 px-4 py-2 rounded text-center"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
