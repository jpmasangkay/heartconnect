import { useState, useEffect, useCallback } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import Footer from '../components/Footer';
import JobCard from '../components/JobCard';
import { savedJobsApi } from '../api';
import { FadePresence } from '../components/ui/loading-fade';
import { JobCardSkeleton } from '../components/ui/skeleton';
import { waitMinSkeletonMs } from '../lib/minSkeletonDelay';
import type { SavedJob } from '../types';

export default function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const t0 = Date.now();
    try {
      const res = await savedJobsApi.getAll({ signal });
      await waitMinSkeletonMs(t0, signal);
      if (signal?.aborted) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = res.data as any;
      const items = Array.isArray(body) ? body : body.data ?? [];
      setSavedJobs(items);
    } catch {
      if (signal?.aborted) return;
      await waitMinSkeletonMs(t0, signal);
      setSavedJobs([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void fetchSaved(ac.signal);
    return () => ac.abort();
  }, [fetchSaved]);

  const handleUnsave = async (jobId: string) => {
    try {
      await savedJobsApi.unsave(jobId);
      setSavedJobs((prev) => prev.filter((s) => s.job._id !== jobId));
    } catch {
      // noop
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-5xl mx-auto w-full px-6 flex-1">
        <div className="pt-10 pb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Saved Jobs</h1>
          <p className="text-sm text-stone-muted mt-1">
            Jobs you've bookmarked for later
          </p>
        </div>

        <FadePresence activeKey={loading ? 'loading' : savedJobs.length === 0 ? 'empty' : 'list'}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : savedJobs.length === 0 ? (
            <div className="py-24 text-center">
              <Bookmark size={32} className="text-stone-300 mx-auto mb-3" />
              <p className="text-sm text-stone-muted">No saved jobs yet.</p>
              <p className="text-xs text-stone-muted mt-1">
                Click the bookmark icon on any job to save it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedJobs.map((s) => (
                <div key={s._id} className="relative">
                  <JobCard job={s.job} />
                  <button
                    onClick={() => handleUnsave(s.job._id)}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-stone-border text-navy hover:text-red-500 transition-colors z-10"
                    title="Remove from saved"
                  >
                    <BookmarkCheck size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FadePresence>

        <div className="h-16" />
      </main>
      <Footer />
    </div>
  );
}
