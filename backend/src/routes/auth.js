const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
    const { full_name, email, password, role, device_id } = req.body;

    try {
        // Check if user exists
        const existing = await prisma.user.findUnique({
            where: { email }
        });

        if (existing) return res.status(400).json({ message: 'User already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Insert
        await prisma.user.create({
            data: {
                full_name,
                email,
                password_hash: hash,
                role,
                device_id: device_id || null
            }
        });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password, device_id } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Verify Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log('Password mismatch for:', email);
            console.log('Stored hash prefix:', user.password_hash?.substring(0, 20));
            return res.status(400).json({
                message: 'Invalid credentials',
                debug: {
                    email,
                    hashExists: !!user.password_hash,
                    hashLength: user.password_hash?.length
                }
            });
        }

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
