// attendance-app.js - COMPLETE FINAL VERSION
// Clear old caches
if ('serviceWorker' in navigator && 'caches' in window) {
    caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
            if (cacheName.startsWith('attendance-cache-')) {
                caches.delete(cacheName);
                console.log('🗑️ Cleared cache:', cacheName);
            }
        });
    });
}

// ==================== STORAGE UTILITY ====================
const Storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading ${key} from localStorage:`, error);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error saving ${key} to localStorage:`, error);
            return false;
        }
    },
    
    remove(key) {
        localStorage.removeItem(key);
    },
    
    clear() {
        localStorage.clear();
    }
};

// ==================== FIREBASE SERVICE ====================
class FirebaseService {
    constructor() {
        this.isAvailable = false;
        this.auth = null;
        this.db = null;
        this.firestore = null;
        this.currentUser = null;
        this.syncQueue = [];
        this.init();
    }
    
    async init() {
        try {
            if (typeof firebase === 'undefined') {
                console.log('ℹ️ Firebase SDK not loaded');
                return;
            }
            
            // Firebase configuration
            const firebaseConfig = {
                apiKey: "AIzaSyCwKcFhLfiVHbn0Pr4hFLlqTn1rKJ4z8Ew",
                authDomain: "attendance-track-v2.firebaseapp.com",
                projectId: "attendance-track-v2",
                storageBucket: "attendance-track-v2.firebasestorage.app",
                messagingSenderId: "1234567890",
                appId: "1:1234567890:web:abcdef123456"
            };
            
            // Initialize Firebase
            const app = firebase.initializeApp(firebaseConfig);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.firestore = firebase.firestore;
            this.isAvailable = true;
            
            console.log('🔥 Firebase initialized');
            
            // Set up auth state listener
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                if (user) {
                    console.log('👤 Firebase user:', user.email);
                    this.processSyncQueue();
                }
            });
            
