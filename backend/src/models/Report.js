const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType:  { type: String, enum: ['user', 'job'], required: true },
  targetId:    { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate', 'fraud', 'other'],
    required: true,
  },
  description: { type: String, maxlength: 2000 },
  status:      { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
  resolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:  { type: Date },
}, { timestamps: true });

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 });

module.exports = mongoose.model('Report', reportSchema);
