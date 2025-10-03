const express = require('express');
const SessionBooking = require('../models/SessionBooking');
const { auth, isTeacher, isStudent } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Get all available teachers for mentorship
router.get('/teachers', auth, isStudent, async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' })
            .select('name subject designation experience');
        res.json(teachers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Book a session (students only)
router.post('/book', auth, isStudent, async (req, res) => {
    try {
        const session = new SessionBooking({
            ...req.body,
            student: req.user._id
        });
        await session.save();
        res.status(201).json(session);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get session requests (teachers only)
router.get('/requests', auth, isTeacher, async (req, res) => {
    try {
        const sessions = await SessionBooking.find({ teacher: req.user._id })
            .populate('student', 'name grade')
            .sort('-createdAt');
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update session status (teachers only)
router.patch('/requests/:id', auth, isTeacher, async (req, res) => {
    try {
        const session = await SessionBooking.findOneAndUpdate(
            { _id: req.params.id, teacher: req.user._id },
            { status: req.body.status },
            { new: true }
        ).populate('student', 'name grade');
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json(session);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get my session bookings (students only)
router.get('/my-sessions', auth, isStudent, async (req, res) => {
    try {
        const sessions = await SessionBooking.find({ student: req.user._id })
            .populate('teacher', 'name subject')
            .sort('-createdAt');
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;