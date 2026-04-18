const router  = require('express').Router();
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const User    = require('../models/User');
const protect = require('../middleware/auth');
const { sendEmail } = require('../services/email');
const { sanitizeUser, escapeHtml } = require('../services/sanitize');
const { signToken, signTempToken, setTokenCookie, clearTokenCookie } = require('../services/token');
const { registerSchema, profileUpdateSchema, validate } = require('../middleware/schemas');

// Lazy-initialized dummy hash to prevent timing side-channel on user-not-found
let _dummyHash = null;
async function getDummyHash() {
  if (!_dummyHash) _dummyHash = await bcrypt.hash('dummy-password-for-timing', 10);
  return _dummyHash;
}

const validatePasswordStrength = (password) => {
  const errors = [];
  if (password.length < 12) errors.push('Password must be at least 12 characters');
  if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letters');
  if (!/\d/.test(password)) errors.push('Password must contain numbers');
  if (!/[@$!%*?&]/.test(password)) errors.push('Password must contain special characters (@$!%*?&)');
  return { valid: errors.length === 0, errors };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const parsed = validate(registerSchema, req.body);
    if (!parsed.valid) {
      return res.status(400).json({ errors: parsed.errors });
    }

    const { name, email, password, role, university, agreedToTerms } = parsed.data;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Password is required' });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }

    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already in use' });

    const safeData = { name, email, password, role };
    if (university) safeData.university = university;

    const user  = await User.create({ ...safeData, agreedToTerms, agreedToTermsAt: new Date() });
    const token = signToken(user._id, user.tokenVersion);
    setTokenCookie(res, token);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ errors: messages });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    res.status(400).json({ message: err.message || 'Failed to register' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    const email =
      typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    const { password } = req.body;
    if (!email || password == null || password === '') {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password +_email2FACode +_email2FACodeExpires');

    if (!user) {
      await bcrypt.compare(password, await getDummyHash());
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(429).json({
        message: `Account locked. Try again in ${minutesLeft} minutes.`
      });
    }

    // B2: Reset failed attempts when lock has expired (persist to DB before password check)
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await User.updateOne({ _id: user._id }, { failedAttempts: 0, $unset: { lockedUntil: 1 } });
    }

    // Check password
    if (!(await user.matchPassword(password))) {
      // B4: Atomic increment to avoid race conditions
      const updated = await User.findOneAndUpdate(
        { _id: user._id },
        { $inc: { failedAttempts: 1 } },
        { new: true }
      );

      if (updated.failedAttempts >= 5) {
        await User.updateOne(
          { _id: user._id },
          { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }
        );
        return res.status(429).json({
          message: 'Too many failed attempts. Account locked for 30 minutes.'
        });
      }

      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // L2: Reset failed attempts fire-and-forget on successful login
    User.updateOne(
      { _id: user._id },
      { failedAttempts: 0, $unset: { lockedUntil: 1 } }
    ).catch(() => {});

    // Block banned users from logging in
    if (user.isBanned) {
      const adminEmail = process.env.ADMIN_EMAIL;
      return res.status(403).json({
        message: `Your account has been banned. Reason: ${user.banReason || 'Violation of terms of service'}. Please contact the admin at ${adminEmail} for assistance.`,
        isBanned: true,
        banReason: user.banReason || null,
        adminEmail,
      });
    }

    // If 2FA is enabled, return temp token and require 2FA verification
    if (user.twoFactorEnabled) {
      const tempToken = signTempToken(user._id);

      // If email 2FA, auto-send the code (L1: fire-and-forget)
      if (user.twoFactorMethod === 'email') {
        const code = crypto.randomInt(100000, 999999).toString();
        user._email2FACode = crypto.createHash('sha256').update(code).digest('hex');
        user._email2FACodeExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();
        sendEmail(
          user.email,
          'HeartConnect - Your Login Code',
          `<h2>Your verification code</h2><p>Use this code to complete your login:</p><h1 style="letter-spacing:4px;font-size:32px;">${code}</h1><p>This code expires in 5 minutes.</p>`
        ).catch((err) => console.error('2FA email error:', err));
      }

      return res.json({
        requires2FA: true,
        tempToken,
        twoFactorMethod: user.twoFactorMethod,
      });
    }

    const token = signToken(user._id, user.tokenVersion);
    setTokenCookie(res, token);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  const socketToken = signToken(req.user._id, req.user.tokenVersion);
  res.json({ ...sanitizeUser(req.user), socketToken });
});

// PUT /api/auth/profile (P4: Zod-validated, C4: sanitizeUser)
router.put('/profile', protect, async (req, res) => {
  try {
    const parsed = validate(profileUpdateSchema, req.body);
    if (!parsed.valid) {
      return res.status(400).json({ errors: parsed.errors });
    }
    const user = await User.findByIdAndUpdate(req.user._id, parsed.data, { new: true, runValidators: true });
    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(400).json({ message: 'Failed to update profile' });
  }
});

// PUT /api/auth/password (B1: select +password, B6: guard undefined, S6: bump tokenVersion)
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'New password is required' });
    }
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ message: 'Current password is required' });
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ message: 'Incorrect current password' });

    user.password = newPassword;
    user.failedAttempts = 0;
    user.lockedUntil = undefined;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    const token = signToken(user._id, user.tokenVersion);
    setTokenCookie(res, token);
    res.json({ message: 'Password updated successfully.', token });
  } catch (err) {
    res.status(400).json({ message: 'Failed to change password' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearTokenCookie(res);
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    await sendEmail(
      user.email,
      'HeartConnect - Reset Your Password',
      `<h2>Password Reset Request</h2>
       <p>You requested a password reset. Click the link below to set a new password:</p>
       <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
       <p style="margin-top:16px;color:#666;">This link expires in 30 minutes. If you didn't request this, ignore this email.</p>`
    );

    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password (S6: bump tokenVersion)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.failedAttempts = 0;
    user.lockedUntil = undefined;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    res.json({ message: 'Password reset successful. You can now login.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// PATCH /api/auth/onboarding-complete (C4: sanitizeUser)
router.patch('/onboarding-complete', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { hasCompletedOnboarding: true },
      { new: true }
    );
    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(500).json({ message: 'Failed to update onboarding status' });
  }
});

// GET /api/auth/users/:id  (public profile, L4: cache header)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name role university bio skills location portfolio createdAt isVerified verificationStatus');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.set('Cache-Control', 'public, max-age=60');
    res.json(user);
  } catch {
    res.status(400).json({ message: 'Invalid user ID' });
  }
});

module.exports = router;
