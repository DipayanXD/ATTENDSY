const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

// Auth State
const token = localStorage.getItem('token');
const userRole = localStorage.getItem('role');
const userName = localStorage.getItem('name');

// Redirect if not logged in
const path = window.location.pathname;
if (!token && !path.includes('index.html')) {
    window.location.href = 'index.html';
}

// Redirect if already logged in
if (token && path.includes('index.html')) {
    if (userRole === 'teacher') window.location.href = 'dashboard_teacher.html';
    else window.location.href = 'dashboard_student.html';
}

// UI Helpers
if (document.getElementById('user-name') && userName) {
    document.getElementById('user-name').textContent = userName;
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Login/Register Logic
function toggleAuth() {
    document.getElementById('login-form').classList.toggle('hidden');
    document.getElementById('register-form').classList.toggle('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const deviceId = getDeviceId();

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, device_id: deviceId })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('name', data.name);
            localStorage.setItem('userId', data.id);

            if (data.role === 'teacher') window.location.href = 'dashboard_teacher.html';
            else window.location.href = 'dashboard_student.html';
        } else {
            document.getElementById('login-error').textContent = data.message;
        }
    } catch (err) {
        document.getElementById('login-error').textContent = 'Server error. Is backend running?';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const deviceId = getDeviceId();

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: name, email, password, role, device_id: deviceId })
        });
        const data = await res.json();

        if (res.ok) {
            alert('Registration successful! Please login.');
            toggleAuth();
        } else {
            document.getElementById('reg-error').textContent = data.message;
        }
    } catch (err) {
        document.getElementById('reg-error').textContent = 'Server error.';
    }
}

// Device ID Helper (Simple mock)
function getDeviceId() {
    let id = localStorage.getItem('deviceId');
    if (!id) {
        id = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', id);
    }
    return id;
}
