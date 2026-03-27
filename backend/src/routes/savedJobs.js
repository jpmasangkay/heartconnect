const router   = require('express').Router();
const SavedJob = require('../models/SavedJob');
const Job      = require('../models/Job');
const protect  = require('../middleware/auth');

// GET /api/saved-jobs  — list saved jobs
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const safePage  = Math.max(1, Math.min(Number(page)  || 1,  1000));
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));

    const query = { user: req.user._id };
    const total = await SavedJob.countDocuments(query);
    const saved = await SavedJob.find(query)
      .populate({
        path: 'job',
        populate: [
          { path: 'client', select: 'name avatar' },
          { path: 'applicationsCount' },
        ],
      })
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);
    // Filter out deleted jobs and closed/completed ones
    const data = saved.filter((s) => s.job != null && !['closed', 'completed'].includes(s.job.status));
    res.json({ data, total, pages: Math.ceil(total / safeLimit), page: safePage });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch saved jobs' });
  }
});

// GET /api/saved-jobs/check/:jobId  — is this job saved?
router.get('/check/:jobId', protect, async (req, res) => {
  try {
    const exists = await SavedJob.findOne({ user: req.user._id, job: req.params.jobId });
    res.json({ saved: !!exists });
  } catch (err) {
    res.status(400).json({ message: 'Invalid job ID' });
  }
});

// POST /api/saved-jobs  — save a job
router.post('/', protect, async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const existing = await SavedJob.findOne({ user: req.user._id, job: jobId });
    if (existing) return res.status(400).json({ message: 'Job already saved' });

    const saved = await SavedJob.create({ user: req.user._id, job: jobId });
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: 'Failed to save job' });
  }
});

// DELETE /api/saved-jobs/:jobId  — unsave a job
router.delete('/:jobId', protect, async (req, res) => {
  try {
    const result = await SavedJob.findOneAndDelete({ user: req.user._id, job: req.params.jobId });
    if (!result) return res.status(404).json({ message: 'Saved job not found' });
    res.json({ message: 'Job unsaved' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to unsave job' });
  }
});

module.exports = router;
