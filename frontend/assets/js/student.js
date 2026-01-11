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

    // Simulate initial user
    const name = localStorage.getItem('name') || 'Aritra Ghosh';
    document.getElementById('user-name-display').textContent = name;

    // Generate/Load Roll Number: [309427]24{***}
    let roll = localStorage.getItem('studentRoll');
    if (!roll) {
        const random3 = Math.floor(Math.random() * 900) + 100; // 100-999
        roll = `30942724${random3}`;
        localStorage.setItem('studentRoll', roll);
    }

    // Update UI types
    const profileIdEl = document.getElementById('profile-id');
    if (profileIdEl) profileIdEl.textContent = `Roll No: ${roll}`;

    // Update Profile Name
    const profileNameEl = document.getElementById('profile-name');
    if (profileNameEl) profileNameEl.textContent = name;

    // Update Initials (Header & Profile View)
    const initial = name.charAt(0).toUpperCase();
    const headerInitEl = document.getElementById('user-initial');
    const profileInitEl = document.getElementById('profile-initial-lg');

    if (headerInitEl) headerInitEl.textContent = initial;
    if (profileInitEl) profileInitEl.textContent = initial;
});

function setupNavigation() {
    // Initialize Slider Position
    const activeItem = document.querySelector('.nav-item.active');
    if (activeItem) moveNavSlider(activeItem);
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
    if (navItem) {
        navItem.classList.add('active');
        moveNavSlider(navItem);
    }

    // 4. Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function moveNavSlider(targetEl) {
    const slider = document.querySelector('.nav-slider');
    if (slider && targetEl) {
        // Calculate relative position to CENTER the slider
        const nav = document.querySelector('.bottom-nav');
        const navRect = nav.getBoundingClientRect();
        const itemRect = targetEl.getBoundingClientRect();
        const sliderRect = slider.getBoundingClientRect(); // Get current size (fixed by CSS)

        // Center Point of Item relative to Nav
        const itemCenter = (itemRect.left - navRect.left) + (itemRect.width / 2);

        // Target Left for Slider to be centered
        // We assume slider width is fixed in CSS (e.g. 60px)
        // If we can't trust getBoundingClientRect because it's hidden/zero initially, use fixed 64
        const sliderWidth = 64;
        const offsetLeft = itemCenter - (sliderWidth / 2);

        slider.style.opacity = '1';
        // Do NOT change width/height (handled by CSS for perfect circle)
        slider.style.transform = `translateX(${offsetLeft}px)`;
        slider.style.left = '0';
    }
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

    // 5. Load Up Next (New)
    loadUpNext();
}

