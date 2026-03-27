const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['application_new', 'application_status', 'message_new', 'job_status', 'review_new', 'verification_status'],
    required: true,
  },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  link:    { type: String },
  read:    { type: Boolean, default: false },
  relatedJob:         { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  relatedApplication: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
