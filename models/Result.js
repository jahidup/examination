const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  score: { type: Number, required: true },
  totalQuestions: Number,
  correctAnswers: Number,
  wrongAnswers: Number,
  skipped: Number,
  rank: Number,
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
