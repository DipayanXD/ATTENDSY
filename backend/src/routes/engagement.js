const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
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

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Deactivate previous active polls for this course (optional rule: one active at a time)
            await tx.poll.updateMany({
                where: { course_id: parseInt(course_id) },
                data: { is_active: false }
            });

            const poll = await tx.poll.create({
                data: {
                    course_id: parseInt(course_id),
                    teacher_id: req.user.id,
                    question,
                    type: type || 'poll'
                }
            });

            if (options && Array.isArray(options) && options.length > 0) {
                await tx.pollOption.createMany({
                    data: options.map(opt => ({
                        poll_id: poll.id,
                        option_text: opt.text,
                        is_correct: opt.is_correct || false
                    }))
                });
            }

            return poll;
        });

        res.json({ message: 'Engagement activity started.', pollId: result.id });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Active Poll (Student)
router.get('/active/:courseId', verifyToken, verifyRole('student'), async (req, res) => {
    try {
        const poll = await prisma.poll.findFirst({
            where: {
                course_id: parseInt(req.params.courseId),
                is_active: true
            },
            orderBy: { created_at: 'desc' }
        });

        if (!poll) return res.json(null); // No active poll

        // Get options
        const options = await prisma.pollOption.findMany({
            where: { poll_id: poll.id },
            select: { id: true, option_text: true }
        });

        // Check if student already responded
        const response = await prisma.pollResponse.findFirst({
            where: {
                poll_id: poll.id,
                student_id: req.user.id
            }
        });

        res.json({
            ...poll,
            options,
            has_responded: !!response
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Submit Response (Student)
router.post('/respond', verifyToken, verifyRole('student'), async (req, res) => {
    const { poll_id, selected_option_id, latitude, longitude } = req.body;

    try {
        const poll = await prisma.poll.findUnique({
            where: { id: parseInt(poll_id) }
        });

        if (!poll) return res.status(404).json({ message: 'Poll not found.' });
        if (!poll.is_active) return res.status(400).json({ message: 'Poll is closed.' });

        // Optional: Geo-check can be added here if we want to enforce location on polls too
        // For now, we assume they are in class if they are marking attendance, but we log loc just in case.

        const existing = await prisma.pollResponse.findFirst({
            where: {
                poll_id: parseInt(poll_id),
                student_id: req.user.id
            }
        });

        if (existing) return res.status(400).json({ message: 'Already responded.' });

        await prisma.pollResponse.create({
            data: {
                poll_id: parseInt(poll_id),
                student_id: req.user.id,
                selected_option_id,
                latitude,
                longitude
            }
        });

        res.json({ message: 'Response recorded.' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Live Results (Teacher)
router.get('/results/:pollId', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        // Aggregation query
        const options = await prisma.$queryRaw`
            SELECT po.id, po.option_text, COUNT(pr.id) as count
            FROM poll_options po
            LEFT JOIN poll_responses pr ON po.id = pr.selected_option_id
            WHERE po.poll_id = ${parseInt(req.params.pollId)}
            GROUP BY po.id
        `;

        // Convert BigInts
        const safeOptions = options.map(o => ({
            id: o.id,
            option_text: o.option_text,
            count: Number(o.count)
        }));

        const totalCount = await prisma.pollResponse.count({
            where: { poll_id: parseInt(req.params.pollId) }
        });

        res.json({
            options: safeOptions,
            total_responses: totalCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Stop Poll (Teacher)
router.post('/stop/:pollId', verifyToken, verifyRole('teacher'), async (req, res) => {
    try {
        await prisma.poll.update({
            where: { id: parseInt(req.params.pollId) },
            data: { is_active: false }
        });
        res.json({ message: 'Poll stopped.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
