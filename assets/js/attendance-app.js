// attendance-app.js - COMPLETE MODULAR VERSION WITH ALL FUNCTIONALITY
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

import { Storage, Utils } from './utils.js';

// ==================== MAIN APP ORCHESTRATOR ====================
class AttendanceApp {
    constructor() {
        console.log('🎯 AttendanceApp constructor');
        
        this.state = {
            currentUser: null,
            currentPage: this.getCurrentPage(),
            isOnline: navigator.onLine,
            settings: Storage.get('app_settings', {}),
            navLinksElement: null,
            hamburgerElement: null,
            resizeListenerInitialized: false
        };

        this.user = null;
        this.firebaseAvailable = false;
        
        // Initialize modules
        this.modules = {
            dashboard: new DashboardModule(this),
            attendance: new AttendanceModule(this),
            reports: new ReportsModule(this),
            setup: new SetupModule(this),
            settings: new SettingsModule(this)
        };
        
        // Initialize app
        this.init();
    }
    
    // ==================== CORE APP METHODS ====================
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
            const publicPages = ['index', 'login', 'setup'];
            const isPublicPage = publicPages.includes(currentPage);
            
            // Handle routing logic
            if (hasUser && isPublicPage && currentPage !== 'setup') {
                window.location.replace('dashboard.html');
                return;
            }
            
            if (!hasUser && !isPublicPage) {
                window.location.replace('index.html');
                return;
            }
            
            if (hasUser && !isPublicPage) {
                this.user = authResult.user;
                this.state.currentUser = authResult.user;
            }
            
            if (!hasUser && isPublicPage) {
                this.user = null;
                this.state.currentUser = null;
            }
            
            await this.loadPageContent();
            this.setupUIComponents();
            this.initServiceWorker();
            
