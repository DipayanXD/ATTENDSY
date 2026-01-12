const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// List All Students
router.get('/', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        // Fetch all users with role 'student'
        const students = await prisma.user.findMany({
            where: { role: 'student' },
            select: {
                id: true,
                full_name: true,
                email: true,
                created_at: true,
                role: true
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// Add New Student
router.post('/', verifyToken, verifyRole('teacher'), async (req, res) => {
    const { full_name, email } = req.body;

    // Default password for new students added by teacher
    const defaultPassword = 'student123';

    try {
        // Check if exists
        const existing = await prisma.user.findUnique({
            where: { email }
        });

        if (existing) return res.status(400).json({ message: 'User already exists' });

        // Hash
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(defaultPassword, salt);

        // Insert the student
        const student = await prisma.user.create({
            data: {
                full_name,
                email,
                password_hash: hash,
                role: 'student'
            }
        });

        // Auto-enroll this student in all of the teacher's courses
        const teacherCourses = await prisma.course.findMany({
            where: { teacher_id: req.user.id },
            select: { id: true }
        });

        if (teacherCourses.length > 0) {
            await prisma.enrollment.createMany({
                data: teacherCourses.map(course => ({
                    course_id: course.id,
                    student_id: student.id
                })),
                skipDuplicates: true
            });
            console.log(`[ENROLL] Auto-enrolled ${full_name} in ${teacherCourses.length} courses`);
        }

        res.status(201).json({ message: 'Student added and enrolled successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add student' });
    }
});

// Delete Student
router.delete('/:id', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        // Ideally checking if the student belongs to this institution/teacher
        // Using deleteMany to enforce role check safety
        const result = await prisma.user.deleteMany({
            where: {
                id: parseInt(req.params.id),
                role: 'student'
            }
        });

        if (result.count === 0) {
            return res.status(404).json({ message: 'Student not found or not authorized to delete.' });
        }

        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

// Bulk Enroll All Students in All Teacher's Courses (One-time fix)
router.post('/enroll-all', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        // Get all students
        const students = await prisma.user.findMany({
            where: { role: 'student' },
            select: { id: true, full_name: true }
        });

        // Get all teacher's courses
        const courses = await prisma.course.findMany({
            where: { teacher_id: req.user.id },
            select: { id: true }
        });

        if (students.length === 0 || courses.length === 0) {
            return res.json({ message: 'No students or courses to enroll', enrolled: 0 });
        }

        // Create all enrollment combinations
        const enrollmentData = [];
        for (const student of students) {
            for (const course of courses) {
                enrollmentData.push({
                    student_id: student.id,
                    course_id: course.id
                });
            }
        }

        // Bulk insert (skip duplicates)
        const result = await prisma.enrollment.createMany({
            data: enrollmentData,
            skipDuplicates: true
        });

        console.log(`[BULK ENROLL] Enrolled ${result.count} student-course pairs`);
        res.json({
            message: 'Bulk enrollment complete',
            enrolled: result.count,
            total_students: students.length,
            total_courses: courses.length
        });
    } catch (err) {
        console.error('[BULK ENROLL] Error:', err);
        res.status(500).json({ error: 'Failed to bulk enroll students' });
    }
});

module.exports = router;
