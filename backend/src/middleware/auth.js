const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.id });

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

// Middleware to check if user is a teacher
const isTeacher = async (req, res, next) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Access denied. Teachers only.' });
    }
    next();
};

// Middleware to check if user is a student
const isStudent = async (req, res, next) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Access denied. Students only.' });
    }
    next();
};

module.exports = {
    auth,
    isTeacher,
    isStudent
};