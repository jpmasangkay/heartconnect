import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '../api';
import { Input } from '../components/ui/forms';
import { Button } from '../components/ui/button';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.errors?.join(', ') || data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="bg-white border border-stone-border rounded-lg p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid link</h1>
          <p className="text-sm text-stone-muted mb-4">
            This password reset link is invalid or has expired.
          </p>
          <Link to="/forgot-password" className="text-sm text-accent hover:text-accent-hover font-medium">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-stone-muted hover:text-foreground mb-8">
          <ArrowLeft size={14} /> Back to login
        </Link>

        {done ? (
          <div className="bg-white border border-stone-border rounded-lg p-8 text-center">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Password reset!</h1>
            <p className="text-sm text-stone-muted">
              Your password has been changed. You can now log in.
            </p>
            <Link to="/login" className="mt-6 inline-block text-sm text-accent hover:text-accent-hover font-medium">
              Go to login
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-stone-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center">
                <Lock size={18} className="text-navy" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Set new password</h1>
                <p className="text-xs text-stone-muted">Must be at least 12 characters with mixed case, numbers, and symbols</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !password || !confirm}>
                {loading ? 'Resetting...' : 'Reset password'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
