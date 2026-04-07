import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '../api';
import { getAxiosErrorMessage } from '../lib/utils';
import { Input } from '../components/ui/forms';
import { Button } from '../components/ui/button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err: unknown) {
      setError(getAxiosErrorMessage(err, 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-stone-muted hover:text-foreground mb-8">
          <ArrowLeft size={14} /> Back to login
        </Link>

        {sent ? (
          <div className="bg-white border border-stone-border rounded-lg p-8 text-center">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Check your email</h1>
            <p className="text-sm text-stone-muted">
              If an account exists with <strong>{email}</strong>, we've sent a password reset link.
              The link expires in 30 minutes.
            </p>
            <Link to="/login" className="mt-6 inline-block text-sm text-accent hover:text-accent-hover font-medium">
              Return to login
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-stone-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center">
                <Mail size={18} className="text-navy" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Forgot password?</h1>
                <p className="text-xs text-stone-muted">Enter your email to get a reset link</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
