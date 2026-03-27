import { useState } from 'react';
import { Smartphone, Mail, CheckCircle } from 'lucide-react';
import { twoFactorApi } from '../api';
import { Input } from './ui/forms';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

export default function TwoFactorSetup() {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<'choice' | 'totp-setup' | 'verify' | 'disable'>('choice');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEnabled = user?.twoFactorEnabled;

  const handleSetupTOTP = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await twoFactorApi.setup('totp');
      setQrCodeUrl(res.data.qrCodeUrl || '');
      setSecret(res.data.secret || '');
      setStep('totp-setup');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

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

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await twoFactorApi.verifySetup(code);
      updateUser({ twoFactorEnabled: true, twoFactorMethod: 'totp' });
      setSuccess('2FA enabled successfully!');
      setStep('choice');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await twoFactorApi.disable(password, code);
      updateUser({ twoFactorEnabled: false, twoFactorMethod: undefined });
      setSuccess('2FA disabled');
      setStep('choice');
      setCode('');
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
                2FA is <span className="text-green-600 font-medium">enabled</span> via {user?.twoFactorMethod === 'totp' ? 'authenticator app' : 'email'}.
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
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={handleSetupTOTP}
                  disabled={loading}
                >
                  <Smartphone size={14} className="mr-1.5" />
                  Authenticator App
                </Button>
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

      {step === 'totp-setup' && (
        <div>
          <p className="text-xs text-stone-muted mb-3">
            Scan this QR code with your authenticator app (e.g. Google Authenticator):
          </p>
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="QR code" className="w-48 h-48 mx-auto my-4 rounded border" />
          )}
          <p className="text-xs text-stone-muted mb-1">Or enter this secret manually:</p>
          <code className="text-xs bg-cream-dark px-2 py-1 rounded block mb-4 break-all">{secret}</code>

          <form onSubmit={handleVerifySetup}>
            <Input
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={loading || code.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep('choice')}>
                Cancel
              </Button>
            </div>
          </form>
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
          {user?.twoFactorMethod === 'totp' && (
            <Input
              placeholder="6-digit code from app"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              className="mb-3"
            />
          )}
          <div className="flex gap-2">
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
