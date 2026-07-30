console.log('auth.js loaded');

const auth = {
    init: async function() {
        console.log('auth.init started');
        
        const token = localStorage.getItem('token');
        const currentPath = window.location.pathname;
        
        // Если мы на login.html и есть токен - проверяем его
        if (currentPath.includes('login.html')) {
            if (!token) {
                console.log('No token on login page - staying');
                return;
            }
            
            // Проверяем валидность токена
            const data = await API.getMe();
            if (data && data.user) {
                console.log('Valid token, redirecting to index');
                window.location.href = '/index.html';
            } else {
                console.log('Invalid token, clearing');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            return;
        }
        
        // На других страницах - проверяем токен
        if (!token) {
            console.log('No token, redirecting to login');
            window.location.href = '/login.html';
            return;
        }
    },

    toggleForm() {
        document.getElementById('login-form').classList.toggle('hidden');
        document.getElementById('register-form').classList.toggle('hidden');
    },

    async register() {
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const avatarFile = document.getElementById('reg-avatar').files[0];

        if (!username || password.length < 4) {
            alert('Заполните все поля. Пароль минимум 4 символа.');
            return;
        }

        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        try {
            const data = await API.register(formData);
            if (data.error) {
                alert(data.error);
                return;
            }
            
            window.location.href = '/index.html';
        } catch (err) {
            alert('Ошибка регистрации: ' + err.message);
        }
    },

    async login() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            alert('Введите имя пользователя и пароль');
            return;
        }

        const data = await API.login(username, password);
        if (data.error) {
            alert(data.error);
            return;
        }
        
        console.log('Before redirect, token:', localStorage.getItem('token'));
        window.location.href = '/index.html';
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
};

window.auth = auth;