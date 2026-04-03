const router   = require('express').Router();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Report   = require('../models/Report');
const protect  = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { escapeRegex } = require('../middleware/validation');

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

    // Single aggregation for all report tallies (replaces N+1 queries)
    const userIds = users.map((u) => u._id);
    const tallies = await Report.aggregate([
      { $match: { targetType: 'user', targetId: { $in: userIds } } },
      { $group: { _id: { targetId: '$targetId', status: '$status' }, count: { $sum: 1 } } },
    ]);
    const tallyMap = new Map();
    for (const t of tallies) {
      const key = String(t._id.targetId);
      if (!tallyMap.has(key)) tallyMap.set(key, { reviewed: 0, pending: 0 });
      const entry = tallyMap.get(key);
      if (t._id.status === 'reviewed') entry.reviewed = t.count;
      if (t._id.status === 'pending') entry.pending = t.count;
    }
    const withTally = users.map((u) => ({
      ...u.toObject(),
      reportTally: tallyMap.get(String(u._id)) || { reviewed: 0, pending: 0 },
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
