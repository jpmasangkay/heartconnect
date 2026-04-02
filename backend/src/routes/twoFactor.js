const router  = require('express').Router();
const { authenticator } = require('otplib');
const QRCode  = require('qrcode');
const User    = require('../models/User');
const protect = require('../middleware/auth');
const jwt     = require('jsonwebtoken');
const { sendEmail } = require('../services/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
    issuer: 'heartconnect',
    audience: 'heartconnect-api',
  });

// POST /api/auth/2fa/setup  — generate secret + QR code
router.post('/setup', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is already enabled' });
    }

    const { method } = req.body; // 'totp' or 'email'

    if (method === 'email') {
      user.twoFactorMethod = 'email';
      user.twoFactorEnabled = true;
      user.twoFactorSecret = undefined;
      await user.save();
      return res.json({ message: '2FA via email enabled', method: 'email' });
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'HeartConnect', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Store secret temporarily (not enabled until verified)
    user.twoFactorSecret = secret;
    user.twoFactorMethod = 'totp';
    await user.save();

    res.json({ secret, qrCodeUrl, method: 'totp' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to setup 2FA' });
  }
});

// POST /api/auth/2fa/verify-setup  — verify first code and enable 2FA
router.post('/verify-setup', protect, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

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

// POST /api/auth/2fa/verify  — verify code during login
router.post('/verify', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    // Decode temp token (short-lived, 5 min)
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET, { issuer: 'heartconnect', audience: 'heartconnect-api' });
    } catch {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }

    if (!decoded.requires2FA) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    const user = await User.findById(decoded.id).select('+_email2FACode +_email2FACodeExpires');
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    if (user.twoFactorMethod === 'totp') {
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }
    } else if (user.twoFactorMethod === 'email') {
      // For email 2FA, validate with the stored temp code (hashed)
      const hashedInput = require('crypto').createHash('sha256').update(code).digest('hex');
      if (!user._email2FACode || !user._email2FACodeExpires || user._email2FACodeExpires < new Date() || user._email2FACode !== hashedInput) {
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }
      // Clear used code
      user._email2FACode = undefined;
      user._email2FACodeExpires = undefined;
      await user.save();
    }

    // Issue full token
    const token = signToken(user._id);
    res.json({ token, user: { ...user.toObject(), password: undefined, twoFactorSecret: undefined } });
  } catch (err) {
    res.status(500).json({ message: '2FA verification failed' });
  }
});

// POST /api/auth/2fa/disable  — disable 2FA
router.post('/disable', protect, async (req, res) => {
  try {
    const { password, code } = req.body;
    const user = await User.findById(req.user._id);

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

// POST /api/auth/2fa/send-email-code  — send 2FA code via email (for email method)
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

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user._email2FACode = require('crypto').createHash('sha256').update(code).digest('hex');
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
