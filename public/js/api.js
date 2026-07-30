console.log('api.js loaded');
const API = {
    baseUrl: '',
    
    async request(url, options = {}) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(url, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    'Authorization': token || ''
                }
            });
            
            if (res.status === 401) {
                console.log('401 Unauthorized - clearing session');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
                return { user: null };
            }
            
            const data = await res.json();
            return data;
        } catch (e) {
            console.error('API request error:', e);
            return { error: e.message };
        }
    },
    
    // Auth
    async register(formData) {
        const res = await fetch('/api/register', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    },
    
    async login(username, password) {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        console.log('Login response:', data);
        
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('Token saved to localStorage');
        }
        return data;
    },
    
    getMe() { return this.request('/api/me'); },
    getMeStats() { return this.request('/api/me/stats'); },
    
    // Profile
    updateColor(themeColor) {
        return this.request('/api/profile/color', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ themeColor })
        });
    },
    
    updateProfile(formData) {
        return fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Authorization': localStorage.getItem('token') || '' },
            body: formData
        }).then(r => r.json());
    },
    
    deleteAccount() {
        return this.request('/api/account', { method: 'DELETE' });
    },
    
    // Posts
    getPosts() { return this.request('/api/posts'); },
    
    createPost(formData) {
        return fetch('/api/posts', {
            method: 'POST',
            headers: { 'Authorization': localStorage.getItem('token') || '' },
            body: formData
        }).then(r => r.json());
    },
    
    likePost(postId) { 
        return this.request(`/api/posts/${postId}/like`, { method: 'POST' }); 
    },
    
    commentPost(postId, content) {
        return this.request(`/api/posts/${postId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
    },
    
    deletePost(postId) { 
        return this.request(`/api/posts/${postId}`, { method: 'DELETE' }); 
    },
	
	    
    deleteComment(postId, commentId) {
        return this.request(`/api/posts/${postId}/comments/${commentId}`, { 
            method: 'DELETE' 
        });
    },
    
    deleteComment(postId, commentId) {
        return this.request(`/api/posts/${postId}/comments/${commentId}`, { 
            method: 'DELETE' 
        });
    },

    likeComment(postId, commentId) {
        return this.request(`/api/posts/${postId}/comments/${commentId}/like`, { 
            method: 'POST' 
        });
    },

    // Stories
    getStories() { return this.request('/api/stories'); },
    
    createStory(formData) {
        return fetch('/api/stories', {
            method: 'POST',
            headers: { 'Authorization': localStorage.getItem('token') || '' },
            body: formData
        }).then(r => r.json());
    },
    
    viewStory(storyId) { 
        return this.request(`/api/stories/${storyId}/view`, { method: 'POST' }); 
    },
	    deleteStory(storyId) {
        return this.request(`/api/stories/${storyId}`, { method: 'DELETE' });
    },
    
    // Friends
    getFriends() { return this.request('/api/friends'); },
    searchUsers(q) { return this.request(`/api/users/search?q=${encodeURIComponent(q)}`); },
    
    addFriend(username) {
        return this.request('/api/friends/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
    },
    
    acceptFriend(userId) {
        return this.request('/api/friends/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
    },
    
    rejectFriend(userId) {
        return this.request('/api/friends/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
    },
    
    removeFriend(userId) { 
        return this.request(`/api/friends/${userId}`, { method: 'DELETE' }); 
    },
    
    // Messages
    getChats() { return this.request('/api/chats'); },
    getMessages(userId) { return this.request(`/api/messages/${userId}`); },
    
    sendMessage(to, text) {
        return this.request('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, text })
        });
    },
    
    getUnreadCount() {
        return this.request('/api/messages/unread/count');
    },
    
    markMessagesAsRead(userId) {
        return this.request(`/api/messages/read/${userId}`, { method: 'POST' });
    },
    
    // Voice messages
    sendVoiceMessage(to, audioBlob, duration) {
        const formData = new FormData();
        formData.append('to', to);
        formData.append('audio', audioBlob, 'voice.webm');
        formData.append('duration', duration);
        
        return fetch('/api/messages/voice', {
            method: 'POST',
            headers: { 'Authorization': localStorage.getItem('token') || '' },
            body: formData
        }).then(r => r.json());
    },
    
    getVoiceMessages(userId) {
        return this.request(`/api/messages/${userId}/voice`);
    },
    
    // Servers
    getServers() { return this.request('/api/servers'); },
    
    createServer(name) {
        return this.request('/api/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
    },
    
    deleteServer(serverId) {
        return this.request(`/api/servers/${serverId}`, { method: 'DELETE' });
    },

    deleteChannel(serverId, channelId) {
        return this.request(`/api/servers/${serverId}/channels/${channelId}`, { method: 'DELETE' });
    },

    leaveServer(serverId) {
        return this.request(`/api/servers/${serverId}/leave`, { method: 'POST' });
    },
    
    createChannel(serverId, name, type) {
        return this.request(`/api/servers/${serverId}/channels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type })
        });
    },
    
    createInvite(serverId) {
        return this.request(`/api/servers/${serverId}/invites`, { method: 'POST' });
    },
    
    joinServer(code) {
        return this.request('/api/servers/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
    },
    
    getChannelMessages(channelId) {
        return this.request(`/api/channels/${channelId}/messages`);
    },
    
    sendChannelMessage(channelId, content) {
        return this.request(`/api/channels/${channelId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
    },
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
};

window.API = API;