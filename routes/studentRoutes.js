const express = require('express');
const { protect, studentOnly } = require('../middleware/authMiddleware');
const Test = require('../models/Test');
const Result = require('../models/Result');
const User = require('../models/User');
const Message = require('../models/Message');
const Discussion = require('../models/Discussion');
const router = express.Router();

// All routes require student authentication
router.use(protect, studentOnly);

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.user._id;
    const results = await Result.find({ studentId }).populate('testId', 'title');
    const totalTests = results.length;
    const avgScore = totalTests > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / totalTests 
      : 0;
    // Calculate rank (simple: average rank)
    const rankPromises = results.map(async (result) => {
      const better = await Result.countDocuments({ 
        testId: result.testId, 
        score: { $gt: result.score } 
      });
      return better + 1;
    });
    const ranks = await Promise.all(rankPromises);
    const avgRank = ranks.length > 0 
      ? ranks.reduce((a,b) => a+b,0) / ranks.length 
      : null;

    res.json({
      profile: req.user,
      totalTests,
      averageScore: avgScore.toFixed(2),
      rank: avgRank ? Math.round(avgRank) : 'N/A',
      recentResults: results.slice(-5).reverse()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available tests for student
router.get('/tests', async (req, res) => {
  try {
    const now = new Date();
    const tests = await Test.find({
      isPublished: true,
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).select('-__v');
    
    // Check if student already submitted
    const results = await Result.find({ 
      studentId: req.user._id, 
      testId: { $in: tests.map(t => t._id) } 
    });
    const submittedTestIds = results.map(r => r.testId.toString());
    
    const testsWithStatus = tests.map(test => ({
      ...test.toObject(),
      submitted: submittedTestIds.includes(test._id.toString())
    }));
    
    res.json(testsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get test details (questions hidden until start)
router.get('/test/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    
    // Check access
    const now = new Date();
    if (!test.isPublished || now < test.startTime || now > test.endTime) {
      return res.status(403).json({ message: 'Test not available' });
    }
    
    // Check if already submitted
    const existingResult = await Result.findOne({ 
      studentId: req.user._id, 
      testId: test._id 
    });
    if (existingResult) {
      return res.status(403).json({ message: 'Test already submitted' });
    }
    
    // Get questions (without correctAnswer for student)
    let questions = await require('../models/Question').find({ testId: test._id })
      .select('-correctAnswer')
      .sort('order');
    
    if (test.shuffle) {
      questions = questions.sort(() => Math.random() - 0.5);
    }
    
    // Get or create response record
    let response = await require('../models/Response').findOne({
      studentId: req.user._id,
      testId: test._id
    });
    if (!response) {
      response = await require('../models/Response').create({
        studentId: req.user._id,
        testId: test._id,
        startTime: new Date(),
        answers: []
      });
    }
    
    res.json({
      test,
      questions,
      responseId: response._id,
      startTime: response.startTime,
      endTime: new Date(response.startTime.getTime() + test.duration * 60000)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit answer (auto-save)
router.post('/submit-answer', async (req, res) => {
  try {
    const { responseId, questionId, selectedAnswer } = req.body;
    const response = await require('../models/Response').findById(responseId);
    if (!response || response.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Invalid response' });
    }
    
    const test = await Test.findById(response.testId);
    const now = new Date();
    const endTime = new Date(response.startTime.getTime() + test.duration * 60000);
    if (now > endTime) {
      return res.status(400).json({ message: 'Time expired' });
    }
    
    // Update or add answer
    const answerIndex = response.answers.findIndex(
      a => a.questionId.toString() === questionId
    );
    if (answerIndex > -1) {
      response.answers[answerIndex].selectedAnswer = selectedAnswer;
    } else {
      response.answers.push({ questionId, selectedAnswer });
    }
    
    await response.save();
    res.json({ message: 'Answer saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Final submit
router.post('/submit-test', async (req, res) => {
  try {
    const { responseId } = req.body;
    const response = await require('../models/Response').findById(responseId)
      .populate('testId');
    if (!response || response.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Invalid response' });
    }
    
    const test = response.testId;
    const now = new Date();
    const endTime = new Date(response.startTime.getTime() + test.duration * 60000);
    if (now > endTime) {
      return res.status(400).json({ message: 'Test time expired' });
    }
    if (response.isSubmitted) {
      return res.status(400).json({ message: 'Already submitted' });
    }
    
    // Fetch questions with correct answers
    const Question = require('../models/Question');
    const questions = await Question.find({ testId: test._id });
    
    // Evaluate answers
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skipped = questions.length - response.answers.length;
    
    for (const ans of response.answers) {
      const question = questions.find(q => q._id.equals(ans.questionId));
      if (!question) continue;
      
      const isCorrect = (ans.selectedAnswer === question.correctAnswer);
      ans.isCorrect = isCorrect;
      if (isCorrect) {
        ans.marksObtained = test.marksConfig.correct;
        score += test.marksConfig.correct;
        correctCount++;
      } else {
        ans.marksObtained = -test.marksConfig.wrong;
        score -= test.marksConfig.wrong;
        wrongCount++;
      }
    }
    
    response.isSubmitted = true;
    response.submittedAt = new Date();
    await response.save();
    
    // Create result
    const result = await Result.create({
      studentId: req.user._id,
      testId: test._id,
      score,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      skipped,
      submittedAt: new Date()
    });
    
    // Calculate rank (tie-breaker: earliest submission)
    const allResults = await Result.find({ testId: test._id })
      .sort({ score: -1, submittedAt: 1 });
    const rank = allResults.findIndex(r => r._id.equals(result._id)) + 1;
    result.rank = rank;
    await result.save();
    
    res.json({ 
      message: 'Test submitted successfully',
      score,
      rank
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get results history
router.get('/results', async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.user._id })
      .populate('testId', 'title')
      .sort('-submittedAt');
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get detailed result for a test
router.get('/result/:testId', async (req, res) => {
  try {
    const result = await Result.findOne({ 
      studentId: req.user._id, 
      testId: req.params.testId 
    });
    if (!result) return res.status(404).json({ message: 'Result not found' });
    
    const response = await require('../models/Response').findOne({
      studentId: req.user._id,
      testId: req.params.testId
    }).populate('answers.questionId');
    
    res.json({ result, answers: response.answers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Messaging (student to admin)
router.post('/message', async (req, res) => {
  try {
    const { message } = req.body;
    // Find an admin to send to (simplified: first admin)
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) return res.status(404).json({ message: 'No admin found' });
    
    const msg = await Message.create({
      senderId: req.user._id,
      receiverId: admin._id,
      message,
      type: 'chat'
    });
    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages
router.get('/messages', async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' });
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: admin?._id },
        { senderId: admin?._id, receiverId: req.user._id }
      ]
    }).sort('createdAt');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unblock request
router.post('/unblock-request', async (req, res) => {
  try {
    const student = await User.findById(req.user._id);
    if (!student.isBlocked) {
      return res.status(400).json({ message: 'Account not blocked' });
    }
    student.unblockRequested = true;
    await student.save();
    
    // Notify admin
    const admin = await User.findOne({ role: 'admin' });
    await Message.create({
      senderId: student._id,
      receiverId: admin._id,
      message: `Unblock request from ${student.name} (${student.studentId})`,
      type: 'unblock_request'
    });
    
    res.json({ message: 'Unblock request sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get discussions
router.get('/discussions/:testId', async (req, res) => {
  try {
    const discussions = await Discussion.find({ testId: req.params.testId })
      .populate('createdBy', 'name');
    res.json(discussions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
