document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');

    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!email || !password) {
            alert('Введите email и пароль');
            return;
        }

        localStorage.setItem('isAdmin', 'true');
        window.location.href = 'admin.html';
    });
});

