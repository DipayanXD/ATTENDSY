const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
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
        await prisma.session.updateMany({
            where: { course_id: parseInt(course_id) },
            data: { is_active: false }
        });

        const session = await prisma.session.create({
            data: {
                course_id: parseInt(course_id),
                session_token,
                pin,
                latitude,
                longitude,
                radius_meters: 20000, // Force 20km radius for testing (ignores frontend value)
                expires_at: new Date(Date.now() + 60 * 60000) // +60 minutes (extended)
            }
        });

        res.json({ session_id: session.id, session_token, pin, message: 'Session started.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET active session for teacher (for restoring on page refresh)
router.get('/active', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        const session = await prisma.session.findFirst({
            where: {
                is_active: true,
                course: { teacher_id: req.user.id }
            },
            include: {
                course: { select: { course_name: true } }
            }
        });
        res.json(session);
    } catch (err) {
        console.error('[ACTIVE] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST end session (deactivate in database)
router.post('/session/:sessionId/end', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        await prisma.session.update({
            where: { id: parseInt(req.params.sessionId) },
            data: { is_active: false }
        });
        res.json({ message: 'Session ended successfully' });
    } catch (err) {
        console.error('[END] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 5. Rotate Token (Teacher)
router.post('/session/:sessionId/rotate', verifyToken, verifyRole('teacher'), async (req, res) => {
    const { sessionId } = req.params;
    const session_token = crypto.randomBytes(16).toString('hex');

    try {
        await prisma.session.update({
            where: { id: parseInt(sessionId) },
            data: { session_token }
        });
        res.json({ session_token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Get Live Session Data (Teacher) - REWRITTEN with Prisma typed queries
router.get('/session/:sessionId/live', verifyToken, verifyRole('teacher'), async (req, res) => {
    const { sessionId } = req.params;
    console.log('[LIVE] ========================================');
    console.log('[LIVE] Fetching live data for session:', sessionId);

    try {
        // Step 1: Get the session to find the course_id
        const session = await prisma.session.findUnique({
            where: { id: parseInt(sessionId) },
            select: { id: true, course_id: true, is_active: true }
        });

        if (!session) {
            console.log('[LIVE] Session not found!');
            return res.status(404).json({ error: 'Session not found' });
        }
        console.log('[LIVE] Session found:', session);

        // Step 2: Get all students enrolled in this course
        const enrollments = await prisma.enrollment.findMany({
            where: { course_id: session.course_id },
            include: {
                student: {
                    select: { id: true, full_name: true, email: true }
                }
            }
        });
        console.log('[LIVE] Enrollments found:', enrollments.length);

        // Step 3: Get all attendance records for this session
        const attendanceRecords = await prisma.attendance.findMany({
            where: { session_id: session.id },
            include: {
                student: {
                    select: { id: true, full_name: true, email: true }
                }
            }
        });
        console.log('[LIVE] Attendance records found:', attendanceRecords.length);

        // Step 4: Create a map for quick lookup
        const attendanceMap = new Map();
        attendanceRecords.forEach(record => {
            attendanceMap.set(record.student_id, {
                status: record.status,
                captured_at: record.captured_at,
                student: record.student
            });
        });

        // Step 5: Merge enrollments with attendance, and add non-enrolled students who attended
        const studentsMap = new Map();

        // Add all enrolled students first
        enrollments.forEach(enrollment => {
            const attendance = attendanceMap.get(enrollment.student_id);
            studentsMap.set(enrollment.student_id, {
                id: enrollment.student_id,
                full_name: enrollment.student.full_name,
                email: enrollment.student.email,
                status: attendance ? attendance.status : 'absent',
                captured_at: attendance ? attendance.captured_at : null
            });
        });

        // Add any students who marked attendance but aren't enrolled
        attendanceRecords.forEach(record => {
            if (!studentsMap.has(record.student_id)) {
                studentsMap.set(record.student_id, {
                    id: record.student_id,
                    full_name: record.student.full_name,
                    email: record.student.email,
                    status: record.status,
                    captured_at: record.captured_at,
                    not_enrolled: true
                });
            }
        });

        const students = Array.from(studentsMap.values());
        console.log('[LIVE] Merged students list sample:', students.slice(0, 2));

        // Step 6: Sort - present/late first, then absent, then by name
        students.sort((a, b) => {
            if (a.status === 'present' && b.status !== 'present') return -1;
            if (a.status !== 'present' && b.status === 'present') return 1;
            if (a.status === 'late' && b.status === 'absent') return -1;
            if (a.status === 'absent' && b.status === 'late') return 1;
            return a.full_name.localeCompare(b.full_name);
        });

        console.log('[LIVE] Returning', students.length, 'students');
        console.log('[LIVE] Present count:', students.filter(s => s.status === 'present').length);
        console.log('[LIVE] ========================================');

        res.json(students);
    } catch (err) {
        console.error('[LIVE] ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Mark Attendance (Student)
router.post('/mark', verifyToken, verifyRole('student'), async (req, res) => {
    const { session_token, pin, latitude, longitude, device_id } = req.body;

    // NOTE: The previous code used req.body. Let's stick to req.body.
    const inputToken = session_token;
    const inputPin = pin;
    const studentLat = latitude;
    const studentLon = longitude;
    const studentDeviceId = device_id;

    try {
        let session;
        console.log('[MARK] Starting mark for token/pin:', inputToken, inputPin);

        // Strategy 1: Find by Session Token (QR Scan)
        if (inputToken) {
            session = await prisma.session.findFirst({
                where: {
                    session_token: inputToken,
                    is_active: true,
                    expires_at: { gt: new Date() }
                }
            });
        }

        // Strategy 2: Find by PIN (Manual Entry)
        if (!session && inputPin) {
            session = await prisma.session.findFirst({
                where: {
                    pin: inputPin,
                    is_active: true,
                    expires_at: { gt: new Date() }
                }
            });
        }

        if (!session) return res.status(400).json({ message: 'Invalid code, expired session, or session not active.' });

        // Check if already marked
        const existing = await prisma.attendance.findFirst({
            where: {
                session_id: session.id,
                student_id: req.user.id
            }
        });

        if (existing) return res.status(400).json({ message: 'Attendance already marked for this session.' });

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
        await prisma.attendance.create({
            data: {
                session_id: session.id,
                student_id: req.user.id,
                status: 'present',
                device_id: studentDeviceId,
                latitude: studentLat,
                longitude: studentLon
            }
        });

        console.log('[MARK] Attendance marked successfully for student:', req.user.id);
        res.json({ message: 'Attendance marked successfully!', session_id: session.id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Attendance History (Student)
router.get('/history', verifyToken, verifyRole('student'), async (req, res) => {
    try {
        const records = await prisma.attendance.findMany({
            where: { student_id: req.user.id },
            include: {
                session: {
                    include: {
                        course: true
                    }
                }
            },
            orderBy: {
                session: {
                    created_at: 'desc'
                }
            }
        });

        // Flatten checks for frontend compatibility (optional, but good for keeping contract similar)
        const formatted = records.map(r => ({
            ...r,
            course_name: r.session.course.course_name,
            session_date: r.session.created_at
            // omit complex objects if not needed
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Course Attendance (Teacher)
router.get('/course/:courseId', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        const records = await prisma.attendance.findMany({
            where: {
                session: {
                    course_id: parseInt(req.params.courseId)
                }
            },
            include: {
                student: true,
                session: true
            },
            orderBy: {
                session: {
                    created_at: 'desc'
                }
            }
        });

        const formatted = records.map(r => ({
            ...r,
            full_name: r.student.full_name,
            date: r.session.created_at
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
