const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Get all courses for the logged in user
router.get('/', verifyToken, async (req, res) => {
    try {
        if (req.user.role === 'teacher') {
            const courses = await prisma.course.findMany({
                where: { teacher_id: req.user.id }
            });
            res.json(courses);
        } else {
            // Student: Get enrolled courses
            const courses = await prisma.course.findMany({
                where: {
                    enrollments: {
                        some: {
                            student_id: req.user.id
                        }
                    }
                }
            });
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
        await prisma.course.create({
            data: {
                teacher_id: req.user.id,
                course_name,
                course_code,
                description
            }
        });
        res.status(201).json({ message: 'Course created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
