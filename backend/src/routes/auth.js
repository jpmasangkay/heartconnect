const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const User    = require('../models/User');
const protect = require('../middleware/auth');
const { sendEmail } = require('../services/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
    issuer: 'heartconnect',
    audience: 'heartconnect-api',
  });

const signTempToken = (id) =>
  jwt.sign({ id, requires2FA: true }, process.env.JWT_SECRET, {
    expiresIn: '5m',
    issuer: 'heartconnect',
    audience: 'heartconnect-api',
  });

// Password complexity validation
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain numbers');
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain special characters (@$!%*?&)');
  }
  
  return { valid: errors.length === 0, errors };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, university, agreedToTerms } = req.body;

    // Must agree to terms
    if (!agreedToTerms) {
      return res.status(400).json({ message: 'You must agree to the Terms of Service and Privacy Policy' });
    }
    
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }
    
    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already in use' });

    const user  = await User.create({ name, email, password, role, university, agreedToTerms: true, agreedToTermsAt: new Date() });
    const token = signToken(user._id);
    res.status(201).json({ token, user: { ...user.toObject(), password: undefined, twoFactorSecret: undefined } });
  } catch (err) {
    console.error('Registration error:', err);
    // Return Mongoose validation errors if available
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

    const user = await User.findOne({ email }).select('+password +_email2FACode');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(429).json({ 
        message: `Account locked. Try again in ${minutesLeft} minutes.` 
      });
    }
    
    // Check password
    if (!(await user.matchPassword(password))) {
      // Increment failed attempts
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts
      if (user.failedAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await user.save();
        return res.status(429).json({ 
          message: 'Too many failed attempts. Account locked for 30 minutes.' 
        });
      }
      
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Reset failed attempts on successful login
    user.failedAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    // If 2FA is enabled, return temp token and require 2FA verification
    if (user.twoFactorEnabled) {
      const tempToken = signTempToken(user._id);

      // If email 2FA, auto-send the code
      if (user.twoFactorMethod === 'email') {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user._email2FACode = crypto.createHash('sha256').update(code).digest('hex');
        user._email2FACodeExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();
        await sendEmail(
          user.email,
          'HeartConnect - Your Login Code',
          `<h2>Your verification code</h2><p>Use this code to complete your login:</p><h1 style="letter-spacing:4px;font-size:32px;">${code}</h1><p>This code expires in 5 minutes.</p>`
        );
      }

      return res.json({
        requires2FA: true,
        tempToken,
        twoFactorMethod: user.twoFactorMethod,
      });
    }

    const token = signToken(user._id);
    res.json({ token, user: { ...user.toObject(), password: undefined, twoFactorSecret: undefined } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  const userObj = req.user.toObject ? req.user.toObject() : { ...req.user };
  delete userObj.password;
  delete userObj.twoFactorSecret;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;
  delete userObj._email2FACode;
  res.json(userObj);
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = ['name','avatar','bio','skills','location','university','portfolio'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password -twoFactorSecret -resetPasswordToken -resetPasswordExpires');
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update profile' });
  }
});

// PUT /api/auth/password
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }
    
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ message: 'Incorrect current password' });

    user.password = newPassword;
    // Invalidate all existing tokens by resetting user
    user.failedAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();
    
    res.json({ message: 'Password updated. Please login again.' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to change password' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    await sendEmail(
      user.email,
      'HeartConnect - Reset Your Password',
      `<h2>Password Reset Request</h2>
       <p>You requested a password reset. Click the link below to set a new password:</p>
       <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
       <p style="margin-top:16px;color:#666;">This link expires in 30 minutes. If you didn't request this, ignore this email.</p>`
    );

    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
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
    await user.save();

    res.json({ message: 'Password reset successful. You can now login.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// PATCH /api/auth/onboarding-complete
router.patch('/onboarding-complete', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { hasCompletedOnboarding: true },
      { new: true }
    ).select('-password -twoFactorSecret -resetPasswordToken -resetPasswordExpires');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update onboarding status' });
  }
});

// GET /api/auth/users/:id  (public profile)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name role university bio skills location portfolio createdAt isVerified verificationStatus');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch {
    res.status(400).json({ message: 'Invalid user ID' });
  }
});

module.exports = router;
