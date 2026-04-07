import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, AlertCircle, Trash2 } from 'lucide-react';
import { Input, Select, Textarea, FormField } from '../components/ui/forms';
import { FadePresence } from '../components/ui/loading-fade';
import { Skeleton } from '../components/ui/skeleton';
import { waitMinSkeletonMs } from '../lib/minSkeletonDelay';
import { jobsApi } from '../api';
import { getAxiosErrorMessage } from '../lib/utils';
import type { Job, JobStatus } from '../types';


export default function EditJob() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly'>('fixed');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<JobStatus>('open');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    const { signal } = ac;

    const load = async () => {
      const t0 = Date.now();
      try {
        const res = await jobsApi.getById(id, { signal });
        const j = res.data;
        setJob(j);
        setTitle(j.title);
        setDescription(j.description);
        setBudget(String(j.budget));
        setBudgetType(j.budgetType);
        setDeadline(j.deadline.split('T')[0]);
        setStatus(j.status);
        setSkills(j.skills);
      } catch {
        if (signal.aborted) return;
        setError('Failed to load job. Please go back and try again.');
      }
      await waitMinSkeletonMs(t0, signal);
      if (signal.aborted) return;
      setLoading(false);
    };

    void load();
    return () => ac.abort();
  }, [id]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.some((existing) => existing.toLowerCase() === s.toLowerCase())) {
      setSkills([...skills, s]);
      setSkillInput('');
    }
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !description || !budget || !deadline) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await jobsApi.update(id!, { title, description, budget: Number(budget), budgetType, deadline, status, skills });
      navigate(`/jobs/${id}`);
    } catch (err: unknown) {
      setError(getAxiosErrorMessage(err, 'Failed to update job.'));
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await jobsApi.delete(id!);
      navigate('/dashboard');
    } catch {
      setError('Failed to delete job. Please try again.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!loading && !job) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  // If the job deadline is already in the past, min={tomorrow} makes <input type="date"> invalid and blocks save.
  const deadlineInputMin = deadline && deadline < minDate ? deadline : minDate;

  return (
    <FadePresence activeKey={loading ? 'loading' : 'page'}>
      {loading ? (
        <div className="min-h-screen bg-cream">
          <div className="max-w-3xl mx-auto px-6 py-10 space-y-6" aria-busy="true" aria-label="Loading job">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-8 w-[min(100%,20rem)] rounded" />
            <div className="bg-white border border-stone-border rounded-sm p-6 space-y-5">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-28 w-full rounded" />
              <div className="flex flex-wrap gap-4">
                <Skeleton className="h-10 w-36 rounded" />
                <Skeleton className="h-10 w-36 rounded" />
                <Skeleton className="h-10 w-44 rounded" />
              </div>
              <Skeleton className="h-24 w-full rounded" />
              <Skeleton className="h-10 w-48 rounded" />
            </div>
          </div>
        </div>
      ) : (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
        <Link
          to={`/jobs/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-stone-muted hover:text-navy transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          Back to Job
        </Link>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-1">
              Edit listing
            </p>
            <h1 className="text-3xl font-black text-foreground">Update Job</h1>
          </div>

          {/* Delete button */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-sm text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded transition-colors"
            >
              <Trash2 size={13} />
              Delete Job
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">Are you sure?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs border border-stone-border px-3 py-1.5 rounded hover:bg-cream transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border border-stone-border rounded-sm p-8">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2.5 mb-6">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <FormField label="Job title *" htmlFor="title">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Status" htmlFor="status">
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as JobStatus)}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="in-progress">In Progress</option>
                </Select>
              </FormField>

            <FormField label="Description *" htmlFor="description">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[160px]"
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Budget (₱) *" htmlFor="budget">
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Budget type *" htmlFor="budgetType">
                <Select
                  id="budgetType"
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value as 'fixed' | 'hourly')}
                >
                  <option value="fixed">Fixed price</option>
                  <option value="hourly">Hourly rate</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Application deadline *" htmlFor="deadline">
              <Input
                id="deadline"
                type="date"
                value={deadline}
                min={deadlineInputMin}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </FormField>

            {/* Skills */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                Required skills
              </label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  placeholder="Add a skill..."
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 bg-cream border border-stone-border rounded text-sm hover:bg-cream-dark transition-colors"
                >
                  Add
                </button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1.5 text-xs bg-cream border border-stone-border px-3 py-1 rounded-full"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSkill(s)}
                        className="text-stone-muted hover:text-red-500 transition-colors text-base leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-navy hover:bg-navy-light text-white text-sm font-semibold px-8 py-2.5 rounded transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <Link
                to={`/jobs/${id}`}
                className="text-sm text-stone-muted hover:text-navy border border-stone-border px-5 py-2.5 rounded transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
      )}
    </FadePresence>
  );
}
