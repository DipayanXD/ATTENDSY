const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');
const crypto = require('crypto');

// Helper: Calculate distance (Haversine formula)
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // meters
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

// 1. Start Session (Teacher)
router.post('/start', verifyToken, verifyRole('teacher'), async (req, res) => {
    const { course_id, latitude, longitude, radius } = req.body;

    // Generate unique token
    const session_token = crypto.randomBytes(16).toString('hex');
    // Generate simple 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    try {
        // Deactivate previous active sessions for this course
        await db.query('UPDATE sessions SET is_active = FALSE WHERE course_id = ?', [course_id]);

        const [result] = await db.query(
            'INSERT INTO sessions (course_id, session_token, pin, latitude, longitude, radius_meters, expires_at) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
            [course_id, session_token, pin, latitude, longitude, radius || 50]
        );

        res.json({ session_id: result.insertId, session_token, pin, message: 'Session started.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Rotate Token (Teacher)
router.post('/session/:sessionId/rotate', verifyToken, verifyRole('teacher'), async (req, res) => {
    const { sessionId } = req.params;
    const session_token = crypto.randomBytes(16).toString('hex');

    try {
        await db.query('UPDATE sessions SET session_token = ? WHERE id = ?', [session_token, sessionId]);
        res.json({ session_token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Get Live Session Data (Teacher)
router.get('/session/:sessionId/live', verifyToken, verifyRole('teacher'), async (req, res) => {
    const { sessionId } = req.params;
    try {
        // Get all enrolled students + attendance status
        const [students] = await db.query(
            `SELECT u.full_name, u.id,
                    CASE 
                        WHEN a.status IS NOT NULL THEN a.status
                        ELSE 'absent'
                    END as status,
                    a.captured_at
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             JOIN sessions s ON e.course_id = s.course_id
             LEFT JOIN attendance a ON s.id = a.session_id AND u.id = a.student_id
             WHERE s.id = ?
             ORDER BY status DESC, u.full_name ASC`,
            [sessionId]
        );
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Mark Attendance (Student)
router.post('/mark', verifyToken, verifyRole('student'), async (req, res) => {
    const { session_token, pin, latitude, longitude, device_id } = req.query; // Using query or body? Standardize on body.
    // NOTE: The previous code used req.body. Let's stick to req.body.
    const inputToken = req.body.session_token;
    const inputPin = req.body.pin;
    const studentLat = req.body.latitude;
    const studentLon = req.body.longitude;
    const studentDeviceId = req.body.device_id;

    try {
        let session;

        // Strategy 1: Find by Session Token (QR Scan)
        if (inputToken) {
            const [sessions] = await db.query(
                'SELECT * FROM sessions WHERE session_token = ? AND is_active = TRUE AND expires_at > NOW()',
                [inputToken]
            );
            if (sessions.length > 0) session = sessions[0];
        }

        // Strategy 2: Find by PIN (Manual Entry)
        if (!session && inputPin) {
            const [sessions] = await db.query(
                'SELECT * FROM sessions WHERE pin = ? AND is_active = TRUE AND expires_at > NOW()',
                [inputPin]
            );
            if (sessions.length > 0) session = sessions[0];
        }

        if (!session) return res.status(400).json({ message: 'Invalid code, expired session, or session not active.' });

        // Check if already marked
        const [existing] = await db.query(
            'SELECT * FROM attendance WHERE session_id = ? AND student_id = ?',
            [session.id, req.user.id]
        );
        if (existing.length > 0) return res.status(400).json({ message: 'Attendance already marked for this session.' });

        // Geo-fence check (Optional but recommended)
        // Only verify if session has coords AND student sent coords
        if (session.latitude && session.longitude) {
            if (!studentLat || !studentLon) {
                return res.status(400).json({ message: 'Location permission required for attendance.' });
            }

            const distance = getDistanceFromLatLonInMeters(
                session.latitude, session.longitude,
                studentLat, studentLon
            );

            // Allow slightly larger radius for PIN entry perhaps? Or strict? Let's keep strict.
            if (distance > session.radius_meters) {
                return res.status(403).json({ message: `Outside class range! Distance: ${Math.round(distance)}m (Max: ${session.radius_meters}m)` });
            }
        }

        // Mark present
        await db.query(
            'INSERT INTO attendance (session_id, student_id, status, device_id, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
            [session.id, req.user.id, 'present', studentDeviceId, studentLat, studentLon]
        );

        res.json({ message: 'Attendance marked successfully!', session_id: session.id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Attendance History (Student)
router.get('/history', verifyToken, verifyRole('student'), async (req, res) => {
    try {
        const [records] = await db.query(
            `SELECT a.*, c.course_name, s.created_at as session_date 
             FROM attendance a
             JOIN sessions s ON a.session_id = s.id
             JOIN courses c ON s.course_id = c.id
             WHERE a.student_id = ?
             ORDER BY s.created_at DESC`,
            [req.user.id]
        );
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Course Attendance (Teacher)
router.get('/course/:courseId', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        const [records] = await db.query(
            `SELECT a.*, u.full_name, s.created_at as date
             FROM attendance a
             JOIN users u ON a.student_id = u.id
             JOIN sessions s ON a.session_id = s.id
             WHERE s.course_id = ?
             ORDER BY s.created_at DESC`,
            [req.params.courseId]
        );
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
