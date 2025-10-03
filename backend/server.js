const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// Serve static files from EdTech directory
app.use(express.static(path.join(__dirname, '..', 'EdTech')));

// ==========================================================
// FAKE DATABASE
// ==========================================================
let students = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", password: "password123", grade: "10", subject: "Mathematics", learningStyle: "Visual", pace: "Average", knowledgeGaps: ["Algebra Basics", "Chemical Bonding"] },
  { id: 2, name: "Bob Williams", email: "bob@example.com", password: "password123", grade: "11", subject: "Physics", learningStyle: "Kinesthetic", pace: "Fast", knowledgeGaps: ["Newton's Laws"] },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", password: "password123", grade: "10", subject: "Mathematics", learningStyle: "Auditory", pace: "Slow", knowledgeGaps: ["Data Structures", "Historical Timelines"] },
];

let teachers = [
    { id: 101, name: "Mr. Davis", email: "davis@example.com", password: "password123", subject: "Mathematics", designation: "Lead Instructor", experience: 10, students: [1, 3] },
    { id: 102, name: "Ms. Smith", email: "smith@example.com", password: "password123", subject: "Physics", designation: "Senior Teacher", experience: 8, students: [2] },
];

let quizzes = [
    { id: 1, title: "Algebra Fundamentals", subject: "Mathematics", teacherId: 101, startTime: null, endTime: null, isActive: true, createdOn: "2025-10-02T10:00:00.000Z", questions: [{ text: "What is x in: 2x = 8?", options: ["4", "3", "5", "2"], correctAnswerIndex: 0, points: 10 }] },
    { id: 2, title: "Intro to Physics", subject: "Physics", teacherId: 102, startTime: null, endTime: null, isActive: true, createdOn: "2025-10-01T12:00:00.000Z", questions: [{ text: "What is F=ma?", options: ["Newton's Second Law", "Ohm's Law", "The Pythagorean Theorem"], correctAnswerIndex: 0, points: 5 }, { text: "What is the unit of force?", options: ["Newton", "Watt", "Joule"], correctAnswerIndex: 0, points: 5 }] }
];
let quizResults = [];

// ==========================================================
// API Endpoints
// ==========================================================

app.get('/', (req, res) => res.send('Welcome to the Smart EdTech Challenge API!'));

// --- USER & LOGIN ---
app.get('/api/students/:id', (req, res) => {
    const student = students.find(s => s.id === parseInt(req.params.id));
    student ? res.json(student) : res.status(404).send('Student not found');
});
app.get('/api/teachers/:id', (req, res) => {
    const teacher = teachers.find(t => t.id === parseInt(req.params.id));
    teacher ? res.json(teacher) : res.status(404).send('Teacher not found');
});
app.get('/api/teachers/:id/students', (req, res) => {
    const teacher = teachers.find(t => t.id === parseInt(req.params.id));
    if (!teacher) return res.status(404).send('Teacher not found');
    const assignedStudents = students.filter(student => teacher.students.includes(student.id));
    res.json(assignedStudents);
});
app.post('/api/login', (req, res) => {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ message: "Email and role are required." });
    let user = null;
    if (role === 'student') {
        user = students.find(s => s.email.toLowerCase() === email.toLowerCase());
    } else if (role === 'teacher') {
        user = teachers.find(t => t.email.toLowerCase() === email.toLowerCase());
    }
    
    if (user) {
        console.log(`✅ ${role} logged in:`, user.name);
        res.status(200).json(user);
    } else {
        console.log(`❌ Login failed for email: ${email}`);
        res.status(401).json({ message: "Invalid credentials. User not found." });
    }
});


// --- QUIZ MANAGEMENT Endpoints ---
app.post('/api/quizzes', (req, res) => {
    const quizData = req.body;
    if (!quizData || !quizData.title || !quizData.questions || !quizData.teacherId) {
        return res.status(400).json({ message: "Invalid quiz data. Teacher ID is required." });
    }
    const newQuiz = { id: Date.now(), ...quizData, isActive: true, createdOn: new Date().toISOString() };
    quizzes.push(newQuiz);
    console.log("✅ New Quiz Created:", newQuiz.title);
    res.status(201).json({ message: "Quiz created successfully!", quiz: newQuiz });
});

app.get('/api/quizzes/all', (req, res) => {
    const quizzesWithStats = quizzes.map(quiz => {
        const attempts = quizResults.filter(r => r.quizId === quiz.id);
        const totalPoints = attempts.reduce((sum, r) => sum + r.score, 0);
        const averageScore = attempts.length > 0 ? totalPoints / attempts.length : 0;
        return { ...quiz, attempts: attempts.length, averageScore: parseFloat(averageScore.toFixed(1)) };
    });
    console.log(`Returning all ${quizzes.length} quizzes for management.`);
    res.json(quizzesWithStats);
});

