// attendance-app.js - COMPLETE FIXED VERSION
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
        console.log('Current pathname:', pathname);
        
        if (pathname.includes('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        } else if (pathname === '/Attendance-Track-v2' || pathname === '/Attendance-Track-v2/') {
            return '/Attendance-Track-v2/';
        }
        return '/';
    }
    
   async init() {
    console.log('🚀 Initializing AttendanceApp...');
    
    try {
        // First check if we have Firebase auth
        const hasFirebaseAuth = await this.checkFirebaseAuth();
        console.log('Firebase auth status:', hasFirebaseAuth ? 'Logged in' : 'Not logged in');
        
        // Check authentication (from localStorage or Firebase)
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

     async checkFirebaseAuth() {
    try {
        const { auth } = await import('./firebase.js');
        
        if (auth.currentUser) {
            console.log('Firebase user already logged in:', auth.currentUser.email);
            this.state.currentUser = {
                id: auth.currentUser.uid,
                email: auth.currentUser.email,
                name: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                role: 'teacher'
            };
            Storage.set('attendance_user', this.state.currentUser);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Firebase auth check failed:', error);
        return false;
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
            case 'reports':
                await this.loadReportsContent(appContainer);
                break;
            case 'setup':
                await this.loadSetupContent(appContainer);
                break;
            case 'settings':
                await this.loadSettingsContent(appContainer);
                break;
            case 'maintenance':
                await this.loadMaintenanceContent(appContainer);
                break;
            default:
                this.showPageNotFound();
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
                        
                        <button class="action-card" onclick="app.goToMaintenance()">
                            <div class="action-icon">💾</div>
                            <div class="action-content">
                                <h4>Maintenance</h4>
                                <p>Manage data and backups</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadSetupContent(container) {
        if (!this.state.currentUser) {
            this.goToLogin();
            return;
        }
        
        container.innerHTML = `
            <div class="setup-page">
                <div class="page-header">
                    <h2>System Setup</h2>
                    <p>Configure your institution settings</p>
                </div>
                
                <div class="setup-content">
                    <div class="setup-card">
                        <h3>🏫 School Information</h3>
                        <div class="form-group">
                            <label>School Name</label>
                            <input type="text" id="school-name" placeholder="Enter school name" value="Demo Academy">
                        </div>
                        <div class="form-group">
                            <label>Academic Year</label>
                            <input type="text" id="academic-year" placeholder="e.g., 2024-2025" value="2024-2025">
                        </div>
                        <button class="btn btn-primary" onclick="app.saveSchoolInfo()">Save School Info</button>
                    </div>
                    
                    <div class="setup-card">
                        <h3>📚 Manage Classes</h3>
                        <div id="classes-list">
                            <p>No classes added yet.</p>
                        </div>
                        <div class="form-group">
                            <label>Add New Class</label>
                            <input type="text" id="new-class-name" placeholder="Class name">
                            <input type="number" id="new-class-size" placeholder="Number of students" style="margin-top: 10px;">
                        </div>
                        <button class="btn btn-secondary" onclick="app.addNewClass()">Add Class</button>
                    </div>
                    
                    <div class="setup-actions">
                        <button class="btn btn-success" onclick="app.completeSetup()">Complete Setup</button>
                        <button class="btn btn-outline" onclick="app.goToDashboard()">Back to Dashboard</button>
                    </div>
                </div>
            </div>
        `;
        
        // Load existing classes
        this.loadClassesList();
    }

    async loadSettingsContent(container) {
        if (!this.state.currentUser) {
            this.goToLogin();
            return;
        }
        
        container.innerHTML = `
            <div class="settings-page">
                <div class="page-header">
                    <h2>Settings</h2>
                    <p>Configure application preferences</p>
                </div>
                
                <div class="settings-content">
                    <div class="settings-card">
                        <h3>⚙️ General Settings</h3>
                        <div class="setting-item">
                            <label>Theme</label>
                            <select id="theme-select">
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="auto">Auto</option>
                            </select>
                        </div>
                        <div class="setting-item">
                            <label>Language</label>
                            <select id="language-select">
                                <option>English</option>
                                <option>Spanish</option>
                                <option>French</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" onclick="app.saveSettings()">Save Settings</button>
                    </div>
                    
                    <div class="settings-card">
                        <h3>🔒 Account</h3>
                        <p>Logged in as: ${this.state.currentUser.email}</p>
                        <button class="btn btn-secondary" onclick="app.goToDashboard()">Back to Dashboard</button>
                        <button class="btn btn-outline" onclick="app.logout()" style="margin-left: 10px;">Logout</button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadMaintenanceContent(container) {
        if (!this.state.currentUser) {
            this.goToLogin();
            return;
        }
        
        container.innerHTML = `
            <div class="maintenance-page">
                <div class="page-header">
                    <h2>Data Maintenance</h2>
                    <p>Manage backups and system data</p>
                </div>
                
                <div class="maintenance-content">
                    <div class="maintenance-card">
                        <h3>💾 Backup Data</h3>
                        <p>Create a backup of all attendance records and settings</p>
                        <button class="btn btn-primary" onclick="app.createBackup()">Create Backup</button>
                    </div>
                    
                    <div class="maintenance-card">
                        <h3>🔄 Restore Data</h3>
                        <p>Restore from a previous backup file</p>
                        <input type="file" id="backup-file" accept=".json" style="margin-bottom: 15px;">
                        <button class="btn btn-secondary" onclick="app.restoreBackup()">Restore Backup</button>
                    </div>
                    
                    <div class="maintenance-card danger">
                        <h3>⚠️ Danger Zone</h3>
                        <p>Clear all data (this cannot be undone!)</p>
                        <button class="btn btn-danger" onclick="app.clearAllData()">Clear All Data</button>
                    </div>
                </div>
            </div>
        `;
    }

async loadAttendanceContent(container) {
    if (!this.state.currentUser) {
        this.goToLogin();
        return;
    }
    
    // Import the AttendanceManager dynamically
    import('./attendance.js').then(module => {
        this.attendanceManager = new module.AttendanceManager(this);
        this.attendanceManager.init();
    }).catch(error => {
        console.error('Failed to load attendance module:', error);
        this.loadBasicAttendanceContent(container);
    });
}

async loadBasicAttendanceContent(container) {
    // Fallback content if module fails to load
    container.innerHTML = `
        <div id="attendance-content" style="display: block;" class="attendance-page">
            <div class="attendance-header">
                <div class="header-top">
                    <div>
                        <h1 style="margin: 0; font-size: 2rem;">📊 Daily Attendance</h1>
                        <div class="term-week-display">
                            <span id="current-term">Term 1</span> • 
                            <span id="current-week">Week 1</span>
                        </div>
                    </div>
                    <div class="date-display" id="current-date">
                        ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, ' / ')}
                    </div>
                </div>
                
                <div class="session-tabs">
                    <div class="session-tab active" data-session="both">
                        <span>☀️🌙</span>
                        Both Sessions
                    </div>
                    <div class="session-tab" data-session="am">
                        <span>☀️</span>
                        AM Session Only
                    </div>
                    <div class="session-tab" data-session="pm">
                        <span>🌙</span>
                        PM Session Only
                    </div>
                </div>
            </div>
            
            <div class="attendance-container">
                <div class="attendance-table-container">
                    <div style="text-align: center; padding: 50px;">
                        <div style="font-size: 3rem; margin-bottom: 20px;">📋</div>
                        <h3>Attendance System Loading...</h3>
                        <p>If this persists, please refresh the page.</p>
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Hide loading
    const loadingContent = document.getElementById('loading-content');
    if (loadingContent) {
        loadingContent.style.display = 'none';
    }
}

    async loadReportsContent(container) {
        if (!this.state.currentUser) {
            this.goToLogin();
            return;
        }
        
        container.innerHTML = `
            <div class="reports-page">
                <div class="page-header">
                    <h2>Reports</h2>
                    <p>Generate and view attendance reports</p>
                </div>
                
                <div class="reports-content">
                    <div class="reports-card">
                        <h3>📊 Generate Report</h3>
                        <div class="form-group">
                            <label>Report Type</label>
                            <select id="report-type">
                                <option value="daily">Daily Attendance</option>
                                <option value="weekly">Weekly Summary</option>
                                <option value="monthly">Monthly Report</option>
                                <option value="custom">Custom Period</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Date Range</label>
                            <div style="display: flex; gap: 10px;">
                                <input type="date" id="start-date">
                                <input type="date" id="end-date">
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="app.generateReport()">Generate Report</button>
                    </div>
                    
                    <div class="reports-card">
                        <h3>📤 Export Options</h3>
                        <p>Export report in different formats</p>
                        <div class="export-options">
                            <button class="btn btn-secondary" onclick="app.exportToPDF()">📄 PDF</button>
                            <button class="btn btn-secondary" onclick="app.exportToExcel()">📊 Excel</button>
                            <button class="btn btn-secondary" onclick="app.exportToCSV()">📝 CSV</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== NAVIGATION METHODS ==========
    navigateTo(page) {
        console.log(`Navigating to: ${page}`);
        const basePath = this.getBasePath();
        const targetUrl = basePath + page + '.html';
        
        // Navigate immediately
        window.location.href = targetUrl;
    }

    goToIndex() { this.navigateTo('index'); }
    goToLogin() { this.navigateTo('login'); }
    goToDashboard() { this.navigateTo('dashboard'); }
    goToAttendance() { this.navigateTo('attendance'); }
    goToReports() { this.navigateTo('reports'); }
    goToSetup() { this.navigateTo('setup'); }
    goToSettings() { this.navigateTo('settings'); }
    goToMaintenance() { this.navigateTo('maintenance'); }

    // ========== SETUP PAGE METHODS ==========
    loadClassesList() {
        const classes = Storage.get('attendance_classes', []);
        const classesList = document.getElementById('classes-list');
        
        if (!classesList) return;
        
        if (classes.length === 0) {
            classesList.innerHTML = '<p>No classes added yet.</p>';
            return;
        }
        
        classesList.innerHTML = `
            <div class="classes-table">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; text-align: left;">Class Name</th>
                            <th style="padding: 10px; text-align: left;">Students</th>
                            <th style="padding: 10px; text-align: left;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${classes.map((cls, index) => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px;">${cls.name}</td>
                                <td style="padding: 10px;">${cls.students || 0}</td>
                                <td style="padding: 10px;">
                                    <button class="btn btn-sm" onclick="app.editClass(${index})">Edit</button>
                                    <button class="btn btn-sm btn-danger" onclick="app.deleteClass(${index})" style="margin-left: 5px;">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    saveSchoolInfo() {
        const schoolName = document.getElementById('school-name')?.value;
        const academicYear = document.getElementById('academic-year')?.value;
        
        if (schoolName && academicYear) {
            const schoolInfo = { schoolName, academicYear };
            Storage.set('school_info', schoolInfo);
            Utils.showToast('School information saved!', 'success');
        } else {
            Utils.showToast('Please fill in all fields', 'warning');
        }
    }

    addNewClass() {
        const className = document.getElementById('new-class-name')?.value;
        const classSize = document.getElementById('new-class-size')?.value;
        
        if (!className || !classSize) {
            Utils.showToast('Please enter class name and size', 'warning');
            return;
        }
        
        const classes = Storage.get('attendance_classes', []);
        classes.push({
            id: 'class-' + Date.now(),
            name: className,
            students: parseInt(classSize),
            createdAt: new Date().toISOString()
        });
        
        Storage.set('attendance_classes', classes);
        Utils.showToast('Class added successfully!', 'success');
        
        // Clear inputs
        document.getElementById('new-class-name').value = '';
        document.getElementById('new-class-size').value = '';
        
        // Refresh list
        this.loadClassesList();
    }

    completeSetup() {
        Storage.set('setup_completed', true);
        Storage.set('setup_date', new Date().toISOString());
        Utils.showToast('Setup completed successfully!', 'success');
        
        setTimeout(() => {
            this.goToDashboard();
        }, 1500);
    }

    // ========== LOGIN & AUTH METHODS ==========
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
            this.goToIndex(); // FIXED: Added goToIndex function
        }, 1000);
    }

    // ========== EVENT LISTENERS ==========
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

    showPageNotFound() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="error-page">
                <div class="error-icon">📄</div>
                <h2>Page Not Found</h2>
                <p>The page "${this.state.currentPage}" doesn't exist yet.</p>
                <button class="btn btn-primary" onclick="app.goToDashboard()">
                    Go to Dashboard
                </button>
                <button class="btn btn-secondary" onclick="app.goToIndex()" style="margin-left: 10px;">
                    Back to Home
                </button>
            </div>
        `;
    }
}

// Create global instance
window.app = new AttendanceApp();