            // Enable offline persistence
            await this.enablePersistence();
            
        } catch (error) {
            console.error('❌ Firebase init error:', error);
            this.isAvailable = false;
        }
    }
    
    async enablePersistence() {
        try {
            await this.db.enablePersistence({ synchronizeTabs: true });
            console.log('📱 Firebase persistence enabled');
            return true;
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Browser doesn\'t support persistence');
            }
            return false;
        }
    }
    
    getSchoolId() {
        const user = Storage.get('attendance_user');
        return user?.schoolId || user?.id || 'default-school';
    }
    
    async saveClass(classData) {
        if (!this.isAvailable || !this.currentUser) {
            console.log('📦 Queueing class for later sync');
            this.addToSyncQueue('classes', classData, 'save');
            return { success: false, offline: true };
        }
        
        try {
            const schoolId = this.getSchoolId();
            let result;
            
            if (classData.firebaseId) {
                // Update existing
                await this.db.collection('schools').doc(schoolId)
                    .collection('classes').doc(classData.firebaseId)
                    .update({
                        ...classData,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                result = { success: true, id: classData.firebaseId };
            } else {
                // Create new
                const docRef = await this.db.collection('schools').doc(schoolId)
                    .collection('classes').add({
                        ...classData,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        createdBy: this.currentUser.uid
                    });
                result = { success: true, id: docRef.id };
            }
            
            console.log('✅ Class saved to Firebase');
            return result;
            
        } catch (error) {
            console.error('❌ Firebase save error:', error);
            this.addToSyncQueue('classes', classData, 'save');
            return { success: false, error: error.message };
        }
    }
    
    async getClasses() {
        if (!this.isAvailable || !this.currentUser) {
            return Storage.get('classes') || [];
        }
        
        try {
            const schoolId = this.getSchoolId();
            const snapshot = await this.db.collection('schools').doc(schoolId)
                .collection('classes').get();
            
            const classes = snapshot.docs.map(doc => ({
                id: `class_${doc.id}`,
                firebaseId: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ Loaded ${classes.length} classes from Firebase`);
            return classes;
            
        } catch (error) {
            console.error('❌ Firebase load error:', error);
            return Storage.get('classes') || [];
        }
    }
    
    async saveAttendance(attendanceData) {
        if (!this.isAvailable || !this.currentUser) {
            this.addToSyncQueue('attendance', attendanceData, 'save');
            return { success: false, offline: true };
        }
        
        try {
            const schoolId = this.getSchoolId();
            
            await this.db.collection('schools').doc(schoolId)
                .collection('attendance').doc(attendanceData.id)
                .set({
                    ...attendanceData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    recordedBy: this.currentUser.uid
                });
            
            console.log('✅ Attendance saved to Firebase');
            return { success: true, id: attendanceData.id };
            
        } catch (error) {
            console.error('❌ Firebase attendance save error:', error);
            this.addToSyncQueue('attendance', attendanceData, 'save');
            return { success: false, error: error.message };
        }
    }
    
    async getAttendance(date = null, session = 'both') {
        if (!this.isAvailable || !this.currentUser) {
            return Storage.get('attendance') || [];
        }
        
        try {
            const schoolId = this.getSchoolId();
            let query = this.db.collection('schools').doc(schoolId)
                .collection('attendance');
            
            if (date) {
                query = query.where('date', '==', date);
            }
            if (session !== 'both') {
                query = query.where('session', '==', session);
            }
            
            const snapshot = await query.get();
            const attendance = snapshot.docs.map(doc => ({
                id: doc.id,
                firebaseId: doc.id,
                ...doc.data()
            }));
            
            return attendance;
            
        } catch (error) {
            console.error('❌ Firebase attendance load error:', error);
            return Storage.get('attendance') || [];
        }
    }
    
    addToSyncQueue(collection, data, action) {
        this.syncQueue.push({
            collection,
            data,
            action,
            timestamp: Date.now(),
            attempts: 0
        });
        
        Storage.set('firebase_sync_queue', this.syncQueue);
        this.updateSyncIndicator();
    }
    
    async processSyncQueue() {
        if (!this.isAvailable || !this.currentUser || this.syncQueue.length === 0) {
            return;
        }
        
        console.log(`🔄 Processing ${this.syncQueue.length} queued items`);
        
        const failed = [];
        
        for (let i = 0; i < this.syncQueue.length; i++) {
            const item = this.syncQueue[i];
            
            try {
                if (item.collection === 'classes' && item.action === 'save') {
                    await this.saveClass(item.data);
                } else if (item.collection === 'attendance' && item.action === 'save') {
                    await this.saveAttendance(item.data);
                }
                // Success - remove from queue
                this.syncQueue.splice(i, 1);
                i--;
                
            } catch (error) {
                console.error('❌ Sync failed:', error);
                item.attempts++;
                
                if (item.attempts >= 3) {
                    console.log('🗑️ Removing failed item after 3 attempts');
                    this.syncQueue.splice(i, 1);
                    i--;
                } else {
                    failed.push(item);
                }
            }
        }
        
        Storage.set('firebase_sync_queue', this.syncQueue);
        this.updateSyncIndicator();
    }
    
    updateSyncIndicator() {
        const count = this.syncQueue.length;
        let indicator = document.getElementById('firebase-sync-indicator');
        
        if (count > 0) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'firebase-sync-indicator';
                indicator.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    background: #f39c12;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    z-index: 1000;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                `;
                document.body.appendChild(indicator);
            }
            
            indicator.innerHTML = `
                <i class="fas fa-cloud-upload-alt ${this.isAvailable ? 'fa-spin' : ''}"></i>
                <span>${count} pending sync</span>
                ${!this.isAvailable ? '<small>(offline)</small>' : ''}
            `;
            indicator.style.display = 'flex';
        } else if (indicator) {
            indicator.style.display = 'none';
        }
    }
}

// Initialize Firebase service
const firebaseService = new FirebaseService();

// ==================== MAIN APP ORCHESTRATOR ====================
class AttendanceApp {
    constructor() {
        console.log('🎯 AttendanceApp constructor');
        
        this.state = {
            currentUser: null,
            currentPage: this.getCurrentPage(),
            isOnline: navigator.onLine,
            navLinksElement: null,
            hamburgerElement: null,
            resizeListenerInitialized: false
        };

        this.user = null;
        this.modules = {};
        
        this.init();
    }
    
    getCurrentPage() {
        const path = window.location.pathname;
        let page = path.split('/').pop() || 'index.html';
        page = page.replace('.html', '').split('?')[0];
        
        if (page === '' || page === '/' || page === 'index') {
            return 'index';
        }
        
        return page;
    }

    getBasePath() {
        const pathname = window.location.pathname;
        if (pathname.includes('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        } else if (pathname === '/Attendance-Track-v2' || pathname.endsWith('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        }
        return '/';
    }

    async init() {
        console.log('🚀 Initializing AttendanceApp...');
        
        try {
            const currentPage = this.state.currentPage;
            const authResult = await this.checkAuth();
            const hasUser = authResult.success;
            const publicPages = ['index', 'login'];
            const isPublicPage = publicPages.includes(currentPage);
            
            // Handle routing logic
            if (hasUser && isPublicPage) {
                window.location.replace('dashboard.html');
                return;
            }
            
            if (!hasUser && !isPublicPage && currentPage !== 'setup') {
                window.location.replace('index.html');
                return;
            }
            
            if (hasUser) {
                this.user = authResult.user;
                this.state.currentUser = authResult.user;
            } else {
                this.user = null;
                this.state.currentUser = null;
            }
            
            // Initialize modules
            this.modules = {
                dashboard: new DashboardModule(this),
                attendance: new AttendanceModule(this),
                reports: new ReportsModule(this),
                setup: new SetupModule(this),
                settings: new SettingsModule(this)
            };
            
            await this.loadPageContent();
            this.setupUIComponents();
            this.initServiceWorker();
            
            console.log('✅ AttendanceApp initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError(error.message);
        }
    }
    
    async checkAuth() {
        try {
            const userJson = localStorage.getItem('attendance_user');
            if (!userJson) return { success: false, user: null };
            
            const user = JSON.parse(userJson);
            if (!user || !user.email) {
                localStorage.removeItem('attendance_user');
                return { success: false, user: null };
            }
            
            return { success: true, user };
        } catch (error) {
            console.error("❌ Error in checkAuth:", error);
            return { success: false, user: null };
        }
    }
    
    async loadPageContent() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) {
            console.error('❌ app-container not found');
            this.showError('App container not found');
            return;
        }
        
        const currentPage = this.state.currentPage;
        console.log(`📄 Loading content for: ${currentPage}`);
        
        try {
            appContainer.innerHTML = '';
            
            if (this.modules[currentPage]) {
                this.modules[currentPage].render(appContainer);
            } else {
                switch(currentPage) {
                    case 'index':
                        await this.loadIndexContent(appContainer);
                        break;
                    case 'login':
                        await this.loadLoginContent(appContainer);
                        break;
                    default:
                        this.showPageNotFound(appContainer);
                }
            }
        } catch (error) {
            console.error(`❌ Error loading ${currentPage} content:`, error);
            this.showError(`Failed to load ${currentPage} page`);
        }
    }
    
    async loadIndexContent(container) {
        container.innerHTML = `
            <div class="landing-page">
                <div class="hero">
                    <div class="hero-icon">📋</div>
                    <h1>Attendance Tracker v2</h1>
                    <p>Modern attendance tracking for schools</p>
                    
                    <div class="hero-actions">
                        ${this.user ? `
                            <a href="dashboard.html" class="btn btn-lg btn-primary">
                                Go to Dashboard
                            </a>
                            <button onclick="window.app.handleLogout()" class="btn btn-lg btn-secondary">
                                Logout
                            </button>
                        ` : `
                            <a href="login.html" class="btn btn-lg btn-primary">
                                Login
                            </a>
                            <button onclick="window.app.startDemoMode()" class="btn btn-lg btn-secondary">
                                Try Demo Mode
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadLoginContent(container) {
        container.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <h2>Login</h2>
                    <p>Enter your credentials to access the system</p>
                    
                    <form id="loginForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="loginEmail" placeholder="teacher@school.edu" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="loginPassword" placeholder="Enter password" required>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary btn-block">Login</button>
                            <button type="button" onclick="window.app.startDemoMode()" class="btn btn-secondary btn-block">
                                Use Demo Mode
                            </button>
                        </div>
                    </form>
                    
                    <div class="login-info">
                        <p><strong>Demo Credentials:</strong></p>
                        <p>Email: teacher@school.edu</p>
                        <p>Password: demo123</p>
                    </div>
                </div>
            </div>
        `;
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }
    
    async handleLogin() {
        const email = document.getElementById('loginEmail')?.value || 'teacher@school.edu';
        const password = document.getElementById('loginPassword')?.value || 'demo123';
        
        const user = {
            id: 'user_' + Date.now(),
            email: email,
            name: email.split('@')[0],
            role: 'teacher',
            school: 'Demo School',
            lastLogin: new Date().toISOString()
        };
        
        Storage.set('attendance_user', user);
        this.user = user;
        this.state.currentUser = user;
        
        this.showToast('Login successful!', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }
    
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('attendance_user');
            this.user = null;
            this.state.currentUser = null;
            
            this.showToast('Successfully logged out!', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }
    
    startDemoMode() {
        const demoUser = {
            id: 'demo_' + Date.now(),
            email: 'demo@school.edu',
            name: 'Demo Teacher',
            role: 'teacher',
            school: 'Demo Academy',
            demo: true,
            lastLogin: new Date().toISOString()
        };
        
        Storage.set('attendance_user', demoUser);
        this.user = demoUser;
        this.state.currentUser = demoUser;
        
        this.showToast('Demo mode activated!', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }
    
    setupUIComponents() {
        this.updateNavStatus();
        this.setupHamburgerMenu();
        this.initWindowResizeListener();
    }
    
    updateNavStatus() {
        const statusElement = document.getElementById('navUserStatus');
        if (!statusElement) {
            setTimeout(() => this.updateNavStatus(), 300);
            return;
        }
        
        let username = 'User';
        if (this.state.currentUser) {
            username = this.state.currentUser.name || this.state.currentUser.email || 'User';
        }
        
        const isOnline = navigator.onLine;
        const statusText = isOnline ? 'Online' : 'Offline';
        
        statusElement.innerHTML = `
            <div class="status-content">
                <div class="user-display">
                    <i class="fas fa-user"></i>
                    <span class="user-name">${username}</span>
                </div>
                <div class="connection-status">
                    <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
                    <span class="status-text">${statusText}</span>
                </div>
            </div>
        `;
    }
    
    setupHamburgerMenu() {
        let hamburger = document.querySelector('.hamburger-menu');
        if (!hamburger) {
            hamburger = document.createElement('button');
            hamburger.className = 'hamburger-menu';
            hamburger.innerHTML = '☰';
            hamburger.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(26, 35, 126, 0.1);
                border: 1px solid rgba(26, 35, 126, 0.2);
                color: #1a237e;
                cursor: pointer;
                font-size: 20px;
                margin: 0 10px;
            `;
            
            const nav = document.querySelector('nav');
            if (nav) nav.prepend(hamburger);
        }
        
        hamburger.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) {
                navLinks.style.display = navLinks.style.display === 'none' ? 'flex' : 'none';
                hamburger.innerHTML = navLinks.style.display === 'none' ? '☰' : '✕';
            }
        });
    }
    
    initWindowResizeListener() {
        if (this.state.resizeListenerInitialized) return;
        
        window.addEventListener('resize', () => {
            const navLinks = document.querySelector('.nav-links');
            const hamburger = document.querySelector('.hamburger-menu');
            
            if (window.innerWidth >= 768) {
                if (navLinks) navLinks.style.display = 'flex';
                if (hamburger) hamburger.style.display = 'none';
            } else {
                if (hamburger) hamburger.style.display = 'flex';
            }
        });
        
        this.state.resizeListenerInitialized = true;
    }
    
    showPageNotFound(container) {
        container.innerHTML = `
            <div class="error-page">
                <h2>Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
                <a href="index.html" class="btn btn-primary">Go Home</a>
            </div>
        `;
    }
    
    redirectTo(page) {
        window.location.href = this.getBasePath() + page;
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            const basePath = this.getBasePath();
            navigator.serviceWorker.register(`${basePath}service-worker.js`)
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration.scope);
                })
                .catch(error => {
                    console.warn('⚠️ Service Worker registration failed:', error);
                });
        }
    }
}

