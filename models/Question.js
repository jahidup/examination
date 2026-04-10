const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  type: { type: String, enum: ['mcq', 'numerical'], required: true },
  questionText: { type: String, required: true },
  options: [{ type: String }], // for MCQ
  correctAnswer: { type: String, required: true },
  marks: { type: Number, default: 4 },
  order: { type: Number } // for display order
});

module.exports = mongoose.model('Question', questionSchema);
