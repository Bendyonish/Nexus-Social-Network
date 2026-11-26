const bcrypt = require('bcrypt');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = 8080;

const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Создаем папки
['data', 'uploads/avatars', 'uploads/posts', 'uploads/voice'].forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// Инициализация БД
const initDB = () => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    ['users.json', 'posts.json', 'sessions.json', 'messages.json', 'stories.json', 'voice.json', 'servers.json', 'channel_messages.json'].forEach(file => {
        const filePath = path.join(DATA_DIR, file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, file === 'sessions.json' ? '{}' : '[]');
        }
    });
};
initDB();

// Хелперы БД
const getUsers = () => {
    try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'))) || []; } 
    catch(e) { return []; }
};
const saveUsers = (data) => fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(data, null, 2));
const getPosts = () => {
    try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'posts.json'))) || []; } 
    catch(e) { return []; }
};
const savePosts = (data) => fs.writeFileSync(path.join(DATA_DIR, 'posts.json'), JSON.stringify(data, null, 2));
const getMessages = () => {
    try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'messages.json'))) || []; } 
    catch(e) { return []; }
};
const saveMessages = (data) => fs.writeFileSync(path.join(DATA_DIR, 'messages.json'), JSON.stringify(data, null, 2));
const getStories = () => {
    try { 
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'stories.json')));
        return Array.isArray(data) ? data : [];
    } catch(e) { 
        return []; 
    }
};
const saveStories = (data) => fs.writeFileSync(path.join(DATA_DIR, 'stories.json'), JSON.stringify(data, null, 2));
const getServers = () => {
    try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'servers.json'))) || []; }
    catch(e) { return []; }
};
const saveServers = (data) => fs.writeFileSync(path.join(DATA_DIR, 'servers.json'), JSON.stringify(data, null, 2));
const getChannelMessages = () => {
    try { 
        return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'channel_messages.json'))) || {}; 
    } catch(e) { 
        return {}; 
    }
};
const saveChannelMessages = (data) => fs.writeFileSync(path.join(DATA_DIR, 'channel_messages.json'), JSON.stringify(data, null, 2));

// Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder;
        if (file.fieldname === 'avatar') {
            folder = path.join(__dirname, 'uploads', 'avatars');
        } else if (file.fieldname === 'audio') {
            folder = path.join(__dirname, 'uploads', 'voice');
        } else {
            folder = path.join(__dirname, 'uploads', 'posts');
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage, 
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Только фото, видео и аудио!'), false);
        }
    }
});

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Нет доступа' });
    
    try {
        const sessions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sessions.json')));
        const userId = sessions[token];
        if (!userId) return res.status(401).json({ error: 'Сессия истекла' });
        
        const users = getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
        
        req.user = user;
        next();
    } catch (e) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Корневой маршрут
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.json({ message: 'API Server running', status: 'OK' });
    }
});

// ===== AUTH =====

// Регистрация
app.post('/api/register', upload.single('avatar'), async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = getUsers();
        
        if (users.find(u => u.username === username)) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.json({ error: 'Пользователь существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
		console.log('HASH:', hashedPassword);

		const user = {
			id: uuidv4(),
			username,
			password: hashedPassword,
            avatar: req.file ? req.file.filename : null,
            themeColor: '#0f172a',
            friends: [],
            friendRequests: [],
            sentRequests: [],
            xp: 0,
            createdAt: Date.now()
        };
        
        users.push(user);
        saveUsers(users);
        
        const token = uuidv4();
        const sessions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sessions.json')));
        sessions[token] = user.id;
        fs.writeFileSync(path.join(DATA_DIR, 'sessions.json'), JSON.stringify(sessions));
        
        res.json({ success: true, token, user: { ...user, password: undefined } });
    } catch (err) {
        res.json({ error: err.message });
    }
});

// Вход
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.username === username
	);

	if (!user) {
    return res.json({ error: 'Неверные данные' });
	}

	const validPassword = await bcrypt.compare(
		password,
		user.password
	);

