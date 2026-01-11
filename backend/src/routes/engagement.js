const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Helper: Calculate distance (Haversine formula) - Reused from attendance logic logic
// Ideally this should be in a utils file, but verifying here for safety
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    var R = 6371; 
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

// 1. Create Poll/Quiz (Teacher)
router.post('/create', verifyToken, verifyRole('teacher'), async (req, res) => {
    const { course_id, question, type, options } = req.body;
    // type: 'poll', 'quiz', 'link'

    if (!course_id || !question) {
        return res.status(400).json({ message: 'Course ID and Question are required.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Deactivate previous active polls for this course (optional rule: one active at a time)
        await connection.query('UPDATE polls SET is_active = FALSE WHERE course_id = ?', [course_id]);

        const [result] = await connection.query(
            'INSERT INTO polls (course_id, teacher_id, question, type) VALUES (?, ?, ?, ?)',
            [course_id, req.user.id, question, type || 'poll']
        );

        const pollId = result.insertId;

        if (options && Array.isArray(options) && options.length > 0) {
            const values = options.map(opt => [pollId, opt.text, opt.is_correct || false]);
            await connection.query(
                'INSERT INTO poll_options (poll_id, option_text, is_correct) VALUES ?',
                [values]
            );
        }

        await connection.commit();
        res.json({ message: 'Engagement activity started.', pollId });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// 2. Get Active Poll (Student)
router.get('/active/:courseId', verifyToken, verifyRole('student'), async (req, res) => {
    try {
        const [polls] = await db.query(
            'SELECT * FROM polls WHERE course_id = ? AND is_active = TRUE ORDER BY created_at DESC LIMIT 1',
            [req.params.courseId]
        );

        if (polls.length === 0) return res.json(null); // No active poll

        const poll = polls[0];
        
        // Get options
        const [options] = await db.query('SELECT id, option_text FROM poll_options WHERE poll_id = ?', [poll.id]);
        
        // Check if student already responded
        const [responses] = await db.query(
            'SELECT * FROM poll_responses WHERE poll_id = ? AND student_id = ?', 
            [poll.id, req.user.id]
        );

        res.json({
            ...poll,
            options,
            has_responded: responses.length > 0
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Submit Response (Student)
router.post('/respond', verifyToken, verifyRole('student'), async (req, res) => {
    const { poll_id, selected_option_id, latitude, longitude } = req.body;

    try {
        const [polls] = await db.query('SELECT * FROM polls WHERE id = ?', [poll_id]);
        if (polls.length === 0) return res.status(404).json({ message: 'Poll not found.' });
        
        const poll = polls[0];
        if (!poll.is_active) return res.status(400).json({ message: 'Poll is closed.' });

        // Optional: Geo-check can be added here if we want to enforce location on polls too
        // For now, we assume they are in class if they are marking attendance, but we log loc just in case.

        const [existing] = await db.query(
            'SELECT * FROM poll_responses WHERE poll_id = ? AND student_id = ?',
            [poll_id, req.user.id]
        );
        if (existing.length > 0) return res.status(400).json({ message: 'Already responded.' });

        await db.query(
            'INSERT INTO poll_responses (poll_id, student_id, selected_option_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
            [poll_id, req.user.id, selected_option_id, latitude, longitude]
        );

        res.json({ message: 'Response recorded.' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Live Results (Teacher)
router.get('/results/:pollId', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        const [options] = await db.query(`
            SELECT po.id, po.option_text, COUNT(pr.id) as count
            FROM poll_options po
            LEFT JOIN poll_responses pr ON po.id = pr.selected_option_id
            WHERE po.poll_id = ?
            GROUP BY po.id
        `, [req.params.pollId]);

        const [total] = await db.query('SELECT COUNT(*) as count FROM poll_responses WHERE poll_id = ?', [req.params.pollId]);

        res.json({
            options,
            total_responses: total[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Stop Poll (Teacher)
router.post('/stop/:pollId', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        await db.query('UPDATE polls SET is_active = FALSE WHERE id = ?', [req.params.pollId]);
        res.json({ message: 'Poll stopped.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
