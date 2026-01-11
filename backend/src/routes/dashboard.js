const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Helper: Calculate at-risk students for a teacher
async function calculateAtRiskStudents(teacherId) {
    // Get all students enrolled in this teacher's courses with their attendance stats
    const [students] = await db.query(`
        SELECT 
            u.id as student_id,
            u.full_name,
            u.email,
            COUNT(DISTINCT s.id) as total_sessions,
            SUM(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 ELSE 0 END) as attended_sessions,
            MAX(a.captured_at) as last_attendance_date
        FROM users u
        JOIN enrollments e ON u.id = e.student_id
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN sessions s ON s.course_id = c.id
        LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = u.id
        WHERE c.teacher_id = ? AND u.role = 'student'
        GROUP BY u.id, u.full_name, u.email
        HAVING total_sessions > 0
    `, [teacherId]);

    const atRiskStudents = [];

    for (const student of students) {
        const attendancePercent = student.total_sessions > 0
            ? Math.round((student.attended_sessions / student.total_sessions) * 100)
            : 100;

        // Get consecutive absences (check last N sessions)
        const [recentAttendance] = await db.query(`
            SELECT 
                s.id as session_id,
                s.created_at,
                COALESCE(a.status, 'absent') as status
            FROM sessions s
            JOIN courses c ON s.course_id = c.id
            JOIN enrollments e ON e.course_id = c.id AND e.student_id = ?
            LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = ?
            WHERE c.teacher_id = ?
            ORDER BY s.created_at DESC
            LIMIT 10
        `, [student.student_id, student.student_id, teacherId]);

        // Count consecutive absences from most recent
        let consecutiveAbsences = 0;
        for (const record of recentAttendance) {
            if (record.status === 'absent' || record.status === null) {
                consecutiveAbsences++;
            } else {
                break; // Stop counting when we hit a present/late
            }
        }

        // Determine trend (compare first half vs second half of attendance)
        let trend = 'stable';
        if (recentAttendance.length >= 4) {
            const halfPoint = Math.floor(recentAttendance.length / 2);
            const recentHalf = recentAttendance.slice(0, halfPoint);
            const olderHalf = recentAttendance.slice(halfPoint);

            const recentPresent = recentHalf.filter(r => r.status === 'present' || r.status === 'late').length;
            const olderPresent = olderHalf.filter(r => r.status === 'present' || r.status === 'late').length;

            const recentRate = recentPresent / recentHalf.length;
            const olderRate = olderPresent / olderHalf.length;

            if (recentRate < olderRate - 0.1) trend = 'declining';
            else if (recentRate > olderRate + 0.1) trend = 'improving';
        }

        // Determine risk level based on criteria
        let riskLevel = null;

        if (attendancePercent < 60 || consecutiveAbsences >= 4) {
            riskLevel = 'high';
        } else if (attendancePercent < 75 || consecutiveAbsences >= 2) {
            riskLevel = 'medium';
        } else if (attendancePercent < 80 && trend === 'declining') {
            riskLevel = 'low';
        }

        if (riskLevel) {
            atRiskStudents.push({
                student_id: student.student_id,
                full_name: student.full_name,
                email: student.email,
                attendance_percent: attendancePercent,
                consecutive_absences: consecutiveAbsences,
                risk_level: riskLevel,
                last_attendance_date: student.last_attendance_date,
                trend: trend
            });
        }
    }

    // Sort by risk level (high first), then by attendance percent
    const riskOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    atRiskStudents.sort((a, b) => {
        if (riskOrder[a.risk_level] !== riskOrder[b.risk_level]) {
            return riskOrder[a.risk_level] - riskOrder[b.risk_level];
        }
        return a.attendance_percent - b.attendance_percent;
    });

    return atRiskStudents;
}

// Teacher Dashboard Stats
router.get('/teacher/stats', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        const teacherId = req.user.id;

        // 1. Active Sessions
        const [activeSessionsData] = await db.query(`
            SELECT COUNT(*) as count 
            FROM sessions s
            JOIN courses c ON s.course_id = c.id
            WHERE c.teacher_id = ? AND s.is_active = TRUE
        `, [teacherId]);

        // 2. Active Students (Total Unique Enrolled)
        const [activeStudentsData] = await db.query(`
            SELECT COUNT(DISTINCT e.student_id) as count
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE c.teacher_id = ?
        `, [teacherId]);

        // 3. Avg Attendance
        const [attendanceData] = await db.query(`
             SELECT 
                (SUM(CASE WHEN status = 'present' OR status = 'late' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as avg_rate
             FROM attendance a
             JOIN sessions s ON a.session_id = s.id
             JOIN courses c ON s.course_id = c.id
             WHERE c.teacher_id = ?
        `, [teacherId]);

        // 4. At-Risk Students Count
        const atRiskStudents = await calculateAtRiskStudents(teacherId);

        res.json({
            active_sessions: activeSessionsData[0].count,
            total_students: activeStudentsData[0].count,
            avg_attendance: Math.round(attendanceData[0].avg_rate || 0),
            at_risk: atRiskStudents.length,
            at_risk_breakdown: {
                high: atRiskStudents.filter(s => s.risk_level === 'high').length,
                medium: atRiskStudents.filter(s => s.risk_level === 'medium').length,
                low: atRiskStudents.filter(s => s.risk_level === 'low').length
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get detailed at-risk students list
router.get('/teacher/at-risk', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        const teacherId = req.user.id;
        const atRiskStudents = await calculateAtRiskStudents(teacherId);

        res.json({
            total: atRiskStudents.length,
            breakdown: {
                high: atRiskStudents.filter(s => s.risk_level === 'high').length,
                medium: atRiskStudents.filter(s => s.risk_level === 'medium').length,
                low: atRiskStudents.filter(s => s.risk_level === 'low').length
            },
            students: atRiskStudents
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch at-risk students' });
    }
});

module.exports = router;
