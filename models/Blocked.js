const mongoose = require('mongoose');

const blockedSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: String,
  blockedAt: { type: Date, default: Date.now },
  unblockedAt: Date
});

module.exports = mongoose.model('Blocked', blockedSchema);
