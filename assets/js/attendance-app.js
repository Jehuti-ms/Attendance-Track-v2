// attendance-app.js - Main app file
import { Storage, Utils } from './utils.js';

class AttendanceApp {
    constructor() {
        console.log('🎯 AttendanceApp constructor');
        
        this.state = {
            currentUser: null,
            currentPage: this.getCurrentPage(),
            isOnline: navigator.onLine,
            settings: Storage.get('app_settings', {})
        };

        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page.replace('.html', '');
    }

    getBasePath() {
        const pathname = window.location.pathname;
        if (pathname.includes('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        }
        return '/';
    }

    async init() {
        console.log('🚀 Initializing AttendanceApp...');
        
        try {
            // Check authentication
            const user = Storage.get('attendance_user');
            if (user) {
                this.state.currentUser = user;
                console.log('User found:', user.name);
            }

            // Load UI components
            await this.loadHeader();
            await this.loadContent();
            
            // Setup page-specific handlers
            this.setupPageHandlers();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize service worker
            this.initServiceWorker();
            
            console.log('✅ AttendanceApp initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError(error.message);
        }
    }

    async loadHeader() {
        const headerContainer = document.getElementById('header-container');
        if (!headerContainer) return;
        
        headerContainer.innerHTML = `
            <header>
                <div class="header-left">
                    <div class="app-icon">📋</div>
                    <div>
                        <h1>Attendance Track v2</h1>
                        <div class="online-status" id="online-status">
                            ● ${this.state.isOnline ? 'Online' : 'Offline'}
                        </div>
                    </div>
                </div>
                <div class="header-right">
                    ${this.state.currentUser ? `
                        <div class="user-info">
                            <div class="user-avatar">👤</div>
                            <div class="user-details">
                                <div class="user-name">${this.state.currentUser.name}</div>
                                <div class="user-role">${this.state.currentUser.role || 'Teacher'}</div>
                            </div>
                        </div>
                        <button class="btn btn-outline" onclick="app.logout()">Logout</button>
                    ` : `
                        ${this.state.currentPage !== 'login' ? `
                            <button class="btn btn-primary" onclick="app.goToLogin()">Login</button>
                        ` : ''}
                        ${this.state.currentPage === 'index' ? `
                            <button class="btn btn-secondary" onclick="app.startDemoMode()">Try Demo</button>
                        ` : ''}
                    `}
                </div>
            </header>
        `;
        
        // Update online status color
        const onlineStatus = document.getElementById('online-status');
        if (onlineStatus) {
            onlineStatus.style.color = this.state.isOnline ? '#28a745' : '#dc3545';
        }
    }

    async loadContent() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        // Hide loading
        const loadingContent = document.getElementById('loading-content');
        if (loadingContent) {
            loadingContent.style.display = 'none';
        }
        
        // Load content based on page
        switch(this.state.currentPage) {
            case 'index':
                await this.loadIndexContent(appContainer);
                break;
            case 'login':
                await this.loadLoginContent(appContainer);
                break;
            case 'dashboard':
                await this.loadDashboardContent(appContainer);
                break;
            case 'attendance':
                await this.loadAttendanceContent(appContainer);
                break;
            default:
                appContainer.innerHTML = `<h2>${this.state.currentPage} Page</h2>`;
        }
    }

    async loadIndexContent(container) {
        container.innerHTML = `
            <div class="landing-page">
                <div class="hero">
                    <div class="hero-icon">📋</div>
                    <h1>Attendance Track v2</h1>
                    <p class="hero-subtitle">Modern attendance tracking for educational institutions</p>
                    
                    <div class="features">
                        <div class="feature">
                            <div class="feature-icon">📊</div>
                            <h3>Real-time Tracking</h3>
                            <p>Track attendance with instant updates</p>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">📱</div>
                            <h3>Offline Support</h3>
                            <p>Works without internet connection</p>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">📈</div>
                            <h3>Detailed Reports</h3>
                            <p>Generate comprehensive reports</p>
                        </div>
                    </div>
                    
                    <div class="hero-actions">
                        ${this.state.currentUser ? `
                            <button class="btn btn-lg btn-primary" onclick="app.goToDashboard()">
                                Go to Dashboard
                            </button>
                        ` : `
                            <button class="btn btn-lg btn-primary" onclick="app.goToLogin()">
                                Login to Start
                            </button>
                            <button class="btn btn-lg btn-secondary" onclick="app.startDemoMode()">
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
            <div class="login-page">
                <div class="login-card">
                    <div class="login-header">
                        <div class="login-icon">🔐</div>
                        <h1>Login</h1>
                        <p>Access your attendance tracking system</p>
                    </div>
                    
                    <form id="login-form" class="login-form">
                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input 
                                type="email" 
                                id="email" 
                                name="email"
                                placeholder="teacher@school.edu"
                                required
                                value="demo@school.edu"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input 
                                type="password" 
                                id="password" 
                                name="password"
                                placeholder="Enter your password"
                                required
                                value="demo123"
                            >
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-block">
                            Sign In
                        </button>
                        
                        <div class="login-options">
                            <button type="button" class="btn btn-link" onclick="app.startDemoMode()">
                                Try Demo Mode
                            </button>
                            <button type="button" class="btn btn-link" onclick="app.goToIndex()">
                                Back to Home
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async loadDashboardContent(container) {
        if (!this.state.currentUser) {
            this.goToLogin();
            return;
        }
        
        // Load stats
        const classes = Storage.get('attendance_classes', []);
        const records = Storage.get('attendance_records', []);
        
        const totalStudents = classes.reduce((sum, cls) => sum + (cls.students || 0), 0);
        const totalClasses = classes.length;
        const recentRecords = records.slice(-5).reverse();
        
        container.innerHTML = `
            <div class="dashboard">
                <div class="dashboard-header">
                    <h2>Welcome, ${this.state.currentUser.name}!</h2>
                    <p>${this.state.currentUser.role || 'Teacher'} Dashboard</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <div class="stat-number">${totalStudents}</div>
                            <div class="stat-label">Total Students</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📚</div>
                        <div class="stat-content">
                            <div class="stat-number">${totalClasses}</div>
                            <div class="stat-label">Classes</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-number">${records.length}</div>
                            <div class="stat-label">Records</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-content">
                            <div class="stat-number">92%</div>
                            <div class="stat-label">Attendance Rate</div>
                        </div>
                    </div>
                </div>
                
                <div class="quick-actions">
                    <h3>Quick Actions</h3>
                    <div class="actions-grid">
                        <button class="action-card" onclick="app.goToAttendance()">
                            <div class="action-icon">📝</div>
                            <div class="action-content">
                                <h4>Take Attendance</h4>
                                <p>Record today's attendance</p>
                            </div>
                        </button>
                        
                        <button class="action-card" onclick="app.goToReports()">
                            <div class="action-icon">📈</div>
                            <div class="action-content">
                                <h4>View Reports</h4>
                                <p>Generate attendance reports</p>
                            </div>
                        </button>
                        
                        <button class="action-card" onclick="app.goToSetup()">
                            <div class="action-icon">⚙️</div>
                            <div class="action-content">
                                <h4>Setup</h4>
                                <p>Configure your system</p>
                            </div>
                        </button>
                        
                        <button class="action-card" onclick="app.goToSettings()">
                            <div class="action-icon">🔧</div>
                            <div class="action-content">
                                <h4>Settings</h4>
                                <p>Manage preferences</p>
                            </div>
                        </button>
                    </div>
                </div>
                
                ${recentRecords.length > 0 ? `
                    <div class="recent-activity">
                        <h3>Recent Activity</h3>
                        <div class="activity-list">
                            ${recentRecords.map(record => `
                                <div class="activity-item">
                                    <div class="activity-icon">📝</div>
                                    <div class="activity-content">
                                        <div class="activity-text">
                                            Attendance for ${record.className || 'Class'}
                                        </div>
                                        <div class="activity-time">
                                            ${Utils.formatDate(record.date)} • ${record.students?.length || 0} students
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async loadAttendanceContent(container) {
        if (!this.state.currentUser) {
            this.goToLogin();
            return;
        }
        
        container.innerHTML = `
            <div class="attendance-page">
                <div class="page-header">
                    <h2>Take Attendance</h2>
                    <p>Select a class and mark attendance</p>
                </div>
                
                <div class="attendance-container">
                    <div class="classes-section">
                        <h3>Select Class</h3>
                        <div id="classes-container" class="classes-grid">
                            <!-- Classes will be loaded here -->
                            <div class="loading-classes">Loading classes...</div>
                        </div>
                    </div>
                    
                    <div class="students-section">
                        <h3>Attendance List</h3>
                        <div id="students-container" class="students-list">
                            <p class="no-class-selected">Select a class to view students</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load classes after DOM is ready
        setTimeout(() => this.loadClasses(), 100);
    }

    loadClasses() {
        const classesContainer = document.getElementById('classes-container');
        if (!classesContainer) return;
        
        const classes = Storage.get('attendance_classes', [
            { id: 'class-1', name: 'Mathematics 101', time: '9:00 AM', students: 24 },
            { id: 'class-2', name: 'Science 201', time: '11:00 AM', students: 18 },
            { id: 'class-3', name: 'English 101', time: '1:00 PM', students: 22 },
            { id: 'class-4', name: 'History 301', time: '3:00 PM', students: 20 }
        ]);
        
        classesContainer.innerHTML = classes.map(cls => `
            <div class="class-card" onclick="app.selectClass('${cls.id}')">
                <div class="class-info">
                    <h4>${cls.name}</h4>
                    <p>⏰ ${cls.time} • 👥 ${cls.students} students</p>
                </div>
                <button class="btn btn-sm">Select</button>
            </div>
        `).join('');
    }

    selectClass(classId) {
        console.log('Selected class:', classId);
        Utils.showToast('Class selected', 'info');
        // In a real app, you would load students here
    }

    setupPageHandlers() {
        // Login form handler
        if (this.state.currentPage === 'login') {
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleLogin();
                });
            }
        }
    }

    handleLogin() {
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        
        if (!email || !password) {
            Utils.showToast('Please enter email and password', 'warning');
            return;
        }
        
        // Simple demo login - accept any credentials
        const user = {
            id: Utils.generateId(),
            name: email.split('@')[0] || 'Demo Teacher',
            email: email,
            role: 'teacher',
            school: 'Demo Academy',
            loginTime: new Date().toISOString()
        };
        
        Storage.set('attendance_user', user);
        this.state.currentUser = user;
        
        Utils.showToast('Login successful!', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            this.goToDashboard();
        }, 1000);
    }

    setupEventListeners() {
        // Online/offline status
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.updateOnlineStatus();
            Utils.showToast('You are back online', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.updateOnlineStatus();
            Utils.showToast('You are offline', 'warning');
        });
    }

