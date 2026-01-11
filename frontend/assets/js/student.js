// --- Global State ---
let userLocation = null;
let html5QrCode = null;
let enrolledCourses = [];
let activeView = 'home';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadStudentData();
    setupNavigation();
    loadNotifications();

    // Simulate initial user (replace with actual auth logic)
    const name = localStorage.getItem('name') || 'Dipayan';
    document.getElementById('user-name-display').textContent = name;
    document.getElementById('profile-init-lg') ? document.getElementById('profile-init-lg').textContent = name[0] : null;
});

function setupNavigation() {
    // Nav handled via onclick="switchView('...')" in HTML
    // We can add swipe gestures later if needed
}

function switchView(viewName) {
    // Update State
    activeView = viewName;

    // 1. Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));

    // 2. Show target view
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add('active');

    // 3. Update Bottom Nav Active State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navItem = document.getElementById(`nav-${viewName}`);
    if (navItem) navItem.classList.add('active');

    // 4. Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Data Loading ---
async function loadStudentData() {
    // 1. Init Stats (Mock for now, replace with API fetch)
    updateStats({
        total: 45,
        attended: 38,
        missed: 7,
        engagement: 88
    });

    // 2. Load Courses
    await loadCourses();

    // 3. Load Recent Activity
    loadRecentActivity();

    // 4. Init Calendar
    renderCalendar(new Date());
}

function updateStats(stats) {
    document.getElementById('val-total').textContent = stats.total;

    const attendPct = Math.round((stats.attended / stats.total) * 100);
    document.getElementById('val-attended').textContent = `${attendPct}%`;

    document.getElementById('val-missed').textContent = stats.missed;
    document.getElementById('val-score').textContent = stats.engagement;

    // Color logic if needed
    if (stats.missed === 0) document.querySelector('.stat-card.red .stat-value').style.color = 'var(--success-color)';
}

async function loadCourses() {
    // Mock Data
    const courses = [
        { code: 'CS201', name: 'Data Structures', dept: 'CS', color: '#7C3AED', progress: 85, next: 'Mon 10:00 AM' },
        { code: 'EC101', name: 'Digital Logic', dept: 'EC', color: '#F59E0B', progress: 60, next: 'Tue 02:00 PM' },
        { code: 'MA102', name: 'Linear Algebra', dept: 'MA', color: '#3B82F6', progress: 92, next: 'Wed 11:00 AM' },
        { code: 'CS305', name: 'Operating Sys', dept: 'CS', color: '#10B981', progress: 78, next: 'Fri 09:00 AM' }
    ];
    enrolledCourses = courses;

    // Render Horizontal Scroll (Home)
    const container = document.getElementById('home-courses-scroll');
    container.innerHTML = '';

    courses.forEach(c => {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.style.setProperty('--course-color', c.color);
        card.style.setProperty('--percent', `${c.progress}%`);
        card.style.borderLeftColor = c.color;

        card.innerHTML = `
            <div class="progress-circle">
                <div class="progress-value" style="color:${c.color}">${c.progress}%</div>
            </div>
            <div class="course-header">
                <div class="course-badge" style="color:${c.color}">${c.dept}</div>
                <div>
                   <div style="font-weight:800; font-size:1.1rem;">${c.code}</div>
                   <div class="text-sm text-muted">${c.name}</div>
                </div>
            </div>
            <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
                <div class="text-xs text-muted">Next Class</div>
                <div style="font-weight:600; font-size:0.85rem;">${c.next}</div>
            </div>
        `;
        container.appendChild(card);
    });

    // Render Full List (Courses View)
    const fullList = document.getElementById('courses-full-list');
    fullList.innerHTML = '';
    courses.forEach(c => {
        const row = document.createElement('div');
        row.className = 'card';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.borderLeft = `4px solid ${c.color}`;

        row.innerHTML = `
            <div>
                <h4 style="margin-bottom:4px;">${c.name}</h4>
                <div class="text-sm text-muted">${c.code} • AttendSy Score: ${c.progress}</div>
            </div>
            <div style="text-align:right;">
                <button class="btn-icon-circle" style="width:32px; height:32px; color:var(--primary-color); background:#f3f4f6;" onclick="alert('Details for ${c.code}')">➝</button>
            </div>
         `;
        fullList.appendChild(row);
    });
}

function loadRecentActivity() {
    const list = document.getElementById('home-activity-list');
    const activities = [
        { title: 'Attended CS201', time: 'Today, 10:05 AM', icon: '✅', color: 'green' },
        { title: 'Missed EC101', time: 'Yesterday, 02:00 PM', icon: '❌', color: 'red' },
        { title: 'New Assignment', time: '2 days ago', icon: '📝', color: 'blue' }
    ];

    list.innerHTML = '';
    activities.forEach(a => {
        const item = document.createElement('div');
        // Simple list styling inline for now
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '16px';
        item.style.padding = '12px 0';
        item.style.borderBottom = '1px solid #eee';

        item.innerHTML = `
            <div style="width:40px; height:40px; background:${a.color === 'green' ? '#d1fae5' : a.color === 'red' ? '#fee2e2' : '#e0f2fe'}; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
                ${a.icon}
            </div>
            <div>
                <div style="font-weight:600; font-size:0.95rem;">${a.title}</div>
                <div class="text-xs text-muted">${a.time}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

// --- SCANNER LOGIC ---

async function openScanner() {
    const modal = document.getElementById('scanner-modal');
    modal.classList.add('active');

    // Start Camera
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess,
            (errorMessage) => { /* ignore per frame errors */ }
        );
    } catch (err) {
        console.error("Camera Error:", err);
        alert("Camera permission denied or not available.");
        closeScanner();
    }
}

async function closeScanner() {
    const modal = document.getElementById('scanner-modal');
    modal.classList.remove('active');

    if (html5QrCode) {
        try {
            await html5QrCode.stop();
        } catch (e) {
            console.log(e);
        }
    }
}

function onScanSuccess(decodedText) {
    // 1. Audio Feedback
    // const audio = new Audio('assets/sounds/beep.mp3'); audio.play();

    // 2. Vibrate
    if (navigator.vibrate) navigator.vibrate(200);

    // 3. Close & Mark
    closeScanner();
    markAttendance(decodedText);
}

function switchManualEntry() {
    closeScanner();
    const code = prompt("Enter Session Pin:");
    if (code) markAttendance(code);
}

async function markAttendance(code) {
    // Mock API Call
    alert("Processing Attendance for Code: " + code);

    // Simulate Success
    setTimeout(() => {
        alert("✅ Attendance Marked Successfully!");
        updateStats({ total: 46, attended: 39, missed: 7, engagement: 89 }); // Optimistic update
    }, 1000);
}


// --- CALENDAR LOGIC (Simplified) ---
function renderCalendar(date) {
    const grid = document.getElementById('full-calendar-grid');
    grid.innerHTML = '';

    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('cal-month-name').textContent = `${monthNames[month]} ${year}`;

    // Logic to fill days (Same as previous but rendered into new grid)
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Adjust for Mon start if needed (User Ref shows Mon) for now assume Sun start for simplicity or adjust
    // Ref image shows Mon->Sun.
    const startOffset = (firstDay === 0) ? 6 : firstDay - 1;

    // Headers
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    days.forEach(d => {
        const h = document.createElement('div');
        h.className = 'cal-day-name';
        h.textContent = d;
        grid.appendChild(h);
    });

    // Empty slots
    for (let i = 0; i < startOffset; i++) {
        grid.appendChild(document.createElement('div'));
    }

    // Days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        cell.textContent = i;

        if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            cell.classList.add('today');
        }

        // Random "Present" dots for demo
        if (Math.random() > 0.7) cell.classList.add('present');

        cell.onclick = () => {
            document.querySelectorAll('.cal-cell').forEach(c => c.style.background = '');
            if (!cell.classList.contains('today')) cell.style.background = '#eee';
            document.getElementById('selected-date-schedule').innerHTML = `<p class="text-center p-4">No classes scheduled for ${i} ${monthNames[month]}.</p>`;
        };

        grid.appendChild(cell);
    }
}

let currentCalDate = new Date();
function changeMonth(delta) {
    currentCalDate.setMonth(currentCalDate.getMonth() + delta);
    renderCalendar(currentCalDate);
}


// --- NOTIFICATIONS ---
function loadNotifications() {
    const list = document.getElementById('notifications-list');
    const data = [
        { title: "Exam Schedule Released", body: "Final exams start on May 15th.", type: "urgent" },
        { title: "Class Cancelled", body: "CS201 is cancelled today.", type: "warning" },
        { title: "Assignment Due", body: "Submit Project Phase 1 by tomorrow.", type: "info" }
    ];

    data.forEach(n => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeft = n.type === 'urgent' ? '4px solid red' : n.type === 'warning' ? '4px solid orange' : '4px solid blue';
        card.innerHTML = `
            <h4>${n.title}</h4>
            <p class="text-muted text-sm" style="margin-top:4px;">${n.body}</p>
         `;
        list.appendChild(card);
    });
}
