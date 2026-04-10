const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const router = express.Router();

// Mark message as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Marked read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
