require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const { teachers, students } = require('./data/sampleData');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edtech', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Seed data function
const seedData = async () => {
    try {
        // Clear existing data
        await User.deleteMany({});

        // Insert teachers
        await User.insertMany(teachers);
        
        // Insert students
        await User.insertMany(students);

        console.log('Sample data seeded successfully');
    } catch (error) {
        console.error('Error seeding data:', error);
    }
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/sessions', require('./routes/sessions'));

// Seed data on server start
if (process.env.NODE_ENV !== 'production') {
    seedData();
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});