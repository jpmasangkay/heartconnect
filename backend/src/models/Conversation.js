const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:      { type: String, default: '' },
  read:         { type: Boolean, default: false },
  // File attachments
  fileUrl:  { type: String },
  fileName: { type: String },
  fileType: { type: String },
  fileSize: { type: Number },
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ conversation: 1, sender: 1, read: 1 });

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  job:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  lastMessage:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  // Per-user soft delete (hide from list). If a new message arrives, we unhide for participants.
  hiddenFor:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
}, { timestamps: true });

conversationSchema.index({ participants: 1, job: 1 }, { unique: true });
conversationSchema.index({ participants: 1, updatedAt: -1 });

const Message      = mongoose.model('Message', messageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = { Conversation, Message };