// ==================== DASHBOARD MODULE ====================
class DashboardModule {
    constructor(app) {
        this.app = app;
    }
    
    render(container) {
        if (!this.app.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = this.getHTML();
        this.loadDashboardData();
        this.setupEventListeners();
    }
    
    getHTML() {
        return `
            <div class="dashboard-page">
                <div class="dashboard-header">
                    <div class="welcome-text">
                        <h2>Welcome, ${this.app.user.name || 'Teacher'}!</h2>
                        <p>Here's your attendance overview</p>
                    </div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <h3 id="total-classes">0</h3>
                            <p>Total Classes</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <h3 id="total-students">0</h3>
                            <p>Total Students</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <h3 id="attendance-rate">0%</h3>
                            <p>Today's Attendance</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <h3 id="total-sessions">0</h3>
                            <p>Sessions Tracked</p>
                        </div>
                    </div>
                </div>
                
                <div class="actions-grid">
                    <a href="attendance.html" class="action-card">Take Attendance</a>
                    <a href="reports.html" class="action-card">View Reports</a>
                    <a href="setup.html" class="action-card">Setup Classes</a>
                    <a href="settings.html" class="action-card">Settings</a>
                </div>
                
                <div class="recent-activity">
                    <div class="activity-header">
                        <h3>Recent Activity</h3>
                        <button class="btn-refresh" onclick="app.modules.dashboard.refresh()">Refresh</button>
                    </div>
                    <div class="activity-list" id="recent-activity">
                        <div class="activity-item">
                            <div class="activity-icon">📋</div>
                            <div class="activity-content">
                                <p>Welcome to Attendance Tracker v2!</p>
                                <small>${new Date().toLocaleDateString()}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadDashboardData() {
        try {
            const classes = Storage.get('classes') || [];
            const students = Storage.get('students') || [];
            const attendance = Storage.get('attendance') || [];
            
            document.getElementById('total-classes').textContent = classes.length;
            document.getElementById('total-students').textContent = students.length;
            document.getElementById('total-sessions').textContent = attendance.length;
            
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendance.filter(a => a.date === today);
            if (todayAttendance.length > 0) {
                const totalPresent = todayAttendance.reduce((sum, a) => sum + (a.totalPresent || 0), 0);
                const totalStudents = todayAttendance.reduce((sum, a) => sum + (a.totalStudents || 0), 0);
                const rate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
                document.getElementById('attendance-rate').textContent = `${rate}%`;
            }
            
            this.loadRecentActivity(attendance);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }
    
    loadRecentActivity(attendance) {
        const activityList = document.getElementById('recent-activity');
        if (!activityList) return;
        
        const recent = attendance.slice(-5).reverse();
        if (recent.length === 0) return;
        
        const activityHTML = recent.map(record => `
            <div class="activity-item">
                <div class="activity-icon">
                    ${record.status === 'present' ? '✅' : '📋'}
                </div>
                <div class="activity-content">
                    <p>${record.className || 'Class'} attendance</p>
                    <small>${record.date} • ${record.session || ''}</small>
                </div>
            </div>
        `).join('');
        
        activityList.innerHTML += activityHTML;
    }
    
    refresh() {
        this.loadDashboardData();
        this.app.showToast('Dashboard refreshed', 'success');
    }
    
    setupEventListeners() {
        // Dashboard event listeners
    }
}

// ==================== ATTENDANCE MODULE ====================
class AttendanceModule {
    constructor(app) {
        this.app = app;
        this.attendanceSystem = new AttendanceSystem();
    }
    
    render(container) {
        if (!this.app.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = this.getHTML();
        this.attendanceSystem.initialize(this.app.user);
        this.setupEventListeners();
    }
    
    getHTML() {
        const today = new Date().toISOString().split('T')[0];
        
        return `
            <div class="attendance-report">
                <div class="header">
                    <h1><i class="fas fa-clipboard-check"></i> Attendance Track</h1>
                    <p class="subtitle">Daily Attendance Report</p>
                </div>
                
                <div class="controls-row">
                    <div class="control-group">
                        <label for="date-picker"><i class="fas fa-calendar-alt"></i> Date</label>
                        <input type="date" id="date-picker" class="date-input" value="${today}">
                    </div>
                    
                    <div class="control-group">
                        <button class="btn btn-success save-all-btn" id="save-all-attendance">
                            <i class="fas fa-save"></i> Save All Changes
                        </button>
                    </div>
                </div>
                
                <div class="session-selector">
                    <div class="session-label">Session Type:</div>
                    <div class="session-options">
                        <label class="session-option active" data-session="both">
                            <input type="radio" name="session" value="both" checked>
                            <span class="session-checkbox"></span>
                            <span class="session-text">Both Sessions (AM & PM)</span>
                        </label>
                        <label class="session-option" data-session="am">
                            <input type="radio" name="session" value="am">
                            <span class="session-checkbox"></span>
                            <span class="session-text">AM Session Only</span>
                        </label>
                        <label class="session-option" data-session="pm">
                            <input type="radio" name="session" value="pm">
                            <span class="session-checkbox"></span>
                            <span class="session-text">PM Session Only</span>
                        </label>
                    </div>
                </div>
                
                <div class="table-container">
                    <table class="attendance-table">
                        <thead>
                            <tr>
                                <th>Class</th>
                                <th>Total</th>
                                <th>Male AM</th>
                                <th>Male PM</th>
                                <th>Female AM</th>
                                <th>Female PM</th>
                                <th>AM Rate</th>
                                <th>PM Rate</th>
                                <th>Daily Rate</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="attendance-table-body">
                            <!-- Data will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        const saveAllBtn = document.getElementById('save-all-attendance');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => {
                this.attendanceSystem.saveAllAttendance();
            });
        }
        
