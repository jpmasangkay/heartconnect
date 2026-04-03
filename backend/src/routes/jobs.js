const router      = require('express').Router();
const Job         = require('../models/Job');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const protect     = require('../middleware/auth');
const { validateJobInput, validateApplicationInput, escapeRegex } = require('../middleware/validation');
const cache       = require('../services/cache');

// GET /api/jobs/categories  — returns unique skills from all open jobs (no duplicates)
router.get('/categories', async (req, res) => {
  try {
    const cached = cache.get('job:categories');
    if (cached) return res.json(cached);

    // Use distinct() — MongoDB returns unique values server-side, no document loading
    const skills = await Job.distinct('skills', { status: 'open' });
    const filtered = skills.filter((s) => s && s.trim()).map((s) => s.trim()).sort();
    const result = { categories: filtered };
    cache.set('job:categories', result, 5 * 60 * 1000); // 5 min TTL
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// GET /api/jobs  (public, with filters — only open jobs shown by default)
router.get('/', async (req, res) => {
  try {
    const {
      search, skill, budgetMin, budgetMax, status,
      skills, deadlineBefore, deadlineAfter, locationType,
      page = 1, limit = 10,
    } = req.query;
    const query = {};

    // Allowlist valid statuses to prevent arbitrary query injection
    const VALID_STATUSES = ['open', 'closed', 'in-progress', 'completed'];
    query.status = VALID_STATUSES.includes(status) ? status : 'open';

    // Clamp page and limit to safe ranges
    const safePage  = Math.max(1, Math.min(Number(page)  || 1,  1000));
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10,  50));

    // Escape regex to prevent NoSQL injection
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    // Filter by a single skill name
    if (skill) {
      query.skills = { $regex: new RegExp(`^${escapeRegex(skill)}$`, 'i') };
    }

    // Filter by multiple skills (comma-separated)
    if (skills) {
      const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean);
      if (skillList.length > 0) {
        query.skills = { $all: skillList.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i')) };
      }
    }

    // Validate budget numbers before using them in query
    const parsedMin = parseFloat(budgetMin);
    const parsedMax = parseFloat(budgetMax);
    if (!isNaN(parsedMin) || !isNaN(parsedMax)) {
      query.budget = {};
      if (!isNaN(parsedMin) && parsedMin >= 0) query.budget.$gte = parsedMin;
      if (!isNaN(parsedMax) && parsedMax >= 0) query.budget.$lte = parsedMax;
    }

    // Deadline filters
    if (deadlineBefore || deadlineAfter) {
      query.deadline = {};
      if (deadlineBefore) {
        const before = new Date(deadlineBefore);
        if (!isNaN(before.getTime())) query.deadline.$lte = before;
      }
      if (deadlineAfter) {
        const after = new Date(deadlineAfter);
        if (!isNaN(after.getTime())) query.deadline.$gte = after;
      }
    }

    // Location type filter
    const VALID_LOCATION_TYPES = ['remote', 'on-site', 'hybrid'];
    if (locationType && VALID_LOCATION_TYPES.includes(locationType)) {
      query.locationType = locationType;
    }

    const total = await Job.countDocuments(query);
    const jobs  = await Job.find(query)
      .populate('client', 'name avatar')
      .populate('applicationsCount')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean();

    res.json({ data: jobs, total, pages: Math.ceil(total / safeLimit), page: safePage });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/my  (must be before /:id)
router.get('/my', protect, async (req, res) => {
  try {
    const jobs = await Job.find({ client: req.user._id })
      .populate('applicationsCount')
      .sort({ createdAt: -1 })
      .lean();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('client', 'name avatar bio location')
      .populate('applicationsCount');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch job' });
  }
});

// POST /api/jobs
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'client')
      return res.status(403).json({ message: 'Only clients can post jobs' });

    const validation = validateJobInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const allowed = ['title', 'description', 'budget', 'budgetType', 'deadline', 'skills', 'locationType'];
    const safeData = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const job = await Job.create({
      ...safeData,
      client: req.user._id,
    });
    await job.populate('client', 'name avatar');
    cache.del('job:categories'); // invalidate categories cache
    req.app.locals.io.emit('job:created', { _id: job._id });
    res.status(201).json(job);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create job' });
  }
});

