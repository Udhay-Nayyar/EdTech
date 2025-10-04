const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = 3000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// Setup multer for file uploads (store temporarily in 'uploads/' folder)
const upload = multer({ dest: 'uploads/' });

// Simulated cloud storage folder (for demo purposes)
const cloudStorageFolder = path.join(__dirname, 'cloud_videos');
if (!fs.existsSync(cloudStorageFolder)) {
  fs.mkdirSync(cloudStorageFolder);
}

// Simulated cloud storage folder for notes (for demo purposes)
const cloudNotesFolder = path.join(__dirname, 'cloud_notes');
if (!fs.existsSync(cloudNotesFolder)) {
  fs.mkdirSync(cloudNotesFolder);
}

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

// In-memory store for uploaded videos metadata
let uploadedVideos = [];

// In-memory store for uploaded notes metadata
let uploadedNotes = [];

// In-memory store for live lectures
let activeLectures = [];

// In-memory store for study rooms
let studyRooms = [];
let studyRoomParticipants = {}; // roomId -> array of participants

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

// --- VIDEO MANAGEMENT Endpoints ---
app.post('/api/videos/upload', upload.single('video'), (req, res) => {
    try {
        console.log('Received video upload request');
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);

        const { teacherName, subject, chapter, topic } = req.body;
        const videoFile = req.file;

        if (!teacherName || !subject || !chapter || !topic || !videoFile) {
            console.log('Missing required fields or video file.');
            return res.status(400).json({ error: 'Missing required fields or video file.' });
        }

        // Move file from temp upload folder to cloud storage folder with original filename
        const targetPath = path.join(cloudStorageFolder, videoFile.originalname);
        fs.renameSync(videoFile.path, targetPath);

        // Store metadata with video URL (simulate cloud URL)
        const videoUrl = `http://localhost:3000/cloud_videos/${videoFile.originalname}`;
        const videoData = {
            id: Date.now().toString(),
            teacherName,
            subject,
            chapter,
            topic,
            videoUrl,
            uploadedOn: new Date()
        };
        uploadedVideos.push(videoData);

        console.log('Video metadata stored:', videoData);

        res.status(201).json({ message: 'Video uploaded successfully.', video: videoData });
    } catch (error) {
        console.error('Video upload error:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body at error:', req.body);
        console.error('Request file at error:', req.file);
        res.status(500).json({ error: 'Failed to upload video.' });
    }
});

app.get('/api/videos', (req, res) => {
    res.json(uploadedVideos);
});

// --- NOTES MANAGEMENT Endpoints ---
app.post('/api/notes/upload', upload.single('notes'), (req, res) => {
    try {
        console.log('Received notes upload request');
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);

        const { teacherName, subject, chapter, topic } = req.body;
        const notesFile = req.file;

        if (!teacherName || !subject || !chapter || !topic || !notesFile) {
            console.log('Missing required fields or notes file.');
            return res.status(400).json({ error: 'Missing required fields or notes file.' });
        }

        // Move file from temp upload folder to cloud storage folder with original filename
        const targetPath = path.join(cloudNotesFolder, notesFile.originalname);
        fs.renameSync(notesFile.path, targetPath);

        // Store metadata with notes URL (simulate cloud URL)
        const notesUrl = `http://localhost:3000/cloud_notes/${notesFile.originalname}`;
        const notesData = {
            id: Date.now().toString(),
            teacherName,
            subject,
            chapter,
            topic,
            notesUrl,
            uploadedOn: new Date()
        };
        uploadedNotes.push(notesData);

        console.log('Notes metadata stored:', notesData);

        res.status(201).json({ message: 'Notes uploaded successfully.', notes: notesData });
    } catch (error) {
        console.error('Notes upload error:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body at error:', req.body);
        console.error('Request file at error:', req.file);
        res.status(500).json({ error: 'Failed to upload notes.' });
    }
});

app.get('/api/notes', (req, res) => {
    res.json(uploadedNotes);
});