function loadUpNext() {
    const container = document.getElementById('up-next-container');
    // Mock Data
    const nextClass = {
        code: 'CS201',
        name: 'Data Structures',
        time: '10:00 AM',
        location: 'Room 304, Sci Block',
        status: 'Starting in 15 mins',
        isOnline: true
    };

    container.innerHTML = `
        <div class="up-next-card">
            <div class="up-next-header">
                <span class="time-badge">⚡ ${nextClass.status}</span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.8"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            </div>
            <div class="up-next-content">
                <div class="text-sm" style="opacity:0.9; font-weight:500;">${nextClass.code}</div>
                <h3>${nextClass.name}</h3>
                <div class="up-next-details">
                     <span style="display:flex; align-items:center; gap:6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${nextClass.time}
                     </span>
                     <span style="display:flex; align-items:center; gap:6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${nextClass.location}
                     </span>
                </div>
                <button class="btn-join" onclick="alert('Joining Class Session...')">
                    Join Live Session
                </button>
            </div>
        </div>
    `;
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
        // Dynamic Border Top color
        card.style.borderTopColor = c.color;

        card.innerHTML = `
            <div class="course-header">
                <div class="course-badge" style="color:${c.color}; background:${c.color}15;">${c.dept}</div>
                <div>
                   <div style="font-weight:800; font-size:1.1rem; color:var(--text-dark);">${c.code}</div>
                   <div class="text-sm text-muted">${c.name}</div>
                </div>
            </div>
            
            <div style="margin-top:20px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span class="text-xs text-muted font-bold">Attendance</span>
                    <span class="text-xs font-bold" style="color:${c.color}">${c.progress}%</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${c.progress}%; background: ${c.color};"></div>
                </div>
            </div>

            <div style="margin-top:20px; padding-top:16px; border-top:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:center;">
                <div class="text-xs text-muted">Next Class: <span style="color:var(--text-dark); font-weight:600;">${c.next}</span></div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
        `;
        container.appendChild(card);
    });

    // Render Full List (Courses View)
    const fullList = document.getElementById('courses-full-list');
    fullList.innerHTML = '';
    courses.forEach(c => {
        const row = document.createElement('div');
        row.className = 'glass-card'; // Update to use glass card style if available
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.marginBottom = '12px';
        row.style.padding = '16px';
        row.style.borderLeft = `4px solid ${c.color}`;
        if (!row.classList.contains('glass-card')) row.className = 'card'; // Fallback

        row.innerHTML = `
            <div>
                <h4 style="margin-bottom:4px;">${c.name}</h4>
                <div class="text-sm text-muted">${c.code} • ${c.progress}% Attended</div>
            </div>
            <div style="text-align:right;">
                <button class="btn-icon-circle" style="width:36px; height:36px; color:var(--primary-color); background:#f3f4f6;" onclick="alert('Details for ${c.code}')">➝</button>
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

    // Icon Mapping (SVG)
    const icons = {
        '✅': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        '❌': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        '📝': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`
    };

    activities.forEach(a => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '16px';
        item.style.padding = '16px 0';
        item.style.borderBottom = '1px solid #f3f4f6';

        const svgIcon = icons[a.icon] || icons['📝'];
        // Use soft background colors based on type
        const bg = a.color === 'green' ? '#ecfdf5' : a.color === 'red' ? '#fef2f2' : '#eff6ff';
        const txtColor = a.color === 'green' ? '#059669' : a.color === 'red' ? '#dc2626' : '#2563eb';

        item.innerHTML = `
            <div style="width:48px; height:48px; background:${bg}; color:${txtColor}; border-radius:16px; display:flex; align-items:center; justify-content:center;">
                ${svgIcon}
            </div>
            <div style="flex:1;">
                <div style="font-weight:700; font-size:0.95rem; color:var(--text-dark);">${a.title}</div>
                <div class="text-xs text-muted" style="margin-top:2px;">${a.time}</div>
            </div>
            <button style="border:none; background:transparent; color:var(--text-muted); padding:8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
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

// --- ATTENDANCE MARKING LOGIC ---

async function markAttendance(code) {
    if (!code) return;
    code = code.trim(); // Clean input

    // 1. Show Loading State
    const originalText = document.querySelector('.nav-item-primary .nav-label').textContent;
    // document.querySelector('.nav-item-primary .nav-label').textContent = '...'; 

    console.log('[ATTENDANCE] Starting mark for:', code);

    try {
        // 2. Get Location
        console.log('[ATTENDANCE] Requesting location...');
        let location = { latitude: null, longitude: null };
        try {
            location = await getLocation(); // Returns {latitude, longitude}
            console.log('[ATTENDANCE] Location secured:', location);
        } catch (locErr) {
            console.warn('[ATTENDANCE] Location failed:', locErr);
            alert(`⚠️ Location warning: ${locErr.message}. Trying anyway...`);
            // We proceed even if location fails, backend might block it but we try.
        }

        // 3. Prepare Payload
        const payload = {
            latitude: location.latitude,
            longitude: location.longitude,
            device_id: getDeviceId() // from app.js
        };

        // Determine if code is PIN or Token
        // PIN is usually 4 digits, Token is hex string
        if (code.length === 4 && !isNaN(code)) {
            payload.pin = code;
        } else {
            payload.session_token = code;
        }

        console.log('[ATTENDANCE] Sending payload:', payload);

        // 4. API Call
        const res = await fetch(`${API_URL}/attendance/mark`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        console.log('[ATTENDANCE] Response status:', res.status);

        const contentType = res.headers.get("content-type");
        let data;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await res.json();
        } else {
            const text = await res.text();
            console.error('[ATTENDANCE] Non-JSON response:', text);
            throw new Error(`Server returned non-JSON response: ${res.status}`);
        }

        if (res.ok) {
            // Success
            alert(`✅ ${data.message}`);
            // Optimistic Update or Reload Stats
            loadStudentData();
        } else {
            // Error
            console.error('[ATTENDANCE] API Error:', data);
            throw new Error(data.message || 'Failed to mark attendance');
        }

    } catch (err) {
        console.error('[ATTENDANCE] Exception:', err);
        alert(`❌ Error: ${err.message}`);
    } finally {
        // Reset IDK
    }
}

function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser"));
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000, // 10s timeout
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                let msg = "Unable to retrieve your location";
                if (error.code === 1) msg = "Location permission denied. Please allow location access.";
                else if (error.code === 2) msg = "Location unavailable.";
                else if (error.code === 3) msg = "Location request timed out.";
                reject(new Error(msg));
            },
            options
        );
    });
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