            console.log('✅ AttendanceApp initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError(error.message);
        }
    }
    
    async loadPageContent() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) {
            console.error('❌ app-container not found in DOM');
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
    
    // ==================== AUTHENTICATION ====================
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
            this.redirectTo('dashboard.html');
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
            this.redirectTo('dashboard.html');
        }, 1000);
    }
    
    // ==================== UI COMPONENTS ====================
    setupUIComponents() {
        this.updateNavStatus();
        this.fixUserStatusDesign();
        this.initWindowResizeListener();
    }
    
    updateNavStatus() {
        const statusElement = document.getElementById('navUserStatus');
        if (!statusElement) {
            setTimeout(() => this.updateNavStatus(), 300);
            return;
        }
        
        let username = 'User';
        if (this.state && this.state.currentUser) {
            username = this.state.currentUser.name || this.state.currentUser.email || 'User';
        } else {
            try {
                const storedUser = localStorage.getItem('attendance_user');
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    username = user.name || user.email || 'User';
                }
            } catch(e) {
                console.error('Error parsing user:', e);
            }
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
    
    fixUserStatusDesign() {
        setTimeout(() => {
            this.setupLogoutButton();
            this.setupResponsiveHamburgerMenu();
        }, 100);
    }
    
    setupLogoutButton() {
        const logoutBtn = document.querySelector('.btn-logout');
        if (!logoutBtn) return;
        
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleLogout();
        });
    }
    
    setupResponsiveHamburgerMenu() {
        let hamburger = document.querySelector('.hamburger-menu, .navbar-toggle');
        
        if (!hamburger) {
            hamburger = this.createHamburgerButton();
        }
        
        this.setupHamburgerButton(hamburger);
        this.setupNavbarToggling();
        setTimeout(() => this.checkResponsiveView(), 100);
    }
    
    createHamburgerButton() {
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger-menu navbar-toggle';
        hamburger.setAttribute('aria-label', 'Toggle navigation menu');
        hamburger.innerHTML = '☰';
        
        const userStatus = document.querySelector('#navUserStatus, .user-status');
        if (userStatus) {
            userStatus.appendChild(hamburger);
        } else {
            document.body.appendChild(hamburger);
        }
        
        return hamburger;
    }
    
    setupHamburgerButton(element) {
        Object.assign(element.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(26, 35, 126, 0.1)',
            border: '1px solid rgba(26, 35, 126, 0.2)',
            color: '#1a237e',
            cursor: 'pointer',
            fontSize: '20px',
            margin: '0',
            padding: '0',
            flexShrink: '0',
            position: 'relative',
            zIndex: '100',
            transition: 'all 0.3s ease'
        });
        
        element.addEventListener('mouseenter', () => {
            element.style.background = 'rgba(26, 35, 126, 0.2)';
            element.style.color = '#3498db';
            element.style.transform = 'scale(1.1)';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.background = 'rgba(26, 35, 126, 0.1)';
            element.style.color = '#1a237e';
            element.style.transform = 'scale(1)';
        });
        
        element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleNavigationLinks();
        });
    }
    
    toggleNavigationLinks() {
        const navLinks = this.state.navLinksElement;
        const hamburger = document.querySelector('.hamburger-menu, .navbar-toggle');
        
        if (!navLinks || !hamburger) return;
        
        const screenWidth = window.innerWidth;
        const isLargeScreen = screenWidth >= 768;
        
        if (isLargeScreen) return;
        
        const computedStyle = window.getComputedStyle(navLinks);
        const isCurrentlyVisible = computedStyle.display !== 'none' && 
                                   computedStyle.visibility !== 'hidden';
        
        if (isCurrentlyVisible) {
            navLinks.style.cssText = `display: none !important; visibility: hidden !important;`;
            hamburger.innerHTML = '☰';
            hamburger.setAttribute('aria-expanded', 'false');
        } else {
            const menuWidth = 280;
            const leftPosition = Math.max(10, window.innerWidth - menuWidth - 10);
            
            navLinks.style.cssText = `
                display: flex !important;
                visibility: visible !important;
                flex-direction: column !important;
                position: fixed !important;
                top: 80px !important;
                left: ${leftPosition}px !important;
                background: rgba(20, 20, 30, 0.98) !important;
                border-radius: 15px !important;
                padding: 20px !important;
                z-index: 99999 !important;
                box-shadow: 0 10px 40px rgba(0,0,0,0.6) !important;
                border: 2px solid #3498db !important;
                width: ${menuWidth}px !important;
                max-width: 90vw !important;
                gap: 12px !important;
                color: white !important;
            `;
            
            hamburger.innerHTML = '✕';
            hamburger.setAttribute('aria-expanded', 'true');
        }
    }
    
    setupNavbarToggling() {
        const linkSelectors = ['.nav-links', '.navigation-links', '.navbar-links', 'nav > ul'];
        
        let navLinks = null;
        for (const selector of linkSelectors) {
            const element = document.querySelector(selector);
            if (element && element.querySelector('a, .nav-link, [href]')) {
                navLinks = element;
                break;
            }
        }
        
        if (navLinks) {
            navLinks.classList.add('toggleable-links');
            this.state.navLinksElement = navLinks;
        }
    }
    
    checkResponsiveView() {
        const hamburger = document.querySelector('.hamburger-menu, .navbar-toggle');
        const navLinks = this.state.navLinksElement;
        
        if (!hamburger || !navLinks) return;
        
        const screenWidth = window.innerWidth;
        const isLargeScreen = screenWidth >= 768;
        
        if (isLargeScreen) {
            hamburger.style.display = 'none';
            navLinks.style.display = 'flex';
        } else {
            hamburger.style.display = 'flex';
            if (!navLinks.classList.contains('links-visible')) {
                navLinks.style.display = 'none';
            }
        }
    }
    
    initWindowResizeListener() {
        if (this.state.resizeListenerInitialized) return;
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.checkResponsiveView();
            }, 250);
        });
        
        this.state.resizeListenerInitialized = true;
    }
    
    // ==================== PUBLIC PAGES ====================
    async loadIndexContent(container) {
        if (!container) return;
        
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
        if (!container) return;
        
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
    
    showPageNotFound(container) {
        container.innerHTML = `
            <div class="error-page">
                <h2>Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
                <a href="index.html" class="btn btn-primary">Go Home</a>
            </div>
        `;
    }
    
    // ==================== UTILITY METHODS ====================
    redirectTo(page) {
        const basePath = this.getBasePath();
        window.location.href = basePath + page;
    }
    
    showToast(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="notification-text">${message}</span>
            </div>
        `;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '9999'
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    showError(message) {
        console.error('❌ Error:', message);
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
        this.container = null;
    }
    
    render(container) {
        this.container = container;
        if (!this.app.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = this.getHTML();
        this.loadDashboardData();
    }
    
    getHTML() {
        return `
            <div class="dashboard-page">
                <div class="dashboard-header">
                    <div class="header-content">
                        <div class="welcome-text">
                            <h2>Welcome, ${this.app.user.name || 'Teacher'}!</h2>
                            <p>Here's your attendance overview</p>
                        </div>
                    </div>
                    <div class="date-display" id="current-date">
                        ${new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                </div>
                
                <div class="stats-grid" id="dashboard-stats">
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
                    ${record.status === 'present' ? '✅' : record.status === 'absent' ? '❌' : '⏰'}
                </div>
                <div class="activity-content">
                    <p>${record.className || 'Class'} - ${record.status || 'recorded'}</p>
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
}

// ==================== ATTENDANCE MODULE ====================
class AttendanceModule {
    constructor(app) {
        this.app = app;
        this.attendanceSystem = new AttendanceSystem();
        this.container = null;
    }
    
    render(container) {
        this.container = container;
        if (!this.app.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = this.getHTML();
        this.initializeAttendanceSystem();
        this.setupEventListeners();
    }
    
    getHTML() {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        
        return `
            <div class="attendance-report">
                <div class="header">
                    <h1><i class="fas fa-clipboard-check"></i> Attendance Track</h1>
                    <p class="subtitle">Daily Attendance Report</p>
                </div>
                
                <div class="controls-row">
                    <div class="control-group">
                        <label for="date-picker"><i class="fas fa-calendar-alt"></i> Date</label>
                        <input type="date" id="date-picker" class="date-input" value="${formattedDate}">
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
                                <th>AM</th>
                                <th>PM</th>
                                <th>AM</th>
                                <th>PM</th>
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
    
    initializeAttendanceSystem() {
        this.attendanceSystem.initialize(this.app.user);
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

// ==================== ATTENDANCE SYSTEM (Business Logic) ====================
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
            
            const classes = await this.loadClasses();
            const students = await this.loadStudents();
            const attendance = await this.loadAttendance(selectedDate, selectedSession);
            
            this.renderAttendanceTable(classes, students, attendance, selectedDate, selectedSession);
            
        } catch (error) {
            console.error('Error loading attendance:', error);
            this.showToast('Error loading attendance', 'error');
        }
    }
    
    async loadClasses() {
        // Try Firebase first
        if (this.user && typeof firestore !== 'undefined') {
            try {
                const snapshot = await firestore.collection('schools')
                    .doc(this.user.schoolId || this.user.id)
                    .collection('classes')
                    .get();
                const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                Storage.set('classes', classes);
                return classes;
            } catch (error) {
                console.log('Using cached classes:', error.message);
            }
        }
        return Storage.get('classes') || [];
    }
    
    async loadStudents() {
        if (this.user && typeof firestore !== 'undefined') {
            try {
                const snapshot = await firestore.collection('schools')
                    .doc(this.user.schoolId || this.user.id)
                    .collection('students')
                    .get();
                const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                Storage.set('students', students);
                return students;
            } catch (error) {
                console.log('Using cached students:', error.message);
            }
        }
        return Storage.get('students') || [];
    }
    
    async loadAttendance(date, session) {
        if (this.user && typeof firestore !== 'undefined') {
            try {
                let query = firestore.collection('schools')
                    .doc(this.user.schoolId || this.user.id)
                    .collection('attendance');
                
                if (date) query = query.where('date', '==', date);
                if (session !== 'both') query = query.where('session', '==', session);
                
                const snapshot = await query.get();
                const attendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                Storage.set('attendance', attendance);
                return attendance;
            } catch (error) {
                console.log('Using cached attendance:', error.message);
            }
        }
        return Storage.get('attendance') || [];
    }
    
    renderAttendanceTable(classes, students, attendance, date, session) {
        const tbody = document.getElementById('attendance-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (classes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="no-data">No classes found</td></tr>`;
            return;
        }
        
        classes.forEach(classItem => {
            const row = this.createClassRow(classItem, students, attendance, date, session);
            tbody.appendChild(row);
        });
        
        this.applySessionLogic(session);
    }
    
    createClassRow(classItem, students, attendance, date, session) {
        const classStudents = students.filter(s => s.classId === classItem.id);
        const classAttendance = attendance.filter(a => a.classId === classItem.id && a.date === date);
        
        const totalStudents = classStudents.length;
        const totalMale = classStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
        const totalFemale = classStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
        
        const savedRecord = classAttendance.find(a => 
            a.session === session || session === 'both' || !a.session
        );
        
        const maleAm = savedRecord?.malePresentAM || 0;
        const malePm = savedRecord?.malePresentPM || 0;
        const femaleAm = savedRecord?.femalePresentAM || 0;
        const femalePm = savedRecord?.femalePresentPM || 0;
        
        const amRate = this.calculateRate(maleAm + femaleAm, totalStudents);
        const pmRate = this.calculateRate(malePm + femalePm, totalStudents);
        const dailyRate = this.calculateRate((maleAm + malePm + femaleAm + femalePm), totalStudents * 2);
        
        const row = document.createElement('tr');
        row.className = 'attendance-data-row';
        row.dataset.classId = classItem.id;
        
        row.innerHTML = `
            <td>${classItem.yearGroup || ''}</td>
            <td><strong>${classItem.code || classItem.name}</strong></td>
            <td class="total-students">${totalStudents}</td>
            
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input male-am" 
                       value="${maleAm}"
                       min="0" 
                       max="${totalMale}"
                       data-gender="male"
                       data-session="am"
                       data-original="${maleAm}">
            </td>
            
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input male-pm" 
                       value="${malePm}"
                       min="0" 
                       max="${totalMale}"
                       data-gender="male"
                       data-session="pm"
                       data-original="${malePm}">
            </td>
            
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input female-am" 
                       value="${femaleAm}"
                       min="0" 
                       max="${totalFemale}"
                       data-gender="female"
                       data-session="am"
                       data-original="${femaleAm}">
            </td>
            
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input female-pm" 
                       value="${femalePm}"
                       min="0" 
                       max="${totalFemale}"
                       data-gender="female"
                       data-session="pm"
                       data-original="${femalePm}">
            </td>
            
            <td class="rate-cell am-rate ${this.getRateClass(amRate)}">${amRate}%</td>
            <td class="rate-cell pm-rate ${this.getRateClass(pmRate)}">${pmRate}%</td>
            <td class="rate-cell daily-rate ${this.getRateClass(dailyRate)}">${dailyRate}%</td>
            
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
        const gender = inputElement.dataset.gender;
        let value = parseInt(inputElement.value) || 0;
        
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        const totalCell = row.querySelector('.total-students');
        const total = parseInt(totalCell.textContent) || 0;
        
        const students = Storage.get('students') || [];
        const classStudents = students.filter(s => s.classId === classId);
        const genderTotal = classStudents.filter(s => s.gender?.toLowerCase() === gender).length;
        
        value = Math.max(0, Math.min(value, genderTotal));
        inputElement.value = value;
        
        this.handleSessionCopying(inputElement, value, gender);
        this.updateCalculations(classId);
        this.markAsUnsaved(classId);
    }
    
    handleSessionCopying(changedInput, value, gender) {
        const session = this.currentSession;
        const classId = changedInput.closest('tr').dataset.classId;
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        
        if (session === 'am') {
            const pmInput = row.querySelector(`.${gender}-pm`);
            if (pmInput) {
                pmInput.value = value;
                pmInput.dataset.original = value;
            }
        } else if (session === 'pm') {
            const amInput = row.querySelector(`.${gender}-am`);
            if (amInput) {
                amInput.value = value;
                amInput.dataset.original = value;
            }
        }
    }
    
    applySessionLogic(session) {
        this.currentSession = session;
        const rows = document.querySelectorAll('.attendance-data-row');
        
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
        
        row.querySelector('.am-rate').className = `rate-cell am-rate ${this.getRateClass(amRate)}`;
        row.querySelector('.pm-rate').className = `rate-cell pm-rate ${this.getRateClass(pmRate)}`;
        row.querySelector('.daily-rate').className = `rate-cell daily-rate ${this.getRateClass(dailyRate)}`;
        
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
    
    // ==================== SAVE METHODS ====================
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
            date: this.getSelectedDate(),
            session: this.currentSession,
            malePresentAM: maleAm,
            malePresentPM: malePm,
            femalePresentAM: femaleAm,
            femalePresentPM: femalePm,
            recordedBy: this.user?.email || 'Unknown',
            recordedAt: new Date().toISOString()
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
        if (this.user && typeof firestore !== 'undefined') {
            try {
                await firestore.collection('schools')
                    .doc(this.user.schoolId || this.user.id)
                    .collection('attendance')
                    .doc(attendanceRecord.id)
                    .set({
                        ...attendanceRecord,
                        schoolId: this.user.schoolId || this.user.id
                    });
                console.log('✅ Saved to Firebase');
            } catch (error) {
                console.error('Firebase save error:', error);
            }
        }
        
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
        this.updateLastSavedTime();
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
    
    // ==================== AUTO-SAVE ====================
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
    
    // ==================== HELPER METHODS ====================
    getSelectedDate() {
        const datePicker = document.getElementById('date-picker');
        return datePicker?.value || new Date().toISOString().split('T')[0];
    }
    
    calculateRate(present, total) {
        return total > 0 ? Math.round((present / total) * 100) : 0;
    }
    
    getRateClass(rate) {
        if (rate >= 90) return 'high';
        if (rate >= 75) return 'medium';
        return 'low';
    }
    
    updateLastSavedTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const element = document.getElementById('last-saved-time');
        if (element) {
            element.textContent = `Last saved: ${timeString}`;
        }
    }
    
    showToast(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Could call app.showToast here
    }
}

// ==================== REPORTS MODULE ====================
class ReportsModule {
    constructor(app) {
        this.app = app;
        this.container = null;
    }
    
    render(container) {
        this.container = container;
        if (!this.app.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = this.getHTML();
        this.initializeReportsPage();
        this.setupEventListeners();
    }
    
    getHTML() {
        return `
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
                                        <option value="custom">Custom Range</option>
                                    </select>
                                </div>
                                
                                <div class="filter-group">
                                    <label class="filter-label">Date Range:</label>
                                    <div class="date-range">
                                        <input type="date" id="start-date" class="date-input">
                                        <span>to</span>
                                        <input type="date" id="end-date" class="date-input">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="filter-row">
                                <div class="filter-group">
                                    <label class="filter-label">Class:</label>
                                    <select id="report-class" class="reports-select">
                                        <option value="all">All Classes</option>
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
    }
    
    initializeReportsPage() {
        this.populateReportsClassDropdown();
        this.setDefaultReportDates();
        this.setupReportsEventListeners();
    }
    
    populateReportsClassDropdown() {
        const classDropdown = document.getElementById('report-class');
        if (!classDropdown) return;
        
        const classes = Storage.get('classes') || [];
        classDropdown.innerHTML = '<option value="all">All Classes</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.name} (${cls.code})`;
            classDropdown.appendChild(option);
        });
    }
    
    setDefaultReportDates() {
        const today = new Date();
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        if (startDate) {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate.value = firstDay.toISOString().split('T')[0];
        }
        
        if (endDate) {
            endDate.value = today.toISOString().split('T')[0];
        }
    }
    
    setupReportsEventListeners() {
        const generateBtn = document.getElementById('generate-report');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateReport());
        }
    }
    
    generateReport() {
        console.log('📊 Generating report...');
        
        const reportType = document.getElementById('report-type').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const classId = document.getElementById('report-class').value;
        const format = document.getElementById('report-format').value;
        
        const loading = document.getElementById('report-loading');
        const reportContent = document.getElementById('report-content');
        
        if (loading) loading.style.display = 'flex';
        if (reportContent) reportContent.innerHTML = '';
        
        setTimeout(() => {
            const attendance = Storage.get('attendance') || [];
            const classes = Storage.get('classes') || [];
            
            let filteredAttendance = attendance.filter(a => {
                const dateMatch = (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate);
                const classMatch = classId === 'all' || a.classId === classId;
                return dateMatch && classMatch;
            });
            
            let reportHTML = this.generateReportContent(filteredAttendance, classes, {
                type: reportType,
                startDate,
                endDate,
                classId,
                format
            });
            
            if (loading) loading.style.display = 'none';
            if (reportContent) reportContent.innerHTML = reportHTML;
            
            this.app.showToast('Report generated successfully!', 'success');
        }, 1000);
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
        
        Object.entries(attendanceByClass).forEach(([classId, classAttendance]) => {
            const cls = classes.find(c => c.id === classId);
            if (!cls) return;
            
            html += `
                <div class="class-report">
                    <h4>${cls.name} (${cls.code})</h4>
                    <div class="class-stats">
                        <div class="stat-card">
                            <div class="stat-icon">✅</div>
                            <div class="stat-info">
                                <span class="stat-value">${classAttendance.length}</span>
                                <span class="stat-label">Records</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    }
    
    setupEventListeners() {
        // Additional event listeners
    }
}

// ==================== SETUP MODULE ====================
class SetupModule {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.autoSaveTimeouts = {};
        this.autoSaveQueue = [];
    }
    
    render(container) {
        this.container = container;
        if (!this.app.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
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
                            <button class="tab-btn" data-tab="students">
                                <i class="fas fa-users"></i> Students
                            </button>
                            <button class="tab-btn" data-tab="system">
                                <i class="fas fa-cog"></i> System Settings
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
                                        <input type="text" id="classCode" class="form-input uppercase-input" placeholder="e.g., 1LEY, U5MASCOLL, 10RAN" required>
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
        this.initAutoSave();
        this.setupTotalCalculation();
        this.setupUppercaseConversion();
        this.loadClassesList();
    }
    
    initAutoSave() {
        this.autoSaveTimeouts = {};
        this.autoSaveQueue = [];
        
        setInterval(() => {
            if (this.autoSaveQueue.length > 0 && navigator.onLine) {
                this.processAutoSaveQueue();
            }
        }, 5000);
        
        this.setupClassAutoSave();
    }
    
    setupClassAutoSave() {
        const inputIds = ['yearGroup', 'classCode', 'maleCount', 'femaleCount'];
        
        inputIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.queueAutoSave('class');
                    if (id === 'maleCount' || id === 'femaleCount') {
                        this.updateTotalDisplay();
                    }
                });
                input.addEventListener('blur', () => {
                    this.autoSaveClassForm();
                });
            }
        });
        
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
            teacherId: this.app.user?.id
        };
        
        classes.push(classData);
        Storage.set('classes', classes);
        
        // Try to save to Firebase
        if (window.auth?.currentUser) {
            try {
                // Add Firebase save logic here
                console.log('Would save to Firebase:', classData);
            } catch (error) {
                console.error('Firebase save error:', error);
            }
        }
        
        this.app.showToast('Class saved successfully!', 'success');
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
            return `
                <div class="class-card">
                    <div class="class-header">
                        <div class="class-title">${cls.name}</div>
                        <div class="class-code">${cls.code}</div>
                    </div>
                    <div class="class-info">
                        <div class="info-item">
                            <span class="info-label">Year Group:</span>
                            <span class="info-value">${cls.yearGroup || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Students:</span>
                            <span class="info-value">${cls.total || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    setupUppercaseConversion() {
        const classCodeInput = document.getElementById('classCode');
        if (!classCodeInput) return;
        
        classCodeInput.addEventListener('input', (e) => {
            const input = e.target;
            const cursorPosition = input.selectionStart;
            const originalValue = input.value;
            const uppercaseValue = originalValue.toUpperCase();
            
            if (originalValue !== uppercaseValue) {
                input.value = uppercaseValue;
                input.setSelectionRange(cursorPosition, cursorPosition);
            }
        });
        
        classCodeInput.addEventListener('blur', (e) => {
            e.target.value = e.target.value.toUpperCase().trim();
        });
    }
    
    queueAutoSave(type) {
        clearTimeout(this.autoSaveTimeouts[type]);
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
        this.addToAutoSaveQueue('classes', classData, 'save');
    }
    
    addToAutoSaveQueue(collection, data, action) {
        this.autoSaveQueue.push({
            collection,
            data,
            action,
            timestamp: Date.now(),
            attempts: 0
        });
        
        this.updateAutoSaveIndicator();
    }
    
    async processAutoSaveQueue() {
        if (!navigator.onLine || !window.auth?.currentUser || !this.autoSaveQueue?.length) return;
        
        for (let i = 0; i < this.autoSaveQueue.length; i++) {
            const item = this.autoSaveQueue[i];
            
            try {
                if (item.action === 'save' && item.collection === 'classes') {
                    // Firebase save logic would go here
                    console.log('Auto-saving to Firebase:', item.data);
                    this.autoSaveQueue.splice(i, 1);
                    i--;
                }
            } catch (error) {
                console.error('Auto-save failed:', error);
                item.attempts++;
                
                if (item.attempts >= 3) {
                    this.autoSaveQueue.splice(i, 1);
                    i--;
                }
            }
        }
        
        this.updateAutoSaveIndicator();
    }
    
    updateAutoSaveIndicator() {
        const count = this.autoSaveQueue.length;
        let indicator = document.getElementById('global-autosave-indicator');
        
        if (count > 0) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'global-autosave-indicator';
                indicator.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #f39c12;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 1000;
                `;
                document.body.appendChild(indicator);
            }
            
            indicator.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i> ${count} pending`;
        } else if (indicator) {
            indicator.remove();
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
    
    setupEventListeners() {
        const saveClassBtn = document.getElementById('save-class');
        if (saveClassBtn) {
            saveClassBtn.addEventListener('click', () => this.saveClass());
        }
    }
}

// ==================== SETTINGS MODULE ====================
class SettingsModule {
    constructor(app) {
        this.app = app;
        this.container = null;
    }
    
    render(container) {
        this.container = container;
        if (!this.app.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = this.getHTML();
        this.initializeSettingsPage();
        this.setupEventListeners();
    }
    
    getHTML() {
        return `
            <div class="settings-page">
                <div class="settings-container">
                    <div class="settings-header">
                        <h1>User Settings</h1>
                        <p class="settings-subtitle">Manage your account preferences and app settings</p>
                    </div>
                    
                    <section class="settings-section">
                        <div class="settings-tabs">
                            <button class="tab-btn active" data-tab="profile">
                                <i class="fas fa-user"></i> Profile
                            </button>
                        </div>
                        
                        <div class="tab-content active" id="profile-tab">
                            <div class="section-title">Profile Information</div>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label class="form-label">Full Name</label>
                                    <input type="text" id="userName" class="form-input" value="${this.app.user.name || ''}" placeholder="Your full name">
                                </div>
                                
                                <div class="actions-container">
                                    <button class="action-btn save-btn" id="save-profile">
                                        <i class="fas fa-save"></i> Save Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
    
    initializeSettingsPage() {
        this.loadUserSettings();
    }
    
    loadUserSettings() {
        const userName = document.getElementById('userName');
        if (userName) userName.value = this.app.user.name || '';
    }
    
    saveProfile() {
        const userName = document.getElementById('userName')?.value;
        this.app.user.name = userName || this.app.user.name;
        Storage.set('attendance_user', this.app.user);
        this.app.showToast('Profile updated successfully!', 'success');
    }
    
    setupEventListeners() {
        const saveProfileBtn = document.getElementById('save-profile');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.saveProfile());
        }
    }
}

// ==================== GLOBAL INSTANCE ====================
const app = new AttendanceApp();
window.app = app;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM fully loaded, app is ready');
});
