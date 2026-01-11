-- -- Seeds for Smart Attendance System
-- -- Run this AFTER schema.sql
-- USE smart_attendance;

-- -- Note: Passwords are hashed. These are placeholders.
-- -- Real passwords should be generated via the application or a seeding script.
-- -- For the demo, use 'password123' which corresponds to the hash below (generated via bcrypt).
-- -- Hash for 'password123': $2b$10$3euPcmQFCiblsZeEu5s7p.9/..3.7.8.9.0 (Example - replace with real one from app)

-- INSERT INTO users (full_name, email, password_hash, role, device_id) VALUES
-- ('John Doe', 'teacher@example.com', '$2b$10$YourGeneratedHashHere', 'teacher', 'device_t_1'),
-- ('Alice Smith', 'alice@example.com', '$2b$10$YourGeneratedHashHere', 'student', 'device_s_1'),
-- ('Bob Jones', 'bob@example.com', '$2b$10$YourGeneratedHashHere', 'student', 'device_s_2');

-- INSERT INTO courses (teacher_id, course_name, course_code, description) VALUES
-- (1, 'Introduction to Computer Science', 'CS101', 'Basics of programming and algorithms'),
-- (1, 'Web Development', 'CS202', 'Full stack web development');

-- INSERT INTO enrollments (course_id, student_id) VALUES
-- (1, 2),
-- (1, 3),
-- (2, 2);


-- Sample Data for Smart Attendance System
-- Contains realistic Indian Bengali names for testing
-- Run this AFTER schema.sql

USE smart_attendance;

-- ============================================================
-- USERS TABLE - Teachers & Students with Bengali Names
-- ============================================================
-- Password hash is for 'password123' - generated via bcrypt
-- Use this password when testing login functionality

