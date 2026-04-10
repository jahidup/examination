const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Student Login
router.post('/login', async (req, res) => {
  try {
    const { studentId, dob } = req.body;
    const student = await User.findOne({ studentId, role: 'student' });
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Compare DOB (format: YYYY-MM-DD)
    const dobInput = new Date(dob).toISOString().split('T')[0];
    const userDob = student.dob.toISOString().split('T')[0];
    if (dobInput !== userDob) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (student.isBlocked) {
      return res.status(403).json({ 
        message: 'Account blocked', 
        reason: student.blockReason,
        unblockRequested: student.unblockRequested
      });
    }
    const token = jwt.sign(
      { id: student._id, role: student.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: {
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        class: student.class,
        email: student.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await User.findOne({ studentId: username, role: 'admin' });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: admin._id, name: admin.name } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;
