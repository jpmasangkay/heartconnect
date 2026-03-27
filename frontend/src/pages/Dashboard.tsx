import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, CheckCircle2, ArrowRight, MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '../components/ui/forms';
import { FadePresence } from '../components/ui/loading-fade';
import { Skeleton } from '../components/ui/skeleton';
import { jobsApi, applicationsApi } from '../api';
import { waitMinSkeletonMs } from '../lib/minSkeletonDelay';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import type { Job, Application } from '../types';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Student dashboard ─────────────────────────────────────────────────────────
function StudentDashboard({ user }: { user: any }) {
  const { socket } = useSocket();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;
    setApplications([]);
    setLoading(true);
    const t0 = Date.now();

    (async () => {
      try {
        const r = await applicationsApi.getMyApplications({ signal });
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = r.data as any;
        const apps = Array.isArray(body) ? body : body.data ?? [];
        setApplications(apps.filter((a: Application) => a.job != null));
      } catch {
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        setApplications([]);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [user?._id]);

  useEffect(() => {
    if (!socket) return;
    const handleAppUpdate = (data: { _id: string; status: string }) => {
      setApplications((prev) => {
        const i = prev.findIndex((a) => a._id === data._id);
        if (i === -1) return prev;
        const next = prev.slice();
        next[i] = { ...prev[i], status: data.status as Application['status'] };
        return next;
      });
    };
    socket.on('application:updated', handleAppUpdate);
    return () => { socket.off('application:updated', handleAppUpdate); };
  }, [socket]);

  const { sorted, active, pending, finished } = useMemo(() => {
    const activeL = applications.filter((a) => a.status === 'accepted');
    const pendingL = applications.filter((a) => a.status === 'pending');
    const finishedL = applications.filter((a) => a.status === 'finished');
    const restL = applications.filter((a) => !['accepted', 'pending', 'finished'].includes(a.status));
    const sortedL = [...activeL, ...pendingL, ...finishedL, ...restL];
    return {
      sorted: sortedL,
      active: activeL,
      pending: pendingL,
      finished: finishedL,
    };
  }, [applications]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-stone-muted text-sm">{getGreeting()},</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {user.name.split(' ')[0]}
          </h1>
          {user.university && (
            <p className="text-sm text-stone-muted mt-1">{user.university}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="sr-only" aria-hidden />
        </div>
      </div>

      {/* Pills (keep) */}
      {!loading && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-2 bg-sand-light/70 border border-stone-border px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-sand-dark" aria-hidden />
            <span className="text-stone-muted">Active</span>
            <span className="font-semibold text-foreground tabular-nums">{active.length}</span>
          </span>
          <span className="inline-flex items-center gap-2 bg-cream-dark/60 border border-stone-border px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden />
            <span className="text-stone-muted">Pending</span>
            <span className="font-semibold text-foreground tabular-nums">{pending.length}</span>
          </span>
          <span className="inline-flex items-center gap-2 bg-cream-dark/30 border border-stone-border px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-navy/60" aria-hidden />
            <span className="text-stone-muted">Finished</span>
            <span className="font-semibold text-foreground tabular-nums">{finished.length}</span>
          </span>
        </div>
      )}

      {/* Content rail */}
      <div className="max-w-4xl">
        {!loading && applications.length === 0 && (
          <div className="py-10 border-t border-stone-border">
            <h3 className="font-semibold text-foreground text-lg">Find your first gig</h3>
            <p className="text-sm text-stone-muted mt-2 max-w-xl">
              Browse open job postings from clients looking for students with your skills. Apply to anything that catches your eye.
            </p>
          </div>
        )}

        <FadePresence activeKey={loading ? 'loading' : sorted.length > 0 ? 'list' : 'idle'}>
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading applications">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : sorted.length > 0 ? (
            <div>
              <div className="flex items-baseline justify-between pb-3 border-b border-stone-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Applications
                  <span className="text-stone-muted font-normal ml-1.5">({applications.length})</span>
                </h2>
                <Link to="/jobs" className="text-xs text-stone-muted hover:text-foreground font-medium flex items-center gap-1">
                  Find more <ArrowRight size={11} />
                </Link>
              </div>

              <div className="divide-y divide-stone-border/80">
                {sorted.map((app) => {
                  const job = app.job as Job;
                  const isActive = app.status === 'accepted';
                  return (
                    <div key={app._id} className="py-4 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isActive && <span className="w-2 h-2 rounded-full bg-sand-dark" aria-hidden />}
                          <Link
                            to={`/jobs/${job._id}`}
                            className="font-semibold text-sm text-foreground hover:text-accent line-clamp-1"
                          >
                            {job.title}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-stone-muted">
                          <span>{job.category}</span>
                          <span className="text-stone-border">·</span>
                          <span>₱{app.proposedRate.toLocaleString()}</span>
                          <span className="text-stone-border">·</span>
                          <span>{formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {isActive && (
                          <Link to="/chat" className="text-xs text-stone-muted hover:text-navy font-medium flex items-center gap-1">
                            <MessageSquare size={12} /> Chat
                          </Link>
                        )}
                        <Badge variant={app.status}>{app.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <span className="sr-only" aria-hidden />
          )}
        </FadePresence>
      </div>
    </div>
  );
}

// ── Client dashboard ──────────────────────────────────────────────────────────
function ClientDashboard({ user }: { user: any }) {
  const { socket } = useSocket();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;
    const t0 = Date.now();

    (async () => {
      try {
        const r = await jobsApi.getMyJobs({ signal });
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        setJobs(r.data);
      } catch {
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        setJobs([]);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewApp = (data: { job: { _id: string } | string }) => {
      const jobId = typeof data.job === 'string' ? data.job : data.job._id;
      setJobs((prev) => {
        const i = prev.findIndex((j) => j._id === jobId);
        if (i === -1) return prev;
        const next = prev.slice();
        next[i] = { ...prev[i], applicationsCount: (prev[i].applicationsCount ?? 0) + 1 };
        return next;
      });
    };
    const handleJobUpdate = (data: { _id: string; status: string }) => {
      setJobs((prev) => {
        const i = prev.findIndex((j) => j._id === data._id);
        if (i === -1) return prev;
        const next = prev.slice();
        next[i] = { ...prev[i], status: data.status as Job['status'] };
        return next;
      });
    };
    socket.on('application:new', handleNewApp);
    socket.on('job:updated', handleJobUpdate);
    return () => {
      socket.off('application:new', handleNewApp);
      socket.off('job:updated', handleJobUpdate);
    };
  }, [socket]);

  const open      = jobs.filter((j) => j.status === 'open');
  const closed    = jobs.filter((j) => j.status === 'closed');
  const completed = jobs.filter((j) => j.status === 'completed');

  const handleClose = async (jobId: string) => {
    try {
      await jobsApi.close(jobId);
      setJobs((prev) => prev.map((j) => j._id === jobId ? { ...j, status: 'closed' } : j));
    } catch { /* noop */ }
  };

  const handleComplete = async (jobId: string) => {
    try {
      await jobsApi.complete(jobId);
      setJobs((prev) => prev.map((j) => j._id === jobId ? { ...j, status: 'completed' } : j));
    } catch { /* noop */ }
  };

  const totalApps = jobs.reduce((sum, j) => sum + (j.applicationsCount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="max-w-4xl">
        <div>
          <p className="text-stone-muted text-sm">{getGreeting()},</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {user.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-stone-muted mt-2">
            {open.length} open {open.length === 1 ? 'listing' : 'listings'}
            {totalApps > 0 && <> · {totalApps} total {totalApps === 1 ? 'applicant' : 'applicants'}</>}
          </p>
        </div>

        {!loading && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm w-full pb-4 mb-1 border-b border-stone-border mt-5">
            <div className="flex flex-wrap gap-2 items-center min-w-0">
              <span className="inline-flex items-center gap-2 bg-sand-light/70 border border-stone-border px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-sand-dark" aria-hidden />
                <span className="text-stone-muted">Open</span>
                <span className="font-semibold text-foreground tabular-nums">{open.length}</span>
              </span>
              <span className="inline-flex items-center gap-2 bg-cream-dark/50 border border-stone-border px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-navy/60" aria-hidden />
                <span className="text-stone-muted">In progress</span>
                <span className="font-semibold text-foreground tabular-nums">{closed.length}</span>
              </span>
              <span className="inline-flex items-center gap-2 bg-cream-dark/30 border border-stone-border px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-stone-muted/70" aria-hidden />
                <span className="text-stone-muted">Completed</span>
                <span className="font-semibold text-foreground tabular-nums">{completed.length}</span>
              </span>
            </div>
            <div className="flex shrink-0 max-sm:w-full max-sm:justify-end">
              <Link
                to="/jobs/post"
                className="inline-flex items-center gap-2 bg-white/70 hover:bg-white border border-stone-border hover:border-navy/25 text-navy text-xs font-semibold pl-2 pr-3 py-1.5 rounded-full shadow-sm hover:shadow transition-all"
              >
                <span className="w-6 h-6 rounded-full bg-navy text-white flex items-center justify-center">
                  <Plus size={12} />
                </span>
                <span>Post a new job</span>
              </Link>
            </div>
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="py-10 border-t border-stone-border">
            <h3 className="font-semibold text-foreground text-lg">Post your first job</h3>
            <p className="text-sm text-stone-muted mt-2 max-w-xl">
              Describe what you need and start receiving applications from talented students.
            </p>
            <div className="mt-4">
              <Link
                to="/jobs/post"
                className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-accent"
              >
                Post a Job <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        <FadePresence
          className="w-full"
          activeKey={loading ? 'loading' : jobs.length > 0 ? 'list' : 'idle'}
        >
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading your jobs">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : jobs.length > 0 ? (
            <div className="flex flex-col gap-6 w-full mt-2">
              {open.length > 0 && (
                <section className="w-full">
                  <div className="w-full pb-3 border-b border-stone-border">
                    <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                      Accepting applications
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cream-dark border border-stone-border text-[11px] font-bold text-foreground tabular-nums">
                        {open.length}
                      </span>
                    </h2>
                  </div>
                  <div className="divide-y divide-stone-border w-full">
                    {open.map((job) => (
                      <div key={job._id} className="py-5">
                        <JobRow job={job} onClose={handleClose}>
                          <Link
                            to={`/jobs/${job._id}`}
                            className="text-xs text-stone-muted hover:text-foreground font-medium flex items-center gap-1"
                          >
                            View <ArrowRight size={11} />
                          </Link>
                          <Link
                            to={`/jobs/${job._id}/edit`}
                            className="text-xs text-stone-muted hover:text-foreground font-medium"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleClose(job._id)}
                            className="text-xs text-stone-muted hover:text-red-600 font-medium"
                          >
                            Close
                          </button>
                        </JobRow>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {closed.length > 0 && (
                <section className="w-full">
                  <div className="w-full pb-3 border-b border-stone-border">
                    <h2 className="text-sm font-semibold text-stone-muted inline-flex items-center gap-2">
                      In progress
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cream-dark/70 border border-stone-border text-[11px] font-bold text-foreground tabular-nums">
                        {closed.length}
                      </span>
                    </h2>
                  </div>
                  <div className="divide-y divide-stone-border w-full">
                    {closed.map((job) => (
                      <div key={job._id} className="py-5">
                        <JobRow job={job}>
                          <Link
                            to={`/jobs/${job._id}`}
                            className="text-xs text-stone-muted hover:text-foreground font-medium flex items-center gap-1"
                          >
                            View <ArrowRight size={11} />
                          </Link>
                          <button
                            onClick={() => handleComplete(job._id)}
                            className="text-xs text-navy font-semibold flex items-center gap-1 hover:text-accent"
                          >
                            <CheckCircle2 size={12} /> Complete
                          </button>
                        </JobRow>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {completed.length > 0 && (
                <section className="w-full">
                  <div className="w-full pb-3 border-b border-stone-border">
                    <h2 className="text-sm font-semibold text-stone-muted inline-flex items-center gap-2">
                      Completed
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cream-dark/70 border border-stone-border text-[11px] font-bold text-foreground tabular-nums">
                        {completed.length}
                      </span>
                    </h2>
                  </div>
                  <div className="divide-y divide-stone-border w-full">
                    {completed.map((job) => (
                      <div key={job._id} className="py-5">
                        <JobRow job={job} muted>
                          <Link
                            to={`/jobs/${job._id}`}
                            className="text-xs text-stone-muted hover:text-foreground font-medium"
                          >
                            View
                          </Link>
                        </JobRow>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <span className="sr-only" aria-hidden />
          )}
        </FadePresence>
      </div>
    </div>
  );
}

function JobRow({
  job,
  muted,
  children,
  onClose: _onClose,
}: {
  job: Job;
  muted?: boolean;
  children?: React.ReactNode;
  onClose?: (id: string) => void;
}) {
  const apps = job.applicationsCount ?? 0;
  return (
    <div className={`${muted ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            to={`/jobs/${job._id}`}
            className="font-medium text-sm text-foreground hover:text-accent line-clamp-1"
          >
            {job.title}
          </Link>
          <div className="flex items-center gap-2 mt-1 text-xs text-stone-muted">
            <span>{job.category}</span>
            <span className="text-stone-border">·</span>
            <span>₱{job.budget.toLocaleString()} {job.budgetType}</span>
            <span className="text-stone-border">·</span>
            <span className={apps > 0 ? 'text-[#1C3A28] font-medium' : ''}>
              {apps} {apps === 1 ? 'applicant' : 'applicants'}
            </span>
          </div>
        </div>
        <Badge variant={job.status}>{job.status}</Badge>
      </div>
      {children && (
        <div className="flex items-center gap-3 pt-4 mt-4 border-t border-stone-border/60">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard page ───────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-5xl mx-auto w-full px-6 lg:px-8 py-10 flex-1">
        {user?.role === 'client' ? (
          <ClientDashboard user={user} />
        ) : (
          <StudentDashboard user={user} />
        )}
      </main>
    </div>
  );
}