if (!validPassword) {
    return res.json({ error: 'Неверные данные' });
}
    
    const token = uuidv4();
    const sessions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sessions.json')));
    sessions[token] = user.id;
    fs.writeFileSync(path.join(DATA_DIR, 'sessions.json'), JSON.stringify(sessions));
    
    res.json({ success: true, token, user: { ...user, password: undefined } });
});

app.get('/api/me', authMiddleware, (req, res) => {
    res.json({ user: { ...req.user, password: undefined } });
});

// ===== PROFILE & STATS =====

app.get('/api/me/stats', authMiddleware, (req, res) => {
    const posts = getPosts();
    const userPosts = posts.filter(p => p.authorId === req.user.id);
    
    const totalLikes = userPosts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
    const totalComments = userPosts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
    
    // Расчёт уровня по XP (макс 101)
    const xp = req.user.xp || 0;
    let level = Math.floor(Math.sqrt(xp / 100)) + 1;
    if (level > 101) level = 101; // <-- КАП УРОВНЯ
    
    const xpNeeded = Math.pow(level, 2) * 100;
    const xpInLevel = xp - Math.pow(level - 1, 2) * 100;
    const progress = (xpInLevel / (xpNeeded - Math.pow(level - 1, 2) * 100)) * 100;
    
    const levelNames = {
        1: 'Новичок', 10: 'Пользователь', 25: 'Активист',
        50: 'Старожил', 75: 'Легенда', 101: 'Владелец'
    };
    
        const getLevelName = (lvl) => {
		if (lvl >= 100001) return '🔥 Админ';
        if (lvl >= 101) return '👑 Владелец';
        if (lvl >= 75) return 'Легенда';
        if (lvl >= 50) return 'Старожил';
        if (lvl >= 25) return 'Активист';
        if (lvl >= 10) return 'Пользователь';
        return 'Новичок';
    };
    
    res.json({
        user: { ...req.user, password: undefined },
        stats: {
            posts: userPosts.length,
            likes: totalLikes,
            comments: totalComments,
            level: {
                current: { level, name: getLevelName(level) },
                xp,
                xpInLevel,
                xpNeeded,
                progress: Math.min(progress, 100)
            }
        }
    });
});

