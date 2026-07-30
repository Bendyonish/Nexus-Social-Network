const Sounds = {
    context: null,
    enabled: true,
    lastFriendsCount: parseInt(localStorage.getItem('lastFriendsCount') || '0'),
    lastMessagesCount: parseInt(localStorage.getItem('lastMessagesCount') || '0'),
    initialized: false,

    init: function() {
        this.enabled = localStorage.getItem('soundsEnabled') !== 'false';
        
        const initAudio = () => {
            this.createContext();
            this.initialized = true;
        };
        
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });
    },

    createContext: function() {
        if (!this.context) {
            try {
                this.context = new (window.AudioContext || window.webkitAudioContext)();
                if (this.context.state === 'suspended') {
                    this.context.resume();
                }
            } catch (e) {
                console.log('Audio not supported');
            }
        }
    },

    ensureContext: function() {
        if (!this.context) {
            this.createContext();
        }
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
        return this.context && this.context.state === 'running';
    },

    toggle: function() {
        this.enabled = !this.enabled;
        localStorage.setItem('soundsEnabled', this.enabled);
        return this.enabled;
    },

    playMessage: function() {
        if (!this.enabled || !this.ensureContext()) return;
        
        const now = this.context.currentTime;
        
        const osc1 = this.context.createOscillator();
        const gain1 = this.context.createGain();
        osc1.connect(gain1);
        gain1.connect(this.context.destination);
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc1.start(now);
        osc1.stop(now + 0.3);
        
        const osc2 = this.context.createOscillator();
        const gain2 = this.context.createGain();
        osc2.connect(gain2);
        gain2.connect(this.context.destination);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1100, now + 0.15);
        osc2.frequency.exponentialRampToValueAtTime(550, now + 0.25);
        
        gain2.gain.setValueAtTime(0.2, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        osc2.start(now + 0.15);
        osc2.stop(now + 0.4);
    },

    playFriendRequest: function() {
        if (!this.enabled || !this.ensureContext()) return;
        
        const now = this.context.currentTime;
        
        [523, 659, 784].forEach(function(freq, i) {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            osc.connect(gain);
            gain.connect(this.context.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            
            gain.gain.setValueAtTime(0.2, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);
            
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.15);
        }.bind(this));
    },

    checkAndPlay: function(friendsCount, messagesCount) {
        if (!this.initialized) {
            // Сохраняем значения для следующего раза, но звук не играем
            this.lastFriendsCount = friendsCount;
            this.lastMessagesCount = messagesCount;
            localStorage.setItem('lastFriendsCount', friendsCount);
            localStorage.setItem('lastMessagesCount', messagesCount);
            return;
        }
        
        // Новая заявка в друзья
        if (friendsCount > this.lastFriendsCount) {
            this.playFriendRequest();
        }
        
        // Новое сообщение
        if (messagesCount > this.lastMessagesCount) {
            this.playMessage();
        }
        
        this.lastFriendsCount = friendsCount;
        this.lastMessagesCount = messagesCount;
        localStorage.setItem('lastFriendsCount', friendsCount);
        localStorage.setItem('lastMessagesCount', messagesCount);
    }
};

Sounds.init();