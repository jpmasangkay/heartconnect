const { z } = require('zod');

// ─── Job ──────────────────────────────────────────────────────────────────────
const JOB_CATEGORIES = [
  'Web Development','Graphic Design','Cybersecurity','Marketing',
  'Data Science','Mobile Development','Content Writing','UI/UX Design','Other',
];
const JOB_STATUSES = ['open', 'closed', 'in-progress', 'completed'];
const LOCATION_TYPES = ['remote', 'on-site', 'hybrid'];

const jobCreateSchema = z.object({
  title: z.string().trim().min(5, 'Title must be 5-200 characters').max(200),
  description: z.string().trim().min(20, 'Description must be 20-10000 characters').max(10000),
  category: z.enum(JOB_CATEGORIES).optional(),
  budget: z.number().positive('Budget must be positive').max(1000000, 'Budget max is 1,000,000'),
  budgetType: z.enum(['fixed', 'hourly']),
  deadline: z.string().refine((d) => {
    const ms = new Date(d).getTime();
    return !Number.isNaN(ms) && ms > Date.now();
  }, 'Deadline must be a valid future date'),
  skills: z.array(z.string().trim().min(1).max(50)).min(1, 'At least one skill is required'),
  locationType: z.enum(LOCATION_TYPES).optional().default('remote'),
});

const jobUpdateSchema = z.object({
  title: z.string().trim().min(5).max(200).optional(),
  description: z.string().trim().min(20).max(10000).optional(),
  category: z.enum(JOB_CATEGORIES).optional(),
  budget: z.number().positive().max(1000000).optional(),
  budgetType: z.enum(['fixed', 'hourly']).optional(),
  deadline: z.string().refine((d) => !Number.isNaN(new Date(d).getTime()), 'Invalid deadline').optional(),
  skills: z.array(z.string().trim().min(1).max(50)).min(1).optional(),
  status: z.enum(JOB_STATUSES).optional(),
  locationType: z.enum(LOCATION_TYPES).optional(),
}).partial();

// ─── Application ──────────────────────────────────────────────────────────────
const applicationSchema = z.object({
  coverLetter: z.string().trim().min(10, 'Cover letter must be 10-5000 characters').max(5000),
  proposedRate: z.number().positive('Rate must be positive').max(1000000),
});

// ─── Message ──────────────────────────────────────────────────────────────────
const messageSchema = z.object({
  content: z.string().trim().min(1, 'Message must be 1-5000 characters').max(5000),
});

// ─── Report ───────────────────────────────────────────────────────────────────
const reportSchema = z.object({
  targetType: z.enum(['user', 'job']),
  targetId: z.string().min(1, 'Target ID is required'),
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'fraud', 'other']),
  description: z.string().max(2000).optional(),
});

// ─── Review ───────────────────────────────────────────────────────────────────
const reviewSchema = z.object({
  jobId: z.string().min(1),
  revieweeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Zod-based validate. Returns { valid: true, data } or { valid: false, errors: string[] }.
 */
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { valid: true, data: result.data };
  const errors = result.error.errors.map((e) => e.message);
  return { valid: false, errors };
}

// Escape regex special characters (preserved for search queries)
function escapeRegex(str) {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  jobCreateSchema,
  jobUpdateSchema,
  applicationSchema,
  messageSchema,
  reportSchema,
  reviewSchema,
  validate,
  escapeRegex,
  JOB_CATEGORIES,
  JOB_STATUSES,
  LOCATION_TYPES,
};
