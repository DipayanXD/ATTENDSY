const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// List All Students
router.get('/', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        // Fetch all users with role 'student'
        // In a real app, you might want only students enrolled in teacher's courses,
        // but for a "Directory" we often show the pool of students.
        const [students] = await db.query(`
            SELECT id, full_name, email, created_at, role 
            FROM users 
            WHERE role = 'student' 
            ORDER BY created_at DESC
        `);
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
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'User already exists' });

        // Hash
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(defaultPassword, salt);

        // Insert
        await db.query(
            'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [full_name, email, hash, 'student']
        );

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
        await db.query('DELETE FROM users WHERE id = ? AND role = "student"', [req.params.id]);
        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

module.exports = router;
