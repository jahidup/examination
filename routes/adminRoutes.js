const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const User = require('../models/User');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Message = require('../models/Message');
const Discussion = require('../models/Discussion');
const Blocked = require('../models/Blocked');
const router = express.Router();

router.use(protect, adminOnly);

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: 'student' });
    const testCount = await Test.countDocuments();
    const resultCount = await Result.countDocuments();
    const recentResults = await Result.find()
      .populate('studentId', 'name studentId')
      .populate('testId', 'title')
      .sort('-submittedAt')
      .limit(10);
    
    res.json({
      studentCount,
      testCount,
      resultCount,
      recentResults
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CRUD Students
router.post('/students', async (req, res) => {
  try {
    const { studentId, name, dob, class: className, email } = req.body;
    const student = await User.create({
      studentId,
      name,
      dob,
      class: className,
      email,
      role: 'student'
    });
    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    const student = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Block/Unblock student
router.post('/students/:id/block', async (req, res) => {
  try {
    const { reason } = req.body;
    const student = await User.findById(req.params.id);
    student.isBlocked = true;
    student.blockReason = reason;
    student.unblockRequested = false;
    await student.save();
    
    await Blocked.create({ studentId: student._id, reason });
    res.json({ message: 'Student blocked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/students/:id/unblock', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    student.isBlocked = false;
    student.blockReason = null;
    student.unblockRequested = false;
    await student.save();
    
    await Blocked.findOneAndUpdate(
      { studentId: student._id, unblockedAt: null },
      { unblockedAt: new Date() }
    );
    res.json({ message: 'Student unblocked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CRUD Tests
router.post('/tests', async (req, res) => {
  try {
    const test = await Test.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/tests', async (req, res) => {
  try {
    const tests = await Test.find().sort('-createdAt');
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/tests/:id', async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/tests/:id', async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    // Also delete related questions and results
    await Question.deleteMany({ testId: req.params.id });
    await Result.deleteMany({ testId: req.params.id });
    res.json({ message: 'Test deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CRUD Questions
router.post('/tests/:testId/questions', async (req, res) => {
  try {
    const question = await Question.create({ ...req.body, testId: req.params.testId });
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/tests/:testId/questions', async (req, res) => {
  try {
    const questions = await Question.find({ testId: req.params.testId }).sort('order');
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/questions/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/questions/:id', async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Results
router.get('/results', async (req, res) => {
  try {
    const results = await Result.find()
      .populate('studentId', 'name studentId')
      .populate('testId', 'title')
      .sort('-submittedAt');
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/results/test/:testId', async (req, res) => {
  try {
    const results = await Result.find({ testId: req.params.testId })
      .populate('studentId', 'name studentId')
      .sort({ score: -1, submittedAt: 1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Messaging
router.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find({ receiverId: req.user._id })
      .populate('senderId', 'name studentId')
      .sort('-createdAt');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/messages/:studentId', async (req, res) => {
  try {
    const { message } = req.body;
    const msg = await Message.create({
      senderId: req.user._id,
      receiverId: req.params.studentId,
      message,
      type: 'chat'
    });
    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Discussions
router.post('/discussions', async (req, res) => {
  try {
    const discussion = await Discussion.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(discussion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/discussions', async (req, res) => {
  try {
    const discussions = await Discussion.find()
      .populate('testId', 'title')
      .populate('createdBy', 'name')
      .sort('-createdAt');
    res.json(discussions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/discussions/:id', async (req, res) => {
  try {
    await Discussion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Discussion deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await User.findById(req.user._id);
    if (!(await admin.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
