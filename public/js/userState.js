const UserState = {
    currentUser: null,
    listeners: [],
    
    init: async function() {
        const token = localStorage.getItem('token');
        if (!token) return false;
        
        try {
            const response = await fetch('/api/me', {
                headers: { 'Authorization': token }
            });
            const data = await response.json();
            
                        if (data.user) {
                this.currentUser = data.user;
                if (data.user.themeColor) {
                    this.setThemeColor(data.user.themeColor);
                } else {
                    this.setThemeColor('#0f172a');
                }
                this.notifyListeners();
                return true;
            }
        } catch(e) {
            console.error('Failed to load user:', e);
        }
        return false;
    },
    
    setUser: function(user) {
        this.currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        this.notifyListeners();
    },
    
    hexToHSL: function(hex) {
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    },

       setThemeColor: function(hexColor) {
        if (!hexColor) return;
        
        const hsl = this.hexToHSL(hexColor);
        const root = document.documentElement;
        
        // Определяем светлая ли тема
        const isLight = hsl.l > 50;
        document.body.setAttribute('data-theme', isLight ? 'light' : 'dark');
        
        // Устанавливаем CSS-переменные
        root.style.setProperty('--user-hue', hsl.h);
        root.style.setProperty('--user-sat', hsl.s + '%');
        root.style.setProperty('--user-light', hsl.l + '%');
        
        // Сохраняем
        if (this.currentUser) {
            this.currentUser.themeColor = hexColor;
            this.saveToStorage();
        }
        
        this.notifyListeners();
    },
    
    setAvatar: function(avatar) {
        if (this.currentUser) {
            this.currentUser.avatar = avatar;
            this.saveToStorage();
            this.notifyListeners();
        }
    },
    
    saveToStorage: function() {
        if (this.currentUser) {
            localStorage.setItem('user', JSON.stringify(this.currentUser));
        }
    },
    
    subscribe: function(callback) {
        this.listeners.push(callback);
        if (this.currentUser) callback(this.currentUser);
    },
    
    unsubscribe: function(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    },
    
    notifyListeners: function() {
        this.listeners.forEach(cb => {
            if (this.currentUser) cb(this.currentUser);
        });
    },
    
    getUser: function() {
        return this.currentUser;
    },
    
    logout: function() {
        this.currentUser = null;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        this.listeners = [];
        // Сброс темы
        document.documentElement.style.removeProperty('--bg-hue');
        document.documentElement.style.removeProperty('--bg-sat');
        document.documentElement.style.removeProperty('--bg-light');
    }
};

UserState.init();