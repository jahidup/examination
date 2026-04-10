const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  duration: { type: Number, required: true }, // in minutes
  marksConfig: {
    correct: { type: Number, default: 4 },
    wrong: { type: Number, default: 1 }
  },
  shuffle: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  startTime: { type: Date }, // scheduled start
  endTime: { type: Date },   // scheduled end
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