app.put('/api/profile/color', authMiddleware, (req, res) => {
    const { themeColor } = req.body;
    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);
    
    if (user) {
        user.themeColor = themeColor;
        saveUsers(users);
        res.json({ user: { ...user, password: undefined } });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

app.put('/api/profile', authMiddleware, upload.single('avatar'), (req, res) => {
    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);
    
    if (user && req.file) {
        if (user.avatar) {
            const oldPath = path.join(__dirname, 'uploads', 'avatars', user.avatar);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        
        user.avatar = req.file.filename;
        saveUsers(users);
        res.json({ user: { ...user, password: undefined } });
    } else {
        res.status(400).json({ error: 'No file uploaded' });
    }
});

app.delete('/api/account', authMiddleware, (req, res) => {
    const users = getUsers();
    const filtered = users.filter(u => u.id !== req.user.id);
    saveUsers(filtered);
    
    const sessions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sessions.json')));
    delete sessions[req.headers.authorization];
    fs.writeFileSync(path.join(DATA_DIR, 'sessions.json'), JSON.stringify(sessions));
    
    res.json({ success: true });
});

// ===== XP SYSTEM =====

// Обновление своего XP
app.post('/api/profile/xp', authMiddleware, (req, res) => {
    const { xp } = req.body;
    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);
    
    if (user) {
        user.xp = xp;
        saveUsers(users);
        res.json({ success: true, xp: user.xp });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Начисление XP другому пользователю (для лайков)
app.post('/api/users/xp', authMiddleware, (req, res) => {
    const { userId, amount } = req.body;
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.xp = (user.xp || 0) + amount;
    saveUsers(users);
    
    res.json({ success: true, xp: user.xp });
});

// ===== COMMENT LIKES =====

// Лайк на комментарий
app.post('/api/posts/:postId/comments/:commentId/like', authMiddleware, (req, res) => {
    const posts = getPosts();
    const post = posts.find(p => p.id === req.params.postId);
    
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const comment = post.comments?.find(c => c.id === req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    
    if (!comment.likes) comment.likes = [];
    
    const index = comment.likes.indexOf(req.user.username);
    let liked = false;
    
    if (index > -1) {
        comment.likes.splice(index, 1);
    } else {
        comment.likes.push(req.user.username);
        liked = true;
    }
    
    savePosts(posts);
    res.json({ success: true, liked, likes: comment.likes.length });
});

// Удаление комментария
app.delete('/api/posts/:postId/comments/:commentId', authMiddleware, (req, res) => {
    const posts = getPosts();
    const post = posts.find(p => p.id === req.params.postId);
    
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const commentIndex = post.comments?.findIndex(c => c.id === req.params.commentId);
    if (commentIndex === -1 || commentIndex === undefined) {
        return res.status(404).json({ error: 'Comment not found' });
    }
    
    const comment = post.comments[commentIndex];
    if (comment.authorId !== req.user.id && post.authorId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    
    post.comments.splice(commentIndex, 1);
    savePosts(posts);
    
    res.json({ success: true });
});

// ===== FRIENDS =====

app.get('/api/friends', authMiddleware, (req, res) => {
    const users = getUsers();
    const currentUser = users.find(u => u.id === req.user.id);
    
    const friends = currentUser.friends?.map(id => {
        const u = users.find(user => user.id === id);
        return u ? { id: u.id, username: u.username, avatar: u.avatar } : null;
    }).filter(Boolean) || [];
    
    const requests = currentUser.friendRequests?.map(id => {
        const u = users.find(user => user.id === id);
        return u ? { id: u.id, username: u.username, avatar: u.avatar } : null;
    }).filter(Boolean) || [];
    
    res.json({ friends, requests });
});

app.get('/api/users/search', authMiddleware, (req, res) => {
    const { q } = req.query;
    const users = getUsers();
    const currentUser = users.find(u => u.id === req.user.id);
    
    const results = users
        .filter(u => u.username.toLowerCase().includes(q?.toLowerCase() || ''))
        .filter(u => u.id !== req.user.id)
        .map(u => ({
            id: u.id,
            username: u.username,
            avatar: u.avatar,
            isFriend: currentUser.friends?.includes(u.id),
            hasRequest: currentUser.friendRequests?.includes(u.id),
            sentRequest: currentUser.sentRequests?.includes(u.id)
        }));
    
    res.json(results);
});

app.post('/api/friends/add', authMiddleware, (req, res) => {
    const { username } = req.body;
    const users = getUsers();
    
    const targetUser = users.find(u => u.username === username);
    if (!targetUser) return res.json({ error: 'Пользователь не найден' });
    
    const currentUser = users.find(u => u.id === req.user.id);
    
    if (!targetUser.friendRequests) targetUser.friendRequests = [];
    if (!currentUser.sentRequests) currentUser.sentRequests = [];
    
    if (!targetUser.friendRequests.includes(req.user.id)) {
        targetUser.friendRequests.push(req.user.id);
        currentUser.sentRequests.push(targetUser.id);
    }
    
    saveUsers(users);
    res.json({ success: true });
});

app.post('/api/friends/accept', authMiddleware, (req, res) => {
    const { userId } = req.body;
    const users = getUsers();
    
    const currentUser = users.find(u => u.id === req.user.id);
    const requester = users.find(u => u.id === userId);
    
    if (!currentUser.friends) currentUser.friends = [];
    if (!requester.friends) requester.friends = [];
    
    currentUser.friends.push(userId);
    requester.friends.push(req.user.id);
    
    currentUser.friendRequests = currentUser.friendRequests?.filter(id => id !== userId) || [];
    requester.sentRequests = requester.sentRequests?.filter(id => id !== req.user.id) || [];
    
    saveUsers(users);
    res.json({ success: true });
});

app.post('/api/friends/reject', authMiddleware, (req, res) => {
    const { userId } = req.body;
    const users = getUsers();
    
    const currentUser = users.find(u => u.id === req.user.id);
    const requester = users.find(u => u.id === userId);
    
    currentUser.friendRequests = currentUser.friendRequests?.filter(id => id !== userId) || [];
    if (requester) {
        requester.sentRequests = requester.sentRequests?.filter(id => id !== req.user.id) || [];
    }
    
    saveUsers(users);
    res.json({ success: true });
});

app.delete('/api/friends/:id', authMiddleware, (req, res) => {
    const users = getUsers();
    const currentUser = users.find(u => u.id === req.user.id);
    const friend = users.find(u => u.id === req.params.id);
    
    if (currentUser.friends) {
        currentUser.friends = currentUser.friends.filter(id => id !== req.params.id);
    }
    if (friend?.friends) {
        friend.friends = friend.friends.filter(id => id !== req.user.id);
    }
    
    saveUsers(users);
    res.json({ success: true });
});

// ===== MESSAGES =====

app.get('/api/chats', authMiddleware, (req, res) => {
    const messages = getMessages();
    const users = getUsers();
    
    const userChats = new Map();
    
    messages.forEach(m => {
        const partnerId = m.from === req.user.id ? m.to : m.from;
        if (partnerId === req.user.id) return;
        
        if (!userChats.has(partnerId) || m.createdAt > userChats.get(partnerId).createdAt) {
            const partner = users.find(u => u.id === partnerId);
            userChats.set(partnerId, {
                userId: partnerId,
                username: partner?.username || 'Unknown',
                avatar: partner?.avatar,
                lastMessage: m.text || '🎤 Голосовое сообщение',
                createdAt: m.createdAt
            });
        }
    });
    
    res.json(Array.from(userChats.values()).sort((a, b) => b.createdAt - a.createdAt));
});

app.get('/api/messages/:userId', authMiddleware, (req, res) => {
    const messages = getMessages();
    const chatMessages = messages.filter(m => 
        (m.from === req.user.id && m.to === req.params.userId) ||
        (m.from === req.params.userId && m.to === req.user.id)
    ).sort((a, b) => a.createdAt - b.createdAt);
    
    res.json(chatMessages);
});

app.post('/api/messages', authMiddleware, (req, res) => {
    const { to, text } = req.body;
    const messages = getMessages();
    
    const message = {
        id: uuidv4(),
        from: req.user.id,
        fromUsername: req.user.username,
        to,
        text,
        createdAt: Date.now(),
        read: false
    };
    
    messages.push(message);
    saveMessages(messages);
    
    res.json({ success: true, message });
});

app.get('/api/messages/unread/count', authMiddleware, (req, res) => {
    const messages = getMessages();
    const count = messages.filter(m => m.to === req.user.id && !m.read).length;
    res.json({ count });
});

app.post('/api/messages/read/:userId', authMiddleware, (req, res) => {
    const messages = getMessages();
    messages.forEach(m => {
        if (m.from === req.params.userId && m.to === req.user.id) {
            m.read = true;
        }
    });
    saveMessages(messages);
    res.json({ success: true });
});

// ===== VOICE MESSAGES =====

app.post('/api/messages/voice', authMiddleware, upload.single('audio'), (req, res) => {
    const { to, duration } = req.body;
    const messages = getMessages();
    
    const message = {
        id: uuidv4(),
        type: 'voice',
        from: req.user.id,
        fromUsername: req.user.username,
        to,
        audioUrl: `/uploads/voice/${req.file.filename}`,
        duration: parseInt(duration),
        createdAt: Date.now(),
        read: false
    };
    
    messages.push(message);
    saveMessages(messages);
    
    res.json({ success: true, message });
});

app.get('/api/messages/:userId/voice', authMiddleware, (req, res) => {
    const messages = getMessages();
    const voiceMessages = messages.filter(m => 
        m.type === 'voice' &&
        ((m.from === req.user.id && m.to === req.params.userId) ||
         (m.from === req.params.userId && m.to === req.user.id))
    );
    res.json(voiceMessages);
});

// ===== POSTS =====

app.get('/api/posts', authMiddleware, (req, res) => {
    const posts = getPosts().sort((a, b) => b.createdAt - a.createdAt);
    const users = getUsers();
    
    const enriched = posts.map(p => {
        const author = users.find(u => u.username === p.author || u.id === p.authorId);
        return {
            ...p,
            authorUsername: p.author,
            authorAvatar: author?.avatar,
            authorLevel: author?.xp ? Math.floor(Math.sqrt(author.xp / 100)) + 1 : 0
        };
    });
    
    res.json(enriched);
});

app.post('/api/posts', authMiddleware, upload.single('media'), (req, res) => {
    const { content } = req.body;
    const posts = getPosts();
    
    const post = {
        id: uuidv4(),
        content: content || '',
        author: req.user.username,
        authorId: req.user.id,
        createdAt: Date.now(),
        likes: [],
        comments: [],
        media: req.file?.filename
    };
    
    // XP за пост
    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);
    if (user) {
        user.xp = (user.xp || 0) + 10;
        saveUsers(users);
    }
    
    posts.push(post);
    savePosts(posts);
    
    res.json({ success: true, post });
});

app.post('/api/posts/:id/like', authMiddleware, (req, res) => {
    const posts = getPosts();
    const post = posts.find(p => p.id === req.params.id);
    
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    if (!post.likes) post.likes = [];
    
    const index = post.likes.indexOf(req.user.username);
    let liked = false;
    
    if (index > -1) {
        post.likes.splice(index, 1);
    } else {
        post.likes.push(req.user.username);
        liked = true;
    }
    
    savePosts(posts);
    res.json({ success: true, liked, likes: post.likes.length });
});

app.post('/api/posts/:id/comment', authMiddleware, (req, res) => {
    const { content } = req.body;
    const posts = getPosts();
    const post = posts.find(p => p.id === req.params.id);
    
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    if (!post.comments) post.comments = [];
    
    const comment = {
        id: uuidv4(),
        author: req.user.username,
        authorId: req.user.id,
        content,
        createdAt: Date.now(),
        likes: []
    };
    
    post.comments.push(comment);
    savePosts(posts);
    
    // XP за коммент
    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);
    if (user) {
        user.xp = (user.xp || 0) + 5;
        saveUsers(users);
    }
    
    res.json({ success: true, comment });
});

app.delete('/api/posts/:id', authMiddleware, (req, res) => {
    const posts = getPosts();
    const post = posts.find(p => p.id === req.params.id);
    
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== req.user.id) return res.status(403).json({ error: 'Not your post' });
    
    if (post.media) {
        const mediaPath = path.join(__dirname, 'uploads', 'posts', post.media);
        if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
    }
    
    const filtered = posts.filter(p => p.id !== req.params.id);
    savePosts(filtered);
    
    res.json({ success: true });
});

// ===== STORIES =====

app.get('/api/stories', authMiddleware, (req, res) => {
    const stories = getStories()
        .filter(s => s.createdAt > Date.now() - 24 * 60 * 60 * 1000)
        .sort((a, b) => b.createdAt - a.createdAt);
    
    const users = getUsers();
    
    const enriched = stories.map(s => {
        const author = users.find(u => u.id === s.authorId);
        return {
            ...s,
            authorUsername: s.author,
            authorAvatar: author?.avatar,
            authorColor: author?.themeColor
        };
    });
    
    res.json(enriched);
});

app.post('/api/stories', authMiddleware, upload.single('media'), (req, res) => {
    const { caption } = req.body;
    const stories = getStories();
    
    const story = {
        id: uuidv4(),
        media: req.file.filename,
        caption: caption || '',
        author: req.user.username,
        authorId: req.user.id,
        createdAt: Date.now(),
        views: []
    };
    
    stories.push(story);
    saveStories(stories);
    
    // XP за сторис
    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);
    if (user) {
        user.xp = (user.xp || 0) + 5;
        saveUsers(users);
    }
    
    res.json({ success: true, story });
});

app.post('/api/stories/:id/view', authMiddleware, (req, res) => {
    const stories = getStories();
    const story = stories.find(s => s.id === req.params.id);
    
    if (story && !story.views.includes(req.user.username)) {
        story.views.push(req.user.username);
        saveStories(stories);
    }
    
    res.json({ success: true });
});

// ===== SERVERS & CHANNELS =====

app.get('/api/servers', authMiddleware, (req, res) => {
    const servers = getServers();
    const userServers = servers.filter(s => 
        s.members && s.members.includes(req.user.id) || s.ownerId === req.user.id
    );
    res.json(userServers);
});

app.post('/api/servers', authMiddleware, (req, res) => {
    const { name } = req.body;
    if (!name) return res.json({ error: 'Название обязательно' });
    
    const servers = getServers();
    const server = {
        id: uuidv4(),
        name,
        ownerId: req.user.id,
        members: [req.user.id],
        channels: [
            { id: uuidv4(), name: 'general', type: 'text' },
            { id: uuidv4(), name: 'General', type: 'voice' }
        ],
        createdAt: Date.now()
    };
    
    servers.push(server);
    saveServers(servers);
    
    res.json({ success: true, server });
});

app.get('/api/servers/:id', authMiddleware, (req, res) => {
    const servers = getServers();
    const server = servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: 'Сервер не найден' });
    if (!server.members || !server.members.includes(req.user.id)) return res.status(403).json({ error: 'Нет доступа' });
    res.json(server);
});

