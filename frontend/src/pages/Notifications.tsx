import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Footer from '../components/Footer';
import { useNotifications } from '../context/NotificationContext';

export default function Notifications() {
  const { notifications, loading, refreshNotifications, markRead, markAllRead, deleteAllRead } =
    useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const filtered =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-3xl mx-auto w-full px-6 flex-1">
        <div className="pt-10 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Notifications</h1>
            <p className="text-sm text-stone-muted mt-1">Stay updated on your activity</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => markAllRead()}
              disabled={notifications.every((n) => n.read)}
              className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
            {notifications.some((n) => n.read) && (
              <button
                onClick={() => deleteAllRead()}
                className="text-xs text-stone-muted hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={14} /> Delete read
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                filter === f
                  ? 'bg-navy text-white'
                  : 'bg-white border border-stone-border text-stone-muted hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'All' : 'Unread'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-stone-border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-cream-dark rounded w-3/4 mb-2" />
                <div className="h-3 bg-cream-dark rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Bell size={32} className="text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-muted">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <div
                key={n._id}
                className={`bg-white border rounded-lg p-4 transition-colors ${
                  n.read ? 'border-stone-border' : 'border-navy/30 bg-blue-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => !n.read && markRead(n._id)}
                        className="text-sm font-semibold text-foreground hover:text-navy transition-colors"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    )}
                    <p className="text-xs text-stone-muted mt-1">{n.message}</p>
                    <p className="text-[10px] text-stone-muted mt-2">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n._id)}
                      className="text-stone-muted hover:text-navy transition-colors shrink-0"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-16" />
      </main>
      <Footer />
    </div>
  );
}
