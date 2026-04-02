const router   = require('express').Router();
const User     = require('../models/User');
const Report   = require('../models/Report');
const protect  = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { escapeRegex } = require('../middleware/schemas');

// GET /api/admin/users — list all users with ban status + report tally
router.get('/users', protect, adminAuth, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const safePage  = Math.max(1, Math.min(Number(page)  || 1,  1000));
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));

    const escaped = escapeRegex(search);
    const query = escaped
      ? { $or: [{ name: new RegExp(escaped, 'i') }, { email: new RegExp(escaped, 'i') }] }
      : {};

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('name email role avatar isBanned banReason bannedAt createdAt verificationStatus')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    // Attach report tally for each user
    const withTally = await Promise.all(users.map(async (u) => {
      const [reviewed, pending] = await Promise.all([
        Report.countDocuments({ targetType: 'user', targetId: u._id, status: 'reviewed' }),
        Report.countDocuments({ targetType: 'user', targetId: u._id, status: 'pending' }),
      ]);
      return { ...u.toObject(), reportTally: { reviewed, pending } };
    }));

    res.json({ data: withTally, total, pages: Math.ceil(total / safeLimit), page: safePage });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// POST /api/admin/ban/:userId — manually ban a user
router.post('/ban/:userId', protect, adminAuth, async (req, res) => {
  try {
    const { reason = 'Manually banned by admin' } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot ban an admin' });

    user.isBanned  = true;
    user.banReason = reason;
    user.bannedAt  = new Date();
    await user.save();

    res.json({ message: 'User banned', user: { _id: user._id, name: user.name, isBanned: true, banReason: user.banReason } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to ban user' });
  }
});

// POST /api/admin/unban/:userId — manually unban a user
router.post('/unban/:userId', protect, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned  = false;
    user.banReason = undefined;
    user.bannedAt  = undefined;
    await user.save();

    res.json({ message: 'User unbanned', user: { _id: user._id, name: user.name, isBanned: false } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unban user' });
  }
});

module.exports = router;