        const sessionOptions = document.querySelectorAll('.session-option');
        sessionOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const session = option.dataset.session;
                this.attendanceSystem.currentSession = session;
                
                sessionOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                this.attendanceSystem.applySessionLogic(session);
                this.attendanceSystem.loadAttendanceData();
            });
        });
        
        const datePicker = document.getElementById('date-picker');
        if (datePicker) {
            datePicker.addEventListener('change', () => {
                this.attendanceSystem.loadAttendanceData();
            });
        }
    }
}

// ==================== ATTENDANCE SYSTEM ====================
class AttendanceSystem {
    constructor() {
        this.user = null;
        this.unsavedChanges = new Set();
        this.autoSaveEnabled = true;
        this.isSaving = false;
        this.autoSaveInterval = null;
        this.AUTO_SAVE_DELAY = 30000;
        this.currentSession = 'both';
    }
    
    initialize(user) {
        this.user = user;
        console.log('👤 Attendance System ready for:', user?.email);
        this.init();
        this.loadAttendanceData();
    }
    
    init() {
        console.log('🚀 Attendance System Initialized');
        this.setupAutoSave();
    }
    
    async loadAttendanceData() {
        console.log('📋 Loading attendance data...');
        
        try {
            const selectedDate = this.getSelectedDate();
            const selectedSession = this.currentSession;
            
            // Try Firebase first, then localStorage
            let classes = [];
            let attendance = [];
            
            if (firebaseService.isAvailable) {
                classes = await firebaseService.getClasses();
                attendance = await firebaseService.getAttendance(selectedDate, selectedSession);
            } else {
                classes = Storage.get('classes') || [];
                attendance = Storage.get('attendance') || [];
            }
            
            // Filter attendance by date and session
            const filteredAttendance = attendance.filter(a => {
                const dateMatch = !selectedDate || a.date === selectedDate;
                const sessionMatch = selectedSession === 'both' || a.session === selectedSession;
                return dateMatch && sessionMatch;
            });
            
            this.renderAttendanceTable(classes, filteredAttendance);
            
        } catch (error) {
            console.error('Error loading attendance:', error);
            this.showToast('Error loading attendance', 'error');
        }
    }
    