// --- STUDY ROOM Endpoints ---
app.post('/api/study-rooms/create', (req, res) => {
    const { creatorId, creatorName, creatorType, roomName, subject, chapter, topic, description } = req.body;
    if (!creatorId || !creatorName || !creatorType || !roomName || !subject || !chapter || !topic) {
        return res.status(400).json({ message: 'Creator ID, name, type, room name, subject, chapter, and topic are required.' });
    }

    const newRoom = {
        id: Date.now().toString(),
        roomName,
        subject,
        chapter,
        topic,
        description: description || '',
        creatorId: parseInt(creatorId),
        creatorName,
        creatorType, // 'student' or 'teacher'
        createdAt: new Date().toISOString(),
        isActive: true,
        participantCount: 0
    };

    studyRooms.push(newRoom);
    studyRoomParticipants[newRoom.id] = [];
    
    console.log(`✅ Study room created: ${roomName} by ${creatorName} (${creatorType}) - ${subject}: ${chapter} - ${topic}`);
    console.log(`✅ Room ID: ${newRoom.id}`);
    console.log(`✅ Total rooms now:`, studyRooms.length);
    
    res.status(201).json({ message: 'Study room created successfully.', room: newRoom });
});

app.get('/api/study-rooms', (req, res) => {
    const roomsWithParticipants = studyRooms
        .filter(room => room.isActive)
        .map(room => ({
            ...room,
            participantCount: studyRoomParticipants[room.id] ? studyRoomParticipants[room.id].length : 0
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(roomsWithParticipants);
});

app.get('/api/study-rooms/:id', (req, res) => {
    const roomId = req.params.id;
    const room = studyRooms.find(r => r.id === roomId);
    if (!room) return res.status(404).json({ message: 'Study room not found.' });
    
    const participants = studyRoomParticipants[roomId] || [];
    res.json({ ...room, participants });
});

app.post('/api/study-rooms/:id/join', (req, res) => {
    const roomId = req.params.id;
    const { userId, userName, userType } = req.body;
    
    console.log(`🔍 Looking for room ID: ${roomId}`);
    console.log(`🔍 Available rooms:`, studyRooms.map(r => ({ id: r.id, name: r.roomName })));
    
    const room = studyRooms.find(r => r.id === roomId);
    if (!room) {
        console.log(`❌ Room not found: ${roomId}`);
        console.log(`❌ Available room IDs:`, studyRooms.map(r => r.id));
        return res.status(404).json({ message: 'Study room not found.' });
    }
    if (!room.isActive) {
        console.log(`❌ Room inactive: ${roomId}`);
        return res.status(404).json({ message: 'Study room is inactive.' });
    }
    
    if (!studyRoomParticipants[roomId]) studyRoomParticipants[roomId] = [];
    
    // Check if user already in room
    const existingParticipant = studyRoomParticipants[roomId].find(p => p.userId === parseInt(userId));
    if (existingParticipant) {
        return res.json({ message: 'Already in room.', room: { ...room, participants: studyRoomParticipants[roomId] } });
    }
    
    const participant = {
        userId: parseInt(userId),
        userName,
        userType,
        joinedAt: new Date().toISOString(),
        socketId: null
    };
    
    studyRoomParticipants[roomId].push(participant);
    console.log(`✅ ${userName} (${userType}) joined study room: ${room.roomName}`);
    
    res.json({ message: 'Joined study room successfully.', room: { ...room, participants: studyRoomParticipants[roomId] } });
});

app.post('/api/study-rooms/:id/leave', (req, res) => {
    const roomId = req.params.id;
    const { userId } = req.body;
    
    if (!studyRoomParticipants[roomId]) return res.status(404).json({ message: 'Study room not found.' });
    
    const initialLength = studyRoomParticipants[roomId].length;
    studyRoomParticipants[roomId] = studyRoomParticipants[roomId].filter(p => p.userId !== parseInt(userId));
    
    if (studyRoomParticipants[roomId].length < initialLength) {
        console.log(`✅ User ${userId} left study room ${roomId}`);
        res.json({ message: 'Left study room successfully.' });
    } else {
        res.status(404).json({ message: 'User not found in room.' });
    }
});

app.post('/api/study-rooms/:id/remove-participant', (req, res) => {
    const roomId = req.params.id;
    const { teacherId, participantId } = req.body;
    
    const room = studyRooms.find(r => r.id === roomId);
    if (!room) return res.status(404).json({ message: 'Study room not found.' });
    
    // Check if requester is a teacher or room creator
    const requester = studyRoomParticipants[roomId]?.find(p => p.userId === parseInt(teacherId));
    const isCreator = room.creatorId === parseInt(teacherId);
    
    if (!requester || (requester.userType !== 'teacher' && !isCreator)) {
        return res.status(403).json({ message: 'Only teachers or room creators can remove participants.' });
    }
    
    if (!studyRoomParticipants[roomId]) return res.status(404).json({ message: 'Study room not found.' });
    
    const initialLength = studyRoomParticipants[roomId].length;
    const removedParticipant = studyRoomParticipants[roomId].find(p => p.userId === parseInt(participantId));
    studyRoomParticipants[roomId] = studyRoomParticipants[roomId].filter(p => p.userId !== parseInt(participantId));
    
    if (studyRoomParticipants[roomId].length < initialLength) {
        console.log(`✅ Participant ${participantId} removed from study room ${roomId} by ${teacherId}`);
        res.json({ message: 'Participant removed successfully.', removedParticipant });
    } else {
        res.status(404).json({ message: 'Participant not found in room.' });
    }
});

app.delete('/api/study-rooms/:id', (req, res) => {
    const roomId = req.params.id;
    const { creatorId } = req.body;
    
    const room = studyRooms.find(r => r.id === roomId);
    if (!room) return res.status(404).json({ message: 'Study room not found.' });
    
    if (room.creatorId !== parseInt(creatorId)) {
        return res.status(403).json({ message: 'Only room creator can delete the room.' });
    }
    
    // Mark room as inactive instead of deleting
    room.isActive = false;
    delete studyRoomParticipants[roomId];
    
    console.log(`✅ Study room deleted: ${room.roomName} by creator ${creatorId}`);
    res.json({ message: 'Study room deleted successfully.' });
});

// --- LIVE LECTURE Endpoints ---
app.post('/api/live/start', (req, res) => {
    const { teacherId, topic } = req.body;
    if (!teacherId || !topic) return res.status(400).json({ message: 'Teacher ID and topic are required.' });
    const teacher = teachers.find(t => t.id === parseInt(teacherId));
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });

    // End any existing live lecture by this teacher
    activeLectures = activeLectures.filter(l => l.teacherId !== parseInt(teacherId));

    const newLecture = {
        id: Date.now().toString(),
        teacherId: parseInt(teacherId),
        teacherName: teacher.name,
        topic,
        startedAt: new Date().toISOString()
    };
    activeLectures.push(newLecture);
    console.log(`✅ Live lecture started: ${topic} by ${teacher.name}`);
    res.status(201).json({ message: 'Live lecture started.', lecture: newLecture });
});

app.get('/api/live/status', (req, res) => {
    res.json(activeLectures.length > 0 ? activeLectures[0] : null);
});

app.delete('/api/live/end', (req, res) => {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ message: 'Teacher ID is required.' });
    const initialLength = activeLectures.length;
    activeLectures = activeLectures.filter(l => l.teacherId !== parseInt(teacherId));
    if (activeLectures.length < initialLength) {
        console.log(`✅ Live lecture ended by teacher ${teacherId}`);
        res.status(200).json({ message: 'Live lecture ended.' });
    } else {
        res.status(404).json({ message: 'No active lecture found for this teacher.' });
    }
});

