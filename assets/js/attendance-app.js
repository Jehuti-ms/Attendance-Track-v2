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
            isOnline: navigator.onLine,
            resizeListenerInitialized: false,
            currentPage: this.getCurrentPage()
        };

        this.user = null;
        this.firebaseService = null;
        this.attendanceSystem = null;
        this.navigationManager = null;
        
        // Initialize app
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Smart Attendance System...');
        
        try {
            // Check authentication
            const authResult = await this.checkAuth();
            const currentPage = this.getCurrentPage();
            const publicPages = ['index', 'login', ''];
            
            if (!authResult.success && !publicPages.includes(currentPage)) {
                window.location.href = 'index.html';
                return;
            }
            
            if (authResult.success) {
                this.user = authResult.user;
                this.state.currentUser = authResult.user;
                
                // Initialize services
                this.firebaseService = new FirebaseService();
                await this.firebaseService.init();
                
                this.attendanceSystem = new AttendanceSystem();
                this.attendanceSystem.initialize(this.user);
                
                // Store globally for modules to access
                window.firebaseService = this.firebaseService;
                window.attendanceSystem = this.attendanceSystem;
                window.currentUser = this.user;
            }
            
            // Initialize navigation
            this.navigationManager = new NavigationManager();
            window.navigationManager = this.navigationManager;
            
            // Update UI
            this.updateUserStatus();
            this.setupUIComponents();
            
            // Load page content
            await this.loadPageContent();
            
            console.log('✅ Smart Attendance System initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError('Failed to initialize application');
        }
    }
    
    getCurrentPage() {
        const path = window.location.pathname;
        let page = path.split('/').pop() || 'dashboard.html';
        page = page.replace('.html', '').split('?')[0];
        return page === '' ? 'dashboard' : page;
    }
    
    updateUserStatus() {
        if (!this.user) return;
        
        const userStatus = document.getElementById('navUserStatus');
        if (!userStatus) return;
        
        userStatus.innerHTML = `
            <div class="status-content">
                <i class="fas fa-user-circle"></i>
                <div class="user-info">
                    <div class="user-name">${this.user.name || this.user.email}</div>
                    <div class="user-role">${this.user.role || 'Teacher'}</div>
                </div>
            </div>
        `;
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
            localStorage.removeItem('attendance_user');
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
            
            switch(currentPage) {
                case 'index':
                case '':
                    await this.loadIndexContent(appContainer);
                    break;
                case 'login':
                    await this.loadLoginContent(appContainer);
                    break;
                case 'dashboard':
                    await this.loadDashboardContent(appContainer);
                    break;
                default:
                    this.showPageNotFound(appContainer);
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
    
    async loadDashboardContent(container) {
        container.innerHTML = `
            <div class="dashboard-container">
                <h1>Welcome, ${this.user?.name || 'Teacher'}</h1>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">🏫</div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-classes">0</div>
                            <div class="stat-label">Total Classes</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">👨‍🎓</div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-students">0</div>
                            <div class="stat-label">Total Students</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-sessions">0</div>
                            <div class="stat-label">Sessions</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <div class="stat-value" id="attendance-rate">0%</div>
                            <div class="stat-label">Today's Rate</div>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-sections">
                    <div class="section">
                        <h2>Recent Activity</h2>
                        <div id="recent-activity" class="activity-list">
                            <div class="activity-placeholder">No recent activity</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>Quick Actions</h2>
                        <div class="quick-actions">
                            <button onclick="window.app.navigateTo('take-attendance')" class="action-btn primary">
                                <i class="fas fa-clipboard-check"></i>
                                Take Attendance
                            </button>
                            <button onclick="window.app.navigateTo('manage-classes')" class="action-btn secondary">
                                <i class="fas fa-chalkboard-teacher"></i>
                                Manage Classes
                            </button>
                            <button onclick="window.app.loadDashboardData()" class="action-btn tertiary">
                                <i class="fas fa-sync"></i>
                                Refresh Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load data after rendering
        await this.loadDashboardData();
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
        
        localStorage.setItem('attendance_user', JSON.stringify(user));
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
        
        localStorage.setItem('attendance_user', JSON.stringify(demoUser));
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
                const isHidden = navLinks.style.display === 'none';
                navLinks.style.display = isHidden ? 'flex' : 'none';
                hamburger.innerHTML = isHidden ? '✕' : '☰';
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
                if (navLinks) navLinks.style.display = 'none';
            }
        });
        
        this.state.resizeListenerInitialized = true;
        
        // Trigger resize event to set initial state
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
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
    
    navigateTo(page) {
        console.log(`Navigating to: ${page}`);
        // This would be handled by your navigation manager
        this.showToast(`Navigating to ${page}...`, 'info');
    }
    
    redirectTo(page) {
        window.location.href = page.includes('.html') ? page : `${page}.html`;
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
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    // ==================== DASHBOARD METHODS ====================
    
    loadStats() {
        console.log('Loading dashboard stats...');
        // Your existing stats loading code
        // This could be called from loadDashboardData or separately
    }
    
    loadRecentAttendance() {
        console.log('Loading recent attendance...');
        // Your existing recent attendance loading code
    }
    
    async loadDashboardData() {
        try {
            console.log('📊 Loading dashboard data...');
            
            // Use Storage helper if available, otherwise use localStorage directly
            const Storage = window.Storage || {
                get: (key) => {
                    const item = localStorage.getItem(key);
                    return item ? JSON.parse(item) : [];
                }
            };
            
            const classes = Storage.get('classes') || [];
            const students = Storage.get('students') || [];
            const attendance = Storage.get('attendance') || [];
            
            // Update stats
            document.getElementById('total-classes').textContent = classes.length;
            document.getElementById('total-students').textContent = students.length;
            document.getElementById('total-sessions').textContent = attendance.length;
            
            // Calculate today's attendance rate
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendance.filter(a => a.date === today);
            
            let rate = 0;
            if (todayAttendance.length > 0) {
                const totalPresent = todayAttendance.reduce((sum, a) => sum + (a.totalPresent || 0), 0);
                const totalStudents = todayAttendance.reduce((sum, a) => sum + (a.totalStudents || 0), 0);
                rate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
            }
            document.getElementById('attendance-rate').textContent = `${rate}%`;
            
            // Load recent activity
            this.loadRecentActivity(attendance);
            
            // Call other load methods
            this.loadStats();
            this.loadRecentAttendance();
            
            console.log('✅ Dashboard data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }
    
    loadRecentActivity(attendance) {
        try {
            const container = document.getElementById('recent-activity');
            if (!container) return;
            
            if (!attendance || attendance.length === 0) {
                container.innerHTML = `
                    <div class="activity-placeholder">
                        <i class="fas fa-calendar-times"></i>
                        <p>No attendance records yet</p>
                        <button onclick="window.app.navigateTo('take-attendance')" class="btn btn-sm btn-primary">
                            Take First Attendance
                        </button>
                    </div>
                `;
                return;
            }
            
            // Sort by date (newest first) and take last 5
            const recent = [...attendance]
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                .slice(0, 5);
            
            container.innerHTML = recent.map(item => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    <div class="activity-details">
                        <div class="activity-title">${item.className || 'Class'} Attendance</div>
                        <div class="activity-info">
                            <span class="activity-date">${this.formatDate(item.date)}</span>
                            <span class="activity-stats">${item.totalPresent || 0}/${item.totalStudents || 0} present</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('❌ Error loading recent activity:', error);
        }
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    // ==================== SERVICE WORKER INITIALIZATION ====================
    
    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration.scope);
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        console.log('🔄 Service Worker update found');
                    });
                })
                .catch(error => {
                    console.warn('⚠️ Service Worker registration failed:', error);
                });
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AttendanceApp();
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});

// Make app accessible globally
window.AttendanceApp = AttendanceApp;
    
    

// ==================== DASHBOARD MODULE ====================
class DashboardModule {
    constructor(firebaseService, attendanceSystem) {
        this.firebaseService = firebaseService;
        this.attendanceSystem = attendanceSystem;
    }

    // ADD THIS METHOD
    render() {
        const container = document.getElementById('dashboardModule');
        if (!container) return;
        
        container.innerHTML = `
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
            
            <div class="quick-actions">
                <div class="action-card" id="quickAttendanceCard">
                    <i class="fas fa-clipboard-check"></i>
                    <h3>Take Attendance</h3>
                    <p>Quickly mark attendance for today</p>
                </div>
                
                <div class="action-card" id="manageClassesCard">
                    <i class="fas fa-cogs"></i>
                    <h3>Manage Classes</h3>
                    <p>Add or edit classes and students</p>
                </div>
                
                <div class="action-card" id="viewReportsCard">
                    <i class="fas fa-chart-bar"></i>
                    <h3>View Reports</h3>
                    <p>Generate attendance reports</p>
                </div>
            </div>
            
            <div class="recent-attendance">
                <h3>Recent Attendance</h3>
                <div class="table-container">
                    <!-- Recent attendance will be populated here -->
                </div>
            </div>
        `;
        
        // Setup event listeners for quick action cards
        this.setupQuickActions();
    }

    // ADD THIS METHOD
    setupQuickActions() {
        const quickAttendanceCard = document.getElementById('quickAttendanceCard');
        const manageClassesCard = document.getElementById('manageClassesCard');
        const viewReportsCard = document.getElementById('viewReportsCard');
        
        if (quickAttendanceCard) {
            quickAttendanceCard.addEventListener('click', () => {
                // Switch to attendance module
                if (window.navigationManager) {
                    window.navigationManager.switchModule('attendance');
                }
            });
        }
        
        if (manageClassesCard) {
            manageClassesCard.addEventListener('click', () => {
                // Switch to setup module
                if (window.navigationManager) {
                    window.navigationManager.switchModule('setup');
                }
            });
        }
        
        if (viewReportsCard) {
            viewReportsCard.addEventListener('click', () => {
                // Switch to reports module
                if (window.navigationManager) {
                    window.navigationManager.switchModule('reports');
                }
            });
        }
    }

    loadStats() {
        // Your existing stats loading code
        console.log('Loading dashboard stats...');
    }

    loadRecentAttendance() {
        // Your existing recent attendance loading code
        console.log('Loading recent attendance...');
    }
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

// ==================== DASHBOARD PAGE ENHANCEMENTS ====================
async loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        // Load existing data
        const classes = Storage.get('classes') || [];
        const students = Storage.get('students') || [];
        const attendance = Storage.get('attendance') || [];
        
        // Update stats in your existing HTML
        this.updateDashboardStats({
            totalClasses: classes.length,
            totalStudents: students.length,
            totalSessions: attendance.length
        });
        
        // Calculate today's attendance rate
        const todayRate = this.calculateTodayAttendanceRate(attendance);
        this.updateAttendanceRate(todayRate);
        
        // Load recent activity
        this.loadRecentActivity(attendance);
        
        // Setup quick action cards
        this.setupQuickActions();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

calculateTodayAttendanceRate(attendance) {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today);
    
    if (todayAttendance.length === 0) return 0;
    
    const totalPresent = todayAttendance.reduce((sum, a) => 
        sum + (a.malePresentAM || 0) + (a.malePresentPM || 0) + 
              (a.femalePresentAM || 0) + (a.femalePresentPM || 0), 0);
    
    const totalStudents = todayAttendance.reduce((sum, a) => 
        sum + (a.totalStudents || 0), 0);
    
    return totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
}

updateDashboardStats(stats) {
    // Update your dashboard HTML elements
    const statsGrid = document.querySelector('.stats-grid');
    if (!statsGrid) return;
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
                <h3 id="total-classes">${stats.totalClasses}</h3>
                <p>Total Classes</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
                <h3 id="total-students">${stats.totalStudents}</h3>
                <p>Total Students</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
                <h3 id="attendance-rate">${stats.todayRate || 0}%</h3>
                <p>Today's Attendance</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
                <h3 id="total-sessions">${stats.totalSessions}</h3>
                <p>Sessions Tracked</p>
            </div>
        </div>
    `;
}

setupQuickActions() {
    const quickActions = document.querySelector('.quick-actions');
    if (!quickActions) return;
    
    quickActions.innerHTML = `
        <div class="action-card" id="quickAttendanceCard">
            <i class="fas fa-clipboard-check"></i>
            <h3>Take Attendance</h3>
            <p>Quickly mark attendance for today</p>
        </div>
        
        <div class="action-card" id="manageClassesCard">
            <i class="fas fa-cogs"></i>
            <h3>Manage Classes</h3>
            <p>Add or edit classes and students</p>
        </div>
        
        <div class="action-card" id="viewReportsCard">
            <i class="fas fa-chart-bar"></i>
            <h3>View Reports</h3>
            <p>Generate attendance reports</p>
        </div>
    `;
}

class AttendanceModule {
    constructor(firebaseService, attendanceSystem) {
        this.firebaseService = firebaseService;
        this.attendanceSystem = attendanceSystem;
        this.container = null;
    }

    render() {
        this.container = document.getElementById('attendanceModule');
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="attendance-report">
                <div class="header">
                    <h1><i class="fas fa-clipboard-check"></i> Attendance Track</h1>
                    <p class="subtitle">Daily Attendance Report</p>
                </div>
                
                <div class="controls-row">
                    <div class="control-group">
                        <label for="date-picker"><i class="fas fa-calendar-alt"></i> Date</label>
                        <input type="date" id="date-picker" class="date-input" value="${this.getTodayDate()}">
                    </div>
                    
                    <div class="control-group">
                        <label for="week-picker"><i class="fas fa-calendar-week"></i> Week</label>
                        <select id="week-picker" class="week-select">
                            ${this.generateWeekOptions()}
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label for="term-picker"><i class="fas fa-graduation-cap"></i> Term</label>
                        <select id="term-picker" class="term-select">
                            <option value="1" selected>Term 1</option>
                            <option value="2">Term 2</option>
                            <option value="3">Term 3</option>
                        </select>
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
                    <table class="attendance-table sticky-header">
                       <thead>
                            <tr>
                                <th rowspan="2">Class</th>
                                <th rowspan="2">Total</th>
                                <th colspan="2">Male Present</th>
                                <th colspan="2">Female Present</th>
                                <th rowspan="2">AM Rate</th>
                                <th rowspan="2">PM Rate</th>
                                <th rowspan="2">Daily Rate</th>
                                <th rowspan="2">Actions</th>
                            </tr>
                            <tr>
                                <th>AM <span class="input-label">(Input)</span></th>
                                <th>PM <span class="input-label">(Input)</span></th>
                                <th>AM <span class="input-label">(Input)</span></th>
                                <th>PM <span class="input-label">(Input)</span></th>
                            </tr>
                        </thead>
                        <tbody id="attendance-table-body">
                            <!-- Data will be loaded here -->
                        </tbody>
                    </table>
                </div>
                
                <div class="attendance-actions">
                    <button class="btn btn-primary" id="take-attendance">
                        <i class="fas fa-user-check"></i>
                        <span>Take Attendance</span>
                    </button>
                    <button class="btn btn-secondary" id="print-report">
                        <i class="fas fa-print"></i>
                        <span>Print Report</span>
                    </button>
                    <button class="btn btn-secondary" id="refresh-data">
                        <i class="fas fa-sync-alt"></i>
                        <span>Refresh</span>
                    </button>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.loadClasses();
    }

    setupEventListeners() {
        // Session type selection
        document.querySelectorAll('.session-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const session = e.currentTarget.dataset.session;
                this.handleSessionChange(session);
            });
        });
        
        // Save all button
        document.getElementById('save-all-attendance')?.addEventListener('click', () => {
            if (this.attendanceSystem) {
                this.attendanceSystem.saveAllAttendance();
            }
        });
        
        // Take attendance button
        document.getElementById('take-attendance')?.addEventListener('click', () => {
            this.loadClasses();
        });
        
        // Date picker
        document.getElementById('date-picker')?.addEventListener('change', (e) => {
            if (this.attendanceSystem) {
                this.attendanceSystem.loadAttendanceData();
            }
        });
        
        // Print button
        document.getElementById('print-report')?.addEventListener('click', () => {
            window.print();
        });
        
        // Refresh button
        document.getElementById('refresh-data')?.addEventListener('click', () => {
            this.loadClasses();
        });
    }

    handleSessionChange(session) {
        if (this.attendanceSystem) {
            this.attendanceSystem.currentSession = session;
            this.attendanceSystem.applySessionLogic(session);
        }
        
        // Update UI
        document.querySelectorAll('.session-option').forEach(opt => {
            opt.classList.remove('active');
        });
        document.querySelector(`.session-option[data-session="${session}"]`)?.classList.add('active');
    }

    async loadClasses() {
        try {
            let classes = [];
            
            if (this.firebaseService.isAvailable) {
                classes = await this.firebaseService.getClasses();
            } else {
                classes = Storage.get('classes') || [];
            }
            
            // Initialize attendance system with classes
            if (this.attendanceSystem) {
                // Store classes for attendance system to use
                Storage.set('classes', classes);
                // Load attendance data
                await this.attendanceSystem.loadAttendanceData();
            }
            
        } catch (error) {
            console.error('Error loading classes:', error);
            this.showError('Failed to load classes');
        }
    }

    getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    generateWeekOptions() {
        let options = '';
        for (let i = 1; i <= 14; i++) {
            const isCurrent = i === 1;
            options += `<option value="${i}" ${isCurrent ? 'selected' : ''}>Week ${i}</option>`;
        }
        return options;
    }

    showError(message) {
        console.error('Attendance Module Error:', message);
        if (window.app && window.app.showToast) {
            window.app.showToast(message, 'error');
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

// ==================== ATTENDANCE PAGE ENHANCEMENTS ====================
loadAttendanceContent() {
    const container = document.getElementById('attendanceModule');
    if (!container) return;
    
    container.innerHTML = `
        <div class="attendance-report">
            <div class="header">
                <h1><i class="fas fa-clipboard-check"></i> Attendance Track</h1>
                <p class="subtitle">Daily Attendance Report</p>
            </div>
            
            <div class="controls-row">
                <div class="control-group">
                    <label for="date-picker"><i class="fas fa-calendar-alt"></i> Date</label>
                    <input type="date" id="date-picker" class="date-input" value="${this.getTodayDate()}">
                </div>
                
                <div class="control-group">
                    <label for="week-picker"><i class="fas fa-calendar-week"></i> Week</label>
                    <select id="week-picker" class="week-select">
                        ${this.generateWeekOptions()}
                    </select>
                </div>
                
                <div class="control-group">
                    <label for="term-picker"><i class="fas fa-graduation-cap"></i> Term</label>
                    <select id="term-picker" class="term-select">
                        <option value="1" selected>Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                    </select>
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
                <table class="attendance-table sticky-header">
                   <thead>
                        <tr>
                            <th rowspan="2">Year Group</th>
                            <th rowspan="2">Class</th>
                            <th rowspan="2">Total</th>
                            <th colspan="2">Male Present</th>
                            <th colspan="2">Female Present</th>
                            <th rowspan="2">AM Rate</th>
                            <th rowspan="2">PM Rate</th>
                            <th rowspan="2">Daily Rate</th>
                            <th rowspan="2">Actions</th>
                        </tr>
                        <tr>
                            <th>AM <span class="input-label">(Input)</span></th>
                            <th>PM <span class="input-label">(Input)</span></th>
                            <th>AM <span class="input-label">(Input)</span></th>
                            <th>PM <span class="input-label">(Input)</span></th>
                        </tr>
                    </thead>
                    <tbody id="attendance-table-body">
                        <!-- Data will be loaded here -->
                    </tbody>
                </table>
            </div>
            
            <div class="attendance-actions">
                <button class="btn btn-primary take-attendance-btn" id="take-attendance">
                    <i class="fas fa-user-check"></i>
                    <span>Take Attendance</span>
                </button>
                <button class="btn btn-secondary print-report-btn">
                    <i class="fas fa-print"></i>
                    <span>Print Report</span>
                </button>
                <button class="btn btn-secondary refresh-data-btn">
                    <i class="fas fa-sync-alt"></i>
                    <span>Refresh</span>
                </button>
            </div>
        </div>
    `;
    
    this.setupAttendanceEventListeners();
}

setupAttendanceEventListeners() {
    // Session type selection
    document.querySelectorAll('.session-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const session = e.currentTarget.dataset.session;
            this.handleSessionChange(session);
        });
    });
    
    // Save all button
    document.getElementById('save-all-attendance')?.addEventListener('click', () => {
        this.saveAllAttendance();
    });
    
    // Take attendance button
    document.getElementById('take-attendance')?.addEventListener('click', () => {
        this.takeAttendance();
    });
    
    // Date picker
    document.getElementById('date-picker')?.addEventListener('change', (e) => {
        this.loadAttendanceData(e.target.value);
    });
}

