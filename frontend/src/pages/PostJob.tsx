import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { Input, Select, Textarea, FormField } from '../components/ui/forms';
import { jobsApi } from '../api';

export default function PostJob() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly'>('fixed');
  const [deadline, setDeadline] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setSkillInput('');
    }
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Client-side validation (mirrors backend rules)
    if (!title || !description || !budget || !deadline) {
      setError('Please fill in all required fields.');
      return;
    }
    if (title.trim().length < 5) {
      setError('Job title must be at least 5 characters.');
      return;
    }
    if (description.trim().length < 20) {
      setError('Description must be at least 20 characters.');
      return;
    }
    if (skills.length === 0) {
      setError('Please add at least one required skill.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await jobsApi.create({ title, description, budget: Number(budget), budgetType, deadline, skills });
      navigate(`/jobs/${res.data._id}`);
    } catch (err: any) {
      // Backend returns either { message: string } or { errors: string[] }
      const data = err.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        setError(data.errors.join(' · '));
      } else {
        setError(data?.message || 'Failed to post job.');
      }
      setLoading(false);
    }
  };

  // Min date for deadline = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-stone-muted hover:text-navy transition-colors mb-6">
          <ChevronLeft size={14} />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-1">
            Post an opportunity
          </p>
          <h1 className="text-3xl font-black text-foreground">Create a new job listing</h1>
          <p className="text-sm text-stone-muted mt-2">
            Reach hundreds of talented students ready to take on your project.
          </p>
        </div>

        <div className="bg-white border border-stone-border rounded-sm p-8">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2.5 mb-6">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField label="Job title *" htmlFor="title">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build a React e-commerce store"
                required
              />
            </FormField>

            <FormField label="Description *" htmlFor="description">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project in detail — deliverables, requirements, preferred tools, and any relevant context..."
                className="min-h-[180px]"
                required
              />
              <p className="text-xs text-stone-muted mt-1">{description.length} characters</p>
            </FormField>

            {/* Budget */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Budget (₱) *" htmlFor="budget">
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="5000"
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
                min={minDate}
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
                  placeholder="e.g. React, Figma..."
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 bg-cream border border-stone-border rounded text-sm hover:bg-cream-dark transition-colors whitespace-nowrap"
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

            {/* Preview summary */}
            {title && budget && (
              <div className="bg-cream border border-stone-border rounded p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-muted mb-2">Preview</p>
                <p className="font-bold text-foreground">{title}</p>
                <p className="text-stone-muted text-xs mt-1">
                  ₱{Number(budget).toLocaleString()} {budgetType} · Due {deadline || '—'}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-navy hover:bg-navy-light text-white text-sm font-semibold px-8 py-2.5 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting...' : 'Post job listing'}
              </button>
              <Link
                to="/dashboard"
                className="text-sm text-stone-muted hover:text-navy border border-stone-border px-5 py-2.5 rounded transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
