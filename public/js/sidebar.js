const Sidebar = {
    isOpen: false,
    badgeUpdateInterval: null,
    soundsInitialized: false,
    lastFriendsCount: undefined,  // undefined чтобы не играть при первой загрузке
    lastMessagesCount: undefined,

    init: function() {
        this.createSidebarButton();
        this.createSidebarHTML();
        this.highlightCurrentPage();
        this.bindEvents();
        this.initSounds();
        this.startBadgeUpdates();
    },

    initSounds: function() {
        // Инициализируем звуки при первом открытии сайдбара
        const initAudio = () => {
            if (typeof Sounds !== 'undefined' && !this.soundsInitialized) {
                Sounds.createContext();
                this.soundsInitialized = true;
            }
        };
        
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });
    },

    createSidebarButton: function() {
        if (document.getElementById('sidebar-toggle-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'sidebar-toggle-btn';
        btn.innerHTML = '☰';
        btn.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1001;
            width: 50px;
            height: 50px;
            border-radius: 12px;
            background: var(--surface);
            border: 2px solid var(--border);
            color: var(--text);
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            transition: all 0.3s;
        `;
        
        btn.onclick = () => this.toggle();
        document.body.appendChild(btn);
    },

    createSidebarHTML: function() {
        if (document.getElementById('sidebar')) return;
        
        const sidebar = document.createElement('aside');
        sidebar.id = 'sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <span class="logo" style="
                    font-size: 24px;
                    font-weight: bold;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                ">Nexus</span>
                <button class="sidebar-close" onclick="Sidebar.close()" style="
                    background: none;
                    border: none;
                    color: var(--text);
                    font-size: 24px;
                    cursor: pointer;
                ">✕</button>
            </div>
            <nav class="sidebar-nav" style="
                flex: 1;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 5px;
            ">
                <a href="/index.html" class="sidebar-item" data-page="feed" style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 12px 15px;
                    border-radius: 12px;
                    color: var(--text-secondary);
                    text-decoration: none;
                    transition: all 0.2s;
                    position: relative;
                ">
                    <span style="font-size: 20px;">🏠</span>
                    <span>Лента</span>
                </a>
                <a href="/profile.html" class="sidebar-item" data-page="profile" style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 12px 15px;
                    border-radius: 12px;
                    color: var(--text-secondary);
                    text-decoration: none;
                    transition: all 0.2s;
                ">
                    <span style="font-size: 20px;">👤</span>
                    <span>Профиль</span>
                </a>
                <a href="/friends.html" class="sidebar-item" data-page="friends" style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 12px 15px;
                    border-radius: 12px;
                    color: var(--text-secondary);
                    text-decoration: none;
                    transition: all 0.2s;
                    position: relative;
                ">
                    <span style="font-size: 20px;">👥</span>
                    <span>Друзья</span>
                    <span class="badge" id="friends-badge" style="display:none;">0</span>
                </a>
                <a href="/messages.html" class="sidebar-item" data-page="messages" style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 12px 15px;
                    border-radius: 12px;
                    color: var(--text-secondary);
                    text-decoration: none;
                    transition: all 0.2s;
                    position: relative;
                ">
                    <span style="font-size: 20px;">💬</span>
                    <span>Сообщения</span>
                    <span class="badge" id="messages-badge" style="display:none;">0</span>
                </a>
				
				<a href="/servers.html" class="sidebar-item" data-page="servers">
    <span style="font-size: 20px;">🖥️</span>
    <span>Сервера</span>
</a>
            </nav>
            <div class="sidebar-footer" style="
                padding: 10px;
                border-top: 1px solid var(--border);
            ">
                <button onclick="Sidebar.logout()" style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 12px 15px;
                    border-radius: 12px;
                    color: var(--danger);
                    background: none;
                    border: none;
                    width: 100%;
                    cursor: pointer;
                    font-size: 15px;
                    transition: all 0.2s;
                ">
                    <span style="font-size: 20px;">🚪</span>
                    <span>Выйти</span>
                </button>
            </div>
        `;
        
        sidebar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 280px;
            height: 100vh;
            background: var(--surface);
            border-right: 1px solid var(--border);
            z-index: 1000;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: column;
        `;
        
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 999;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        `;
        overlay.onclick = () => this.close();
        
        document.body.appendChild(overlay);
        document.body.appendChild(sidebar);
        
        this.addContentPadding();
        this.addBadgeStyles();
    },

    addBadgeStyles: function() {
        if (document.getElementById('badge-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'badge-styles';
        style.textContent = `
            .badge {
                position: absolute;
                right: 15px;
                background: #ef4444;
                color: white;
                font-size: 12px;
                font-weight: bold;
                min-width: 22px;
                height: 22px;
                border-radius: 11px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 6px;
                box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
                animation: badgePulse 2s infinite;
            }
            
            @keyframes badgePulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            .badge:empty,
            .badge[style*="display:none"] {
                animation: none;
            }
        `;
        document.head.appendChild(style);
    },

    startBadgeUpdates: function() {
        this.updateBadges();
        // Обновляем каждые 5 секунд
        this.badgeUpdateInterval = setInterval(() => this.updateBadges(), 5000);
    },

          updateBadges: async function() {
        try {
            // Заявки в друзья
            const friendsData = await API.getFriends();
            const requestsCount = friendsData.requests ? friendsData.requests.length : 0;
            this.setBadge('friends-badge', requestsCount);
            
            // Непрочитанные сообщения
            const unreadData = await API.getUnreadCount();
            const messagesCount = unreadData.count || 0;
            this.setBadge('messages-badge', messagesCount);
            
            // Проверяем и воспроизводим звуки (только если уже было взаимодействие)
            if (typeof Sounds !== 'undefined' && this.soundsInitialized) {
                // Новая заявка в друзья
                if (requestsCount > this.lastFriendsCount && this.lastFriendsCount !== undefined) {
                    Sounds.playFriendRequest();
                }
                // Новое сообщение
                if (messagesCount > this.lastMessagesCount && this.lastMessagesCount !== undefined) {
                    Sounds.playMessage();
                }
            }
            
            // Сохраняем текущие значения
            this.lastFriendsCount = requestsCount;
            this.lastMessagesCount = messagesCount;
        } catch (e) {
            console.log('Badge update error:', e);
        }
    },

    setBadge: function(id, count) {
        const badge = document.getElementById(id);
        if (!badge) return;
        
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    addContentPadding: function() {
        const container = document.querySelector('.container');
        if (container) {
            container.style.marginTop = '80px';
        }
    },

highlightCurrentPage: function() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    
    const pageMap = {
        'index.html': 'feed',
        '': 'feed',
        'profile.html': 'profile',
        'friends.html': 'friends',
        'messages.html': 'messages',
        'servers.html': 'servers'  // ← ДОБАВЬТЕ ЭТО
    };
    
    const currentPage = pageMap[page] || 'feed';
    
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.style.background = 'transparent';
        item.style.color = 'var(--text-secondary)';
    });
    
    const activeItem = document.querySelector(`[data-page="${currentPage}"]`);
    if (activeItem) {
        activeItem.style.background = 'var(--primary)';
        activeItem.style.color = 'white';
    }
},

    toggle: function() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

        open: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sidebar.style.transform = 'translateX(0)';
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        this.isOpen = true;
        
        // Инициализируем звук при открытии
        if (typeof Sounds !== 'undefined' && !this.soundsInitialized) {
            Sounds.createContext();
            this.soundsInitialized = true;
        }
        
        this.updateBadges();
    },

    close: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sidebar.style.transform = 'translateX(-100%)';
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        this.isOpen = false;
    },

    logout: function() {
        if (this.badgeUpdateInterval) {
            clearInterval(this.badgeUpdateInterval);
        }
        if (typeof UserState !== 'undefined') {
            UserState.logout();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        window.location.href = '/login.html';
    },

    bindEvents: function() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Sidebar.init();
});