app.post('/api/servers/:id/channels', authMiddleware, (req, res) => {
    const { name, type } = req.body;
    const servers = getServers();
    const server = servers.find(s => s.id === req.params.id);
    
    if (!server) return res.status(404).json({ error: 'Сервер не найден' });
    if (server.ownerId !== req.user.id) return res.status(403).json({ error: 'Только владелец может создавать каналы' });
    
    const channel = {
        id: uuidv4(),
        name,
        type: type || 'text'
    };
    
    if (!server.channels) server.channels = [];
    server.channels.push(channel);
    saveServers(servers);
    
    res.json({ success: true, channel });
});

app.delete('/api/servers/:serverId/channels/:channelId', authMiddleware, (req, res) => {
    try {
        const servers = getServers();
        const serverIndex = servers.findIndex(s => s.id === req.params.serverId);
        
        if (serverIndex === -1) {
            return res.status(404).json({ error: 'Сервер не найден' });
        }
        
        const server = servers[serverIndex];
        
        if (server.ownerId !== req.user.id) {
            return res.status(403).json({ error: 'Только владелец может удалять каналы' });
        }
        
        if (!server.channels || server.channels.length <= 1) {
            return res.status(400).json({ error: 'Нельзя удалить последний канал' });
        }
        
        const channelIndex = server.channels.findIndex(c => c.id === req.params.channelId);
        if (channelIndex === -1) {
            return res.status(404).json({ error: 'Канал не найден' });
        }
        
        const channel = server.channels[channelIndex];
        
        const allMessages = getChannelMessages();
        if (allMessages[channel.id]) {
            delete allMessages[channel.id];
            saveChannelMessages(allMessages);
        }
        
        server.channels.splice(channelIndex, 1);
        saveServers(servers);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/servers/:id', authMiddleware, (req, res) => {
    try {
        const servers = getServers();
        const serverIndex = servers.findIndex(s => s.id === req.params.id);
        
        if (serverIndex === -1) {
            return res.status(404).json({ error: 'Сервер не найден' });
        }
        
        const server = servers[serverIndex];
        
        if (server.ownerId !== req.user.id) {
            return res.status(403).json({ error: 'Только владелец может удалить сервер' });
        }
        
        const allMessages = getChannelMessages();
        if (server.channels) {
            server.channels.forEach(channel => {
                delete allMessages[channel.id];
            });
        }
        saveChannelMessages(allMessages);
        
        servers.splice(serverIndex, 1);
        saveServers(servers);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/servers/:id/leave', authMiddleware, (req, res) => {
    try {
        const servers = getServers();
        const server = servers.find(s => s.id === req.params.id);
        
        if (!server) {
            return res.status(404).json({ error: 'Сервер не найден' });
        }
        
        if (server.ownerId === req.user.id) {
            return res.status(400).json({ error: 'Владелец не может покинуть сервер' });
        }
        
        if (!server.members) server.members = [];
        server.members = server.members.filter(id => id !== req.user.id);
        saveServers(servers);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/channels/:id/messages', authMiddleware, (req, res) => {
    const channelId = req.params.id;
    const allMessages = getChannelMessages();
    const messages = allMessages[channelId] || [];
    messages.sort((a, b) => a.createdAt - b.createdAt);
    res.json(messages);
});

app.post('/api/channels/:id/messages', authMiddleware, (req, res) => {
    const channelId = req.params.id;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }
    
    const servers = getServers();
    let channelExists = false;
    
    for (const server of servers) {
        if (server.channels && server.channels.find(c => c.id === channelId)) {
            channelExists = true;
            break;
        }
    }
    
    if (!channelExists) {
        return res.status(404).json({ error: 'Канал не найден' });
    }
    
    const allMessages = getChannelMessages();
    if (!allMessages[channelId]) {
        allMessages[channelId] = [];
    }
    
    const message = {
        id: uuidv4(),
        content: content.trim(),
        author: req.user.username,
        authorId: req.user.id,
        channelId: channelId,
        createdAt: Date.now()
    };
    
    allMessages[channelId].push(message);
    saveChannelMessages(allMessages);
    
    res.json({ success: true, message });
});

app.post('/api/servers/:id/invites', authMiddleware, (req, res) => {
    const servers = getServers();
    const server = servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: 'Сервер не найден' });
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (!server.invites) server.invites = [];
    server.invites.push({ code, createdAt: Date.now() });
    saveServers(servers);
    
    res.json({ success: true, code });
});

