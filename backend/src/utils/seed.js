const bcrypt = require('bcryptjs');
const db = require('../config/db');

const seed = async () => {
    try {
        console.log('Seeding database...');

        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Delete existing data to avoid duplicates (optional, strictly for demo)
        await db.query('DELETE FROM attendance');
        await db.query('DELETE FROM sessions');
        await db.query('DELETE FROM enrollments');
        await db.query('DELETE FROM courses');
        await db.query('DELETE FROM users');

        // Ensure pin column exists (for schema updates)
        try {
            await db.query('ALTER TABLE sessions ADD COLUMN pin VARCHAR(10) NULL');
            console.log('Added pin column to sessions table');
        } catch (e) {
            // Column likely already exists, ignore
            console.log('Pin column already exists or error');
        }

        // Insert Users
        const [teacher] = await db.query(
            'INSERT INTO users (full_name, email, password_hash, role, device_id) VALUES (?, ?, ?, ?, ?)',
            ['John Doe', 'teacher@example.com', hash, 'teacher', 'device_t_1']
        );

        const [student1] = await db.query(
            'INSERT INTO users (full_name, email, password_hash, role, device_id) VALUES (?, ?, ?, ?, ?)',
            ['Alice Smith', 'alice@example.com', hash, 'student', 'device_s_1']
        );

        const [student2] = await db.query(
            'INSERT INTO users (full_name, email, password_hash, role, device_id) VALUES (?, ?, ?, ?, ?)',
            ['Bob Jones', 'bob@example.com', hash, 'student', 'device_s_2']
        );

        console.log('Users inserted');

        // Insert Course
        const [course] = await db.query(
            'INSERT INTO courses (teacher_id, course_name, course_code, description) VALUES (?, ?, ?, ?)',
            [teacher.insertId, 'Intro to CS', 'CS101', 'Basics of CS']
        );

        console.log('Course inserted');

        // Enroll Students
        await db.query('INSERT INTO enrollments (course_id, student_id) VALUES (?, ?)', [course.insertId, student1.insertId]);
        await db.query('INSERT INTO enrollments (course_id, student_id) VALUES (?, ?)', [course.insertId, student2.insertId]);

        console.log('Enrollments inserted');
        console.log('Seeding complete. Password for all users is: password123');
        process.exit();

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
