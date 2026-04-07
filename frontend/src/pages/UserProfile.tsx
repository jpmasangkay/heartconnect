import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GraduationCap, MapPin, Globe, ChevronLeft, Flag, Ban, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { authApi, blocksApi, reviewsApi } from '../api';
import ReportModal from '../components/ReportModal';
import { FadePresence } from '../components/ui/loading-fade';
import { Skeleton } from '../components/ui/skeleton';
import { waitMinSkeletonMs } from '../lib/minSkeletonDelay';
import { useAuth } from '../context/AuthContext';
import type { User, Review } from '../types';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    const { signal } = ac;

    (async () => {
      setNotFound(false);
      setLoading(true);
      const t0 = Date.now();
      try {
        const r = await authApi.getUser(id, { signal });
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        setProfile(r.data);
      } catch {
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        setNotFound(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [id]);

  // Check block status
  useEffect(() => {
    if (!id || !currentUser || currentUser._id === id) return;
    blocksApi.check(id).then((r) => setIsBlocked(r.data.blocked)).catch(() => {});
  }, [id, currentUser]);

  // Fetch reviews for this user
  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    reviewsApi.getForUser(id, { signal: ac.signal }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = r.data as any;
      setReviews(body.data ?? body.reviews ?? []);
      setAvgRating(body.avgRating ?? 0);
    }).catch(() => {});
    return () => ac.abort();
  }, [id]);

  const handleBlock = async () => {
    if (!id) return;
    try {
      if (isBlocked) { await blocksApi.unblock(id); setIsBlocked(false); }
      else           { await blocksApi.block(id);   setIsBlocked(true);  }
    } catch { /* noop */ }
  };


  const profileKey = loading ? 'loading' : notFound || !profile ? 'missing' : 'profile';

  const initials =
    profile?.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '';

  return (
    <FadePresence activeKey={profileKey}>
      {loading ? (
        <div className="min-h-screen bg-cream">
          <div className="max-w-2xl mx-auto px-6 py-10 space-y-6" aria-busy="true" aria-label="Loading profile">
            <Skeleton className="h-4 w-20 rounded" />
            <div className="bg-white border border-stone-border rounded-sm p-7 flex gap-5">
              <Skeleton className="h-16 w-16 rounded-full shrink-0" />
              <div className="flex-1 space-y-3 pt-1">
                <Skeleton className="h-7 w-48 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
            <div className="bg-white border border-stone-border rounded-sm p-7 space-y-3">
              <Skeleton className="h-3 w-28 rounded mb-2" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-[92%] rounded" />
              <Skeleton className="h-4 w-[70%] rounded" />
            </div>
          </div>
        </div>
      ) : notFound || !profile ? (
        <div className="min-h-screen bg-cream">
          <div className="max-w-2xl mx-auto px-6 py-16 text-center">
            <p className="text-foreground font-semibold mb-2">User not found</p>
            <Link to="/jobs" className="text-sm text-accent hover:underline">Back to Jobs</Link>
          </div>
        </div>
      ) : (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-2xl mx-auto w-full px-6 py-10 flex-1">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-stone-muted hover:text-navy transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          Back
        </button>

        {/* Avatar + name */}
        <div className="bg-white border border-stone-border rounded-sm p-7 mb-5">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center text-white font-black text-xl shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
              <p className="text-sm text-stone-muted capitalize mt-0.5">{profile.role}</p>
              {profile.bio && (
                <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {currentUser && currentUser._id !== profile._id && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1.5 text-xs text-stone-muted hover:text-red-600 border border-stone-border px-3 py-1.5 rounded-lg transition-colors"
              >
                <Flag size={12} /> Report
              </button>
              <button
                onClick={handleBlock}
                className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-colors ${
                  isBlocked
                    ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                    : 'text-stone-muted hover:text-red-600 border-stone-border'
                }`}
              >
                <Ban size={12} /> {isBlocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          )}
          {reportMsg && (
            <p className="text-xs text-green-600 mt-2">{reportMsg}</p>
          )}
        </div>

        {/* Details */}
        <div className="bg-white border border-stone-border rounded-sm p-7 mb-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-4">Details</h3>
          {profile.university && (
            <div className="flex items-center gap-3 text-sm">
              <GraduationCap size={14} className="text-stone-muted shrink-0" />
              <span>{profile.university}</span>
            </div>
          )}
          {profile.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={14} className="text-stone-muted shrink-0" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.portfolio && (
            <div className="flex items-center gap-3 text-sm">
              <Globe size={14} className="text-stone-muted shrink-0" />
              <a
                href={profile.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline truncate"
              >
                {profile.portfolio}
              </a>
            </div>
          )}
          {!profile.university && !profile.location && !profile.portfolio && (
            <p className="text-sm text-stone-muted italic">No details added.</p>
          )}
          {profile.createdAt && (
            <p className="text-xs text-stone-muted pt-2 border-t border-stone-border">
              Member since {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
            </p>
          )}
        </div>

        {/* Skills */}
        {(profile.skills ?? []).length > 0 && (
          <div className="bg-white border border-stone-border rounded-sm p-7">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-4">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {(profile.skills ?? []).map((s) => (
                <span key={s} className="text-xs bg-cream border border-stone-border px-3 py-1 rounded-full text-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="bg-white border border-stone-border rounded-sm p-7 mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-1">Reviews</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    className={star <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-stone-border'}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-foreground">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-stone-muted">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
            </div>
          )}
          {reviews.length === 0 ? (
            <p className="text-sm text-stone-muted italic mt-3">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review._id} className="border-t border-stone-border pt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
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
        </div>
      </main>

      {showReportModal && id && (
        <ReportModal
          targetType="user"
          targetId={id}
          onClose={() => setShowReportModal(false)}
          onSuccess={(msg) => setReportMsg(msg)}
          onError={(msg) => setReportMsg(msg)}
        />
      )}
    </div>
      )}
    </FadePresence>
  );
}