// CALCULATION METHODS FROM OLD APP
calculateAttendanceRates(maleAM, malePM, femaleAM, femalePM, totalStudents) {
    const amTotal = maleAM + femaleAM;
    const pmTotal = malePM + femalePM;
    const dailyTotal = amTotal + pmTotal;
    
    const amRate = totalStudents > 0 ? Math.round((amTotal / totalStudents) * 100) : 0;
    const pmRate = totalStudents > 0 ? Math.round((pmTotal / totalStudents) * 100) : 0;
    const dailyRate = totalStudents > 0 ? Math.round((dailyTotal / (totalStudents * 2)) * 100) : 0;
    
    return { amRate, pmRate, dailyRate };
}

getRateClass(rate) {
    if (rate >= 90) return 'high';
    if (rate >= 75) return 'medium';
    return 'low';
}

handleSessionChange(session) {
    // Update all inputs based on session selection
    const rows = document.querySelectorAll('.attendance-data-row');
    rows.forEach(row => {
        const maleAM = row.querySelector('.male-am');
        const malePM = row.querySelector('.male-pm');
        const femaleAM = row.querySelector('.female-am');
        const femalePM = row.querySelector('.female-pm');
        
        if (session === 'am') {
            // Copy AM to PM
            if (maleAM && malePM) malePM.value = maleAM.value;
            if (femaleAM && femalePM) femalePM.value = femaleAM.value;
        } else if (session === 'pm') {
            // Copy PM to AM
            if (maleAM && malePM) maleAM.value = malePM.value;
            if (femaleAM && femalePM) femaleAM.value = femalePM.value;
        }
        
        // Recalculate rates
        this.updateRowCalculations(row);
    });
}

