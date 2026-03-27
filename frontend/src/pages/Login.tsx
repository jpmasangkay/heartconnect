import React from 'react';
import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import axios from 'axios';
import { Input, FormField } from '../components/ui/forms';
import { useAuth } from '../context/AuthContext';
import { twoFactorApi } from '../api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'email'>('totp');
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || loading) return;
    submitLockRef.current = true;
    setError('');
    setLoading(true);
    try {
      const emailNorm = email.trim().toLowerCase();
      const result = await login({ email: emailNorm, password });

      if (result.requires2FA) {
        setRequires2FA(true);
        setTempToken(result.tempToken || '');
        setTwoFactorMethod(result.twoFactorMethod || 'totp');
        return;
      }

      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; errors?: string[] } | undefined;
        const status = err.response?.status;
        if (!err.response) {
          setError(
            'Cannot reach the server. Start the API (e.g. backend on port 5000) and check VITE_API_URL in your frontend .env.',
          );
        } else if (data?.errors && Array.isArray(data.errors)) {
          setError(data.errors.join(' · '));
        } else if (typeof data?.message === 'string' && data.message) {
          setError(data.message);
        } else if (status === 401) {
          setError('Invalid email or password.');
        } else if (status === 429) {
          setError(data?.message || 'Too many attempts. Wait a few minutes and try again.');
        } else {
          setError(data?.message || `Sign-in failed (${status ?? 'error'}). Try again.`);
        }
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCodeLoading(true);
    try {
      const res = await twoFactorApi.verify(tempToken, code);
      const { token } = res.data;
      localStorage.setItem('token', token);
      // Force a page reload to re-initialize AuthContext with fresh user data
      window.location.replace(from);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code. Try again.');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    try {
      await twoFactorApi.sendEmailCode(tempToken);
      setError(''); // clear
    } catch {
      setError('Failed to resend code');
    }
  };

  // 2FA Challenge Screen
  if (requires2FA) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white border border-stone-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center">
                <Shield size={18} className="text-navy" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Two-Factor Authentication</h1>
                <p className="text-xs text-stone-muted">
                  Enter the code sent to your email
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2.5 mb-5">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handle2FAVerify} className="space-y-4">
              <Input
                type="text"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                autoFocus
                className="text-center text-lg tracking-[0.3em]"
              />
              <button
                type="submit"
                disabled={codeLoading || code.length !== 6}
                className="w-full bg-navy hover:bg-navy-light text-white text-sm font-semibold py-2.5 rounded transition-colors disabled:opacity-60"
              >
                {codeLoading ? 'Verifying...' : 'Verify'}
              </button>
            </form>

            <div className="mt-4 flex justify-between items-center">
              {twoFactorMethod === 'email' && (
                <button
                  onClick={handleResendCode}
                  className="text-xs text-accent hover:text-accent-hover"
                >
                  Resend code
                </button>
              )}
              <button
                onClick={() => { setRequires2FA(false); setCode(''); setError(''); }}
                className="text-xs text-stone-muted hover:text-foreground"
              >
                ← Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="flex-1 px-4 py-10 md:py-14">
        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left: context panel */}
          <div className="hidden md:block">
            <div className="bg-white/60 border border-stone-border rounded-lg p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-3">
                Welcome back
              </p>
              <h1 className="text-3xl font-black text-foreground leading-tight">
                Sign in and pick up where you left off.
              </h1>
              <p className="mt-3 text-sm text-stone-muted leading-relaxed max-w-md">
                Messages, applications, and job updates all in one place.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-cream border border-stone-border rounded-lg p-4">
                  <p className="font-semibold text-foreground">Faster messaging</p>
                  <p className="text-xs text-stone-muted mt-1">Real-time updates across devices.</p>
                </div>
                <div className="bg-cream border border-stone-border rounded-lg p-4">
                  <p className="font-semibold text-foreground">Safer accounts</p>
                  <p className="text-xs text-stone-muted mt-1">Protected login & rate limits.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="w-full">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-2">
                Welcome back
              </p>
              <h2 className="text-3xl font-black text-foreground">Sign in</h2>
              <p className="mt-2 text-sm text-stone-muted">
                Don't have an account?{' '}
                <Link to="/register" className="text-accent hover:text-navy font-medium transition-colors">
                  Sign up free
                </Link>
              </p>
            </div>

            <div className="bg-white border border-stone-border rounded-lg p-8">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2.5 mb-5">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField label="Email address" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  required
                  autoComplete="email"
                />
              </FormField>

              <FormField label="Password" htmlFor="password">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
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
              </FormField>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy hover:bg-navy-light text-white text-sm font-semibold py-2.5 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
