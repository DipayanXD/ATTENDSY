const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
    const { full_name, email, password, role, device_id } = req.body;
    
    try {
        // Check if user exists
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'User already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Insert
        await db.query(
            'INSERT INTO users (full_name, email, password_hash, role, device_id) VALUES (?, ?, ?, ?, ?)',
            [full_name, email, hash, role, device_id || null]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password, device_id } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];

        // Verify Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Device Check (Optional strict mode)
        // If user has a registered device_id, warn or block if different? 
        // For now, we just update it if null, or log it.
        // Simplified: Just proceed.

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ token, role: user.role, name: user.full_name, id: user.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