app.post('/api/servers/join', authMiddleware, (req, res) => {
    const { code } = req.body;
    const servers = getServers();
    
    const server = servers.find(s => s.invites?.some(i => i.code === code));
    if (!server) return res.json({ error: 'Неверный код' });
    if (server.members && server.members.includes(req.user.id)) return res.json({ error: 'Вы уже на сервере' });
    
    if (!server.members) server.members = [];
    server.members.push(req.user.id);
    saveServers(servers);
    res.json({ success: true, server });
});

// Удаление сторис
app.delete('/api/stories/:id', authMiddleware, (req, res) => {
    const stories = getStories();
    const story = stories.find(s => s.id === req.params.id);
    
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.authorId !== req.user.id) return res.status(403).json({ error: 'Not your story' });
    
    if (story.media) {
        const mediaPath = path.join(__dirname, 'uploads', 'posts', story.media);
        if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
    }
    
    const filtered = stories.filter(s => s.id !== req.params.id);
    saveStories(filtered);
    
    res.json({ success: true });
});

// ===== WEBSOCKET =====

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const voiceRooms = new Map();

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    
    const sessions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sessions.json')));
    const userId = sessions[token];
    if (!userId) {
        ws.close(1008, 'Invalid token');
        return;
    }
    
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    
    ws.userId = userId;
    ws.username = user.username;
    ws.roomId = null;
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            handleSignaling(ws, msg);
        } catch (e) {
            console.error('WS message error:', e);
        }
    });
    
    ws.on('close', () => {
        leaveVoiceRoom(ws);
    });
});