// --- Socket.io for WebRTC Signaling ---
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Live lecture events
    socket.on('join-live', (data) => {
        socket.join('live-room');
        console.log(`User ${socket.id} joined live room`);
    });

    // Study room events
    socket.on('join-study-room', (data) => {
        const { roomId, userId, userName, userType } = data;
        socket.join(`study-room-${roomId}`);
        
        // Update participant socket ID
        if (studyRoomParticipants[roomId]) {
            const participant = studyRoomParticipants[roomId].find(p => p.userId === parseInt(userId));
            if (participant) {
                participant.socketId = socket.id;
            }
        }
        
        console.log(`User ${userName} (${socket.id}) joined study room ${roomId}`);
        
        // Notify other participants
        socket.to(`study-room-${roomId}`).emit('participant-joined', {
            userId: parseInt(userId),
            userName,
            userType,
            socketId: socket.id
        });
        
        // Send current participants list to new joiner
        const participants = studyRoomParticipants[roomId] || [];
        socket.emit('participants-list', participants);
    });

    socket.on('leave-study-room', (data) => {
        const { roomId, userId, userName } = data;
        socket.leave(`study-room-${roomId}`);
        
        // Remove participant socket ID
        if (studyRoomParticipants[roomId]) {
            const participant = studyRoomParticipants[roomId].find(p => p.userId === parseInt(userId));
            if (participant) {
                participant.socketId = null;
            }
        }
        
        console.log(`User ${userName} (${socket.id}) left study room ${roomId}`);
        
        // Notify other participants
        socket.to(`study-room-${roomId}`).emit('participant-left', {
            userId: parseInt(userId),
            userName,
            socketId: socket.id
        });
    });

    // WebRTC signaling for study rooms
    socket.on('study-room-offer', (data) => {
        const { roomId, targetSocketId, offer, senderInfo } = data;
        if (targetSocketId) {
            socket.to(targetSocketId).emit('study-room-offer', { offer, senderInfo, senderSocketId: socket.id });
        } else {
            socket.to(`study-room-${roomId}`).emit('study-room-offer', { offer, senderInfo, senderSocketId: socket.id });
        }
    });

    socket.on('study-room-answer', (data) => {
        const { targetSocketId, answer, senderInfo } = data;
        socket.to(targetSocketId).emit('study-room-answer', { answer, senderInfo, senderSocketId: socket.id });
    });

    socket.on('study-room-ice-candidate', (data) => {
        const { roomId, targetSocketId, candidate, senderInfo } = data;
        if (targetSocketId) {
            socket.to(targetSocketId).emit('study-room-ice-candidate', { candidate, senderInfo, senderSocketId: socket.id });
        } else {
            socket.to(`study-room-${roomId}`).emit('study-room-ice-candidate', { candidate, senderInfo, senderSocketId: socket.id });
        }
    });

    // Screen sharing events
    socket.on('start-screen-share', (data) => {
        const { roomId, sharerInfo } = data;
        socket.to(`study-room-${roomId}`).emit('screen-share-started', { sharerInfo, sharerSocketId: socket.id });
    });

    socket.on('stop-screen-share', (data) => {
        const { roomId, sharerInfo } = data;
        socket.to(`study-room-${roomId}`).emit('screen-share-stopped', { sharerInfo, sharerSocketId: socket.id });
    });

    // Chat messages in study room
    socket.on('study-room-message', (data) => {
        const { roomId, message, senderInfo } = data;
        socket.to(`study-room-${roomId}`).emit('study-room-message', {
            message,
            senderInfo,
            timestamp: new Date().toISOString()
        });
    });

    // Participant removal by teacher
    socket.on('remove-participant', (data) => {
        const { roomId, participantSocketId, participantInfo, removerInfo } = data;
        
        // Notify the removed participant
        socket.to(participantSocketId).emit('removed-from-room', {
            roomId,
            removerInfo,
            message: `You have been removed from the study room by ${removerInfo.userName}`
        });
        
        // Notify other participants
        socket.to(`study-room-${roomId}`).emit('participant-removed', {
            participantInfo,
            removerInfo
        });
    });

    // Legacy live lecture events
    socket.on('offer', (data) => {
        socket.to('live-room').emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to('live-room').emit('answer', data);
    });

    socket.on('ice-candidate', (data) => {
        socket.to('live-room').emit('ice-candidate', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Clean up participant socket IDs on disconnect
        Object.keys(studyRoomParticipants).forEach(roomId => {
            if (studyRoomParticipants[roomId]) {
                studyRoomParticipants[roomId].forEach(participant => {
                    if (participant.socketId === socket.id) {
                        participant.socketId = null;
                        // Notify room about disconnection
                        socket.to(`study-room-${roomId}`).emit('participant-disconnected', {
                            userId: participant.userId,
                            userName: participant.userName,
                            socketId: socket.id
                        });
                    }
                });
            }
        });
    });
});

// Serve static files from cloud storage folder
app.use('/cloud_videos', express.static(cloudStorageFolder));

// Serve static files from cloud notes folder
app.use('/cloud_notes', express.static(cloudNotesFolder));

// --- Start the Server ---
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

