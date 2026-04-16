const router  = require('express').Router();
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode  = require('qrcode');
const User    = require('../models/User');
const protect = require('../middleware/auth');
const { sendEmail } = require('../services/email');
const { sanitizeUser } = require('../services/sanitize');
const { signToken, setTokenCookie } = require('../services/token');

// Per-token 2FA attempt tracking (S5: brute-force protection)
const twoFAAttempts = new Map();
const MAX_2FA_ATTEMPTS = 5;

setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, entry] of twoFAAttempts) {
    if (entry.ts < cutoff) twoFAAttempts.delete(key);
  }
}, 60000).unref();

function check2FAAttempts(tokenKey) {
  const entry = twoFAAttempts.get(tokenKey);
  if (entry && entry.count >= MAX_2FA_ATTEMPTS) return false;
  return true;
}

function record2FAFailure(tokenKey) {
  const entry = twoFAAttempts.get(tokenKey) || { count: 0, ts: Date.now() };
  entry.count += 1;
  entry.ts = Date.now();
  twoFAAttempts.set(tokenKey, entry);
}

// POST /api/auth/2fa/setup  — generate secret + QR code (C3: email 2FA sends verification code first)
router.post('/setup', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is already enabled' });
    }

    const { method } = req.body;

    if (method === 'email') {
      const code = crypto.randomInt(100000, 999999).toString();
      user._email2FACode = crypto.createHash('sha256').update(code).digest('hex');
      user._email2FACodeExpires = new Date(Date.now() + 5 * 60 * 1000);
      user.twoFactorMethod = 'email';
      await user.save();

      await sendEmail(
        user.email,
        'HeartConnect - Verify Email 2FA Setup',
        `<h2>Confirm Email 2FA</h2><p>Enter this code to enable email-based two-factor authentication:</p><h1 style="letter-spacing:4px;font-size:32px;">${code}</h1><p>This code expires in 5 minutes.</p>`
      );

      return res.json({ message: 'Verification code sent to your email. Enter it to enable 2FA.', method: 'email', requiresVerification: true });
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'HeartConnect', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    user.twoFactorSecret = secret;
    user.twoFactorMethod = 'totp';
    await user.save();

    res.json({ secret, qrCodeUrl, method: 'totp' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to setup 2FA' });
  }
});

// POST /api/auth/2fa/verify-setup  — verify first code and enable 2FA (handles both TOTP and email)
router.post('/verify-setup', protect, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id).select('+twoFactorSecret +_email2FACode +_email2FACodeExpires');

    if (user.twoFactorMethod === 'email') {
      const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
      if (!user._email2FACode || !user._email2FACodeExpires || user._email2FACodeExpires < new Date() || user._email2FACode !== hashedInput) {
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }
      user.twoFactorEnabled = true;
      user._email2FACode = undefined;
      user._email2FACodeExpires = undefined;
      await user.save();
      return res.json({ message: '2FA via email enabled successfully' });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: 'No 2FA setup in progress' });
    }

    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify 2FA' });
  }
});

// POST /api/auth/2fa/verify  — verify code during login (S5: per-token brute-force protection)
router.post('/verify', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET, { issuer: 'heartconnect', audience: 'heartconnect-api' });
    } catch {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }

    if (!decoded.requires2FA) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    const tokenKey = `${decoded.id}:${decoded.iat}`;
    if (!check2FAAttempts(tokenKey)) {
      return res.status(429).json({ message: 'Too many failed attempts. Please login again.' });
    }

    const user = await User.findById(decoded.id).select('+twoFactorSecret +_email2FACode +_email2FACodeExpires');
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    if (user.twoFactorMethod === 'totp') {
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
      if (!isValid) {
        record2FAFailure(tokenKey);
        return res.status(400).json({ message: 'Invalid verification code' });
      }
    } else if (user.twoFactorMethod === 'email') {
      const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
      if (!user._email2FACode || !user._email2FACodeExpires || user._email2FACodeExpires < new Date() || user._email2FACode !== hashedInput) {
        record2FAFailure(tokenKey);
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }
      user._email2FACode = undefined;
      user._email2FACodeExpires = undefined;
      await user.save();
    }

    const token = signToken(user._id, user.tokenVersion);
    setTokenCookie(res, token);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: '2FA verification failed' });
  }
});

// POST /api/auth/2fa/disable
router.post('/disable', protect, async (req, res) => {
  try {
    const { password, code } = req.body;
    const user = await User.findById(req.user._id).select('+password +twoFactorSecret');

    if (!(await user.matchPassword(password))) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    if (user.twoFactorMethod === 'totp' && user.twoFactorSecret) {
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorMethod = undefined;
    await user.save();

    res.json({ message: '2FA disabled' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to disable 2FA' });
  }
});

// POST /api/auth/2fa/send-email-code (B3: crypto.randomInt)
router.post('/send-email-code', async (req, res) => {
  try {
    const { tempToken } = req.body;
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET, { issuer: 'heartconnect', audience: 'heartconnect-api' });
    } catch {
      return res.status(401).json({ message: 'Session expired' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.twoFactorMethod !== 'email') {
      return res.status(400).json({ message: 'Invalid request' });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    user._email2FACode = crypto.createHash('sha256').update(code).digest('hex');
    user._email2FACodeExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendEmail(
      user.email,
      'HeartConnect - Your Login Code',
      `<h2>Your verification code</h2><p>Use this code to complete your login:</p><h1 style="letter-spacing:4px;font-size:32px;">${code}</h1><p>This code expires in 5 minutes.</p>`
    );

    res.json({ message: 'Code sent to your email' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send code' });
  }
});

module.exports = router;