class SetupModule {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        this.container = null;
        this.autoSaveTimeouts = {};
    }

    render() {
        this.container = document.getElementById('setupModule');
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="setup-page">
                <div class="setup-container">
                    <div class="setup-header">
                        <h1>Class Setup</h1>
                        <p class="setup-subtitle">Manage your classes and students</p>
                    </div>
                    
                    <div class="setup-tabs">
                        <button class="tab-btn active" data-tab="classes">
                            <i class="fas fa-chalkboard-teacher"></i> Classes
                        </button>
                        <button class="tab-btn" data-tab="students">
                            <i class="fas fa-users"></i> Students
                        </button>
                    </div>
                    
                    <!-- Classes Tab -->
                    <div class="tab-content active" id="classes-tab">
                        <div class="section-title">Add New Class</div>
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
                                    <input type="text" id="classCode" class="form-input uppercase-input" 
                                           placeholder="e.g., 1LEY, U5MASCOLL" required>
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
                            
                            <input type="hidden" id="editClassId" value="">
                            
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
                    
                    <!-- Students Tab -->
                    <div class="tab-content" id="students-tab">
                        <div class="section-title">Add New Student</div>
                        <div class="setup-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">First Name</label>
                                    <input type="text" id="firstName" class="form-input" placeholder="John">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Last Name</label>
                                    <input type="text" id="lastName" class="form-input" placeholder="Doe">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Student ID</label>
                                    <input type="text" id="studentId" class="form-input" placeholder="STU001">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Gender</label>
                                    <select id="gender" class="form-input">
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Class</label>
                                <select id="studentClass" class="form-input">
                                    <option value="">Select Class</option>
                                    <!-- Classes will be populated here -->
                                </select>
                            </div>
                            
                            <div class="actions-container">
                                <button class="action-btn save-btn" id="save-student">
                                    <i class="fas fa-save"></i> Save Student
                                </button>
                                <button class="action-btn cancel-btn" id="clear-student">
                                    <i class="fas fa-undo"></i> Clear Form
                                </button>
                            </div>
                        </div>
                        
                        <div class="section-title">Existing Students</div>
                        <div class="students-list" id="students-list">
                            <!-- Students will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.initializePage();
    }

    initializePage() {
        this.setupTabSwitching();
        this.setupClassForm();
        this.setupStudentForm();
        this.loadClassesList();
        this.loadStudentsList();
        this.populateClassDropdown();
    }

    setupTabSwitching() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                
                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show active tab content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabId}-tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    setupClassForm() {
        // Setup total calculation
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
        
        // Setup uppercase conversion for class code
        const classCodeInput = document.getElementById('classCode');
        if (classCodeInput) {
            classCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
        
        // Setup auto-save
        this.setupClassAutoSave();
        
        // Save button
        const saveBtn = document.getElementById('save-class');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveClass());
        }
        
        // Clear button
        const clearBtn = document.getElementById('clear-class');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearClassForm());
        }
    }

    setupClassAutoSave() {
        const inputIds = ['yearGroup', 'classCode', 'maleCount', 'femaleCount'];
        
        inputIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.queueAutoSave('class');
                });
                input.addEventListener('blur', () => {
                    this.autoSaveClassForm();
                });
            }
        });
    }

    queueAutoSave(type) {
        clearTimeout(this.autoSaveTimeouts?.[type]);
        
        if (!this.autoSaveTimeouts) this.autoSaveTimeouts = {};
        
        this.autoSaveTimeouts[type] = setTimeout(() => {
            if (type === 'class') {
                this.autoSaveClassForm();
            }
        }, 1500);
    }

    async autoSaveClassForm() {
        const yearGroup = document.getElementById('yearGroup')?.value;
        const classCode = document.getElementById('classCode')?.value?.trim();
        const maleCount = parseInt(document.getElementById('maleCount')?.value) || 0;
        const femaleCount = parseInt(document.getElementById('femaleCount')?.value) || 0;
        
        if (!yearGroup || !classCode) return;
        
        const classData = {
            id: `draft_class_${Date.now()}`,
            yearGroup: yearGroup,
            code: classCode,
            males: maleCount,
            females: femaleCount,
            total: maleCount + femaleCount,
            name: `${yearGroup} - ${classCode}`,
            isDraft: true,
            lastAutoSave: new Date().toISOString()
        };
        
        // Save draft to localStorage
        const drafts = Storage.get('classDrafts') || [];
        const existingIndex = drafts.findIndex(d => 
            d.yearGroup === yearGroup && d.code === classCode
        );
        
        if (existingIndex >= 0) {
            drafts[existingIndex] = classData;
        } else {
            drafts.push(classData);
        }
        
        Storage.set('classDrafts', drafts);
        
        this.showAutoSaveStatus('class', 'Draft autosaved');
    }

    showAutoSaveStatus(context, message) {
        console.log(`${context}: ${message}`);
        // You can add UI notification here
    }

    async saveClass() {
        const yearGroup = document.getElementById('yearGroup')?.value;
        const classCode = document.getElementById('classCode')?.value?.trim();
        const maleCount = parseInt(document.getElementById('maleCount')?.value) || 0;
        const femaleCount = parseInt(document.getElementById('femaleCount')?.value) || 0;
        const editClassId = document.getElementById('editClassId')?.value;
        
        if (!yearGroup || !classCode) {
            this.showError('Please fill in Year Group and Class Code');
            return;
        }
        
        const classes = Storage.get('classes') || [];
        
        // Check for duplicate class code (but allow editing)
        if (!editClassId && classes.some(c => c.code === classCode)) {
            this.showError('Class code already exists');
            return;
        }
        
        const totalStudents = maleCount + femaleCount;
        
        const classData = {
            id: editClassId || `class_${Date.now()}`,
            yearGroup: yearGroup,
            code: classCode,
            males: maleCount,
            females: femaleCount,
            total: totalStudents,
            name: `${yearGroup} - ${classCode}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (editClassId) {
            // Update existing class
            const index = classes.findIndex(c => c.id === editClassId);
            if (index !== -1) {
                classes[index] = classData;
            }
        } else {
            // Add new class
            classes.push(classData);
        }
        
        // Save to localStorage
        Storage.set('classes', classes);
        
        // Try to save to Firebase
        if (this.firebaseService.isAvailable) {
            try {
                await this.firebaseService.saveClass(classData);
                this.showSuccess('Class saved to cloud!');
            } catch (error) {
                console.error('Firebase save error:', error);
                this.showSuccess('Class saved locally (cloud sync failed)');
            }
        } else {
            this.showSuccess('Class saved locally');
        }
        
        // Clear drafts for this class
        const drafts = Storage.get('classDrafts') || [];
        const filteredDrafts = drafts.filter(d => 
            !(d.yearGroup === yearGroup && d.code === classCode)
        );
        Storage.set('classDrafts', filteredDrafts);
        
        this.clearClassForm();
        this.loadClassesList();
        this.populateClassDropdown();
    }

    clearClassForm() {
        const yearGroup = document.getElementById('yearGroup');
        const classCode = document.getElementById('classCode');
        const maleCount = document.getElementById('maleCount');
        const femaleCount = document.getElementById('femaleCount');
        const totalDisplay = document.getElementById('totalStudents');
        const editClassId = document.getElementById('editClassId');
        
        if (yearGroup) yearGroup.value = '';
        if (classCode) classCode.value = '';
        if (maleCount) maleCount.value = '0';
        if (femaleCount) femaleCount.value = '0';
        if (totalDisplay) totalDisplay.textContent = '0';
        if (editClassId) editClassId.value = '';
        
        // Reset button text
        const saveBtn = document.getElementById('save-class');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Class';
        }
    }

    async loadClassesList() {
        const container = document.getElementById('classes-list');
        if (!container) return;
        
        let classes = [];
        
        if (this.firebaseService.isAvailable) {
            classes = await this.firebaseService.getClasses();
        } else {
            classes = Storage.get('classes') || [];
        }
        
        if (classes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="empty-text">No classes added yet</div>
                </div>
            `;
            return;
        }
        
        let html = '';
        classes.forEach(cls => {
            html += `
                <div class="class-card">
                    <div class="class-header">
                        <div class="class-title">${cls.yearGroup || ''} - ${cls.code}</div>
                        <div class="class-stats">
                            <span class="stat">M: ${cls.males || 0}</span>
                            <span class="stat">F: ${cls.females || 0}</span>
                            <span class="stat">Total: ${cls.total || 0}</span>
                        </div>
                    </div>
                    <div class="class-actions">
                        <button class="btn btn-sm btn-edit" onclick="app.modules.setup.editClass('${cls.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-delete" onclick="app.modules.setup.deleteClass('${cls.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    editClass(classId) {
        const classes = Storage.get('classes') || [];
        const cls = classes.find(c => c.id === classId);
        
        if (cls) {
            document.getElementById('yearGroup').value = cls.yearGroup || '';
            document.getElementById('classCode').value = cls.code || '';
            document.getElementById('maleCount').value = cls.males || 0;
            document.getElementById('femaleCount').value = cls.females || 0;
            document.getElementById('editClassId').value = cls.id;
            
            // Update total display
            const total = (parseInt(cls.males) || 0) + (parseInt(cls.females) || 0);
            document.getElementById('totalStudents').textContent = total;
            
            // Update button text
            const saveBtn = document.getElementById('save-class');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Class';
            }
        }
    }

    async deleteClass(classId) {
        if (!confirm('Delete this class?')) return;
        
        let classes = Storage.get('classes') || [];
        classes = classes.filter(c => c.id !== classId);
        Storage.set('classes', classes);
        
        // Also delete from Firebase if available
        if (this.firebaseService.isAvailable) {
            await this.firebaseService.deleteClass(classId);
        }
        
        this.showSuccess('Class deleted');
        this.loadClassesList();
        this.populateClassDropdown();
    }

    setupStudentForm() {
        // Save student button
        const saveBtn = document.getElementById('save-student');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveStudent());
        }
        
        // Clear student button
        const clearBtn = document.getElementById('clear-student');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearStudentForm());
        }
    }

    async saveStudent() {
        const firstName = document.getElementById('firstName')?.value;
        const lastName = document.getElementById('lastName')?.value;
        
        if (!firstName || !lastName) {
            this.showError('Please fill in first and last name');
            return;
        }
        
        const students = Storage.get('students') || [];
        
        const newStudent = {
            id: `student_${Date.now()}`,
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`,
            studentId: document.getElementById('studentId')?.value || `STU${Date.now().toString().slice(-6)}`,
            gender: document.getElementById('gender')?.value || null,
            classId: document.getElementById('studentClass')?.value || null,
            createdAt: new Date().toISOString(),
            enrollmentDate: new Date().toISOString()
        };
        
        students.push(newStudent);
        Storage.set('students', students);
        
        this.showSuccess('Student saved successfully!');
        this.clearStudentForm();
        this.loadStudentsList();
    }

    clearStudentForm() {
        ['firstName', 'lastName', 'studentId'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
        const genderSelect = document.getElementById('gender');
        const classSelect = document.getElementById('studentClass');
        if (genderSelect) genderSelect.value = '';
        if (classSelect) classSelect.value = '';
    }

    async loadStudentsList() {
        const container = document.getElementById('students-list');
        if (!container) return;
        
        const students = Storage.get('students') || [];
        
        if (students.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="empty-text">No students added yet</div>
                </div>
            `;
            return;
        }
        
        const classes = Storage.get('classes') || [];
        
        let html = '';
        students.forEach(student => {
            const studentClass = classes.find(c => c.id === student.classId);
            const className = studentClass ? studentClass.code : 'Unassigned';
            
            html += `
                <div class="student-card">
                    <div class="student-info">
                        <div class="student-name">${student.fullName}</div>
                        <div class="student-details">
                            <span class="detail">ID: ${student.studentId}</span>
                            <span class="detail">Gender: ${student.gender || 'Not set'}</span>
                            <span class="detail">Class: ${className}</span>
                        </div>
                    </div>
                    <div class="student-actions">
                        <button class="btn btn-sm btn-delete" onclick="app.modules.setup.deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    populateClassDropdown() {
        const dropdown = document.getElementById('studentClass');
        if (!dropdown) return;
        
        const classes = Storage.get('classes') || [];
        
        dropdown.innerHTML = '<option value="">Select Class</option>';
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.code} (${cls.yearGroup || 'No Year'})`;
            dropdown.appendChild(option);
        });
    }

    deleteStudent(studentId) {
        if (!confirm('Delete this student?')) return;
        
        const students = Storage.get('students') || [];
        const updatedStudents = students.filter(s => s.id !== studentId);
        Storage.set('students', updatedStudents);
        
        this.showSuccess('Student deleted');
        this.loadStudentsList();
    }

    showSuccess(message) {
        console.log('Success:', message);
        if (window.app && window.app.showToast) {
            window.app.showToast(message, 'success');
        }
    }

    showError(message) {
        console.error('Error:', message);
        if (window.app && window.app.showToast) {
            window.app.showToast(message, 'error');
        }
    }
}

// ==================== SETUP PAGE ENHANCEMENTS ====================
renderSetupPage() {
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
                        <button class="tab-btn" data-tab="students">
                            <i class="fas fa-users"></i> Students
                        </button>
                        <button class="tab-btn" data-tab="import">
                            <i class="fas fa-file-import"></i> Import
                        </button>
                        <button class="tab-btn" data-tab="system">
                            <i class="fas fa-cog"></i> System Settings
                        </button>
                        <button class="tab-btn" data-tab="data">
                            <i class="fas fa-database"></i> Data Management
                        </button>
                    </div>
                    
                    <!-- Classes Tab -->
                    <div class="tab-content active" id="classes-tab">
                        ${this.renderClassesTab()}
                    </div>
                    
                    <!-- Students Tab -->
                    <div class="tab-content" id="students-tab">
                        ${this.renderStudentsTab()}
                    </div>
                    
                    <!-- Import Tab -->
                    <div class="tab-content" id="import-tab">
                        ${this.renderImportTab()}
                    </div>
                    
                    <!-- System Settings Tab -->
                    <div class="tab-content" id="system-tab">
                        ${this.renderSystemSettingsTab()}
                    </div>
                    
                    <!-- Data Management Tab -->
                    <div class="tab-content" id="data-tab">
                        ${this.renderDataManagementTab()}
                    </div>
                </section>
            </div>
        </div>
    `;
}

renderClassesTab() {
    return `
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
                    <input type="text" id="classCode" class="form-input uppercase-input" 
                           placeholder="e.g., 1LEY, U5MASCOLL, 10RAN" required>
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
            
            <input type="hidden" id="editClassId" value="">
            
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
            ${this.renderClassesList()}
        </div>
    `;
}

// AUTO-SAVE LOGIC FROM OLD APP
setupAutoSave() {
    this.autoSaveTimeouts = {};
    
    // Class form auto-save
    const classInputs = ['yearGroup', 'classCode', 'maleCount', 'femaleCount'];
    classInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                this.queueAutoSave('class');
                if (id === 'maleCount' || id === 'femaleCount') {
                    this.updateTotalDisplay();
                }
            });
        }
    });
    
    // Setup total calculation
    this.setupTotalCalculation();
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