    renderAttendanceTable(classes, attendance) {
        const tbody = document.getElementById('attendance-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (classes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="no-data">No classes found</td></tr>`;
            return;
        }
        
        classes.forEach(classItem => {
            const row = this.createClassRow(classItem, attendance);
            tbody.appendChild(row);
        });
        
        this.applySessionLogic(this.currentSession);
    }
    
    createClassRow(classItem, attendance) {
        const classAttendance = attendance.filter(a => a.classId === classItem.id);
        
        // Get saved attendance or defaults
        const savedRecord = classAttendance.find(a => 
            a.session === this.currentSession || this.currentSession === 'both' || !a.session
        );
        
        const maleAm = savedRecord?.malePresentAM || 0;
        const malePm = savedRecord?.malePresentPM || 0;
        const femaleAm = savedRecord?.femalePresentAM || 0;
        const femalePm = savedRecord?.femalePresentPM || 0;
        const totalStudents = classItem.total || 0;
        
        // Calculate rates
        const amRate = this.calculateRate(maleAm + femaleAm, totalStudents);
        const pmRate = this.calculateRate(malePm + femalePm, totalStudents);
        const dailyRate = this.calculateRate((maleAm + malePm + femaleAm + femalePm), totalStudents * 2);
        
        const row = document.createElement('tr');
        row.dataset.classId = classItem.id;
        
        row.innerHTML = `
            <td><strong>${classItem.code || classItem.name}</strong></td>
            <td class="total-students">${totalStudents}</td>
            
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input male-am" 
                       value="${maleAm}"
                       min="0" 
                       max="${classItem.males || totalStudents}"
                       data-gender="male"
                       data-session="am"
                       data-original="${maleAm}">
            </td>
            
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input male-pm" 
                       value="${malePm}"
                       min="0" 
                       max="${classItem.males || totalStudents}"
                       data-gender="male"
                       data-session="pm"
                       data-original="${malePm}">
            </td>
            
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input female-am" 
                       value="${femaleAm}"
                       min="0" 
                       max="${classItem.females || totalStudents}"
                       data-gender="female"
                       data-session="am"
                       data-original="${femaleAm}">
            </td>
            
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input female-pm" 
                       value="${femalePm}"
                       min="0" 
                       max="${classItem.females || totalStudents}"
                       data-gender="female"
                       data-session="pm"
                       data-original="${femalePm}">
            </td>
            
            <td class="rate-cell am-rate">${amRate}%</td>
            <td class="rate-cell pm-rate">${pmRate}%</td>
            <td class="rate-cell daily-rate">${dailyRate}%</td>
            
            <td class="actions-cell">
                <button class="btn btn-sm btn-success save-btn" onclick="app.modules.attendance.attendanceSystem.saveClassAttendance('${classItem.id}')">
                    <i class="fas fa-save"></i> Save
                </button>
                <button class="btn btn-sm btn-secondary reset-btn" onclick="app.modules.attendance.attendanceSystem.resetClassAttendance('${classItem.id}')">
                    <i class="fas fa-undo"></i> Reset
                </button>
            </td>
        `;
        
        const inputs = row.querySelectorAll('.attendance-input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => this.handleInput(e.target));
        });
        
