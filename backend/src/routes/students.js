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

        // Insert
        await prisma.user.create({
            data: {
                full_name,
                email,
                password_hash: hash,
                role: 'student'
            }
        });

        res.status(201).json({ message: 'Student added successfully' });
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

module.exports = router;
