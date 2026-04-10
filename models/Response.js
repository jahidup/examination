const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  startTime: { type: Date, required: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedAnswer: String,
    isCorrect: Boolean,
    marksObtained: Number
  }],
  isSubmitted: { type: Boolean, default: false },
  submittedAt: Date
}, { timestamps: true });

// Ensure one response per student per test
responseSchema.index({ studentId: 1, testId: 1 }, { unique: true });

module.exports = mongoose.model('Response', responseSchema);
