const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true, maxlength: 100 },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, minlength: 12, select: false },
  role:      { type: String, enum: ['student', 'client', 'admin'], required: true },
  avatar:    { type: String },
  bio:       { type: String, maxlength: 2000 },
  skills:    [{ type: String }],
  location:  { type: String, maxlength: 200 },
  university:{ type: String, maxlength: 200 },
  portfolio: { type: String, maxlength: 500 },

  // Account security
  failedAttempts: { type: Number, default: 0 },
  lockedUntil:    { type: Date },

  // Two-Factor Authentication
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret:  { type: String, select: false },
  twoFactorMethod:  { type: String, enum: ['totp', 'email'] },
  _email2FACode:    { type: String, select: false },
  _email2FACodeExpires: { type: Date, select: false },

  // Verification
  isVerified:         { type: Boolean, default: false },
  verificationMethod: { type: String, enum: ['school_email', 'id_upload', 'admin'] },
  verificationDoc:    { type: String },
  verificationStatus: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },

  // Password Reset
  resetPasswordToken:   { type: String },
  resetPasswordExpires: { type: Date },

  // Onboarding
  hasCompletedOnboarding: { type: Boolean, default: false },

  // Online presence
  lastSeen: { type: Date },

  // Blocking
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Banning
  isBanned:  { type: Boolean, default: false },
  banReason: { type: String },
  bannedAt:  { type: Date },

  // Legal consent
  agreedToTerms:   { type: Boolean, default: false },
  agreedToTermsAt: { type: Date },
}, { timestamps: true });

userSchema.index({ role: 1, verificationStatus: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
