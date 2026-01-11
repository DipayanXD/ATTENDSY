const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Get all courses for the logged in user
router.get('/', verifyToken, async (req, res) => {
    try {
        if (req.user.role === 'teacher') {
            const [courses] = await db.query('SELECT * FROM courses WHERE teacher_id = ?', [req.user.id]);
            res.json(courses);
        } else {
            // Student: Get enrolled courses
            const [courses] = await db.query(
                `SELECT c.* FROM courses c 
                 JOIN enrollments e ON c.id = e.course_id 
                 WHERE e.student_id = ?`, 
                [req.user.id]
            );
            res.json(courses);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Course (Teacher Only)
router.post('/', verifyToken, verifyRole('teacher'), async (req, res) => {
    const { course_name, course_code, description } = req.body;
    try {
        await db.query(
            'INSERT INTO courses (teacher_id, course_name, course_code, description) VALUES (?, ?, ?, ?)',
            [req.user.id, course_name, course_code, description]
        );
        res.status(201).json({ message: 'Course created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
