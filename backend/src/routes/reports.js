const router  = require('express').Router();
const Report  = require('../models/Report');
const protect = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { reportSchema, validate } = require('../middleware/schemas');

// POST /api/reports — submit a report
router.post('/', protect, async (req, res) => {
  try {
    const v = validate(reportSchema, req.body);
    if (!v.valid) return res.status(400).json({ errors: v.errors });

    // Prevent duplicate reports
    const existing = await Report.findOne({
      reporter: req.user._id,
      targetType: v.data.targetType,
      targetId: v.data.targetId,
      status: 'pending',
    });
    if (existing) {
      return res.status(400).json({ message: 'You have already reported this' });
    }

    const report = await Report.create({
      reporter: req.user._id,
      ...v.data,
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ message: 'Failed to submit report' });
  }
});

// GET /api/reports — admin: list reports (paginated)
router.get('/', protect, adminAuth, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const safePage  = Math.max(1, Math.min(Number(page)  || 1,  1000));
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));

    const query = {};
    if (['pending', 'reviewed', 'dismissed'].includes(status)) {
      query.status = status;
    }

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .populate('reporter', 'name email avatar')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    res.json({ data: reports, total, pages: Math.ceil(total / safeLimit), page: safePage });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// PATCH /api/reports/:id — admin: resolve a report
router.patch('/:id', protect, adminAuth, async (req, res) => {
  try {
    const { action } = req.body; // 'reviewed' or 'dismissed'
    if (!['reviewed', 'dismissed'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "reviewed" or "dismissed"' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = action;
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    await report.save();

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to resolve report' });
  }
});

module.exports = router;
