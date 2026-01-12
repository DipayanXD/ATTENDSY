const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Helper: Calculate at-risk students for a teacher
async function calculateAtRiskStudents(teacherId) {
    // Get all students enrolled in this teacher's courses with their attendance stats
    const students = await prisma.$queryRaw`
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
        WHERE c.teacher_id = ${teacherId} AND u.role = 'student'
        GROUP BY u.id, u.full_name, u.email
        HAVING COUNT(DISTINCT s.id) > 0
    `;

    const atRiskStudents = [];

    // Helper to handle BigInt serialization if needed
    const safeInt = (val) => typeof val === 'bigint' ? Number(val) : val;

    for (const student of students) {
        const totalSessions = safeInt(student.total_sessions);
        const attendedSessions = safeInt(student.attended_sessions);

        const attendancePercent = totalSessions > 0
            ? Math.round((attendedSessions / totalSessions) * 100)
            : 100;

        // Get consecutive absences (check last N sessions)
        const recentAttendance = await prisma.$queryRaw`
            SELECT 
                s.id as session_id,
                s.created_at,
                COALESCE(a.status, 'absent') as status
            FROM sessions s
            JOIN courses c ON s.course_id = c.id
            JOIN enrollments e ON e.course_id = c.id AND e.student_id = ${student.student_id}
            LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = ${student.student_id}
            WHERE c.teacher_id = ${teacherId}
            ORDER BY s.created_at DESC
            LIMIT 10
        `;

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
        // Prisma count is cleaner
        const activeSessionsCount = await prisma.session.count({
            where: {
                course: { teacher_id: teacherId },
                is_active: true
            }
        });

        // 2. Active Students (Total Unique Enrolled)
        // GroupBy allows distinct counting effectively
        const activeStudentsGroup = await prisma.enrollment.groupBy({
            by: ['student_id'],
            where: {
                course: { teacher_id: teacherId }
            }
        });
        const activeStudentsCount = activeStudentsGroup.length;

        // 3. Avg Attendance
        // Raw query simpler for AVG aggregation with logic
        const attendanceData = await prisma.$queryRaw`
             SELECT 
                (SUM(CASE WHEN status = 'present' OR status = 'late' THEN 1 ELSE 0 END) * 1.0 / COUNT(*)) * 100 as avg_rate
             FROM attendance a
             JOIN sessions s ON a.session_id = s.id
             JOIN courses c ON s.course_id = c.id
             WHERE c.teacher_id = ${teacherId}
        `;
        // * 1.0 needed in postgres to force float division if count is integer? Postgres integer division truncates.
        // Actually Postgres `SUM` returns numeric/bigint. Best to cast or multiply.

        const avgRate = attendanceData[0]?.avg_rate ? Number(attendanceData[0].avg_rate) : 0;

        // 4. At-Risk Students Count
        const atRiskStudents = await calculateAtRiskStudents(teacherId);

        res.json({
            active_sessions: activeSessionsCount,
            total_students: activeStudentsCount,
            avg_attendance: Math.round(avgRate),
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