app.delete('/api/quizzes/:id', (req, res) => {
    const quizId = parseInt(req.params.id);
    const initialLength = quizzes.length;
    quizzes = quizzes.filter(q => q.id !== quizId);
    quizResults = quizResults.filter(r => r.quizId !== quizId);

    if (quizzes.length < initialLength) {
        console.log(`✅ Quiz Deleted: ID ${quizId}`);
        res.status(200).json({ message: 'Quiz deleted successfully.' });
    } else {
        res.status(404).json({ message: 'Quiz not found.' });
    }
});

app.patch('/api/quizzes/:id/end', (req, res) => {
    const quizId = parseInt(req.params.id);
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
        quiz.isActive = false;
        quiz.endTime = new Date().toISOString();
        console.log(`✅ Quiz Ended: ${quiz.title}`);
        res.status(200).json({ message: 'Quiz ended successfully', quiz });
    } else {
        res.status(404).json({ message: 'Quiz not found' });
    }
});


// --- STUDENT-FACING QUIZ Endpoints ---
app.get('/api/quizzes', (req, res) => {
    const { studentId } = req.query;
    const now = new Date();
    const studentCompletedQuizzes = quizResults
        .filter(r => r.studentId === parseInt(studentId))
        .map(r => r.quizId);

    // Find the student's assigned teachers
    const student = students.find(s => s.id === parseInt(studentId));
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Remove teacher assignment filter to allow all quizzes for all students
    // const assignedTeacherIds = teachers
    //     .filter(t => t.students.includes(student.id))
    //     .map(t => t.id);

    let availableQuizzes = quizzes.filter(q => {
        const startTime = q.startTime ? new Date(q.startTime) : null;
        const endTime = q.endTime ? new Date(q.endTime) : null;
        // No filtering by assigned teachers or subject
        return q.isActive &&
               !studentCompletedQuizzes.includes(q.id) &&
               (!startTime || startTime <= now) &&
               (!endTime || endTime >= now);
    });

    // Sort quizzes by creation date descending (newest first)
    availableQuizzes.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    console.log(`Found ${availableQuizzes.length} available quizzes for student ${studentId}.`);
    res.json(availableQuizzes);
});

app.get('/api/quizzes/:id', (req, res) => {
    const quizId = parseInt(req.params.id);
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
        const studentQuiz = JSON.parse(JSON.stringify(quiz));
        studentQuiz.questions.forEach(q => delete q.correctAnswerIndex);
        res.json(studentQuiz);
    } else {
        res.status(404).json({ message: 'Quiz not found' });
    }
});


// --- RESULTS & LEADERBOARD Endpoints ---
app.post('/api/quizzes/submit', (req, res) => {
    const { quizId, studentId, answers, timeTaken } = req.body;
    const quiz = quizzes.find(q => q.id === parseInt(quizId));
    const student = students.find(s => s.id === parseInt(studentId));
    if (!quiz || !student) return res.status(404).json({ message: 'Quiz or student not found.' });

    let score = 0;
    let totalPossibleScore = 0;
    quiz.questions.forEach((question, index) => {
        totalPossibleScore += question.points || 1; // Default to 1 point if not specified
        const correctOption = question.options[question.correctAnswerIndex];
        if (answers[index] === correctOption) {
            score += question.points || 1;
        }
    });

    const newResult = {
        quizId: parseInt(quizId),
        studentId: parseInt(studentId),
        studentName: student.name,
        score,
        totalQuestions: quiz.questions.length,
        totalPossibleScore,
        quizTitle: quiz.title,
        timeTaken, // in seconds
        completedOn: new Date().toISOString()
    };
    quizResults.push(newResult);
    console.log(`✅ Quiz result saved for ${student.name}. Score: ${score}/${totalPossibleScore}`);
    res.status(201).json({ message: "Quiz submitted successfully!", result: newResult });
});

app.get('/api/students/:id/results', (req, res) => {
    const studentId = parseInt(req.params.id);
    const results = quizResults.filter(r => r.studentId === studentId);
    res.json(results);
});

app.get('/api/leaderboard', (req, res) => {
    const playerStats = {};
    quizResults.forEach(result => {
        if (!playerStats[result.studentId]) {
            playerStats[result.studentId] = { studentId: result.studentId, name: result.studentName, points: 0, totalTimeTaken: 0 };
        }
        playerStats[result.studentId].points += result.score;
        playerStats[result.studentId].totalTimeTaken += result.timeTaken;
    });
    
    const leaderboard = Object.values(playerStats).sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points;
        }
        return a.totalTimeTaken - b.totalTimeTaken;
    });
    res.json(leaderboard);
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