    updateOnlineStatus() {
        const onlineStatus = document.getElementById('online-status');
        if (onlineStatus) {
            onlineStatus.textContent = `● ${this.state.isOnline ? 'Online' : 'Offline'}`;
            onlineStatus.style.color = this.state.isOnline ? '#28a745' : '#dc3545';
        }
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            const swPath = this.getBasePath() + 'service-worker.js';
            navigator.serviceWorker.register(swPath)
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration.scope);
                })
                .catch(error => {
                    console.warn('⚠️ Service Worker registration failed:', error);
                });
        }
    }

    // Navigation methods
    navigateTo(page) {
        window.location.href = this.getBasePath() + page + '.html';
    }

    goToIndex() { this.navigateTo('index'); }
    goToLogin() { this.navigateTo('login'); }
    goToDashboard() { this.navigateTo('dashboard'); }
    goToAttendance() { this.navigateTo('attendance'); }
    goToReports() { this.navigateTo('reports'); }
    goToSetup() { this.navigateTo('setup'); }
    goToSettings() { this.navigateTo('settings'); }
    goToMaintenance() { this.navigateTo('maintenance'); }

    startDemoMode() {
        const demoUser = {
            id: 'demo-001',
            name: 'Demo Teacher',
            email: 'demo@school.edu',
            role: 'teacher',
            school: 'Demo Academy',
            demo: true
        };
        
        Storage.set('attendance_user', demoUser);
        this.state.currentUser = demoUser;
        
        Utils.showToast('Demo mode activated!', 'success');
        
        setTimeout(() => {
            this.goToDashboard();
        }, 1000);
    }

    logout() {
        Storage.remove('attendance_user');
        Storage.remove('demo_mode');
        this.state.currentUser = null;
        
        Utils.showToast('Logged out successfully', 'success');
        
        setTimeout(() => {
            this.goToIndex();
        }, 1000);
    }

    showError(message) {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.innerHTML = `
                <div class="error-page">
                    <div class="error-icon">⚠️</div>
                    <h2>Something went wrong</h2>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }
}

// Create global instance
window.app = new AttendanceApp();
