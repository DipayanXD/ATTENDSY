# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

### POST /auth/register
- Body: `{ full_name, email, password, role, device_id }`
- Response: `{ message: "User registered successfully" }`

### POST /auth/login
- Body: `{ email, password, device_id }`
- Response: `{ token, role, name, id }`

## Courses

### GET /courses
- Headers: `Authorization: Bearer <token>`
- Response: `[ { id, course_name, course_code... } ]`
- Behavior: Returns created courses for Teachers, enrolled courses for Students.

### POST /courses (Teacher Only)
- Headers: `Authorization: Bearer <token>`
- Body: `{ course_name, course_code, description }`

## Attendance

### POST /attendance/start (Teacher Only)
- Headers: `Authorization: Bearer <token>`
- Body: `{ course_id, latitude, longitude, radius }`
- Response: `{ session_id, session_token, message }`

### POST /attendance/mark (Student Only)
- Headers: `Authorization: Bearer <token>`
- Body: `{ session_token, latitude, longitude, device_id }`
- Response: `{ message: "Attendance marked successfully!" }`

### GET /attendance/history (Student Only)
- Headers: `Authorization: Bearer <token>`
- Response: `[ { course_name, status, session_date... } ]`

### GET /attendance/course/:courseId (Teacher Only)
- Headers: `Authorization: Bearer <token>`
- Response: List of all attendance records for the course.