updateTotalDisplay() {
    const maleInput = document.getElementById('maleCount');
    const femaleInput = document.getElementById('femaleCount');
    const totalDisplay = document.getElementById('totalStudents');
    
    if (maleInput && femaleInput && totalDisplay) {
        const males = parseInt(maleInput.value) || 0;
        const females = parseInt(femaleInput.value) || 0;
        totalDisplay.textContent = males + females;
    }
}

queueAutoSave(type) {
    clearTimeout(this.autoSaveTimeouts?.[type]);
    
    if (!this.autoSaveTimeouts) this.autoSaveTimeouts = {};
    
    this.autoSaveTimeouts[type] = setTimeout(() => {
        if (type === 'class') {
            this.autoSaveClassForm();
        }
    }, 1500); // 1.5 second delay
}

async autoSaveClassForm() {
    const yearGroup = document.getElementById('yearGroup')?.value;
    const classCode = document.getElementById('classCode')?.value?.trim();
    const maleCount = parseInt(document.getElementById('maleCount')?.value) || 0;
    const femaleCount = parseInt(document.getElementById('femaleCount')?.value) || 0;
    
    if (!yearGroup || !classCode) return;
    
    const classData = {
        id: `draft_class_${Date.now()}`,
        yearGroup: yearGroup,
        code: classCode,
        males: maleCount,
        females: femaleCount,
        total: maleCount + femaleCount,
        name: `${yearGroup} - ${classCode}`,
        isDraft: true,
        lastAutoSave: new Date().toISOString()
    };
    
    // Save draft to localStorage
    const drafts = Storage.get('classDrafts') || [];
    const existingIndex = drafts.findIndex(d => 
        d.yearGroup === yearGroup && d.code === classCode
    );
    
    if (existingIndex >= 0) {
        drafts[existingIndex] = classData;
    } else {
        drafts.push(classData);
    }
    
    Storage.set('classDrafts', drafts);
    
    // Show auto-save status
    this.showAutoSaveStatus('class', 'Draft autosaved');
}

