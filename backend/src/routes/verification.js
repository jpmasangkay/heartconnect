const router    = require('express').Router();
const User      = require('../models/User');
const Notification = require('../models/Notification');
const protect   = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { verificationUpload } = require('../middleware/upload');

// Known school email domains (auto-verify)
const SCHOOL_DOMAINS = [
  '.edu', '.edu.ph', '.edu.au', '.edu.sg', '.ac.uk', '.edu.my',
];

function isSchoolEmail(email) {
  const domain = email.substring(email.lastIndexOf('@') + 1).toLowerCase();
  return SCHOOL_DOMAINS.some((suffix) => domain.endsWith(suffix));
}

// POST /api/verification/request  — submit verification
router.post('/request', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.verificationStatus === 'verified') {
      return res.status(400).json({ message: 'Already verified' });
    }
    if (user.verificationStatus === 'pending') {
      return res.status(400).json({ message: 'Verification already pending' });
    }

    const { method } = req.body;

    if (method === 'school_email') {
      // Auto-verify if email domain is a known school
      if (!isSchoolEmail(user.email)) {
        return res.status(400).json({
          message: 'Your email domain is not recognized as a school email. Try ID upload instead.',
        });
      }
      user.isVerified = true;
      user.verificationMethod = 'school_email';
      user.verificationStatus = 'verified';
      await user.save();

      return res.json({ message: 'Verified via school email', status: 'verified' });
    }

    if (method === 'id_upload') {
      // Return handler that accepts file
      return res.status(400).json({ message: 'Use the /request-upload endpoint for ID uploads' });
    }

    return res.status(400).json({ message: 'Invalid verification method. Use "school_email" or "id_upload"' });
  } catch (err) {
    res.status(500).json({ message: 'Verification request failed' });
  }
});

// POST /api/verification/request-upload  — submit ID photo
router.post('/request-upload', protect, verificationUpload.single('idPhoto'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.verificationStatus === 'verified') {
      return res.status(400).json({ message: 'Already verified' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'ID photo is required' });
    }

    user.verificationMethod = 'id_upload';
    user.verificationDoc = `/uploads/verification/${req.file.filename}`;
    user.verificationStatus = 'pending';
    await user.save();

    res.json({ message: 'ID uploaded. Awaiting admin review.', status: 'pending' });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

// GET /api/verification/status  — check own status
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'isVerified verificationMethod verificationStatus'
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch status' });
  }
});

// GET /api/verification/pending  — admin: list pending verifications
router.get('/pending', protect, adminAuth, async (req, res) => {
  try {
    const users = await User.find({ verificationStatus: 'pending' })
      .select('name email university verificationDoc verificationMethod verificationStatus createdAt')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending verifications' });
  }
});

// PATCH /api/verification/:userId/verify  — admin: approve or reject
router.patch('/:userId/verify', protect, adminAuth, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve" or "reject"' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (action === 'approve') {
      user.isVerified = true;
      user.verificationStatus = 'verified';
    } else {
      user.isVerified = false;
      user.verificationStatus = 'rejected';
    }
    await user.save();

    // Notify the user
    await Notification.create({
      recipient: user._id,
      type: 'verification_status',
      title: action === 'approve' ? 'Profile Verified!' : 'Verification Rejected',
      message: action === 'approve'
        ? 'Your profile has been verified by an admin.'
        : 'Your ID verification was rejected. Please try again with a clearer photo.',
      link: '/profile',
    });

    const io = req.app.locals.io;
    if (io) {
      io.to(`user:${user._id}`).emit('notification:new', {
        type: 'verification_status',
        message: action === 'approve' ? 'Your profile has been verified!' : 'Your verification was rejected.',
      });
    }

    res.json({ message: `User ${action}d`, user: { _id: user._id, verificationStatus: user.verificationStatus } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update verification' });
  }
});

// PATCH /api/verification/:userId/manual-verify  — admin: directly verify
router.patch('/:userId/manual-verify', protect, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isVerified = true;
    user.verificationMethod = 'admin';
    user.verificationStatus = 'verified';
    await user.save();

    // Notify user
    await Notification.create({
      recipient: user._id,
      type: 'verification_status',
      title: 'Profile Verified!',
      message: 'An admin has verified your profile.',
      link: '/profile',
    });

    const io = req.app.locals.io;
    if (io) {
      io.to(`user:${user._id}`).emit('notification:new', {
        type: 'verification_status',
        message: 'Your profile has been verified by an admin!',
      });
    }

    res.json({ message: 'User manually verified' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify user' });
  }
});

module.exports = router;
