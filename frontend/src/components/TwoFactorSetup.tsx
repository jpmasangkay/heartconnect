import { useState, type FormEvent } from 'react';
import { Mail, CheckCircle } from 'lucide-react';
import { twoFactorApi } from '../api';
import { Input } from './ui/forms';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

export default function TwoFactorSetup() {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<'choice' | 'totp-setup' | 'verify' | 'disable'>('choice');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEnabled = user?.twoFactorEnabled;


  const handleSetupEmail = async () => {
    setError('');
    setLoading(true);
    try {
      await twoFactorApi.setup('email');
      updateUser({ twoFactorEnabled: true, twoFactorMethod: 'email' });
      setSuccess('2FA via email enabled!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };


  const handleDisable = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await twoFactorApi.disable(password, '');
      updateUser({ twoFactorEnabled: false, twoFactorMethod: undefined });
      setSuccess('2FA disabled');
      setStep('choice');
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
          <CheckCircle size={14} className="text-green-600" />
          <p className="text-xs text-green-700">{success}</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      {step === 'choice' && (
        <div>
          {isEnabled ? (
            <div>
              <p className="text-xs text-stone-muted mb-3">
                2FA is <span className="text-green-600 font-medium">enabled</span> via email.
              </p>
              <Button
                variant="outline"
                onClick={() => { setStep('disable'); setError(''); setSuccess(''); }}
              >
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-xs text-stone-muted mb-4">
                Add an extra layer of security to your account.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleSetupEmail}
                  disabled={loading}
                >
                  <Mail size={14} className="mr-1.5" />
                  Email Code
                </Button>
              </div>
            </div>
          )}
        </div>
      )}


      {step === 'disable' && (
        <form onSubmit={handleDisable}>
          <p className="text-xs text-stone-muted mb-3">Confirm your identity to disable 2FA:</p>
          <Input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-2"
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={loading || !password}>
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setStep('choice')}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
