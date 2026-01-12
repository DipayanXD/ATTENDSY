// Tab Switching Logic
function switchTab(tabId) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    // Show selected
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    // Update Nav
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    // Find button that calls this tab (simple matching)
    const btn = Array.from(document.querySelectorAll('.nav-tab')).find(b => b.getAttribute('onclick').includes(tabId));
    if (btn) {
        btn.classList.add('active');
        updateNavSlider(btn);
    }

    if (tabId === 'students') {
        loadStudents();
    }
}

// Nav Slider Animation
function updateNavSlider(activeBtn) {
    const slider = document.querySelector('.nav-slider');
    if (slider && activeBtn) {
        slider.style.width = `${activeBtn.offsetWidth}px`;
        slider.style.transform = `translateX(${activeBtn.offsetLeft - 6}px)`; // -6 for padding offset
    }
}

// Initialize Slider and check for active session
document.addEventListener('DOMContentLoaded', () => {
    const activeBtn = document.querySelector('.nav-tab.active');
    if (activeBtn) updateNavSlider(activeBtn);

    // Check for active session on page load (for refresh persistence)
    checkActiveSession();
});

// Check and restore active session on page load
async function checkActiveSession() {
    try {
        const res = await fetch(`${API_URL}/attendance/active`, { headers: getHeaders() });
        const session = await res.json();

        if (session && session.id) {
            console.log('[SESSION] Restoring active session:', session.id);
            currentSessionId = session.id;
            const courseName = session.course?.course_name || 'Active Session';
            showSessionOverlay(courseName, session.session_token, session.pin);
            // Initial poll
            pollAttendance();
        }
    } catch (err) {
        console.log('[SESSION] No active session or error:', err.message);
    }
}

// Engagement Sub-Tab Switching
function switchEngagementTab(tabId) {
    // Hide all engagement panels
    document.querySelectorAll('.engagement-panel').forEach(el => el.classList.add('hidden'));
    // Show selected panel
    const panel = document.getElementById(`engagement-${tabId}`);
    if (panel) panel.classList.remove('hidden');

    // Update tab buttons
    document.querySelectorAll('#tab-engagement .tab-btn').forEach(el => el.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('#tab-engagement .tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if (btn) btn.classList.add('active');
}

// Quick Start from Timeline
// Quick Start from Timeline
function quickStartSession(courseId, courseName) {
    if (confirm(`Start session for ${courseName}?`)) {
        startSession(courseId, courseName);
    }
}

// Data Loading
async function loadCourses() {
    try {
        const res = await fetch(`${API_URL}/courses`, { headers: getHeaders() });
        const courses = await res.json();

        // Get both list elements (one might not exist depending on page)
        const coursesList = document.getElementById('courses-list');
        const scheduleList = document.getElementById('schedule-list');

        // Clear existing content
        if (coursesList) coursesList.innerHTML = '';
        if (scheduleList) scheduleList.innerHTML = '';

        if (!courses || courses.length === 0) {
            const emptyMsg = '<div style="text-align: center; color: var(--text-muted); padding: 1rem;">No courses found. Create one!</div>';
            if (coursesList) coursesList.innerHTML = emptyMsg;
            if (scheduleList) scheduleList.innerHTML = emptyMsg;
            return;
        }

        courses.forEach(c => {
            // 1. Render for Students Tab/Directory (if element exists)
            if (coursesList) {
                const div = document.createElement('div');
                div.className = 'course-item glass-card';
                div.style.padding = '1rem';
                div.style.display = 'flex';
                div.style.flexDirection = 'column';
                div.style.gap = '0.5rem';
                div.innerHTML = `
                    <div style="flex:1;">
                        <h4 style="margin-bottom: 0.25rem;">${c.course_code}</h4>
                        <p class="text-xs text-muted">${c.course_name}</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-top: auto;">
                        <button class="btn btn-primary" style="flex: 1; padding: 6px 12px; font-size: 0.8rem;" onclick="startSession(${c.id}, '${c.course_name}')">Start</button>
                    </div>
                `;
                coursesList.appendChild(div);
            }

            // 2. Render for Dashboard "Schedule" (Overview tab)
            if (scheduleList) {
                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.innerHTML = `
                     <div class="timeline-time">${c.course_code}</div>
                     <div class="timeline-content">
                        <h4>${c.course_name}</h4>
                        <p class="text-xs">${c.description || 'No description'}</p>
                        <button class="btn btn-primary"
                                style="margin-top: 10px; padding: 6px 16px; font-size: 0.8rem;"
                                onclick="quickStartSession(${c.id}, '${c.course_name}')">Start Session</button>
                    </div>
                `;
                scheduleList.appendChild(item);
            }
        });
    } catch (err) {
        console.error('Error loading courses:', err);
        const scheduleList = document.getElementById('schedule-list');
        if (scheduleList) {
            scheduleList.innerHTML = '<div style="text-align: center; color: var(--status-error-text); padding: 1rem;">Error loading courses. Check console.</div>';
        }
    }
}

async function createCourse(e) {
    e.preventDefault();
    const name = document.getElementById('course-name').value;
    const code = document.getElementById('course-code').value;
    const desc = document.getElementById('course-desc').value;

    try {
        const res = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ course_name: name, course_code: code, description: desc })
        });

        if (res.ok) {
            alert('Course created!');
            e.target.reset();
            loadCourses();
        } else {
            const data = await res.json();
            alert(data.error || data.message || 'Error creating course');
        }
    } catch (err) {
        alert('Server error');
    }
}