// PUT /api/jobs/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.client.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const validation = validateJobInput(req.body, { isUpdate: true });
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const allowed = ['title', 'description', 'budget', 'budgetType', 'deadline', 'skills', 'status', 'locationType'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const updated = await Job.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('client','name avatar');
    cache.del('job:categories');
    req.app.locals.io.emit('job:updated', { _id: updated._id, status: updated.status });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.client.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    const jobId = job._id;
    await job.deleteOne();
    cache.del('job:categories');
    req.app.locals.io.emit('job:deleted', { _id: jobId });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/jobs/:id/close
router.patch('/:id/close', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.client.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    job.status = 'closed';
    await job.save();

    // Auto-reject all pending applications when job is manually closed
    const rejectedApps = await Application.find(
      { job: job._id, status: { $in: ['pending', 'submitted'] } },
      'applicant'
    );
    await Application.updateMany(
      { job: job._id, status: { $in: ['pending', 'submitted'] } },
      { status: 'rejected' }
    );

    req.app.locals.io.emit('job:updated', job);

    // Batch-create all rejection notifications in a single DB call
    if (rejectedApps.length > 0) {
      const notifDocs = rejectedApps.map((app) => ({
        recipient: app.applicant,
        type: 'job_status',
        title: 'Job Closed',
        message: `The job "${job.title}" has been closed. Your application was rejected.`,
        link: `/jobs/${job._id}`,
        relatedJob: job._id,
        relatedApplication: app._id,
      }));
      await Notification.insertMany(notifDocs);

      for (const app of rejectedApps) {
        req.app.locals.io.to(`user:${app.applicant}`).emit('application:updated', {
          _id: app._id, job: job._id, status: 'rejected',
        });
        req.app.locals.io.to(`user:${app.applicant}`).emit('notification:new', {
          type: 'job_status', message: `The job "${job.title}" has been closed.`,
        });
      }
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/jobs/:id/complete  (client only, job must be closed first)
router.patch('/:id/complete', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.client.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    if (job.status !== 'closed')
      return res.status(400).json({ message: 'Job must be closed before marking as completed' });
    job.status = 'completed';
    await job.save();

    // Mark the accepted application as finished so the student sees it
    const acceptedApps = await Application.find(
      { job: job._id, status: 'accepted' },
      'applicant'
    );
    await Application.updateMany(
      { job: job._id, status: 'accepted' },
      { status: 'finished' }
    );

    req.app.locals.io.emit('job:updated', job);

    // Batch-create all completion notifications in a single DB call
    if (acceptedApps.length > 0) {
      const notifDocs = acceptedApps.map((app) => ({
        recipient: app.applicant,
        type: 'job_status',
        title: 'Job Completed',
        message: `The job "${job.title}" has been marked as completed. Leave a review!`,
        link: `/dashboard`,
        relatedJob: job._id,
        relatedApplication: app._id,
      }));
      await Notification.insertMany(notifDocs);

      for (const app of acceptedApps) {
        req.app.locals.io.to(`user:${app.applicant}`).emit('application:updated', {
          _id: app._id, job: job._id, status: 'finished',
        });
        req.app.locals.io.to(`user:${app.applicant}`).emit('notification:new', {
          type: 'job_status', message: `The job "${job.title}" has been completed!`,
        });
      }
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/jobs/:id/applications
router.post('/:id/applications', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student')
      return res.status(403).json({ message: 'Only students can apply' });

    const validation = validateApplicationInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const job = await Job.findById(req.params.id);
    if (!job || job.status !== 'open')
      return res.status(400).json({ message: 'Job not available' });

    const exists = await Application.findOne({ job: job._id, applicant: req.user._id });
    if (exists) return res.status(400).json({ message: 'Already applied' });

    const app = await Application.create({
      job: job._id,
      applicant: req.user._id,
      coverLetter: req.body.coverLetter,
      proposedRate: req.body.proposedRate,
    });
    await app.populate(['job', { path: 'applicant', select: 'name avatar bio skills university email role' }]);

    // Create notification for the job owner
    await Notification.create({
      recipient: job.client,
      type: 'application_new',
      title: 'New Application',
      message: `${req.user.name} applied for "${job.title}"`,
      link: `/jobs/${job._id}`,
      relatedJob: job._id,
      relatedApplication: app._id,
    });

    // Notify the job owner via socket
    req.app.locals.io.to(`user:${job.client}`).emit('application:new', app);
    req.app.locals.io.to(`user:${job.client}`).emit('notification:new', {
      type: 'application_new',
      message: `${req.user.name} applied for "${job.title}"`,
    });

    res.status(201).json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/jobs/:id/applications  (client only)
router.get('/:id/applications', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.client.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const { page = 1, limit = 20 } = req.query;
    const safePage  = Math.max(1, Math.min(Number(page)  || 1,  1000));
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));

    const query = { job: job._id };
    const total = await Application.countDocuments(query);
    const apps = await Application.find(query)
      .populate('applicant', 'name avatar bio skills university')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);
    res.json({ data: apps, total, pages: Math.ceil(total / safeLimit), page: safePage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
