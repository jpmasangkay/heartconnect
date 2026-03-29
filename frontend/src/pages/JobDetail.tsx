import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, DollarSign, Users, CheckCircle2, XCircle, MessageSquare, Pencil, AlertCircle, ChevronLeft, Star, Flag } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Input, Textarea, Badge, FormField, type BadgeVariant } from '../components/ui/forms';
import { jobsApi, applicationsApi, messagesApi, reviewsApi, reportsApi } from '../api';
import { FadePresence } from '../components/ui/loading-fade';
import { Skeleton } from '../components/ui/skeleton';
import { waitMinSkeletonMs } from '../lib/minSkeletonDelay';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import type { Job, Application, Review, ReportReason } from '../types';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [applying, setApplying] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('spam');
  const [reportDesc, setReportDesc] = useState('');
  const [reportMsg, setReportMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    const { signal } = ac;

    const load = async () => {
      setLoading(true);
      const t0 = Date.now();
      try {
        const res = await jobsApi.getById(id, { signal });
        setJob(res.data);
        if (user?.role === 'client') {
          const apps = await applicationsApi.getForJob(id, { signal });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const appsBody = apps.data as any;
          setApplications(Array.isArray(appsBody) ? appsBody : appsBody.data ?? []);
        }
        if (user?.role === 'student') {
          const myApps = await applicationsApi.getMyApplications({ signal });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const myBody = myApps.data as any;
          const myArr = Array.isArray(myBody) ? myBody : myBody.data ?? [];
          const mine = myArr.find((a: Application) => (a.job as any)._id === id || a.job._id === id);
          if (mine) setMyApplication(mine);
        }
      } catch {
        if (signal.aborted) return;
        setLoadError(true);
      }

      // Fetch reviews for this job
      try {
        const rev = await reviewsApi.getForJob(id, { signal });
        setReviews(rev.data);
        // Check if current user already reviewed
        if (user) {
          const already = rev.data.some((r: Review) => {
            const reviewerId = typeof r.reviewer === 'string' ? r.reviewer : r.reviewer._id;
            return reviewerId === user._id;
          });
          setHasReviewed(already);
        }
      } catch { /* noop */ }

      await waitMinSkeletonMs(t0, signal);
      if (signal.aborted) return;
      setLoading(false);
    };

    void load();
    return () => ac.abort();
  }, [id, user]);

  useEffect(() => {
    if (!socket || !id) return;

    const handleJobUpdate = (data: { _id: string; status: string }) => {
      if (data._id === id) {
        setJob((prev) => prev ? { ...prev, status: data.status as Job['status'] } : prev);
      }
    };

    const handleNewApp = (data: Application) => {
      const jobId = typeof data.job === 'string' ? data.job : data.job._id;
      if (jobId === id) {
        setApplications((prev) => {
          for (let i = 0; i < prev.length; i++) {
            if (prev[i]._id === data._id) return prev;
          }
          return [data, ...prev];
        });
        setJob((prev) =>
          prev ? { ...prev, applicationsCount: (prev.applicationsCount ?? 0) + 1 } : prev
        );
      }
    };

    const handleAppUpdate = (data: { _id: string; job: string; status: string }) => {
      if (data.job === id) {
        setApplications((prev) => {
          const i = prev.findIndex((a) => a._id === data._id);
          if (i === -1) return prev;
          const next = prev.slice();
          next[i] = { ...prev[i], status: data.status as Application['status'] };
          return next;
        });
      }
      setMyApplication((prev) =>
        prev && prev._id === data._id ? { ...prev, status: data.status as Application['status'] } : prev
      );
    };

    socket.on('job:updated', handleJobUpdate);
    socket.on('application:new', handleNewApp);
    socket.on('application:updated', handleAppUpdate);
    return () => {
      socket.off('job:updated', handleJobUpdate);
      socket.off('application:new', handleNewApp);
      socket.off('application:updated', handleAppUpdate);
    };
  }, [socket, id]);

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!coverLetter.trim()) { setFormError('Cover letter is required'); return; }
    if (!proposedRate || Number(proposedRate) <= 0) { setFormError('Enter a valid proposed rate'); return; }
    setFormError('');
    setApplying(true);
    try {
      const res = await applicationsApi.apply(id!, { coverLetter, proposedRate: Number(proposedRate) });
      setMyApplication(res.data);
      setSuccess('Application submitted!');
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setApplying(false);
    }
  };

  const handleStatusUpdate = async (appId: string, status: 'accepted' | 'rejected') => {
    setActionLoading(`status-${appId}`);
    try {
      await applicationsApi.updateStatus(appId, status);
      setApplications((prev) => {
        const i = prev.findIndex((a) => a._id === appId);
        if (i === -1) return prev;
        const next = prev.slice();
        next[i] = { ...prev[i], status };
        return next;
      });
    } catch { /* noop */ }
    finally { setActionLoading(null); }
  };

  const handleMessage = async (applicantId: string) => {
    setActionLoading(`message-${applicantId}`);
    try {
      const res = await messagesApi.getOrCreate(id!, applicantId);
      navigate(`/chat/${res.data._id}`, { state: { conversation: res.data } });
    } catch {
      navigate('/chat');
    }
    finally { setActionLoading(null); }
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!job || !user) return;
    setReviewSubmitting(true);
    try {
      // Determine reviewee: if I'm client, review the accepted student; if I'm student, review the client
      const accepted = applications.find((a) => a.status === 'accepted' || a.status === 'finished');
      const revieweeId = user._id === job.client._id
        ? accepted?.applicant._id
        : job.client._id;
      if (!revieweeId) return;

      const res = await reviewsApi.create({
        jobId: job._id,
        revieweeId,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviews((prev) => [...prev, res.data]);
      setHasReviewed(true);
      setReviewComment('');
    } catch { /* noop */ }
    finally { setReviewSubmitting(false); }
  };

  const handleReportJob = async () => {
    if (!id) return;
    try {
      await reportsApi.create({ targetType: 'job', targetId: id, reason: reportReason, description: reportDesc || undefined });
      setReportMsg('Report submitted. Thank you.');
      setShowReportModal(false);
      setReportDesc('');
    } catch { setReportMsg('Failed to submit report.'); }
  };

  if (!loading && loadError) return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-3 px-6">
      <p className="text-foreground font-semibold">Failed to load job</p>
      <p className="text-sm text-stone-muted">The job may have been removed or is unavailable.</p>
      <Link to="/jobs" className="text-sm text-navy hover:underline mt-1">Browse all jobs</Link>
    </div>
  );

  if (!loading && !job) return null;

  const isOwner =
    job != null && user?._id === job.client._id;
  const isStudent = user?.role === 'student';
  const deadlineDays = job
    ? Math.ceil((new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <FadePresence activeKey={loading ? 'loading' : 'page'}>
      {loading ? (
        <div className="min-h-screen bg-cream" aria-busy="true" aria-label="Loading job">
          <div className="bg-navy">
            <div className="max-w-4xl mx-auto px-6 pt-6 pb-10">
              <Skeleton variant="inverse" className="h-4 w-28 rounded mb-6" />
              <Skeleton variant="inverse" className="h-8 w-[min(100%,24rem)] rounded mb-3" />
              <Skeleton variant="inverse" className="h-4 w-40 rounded mb-5" />
              <div className="flex flex-wrap gap-4">
                <Skeleton variant="inverse" className="h-4 w-28 rounded" />
                <Skeleton variant="inverse" className="h-4 w-32 rounded" />
              </div>
            </div>
          </div>
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-[90%] rounded" />
            <div className="flex flex-wrap gap-2 pt-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg mt-4" />
          </div>
        </div>
      ) : !job ? null : (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Hero */}
      <div className="bg-navy relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.5) 0%, transparent 50%)',
          }}
        />
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-10 relative">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/80 mb-5"
          >
            <ChevronLeft size={14} />
            Back to jobs
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
                {job.title}
              </h1>
              <p className="text-sm text-white/50 mt-2">
                Posted by{' '}
                <Link to={`/users/${job.client._id}`} className="text-white/70 hover:text-white">
                  {job.client.name}
                </Link>
                <span className="mx-1.5">&middot;</span>
                {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <Badge variant={job.status as BadgeVariant}>{job.status}</Badge>
              {isOwner && (
                <Link to={`/jobs/${job._id}/edit`} className="text-white/40 hover:text-white">
                  <Pencil size={14} />
                </Link>
              )}
            </div>
          </div>

          {/* Key details */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm text-white/40">
            <span className="flex items-center gap-1.5">
              <DollarSign size={14} />
              <span className="font-medium text-white/90">₱{job.budget.toLocaleString()}</span>
              {job.budgetType === 'hourly' ? '/hr' : ' fixed'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              <span className={deadlineDays <= 3 ? 'text-red-400 font-medium' : 'text-white/70'}>
                {deadlineDays > 0 ? `${deadlineDays} days left` : 'Expired'}
              </span>
              <span>({format(new Date(job.deadline), 'MMM d, yyyy')})</span>
            </span>
            {!isOwner && (
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                {job.applicationsCount ?? 0} {(job.applicationsCount ?? 0) === 1 ? 'applicant' : 'applicants'}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1">

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
          {/* ── Left column ────────────────────────────────────────── */}
          <div className="min-w-0">
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-foreground mb-3">About this job</h2>
              <div className="text-sm text-stone-muted leading-relaxed whitespace-pre-wrap">
                {job.description}
              </div>
            </div>

            {/* Skills */}
            {job.skills.length > 0 && (
              <div className="mb-10">
                <h2 className="text-sm font-semibold text-foreground mb-3">Skills needed</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span key={skill} className="text-xs bg-cream-dark border border-stone-border px-3 py-1.5 rounded-full text-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Client's applicant list */}
            {isOwner && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  Applications
                  <span className="text-stone-muted font-normal ml-1.5">({applications.length})</span>
                </h2>
                {applications.length === 0 ? (
                  <p className="text-sm text-stone-muted py-6">No applications yet.</p>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <div key={app._id} className="bg-white border border-stone-border rounded-lg p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <Link
                              to={`/users/${app.applicant._id}`}
                              className="font-medium text-sm text-foreground hover:text-accent"
                            >
                              {app.applicant.name}
                            </Link>
                            <p className="text-xs text-stone-muted">{app.applicant.university || app.applicant.email}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-medium text-foreground">₱{app.proposedRate.toLocaleString()}</span>
                            <Badge variant={app.status as BadgeVariant}>{app.status}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-stone-muted leading-relaxed line-clamp-3 mb-3">
                          {app.coverLetter}
                        </p>
                        <div className="flex items-center gap-2">
                          {app.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(app._id, 'accepted')}
                                disabled={actionLoading === `status-${app._id}`}
                                className="flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
                              >
                                <CheckCircle2 size={12} /> {actionLoading === `status-${app._id}` ? 'Accepting...' : 'Accept'}
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(app._id, 'rejected')}
                                disabled={actionLoading === `status-${app._id}`}
                                className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
                              >
                                <XCircle size={12} /> {actionLoading === `status-${app._id}` ? 'Rejecting...' : 'Reject'}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleMessage(app.applicant._id)}
                            disabled={actionLoading === `message-${app.applicant._id}`}
                            className="flex items-center gap-1.5 text-xs text-stone-muted hover:text-navy border border-stone-border px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            <MessageSquare size={12} /> {actionLoading === `message-${app.applicant._id}` ? 'Opening...' : 'Message'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Reviews section (for completed jobs) ─────────── */}
            {job.status === 'completed' && (
              <div className="mt-10">
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  Reviews
                  <span className="text-stone-muted font-normal ml-1.5">({reviews.length})</span>
                </h2>

                {reviews.length === 0 ? (
                  <p className="text-sm text-stone-muted py-4">No reviews yet for this job.</p>
                ) : (
                  <div className="space-y-3 mb-6">
                    {reviews.map((review) => (
                      <div key={review._id} className="bg-white border border-stone-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                className={star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-stone-border'}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-stone-muted">
                            {'name' in review.reviewer ? review.reviewer.name : 'User'}
                            {' · '}
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Review form — only show if user is a participant and hasn't reviewed */}
                {user && !hasReviewed && (isOwner || myApplication?.status === 'finished' || myApplication?.status === 'accepted') && (
                  <div className="bg-cream-dark border border-stone-border rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Leave a Review</h3>
                    <form onSubmit={handleReviewSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs text-stone-muted mb-1">Rating</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="p-0.5"
                            >
                              <Star
                                size={20}
                                className={`transition-colors ${star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-stone-border hover:text-amber-300'}`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <FormField label="Comment (optional)" htmlFor="review-comment">
                        <Textarea
                          id="review-comment"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share your experience..."
                          className="min-h-[80px]"
                        />
                      </FormField>
                      <button
                        type="submit"
                        disabled={reviewSubmitting}
                        className="bg-navy hover:bg-navy-light text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-60"
                      >
                        {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right column (sidebar) ─────────────────────────────── */}
          <div className="space-y-5">
            {/* Application / status card */}
            {isStudent && job.status === 'open' && (
              <div className="bg-white border border-stone-border rounded-lg p-5">
                {myApplication ? (
                  <div className="text-center">
                    <Badge variant={myApplication.status as BadgeVariant} className="mb-2">
                      {myApplication.status}
                    </Badge>
                    <p className="text-sm text-stone-muted mt-2">
                      You applied {formatDistanceToNow(new Date(myApplication.createdAt), { addSuffix: true })}.
                    </p>
                    {myApplication.status === 'pending' && (
                      <button
                        onClick={async () => {
                          try {
                            await applicationsApi.withdraw(myApplication._id);
                            setMyApplication({ ...myApplication, status: 'withdrawn' });
                          } catch { /* noop */ }
                        }}
                        className="mt-3 text-xs text-stone-muted hover:text-red-600 underline"
                      >
                        Withdraw application
                      </button>
                    )}
                    {myApplication.status === 'accepted' && (
                      <button
                        onClick={() => handleMessage(job.client._id)}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-navy text-white text-sm py-2.5 rounded-lg hover:bg-navy-light"
                      >
                        <MessageSquare size={14} /> Message Client
                      </button>
                    )}
                  </div>
                ) : success ? (
                  <div className="text-center py-2">
                    <CheckCircle2 size={22} className="text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Application submitted</p>
                    <p className="text-xs text-stone-muted mt-1">The client will review and respond.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-sm text-foreground mb-4">Apply for this job</h3>
                    {formError && (
                      <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                        <AlertCircle size={12} /> {formError}
                      </div>
                    )}
                    {!isAuthenticated ? (
                      <Link
                        to="/login"
                        className="block w-full text-center bg-navy text-white text-sm font-medium py-2.5 rounded-lg hover:bg-navy-light"
                      >
                        Sign in to apply
                      </Link>
                    ) : (
                      <form onSubmit={handleApply} className="space-y-4">
                        <FormField label="Proposed Rate (₱)" htmlFor="rate">
                          <Input
                            id="rate"
                            type="number"
                            value={proposedRate}
                            onChange={(e) => setProposedRate(e.target.value)}
                            placeholder={job.budget.toString()}
                          />
                        </FormField>
                        <FormField label="Cover Letter" htmlFor="cover">
                          <Textarea
                            id="cover"
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            placeholder="Describe your relevant experience..."
                            className="min-h-[120px]"
                          />
                        </FormField>
                        <button
                          type="submit"
                          disabled={applying}
                          className="w-full bg-navy hover:bg-navy-light text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60"
                        >
                          {applying ? 'Submitting...' : 'Submit Application'}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}

            {/* About the client */}
            <div className="bg-white border border-stone-border rounded-lg p-5">
              <h3 className="text-xs font-medium text-stone-muted mb-3">About the client</h3>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold">
                  {job.client.name.charAt(0)}
                </div>
                <div>
                  <Link to={`/users/${job.client._id}`} className="font-medium text-sm text-foreground hover:text-accent">
                    {job.client.name}
                  </Link>
                  <p className="text-xs text-stone-muted">Client</p>
                </div>
              </div>
            </div>

            {/* Report Job button */}
            {user && !isOwner && (
              <div className="bg-white border border-stone-border rounded-lg p-4">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-1.5 text-xs text-stone-muted hover:text-red-600 transition-colors w-full"
                >
                  <Flag size={12} /> Report this job
                </button>
                {reportMsg && <p className="text-xs text-green-600 mt-2">{reportMsg}</p>}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Report Job</h3>
            <label className="block text-sm text-foreground font-medium mb-1">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value as ReportReason)}
              className="w-full border border-stone-border rounded-lg px-3 py-2 text-sm mb-3 bg-white"
            >
              <option value="spam">Spam</option>
              <option value="inappropriate">Inappropriate Content</option>
              <option value="fraud">Fraud / Scam</option>
              <option value="other">Other</option>
            </select>
            <label className="block text-sm text-foreground font-medium mb-1">Description (optional)</label>
            <textarea
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              placeholder="Tell us more about the issue..."
              className="w-full border border-stone-border rounded-lg px-3 py-2 text-sm mb-4 min-h-[80px] resize-y"
              maxLength={2000}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="text-sm text-stone-muted hover:text-foreground px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReportJob}
                className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      )}
    </FadePresence>
  );
}