// --- Live Session Constants ---
let currentSessionId = null;
let rotationInterval = null;
let pollingInterval = null;
let timerInterval = null;
let currentMode = 'qr';

async function startSession(courseId, courseName) {
    if (!navigator.geolocation) {
        alert('Geolocation is required to start a session.');
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const res = await fetch(`${API_URL}/attendance/start`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    course_id: courseId,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    radius: 50
                })
            });
            const data = await res.json();

            if (res.ok) {
                currentSessionId = data.session_id;
                showSessionOverlay(courseName, data.session_token, data.pin);
            } else {
                alert(data.message || 'Error starting session');
            }
        } catch (err) {
            console.error(err);
            alert('Server error/connection fail');
        }
    }, () => {
        alert('Location access denied.');
    });
}

function showSessionOverlay(courseName, token, pin) {
    console.log('[SESSION] Opening overlay for:', courseName);
    console.log('[SESSION] Token:', token);
    console.log('[SESSION] PIN:', pin);

    // 1. Show UI
    document.getElementById('live-session-overlay').classList.remove('hidden');
    document.getElementById('live-course-name').textContent = courseName;
    document.getElementById('live-pin').textContent = pin || '----';

    // 2. Initial Render
    renderQR(token);
    startTimer();

    // 3. Start Intervals
    // Rotate Token every 30s
    console.log('[SESSION] Starting rotation interval (30s)');
    rotationInterval = setInterval(() => rotateToken(), 30000);
    // Poll Attendance every 3s
    pollingInterval = setInterval(() => pollAttendance(), 3000);
    // Update Clock
    setInterval(() => {
        document.getElementById('live-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);
}

// Quit: Just hide overlay, keep session active (teacher can reopen)
function quitSessionView() {
    // Clear Intervals (stop polling while not viewing)
    clearInterval(rotationInterval);
    clearInterval(pollingInterval);
    clearInterval(timerInterval);

    // Hide UI
    document.getElementById('live-session-overlay').classList.add('hidden');
    // Note: currentSessionId is NOT cleared - session stays active in DB
}

// End Session: Deactivate in database and clear everything
async function endSession() {
    if (!confirm('End this session? Students will no longer be able to mark attendance.')) {
        return;
    }

    try {
        // Call API to deactivate session in database
        await fetch(`${API_URL}/attendance/session/${currentSessionId}/end`, {
            method: 'POST',
            headers: getHeaders()
        });
        console.log('[SESSION] Session ended successfully');
    } catch (err) {
        console.error('[SESSION] Error ending session:', err);
    }

    // Clear Intervals
    clearInterval(rotationInterval);
    clearInterval(pollingInterval);
    clearInterval(timerInterval);

    // Clear session ID
    currentSessionId = null;

    // Hide UI
    document.getElementById('live-session-overlay').classList.add('hidden');
    loadDashboardStats(); // Refresh stats
}

// Legacy function for backwards compatibility
function closeSessionView() {
    endSession();
}

// Helper: Rotation Logic
async function rotateToken() {
    console.log('[ROTATE] Starting rotation for session:', currentSessionId);
    try {
        if (!currentSessionId) {
            console.error('[ROTATE] No currentSessionId!');
            return;
        }
        const res = await fetch(`${API_URL}/attendance/session/${currentSessionId}/rotate`, {
            method: 'POST',
            headers: getHeaders()
        });
        console.log('[ROTATE] Response status:', res.status);
        const data = await res.json();
        console.log('[ROTATE] Response data:', data);
        if (res.ok) {
            renderQR(data.session_token);
            startTimer(); // Reset visual timer
            console.log('[ROTATE] QR updated successfully');
        } else {
            console.error('[ROTATE] Server error:', data);
        }
    } catch (err) {
        console.error("[ROTATE] Token rotation failed", err);
    }
}

// Helper: Polling Logic
async function pollAttendance() {
    try {
        const res = await fetch(`${API_URL}/attendance/session/${currentSessionId}/live`, {
            headers: getHeaders()
        });
        const students = await res.json();

        if (res.ok) {
            updateStudentList(students);
        }
    } catch (err) {
        console.error("Polling failed", err);
    }
}

// UI Helpers
function renderQR(text) {
    const container = document.getElementById("qrcode-display");
    if (!container) return;
    container.innerHTML = '';
    // Increase size for full screen
    new QRCode(container, {
        text: text,
        width: 256,
        height: 256
    });
}

function setAccessMode(mode) {
    currentMode = mode;
    // Scope to overlay to avoid conflicts
    const overlay = document.getElementById('live-session-overlay');
    if (!overlay) return;

    overlay.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));

    // Find button by text content or index
    const btns = overlay.querySelectorAll('.toggle-btn');
    if (mode === 'qr' && btns[0]) btns[0].classList.add('active');
    if (mode === 'pin' && btns[1]) btns[1].classList.add('active');
    if (mode === 'both' && btns[2]) btns[2].classList.add('active');

    const qr = document.getElementById('qr-container');
    const pin = document.getElementById('pin-container');

    if (mode === 'qr') {
        qr.classList.remove('hidden');
        pin.classList.add('hidden');
    } else if (mode === 'pin') {
        qr.classList.add('hidden');
        pin.classList.remove('hidden');
    } else {
        qr.classList.remove('hidden');
        pin.classList.remove('hidden');
    }
}

function startTimer() {
    clearInterval(timerInterval);
    let timeLeft = 30;
    const bar = document.getElementById('qr-timer');
    const count = document.getElementById('timer-count');

    // Reset CSS animation
    bar.style.transition = 'none';
    bar.style.width = '100%';
    setTimeout(() => {
        bar.style.transition = 'width 30s linear';
        bar.style.width = '0%';
    }, 50);

    timerInterval = setInterval(() => {
        timeLeft--;
        if (count) count.textContent = timeLeft;
        if (timeLeft <= 0) clearInterval(timerInterval);
    }, 1000);
}

function updateStudentList(students) {
    const list = document.getElementById('live-student-list');
    list.innerHTML = '';

    let presentCount = 0;
    let absentCount = 0;

    students.forEach(s => {
        const row = document.createElement('div');
        row.className = 'live-student-row';

        let statusClass = 'text-muted';
        let statusText = 'Absent';
        let timeText = '--:--';

        if (s.status === 'present' || s.status === 'late') {
            presentCount++;
            statusClass = s.status === 'present' ? 'status-pill status-present' : 'status-pill status-late';
            statusText = s.status.charAt(0).toUpperCase() + s.status.slice(1);
            timeText = new Date(s.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            absentCount++;
            statusClass = 'status-pill status-late'; // Using 'late' color (yellow) for absent/pending or maybe gray? 
            // Better: Just text for absent
            statusClass = 'text-xs text-muted';
        }

        // Custom render for status pill vs text
        const statusHTML = (s.status === 'present' || s.status === 'late')
            ? `<span class="${statusClass}">${statusText}</span>`
            : `<span class="text-xs text-muted">Not Checked In</span>`;

        row.innerHTML = `
            <span style="font-weight: 500;">${s.full_name}</span>
            ${statusHTML}
            <span class="text-xs text-muted">${timeText}</span>
        `;
        list.appendChild(row);
    });

    // Update Counts
    document.getElementById('count-present').textContent = `${presentCount} Present`;
    document.getElementById('count-absent').textContent = `${absentCount} Absent`;
}


// Init
loadCourses();
loadDashboardStats();

// New Function: Load Dashboard Metrics
// Helper for counting animation
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

async function loadDashboardStats() {
    try {
        // Set Date
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        const res = await fetch(`${API_URL}/dashboard/teacher/stats`, { headers: getHeaders() });
        const data = await res.json();

        if (res.ok) {
            if (document.getElementById('metric-avg'))
                document.getElementById('metric-avg').textContent = data.avg_attendance + '%';

            if (document.getElementById('metric-students'))
                document.getElementById('metric-students').textContent = data.total_students;

            if (document.getElementById('metric-sessions'))
                document.getElementById('metric-sessions').textContent = data.active_sessions;

            // --- Enhanced Risk Metric Logic ---
            const atRiskCount = parseInt(data.at_risk) || 0;
            const totalStudents = parseInt(data.total_students) || 1;
            const riskPercent = Math.min(Math.round((atRiskCount / totalStudents) * 100), 100);

            // Animate Number
            if (document.getElementById('metric-risk')) {
                animateValue(document.getElementById('metric-risk'), 0, atRiskCount, 1500);
            }

            // Update Progress Bar
            const progressBar = document.getElementById('risk-progress-bar');
            if (progressBar) {
                setTimeout(() => { progressBar.style.width = `${riskPercent}%`; }, 200);
            }

            // Update Badge
            const badge = document.getElementById('risk-badge');
            if (badge) {
                if (atRiskCount > 0) badge.classList.remove('hidden');
                else badge.classList.add('hidden');
            }

            // --- Advanced Info Display (Breakdown & Trend) ---
            try {
                // Fetch detailed list for breakdown
                const riskRes = await fetch(`${API_URL}/dashboard/teacher/at-risk`, { headers: getHeaders() });
                const riskData = await riskRes.json();

                let highRisk = 0, medRisk = 0;
                let top3 = [];

                if (riskRes.ok && riskData.students) {
                    // Calculate Breakdown
                    riskData.students.forEach(s => {
                        if (s.attendance_percentage < 60) highRisk++;
                        else medRisk++;
                    });
                    top3 = riskData.students.slice(0, 3);
                }

                // Update Breakdown Text
                const breakdownEl = document.getElementById('risk-breakdown');
                if (breakdownEl) breakdownEl.textContent = `${highRisk} High, ${medRisk} Med`;

                // Update Timestamp
                const timeEl = document.getElementById('last-updated-risk');
                if (timeEl) timeEl.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                // Simulated Trend (Randomize for demo)
                // In real app, this would come from backend comparison
                const trendVal = document.getElementById('risk-trend-val');
                if (trendVal) {
                    const diff = Math.floor(Math.random() * 3); // 0, 1, or 2
                    const direction = Math.random() > 0.5 ? '+' : '-';
                    trendVal.textContent = `${direction}${diff} vs last week`;

                    // Update arrow color/rotation if needed (css handles color via parent class)
                    const trendParent = document.getElementById('risk-trend');
                    if (trendParent) {
                        trendParent.className = `metric-trend ${direction === '+' ? 'negative' : 'positive'}`; // Increasing risk is negative
                    }
                }

                // Populate Preview Tooltip
                const listEl = document.getElementById('risk-preview-list');
                if (listEl) {
                    if (top3.length > 0) {
                        listEl.innerHTML = top3.map(s => `
                             <li>
                                 <span>${s.full_name.split(' ')[0]}</span>
                                 <span class="risk-val" style="color: var(--status-error-text);">${s.attendance_percentage}%</span>
                             </li>
                         `).join('');
                    } else {
                        listEl.innerHTML = '<li style="justify-content:center; color: var(--status-success-text);">All Good!</li>';
                    }
                }

            } catch (e) { console.error('Risk detail fetch error', e); }

        }
    } catch (err) {
        console.error("Failed to load stats", err);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT DIRECTORY LOGIC
// ═══════════════════════════════════════════════════════════════════════════

async function loadStudents() {
    const tbody = document.getElementById('student-directory-body');
    if (!tbody) return;

    // Loading state if needed, or just keep previous until refresh
    // tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-muted">Loading directory...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/students`, { headers: getHeaders() });
        const students = await res.json();

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-muted">No students found. Add one!</td></tr>';
            return;
        }

        renderStudentTable(students);
    } catch (err) {
        console.error('Error loading students:', err);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-muted" style="color:red">Failed to load directory.</td></tr>';
    }
}

function renderStudentTable(students) {
    const tbody = document.getElementById('student-directory-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    students.forEach((s, index) => {
        const tr = document.createElement('tr');
        // Stagger Animation
        tr.style.animationDelay = `${index * 50}ms`; // 50ms cascading delay
        // Initial of name for avatar
        const initial = s.full_name ? s.full_name.charAt(0).toUpperCase() : '?';
        const enrolledDate = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Randomize status for demo/Crextio feel (Invited vs Absent) since we don't store it on user level yet
        // In real app, this would be "Last Active" or "Current Status"
        const isInvited = Math.random() > 0.3;
        const statusClass = isInvited ? 'invited' : 'absent';
        const statusText = isInvited ? '• Invited' : '• Absent';

        tr.innerHTML = `
            <td><input type="checkbox"></td>
            <td>
                <div class="table-user">
                    <div class="table-user-img">${initial}</div>
                    <span style="font-weight: 500;">${s.full_name}</span>
                </div>
            </td>
            <td>${s.email}</td>
            <td>Engineering</td> <!-- Hardcoded based on Ref (Department/Role) -->
            <td>${enrolledDate}</td>
            <td><span class="status-chip ${statusClass}">${statusText}</span></td>
            <td style="text-align: right;">
                <button type="button" class="btn btn-ghost btn-sm" onclick="viewStudentProfile('${s.id}')" title="View Profile" style="margin-right: 4px;">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="deleteStudent('${s.id}')" title="Delete">🗑️</button>
            </td>
        `;

        // Row Selection Logic (keep existing)
        tr.addEventListener('click', (e) => {
            // If clicking View button, don't toggle select
            if (e.target.closest('button')) return;
            if (e.target.type !== 'checkbox') {
                // Optional: open profile on row click too?
                // viewStudentProfile(s.id); 
            }
        });

        const cb = tr.querySelector('input[type="checkbox"]');
        cb.addEventListener('change', () => {
            if (cb.checked) tr.classList.add('selected');
            else tr.classList.remove('selected');
        });

        tbody.appendChild(tr);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT PROFILE MODAL LOGIC
// ═══════════════════════════════════════════════════════════════════════════

let currentProfileId = null;

async function viewStudentProfile(id) {
    currentProfileId = id;
    const modal = document.getElementById('student-profile-modal');
    if (modal) modal.classList.remove('hidden');

    // Show Loading state...
    const nameEl = document.getElementById('profile-name');
    if (nameEl) nameEl.textContent = 'Loading...';

    // Fetch details (Mocking or Fetching)
    // In real app: fetch(`${API_URL}/students/${id}`)
    try {
        const res = await fetch(`${API_URL}/students`, { headers: getHeaders() }); // Just getting list to find one for now
        const students = await res.json();
        // Handle ID comparison (string vs number)
        const student = students.find(s => s.id == id); // loose equality for string/int match

        if (student) {
            if (document.getElementById('profile-initial')) document.getElementById('profile-initial').textContent = student.full_name.charAt(0).toUpperCase();
            if (document.getElementById('profile-name')) document.getElementById('profile-name').textContent = student.full_name;
            if (document.getElementById('profile-email')) document.getElementById('profile-email').textContent = student.email;
            if (document.getElementById('profile-id')) document.getElementById('profile-id').textContent = `ID: #${String(student.id).padStart(5, '0')}`;

            // Mock Stats (since our backend is simple)
            const mockAttendance = Math.floor(Math.random() * 30 + 70);
            document.getElementById('profile-attendance').textContent = `${mockAttendance}%`;
            document.getElementById('profile-missed').textContent = Math.floor((100 - mockAttendance) / 10);
            document.getElementById('profile-late').textContent = Math.floor(Math.random() * 5);

            // Timeline
            document.getElementById('profile-timeline').innerHTML = `
                <div class="timeline-item">
                    <span class="dot"></span>
                    <p class="text-sm">Attended <strong>Engineering 101</strong> <span class="text-muted float-right">Today, 9:00 AM</span></p>
                </div>
                 <div class="timeline-item">
                    <span class="dot" style="background:var(--status-warning-solid)"></span>
                    <p class="text-sm">Late for <strong>System Design</strong> <span class="text-muted float-right">Yesterday</span></p>
                </div>
             `;
        }
    } catch (e) {
        console.error(e);
        document.getElementById('profile-name').textContent = 'Error loading';
    }
}

function closeProfileModal() {
    document.getElementById('student-profile-modal').classList.add('hidden');
}

function deleteCurrentProfile() {
    if (confirm('Are you sure you want to remove this student?')) {
        deleteStudent(currentProfileId);
        closeProfileModal();
    }
}

// Modal Logic
function openAddStudentModal() {
    document.getElementById('add-student-modal').classList.remove('hidden');
}

function closeAddStudentModal() {
    document.getElementById('add-student-modal').classList.add('hidden');
}

async function addStudent(e) {
    e.preventDefault();
    const name = document.getElementById('new-student-name').value;
    const email = document.getElementById('new-student-email').value;

    try {
        const res = await fetch(`${API_URL}/students`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ full_name: name, email: email })
        });

        if (res.ok) {
            closeAddStudentModal();
            loadStudents(); // Refresh list
            e.target.reset();
        } else {
            const data = await res.json();
            alert(data.message || 'Error adding student');
        }
    } catch (err) {
        console.error(err);
        alert('Server error');
    }
}

async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
        const res = await fetch(`${API_URL}/students/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (res.ok) {
            loadStudents(); // Refresh
        } else {
            alert('Error deleting student');
        }
    } catch (err) {
        console.error(err);
        alert('Server error');
    }
}

// Search Logic
const searchInput = document.getElementById('student-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#student-directory-body tr');
        rows.forEach(row => {
            // Very simple text search in entire row
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// AT-RISK STUDENTS MODAL LOGIC
// ═══════════════════════════════════════════════════════════════════════════

let atRiskStudentsData = []; // Store fetched data for filtering
let currentRiskFilter = 'all';

// Open At-Risk Modal
async function openAtRiskModal() {
    document.getElementById('at-risk-modal').classList.remove('hidden');
    await loadAtRiskStudents();
}

// Close At-Risk Modal
function closeAtRiskModal() {
    document.getElementById('at-risk-modal').classList.add('hidden');
}

// Load At-Risk Students from API
async function loadAtRiskStudents() {
    const listEl = document.getElementById('at-risk-list');
    listEl.innerHTML = '<div class="text-center text-muted p-4">Loading at-risk students...</div>';

    try {
        const res = await fetch(`${API_URL}/dashboard/teacher/at-risk`, { headers: getHeaders() });
        const data = await res.json();

        if (res.ok) {
            atRiskStudentsData = data.students || [];

            // Update summary counts
            document.getElementById('risk-high-count').textContent = data.breakdown?.high || 0;
            document.getElementById('risk-medium-count').textContent = data.breakdown?.medium || 0;
            document.getElementById('risk-low-count').textContent = data.breakdown?.low || 0;

            // Render the list
            renderAtRiskList(atRiskStudentsData);
        } else {
            listEl.innerHTML = '<div class="text-center text-muted p-4" style="color: var(--status-error-text);">Failed to load at-risk students.</div>';
        }
    } catch (err) {
        console.error('Error loading at-risk students:', err);
        listEl.innerHTML = '<div class="text-center text-muted p-4" style="color: var(--status-error-text);">Server error. Please try again.</div>';
    }
}

// Filter At-Risk Students by Level
function filterAtRiskByLevel(level) {
    currentRiskFilter = level;

    // Update active tab
    document.querySelectorAll('.risk-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = Array.from(document.querySelectorAll('.risk-tab')).find(t => t.getAttribute('onclick').includes(`'${level}'`));
    if (activeTab) activeTab.classList.add('active');

    // Filter and render
    const filtered = level === 'all'
        ? atRiskStudentsData
        : atRiskStudentsData.filter(s => s.risk_level === level);

    renderAtRiskList(filtered);
}

// Render At-Risk Students List
function renderAtRiskList(students) {
    const listEl = document.getElementById('at-risk-list');

    if (!students || students.length === 0) {
        listEl.innerHTML = `
            <div class="at-risk-empty">
                <span class="empty-icon">✅</span>
                <p>No students at risk${currentRiskFilter !== 'all' ? ` in the ${currentRiskFilter} category` : ''}!</p>
                <p class="text-xs mt-2">Great job! All students are attending regularly.</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = students.map(s => {
        const initial = s.full_name ? s.full_name.charAt(0).toUpperCase() : '?';
        const lastDate = s.last_attendance_date
            ? new Date(s.last_attendance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'Never';

        // Determine attendance class for coloring
        let attendanceClass = 'attendance-low';
        if (s.attendance_percent >= 75) attendanceClass = 'attendance-ok';
        else if (s.attendance_percent >= 60) attendanceClass = 'attendance-medium';

        // Trend arrow and text
        const trendConfig = {
            declining: { arrow: '↓', text: 'Declining' },
            stable: { arrow: '→', text: 'Stable' },
            improving: { arrow: '↑', text: 'Improving' }
        };
        const trend = trendConfig[s.trend] || trendConfig.stable;

        return `
            <div class="at-risk-row" data-risk="${s.risk_level}">
                <div class="at-risk-avatar risk-${s.risk_level}">${initial}</div>
                <div class="at-risk-info">
                    <span class="at-risk-name">${s.full_name}</span>
                    <span class="at-risk-email">${s.email}</span>
                    <div class="at-risk-stats">
                        <div class="at-risk-stat-item ${attendanceClass}">
                            📊 <span class="stat-value">${s.attendance_percent}%</span> attendance
                        </div>
                        <div class="at-risk-stat-item">
                            ❌ <span class="stat-value">${s.consecutive_absences}</span> missed in row
                        </div>
                        <div class="trend-indicator ${s.trend}">
                            ${trend.arrow} ${trend.text}
                        </div>
                    </div>
                </div>
                <div class="at-risk-actions">
                    <span class="risk-badge ${s.risk_level}">${s.risk_level} risk</span>
                    <div style="display: flex; gap: 0.25rem; margin-top: 0.5rem;">
                        <button class="btn btn-primary btn-sm" onclick="sendReminder(${s.student_id}, '${s.email}')" title="Send reminder email">
                            📧 Remind
                        </button>
                        <button type="button" class="btn btn-ghost btn-sm" onclick="viewStudentProfile('${s.student_id}')" title="View full profile">
                            👁️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Send Reminder (Placeholder - Future email integration)
function sendReminder(studentId, email) {
    // For now, show a confirmation alert
    // In a real implementation, this would call an API to send an email
    alert(`📧 Reminder would be sent to: ${email}\n\nThis feature will be fully implemented with email integration.\n\nStudent ID: ${studentId}`);

    // TODO: Implement actual email sending via backend
    // fetch(`${API_URL}/students/${studentId}/remind`, { method: 'POST', headers: getHeaders() })
}

// (Removed viewStudentDetails as it's replaced by viewStudentProfile)



// Set Welcome Name dynamically
document.addEventListener('DOMContentLoaded', () => {
    const nameEl = document.getElementById('teacher-name-heading');
    const storedName = localStorage.getItem('name');
    if (nameEl && storedName) {
        // Use full original name as requested
        nameEl.textContent = storedName;
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENGAGEMENT / POLLS LOGIC
// ═══════════════════════════════════════════════════════════════════════════

let activePollId = null;
let pollResultsInterval = null;

async function launchPoll() {
    const question = document.getElementById('poll-question').value;
    const optionsRaw = document.getElementById('poll-options').value;

    // Pick first course for now (Mocking single course context in this panel)
    let courseId = null;
    try {
        const res = await fetch(`${API_URL}/courses`, { headers: getHeaders() });
        const courses = await res.json();
        if (courses.length > 0) courseId = courses[0].id;
    } catch (e) { }

    if (!courseId) return alert('No active course found to launch poll in.');
    if (!question) return alert('Please enter a question');

    const options = optionsRaw.split('\n').filter(o => o.trim() !== '').map(text => ({ text }));

    try {
        const res = await fetch(`${API_URL}/engagement/create`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                course_id: courseId,
                question,
                type: 'poll',
                options
            })
        });

        const data = await res.json();
        if (res.ok) {
            activePollId = data.pollId;
            alert('Poll Launched!');
            startPollMonitoring();
            document.getElementById('stop-poll-btn').classList.remove('hidden');
        } else {
            alert(data.message || 'Error');
        }
    } catch (err) {
        console.error(err);
    }
}

async function stopPoll() {
    if (!activePollId) return;
    try {
        await fetch(`${API_URL}/engagement/stop/${activePollId}`, {
            method: 'POST',
            headers: getHeaders()
        });
        activePollId = null;
        clearInterval(pollResultsInterval);
        document.getElementById('stop-poll-btn').classList.add('hidden');
        alert('Poll Stopped');
    } catch (err) {
        console.error(err);
    }
}

function startPollMonitoring() {
    // Poll for results every 3s
    pollResultsInterval = setInterval(fetchPollResults, 3000);
}

async function fetchPollResults() {
    if (!activePollId) return;
    try {
        const res = await fetch(`${API_URL}/engagement/results/${activePollId}`, { headers: getHeaders() });
        const data = await res.json();
        renderResults(data);
    } catch (err) {
        console.error(err);
    }
}

function renderResults(data) {
    const container = document.getElementById('active-poll-results');
    const total = data.total_responses;

    if (total === 0) {
        container.innerHTML = '<p>Waiting for responses...</p>';
        return;
    }

    let html = `<h4 class="mb-3">Total Responses: ${total}</h4>`;

    data.options.forEach(opt => {
        const percent = total > 0 ? Math.round((opt.count / total) * 100) : 0;
        html += `
            <div class="mb-2">
                <div class="flex-between text-xs mb-1">
                    <span>${opt.option_text}</span>
                    <span>${opt.count} (${percent}%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Quiz UI Helper
function toggleCorrect(btn) {
    btn.classList.toggle('text-success'); // Assuming text-success class or style
    if (btn.style.color === 'green') {
        btn.style.color = '';
    } else {
        btn.style.color = 'green';
    }
}

function addToQuiz() {
    alert('Quiz question added to bank (Demo Only)');
}
// ══════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT (Phase 3)
// ══════════════════════════════════════════════════════════════════════════
// using existing global currentSessionId and rotationInterval (re-mapped to qrInterval for clarity if needed, or just use rotationInterval)

// Let's reuse existing variables defined at top
// currentSessionId is already defined.
// rotationInterval is defined.

async function startSessionPhase3(courseId = 1) { // Renamed to avoid key collision if old startSession exists
    if (!navigator.geolocation) {
        alert("Geolocation is required to start a session.");
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch('http://localhost:5000/api/attendance/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    course_id: courseId,
                    latitude,
                    longitude,
                    radius: 50 // meters
                })
            });

            const data = await response.json();
            if (response.ok) {
                currentSessionId = data.session_id;

                // Show Overlay
                document.getElementById('live-session-overlay').classList.remove('hidden');

                // Set PIN
                document.getElementById('session-pin-display').innerText = data.pin;

                // Initial QR
                updateQR(data.session_token);

                // Start Rotation
                startQRRotation();

                alert('Session Started! Students can now scan.');
            } else {
                alert('Error starting session: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to connect to server.');
        }
    }, (err) => {
        alert("Error getting location: " + err.message);
    });
}

function updateQR(token) {
    const qrContainer = document.getElementById('qr-code-container');
    qrContainer.innerHTML = ""; // Clear old
    new QRCode(qrContainer, {
        text: token,
        width: 256,
        height: 256,
        colorDark: "#262161",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function startQRRotation() {
    if (qrInterval) clearInterval(qrInterval);
    qrInterval = setInterval(async () => {
        if (!currentSessionId) return;

        const authToken = localStorage.getItem('authToken');
        try {
            const response = await fetch(`http://localhost:5000/api/attendance/session/${currentSessionId}/rotate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await response.json();
            if (response.ok) {
                updateQR(data.session_token);
                console.log("QR Rotated");
            }
        } catch (e) { console.error("QR Rotation failed", e); }
    }, 30000); // 30 seconds
}

function endSession() {
    if (confirm("End this class session?")) {
        clearInterval(rotationInterval);
        currentSessionId = null;
        document.getElementById('live-session-overlay').classList.add('hidden');
        // Optionally call API to close session explicitly if needed
    }
}
