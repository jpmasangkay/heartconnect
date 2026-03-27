const router  = require('express').Router();
const User    = require('../models/User');
const protect = require('../middleware/auth');

// POST /api/blocks/:userId — block a user
router.post('/:userId', protect, async (req, res) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const user = await User.findById(req.user._id);
    if (user.blockedUsers.map(String).includes(targetId)) {
      return res.status(400).json({ message: 'User already blocked' });
    }

    user.blockedUsers.push(targetId);
    await user.save();

    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to block user' });
  }
});

// DELETE /api/blocks/:userId — unblock a user
router.delete('/:userId', protect, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const user = await User.findById(req.user._id);

    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== targetId
    );
    await user.save();

    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to unblock user' });
  }
});

// GET /api/blocks — list blocked users
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('blockedUsers', 'name avatar');
    res.json(user.blockedUsers || []);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch blocked users' });
  }
});

// GET /api/blocks/check/:userId — check if a user is blocked
router.get('/check/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const isBlocked = user.blockedUsers.map(String).includes(req.params.userId);
    res.json({ blocked: isBlocked });
  } catch (err) {
    res.status(400).json({ message: 'Failed to check block status' });
  }
});

module.exports = router;
