const router      = require('express').Router();
const Review      = require('../models/Review');
const Job         = require('../models/Job');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const protect     = require('../middleware/auth');

// POST /api/reviews  — create a review (only for completed jobs)
router.post('/', protect, async (req, res) => {
  try {
    const { jobId, revieweeId, rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Verify job is completed
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.status !== 'completed') {
      return res.status(400).json({ message: 'Job must be completed before reviewing' });
    }

    // Verify reviewer is a participant (client or accepted applicant)
    const isClient = job.client.toString() === req.user._id.toString();
    const application = await Application.findOne({
      job: jobId, applicant: req.user._id, status: 'finished',
    });
    if (!isClient && !application) {
      return res.status(403).json({ message: 'Only job participants can leave reviews' });
    }

    // Prevent reviewing yourself
    if (revieweeId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot review yourself' });
    }

    // Check for existing review
    const existing = await Review.findOne({ job: jobId, reviewer: req.user._id });
    if (existing) return res.status(400).json({ message: 'You have already reviewed this job' });

    const review = await Review.create({
      job: jobId,
      reviewer: req.user._id,
      reviewee: revieweeId,
      rating,
      comment: comment?.trim() || '',
    });
    await review.populate('reviewer', 'name avatar');

    // Create notification for reviewee
    await Notification.create({
      recipient: revieweeId,
      type: 'review_new',
      title: 'New Review',
      message: `${req.user.name} left you a ${rating}-star review`,
      link: `/users/${req.user._id}`,
      relatedJob: jobId,
    });
    const io = req.app.locals.io;
    if (io) {
      io.to(`user:${revieweeId}`).emit('notification:new', {
        type: 'review_new',
        message: `${req.user.name} left you a ${rating}-star review`,
      });
    }

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this job' });
    }
    res.status(400).json({ message: 'Failed to create review' });
  }
});

// GET /api/reviews/user/:userId  — get reviews for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const safePage  = Math.max(1, Math.min(Number(page)  || 1,  1000));
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));

    const query = { reviewee: req.params.userId };
    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate('reviewer', 'name avatar')
      .populate('job', 'title')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    // Calculate average rating across ALL reviews (not just this page)
    const allReviews = await Review.find(query, 'rating');
    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    res.json({
      data: reviews,
      avgRating: Math.round(avgRating * 10) / 10,
      total,
      pages: Math.ceil(total / safeLimit),
      page: safePage,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/job/:jobId  — get reviews for a job
router.get('/job/:jobId', async (req, res) => {
  try {
    const reviews = await Review.find({ job: req.params.jobId })
      .populate('reviewer', 'name avatar')
      .populate('reviewee', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/pending  — jobs user can review but hasn't yet
router.get('/pending', protect, async (req, res) => {
  try {
    // Find completed jobs where user is client or finished applicant
    const asClient = await Job.find({ client: req.user._id, status: 'completed' }, '_id');
    const asApplicant = await Application.find(
      { applicant: req.user._id, status: 'finished' },
      'job'
    );

    const jobIds = [
      ...asClient.map((j) => j._id),
      ...asApplicant.map((a) => a.job),
    ];

    // Find which of these the user has already reviewed
    const reviewed = await Review.find(
      { reviewer: req.user._id, job: { $in: jobIds } },
      'job'
    );
    const reviewedIds = new Set(reviewed.map((r) => r.job.toString()));

    const pendingJobIds = jobIds.filter((id) => !reviewedIds.has(id.toString()));

    const jobs = await Job.find({ _id: { $in: pendingJobIds } })
      .populate('client', 'name avatar');

    // For each job, find the other participant
    const result = [];
    for (const job of jobs) {
      const isClient = job.client._id.toString() === req.user._id.toString();
      if (isClient) {
        // Client reviews the accepted applicant
        const app = await Application.findOne({ job: job._id, status: 'finished' })
          .populate('applicant', 'name avatar');
        if (app) {
          result.push({ job, reviewee: app.applicant });
        }
      } else {
        // Student reviews the client
        result.push({ job, reviewee: job.client });
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending reviews' });
  }
});

module.exports = router;
