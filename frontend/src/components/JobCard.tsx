import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Bookmark, BookmarkCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { savedJobsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Job } from '../types';

const CATEGORY_COLOR: Record<string, string> = {
  'Web Development':    'bg-teal-50 text-teal-700',
  'Graphic Design':     'bg-amber-50 text-amber-700',
  'Cybersecurity':      'bg-emerald-50 text-emerald-700',
  'Marketing':          'bg-orange-50 text-orange-700',
  'Data Science':       'bg-violet-50 text-violet-700',
  'Mobile Development': 'bg-sky-50 text-sky-700',
  'Content Writing':    'bg-lime-50 text-lime-700',
  'UI/UX Design':       'bg-rose-50 text-rose-700',
  'Other':              'bg-stone-100 text-stone-600',
};

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  const { isAuthenticated } = useAuth();
  const colorClass = CATEGORY_COLOR[job.category] ?? CATEGORY_COLOR['Other'];
  const timeAgo = formatDistanceToNow(new Date(job.createdAt), { addSuffix: true });
  const deadlineDays = Math.ceil(
    (new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const [saved, setSaved] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Check saved status on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    savedJobsApi.check(job._id)
      .then((res) => { if (!cancelled) setSaved(res.data.saved); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [job._id, isAuthenticated]);

  const toggleSave = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); // Don't navigate to job detail
    e.stopPropagation();
    if (toggling || !isAuthenticated) return;
    setToggling(true);
    try {
      if (saved) {
        await savedJobsApi.unsave(job._id);
        setSaved(false);
      } else {
        await savedJobsApi.save(job._id);
        setSaved(true);
      }
    } catch {
      // noop
    } finally {
      setToggling(false);
    }
  }, [saved, toggling, job._id, isAuthenticated]);

  return (
    <Link to={`/jobs/${job._id}`} className="group block">
      <article className="bg-white border border-stone-border rounded-lg p-5 h-full flex flex-col hover:border-[#1C3A28]/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative">
        {/* Bookmark button */}
        {isAuthenticated && (
          <button
            onClick={toggleSave}
            className={`absolute top-3 right-3 p-1.5 rounded-full transition-all z-10 ${
              saved
                ? 'text-navy bg-navy/10'
                : 'text-stone-300 hover:text-navy hover:bg-navy/5'
            }`}
            title={saved ? 'Remove from saved' : 'Save job'}
          >
            {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </button>
        )}

        {/* Category + time */}
        <div className="flex items-center justify-between gap-2 mb-3 pr-8">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
            {job.category}
          </span>
          <span className="text-[11px] text-stone-muted">{timeAgo}</span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground text-[15px] leading-snug line-clamp-2 mb-2 group-hover:text-accent transition-colors">
          {job.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-stone-muted leading-relaxed line-clamp-2 mb-4 flex-1">
          {job.description}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-border/60 text-xs text-stone-muted">
          <span className="font-medium text-foreground">
            ₱{job.budget.toLocaleString()}
            <span className="font-normal text-stone-muted ml-0.5">
              {job.budgetType === 'hourly' ? '/hr' : ' fixed'}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {deadlineDays > 0 ? `${deadlineDays}d left` : 'Expired'}
          </span>
        </div>
      </article>
    </Link>
  );
}
