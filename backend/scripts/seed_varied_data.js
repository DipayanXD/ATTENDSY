const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Absolute path to backend/.env
const bcrypt = require('bcryptjs');

async function seed() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        // database: process.env.DB_NAME, // Skip DB to list them
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    console.log("Connected to MySQL Config...", { host: process.env.DB_HOST, user: process.env.DB_USER, db: process.env.DB_NAME });

    try {
        const connection = await pool.getConnection();
        // const [dbs] = await connection.query('SHOW DATABASES');
        // console.log("Available Databases:", dbs.map(d => d.Database).join(', '));

        const targetDB = 'smart_attendance';
        console.log("Using Database: " + targetDB);

        await connection.query(`USE ${targetDB}`);


        // 1. Create Teacher
        const teacherEmail = 'teacher@demo.com';
        const teacherPass = await bcrypt.hash('password', 10);
        let [teachers] = await connection.query('SELECT id FROM users WHERE email = ?', [teacherEmail]);
        let teacherId;

        if (teachers.length === 0) {
            const [res] = await connection.query(
                'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                ['Prof. Severus Snape', teacherEmail, teacherPass, 'teacher']
            );
            teacherId = res.insertId;
            console.log("Created Teacher: " + teacherId);
        } else {
            teacherId = teachers[0].id;
            console.log("Using Existing Teacher: " + teacherId);
        }

        // 2. Create Course
        const courseCode = 'CS101';
        let [courses] = await connection.query('SELECT id FROM courses WHERE course_code = ?', [courseCode]);
        let courseId;

        if (courses.length === 0) {
            const [res] = await connection.query(
                'INSERT INTO courses (teacher_id, course_name, course_code, description) VALUES (?, ?, ?, ?)',
                [teacherId, 'Intro to Computer Science', courseCode, 'Basics of algorithms and data structures']
            );
            courseId = res.insertId;
            console.log("Created Course: " + courseCode);
        } else {
            courseId = courses[0].id;
            console.log("Using Existing Course: " + courseCode);
        }

        // 3. Create Students (Varied)
        const studentNames = [
            'Aritra Ghosh', 'Priya Sharma', 'Rahul Verma', 'Sneha Gupta', 'Vikram Singh',
            'Anjali Das', 'Rohan Mehta', 'Ishita Patel', 'Karan Malhotra', 'Neha Reddy'
        ];

        const studentIds = [];

        for (const name of studentNames) {
            const email = name.toLowerCase().replace(' ', '.') + '@student.com';
            let [users] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
            let sId;

            if (users.length === 0) {
                const pass = await bcrypt.hash('student123', 10);
                const [res] = await connection.query(
                    'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                    [name, email, pass, 'student']
                );
                sId = res.insertId;
                console.log(`Created Student: ${name}`);
            } else {
                sId = users[0].id;
            }
            studentIds.push(sId);

            // Enroll
            const [enrollments] = await connection.query(
                'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
                [sId, courseId]
            );
            if (enrollments.length === 0) {
                await connection.query('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [sId, courseId]);
            }
        }

        // 4. Create Sessions & Attendance (Past 30 Days)
        console.log("Generating Sessions & Attendance...");
        const numSessions = 15;
        const now = new Date();

        for (let i = 0; i < numSessions; i++) {
            const sessionDate = new Date();
            sessionDate.setDate(now.getDate() - (i * 2)); // Every 2 days

            // Create Session
            const [sRes] = await connection.query(
                `INSERT INTO sessions (course_id, session_token, pin, latitude, longitude, radius_meters, is_active, expires_at, created_at) 
                 VALUES (?, ?, '1234', 22.5726, 88.3639, 50, FALSE, ?, ?)`,
                [courseId, `token_${i}`, sessionDate, sessionDate] // expires_at same as created roughly (expired)
            );
            const sessionId = sRes.insertId;

            // Mark Attendance with Probability
            for (const sId of studentIds) {
                // Determine probability based on student index (some good, some bad)
                // First 3 students: 95% attendance
                // Middle: 80%
                // Last: 60%
                let probability = 0.8;
                const studentIndex = studentIds.indexOf(sId);
                if (studentIndex < 3) probability = 0.95;
                else if (studentIndex > 7) probability = 0.60;

                const isPresent = Math.random() < probability;
                const status = isPresent ? 'present' : 'absent';

                // Only insert if present (or we can explicitly log 'absent' if the schema supports it, 
                // but checking attendance.js usually implies presence record exists. 
                // However, the dashboard query pulls LEFT JOIN so lack of record = absent.
                // But let's see if we want to explicitly mark 'absent' rows?
                // The route `router.get('/session/:sessionId/live'` does LEFT JOIN attendance. 
                // If record exists with 'present', it's present. If NULL, 'absent'.
                // So we ONLY insert 'present' records.

                if (isPresent) {
                    await connection.query(
                        'INSERT INTO attendance (session_id, student_id, status, latitude, longitude, captured_at) VALUES (?, ?, ?, 22.5726, 88.3639, ?)',
                        [sessionId, sId, 'present', sessionDate]
                    );
                }
            }
        }

        console.log("Seeding Complete!");
        connection.release();
        process.exit(0);

    } catch (err) {
        console.error("Seeding Failed:", err);
        process.exit(1);
    }
}

seed();