        return row;
    }
    
    handleInput(inputElement) {
        const classId = inputElement.closest('tr').dataset.classId;
        let value = parseInt(inputElement.value) || 0;
        
        // Get max value from class data
        const classes = Storage.get('classes') || [];
        const classItem = classes.find(c => c.id === classId);
        const max = classItem ? (classItem[inputElement.dataset.gender + 's'] || classItem.total || 100) : 100;
        
        // Validate
        value = Math.max(0, Math.min(value, max));
        inputElement.value = value;
        
        // Session-based copying
        this.handleSessionCopying(inputElement, value);
        
        // Update calculations
        this.updateCalculations(classId);
        
        // Mark as unsaved
        this.markAsUnsaved(classId);
    }
    
    handleSessionCopying(changedInput, value) {
        const gender = changedInput.dataset.gender;
        const classId = changedInput.closest('tr').dataset.classId;
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        
        if (this.currentSession === 'am') {
            const pmInput = row.querySelector(`.${gender}-pm`);
            if (pmInput) {
                pmInput.value = value;
                pmInput.dataset.original = value;
            }
        } else if (this.currentSession === 'pm') {
            const amInput = row.querySelector(`.${gender}-am`);
            if (amInput) {
                amInput.value = value;
                amInput.dataset.original = value;
            }
        }
    }
    
    applySessionLogic(session) {
        this.currentSession = session;
        const rows = document.querySelectorAll('tr[data-class-id]');
        
        rows.forEach(row => {
            const classId = row.dataset.classId;
            const maleAm = row.querySelector('.male-am');
            const malePm = row.querySelector('.male-pm');
            const femaleAm = row.querySelector('.female-am');
            const femalePm = row.querySelector('.female-pm');
            
            if (!maleAm || !malePm || !femaleAm || !femalePm) return;
            
            if (session === 'am') {
                malePm.value = maleAm.value;
                femalePm.value = femaleAm.value;
            } else if (session === 'pm') {
                maleAm.value = malePm.value;
                femaleAm.value = femalePm.value;
            }
            
            this.updateCalculations(classId);
        });
    }
    
    updateCalculations(classId) {
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        const maleAm = parseInt(row.querySelector('.male-am').value) || 0;
        const malePm = parseInt(row.querySelector('.male-pm').value) || 0;
        const femaleAm = parseInt(row.querySelector('.female-am').value) || 0;
        const femalePm = parseInt(row.querySelector('.female-pm').value) || 0;
        const total = parseInt(row.querySelector('.total-students').textContent) || 0;
        
        const amRate = this.calculateRate(maleAm + femaleAm, total);
        const pmRate = this.calculateRate(malePm + femalePm, total);
        const dailyRate = this.calculateRate((maleAm + malePm + femaleAm + femalePm), total * 2);
        
        row.querySelector('.am-rate').textContent = `${amRate}%`;
        row.querySelector('.pm-rate').textContent = `${pmRate}%`;
        row.querySelector('.daily-rate').textContent = `${dailyRate}%`;
        
        this.updateSaveButton(row, classId);
    }
    
    updateSaveButton(row, classId) {
        const saveBtn = row.querySelector('.save-btn');
        const inputs = row.querySelectorAll('.attendance-input');
        
        let hasChanges = false;
        inputs.forEach(input => {
            const original = parseInt(input.dataset.original) || 0;
            const current = parseInt(input.value) || 0;
            if (original !== current) hasChanges = true;
        });
        
        if (hasChanges) {
            saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Save Changes';
            saveBtn.classList.add('btn-warning');
            this.unsavedChanges.add(classId);
        } else {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            saveBtn.classList.remove('btn-warning');
            this.unsavedChanges.delete(classId);
        }
    }
    
    markAsUnsaved(classId) {
        this.unsavedChanges.add(classId);
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (row) {
            row.classList.add('unsaved');
        }
    }
    
    async saveClassAttendance(classId) {
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        const maleAm = parseInt(row.querySelector('.male-am').value) || 0;
        const malePm = parseInt(row.querySelector('.male-pm').value) || 0;
        const femaleAm = parseInt(row.querySelector('.female-am').value) || 0;
        const femalePm = parseInt(row.querySelector('.female-pm').value) || 0;
        
        const classes = Storage.get('classes') || [];
        const classItem = classes.find(c => c.id === classId);
        if (!classItem) return;
        
        const attendanceRecord = {
            id: `attendance_${Date.now()}`,
            classId: classId,
            classCode: classItem.code,
            className: classItem.name,
            date: this.getSelectedDate(),
            session: this.currentSession,
            malePresentAM: maleAm,
            malePresentPM: malePm,
            femalePresentAM: femaleAm,
            femalePresentPM: femalePm,
            totalPresent: maleAm + malePm + femaleAm + femalePm,
            totalStudents: classItem.total || 0,
            recordedBy: this.user?.email || 'Unknown',
            recordedAt: new Date().toISOString(),
            schoolId: this.user?.schoolId || this.user?.id
        };
        
        // Save to localStorage
        let attendance = Storage.get('attendance') || [];
        attendance = attendance.filter(a => 
            !(a.classId === classId && 
              a.date === attendanceRecord.date && 
              a.session === attendanceRecord.session)
        );
        attendance.push(attendanceRecord);
        Storage.set('attendance', attendance);
        
        // Save to Firebase
        await firebaseService.saveAttendance(attendanceRecord);
        
        // Update UI
        const inputs = row.querySelectorAll('.attendance-input');
        inputs.forEach(input => {
            input.dataset.original = input.value;
        });
        
        row.classList.remove('unsaved');
        this.unsavedChanges.delete(classId);
        
        const saveBtn = row.querySelector('.save-btn');
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
        saveBtn.classList.remove('btn-warning');
        saveBtn.classList.add('btn-success');
        
        setTimeout(() => {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            saveBtn.classList.remove('btn-success');
        }, 2000);
        
        this.showToast(`Saved ${classItem.code}`, 'success');
    }
    
    async saveAllAttendance() {
        const unsavedClasses = Array.from(this.unsavedChanges);
        if (unsavedClasses.length === 0) {
            this.showToast('No changes to save', 'info');
            return;
        }
        
        for (const classId of unsavedClasses) {
            await this.saveClassAttendance(classId);
        }
        
        this.showToast(`Saved ${unsavedClasses.length} classes`, 'success');
    }
    
    resetClassAttendance(classId) {
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        const inputs = row.querySelectorAll('.attendance-input');
        inputs.forEach(input => {
            input.value = input.dataset.original || '0';
        });
        
        this.updateCalculations(classId);
        row.classList.remove('unsaved');
        this.unsavedChanges.delete(classId);
        
        this.showToast('Reset to saved values', 'info');
    }
    
    setupAutoSave() {
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
        
        this.autoSaveInterval = setInterval(() => {
            if (this.autoSaveEnabled && this.unsavedChanges.size > 0 && !this.isSaving) {
                this.autoSave();
            }
        }, this.AUTO_SAVE_DELAY);
        
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges.size > 0) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }
    
    async autoSave() {
        if (this.isSaving || this.unsavedChanges.size === 0) return;
        
        this.isSaving = true;
        
        try {
            const unsavedClasses = Array.from(this.unsavedChanges);
            for (const classId of unsavedClasses) {
                await this.saveClassAttendance(classId);
            }
            
            this.showToast(`Auto-saved ${unsavedClasses.length} classes`, 'success');
            
        } catch (error) {
            console.error('Auto-save error:', error);
        } finally {
            this.isSaving = false;
        }
    }
    
    getSelectedDate() {
        const datePicker = document.getElementById('date-picker');
        return datePicker?.value || new Date().toISOString().split('T')[0];
    }
    
    calculateRate(present, total) {
        return total > 0 ? Math.round((present / total) * 100) : 0;
    }
    
    showToast(message, type = 'info') {
        if (window.app) {
            window.app.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
}

// ==================== SETUP MODULE ====================
class SetupModule {
    constructor(app) {
        this.app = app;
        this.autoSaveTimeouts = {};
    }
    
    render(container) {
        if (!this.app.user) {
            container.innerHTML = `
                <div class="setup-page">
                    <div class="setup-container">
                        <div class="setup-header">
                            <h1>System Setup & Configuration</h1>
                            <p class="setup-subtitle">Please login to access setup features</p>
                        </div>
                        
                        <div class="login-required">
                            <div class="login-icon">
                                <i class="fas fa-lock"></i>
                            </div>
                            <h3>Authentication Required</h3>
                            <p>You need to be logged in to access the setup page.</p>
                            <a href="index.html" class="btn btn-primary">Go to Login</a>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.getHTML();
        this.initializeSetupPage();
        this.setupEventListeners();
    }
    
    getHTML() {
        return `
            <div class="setup-page">
                <div class="setup-container">
                    <div class="setup-header">
                        <h1>System Setup & Configuration</h1>
                        <p class="setup-subtitle">Configure all system settings, user preferences, and manage data</p>
                    </div>
                    
                    <section class="setup-section">
                        <div class="setup-tabs">
                            <button class="tab-btn active" data-tab="classes">
                                <i class="fas fa-chalkboard-teacher"></i> Classes
                            </button>
                        </div>
                        
                        <div class="tab-content active" id="classes-tab">
                            <div class="section-title">Class Management</div>
                            <div class="setup-form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Year Group</label>
                                        <select id="yearGroup" class="form-input">
                                            <option value="">Select Year Group</option>
                                            <option value="1st Years">1st Years</option>
                                            <option value="2nd Years">2nd Years</option>
                                            <option value="3rd Years">3rd Years</option>
                                            <option value="4th Years">4th Years</option>
                                            <option value="5th Years">5th Years</option>
                                            <option value="U5">Upper 5th</option>
                                            <option value="L6">Lower 6th</option>
                                            <option value="U6">Upper 6th</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Class Code</label>
                                        <input type="text" id="classCode" class="form-input" placeholder="e.g., 1LEY, U5MASCOLL, 10RAN" required>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Number of Males</label>
                                        <input type="number" id="maleCount" class="form-input" placeholder="0" min="0">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Number of Females</label>
                                        <input type="number" id="femaleCount" class="form-input" placeholder="0" min="0">
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Total Students</label>
                                    <div id="totalStudents" class="total-display">0</div>
                                </div>
                                
                                <div class="actions-container">
                                    <button class="action-btn save-btn" id="save-class">
                                        <i class="fas fa-save"></i> Save Class
                                    </button>
                                    <button class="action-btn cancel-btn" id="clear-class">
                                        <i class="fas fa-undo"></i> Clear Form
                                    </button>
                                </div>
                            </div>
                            
                            <div class="section-title">Existing Classes</div>
                            <div class="classes-list" id="classes-list">
                                <!-- Classes will be loaded here -->
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
    
    initializeSetupPage() {
        this.setupTotalCalculation();
        this.setupUppercaseConversion();
        this.loadClassesList();
    }
    
    setupTotalCalculation() {
        const maleInput = document.getElementById('maleCount');
        const femaleInput = document.getElementById('femaleCount');
        const totalDisplay = document.getElementById('totalStudents');
        
        if (maleInput && femaleInput && totalDisplay) {
            const calculateTotal = () => {
                const males = parseInt(maleInput.value) || 0;
                const females = parseInt(femaleInput.value) || 0;
                totalDisplay.textContent = males + females;
            };
            
            maleInput.addEventListener('input', calculateTotal);
            femaleInput.addEventListener('input', calculateTotal);
            calculateTotal();
        }
    }
    
    setupUppercaseConversion() {
        const classCodeInput = document.getElementById('classCode');
        if (!classCodeInput) return;
        
        classCodeInput.addEventListener('input', (e) => {
            const input = e.target;
            const cursorPosition = input.selectionStart;
            const uppercaseValue = input.value.toUpperCase();
            
            if (input.value !== uppercaseValue) {
                input.value = uppercaseValue;
                input.setSelectionRange(cursorPosition, cursorPosition);
            }
        });
    }
    
    async saveClass() {
        const yearGroup = document.getElementById('yearGroup')?.value;
        const classCode = document.getElementById('classCode')?.value?.trim();
        const maleCount = parseInt(document.getElementById('maleCount')?.value) || 0;
        const femaleCount = parseInt(document.getElementById('femaleCount')?.value) || 0;
        
        if (!yearGroup || !classCode) {
            this.app.showToast('Please fill in Year Group and Class Code', 'error');
            return;
        }
        
        const classes = Storage.get('classes') || [];
        
        if (classes.some(c => c.code === classCode)) {
            this.app.showToast('Class code already exists', 'error');
            return;
        }
        
        const totalStudents = maleCount + femaleCount;
        
        const classData = {
            id: `class_${Date.now()}`,
            yearGroup: yearGroup,
            code: classCode,
            males: maleCount,
            females: femaleCount,
            total: totalStudents,
            name: `${yearGroup} - ${classCode}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            teacherId: this.app.user?.id,
            schoolId: this.app.user?.schoolId || this.app.user?.id
        };
        
        // Save to localStorage
        classes.push(classData);
        Storage.set('classes', classes);
        
        // Try to save to Firebase
        const result = await firebaseService.saveClass(classData);
        
        if (result.success) {
            // Update with Firebase ID
            classData.firebaseId = result.id;
            const updatedClasses = classes.map(c => 
                c.id === classData.id ? { ...c, firebaseId: result.id } : c
            );
            Storage.set('classes', updatedClasses);
            
            this.app.showToast('Class saved to cloud!', 'success');
        } else if (result.offline) {
            this.app.showToast('Class saved locally (will sync when online)', 'info');
        } else {
            this.app.showToast('Class saved locally (cloud sync failed)', 'warning');
        }
        
        this.clearClassForm();
        this.loadClassesList();
    }
    
    clearClassForm() {
        document.getElementById('yearGroup').value = '';
        document.getElementById('classCode').value = '';
        document.getElementById('maleCount').value = '0';
        document.getElementById('femaleCount').value = '0';
        document.getElementById('totalStudents').textContent = '0';
    }
    
    loadClassesList() {
        const classesList = document.getElementById('classes-list');
        if (!classesList) return;
        
        const classes = Storage.get('classes') || [];
        
        if (classes.length === 0) {
            classesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="empty-text">No classes added yet</div>
                </div>
            `;
            return;
        }
        
        classesList.innerHTML = classes.map(cls => {
            const cloudIcon = cls.firebaseId ? 
                '<i class="fas fa-cloud" style="color: #3498db; margin-left: 5px;"></i>' : '';
            
            return `
                <div class="class-card">
                    <div class="class-header">
                        <div class="class-title">${cls.name}</div>
                        <div class="class-code">${cls.code} ${cloudIcon}</div>
                    </div>
                    <div class="class-info">
                        <div class="info-item">
                            <span class="info-label">Students:</span>
                            <span class="info-value">${cls.total || 0}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Males:</span>
                            <span class="info-value">${cls.males || 0}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Females:</span>
                            <span class="info-value">${cls.females || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    setupEventListeners() {
        const saveClassBtn = document.getElementById('save-class');
        if (saveClassBtn) {
            saveClassBtn.addEventListener('click', () => this.saveClass());
        }
        
        const clearClassBtn = document.getElementById('clear-class');
        if (clearClassBtn) {
            clearClassBtn.addEventListener('click', () => this.clearClassForm());
        }
    }
}

// ==================== REPORTS MODULE ====================
class ReportsModule {
    constructor(app) {
        this.app = app;
    }
    
    render(container) {
        if (!this.app.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="reports-page">
                <div class="reports-container">
                    <div class="reports-header">
                        <h1>Attendance Reports</h1>
                        <p class="reports-subtitle">Generate detailed attendance reports and analytics</p>
                    </div>
                    
                    <div class="reports-coming-soon">
                        <i class="fas fa-chart-bar"></i>
                        <h3>Reports Coming Soon</h3>
                        <p>This feature is currently under development.</p>
                        <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
                    </div>
                </div>
            </div>
        `;
    }
}

// ==================== SETTINGS MODULE ====================
class SettingsModule {
    constructor(app) {
        this.app = app;
    }
    
    render(container) {
        if (!this.app.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="settings-page">
                <div class="settings-container">
                    <div class="settings-header">
                        <h1>User Settings</h1>
                        <p class="settings-subtitle">Manage your account preferences and app settings</p>
                    </div>
                    
                    <div class="settings-coming-soon">
                        <i class="fas fa-cogs"></i>
                        <h3>Settings Coming Soon</h3>
                        <p>This feature is currently under development.</p>
                        <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
                    </div>
                </div>
            </div>
        `;
    }
}

// ==================== INITIALIZE APP ====================
// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM fully loaded');
    window.app = new AttendanceApp();
});

// Make app globally accessible
if (typeof window !== 'undefined') {
    window.AttendanceApp = AttendanceApp;
    window.Storage = Storage;
}
