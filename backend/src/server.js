require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const prisma = require('./config/prisma');

// Routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');
const studentRoutes = require('./routes/students');
const engagementRoutes = require('./routes/engagement');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Note: In serverless, Prisma connects lazily on first query
// No explicit $connect() needed - managed by the singleton in config/prisma.js

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/debug', require('./routes/debug'));

// Base route
app.get('/', (req, res) => {
    res.send('Smart Attendance API is running...');
});

// Export for Vercel
module.exports = app;

// Only listen if running directly (not required by Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
