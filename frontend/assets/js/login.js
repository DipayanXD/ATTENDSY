const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// Role Toggle Logic
const roleBtns = document.querySelectorAll('.role-btn');
const roleSwitcher = document.getElementById('role-switcher');
const roleInput = document.getElementById('reg-role');

roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        roleBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked
        btn.classList.add('active');

        const role = btn.getAttribute('data-role');
        roleInput.value = role;

        if (role === 'teacher') {
            roleSwitcher.classList.add('teacher-active');
        } else {
            roleSwitcher.classList.remove('teacher-active');
        }
    });
});