-- Teachers (5 entries)
INSERT INTO users (full_name, email, password_hash, role, device_id) VALUES
('Dr. Subhash Chandra Bose', 'subhash.bose@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'teacher', 'TEACH_001'),
('Prof. Ananya Mukherjee', 'ananya.mukherjee@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'teacher', 'TEACH_002'),
('Dr. Debashis Chatterjee', 'debashis.chatterjee@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'teacher', 'TEACH_003'),
('Prof. Sangita Banerjee', 'sangita.banerjee@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'teacher', 'TEACH_004'),
('Dr. Arunabha Sen', 'arunabha.sen@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'teacher', 'TEACH_005');

-- Students (25 entries with varied Bengali names)
INSERT INTO users (full_name, email, password_hash, role, device_id) VALUES
-- Male Students
('Aritra Ghosh', 'aritra.ghosh@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_001'),
('Souvik Dey', 'souvik.dey@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_002'),
('Pritam Chakraborty', 'pritam.chakraborty@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_003'),
('Aniket Sarkar', 'aniket.sarkar@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_004'),
('Sayan Bhattacharya', 'sayan.bhattacharya@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_005'),
('Dipankar Roy', 'dipankar.roy@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_006'),
('Subhajit Mondal', 'subhajit.mondal@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_007'),
('Rajdeep Basu', 'rajdeep.basu@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_008'),
('Anirban Pal', 'anirban.pal@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_009'),
('Debayan Das', 'debayan.das@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_010'),
('Rishav Majumdar', 'rishav.majumdar@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_011'),
('Utsav Kundu', 'utsav.kundu@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_012'),

-- Female Students
('Shreya Ganguly', 'shreya.ganguly@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_013'),
('Poulami Dutta', 'poulami.dutta@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_014'),
('Tanushree Mitra', 'tanushree.mitra@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_015'),
('Arpita Gupta', 'arpita.gupta@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_016'),
('Sneha Saha', 'sneha.saha@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_017'),
('Moumita Biswas', 'moumita.biswas@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_018'),
('Satabdi Chowdhury', 'satabdi.chowdhury@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_019'),
('Rimjhim Sengupta', 'rimjhim.sengupta@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_020'),
('Priyanka Nandi', 'priyanka.nandi@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_021'),
('Adrija Lahiri', 'adrija.lahiri@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_022'),
('Kaushiki Bhowmik', 'kaushiki.bhowmik@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_023'),
('Swagata Kar', 'swagata.kar@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_024'),
('Nilanjana Ghose', 'nilanjana.ghose@gmail.com', '$2a$10$Qv2uUAsFxeYdZfaI.B2ClOVJBY6eqqfZlhzPv4afElnzfg04li.7Ay', 'student', 'STU_025');

-- ============================================================
-- COURSES TABLE - Sample Courses
-- ============================================================
-- Assuming teacher IDs start from 1 (adjust based on your AUTO_INCREMENT starting point)

INSERT INTO courses (teacher_id, course_name, course_code, description) VALUES
(1, 'Data Structures and Algorithms', 'CS201', 'Fundamental data structures and algorithmic techniques'),
(1, 'Operating Systems', 'CS301', 'Concepts of process management, memory, and file systems'),
(2, 'Database Management Systems', 'CS202', 'Relational databases, SQL, and normalization'),
(2, 'Software Engineering', 'CS401', 'Software development lifecycle and best practices'),
(3, 'Computer Networks', 'CS303', 'Network protocols, architectures, and security'),
(3, 'Machine Learning', 'CS501', 'Supervised and unsupervised learning algorithms'),
(4, 'Discrete Mathematics', 'MA101', 'Logic, sets, relations, and graph theory'),
(4, 'Probability and Statistics', 'MA201', 'Statistical methods for data analysis'),
(5, 'Digital Electronics', 'EC101', 'Digital circuits and logic design'),
(5, 'Microprocessors', 'EC201', '8085/8086 architecture and programming');

-- ============================================================
-- ENROLLMENTS TABLE - Student Course Enrollments
-- ============================================================
-- Distributing students across different courses
-- Student IDs assumed to start from 6 (after 5 teachers)

INSERT INTO enrollments (course_id, student_id) VALUES
-- CS201 - Data Structures (Students 6-15)
(1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
(1, 11), (1, 12), (1, 13), (1, 14), (1, 15),

-- CS301 - Operating Systems (Students 6-12)
(2, 6), (2, 7), (2, 8), (2, 9), (2, 10), (2, 11), (2, 12),

-- CS202 - Database Management (Students 13-22)
(3, 13), (3, 14), (3, 15), (3, 16), (3, 17),
(3, 18), (3, 19), (3, 20), (3, 21), (3, 22),

-- CS401 - Software Engineering (Students 16-25)
(4, 16), (4, 17), (4, 18), (4, 19), (4, 20),
(4, 21), (4, 22), (4, 23), (4, 24), (4, 25),

-- CS303 - Computer Networks (Students 8-18)
(5, 8), (5, 9), (5, 10), (5, 11), (5, 12),
(5, 13), (5, 14), (5, 15), (5, 16), (5, 17), (5, 18),

-- CS501 - Machine Learning (Students 6, 8, 10, 12, 14, 16, 18, 20)
(6, 6), (6, 8), (6, 10), (6, 12), (6, 14), (6, 16), (6, 18), (6, 20),

-- MA101 - Discrete Mathematics (Students 7-17)
(7, 7), (7, 8), (7, 9), (7, 10), (7, 11),
(7, 12), (7, 13), (7, 14), (7, 15), (7, 16), (7, 17),

-- MA201 - Probability and Statistics (Students 18-28)
(8, 18), (8, 19), (8, 20), (8, 21), (8, 22),
(8, 23), (8, 24), (8, 25),

-- EC101 - Digital Electronics (Students 6, 9, 12, 15, 18, 21, 24)
(9, 6), (9, 9), (9, 12), (9, 15), (9, 18), (9, 21), (9, 24),

-- EC201 - Microprocessors (Students 7, 10, 13, 16, 19, 22, 25)
(10, 7), (10, 10), (10, 13), (10, 16), (10, 19), (10, 22), (10, 25);

-- ============================================================
-- SAMPLE SESSIONS (Optional - for testing attendance features)
-- ============================================================
-- Creating a few sample sessions for testing

INSERT INTO sessions (course_id, session_token, pin, latitude, longitude, radius_meters, is_active, expires_at) VALUES
(1, 'session_cs201_jan11_2026', '1234', 22.5726, 88.3639, 100, TRUE, DATE_ADD(NOW(), INTERVAL 2 HOUR)),
(3, 'session_cs202_jan11_2026', '5678', 22.5726, 88.3639, 75, TRUE, DATE_ADD(NOW(), INTERVAL 1 HOUR)),
(5, 'session_cs303_jan11_2026', '9012', 22.5726, 88.3639, 50, FALSE, DATE_ADD(NOW(), INTERVAL -1 HOUR));

-- ============================================================
-- SAMPLE ATTENDANCE RECORDS (Optional - for testing)
-- ============================================================
-- Adding some attendance records for the active sessions

INSERT INTO attendance (session_id, student_id, status, device_id, latitude, longitude) VALUES
-- Session 1 (CS201) attendance
(1, 6, 'present', 'STU_001', 22.5726, 88.3639),
(1, 7, 'present', 'STU_002', 22.5727, 88.3640),
(1, 8, 'late', 'STU_003', 22.5728, 88.3641),
(1, 9, 'present', 'STU_004', 22.5725, 88.3638),
(1, 10, 'absent', NULL, NULL, NULL),
(1, 11, 'present', 'STU_006', 22.5724, 88.3637),
(1, 12, 'present', 'STU_007', 22.5729, 88.3642),
(1, 13, 'late', 'STU_008', 22.5730, 88.3643),

-- Session 2 (CS202) attendance
(2, 13, 'present', 'STU_013', 22.5726, 88.3639),
(2, 14, 'present', 'STU_014', 22.5727, 88.3640),
(2, 15, 'present', 'STU_015', 22.5728, 88.3641),
(2, 16, 'late', 'STU_016', 22.5725, 88.3638),
(2, 17, 'absent', NULL, NULL, NULL),
(2, 18, 'present', 'STU_018', 22.5724, 88.3637);

-- ============================================================
-- QUICK REFERENCE - Test Credentials
-- ============================================================
-- All users have the password: password123
-- 
-- TEACHERS:
-- subhash.bose@gmail.com | Dr. Subhash Chandra Bose
-- ananya.mukherjee@gmail.com | Prof. Ananya Mukherjee
-- debashis.chatterjee@gmail.com | Dr. Debashis Chatterjee
-- sangita.banerjee@gmail.com | Prof. Sangita Banerjee
-- arunabha.sen@gmail.com | Dr. Arunabha Sen
--
-- STUDENTS (sample):
-- aritra.ghosh@gmail.com | Aritra Ghosh
-- shreya.ganguly@gmail.com | Shreya Ganguly
-- souvik.dey@gmail.com | Souvik Dey
-- poulami.dutta@gmail.com | Poulami Dutta
