const express = require('express');
const Quiz = require('../models/Quiz');
const { auth, isTeacher } = require('../middleware/auth');
const router = express.Router();

// Create a new quiz (teachers only)
router.post('/', auth, isTeacher, async (req, res) => {
    try {
        const quiz = new Quiz({
            ...req.body,
            teacher: req.user._id
        });
        await quiz.save();
        res.status(201).json(quiz);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all quizzes for a student's grade
router.get('/student', auth, async (req, res) => {
    try {
        const quizzes = await Quiz.find({ grade: req.user.grade })
            .populate('teacher', 'name')
            .sort('-createdAt');
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all quizzes created by a teacher
router.get('/teacher', auth, isTeacher, async (req, res) => {
    try {
        const quizzes = await Quiz.find({ teacher: req.user._id })
            .sort('-createdAt');
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;