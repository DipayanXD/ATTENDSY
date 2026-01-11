# Smart Student Attendance & Engagement Tracking System

A full-stack web application for tracking student attendance using QR codes and Geo-fencing.

## Project Structure
- `backend/`: Node.js Express API.
- `frontend/`: HTML/CSS/JS Static Client.
- `database/`: SQL Schema and Seeds.
- `docs/`: Architecture and API documentation.

## Prerequisites
1. **Node.js** (v14 or higher) installed.
2. **MySQL** Database installed and running.

## Installation & Setup

### 1. Database Setup
1. Open your MySQL Client (Workbench, CLI, etc.).
2. Create the database and tables by running the script in `database/schema.sql`.
3. (Optional) Populate demo data by running `database/seeds.sql` OR use the automated seeder in step 3.

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. **Configure Environment:**
   - Open `.env` file.
   - Update `DB_PASS` with your MySQL root password.
   - Update `DB_USER` if different from `root`.
4. **Seed Data (Recommended):**
   - Run the seeder script to create demo users with valid hashed passwords:
   ```bash
   npm run seed
   ```
   *(This creates users: `teacher@example.com`, `alice@example.com` with password `password123`)*

5. **Start Server:**
   ```bash
   npm start
   ```
   Server will run on `http://localhost:5000`.

### 3. Frontend Setup
1. Navigate to the `frontend` folder.
2. Simply open `index.html` in your browser.
   *(For best results with Geolocation, serve via a local server like Live Server in VS Code, but file:// protocol often works for localhost development).*

## Usage Guide

### Teacher Flow
1. Login as Teacher (`teacher@example.com` / `password123`).
2. Create a Course (if none exist).
3. Click "Start Session" for a course.
4. Allow Location Access when prompted.
5. A QR Code and a Token string will appear. Display this to students.

### Student Flow
1. Login as Student (`alice@example.com` / `password123`).
2. Allow Location Access (Critical for Geo-fencing).
3. Enter the Token displayed by the teacher (or scan if camera feature is enabled/extended).
4. Click "Submit Attendance".
5. Success message confirms attendance if you are within range (default 50m) of the teacher.

## Troubleshooting
- **Database Connection Error:** Check `.env` password and ensure MySQL service is running.
- **Geolocation Error:** Ensure your browser has permission to access location.
- **CORS Error:** The backend is configured to allow all origins, but ensure you are accessing the frontend via a standard method.

## Technologies
- Node.js, Express, MySQL, HTML5, CSS3.