function handleSignaling(ws, msg) {
    switch (msg.type) {
        case 'join':
            joinVoiceRoom(ws, msg.channelId);
            break;
        case 'offer':
        case 'answer':
        case 'ice-candidate':
            msg.from = ws.userId;
            msg.username = ws.username;
            broadcastToRoom(ws.roomId, msg, ws.userId);
            break;
        case 'leave':
            leaveVoiceRoom(ws);
            break;
    }
}

function joinVoiceRoom(ws, channelId) {
    ws.roomId = channelId;
    
    if (!voiceRooms.has(channelId)) {
        voiceRooms.set(channelId, new Set());
    }
    
    const room = voiceRooms.get(channelId);
    
    room.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'user-joined',
                userId: client.userId,
                username: client.username
            }));
        }
    });
    
    room.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'user-joined',
                userId: ws.userId,
                username: ws.username
            }));
        }
    });
    
    room.add(ws);
}

function leaveVoiceRoom(ws) {
    if (!ws.roomId) return;
    
    const room = voiceRooms.get(ws.roomId);
    if (room) {
        room.delete(ws);
        
        room.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'user-left',
                    userId: ws.userId
                }));
            }
        });
        
        if (room.size === 0) {
            voiceRooms.delete(ws.roomId);
        }
    }
    
    ws.roomId = null;
}

function broadcastToRoom(channelId, msg, excludeUserId) {
    const room = voiceRooms.get(channelId);
    if (!room) return;
    
    room.forEach(client => {
        if (client.userId !== excludeUserId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
        }
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
