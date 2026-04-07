import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, GraduationCap, Briefcase } from 'lucide-react';
import { Input, Label, FormField } from '../components/ui/forms';
import { useAuth } from '../context/AuthContext';
import { cn, getAxiosErrorMessage } from '../lib/utils';
import type { UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import TermsContent from '../components/TermsContent';
import PrivacyContent from '../components/PrivacyContent';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<UserRole>('student');

  // Landing links use /register?role=client | student — keep form in sync
  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'client' || r === 'student') setRole(r);
  }, [searchParams]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Must match backend password policy (min 12, upper, lower, number, special char)
    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/\d/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }
    if (!/[@$!%*?&]/.test(password)) {
      setError('Password must contain at least one special character (@$!%*?&)');
      return;
    }
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register({ name, email, password, role, university: role === 'student' ? university : undefined, agreedToTerms });
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getAxiosErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="flex-1 px-4 py-10 md:py-14">
        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left: context panel */}
          <div className="hidden md:block">
            <div className="bg-white/60 border border-stone-border rounded-lg p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-3">
                Join HeartConnect
              </p>
              <h1 className="text-3xl font-black text-foreground leading-tight">
                Create an account and start collaborating.
              </h1>
              <p className="mt-3 text-sm text-stone-muted leading-relaxed max-w-md">
                Students build portfolios. Clients hire quickly. Everyone gets real-time messaging.
              </p>
              <div className="mt-6 space-y-3 text-sm">
                <div className="bg-cream border border-stone-border rounded-lg p-4">
                  <p className="font-semibold text-foreground">For students</p>
                  <p className="text-xs text-stone-muted mt-1">Find gigs, gain experience, get paid.</p>
                </div>
                <div className="bg-cream border border-stone-border rounded-lg p-4">
                  <p className="font-semibold text-foreground">For clients</p>
                  <p className="text-xs text-stone-muted mt-1">Post jobs and chat with applicants instantly.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="w-full">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-2">
                Join HeartConnect
              </p>
              <h2 className="text-3xl font-black text-foreground">Create your account</h2>
              <p className="mt-2 text-sm text-stone-muted">
                Already have an account?{' '}
                <Link to="/login" className="text-accent hover:text-navy font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="bg-white border border-stone-border rounded-lg p-8">
            {/* Role selection */}
            <div className="mb-6">
              <Label className="block mb-3">I want to</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 border rounded transition-all text-sm',
                    role === 'student'
                      ? 'border-navy bg-navy text-white'
                      : 'border-stone-border bg-cream hover:border-navy-light text-foreground'
                  )}
                >
                  <GraduationCap size={20} />
                  <span className="font-medium">Find freelance work</span>
                  <span className={cn('text-xs', role === 'student' ? 'text-white/70' : 'text-stone-muted')}>
                    I'm a student
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 border rounded transition-all text-sm',
                    role === 'client'
                      ? 'border-navy bg-navy text-white'
                      : 'border-stone-border bg-cream hover:border-navy-light text-foreground'
                  )}
                >
                  <Briefcase size={20} />
                  <span className="font-medium">Hire freelancers</span>
                  <span className={cn('text-xs', role === 'client' ? 'text-white/70' : 'text-stone-muted')}>
                    I'm a client
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2.5 mb-5">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Full name" htmlFor="name">
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maria Santos"
                  required
                />
              </FormField>

              <FormField label="Email address" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  required
                />
              </FormField>

              {role === 'student' && (
                <FormField label="University / School" htmlFor="university">
                  <Input
                    id="university"
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="University of the Philippines"
                  />
                </FormField>
              )}

              <FormField label="Password" htmlFor="password">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 12 chars, upper, lower, number, special"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-muted hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-stone-muted mt-1">
                  Must be 12+ characters with uppercase, lowercase, number, and special character (@$!%*?&)
                </p>
              </FormField>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 accent-navy"
                />
                <span className="text-xs text-stone-muted leading-relaxed">
                  I agree to the{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="underline hover:text-navy">Terms of Service</button>{' '}
                  and{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} className="underline hover:text-navy">Privacy Policy</button>.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy hover:bg-navy-light text-white text-sm font-semibold py-2.5 rounded transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Terms of Service">
        <TermsContent />
      </Modal>

      <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy Policy">
        <PrivacyContent />
      </Modal>
    </div>
  );
}
