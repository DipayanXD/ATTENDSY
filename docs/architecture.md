# System Architecture

## Overview
The Smart Student Attendance & Engagement Tracking System is a full-stack web application designed to modernize classroom attendance using QR codes, Geo-fencing, and Device Fingerprinting.

## Tech Stack
- **Frontend:** HTML5, CSS3 (Custom Properties), JavaScript (ES6+).
- **Backend:** Node.js, Express.js.
- **Database:** MySQL.
- **Authentication:** JWT (JSON Web Tokens).

## Architecture Diagram (Text Representation)
```
[User Device (Mobile/Laptop)] 
       |
       | HTTP/REST (JSON)
       v
[Node.js Backend (Express)]
       |
       | SQL
       v
[MySQL Database]
```

## Core Components

### 1. Frontend
- **Single Page Application (SPA) feel:** Uses vanilla JS to manage state and navigation between dashboards without full page reloads for some interactions (though distinct HTML pages are used for Role separation: `index.html`, `dashboard_teacher.html`, `dashboard_student.html`).
- **Styling:** Uses CSS Variables for theming (Navy/Red/Yellow palette).
- **QR Generation:** Uses `qrcode.js` library in the browser.

### 2. Backend
- **Auth Service:** Handles Registration, Login, and JWT issuance.
- **Session Manager:** 
    - Teachers create "Sessions" which generate a unique random token.
    - Token is valid for a short duration (e.g., 10 minutes).
    - Stores Teacher's Geo-location as the center of the "Classroom".
- **Attendance Processor:**
    - Receives Student's Token + Location + Device ID.
    - Validates Token (Active & Correct).
    - Validates Location (Haversine Distance <= Radius).
    - Records Attendance.

### 3. Database Schema
- **Users:** Stores Students and Teachers.
- **Courses:** Metadata for classes.
- **Enrollments:** Links Students to Courses.
- **Sessions:** Temporary active class instances (Time + Location).
- **Attendance:** Final records.

## Security Features
- **Geo-fencing:** Prevents students from scanning the code remotely (e.g., from a photo sent by a friend).
- **Token Rotation:** Each session has a unique token.
- **Device ID:** Simple browser fingerprinting (localStorage based for prototype) to track devices.
