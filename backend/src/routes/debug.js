const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

router.get('/', async (req, res) => {
    const dbStatus = {
        database_url_set: !!process.env.DATABASE_URL,
        direct_url_set: !!process.env.DIRECT_URL,
        node_version: process.version,
    };

    try {
        await prisma.$connect();
        dbStatus.connection = 'Success';
        const userCount = await prisma.user.count();
        dbStatus.user_count = userCount;
    } catch (err) {
        dbStatus.connection = 'Failed';
        dbStatus.error = err.message;
    }

    res.json(dbStatus);
});

module.exports = router;
