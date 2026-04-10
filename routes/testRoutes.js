const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Test = require('../models/Test');
const Result = require('../models/Result');
const router = express.Router();

// Public routes? Already covered in studentRoutes.
// Additional routes like leaderboard can go here.
router.get('/leaderboard/:testId', protect, async (req, res) => {
  try {
    const results = await Result.find({ testId: req.params.testId })
      .populate('studentId', 'name studentId')
      .sort({ score: -1, submittedAt: 1 })
      .limit(10);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
