const app = {
    currentUser: null,
    openComments: new Set(),
    
    init: async function() {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = '/login.html'; return; }

        const data = await API.getMeStats();
        if (!data.user) { API.logout(); return; }

        this.currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));

        this.loadStories();
        this.loadPosts();
        this.setupEventListeners();
    },

    setupEventListeners: function() {
        const createPostBtn = document.getElementById('create-post-btn');
        const createStoryBtn = document.getElementById('create-story-btn');
        
        if (createPostBtn) {
            createPostBtn.onclick = () => this.openModal('post-modal');
        }
        if (createStoryBtn) {
            createStoryBtn.onclick = () => this.openModal('story-modal');
        }

        const postMedia = document.getElementById('post-media');
        if (postMedia) {
            postMedia.addEventListener('change', (e) => this.handlePreview(e, 'post'));
        }

        const storyMedia = document.getElementById('story-media');
        if (storyMedia) {
            storyMedia.addEventListener('change', (e) => this.handlePreview(e, 'story'));
        }

        const postModal = document.getElementById('post-modal');
        const storyModal = document.getElementById('story-modal');
        
        if (postModal) {
            postModal.onclick = (e) => {
                if (e.target === postModal) this.closeModal('post-modal');
            };
        }
        if (storyModal) {
            storyModal.onclick = (e) => {
                if (e.target === storyModal) this.closeModal('story-modal');
            };
        }
    },

    openModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    },

    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
        
        if (modalId === 'post-modal') {
            const preview = document.getElementById('post-preview');
            const media = document.getElementById('post-media');
            const text = document.getElementById('post-text');
            const fileName = document.getElementById('post-file-name');
            if (preview) {
                preview.innerHTML = 'Превью появится здесь';
                preview.classList.remove('has-content');
            }
            if (media) media.value = '';
            if (text) text.value = '';
            if (fileName) fileName.textContent = '';
        } else if (modalId === 'story-modal') {
            const preview = document.getElementById('story-preview');
            const media = document.getElementById('story-media');
            const caption = document.getElementById('story-caption');
            const fileName = document.getElementById('story-file-name');
            if (preview) {
                preview.innerHTML = 'Превью появится здесь';
                preview.classList.remove('has-content');
            }
            if (media) media.value = '';
            if (caption) caption.value = '';
            if (fileName) fileName.textContent = '';
        }
    },

    handlePreview: function(e, type) {
        const file = e.target.files[0];
        const previewId = type === 'post' ? 'post-preview' : 'story-preview';
        const fileNameId = type === 'post' ? 'post-file-name' : 'story-file-name';
        const preview = document.getElementById(previewId);
        const fileNameEl = document.getElementById(fileNameId);
        
        if (fileNameEl) {
            fileNameEl.textContent = file ? 'Выбрано: ' + file.name : '';
        }
        
        if (!preview) return;
        preview.innerHTML = '';
        preview.classList.remove('has-content');

        if (!file) {
            preview.textContent = 'Превью появится здесь';
            return;
        }

        const url = URL.createObjectURL(file);

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = url;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '200px';
            img.style.borderRadius = '8px';
            preview.appendChild(img);
            preview.classList.add('has-content');
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = url;
            video.controls = true;
            video.style.maxWidth = '100%';
            video.style.maxHeight = '200px';
            video.style.borderRadius = '8px';
            preview.appendChild(video);
            preview.classList.add('has-content');
        } else {
            preview.textContent = 'Неподдерживаемый формат';
        }
    },

    submitPost: async function() {
        const text = document.getElementById('post-text')?.value.trim();
        const mediaInput = document.getElementById('post-media');
        const file = mediaInput?.files[0];

        if (!text && !file) { 
            this.showToast('Добавьте текст или медиа', 'error'); 
            return; 
        }

        const formData = new FormData();
        formData.append('content', text || '');
        if (file) formData.append('media', file);

        const res = await API.createPost(formData);
        if (res.error) { 
            this.showToast(res.error, 'error'); 
            return; 
        }

        // 15 XP за создание поста
        await this.addXP(15);

        this.closeModal('post-modal');
        this.loadPosts();
        this.showToast('Пост опубликован! +15 XP', 'success');
    },

    submitStory: async function() {
        const mediaInput = document.getElementById('story-media');
        const file = mediaInput?.files[0];
        const caption = document.getElementById('story-caption')?.value || '';
        
        if (!file) {
            this.showToast('Выберите медиа', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('media', file);
        formData.append('caption', caption);
        
        const res = await API.createStory(formData);
        if (res.error) {
            this.showToast(res.error, 'error');
            return;
        }
        
        // 5 XP за сторис
        await this.addXP(5);

        this.closeModal('story-modal');
        this.showToast('Сторис опубликован! +5 XP', 'success');
        this.loadStories();
    },

    addXP: async function(amount) {
        try {
            const user = this.currentUser;
            if (!user) return;
            
            user.xp = (user.xp || 0) + amount;
            
            const res = await fetch('/api/profile/xp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('token') || ''
                },
                body: JSON.stringify({ xp: user.xp })
            });
            
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(user));
                this.currentUser = user;
            }
        } catch (e) {
            console.error('XP update error:', e);
        }
    },

    loadStories: async function() {
        const stories = await API.getStories();
        console.log('Stories loaded:', stories);
        
        if (!Array.isArray(stories)) {
            console.error('Stories is not array:', stories);
            return;
        }
            
        let container = document.getElementById('stories-container');
        
        if (!container) {
            const main = document.querySelector('.container');
            if (!main) return;
            
            const storiesSection = document.createElement('div');
            storiesSection.id = 'stories-section';
            storiesSection.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <h3 style="margin:0;">🔥 Сторис</h3>
                </div>
                <div id="stories-container" style="display:flex;gap:15px;overflow-x:auto;padding:15px 0;margin-bottom:20px;border-bottom:1px solid var(--border);">
                </div>
            `;
            main.insertBefore(storiesSection, main.firstChild);
            container = document.getElementById('stories-container');
        }
        
        container.innerHTML = '';
        
        stories.forEach(s => {
            const storyEl = document.createElement('div');
            storyEl.id = `story-${s.id}`;
            storyEl.style.cssText = 'flex-shrink:0;cursor:pointer;position:relative;';
            storyEl.onclick = () => this.viewStory(s);
            
            // Кнопка удаления (только для своих сторис)
            const isOwner = s.authorId === this.currentUser?.id;
            const deleteBtn = isOwner ? `
                <button onclick="event.stopPropagation(); app.deleteStory('${s.id}')" 
                        style="position:absolute;top:-5px;right:-5px;width:24px;height:24px;border-radius:50%;background:#ef4444;color:white;border:none;cursor:pointer;font-size:14px;z-index:10;">×</button>
            ` : '';
            
            storyEl.innerHTML = `
                <div style="position:relative;width:70px;height:70px;">
                    ${deleteBtn}
                    <img src="/uploads/avatars/${s.authorAvatar || 'default.png'}" 
                         style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid ${s.authorColor || '#f5576c'};padding:2px;background:var(--bg);">
                    <div style="position:absolute;bottom:0;right:0;width:20px;height:20px;background:linear-gradient(45deg, #f093fb, #f5576c);border-radius:50%;border:2px solid var(--bg);"></div>
                </div>
                <div style="text-align:center;font-size:12px;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;color:var(--text);">
                    ${s.authorUsername}
                </div>
            `;
            container.appendChild(storyEl);
        });
    },

    // ===== УДАЛЕНИЕ СТОРИС =====
    deleteStory: async function(storyId) {
        if (!confirm('Удалить сторис?')) return;
        
        try {
            const res = await API.deleteStory(storyId);
            if (res.error) {
                this.showToast(res.error, 'error');
                return;
            }
            this.showToast('Сторис удалён', 'success');
            this.loadStories();
        } catch (err) {
            this.showToast('Ошибка удаления', 'error');
        }
    },

    viewStory: async function(story) {
        try {
            await API.viewStory(story.id);
            
            const existing = document.getElementById('story-viewer');
            if (existing) existing.remove();
            
            const modal = document.createElement('div');
            modal.id = 'story-viewer';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:black;z-index:10000;display:flex;align-items:center;justify-content:center;';
            
            const isVideo = story.media && (story.media.endsWith('.mp4') || story.media.endsWith('.webm') || story.media.endsWith('.mov'));
            
            // Кнопка удаления внутри просмотра (если свой)
            const isOwner = story.authorId === this.currentUser?.id;
            const deleteBtn = isOwner ? `
                <button onclick="app.deleteStory('${story.id}'); document.getElementById('story-viewer').remove();" 
                        style="background:#ef4444;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;margin-right:10px;">🗑️ Удалить</button>
            ` : '';
            
            modal.innerHTML = `
                <div style="position:relative;max-width:500px;width:100%;height:100%;max-height:900px;display:flex;flex-direction:column;justify-content:center;">
                    <div style="position:absolute;top:0;left:0;right:0;padding:20px;background:linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);z-index:10;display:flex;align-items:center;gap:10px;">
                        <img src="/uploads/avatars/${story.authorAvatar || 'default.png'}" style="width:40px;height:40px;border-radius:50%;">
                        <span style="color:white;font-weight:bold;">${story.authorUsername}</span>
                        ${deleteBtn}
                        <button onclick="document.getElementById('story-viewer').remove()" style="margin-left:auto;background:none;border:none;color:white;font-size:30px;cursor:pointer;">×</button>
                    </div>
                    
                    ${isVideo
                        ? `<video src="/uploads/posts/${story.media}" autoplay style="max-width:100%;max-height:100%;" onclick="this.paused?this.play():this.pause()"></video>`
                        : `<img src="/uploads/posts/${story.media}" style="max-width:100%;max-height:100%;object-fit:contain;">`
                    }
                    
                    ${story.caption ? `<div style="position:absolute;bottom:80px;left:20px;right:20px;color:white;text-align:center;font-size:16px;text-shadow:0 2px 4px rgba(0,0,0,0.8);background:rgba(0,0,0,0.3);padding:10px;border-radius:8px;">${story.caption}</div>` : ''}
                    
                    <div style="position:absolute;top:10px;left:20px;right:20px;height:3px;background:rgba(255,255,255,0.3);border-radius:3px;">
                        <div style="height:100%;width:0%;background:white;border-radius:3px;animation:storyProgress 15s linear forwards;"></div>
                    </div>
                </div>
                <style>@keyframes storyProgress { to { width: 100%; } }</style>
            `;
            
            document.body.appendChild(modal);
            setTimeout(() => modal.remove(), 15000);
        } catch (err) {
            console.error('View story error:', err);
        }
    },

    toggleComments: function(postId) {
        if (this.openComments.has(postId)) {
            this.openComments.delete(postId);
        } else {
            this.openComments.add(postId);
        }
        this.loadPosts();
    },

    loadPosts: async function() {
        const posts = await API.getPosts();
        const container = document.getElementById('posts-container');
        if (!container) return;

        if (!posts || posts.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:40px;">Нет постов</div>';
            return;
        }

        container.innerHTML = posts.map(p => this.renderPost(p)).join('');
    },

    renderPost: function(p) {
        let mediaHTML = '';
        if (p.media || p.mediaUrl) {
            const mediaSrc = p.mediaUrl || `/uploads/posts/${p.media}`;
            if (mediaSrc.endsWith('.mp4') || mediaSrc.endsWith('.webm') || mediaSrc.endsWith('.mov')) {
                mediaHTML = `<video src="${mediaSrc}" controls style="max-width:100%;border-radius:12px;margin-top:10px;"></video>`;
            } else {
                mediaHTML = `<img src="${mediaSrc}" style="max-width:100%;border-radius:12px;margin-top:10px;">`;
            }
        }

        const username = p.authorUsername || p.author || 'Unknown';
        const avatar = p.authorAvatar;
        const level = p.authorLevel || 0;
        const content = p.content || '';
        const likesCount = Array.isArray(p.likes) ? p.likes.length : (p.likes || 0);
        const commentsCount = Array.isArray(p.comments) ? p.comments.length : (p.comments || 0);
        const comments = Array.isArray(p.comments) ? p.comments : [];
        const isLiked = Array.isArray(p.likes) && this.currentUser && p.likes.includes(this.currentUser.username);
        const isCommentsOpen = this.openComments.has(p.id);
        const isAuthor = this.currentUser && (p.authorId === this.currentUser.id || p.author === this.currentUser.username);

        const avatarHTML = avatar 
            ? `<img src="/uploads/avatars/${avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:40px;height:40px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">${username[0]?.toUpperCase() || '?'}</div>`;

        const commentsHTML = comments.map(c => {
            const commentAvatar = c.authorAvatar 
                ? `<img src="/uploads/avatars/${c.authorAvatar}" style="width:24px;height:24px;border-radius:50%;">`
                : `<div style="width:24px;height:24px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:12px;color:white;">${c.author?.[0]?.toUpperCase() || '?'}</div>`;
            
            const commentLikes = Array.isArray(c.likes) ? c.likes.length : 0;
            const isCommentLiked = Array.isArray(c.likes) && this.currentUser && c.likes.includes(this.currentUser.username);
            const isCommentAuthor = this.currentUser && (c.authorId === this.currentUser.id);

            // Кнопка удаления комментария
            const deleteCommentBtn = (isCommentAuthor || isAuthor) ? `
                <span onclick="event.stopPropagation(); app.deleteComment('${p.id}', '${c.id}')" 
                      style="cursor:pointer;margin-left:10px;color:#ef4444;font-size:12px;" title="Удалить">🗑️</span>
            ` : '';

            return `
                <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
                    <div>${commentAvatar}</div>
                    <div style="flex:1;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:bold;font-size:14px;">${c.author}</span>
                            <span style="font-size:12px;color:var(--text-secondary);">${new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <div style="margin:5px 0;font-size:14px;">${c.content || ''}</div>
                        <div style="display:flex;gap:15px;font-size:12px;color:var(--text-secondary);align-items:center;">
                            <span onclick="app.likeComment('${p.id}', '${c.id}')" style="cursor:pointer;color:${isCommentLiked ? 'var(--primary)' : 'inherit'};">
                                ❤️ ${commentLikes}
                            </span>
                            ${deleteCommentBtn}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="post-card" id="post-${p.id}" style="background:var(--surface);border-radius:16px;padding:20px;margin-bottom:20px;border:1px solid var(--border);">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    ${avatarHTML}
                    <div>
                        <div style="font-weight:bold;">${username} ${level > 0 ? `(Lvl ${level})` : ''}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">${new Date(p.createdAt).toLocaleString()}</div>
                    </div>
                </div>
                <div style="margin-bottom:10px;line-height:1.5;">${content}</div>
                ${mediaHTML}
                <div style="display:flex;gap:20px;margin-top:15px;padding-top:15px;border-top:1px solid var(--border);">
                    <span onclick="app.likePost('${p.id}')" style="cursor:pointer;user-select:none;color:${isLiked ? 'var(--primary)' : 'inherit'};">
                        ❤️ ${likesCount}
                    </span>
                    <span onclick="app.toggleComments('${p.id}')" style="cursor:pointer;user-select:none;">
                        💬 ${commentsCount}
                    </span>
                    ${isAuthor ? `
                        <span onclick="app.deletePost('${p.id}')" style="cursor:pointer;margin-left:auto;color:#ef4444;">
                            🗑️ Удалить
                        </span>
                    ` : ''}
                </div>
                
                <div id="comments-section-${p.id}" style="display:${isCommentsOpen ? 'block' : 'none'};margin-top:15px;padding-top:15px;border-top:1px solid var(--border);">
                    <div style="max-height:300px;overflow-y:auto;margin-bottom:15px;">
                        ${comments.length > 0 ? commentsHTML : '<div style="color:var(--text-secondary);text-align:center;padding:20px;">Нет комментариев</div>'}
                    </div>
                    <div style="display:flex;gap:10px;">
                        <input type="text" id="comment-input-${p.id}" 
                               placeholder="Написать комментарий..." 
                               onkeypress="if(event.key==='Enter') app.commentPost('${p.id}')"
                               style="flex:1;padding:10px 15px;border-radius:20px;border:1px solid var(--border);background:var(--bg);color:var(--text);outline:none;">
                        <button onclick="app.commentPost('${p.id}')" 
                                style="padding:10px 20px;border-radius:20px;border:none;background:var(--primary);color:white;cursor:pointer;">➤</button>
                    </div>
                </div>
            </div>
        `;
    },

    likePost: async function(postId) {
        try {
            const res = await API.likePost(postId);
            
            // 50 XP автору поста за лайк
            if (res && res.liked) {
                const posts = await API.getPosts();
                const post = posts.find(p => p.id === postId);
                if (post && post.authorId && post.authorId !== this.currentUser.id) {
                    await this.giveXPToUser(post.authorId, 50);
                }
            }
            
            this.loadPosts();
        } catch (err) {
            this.showToast('Ошибка', 'error');
        }
    },

    giveXPToUser: async function(userId, amount) {
        try {
            await fetch('/api/users/xp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('token') || ''
                },
                body: JSON.stringify({ userId, amount })
            });
        } catch (e) {
            console.error('Give XP error:', e);
        }
    },

    likeComment: async function(postId, commentId) {
        try {
            const res = await API.likeComment(postId, commentId);
            
            // 15 XP автору комментария за лайк
            if (res && res.liked) {
                const posts = await API.getPosts();
                const post = posts.find(p => p.id === postId);
                if (post && post.comments) {
                    const comment = post.comments.find(c => c.id === commentId);
                    if (comment && comment.authorId && comment.authorId !== this.currentUser.id) {
                        await this.giveXPToUser(comment.authorId, 15);
                    }
                }
            }
            
            this.openComments.add(postId);
            this.loadPosts();
        } catch (err) {
            this.showToast('Ошибка', 'error');
        }
    },

    commentPost: async function(postId) {
        const input = document.getElementById(`comment-input-${postId}`);
        const text = input.value.trim();
        if (!text) return;
        
        try {
            await API.commentPost(postId, text);
            
            // 30 XP за комментарий
            await this.addXP(30);
            
            this.openComments.add(postId);
            this.loadPosts();
            this.showToast('Комментарий добавлен! +30 XP', 'success');
        } catch (err) {
            this.showToast('Ошибка отправки', 'error');
        }
    },

    // ===== УДАЛЕНИЕ КОММЕНТАРИЯ =====
    deleteComment: async function(postId, commentId) {
        if (!confirm('Удалить комментарий?')) return;
        
        try {
            const res = await API.deleteComment(postId, commentId);
            if (res.error) {
                this.showToast(res.error, 'error');
                return;
            }
            this.showToast('Комментарий удалён', 'success');
            this.openComments.add(postId);
            this.loadPosts();
        } catch (err) {
            this.showToast('Ошибка удаления', 'error');
        }
    },

    deletePost: async function(postId) {
        if (!confirm('Удалить пост?')) return;
        try {
            const res = await API.deletePost(postId);
            if (res.error) {
                this.showToast(res.error, 'error');
                return;
            }
            this.showToast('Пост удалён', 'success');
            this.loadPosts();
        } catch (err) {
            this.showToast('Ошибка удаления', 'error');
        }
    },

    showToast: function(message, type = 'success') {
        const oldToast = document.querySelector('.toast');
        if (oldToast) oldToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            info: '#3b82f6'
        };
        const color = colors[type] || colors.success;
        
        toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:var(--surface);color:var(--text);padding:15px 30px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.4);border:2px solid ' + color + ';z-index:99999;';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());