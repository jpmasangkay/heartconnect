import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, MapPin, GraduationCap, Globe,
  Pencil, Check, X, ChevronLeft, BadgeCheck, Upload, ShieldCheck, Star
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input, Textarea, FormField } from '../components/ui/forms';
import { Button } from '../components/ui/button';
import { authApi, verificationApi, reviewsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import TwoFactorSetup from '../components/TwoFactorSetup';
import type { Review } from '../types';

const AVAILABLE_SKILLS = [
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Python', 'Node.js',
  'Figma', 'Illustrator', 'Photoshop', 'UI/UX Design', 'Tailwind CSS',
  'Django', 'Laravel', 'MongoDB', 'PostgreSQL', 'MySQL',
  'AWS', 'Docker', 'Cybersecurity', 'Penetration Testing',
  'Content Writing', 'SEO', 'Social Media', 'Data Science', 'Machine Learning',
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Form state
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [university, setUniversity] = useState(user?.university || '');
  const [portfolio, setPortfolio] = useState(user?.portfolio || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [skillInput, setSkillInput] = useState('');

  const startEdit = () => {
    setName(user?.name || '');
    setBio(user?.bio || '');
    setLocation(user?.location || '');
    setUniversity(user?.university || '');
    setPortfolio(user?.portfolio || '');
    setSkills(user?.skills || []);
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await authApi.updateProfile({ name, bio, location, university, portfolio, skills });
      updateUser(res.data);
      setEditing(false);
      setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      // For demo, update locally
      updateUser({ name, bio, location, university, portfolio, skills });
      setEditing(false);
      setSuccess('Profile updated.');
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setSkillInput('');
    }
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  // Verification state
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const handleSchoolEmailVerify = async () => {
    setVerifyLoading(true);
    setVerifyMsg('');
    setVerifyError('');
    try {
      const res = await verificationApi.requestSchoolEmail();
      setVerifyMsg(res.data.message || 'Verified!');
      updateUser({ isVerified: true, verificationStatus: 'verified', verificationMethod: 'school_email' });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setVerifyError(data?.message || 'Verification failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerifyLoading(true);
    setVerifyMsg('');
    setVerifyError('');
    try {
      const res = await verificationApi.requestIdUpload(file);
      setVerifyMsg(res.data.message || 'Uploaded!');
      updateUser({ verificationStatus: 'pending' });
    } catch {
      setVerifyError('Upload failed. Try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Fetch initial reviews
  useEffect(() => {
    if (!user?._id) return;
    const ac = new AbortController();
    setLoadingReviews(true);
    reviewsApi.getForUser(user._id, { signal: ac.signal, limit: 3, page: 1 }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = r.data as any;
      setReviews(body.data ?? body.reviews ?? []);
      setAvgRating(body.avgRating ?? 0);
      setTotalReviews(body.total ?? 0);
      setHasMoreReviews((body.page ?? 1) < (body.pages ?? 1));
    }).catch(() => {})
      .finally(() => setLoadingReviews(false));
    return () => ac.abort();
  }, [user?._id]);

  const loadMoreReviews = async () => {
    if (!user?._id || loadingReviews || !hasMoreReviews) return;
    setLoadingReviews(true);
    try {
      const nextPage = reviewsPage + 1;
      const r = await reviewsApi.getForUser(user._id, { limit: 3, page: nextPage });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = r.data as any;
      setReviews((prev) => [...prev, ...(body.data ?? body.reviews ?? [])]);
      setReviewsPage(nextPage);
      setHasMoreReviews((body.page ?? 1) < (body.pages ?? 1));
    } catch {
      // ignore
    } finally {
      setLoadingReviews(false);
    }
  };

  if (!user) return null;

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-stone-muted hover:text-navy transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-1">
              Account
            </p>
            <h1 className="text-3xl font-black text-foreground">Your Profile</h1>
          </div>
          {!editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-2 border border-stone-border bg-white hover:bg-cream text-sm font-medium px-4 py-2 rounded transition-colors"
            >
              <Pencil size={13} />
              Edit Profile
            </button>
          )}
        </div>

        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-4 py-3 mb-6">
            <Check size={14} />
            {success}
          </div>
        )}

        {/* Avatar + Identity card */}
        <div className="bg-white border border-stone-border rounded-sm p-7 mb-5">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center text-white font-black text-xl shrink-0">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-4">
                  <FormField label="Full name" htmlFor="name">
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </FormField>
                  <FormField label="Bio" htmlFor="bio">
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell clients about yourself, your experience, and what you're passionate about..."
                      className="min-h-[100px]"
                    />
                  </FormField>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                  <p className="text-sm text-stone-muted capitalize mt-0.5">{user.role}</p>
                  {user.bio ? (
                    <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{user.bio}</p>
                  ) : (
                    <p className="text-sm text-stone-muted italic mt-3">No bio added yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-white border border-stone-border rounded-sm p-7 mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-5">
            Details
          </h3>

          {editing ? (
            <div className="space-y-4">
              <FormField label="Email" htmlFor="email">
                <Input id="email" type="email" value={user.email} disabled className="opacity-50" />
                <p className="text-xs text-stone-muted mt-1">Email cannot be changed.</p>
              </FormField>
              <FormField label="Location" htmlFor="location">
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Manila, Philippines"
                />
              </FormField>
              {user.role === 'student' && (
                <FormField label="University / School" htmlFor="university">
                  <Input
                    id="university"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="University of the Philippines"
                  />
                </FormField>
              )}
              <FormField label="Portfolio / Website" htmlFor="portfolio">
                <Input
                  id="portfolio"
                  type="url"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  placeholder="https://yourportfolio.com"
                />
              </FormField>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={14} className="text-stone-muted shrink-0" />
                <span>{user.email}</span>
              </div>
              {user.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin size={14} className="text-stone-muted shrink-0" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.university && (
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap size={14} className="text-stone-muted shrink-0" />
                  <span>{user.university}</span>
                </div>
              )}
              {user.portfolio && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe size={14} className="text-stone-muted shrink-0" />
                  <a
                    href={user.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {user.portfolio}
                  </a>
                </div>
              )}
              {!user.location && !user.university && !user.portfolio && (
                <p className="text-sm text-stone-muted italic">No additional details added.</p>
              )}
            </div>
          )}
        </div>

        {/* Skills card */}
        <div className="bg-white border border-stone-border rounded-sm p-7 mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-5">
            Skills
          </h3>

          {editing ? (
            <div className="space-y-4">
              {/* Custom skill input */}
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
                  placeholder="Add a custom skill..."
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="px-4 bg-cream border border-stone-border rounded text-sm hover:bg-cream-dark transition-colors whitespace-nowrap"
                >
                  Add
                </button>
              </div>

              {/* Selected skills */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1.5 text-xs bg-navy text-white px-3 py-1 rounded-full"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSkill(s)}
                        className="hover:opacity-70 transition-opacity text-base leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Suggestion chips */}
              <div>
                <p className="text-xs text-stone-muted mb-2">Suggested:</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.filter((s) => !skills.includes(s)).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSkill(s)}
                      className="text-xs bg-cream border border-stone-border px-3 py-1 rounded-full hover:border-navy-light transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {(user.skills ?? []).length === 0 ? (
                <p className="text-sm text-stone-muted italic">No skills added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(user.skills ?? []).map((s) => (
                    <span
                      key={s}
                      className="text-xs bg-cream border border-stone-border px-3 py-1 rounded-full text-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Reviews card */}
        {!editing && (
          <div className="bg-white border border-stone-border rounded-sm p-7 mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-4">
              Reviews
            </h3>
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
                <span className="text-xs text-stone-muted">({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</span>
              </div>
            )}
            {reviews.length === 0 ? (
              <p className="text-sm text-stone-muted italic">No reviews yet.</p>
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
                
                {hasMoreReviews && (
                  <div className="pt-2 border-t border-stone-border">
                    <button
                      type="button"
                      onClick={loadMoreReviews}
                      disabled={loadingReviews}
                      className="w-full py-2 text-sm text-center text-navy font-medium hover:bg-cream rounded transition-colors disabled:opacity-50"
                    >
                      {loadingReviews ? 'Loading...' : 'Show more reviews'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Verification card */}
        {!editing && (
          <div className="bg-white border border-stone-border rounded-sm p-7 mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-5 flex items-center gap-2">
              <BadgeCheck size={14} />
              Verification
            </h3>

            {user.verificationStatus === 'verified' ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <ShieldCheck size={16} />
                <span className="font-medium">Verified</span>
                <span className="text-stone-muted">via {user.verificationMethod?.replace('_', ' ') || 'admin'}</span>
              </div>
            ) : user.verificationStatus === 'pending' ? (
              <div className="text-sm text-amber-600">
                ⏳ Verification pending admin review
              </div>
            ) : user.verificationStatus === 'rejected' ? (
              <div className="space-y-3">
                <p className="text-sm text-red-500">Verification was rejected. You can try again.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="default" onClick={handleSchoolEmailVerify} disabled={verifyLoading}>
                    Verify with School Email
                  </Button>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 border border-stone-border bg-white hover:bg-cream text-sm font-medium px-4 py-2 rounded transition-colors">
                      <Upload size={14} />
                      Upload ID
                    </span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleIdUpload} />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone-muted">
                  Get a verified badge to build trust. Verify with your school email or upload your student ID.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="default" onClick={handleSchoolEmailVerify} disabled={verifyLoading}>
                    Verify with School Email
                  </Button>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={handleIdUpload} />
                    <span className="inline-flex items-center gap-1.5 border border-stone-border bg-white hover:bg-cream text-sm font-medium px-4 py-2 rounded transition-colors">
                      <Upload size={14} />
                      Upload ID
                    </span>
                  </label>
                </div>
              </div>
            )}

            {verifyMsg && <p className="text-xs text-green-600 mt-3">{verifyMsg}</p>}
            {verifyError && <p className="text-xs text-red-500 mt-3">{verifyError}</p>}

            <div className="mt-8 pt-6 border-t border-stone-border">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-4 flex items-center gap-2">
                <ShieldCheck size={14} />
                Security
              </h3>
              <TwoFactorSetup />
            </div>
          </div>
        )}

        {/* Save / Cancel */}
        {editing && (
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-xs text-red-600 mr-2">{error}</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-navy hover:bg-navy-light text-white text-sm font-semibold px-6 py-2.5 rounded transition-colors disabled:opacity-60"
            >
              <Check size={14} />
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 text-sm border border-stone-border px-5 py-2.5 rounded hover:bg-cream transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