class ReportsModule {
    constructor(firebaseService, attendanceSystem) {
        this.firebaseService = firebaseService;
        this.attendanceSystem = attendanceSystem;
        this.container = null;
    }

    render() {
        this.container = document.getElementById('reportsModule');
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="reports-page">
                <div class="reports-container">
                    <div class="reports-header">
                        <h1>Attendance Reports</h1>
                        <p class="reports-subtitle">Generate detailed attendance reports and analytics</p>
                    </div>
                    
                    <section class="reports-section">
                        <div class="section-title">Report Configuration</div>
                        
                        <div class="filter-section">
                            <div class="filter-row">
                                <div class="filter-group">
                                    <label class="filter-label">Report Type:</label>
                                    <select id="report-type" class="reports-select">
                                        <option value="daily">Daily Report</option>
                                        <option value="weekly">Weekly Report</option>
                                        <option value="monthly">Monthly Report</option>
                                        <option value="term">Term Report</option>
                                        <option value="comparison">Class Comparison</option>
                                    </select>
                                </div>
                                
                                <div class="filter-group">
                                    <label class="filter-label">Date Range:</label>
                                    <div class="date-range">
                                        <input type="date" id="start-date" class="date-input" value="${this.getFirstDayOfMonth()}">
                                        <span>to</span>
                                        <input type="date" id="end-date" class="date-input" value="${this.getTodayDate()}">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="filter-row">
                                <div class="filter-group">
                                    <label class="filter-label">Class:</label>
                                    <select id="report-class" class="reports-select">
                                        <option value="all">All Classes</option>
                                        <!-- Classes will be populated -->
                                    </select>
                                </div>
                                
                                <div class="filter-group">
                                    <label class="filter-label">Format:</label>
                                    <select id="report-format" class="reports-select">
                                        <option value="summary">Summary</option>
                                        <option value="detailed">Detailed</option>
                                        <option value="analytics">Analytics</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="section-title">Report Actions</div>
                        
                        <div class="controls-section">
                            <button class="control-btn primary-btn" id="generate-report">
                                <i class="fas fa-chart-bar"></i> Generate Report
                            </button>
                            <button class="control-btn secondary-btn" id="export-pdf">
                                <i class="fas fa-file-pdf"></i> Export PDF
                            </button>
                            <button class="control-btn secondary-btn" id="export-excel">
                                <i class="fas fa-file-excel"></i> Export Excel
                            </button>
                            <button class="control-btn secondary-btn" id="print-report">
                                <i class="fas fa-print"></i> Print
                            </button>
                        </div>
                        
                        <div class="section-title">Report Output</div>
                        
                        <div class="report-output" id="report-output">
                            <div class="output-header">
                                <span id="report-title">Attendance Report</span>
                                <span id="report-time">Select filters and generate report</span>
                            </div>
                            
                            <div class="output-content">
                                <div class="loading" id="report-loading" style="display: none;">
                                    <div class="spinner"></div>
                                    <div>Generating report...</div>
                                </div>
                                
                                <div id="report-content">
                                    <div class="no-report">
                                        <i class="fas fa-chart-bar"></i>
                                        <h3>No Report Generated</h3>
                                        <p>Configure your report filters and click "Generate Report" to view data.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.populateClassDropdown();
    }

