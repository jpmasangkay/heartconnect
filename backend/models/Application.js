const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coverLetter:  { type: String, required: true },
  proposedRate: { type: Number, required: true },
  status:       { type: String, enum: ['pending','accepted','rejected','withdrawn','finished'], default: 'pending' },
}, { timestamps: true });

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ job: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
