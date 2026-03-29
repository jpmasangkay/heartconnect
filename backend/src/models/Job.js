const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  budget:       { type: Number, required: true },
  budgetType:   { type: String, enum: ['fixed', 'hourly'], default: 'fixed' },
  deadline:     { type: Date, required: true },
  skills:       [{ type: String }],
  status:       { type: String, enum: ['open', 'closed', 'in-progress', 'completed'], default: 'open' },
  locationType: { type: String, enum: ['remote', 'on-site', 'hybrid'], default: 'remote' },
  client:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, toJSON: { virtuals: true } });

jobSchema.virtual('applicationsCount', {
  ref: 'Application', localField: '_id', foreignField: 'job', count: true,
});

// List/filter/sort paths used by GET /api/jobs and /api/jobs/my
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ client: 1, createdAt: -1 });
jobSchema.index({ budget: 1 });
jobSchema.index({ deadline: 1 });
jobSchema.index({ locationType: 1 });
jobSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Job', jobSchema);