    setupEventListeners() {
        // Generate report button
        document.getElementById('generate-report')?.addEventListener('click', () => {
            this.generateReport();
        });
        
        // Export buttons
        document.getElementById('export-pdf')?.addEventListener('click', () => {
            this.exportReport('pdf');
        });
        
        document.getElementById('export-excel')?.addEventListener('click', () => {
            this.exportReport('excel');
        });
        
        document.getElementById('print-report')?.addEventListener('click', () => {
            window.print();
        });
    }

    async populateClassDropdown() {
        const dropdown = document.getElementById('report-class');
        if (!dropdown) return;
        
        let classes = [];
        
        if (this.firebaseService.isAvailable) {
            classes = await this.firebaseService.getClasses();
        } else {
            classes = Storage.get('classes') || [];
        }
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.code} (${cls.yearGroup || ''})`;
            dropdown.appendChild(option);
        });
    }

    async generateReport() {
        const reportType = document.getElementById('report-type').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const classId = document.getElementById('report-class').value;
        const format = document.getElementById('report-format').value;
        
        // Show loading
        const loading = document.getElementById('report-loading');
        const reportContent = document.getElementById('report-content');
        
        if (loading) loading.style.display = 'flex';
        if (reportContent) reportContent.innerHTML = '';
        
        try {
            // Get data
            let attendance = [], classes = [];
            
            if (this.firebaseService.isAvailable) {
                attendance = await this.firebaseService.getAttendance();
                classes = await this.firebaseService.getClasses();
            } else {
                attendance = Storage.get('attendance') || [];
                classes = Storage.get('classes') || [];
            }
            
            // Filter attendance based on criteria
            const filteredAttendance = attendance.filter(a => {
                const dateMatch = (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate);
                const classMatch = classId === 'all' || a.classId === classId;
                return dateMatch && classMatch;
            });
            
            // Generate report content
            const reportHTML = this.generateReportContent(filteredAttendance, classes, {
                type: reportType,
                startDate,
                endDate,
                classId,
                format
            });
            
            // Update UI
            if (loading) loading.style.display = 'none';
            if (reportContent) reportContent.innerHTML = reportHTML;
            
            // Update title
            const reportTitle = document.getElementById('report-title');
            if (reportTitle) {
                const className = classId === 'all' ? 'All Classes' : 
                    classes.find(c => c.id === classId)?.code || 'Selected Class';
                reportTitle.textContent = `${reportType.toUpperCase()} Report - ${className}`;
            }
            
            // Update time
            const reportTime = document.getElementById('report-time');
            if (reportTime) {
                reportTime.textContent = `Generated: ${new Date().toLocaleTimeString()}`;
            }
            
            this.showSuccess('Report generated successfully!');
            
        } catch (error) {
            console.error('Error generating report:', error);
            this.showError('Failed to generate report');
            if (loading) loading.style.display = 'none';
        }
    }

    generateReportContent(attendance, classes, options) {
        if (attendance.length === 0) {
            return `
                <div class="no-data-report">
                    <i class="fas fa-chart-bar"></i>
                    <h3>No Data Available</h3>
                    <p>No attendance records found for the selected criteria.</p>
                </div>
            `;
        }
        
        if (options.type === 'comparison') {
            return this.generateComparisonReport(attendance, classes, options);
        }
        
        // Default summary report
        return this.generateSummaryReport(attendance, classes, options);
    }

    generateSummaryReport(attendance, classes, options) {
        // Group by class
        const attendanceByClass = {};
        attendance.forEach(record => {
            if (!attendanceByClass[record.classId]) {
                attendanceByClass[record.classId] = [];
            }
            attendanceByClass[record.classId].push(record);
        });
        
        let html = `
            <div class="report-summary">
                <h3>Report Summary</h3>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Records:</span>
                        <span class="stat-value">${attendance.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Date Range:</span>
                        <span class="stat-value">${options.startDate} to ${options.endDate}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Classes Covered:</span>
                        <span class="stat-value">${Object.keys(attendanceByClass).length}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add class-wise details
        Object.entries(attendanceByClass).forEach(([classId, classAttendance]) => {
            const cls = classes.find(c => c.id === classId);
            if (!cls) return;
            
            // Calculate averages
            let totalPresent = 0, totalPossible = 0;
            classAttendance.forEach(record => {
                const present = record.totalPresent || (record.malePresentAM || 0) + (record.malePresentPM || 0) + 
                               (record.femalePresentAM || 0) + (record.femalePresentPM || 0);
                const total = record.totalStudents || cls.total || 0;
                totalPresent += present;
                totalPossible += total;
            });
            
            const averageRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
            
            html += `
                <div class="class-report">
                    <h4>${cls.code} (${cls.yearGroup || ''})</h4>
                    <div class="class-stats">
                        <div class="stat-card">
                            <div class="stat-icon">📊</div>
                            <div class="stat-info">
                                <span class="stat-value">${classAttendance.length}</span>
                                <span class="stat-label">Days</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">👥</div>
                            <div class="stat-info">
                                <span class="stat-value">${cls.total || 0}</span>
                                <span class="stat-label">Students</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">✅</div>
                            <div class="stat-info">
                                <span class="stat-value">${averageRate}%</span>
                                <span class="stat-label">Average</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    generateComparisonReport(attendance, classes, options) {
        // Group attendance by class
        const attendanceByClass = {};
        attendance.forEach(record => {
            if (!attendanceByClass[record.classId]) {
                attendanceByClass[record.classId] = [];
            }
            attendanceByClass[record.classId].push(record);
        });
        
        // Calculate statistics for each class
        const classStats = [];
        
        Object.entries(attendanceByClass).forEach(([classId, classAttendance]) => {
            const cls = classes.find(c => c.id === classId);
            if (!cls) return;
            
            let totalPresent = 0, totalPossible = 0;
            classAttendance.forEach(record => {
                const present = record.totalPresent || (record.malePresentAM || 0) + (record.malePresentPM || 0) + 
                               (record.femalePresentAM || 0) + (record.femalePresentPM || 0);
                const total = record.totalStudents || cls.total || 0;
                totalPresent += present;
                totalPossible += total;
            });
            
            const averageRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
            
            classStats.push({
                classId,
                className: cls.code,
                yearGroup: cls.yearGroup,
                totalStudents: cls.total || 0,
                totalDays: classAttendance.length,
                averageRate,
                rank: 0
            });
        });
        
        // Sort by average rate
        classStats.sort((a, b) => b.averageRate - a.averageRate);
        classStats.forEach((stat, index) => {
            stat.rank = index + 1;
        });
        
        // Generate comparison table
        let html = `
            <div class="comparison-report">
                <h3>Class Comparison Report</h3>
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Class</th>
                            <th>Year Group</th>
                            <th>Students</th>
                            <th>Days</th>
                            <th>Average Rate</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        classStats.forEach(stat => {
            html += `
                <tr class="rank-${stat.rank}">
                    <td>${stat.rank}</td>
                    <td><strong>${stat.className}</strong></td>
                    <td>${stat.yearGroup || ''}</td>
                    <td>${stat.totalStudents}</td>
                    <td>${stat.totalDays}</td>
                    <td class="rate ${this.getRateClass(stat.averageRate)}">${stat.averageRate}%</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        return html;
    }

    getRateClass(rate) {
        if (rate >= 90) return 'high';
        if (rate >= 80) return 'medium-high';
        if (rate >= 70) return 'medium';
        if (rate >= 60) return 'medium-low';
        return 'low';
    }

    exportReport(format) {
        this.showInfo(`${format.toUpperCase()} export feature coming soon`);
    }

    getFirstDayOfMonth() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    }

    getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    showSuccess(message) {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, 'success');
        }
    }

    showError(message) {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, 'error');
        }
    }

    showInfo(message) {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, 'info');
        }
    }
}

// COMPARISON REPORT CALCULATIONS FROM OLD APP
generateComparisonReport(attendance, classes, students, options) {
    // Group attendance by class
    const attendanceByClass = {};
    attendance.forEach(record => {
        if (!attendanceByClass[record.classId]) {
            attendanceByClass[record.classId] = [];
        }
        attendanceByClass[record.classId].push(record);
    });
    
    // Calculate statistics for each class
    const classStats = [];
    
    Object.entries(attendanceByClass).forEach(([classId, classAttendance]) => {
        const cls = classes.find(c => c.id === classId);
        if (!cls) return;
        
        // Get students in this class
        const classStudents = students.filter(s => s.classId === classId);
        const totalMale = classStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
        const totalFemale = classStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
        const totalStudents = classStudents.length;
        
        // Calculate averages from attendance records
        let totalMaleAM = 0, totalMalePM = 0, totalFemaleAM = 0, totalFemalePM = 0;
        let totalDays = 0;
        
        classAttendance.forEach(record => {
            totalMaleAM += record.malePresentAM || 0;
            totalMalePM += record.malePresentPM || 0;
            totalFemaleAM += record.femalePresentAM || 0;
            totalFemalePM += record.femalePresentPM || 0;
            totalDays++;
        });
        
        // Calculate averages
        const avgMaleAM = totalDays > 0 ? Math.round((totalMaleAM / totalDays) / totalMale * 100) : 0;
        const avgMalePM = totalDays > 0 ? Math.round((totalMalePM / totalDays) / totalMale * 100) : 0;
        const avgFemaleAM = totalDays > 0 ? Math.round((totalFemaleAM / totalDays) / totalFemale * 100) : 0;
        const avgFemalePM = totalDays > 0 ? Math.round((totalFemalePM / totalDays) / totalFemale * 100) : 0;
        
        // Overall average
        const overallAvg = Math.round((avgMaleAM + avgMalePM + avgFemaleAM + avgFemalePM) / 4);
        
        // Calculate consistency
        const dailyRates = classAttendance.map(record => {
            const maleRate = totalMale > 0 ? 
                Math.round(((record.malePresentAM || 0) + (record.malePresentPM || 0)) / (totalMale * 2) * 100) : 0;
            const femaleRate = totalFemale > 0 ? 
                Math.round(((record.femalePresentAM || 0) + (record.femalePresentPM || 0)) / (totalFemale * 2) * 100) : 0;
            return Math.round((maleRate + femaleRate) / 2);
        });
        
        const avgRate = dailyRates.length > 0 ? 
            Math.round(dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length) : 0;
            
        const consistency = dailyRates.length > 1 ? 
            100 - Math.round(Math.sqrt(
                dailyRates.reduce((sum, rate) => sum + Math.pow(rate - avgRate, 2), 0) / dailyRates.length
            )) : 100;
        
        classStats.push({
            classId,
            className: cls.name,
            classCode: cls.code,
            yearGroup: cls.yearGroup,
            totalStudents,
            avgMaleAM,
            avgMalePM,
            avgFemaleAM,
            avgFemalePM,
            overallAvg,
            consistency,
            totalDays,
            rank: 0
        });
    });
    
    // Calculate ranks
    classStats.sort((a, b) => b.overallAvg - a.overallAvg);
    classStats.forEach((stat, index) => {
        stat.rank = index + 1;
        stat.percentile = Math.round((index / classStats.length) * 100);
    });
    
    return this.renderComparisonReport(classStats, options);
}

getRateClass(rate) {
    if (rate >= 90) return 'excellent';
    if (rate >= 80) return 'good';
    if (rate >= 70) return 'average';
    return 'poor';
}

getConsistencyClass(consistency) {
    if (consistency >= 90) return 'high';
    if (consistency >= 80) return 'medium';
    return 'low';
}

class SettingsModule {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        this.container = null;
    }

    render() {
        this.container = document.getElementById('settingsModule');
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="settings-page">
                <div class="settings-container">
                    <div class="settings-header">
                        <h1>Settings</h1>
                        <p class="settings-subtitle">Configure your attendance system</p>
                    </div>
                    
                    <div class="settings-content">
                        <div class="settings-section">
                            <h3><i class="fas fa-cog"></i> General Settings</h3>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label class="form-label">School Name</label>
                                    <input type="text" id="schoolName" class="form-input" placeholder="Enter school name">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Default Session Type</label>
                                    <select id="defaultSession" class="form-input">
                                        <option value="both">Both Sessions</option>
                                        <option value="am">AM Only</option>
                                        <option value="pm">PM Only</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Auto-save Interval</label>
                                    <select id="autoSaveInterval" class="form-input">
                                        <option value="30000">30 seconds</option>
                                        <option value="60000">1 minute</option>
                                        <option value="120000">2 minutes</option>
                                        <option value="300000">5 minutes</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h3><i class="fas fa-database"></i> Data Management</h3>
                            <div class="settings-form">
                                <div class="form-group">
                                    <button class="btn btn-primary" id="backup-data">
                                        <i class="fas fa-download"></i> Backup Data
                                    </button>
                                    <p class="form-hint">Export all your data to a JSON file</p>
                                </div>
                                
                                <div class="form-group">
                                    <button class="btn btn-secondary" id="restore-data">
                                        <i class="fas fa-upload"></i> Restore Data
                                    </button>
                                    <p class="form-hint">Import data from a previous backup</p>
                                </div>
                                
                                <div class="form-group">
                                    <button class="btn btn-danger" id="clear-data">
                                        <i class="fas fa-trash"></i> Clear All Data
                                    </button>
                                    <p class="form-hint warning">Warning: This will delete all data</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h3><i class="fas fa-info-circle"></i> About</h3>
                            <div class="about-info">
                                <p><strong>Smart Attendance System</strong></p>
                                <p>Version: 2.0.0</p>
                                <p>© ${new Date().getFullYear()} Attendance Tracker</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
        // Backup button
        document.getElementById('backup-data')?.addEventListener('click', () => {
            this.backupData();
        });
        
        // Restore button
        document.getElementById('restore-data')?.addEventListener('click', () => {
            this.restoreData();
        });
        
        // Clear data button
        document.getElementById('clear-data')?.addEventListener('click', () => {
            this.clearData();
        });
        
        // Save settings on change
        document.getElementById('schoolName')?.addEventListener('change', () => {
            this.saveSettings();
        });
        
        document.getElementById('defaultSession')?.addEventListener('change', () => {
            this.saveSettings();
        });
        
        document.getElementById('autoSaveInterval')?.addEventListener('change', () => {
            this.saveSettings();
        });
    }

    loadSettings() {
        const settings = Storage.get('app_settings') || {};
        
        document.getElementById('schoolName').value = settings.schoolName || '';
        document.getElementById('defaultSession').value = settings.defaultSession || 'both';
        document.getElementById('autoSaveInterval').value = settings.autoSaveInterval || '30000';
    }

    saveSettings() {
        const settings = {
            schoolName: document.getElementById('schoolName').value,
            defaultSession: document.getElementById('defaultSession').value,
            autoSaveInterval: document.getElementById('autoSaveInterval').value,
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('app_settings', settings);
        
        if (window.app && window.app.showToast) {
            window.app.showToast('Settings saved', 'success');
        }
    }

    backupData() {
        try {
            const backup = {
                version: '2.0',
                timestamp: new Date().toISOString(),
                data: {
                    classes: Storage.get('classes') || [],
                    students: Storage.get('students') || [],
                    attendance: Storage.get('attendance') || [],
                    settings: Storage.get('app_settings') || {}
                }
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            if (window.app && window.app.showToast) {
                window.app.showToast('Backup downloaded successfully!', 'success');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            if (window.app && window.app.showToast) {
                window.app.showToast('Error creating backup', 'error');
            }
        }
    }

    restoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    
                    if (!backup.data) {
                        throw new Error('Invalid backup file format');
                    }
                    
                    if (confirm('Restoring backup will overwrite all current data. Continue?')) {
                        Storage.set('classes', backup.data.classes || []);
                        Storage.set('students', backup.data.students || []);
                        Storage.set('attendance', backup.data.attendance || []);
                        Storage.set('app_settings', backup.data.settings || {});
                        
                        if (window.app && window.app.showToast) {
                            window.app.showToast('Data restored successfully!', 'success');
                        }
                        
                        // Reload settings
                        this.loadSettings();
                    }
                } catch (error) {
                    console.error('Error restoring backup:', error);
                    if (window.app && window.app.showToast) {
                        window.app.showToast('Error restoring backup', 'error');
                    }
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearData() {
        if (confirm('WARNING: This will delete ALL data including classes, students, and attendance records. This action cannot be undone. Continue?')) {
            if (confirm('Are you absolutely sure? Type "DELETE" to confirm.')) {
                const confirmation = prompt('Type DELETE to confirm:');
                if (confirmation === 'DELETE') {
                    // Clear all data except current user
                    Storage.remove('classes');
                    Storage.remove('students');
                    Storage.remove('attendance');
                    Storage.remove('app_settings');
                    
                    if (window.app && window.app.showToast) {
                        window.app.showToast('All data has been cleared', 'info');
                    }
                }
            }
        }
    }
}

// ==================== NAVIGATION MANAGER ====================
class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.user = null;
        this.init();
    }

    init() {
        console.log('🚀 NavigationManager initializing for page:', this.currentPage);
        
        // First, render the entire page structure
        this.renderPageLayout();
        
        // Then setup event listeners
        this.setupEventListeners();
        
        // Highlight current page
        this.updateActiveNav();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        let page = path.split('/').pop() || 'dashboard.html';
        page = page.replace('.html', '').split('?')[0];
        
        // Default to dashboard if empty
        if (page === '' || page === 'index') {
            return 'dashboard';
        }
        
        return page;
    }

    renderPageLayout() {
        const appRoot = document.getElementById('app-root');
        if (!appRoot) {
            console.error('❌ app-root element not found!');
            return;
        }
        
        // Render the complete page structure
        appRoot.innerHTML = `
            <div class="app-wrapper">
                <!-- Sidebar Navigation -->
                <aside class="app-sidebar" id="sidebar">
                    ${this.renderSidebar()}
                </aside>
                
                <!-- Main Content Area -->
                <main class="app-main">
                    <!-- Top Header -->
                    <header class="app-header">
                        ${this.renderHeader()}
                    </header>
                    
                    <!-- Page Content Container -->
                    <div class="page-content" id="page-content">
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <p>Loading ${this.currentPage}...</p>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <footer class="app-footer">
                        <p>&copy; ${new Date().getFullYear()} Smart Attendance System</p>
                    </footer>
                </main>
            </div>
        `;
        
        // Now load the specific page content
        this.loadPageContent();
    }

    renderSidebar() {
        return `
            <div class="sidebar-header">
                <h2>📊 Smart Attendance</h2>
                <p class="subtitle">Manage attendance effortlessly</p>
            </div>
            
            <nav class="sidebar-nav">
                <ul class="nav-menu">
                    <li>
                        <a href="#" data-page="dashboard" class="nav-link ${this.currentPage === 'dashboard' ? 'active' : ''}">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>Dashboard</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" data-page="attendance" class="nav-link ${this.currentPage === 'attendance' ? 'active' : ''}">
                            <i class="fas fa-clipboard-check"></i>
                            <span>Take Attendance</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" data-page="setup" class="nav-link ${this.currentPage === 'setup' ? 'active' : ''}">
                            <i class="fas fa-cogs"></i>
                            <span>Class Setup</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" data-page="reports" class="nav-link ${this.currentPage === 'reports' ? 'active' : ''}">
                            <i class="fas fa-chart-bar"></i>
                            <span>Reports</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" data-page="settings" class="nav-link ${this.currentPage === 'settings' ? 'active' : ''}">
                            <i class="fas fa-sliders-h"></i>
                            <span>Settings</span>
                        </a>
                    </li>
                </ul>
            </nav>
            
            <div class="sidebar-footer">
                <div class="user-status" id="navUserStatus">
                    <div class="status-content">
                        <i class="fas fa-user"></i>
                        <span>Loading user...</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderHeader() {
        return `
            <div class="header-left">
                <button class="sidebar-toggle" id="sidebarToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <h1 class="page-title">${this.getPageTitle()}</h1>
            </div>
            
            <div class="header-right">
                <div class="online-status" id="onlineStatus">
                    <span class="status-dot"></span>
                    <span class="status-text">Online</span>
                </div>
                <button class="btn-logout" id="logoutBtn" title="Logout">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;
    }

    getPageTitle() {
        const titles = {
            'dashboard': 'Dashboard',
            'attendance': 'Take Attendance',
            'setup': 'Class Setup',
            'reports': 'Reports',
            'settings': 'Settings'
        };
        return titles[this.currentPage] || 'Smart Attendance';
    }

    async loadPageContent() {
        const contentContainer = document.getElementById('page-content');
        if (!contentContainer) return;
        
        console.log(`📄 Loading content for: ${this.currentPage}`);
        
        try {
            // Create appropriate module instance
            let moduleInstance;
            
            switch(this.currentPage) {
                case 'dashboard':
                    moduleInstance = new DashboardModule(window.firebaseService, window.attendanceSystem);
                    break;
                case 'attendance':
                    moduleInstance = new AttendanceModule(window.firebaseService, window.attendanceSystem);
                    break;
                case 'setup':
                    moduleInstance = new SetupModule(window.firebaseService);
                    break;
                case 'reports':
                    moduleInstance = new ReportsModule(window.firebaseService, window.attendanceSystem);
                    break;
                case 'settings':
                    moduleInstance = new SettingsModule(window.firebaseService);
                    break;
                default:
                    contentContainer.innerHTML = '<div class="error">Page not found</div>';
                    return;
            }
            
            // Render the module content
            if (moduleInstance && typeof moduleInstance.render === 'function') {
                contentContainer.innerHTML = moduleInstance.render();
                
                // Initialize the module
                if (typeof moduleInstance.initialize === 'function') {
                    await moduleInstance.initialize();
                }
            }
            
        } catch (error) {
            console.error('Error loading page content:', error);
            contentContainer.innerHTML = `
                <div class="error">
                    <h3>Error Loading Page</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()">Reload Page</button>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Sidebar toggle for mobile
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }
        
        // Navigation links
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
        
        // Online/offline status
        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));
        this.updateOnlineStatus(navigator.onLine);
    }

    navigateTo(page) {
        if (page === this.currentPage) return; // Already on this page
        
        console.log(`🔄 Navigating to: ${page}`);
        
        // Update URL without full page reload if using SPA-style
        // OR do a full page navigation to the HTML file
        window.location.href = `${page}.html`;
    }

    updateActiveNav() {
        document.querySelectorAll('.nav-link').forEach(link => {
            const page = link.getAttribute('data-page');
            if (page === this.currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    updateOnlineStatus(isOnline) {
        const statusElement = document.getElementById('onlineStatus');
        if (!statusElement) return;
        
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        if (dot && text) {
            dot.className = 'status-dot ' + (isOnline ? 'online' : 'offline');
            text.textContent = isOnline ? 'Online' : 'Offline';
        }
    }

    async handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('attendance_user');
            window.location.href = 'index.html';
        }
    }
}

// ==================== APP CLASS (MODIFIED) ====================
class App {
    constructor() {
        this.firebaseService = new FirebaseService();
        this.attendanceSystem = new AttendanceSystem();
        this.navigationManager = null;
        
        // Initialize all modules and store them globally
        window.dashboardModule = new DashboardModule(this.firebaseService, this.attendanceSystem);
        window.attendanceModule = new AttendanceModule(this.firebaseService, this.attendanceSystem);
        window.setupModule = new SetupModule(this.firebaseService);
        window.reportsModule = new ReportsModule(this.firebaseService, this.attendanceSystem);
        window.settingsModule = new SettingsModule(this.firebaseService);
        
        // Also store locally for easy access
        this.modules = {
            dashboard: window.dashboardModule,
            attendance: window.attendanceModule,
            setup: window.setupModule,
            reports: window.reportsModule,
            settings: window.settingsModule
        };
        
        // Make navigation manager globally accessible
        window.navigationManager = this;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Smart Attendance System...');
        
        // Initialize Firebase
        await this.firebaseService.init();
        
        // Initialize Attendance System with current user
        const currentUser = JSON.parse(localStorage.getItem('attendance_user') || 'null');
        if (currentUser) {
            this.attendanceSystem.initialize(currentUser);
        }
        
        // Initialize Navigation Manager
        this.navigationManager = new NavigationManager();
        
        // Check online status
        this.checkOnlineStatus();
        
        // Initialize service worker for offline capability
        this.initServiceWorker();
        
        console.log('✅ Smart Attendance System initialized successfully');
    }

    checkOnlineStatus() {
        const updateOnlineStatus = () => {
            const isOnline = navigator.onLine;
            const statusElement = document.getElementById('onlineStatus');
            if (statusElement) {
                statusElement.textContent = isOnline ? 'Online' : 'Offline';
                statusElement.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registered:', registration);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        }
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
