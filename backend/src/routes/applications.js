const router      = require('express').Router();
const Application = require('../models/Application');
const Job         = require('../models/Job');
const Notification = require('../models/Notification');
const protect     = require('../middleware/auth');
const { sendEmail } = require('../services/email');
const { escapeHtml } = require('../services/sanitize');

// GET /api/applications/my
router.get('/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const safePage  = Math.max(1, Math.min(Number(page)  || 1,  1000));
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));

    const query = { applicant: req.user._id };
    const total = await Application.countDocuments(query);
    const apps = await Application.find(query)
      .populate('job')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);
    // If a job was deleted after the student applied, populate returns null.
    const data = apps.filter((a) => a.job != null);
    res.json({ data, total, pages: Math.ceil(total / safeLimit), page: safePage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/applications/:id/status  (client changes status)
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id).populate('job');
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (app.job.client.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const VALID_CLIENT_STATUSES = ['accepted', 'rejected'];
    const newStatus = req.body.status;
    if (!VALID_CLIENT_STATUSES.includes(newStatus)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    app.status = newStatus;
    await app.save();

    // If client accepts an applicant:
    // 1. Auto-reject all other pending applications for this job
    // 2. Close the job so it disappears from the job board
    if (newStatus === 'accepted') {
      const rejectedApps = await Application.find(
        {
          job: app.job._id,
          _id: { $ne: app._id },
          status: { $in: ['pending', 'submitted'] },
        },
        'applicant'
      );
      await Application.updateMany(
        {
          job: app.job._id,
          _id: { $ne: app._id },
          status: { $in: ['pending', 'submitted'] },
        },
        { status: 'rejected' }
      );
      const updatedJob = await Job.findByIdAndUpdate(app.job._id, { status: 'closed' }, { new: true });

      req.app.locals.io.emit('job:updated', updatedJob);
      for (const rejected of rejectedApps) {
        // Create notification for rejected applicants
        await Notification.create({
          recipient: rejected.applicant,
          type: 'application_status',
          title: 'Application Rejected',
          message: `Your application for "${app.job.title}" was rejected.`,
          link: `/dashboard`,
          relatedJob: app.job._id,
          relatedApplication: rejected._id,
        });
        req.app.locals.io.to(`user:${rejected.applicant}`).emit('application:updated', {
          _id: rejected._id, job: app.job._id, status: 'rejected',
        });
        req.app.locals.io.to(`user:${rejected.applicant}`).emit('notification:new', {
          type: 'application_status', message: `Your application for "${app.job.title}" was rejected.`,
        });
      }
    }

    await app.populate('applicant', 'name avatar bio skills university email');

    // Create notification for the applicant
    const statusLabel = newStatus === 'accepted' ? 'Accepted' : 'Rejected';
    await Notification.create({
      recipient: app.applicant._id,
      type: 'application_status',
      title: `Application ${statusLabel}`,
      message: `Your application for "${app.job.title}" was ${newStatus}.`,
      link: `/dashboard`,
      relatedJob: app.job._id,
      relatedApplication: app._id,
    });

    // Send email notification
    await sendEmail(
      app.applicant.email,
      `HeartConnect - Application ${statusLabel}`,
      `<h2>Application ${statusLabel}</h2>
       <p>Your application for <strong>${escapeHtml(app.job.title)}</strong> has been <strong>${newStatus}</strong>.</p>
       <p>Log in to HeartConnect to see details.</p>`
    );

    // Notify the applicant about their status change
    req.app.locals.io.to(`user:${app.applicant._id}`).emit('application:updated', {
      _id: app._id, job: app.job._id, status: newStatus,
    });
    req.app.locals.io.to(`user:${app.applicant._id}`).emit('notification:new', {
      type: 'application_status', message: `Your application for "${app.job.title}" was ${newStatus}.`,
    });

    res.json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/applications/:id/withdraw  (student withdraws)
router.patch('/:id/withdraw', protect, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (app.applicant.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    app.status = 'withdrawn';
    await app.save();

    // Notify the job owner about the withdrawal
    const job = await Job.findById(app.job, 'client title');
    if (job) {
      await Notification.create({
        recipient: job.client,
        type: 'application_status',
        title: 'Application Withdrawn',
        message: `${req.user.name} withdrew their application for "${job.title}".`,
        link: `/jobs/${job._id}`,
        relatedJob: job._id,
        relatedApplication: app._id,
      });
      req.app.locals.io.to(`user:${job.client}`).emit('application:updated', {
        _id: app._id, job: app.job, status: 'withdrawn',
      });
      req.app.locals.io.to(`user:${job.client}`).emit('notification:new', {
        type: 'application_status', message: `${req.user.name} withdrew their application for "${job.title}".`,
      });
    }

    res.json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
