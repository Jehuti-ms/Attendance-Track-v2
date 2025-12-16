// attendance-app.js - COMPLETE UPDATED VERSION with Firebase
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

    // ==================== INITIALIZATION ====================
    async init() {
    console.log('🚀 Initializing AttendanceApp...');
    
    try {
        // Check localStorage user first
        const user = Storage.get('attendance_user');
        
        if (user) {
            this.state.currentUser = user;
            console.log('LocalStorage user found:', user.name);
            
            // Try to sync with Firebase if available
            await this.syncLocalUserToFirebase(user);
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

        this.setupNavigation();
        this.renderHeader();
        this.renderFooter();
        
        // THIS IS THE KEY CHANGE - Call checkAuthAndLoadPage correctly
        this.checkAuthAndLoadPage();
        
        console.log('✅ AttendanceApp initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        this.showError(error.message);
    }
}

 // ==================== AUTH & PAGE LOADING ====================
checkAuthAndLoadPage() {
    if (!this.user) {
        this.showLoginPage();
    } else {
        this.renderPage(); // ← This should call your new renderPage method
    }
}

 // ==================== PAGE RENDERERS ====================
// Also add this renderPage method to your class
renderPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    
    console.log('Rendering page:', page);
    
    // Hide loading spinner if it exists
    const loadingEl = document.getElementById('loading-content');
    if (loadingEl) loadingEl.style.display = 'none';
    
    // Render based on current page
    switch(true) {
        case page.includes('dashboard.html'):
            this.renderDashboard();
            break;
        case page.includes('attendance.html'):
            this.renderAttendance();
            break;
        case page.includes('reports.html'):
            this.renderReports();
            break;
        case page.includes('settings.html'):
            this.renderSettings();
            break;
        case page.includes('setup.html'):
            this.renderSetup();
            break;
        case page.includes('login.html'):
        case page.includes('index.html'):
            // Login page handles itself
            // If we're on login page but user is logged in, redirect to dashboard
            if (this.user && (page.includes('login.html') || page.includes('index.html'))) {
                window.location.href = 'dashboard.html';
            }
            break;
        default:
            // Default to dashboard if page not recognized
            this.renderDashboard();
    }
}
    // ===============RENDER DASHBOARD ===========
    renderDashboard() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="dashboard-page">
                <div class="dashboard-header">
                    <div class="header-content">
                        <div class="welcome-text">
                            <h2>Welcome, ${this.user?.name || 'Teacher'}!</h2>
                            <p>Here's your attendance overview</p>
                        </div>
                        <div class="connection-status" id="connection-status">
                            <span class="status-dot ${this.firebaseAvailable ? 'connected' : 'offline'}"></span>
                            <span class="status-text">
                                ${this.firebaseAvailable ? 'Online (Cloud Sync)' : 'Offline Mode'}
                            </span>
                        </div>
                    </div>
                    <div class="date-display" id="current-date"></div>
                </div>
                
                <!-- Stats Grid -->
                <div class="stats-grid" id="dashboard-stats">
                    <!-- Stats will be loaded here -->
                </div>
                
                <!-- Quick Actions -->
                <div class="actions-grid">
                    <a href="./attendance.html" class="action-card">
                        <div class="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                        </div>
                        <h4>Take Attendance</h4>
                        <p>Record attendance for today</p>
                    </a>

                    <a href="./reports.html" class="action-card">
                        <div class="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                        <h4>View Reports</h4>
                        <p>Generate attendance reports</p>
                    </a>

                    <a href="./setup.html" class="action-card">
                        <div class="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </div>
                        <h4>Setup Classes</h4>
                        <p>Add classes and students</p>
                    </a>

                    <a href="./settings.html" class="action-card">
                        <div class="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </div>
                        <h4>Settings</h4>
                        <p>Configure app preferences</p>
                    </a>
                </div>
                
                <!-- Recent Activity -->
                <div class="recent-activity">
                    <div class="activity-header">
                        <h3>Recent Activity</h3>
                        <button class="btn-refresh" onclick="window.app.refreshDashboard()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M23 4v6h-6"></path>
                                <path d="M1 20v-6h6"></path>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                            Refresh
                        </button>
                    </div>
                    <div class="activity-list" id="recent-activity">
                        <!-- Activity items will be loaded here -->
                        <div class="activity-item">
                            <div class="activity-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <div class="activity-content">
                                <p>Loading recent activity...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Update date display
        const currentDate = document.getElementById('current-date');
        if (currentDate) {
            currentDate.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // Load dashboard data
        this.loadDashboardData();
    }

    // ========== RENDER ATTENDANCE ============
    renderAttendance() {
    const appContainer = document.getElementById('app-container');
    if (!appContainer) return;
    
    // Get current date for display
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    appContainer.innerHTML = `
        <div class="attendance-page">
            <div class="attendance-header">
                <div class="header-top">
                    <div>
                        <div class="date-display">${dateStr}</div>
                        <div class="term-week-display" id="term-week">Term 1 • Week 1</div>
                    </div>
                    <div class="session-tabs">
                        <button class="session-tab active" data-session="morning">
                            <span class="session-indicator am-indicator"></span>
                            Morning Session
                        </button>
                        <button class="session-tab" data-session="afternoon">
                            <span class="session-indicator pm-indicator"></span>
                            Afternoon Session
                        </button>
                    </div>
                </div>
                
                <div class="quick-actions">
                    <button class="quick-action-btn" onclick="window.app.markAllPresent()">
                        Mark All Present
                    </button>
                    <button class="quick-action-btn" onclick="window.app.markAllAbsent()">
                        Mark All Absent
                    </button>
                    <button class="quick-action-btn" onclick="window.app.clearAllAttendance()">
                        Clear All
                    </button>
                </div>
            </div>
            
            <div class="attendance-container">
                <!-- Classes Panel -->
                <div class="classes-panel">
                    <h3>Select Class</h3>
                    <div class="search-box">
                        <input type="text" id="class-search" placeholder="Search classes..." 
                               onkeyup="window.app.filterClasses(this.value)">
                    </div>
                    <div class="classes-list" id="classes-list">
                        <div class="loading-classes">
                            <div class="loading-spinner" style="width: 20px; height: 20px;"></div>
                            Loading classes...
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <button class="btn btn-secondary btn-block" onclick="window.app.goToPage('setup.html')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add New Class
                        </button>
                    </div>
                </div>
                
                <!-- Attendance Table -->
                <div class="attendance-table-container">
                    <div class="table-header">
                        <h3 id="selected-class-title">Select a class to begin</h3>
                        <div class="class-info" id="class-info"></div>
                    </div>
                    
                    <div id="attendance-table-wrapper">
                        <div class="empty-state">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            <h4>No Class Selected</h4>
                            <p>Select a class from the left panel to take attendance</p>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-secondary" onclick="window.app.clearAttendance()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Clear
                        </button>
                        <button class="btn btn-primary" onclick="window.app.saveAttendance()" id="save-attendance-btn" disabled>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            Save Attendance
                        </button>
                        <button class="btn btn-secondary" onclick="window.app.printAttendance()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                            Print/Export
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize attendance functionality
    this.initAttendanceFunctionality();
}
    
    // ========== RENDER SETTUP ================
    renderSetup() {
    const appContainer = document.getElementById('app-container');
    if (!appContainer) return;
    
    appContainer.innerHTML = `
        <div class="setup-page">
            <div class="setup-header">
                <h2>Setup Classes & Students</h2>
                <p>Configure your classes, add students, and manage your school setup</p>
            </div>
            
            <div class="setup-container">
                <!-- Setup Tabs -->
                <div class="setup-tabs">
                    <button class="setup-tab active" data-tab="classes">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                        Classes
                    </button>
                    <button class="setup-tab" data-tab="students">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Students
                    </button>
                    <button class="setup-tab" data-tab="import">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Import/Export
                    </button>
                    <button class="setup-tab" data-tab="school">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        School Info
                    </button>
                </div>
                
                <!-- Tab Content -->
                <div class="setup-content">
                    <!-- Classes Tab -->
                    <div class="tab-content active" id="classes-tab">
                        <div class="tab-header">
                            <h3>Manage Classes</h3>
                            <button class="btn btn-primary" onclick="window.app.showAddClassModal()">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                Add New Class
                            </button>
                        </div>
                        
                        <div class="classes-list-container">
                            <div id="classes-list-setup">
                                <div class="loading-state">
                                    <div class="loading-spinner"></div>
                                    <p>Loading classes...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Students Tab -->
                    <div class="tab-content" id="students-tab">
                        <div class="tab-header">
                            <h3>Manage Students</h3>
                            <div class="tab-actions">
                                <select id="class-filter" class="form-control" onchange="window.app.filterStudentsByClass(this.value)">
                                    <option value="">All Classes</option>
                                </select>
                                <button class="btn btn-primary" onclick="window.app.showAddStudentModal()">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Add Student
                                </button>
                            </div>
                        </div>
                        
                        <div class="students-list-container">
                            <div id="students-list">
                                <div class="empty-state">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                    </svg>
                                    <h4>No Students Found</h4>
                                    <p>Add students or select a class to view students</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Import/Export Tab -->
                    <div class="tab-content" id="import-tab">
                        <div class="import-section">
                            <h3>Import Data</h3>
                            <p>Import classes and students from Excel/CSV files</p>
                            <div class="import-zone" id="import-zone">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="1">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                <p>Drag & drop Excel or CSV files here</p>
                                <p class="small">or</p>
                                <input type="file" id="import-file" accept=".csv,.xlsx,.xls" hidden>
                                <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">
                                    Browse Files
                                </button>
                            </div>
                        </div>
                        
                        <div class="export-section">
                            <h3>Export Data</h3>
                            <p>Export your attendance data for backup or analysis</p>
                            <div class="export-options">
                                <button class="btn btn-secondary" onclick="window.app.exportToCSV()">
                                    Export to CSV
                                </button>
                                <button class="btn btn-secondary" onclick="window.app.exportToExcel()">
                                    Export to Excel
                                </button>
                                <button class="btn btn-secondary" onclick="window.app.backupData()">
                                    Backup All Data
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- School Info Tab -->
                    <div class="tab-content" id="school-tab">
                        <div class="school-info-form">
                            <h3>School Information</h3>
                            <form id="school-form">
                                <div class="form-group">
                                    <label>School Name</label>
                                    <input type="text" id="school-name" class="form-control" 
                                           value="${this.user?.school || ''}" placeholder="Enter school name">
                                </div>
                                <div class="form-group">
                                    <label>School Address</label>
                                    <textarea id="school-address" class="form-control" rows="3" 
                                              placeholder="Enter school address"></textarea>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Academic Year</label>
                                        <input type="text" id="academic-year" class="form-control" 
                                               placeholder="e.g., 2024-2025">
                                    </div>
                                    <div class="form-group">
                                        <label>Current Term</label>
                                        <select id="current-term" class="form-control">
                                            <option value="1">Term 1</option>
                                            <option value="2">Term 2</option>
                                            <option value="3">Term 3</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-actions">
                                    <button type="button" class="btn btn-secondary" onclick="window.app.resetSchoolForm()">
                                        Reset
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        Save School Info
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize setup functionality
    this.initSetupFunctionality();
}

    // ========== RENDER REPORTS ===============
     renderReports() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="reports-page">
                <div class="reports-header">
                    <h2>Attendance Reports</h2>
                    <p>Generate and analyze attendance data</p>
                </div>
                
                <div class="filters-section">
                    <h3>Report Filters</h3>
                    <div class="filter-grid">
                        <div class="form-group">
                            <label>Select Class</label>
                            <select id="report-class" class="form-control">
                                <option value="">All Classes</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" id="report-start-date" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" id="report-end-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group">
                            <label>Report Type</label>
                            <select id="report-type" class="form-control">
                                <option value="daily">Daily Summary</option>
                                <option value="weekly">Weekly Report</option>
                                <option value="monthly">Monthly Report</option>
                                <option value="student">Student Report</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-top: 20px; text-align: right;">
                        <button class="btn btn-primary" onclick="window.app.generateReport()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                            Generate Report
                        </button>
                    </div>
                </div>
                
                <div id="report-results">
                    <!-- Report results will be displayed here -->
                    <div class="loading-state" style="padding: 40px;">
                        <p>Select filters and generate a report</p>
                    </div>
                </div>
            </div>
        `;
        
        // Set default dates
        const startDate = document.getElementById('report-start-date');
        if (startDate) {
            const firstDay = new Date();
            firstDay.setDate(1);
            startDate.value = firstDay.toISOString().split('T')[0];
        }
    }
    
    // ================== RENDER SETTINGS ==================
    renderSettings() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="settings-page">
                <div class="settings-header">
                    <h2>Settings</h2>
                    <p>Configure your attendance system</p>
                </div>
                
                <div class="settings-grid">
                    <div class="settings-nav">
                        <div class="nav-section">
                            <h4>Account</h4>
                            <button class="nav-btn active" data-tab="profile">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                Profile
                            </button>
                            <button class="nav-btn" data-tab="security">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                Security
                            </button>
                        </div>
                        
                        <div class="nav-section">
                            <h4>Preferences</h4>
                            <button class="nav-btn" data-tab="display">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                Display
                            </button>
                            <button class="nav-btn" data-tab="notifications">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                </svg>
                                Notifications
                            </button>
                        </div>
                        
                        <div class="nav-section">
                            <h4>System</h4>
                            <button class="nav-btn" data-tab="data">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"></path>
                                </svg>
                                Data Management
                            </button>
                            <button class="nav-btn" data-tab="about">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                About
                            </button>
                        </div>
                    </div>
                    
                    <div class="settings-content">
                        <div id="settings-tab-content">
                            <!-- Tab content will be loaded here -->
                            <div class="tab-content active" id="profile-tab">
                                <h3>Profile Settings</h3>
                                <p>Loading profile settings...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.loadSettings();
    }

    // ==================== HELPER METHODS ====================
    // ==================== ATTENDANCE PAGE HELPERS ====================
initAttendanceFunctionality() {
    console.log('📋 Initializing attendance functionality...');
    
    // Load classes for sidebar
    this.loadClassesForAttendance();
    
    // Setup session tabs
    this.setupSessionTabs();
    
    // Setup date display
    this.updateAttendanceDate();
    
    // Setup event listeners
    this.setupAttendanceListeners();
}

loadClassesForAttendance() {
    const classes = Storage.get('classes') || [];
    const classesList = document.getElementById('classes-list');
    
    if (!classesList) return;
    
    if (classes.length === 0) {
        classesList.innerHTML = `
            <div class="empty-classes">
                <p>No classes found. Please setup classes first.</p>
                <button class="btn btn-secondary btn-sm" onclick="window.app.goToPage('setup.html')">
                    Go to Setup
                </button>
            </div>
        `;
        return;
    }
    
    classesList.innerHTML = classes.map(cls => `
        <div class="class-item" data-class-id="${cls.id}" onclick="window.app.selectClass('${cls.id}')">
            <div class="class-name">${cls.name}</div>
            <div class="class-info">
                <span class="class-grade">${cls.grade || ''}</span>
                <span class="class-count">${cls.studentCount || 0} students</span>
            </div>
        </div>
    `).join('');
}

setupSessionTabs() {
    const sessionTabs = document.querySelectorAll('.session-tab');
    sessionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            sessionTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            const session = tab.dataset.session;
            console.log('Switched to session:', session);
            // You can add session-specific logic here
        });
    });
}

updateAttendanceDate() {
    const dateDisplay = document.querySelector('.date-display');
    if (dateDisplay) {
        const today = new Date();
        dateDisplay.textContent = today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

setupAttendanceListeners() {
    // Setup search functionality
    const searchInput = document.getElementById('class-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            this.filterClasses(e.target.value);
        });
    }
}

filterClasses(searchTerm) {
    const classItems = document.querySelectorAll('.class-item');
    const searchLower = searchTerm.toLowerCase();
    
    classItems.forEach(item => {
        const className = item.querySelector('.class-name').textContent.toLowerCase();
        const classGrade = item.querySelector('.class-grade').textContent.toLowerCase();
        
        if (className.includes(searchLower) || classGrade.includes(searchLower)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

selectClass(classId) {
    console.log('Selected class:', classId);
    
    // Remove active class from all class items
    document.querySelectorAll('.class-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected item
    const selectedItem = document.querySelector(`.class-item[data-class-id="${classId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    // Load class details and students
    this.loadClassAttendance(classId);
}

loadClassAttendance(classId) {
    const classes = Storage.get('classes') || [];
    const classData = classes.find(c => c.id === classId);
    
    if (!classData) {
        console.error('Class not found:', classId);
        return;
    }
    
    // Update title
    const title = document.getElementById('selected-class-title');
    if (title) {
        title.textContent = classData.name;
    }
    
    // Update class info
    const classInfo = document.getElementById('class-info');
    if (classInfo) {
        classInfo.innerHTML = `
            <span>Grade: ${classData.grade || 'N/A'}</span>
            <span>Teacher: ${classData.teacher || 'N/A'}</span>
            <span>Students: ${classData.studentCount || 0}</span>
        `;
    }
    
    // Enable save button
    const saveBtn = document.getElementById('save-attendance-btn');
    if (saveBtn) {
        saveBtn.disabled = false;
    }
    
    // Load students for this class
    this.loadStudentsForAttendance(classId);
}

loadStudentsForAttendance(classId) {
    const students = Storage.get('students') || [];
    const classStudents = students.filter(s => s.classId === classId);
    
    const tableWrapper = document.getElementById('attendance-table-wrapper');
    if (!tableWrapper) return;
    
    if (classStudents.length === 0) {
        tableWrapper.innerHTML = `
            <div class="empty-state">
                <h4>No Students in this Class</h4>
                <p>Add students in the setup page</p>
                <button class="btn btn-secondary" onclick="window.app.goToPage('setup.html')">
                    Go to Setup
                </button>
            </div>
        `;
        return;
    }
    
    // Group by year group if available
    const groupedStudents = this.groupStudentsByYear(classStudents);
    
    tableWrapper.innerHTML = `
        <table class="attendance-table">
            <thead>
                <tr>
                    <th>Year Group</th>
                    <th>Class</th>
                    <th>Male Present</th>
                    <th>Male Absent</th>
                    <th>Female Present</th>
                    <th>Female Absent</th>
                    <th>Total Present</th>
                    <th>% Present</th>
                </tr>
            </thead>
            <tbody id="attendance-table-body">
                ${this.generateAttendanceRows(groupedStudents)}
            </tbody>
        </table>
    `;
    
    // Setup attendance input listeners
    this.setupAttendanceInputs();
}

groupStudentsByYear(students) {
    const groups = {};
    
    students.forEach(student => {
        const year = student.yearGroup || 'All';
        if (!groups[year]) {
            groups[year] = { male: 0, female: 0, students: [] };
        }
        groups[year].students.push(student);
        if (student.gender === 'male') {
            groups[year].male++;
        } else {
            groups[year].female++;
        }
    });
    
    return groups;
}

generateAttendanceRows(groupedStudents) {
    let html = '';
    
    for (const [year, data] of Object.entries(groupedStudents)) {
        html += `
            <tr>
                <td class="year-group-cell">${year}</td>
                <td class="class-cell">${data.students[0]?.className || 'N/A'}</td>
                <td>
                    <input type="number" class="attendance-input male-present" 
                           value="0" min="0" max="${data.male}"
                           data-year="${year}" data-gender="male" data-status="present">
                </td>
                <td>
                    <input type="number" class="attendance-input male-absent" 
                           value="${data.male}" min="0" max="${data.male}"
                           data-year="${year}" data-gender="male" data-status="absent" readonly>
                </td>
                <td>
                    <input type="number" class="attendance-input female-present" 
                           value="0" min="0" max="${data.female}"
                           data-year="${year}" data-gender="female" data-status="present">
                </td>
                <td>
                    <input type="number" class="attendance-input female-absent" 
                           value="${data.female}" min="0" max="${data.female}"
                           data-year="${year}" data-gender="female" data-status="absent" readonly>
                </td>
                <td class="total-present" data-year="${year}">0</td>
                <td class="percentage-cell" data-year="${year}">0%</td>
            </tr>
        `;
    }
    
    return html;
}

setupAttendanceInputs() {
    const inputs = document.querySelectorAll('.attendance-input:not([readonly])');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            this.updateAttendanceCalculations(e.target);
        });
    });
}

updateAttendanceCalculations(changedInput) {
    const year = changedInput.dataset.year;
    const gender = changedInput.dataset.gender;
    const status = changedInput.dataset.status;
    
    // Get all inputs for this year
    const malePresent = document.querySelector(`.male-present[data-year="${year}"]`);
    const maleAbsent = document.querySelector(`.male-absent[data-year="${year}"]`);
    const femalePresent = document.querySelector(`.female-present[data-year="${year}"]`);
    const femaleAbsent = document.querySelector(`.female-absent[data-year="${year}"]`);
    
    if (!malePresent || !maleAbsent || !femalePresent || !femaleAbsent) return;
    
    // Calculate absent values (total - present)
    const totalMale = parseInt(malePresent.max);
    const malePresentVal = parseInt(malePresent.value) || 0;
    maleAbsent.value = totalMale - malePresentVal;
    
    const totalFemale = parseInt(femalePresent.max);
    const femalePresentVal = parseInt(femalePresent.value) || 0;
    femaleAbsent.value = totalFemale - femalePresentVal;
    
    // Calculate totals
    const totalPresent = malePresentVal + femalePresentVal;
    const totalStudents = totalMale + totalFemale;
    const percentage = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
    
    // Update totals row
    const totalCell = document.querySelector(`.total-present[data-year="${year}"]`);
    const percentageCell = document.querySelector(`.percentage-cell[data-year="${year}"]`);
    
    if (totalCell) totalCell.textContent = totalPresent;
    if (percentageCell) {
        percentageCell.textContent = `${percentage}%`;
        percentageCell.className = `percentage-cell ${percentage < 50 ? 'low-percentage' : ''}`;
    }
}

markAllPresent() {
    const presentInputs = document.querySelectorAll('.attendance-input[data-status="present"]:not([readonly])');
    presentInputs.forEach(input => {
        const max = parseInt(input.max);
        input.value = max;
        this.updateAttendanceCalculations(input);
    });
}

markAllAbsent() {
    const presentInputs = document.querySelectorAll('.attendance-input[data-status="present"]:not([readonly])');
    presentInputs.forEach(input => {
        input.value = 0;
        this.updateAttendanceCalculations(input);
    });
}

clearAttendance() {
    if (confirm('Clear all attendance data for this class?')) {
        this.markAllAbsent();
    }
}

saveAttendance() {
    const classItem = document.querySelector('.class-item.active');
    if (!classItem) {
        alert('Please select a class first');
        return;
    }
    
    const classId = classItem.dataset.classId;
    const classes = Storage.get('classes') || [];
    const classData = classes.find(c => c.id === classId);
    
    if (!classData) {
        alert('Class not found');
        return;
    }
    
    // Collect attendance data
    const attendanceData = [];
    const rows = document.querySelectorAll('#attendance-table-body tr');
    
    rows.forEach(row => {
        const year = row.querySelector('.year-group-cell').textContent;
        const className = row.querySelector('.class-cell').textContent;
        const malePresent = parseInt(row.querySelector('.male-present').value) || 0;
        const femalePresent = parseInt(row.querySelector('.female-present').value) || 0;
        const totalPresent = malePresent + femalePresent;
        const totalStudents = parseInt(row.querySelector('.male-present').max) + 
                             parseInt(row.querySelector('.female-present').max);
        const percentage = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
        
        attendanceData.push({
            date: new Date().toISOString().split('T')[0],
            classId: classId,
            className: className,
            yearGroup: year,
            malePresent: malePresent,
            femalePresent: femalePresent,
            totalPresent: totalPresent,
            totalStudents: totalStudents,
            percentage: percentage,
            session: document.querySelector('.session-tab.active')?.dataset.session || 'morning',
            recordedBy: this.user?.name || 'Unknown',
            timestamp: new Date().toISOString()
        });
    });
    
    // Save to localStorage
    const existingAttendance = Storage.get('attendance') || [];
    const newAttendance = [...existingAttendance, ...attendanceData];
    Storage.set('attendance', newAttendance);
    
    // Try to save to Firebase if available
    if (this.firebaseAvailable) {
        this.saveAttendanceToFirebase(attendanceData);
    }
    
    alert('Attendance saved successfully!');
    console.log('Attendance saved:', attendanceData);
}

// ==================== SETUP PAGE HELPERS ====================
initSetupFunctionality() {
    console.log('⚙️ Initializing setup functionality...');
    
    // Load existing data
    this.loadSetupData();
    
    // Setup tab switching
    this.setupSetupTabs();
    
    // Setup form handlers
    this.setupFormHandlers();
    
    // Populate class filter
    this.populateClassFilter();
}

setupSetupTabs() {
    const tabs = document.querySelectorAll('.setup-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
}

loadSetupData() {
    // Load classes
    const classes = Storage.get('classes') || [];
    const classesList = document.getElementById('classes-list-setup');
    
    if (classesList) {
        if (classes.length === 0) {
            classesList.innerHTML = `
                <div class="empty-state">
                    <h4>No Classes Yet</h4>
                    <p>Click "Add New Class" to create your first class</p>
                </div>
            `;
        } else {
            classesList.innerHTML = classes.map(cls => `
                <div class="setup-class-item">
                    <div class="class-header">
                        <h4>${cls.name}</h4>
                        <div class="class-actions">
                            <button class="btn-icon" onclick="window.app.editClass('${cls.id}')" title="Edit">
                                ✏️ Edit
                            </button>
                            <button class="btn-icon" onclick="window.app.deleteClass('${cls.id}')" title="Delete">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                    <div class="class-details">
                        <span>Grade: ${cls.grade || 'Not set'}</span>
                        <span>Students: ${cls.studentCount || 0}</span>
                        <span>Teacher: ${cls.teacher || 'Not assigned'}</span>
                    </div>
                </div>
            `).join('');
        }
    }
    
    // Load students count
    this.updateStudentCounts();
}

populateClassFilter() {
    const classFilter = document.getElementById('class-filter');
    if (!classFilter) return;
    
    const classes = Storage.get('classes') || [];
    
    classFilter.innerHTML = `
        <option value="">All Classes</option>
        ${classes.map(cls => `
            <option value="${cls.id}">${cls.name}</option>
        `).join('')}
    `;
}

setupFormHandlers() {
    // School form
    const schoolForm = document.getElementById('school-form');
    if (schoolForm) {
        schoolForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSchoolInfo();
        });
    }
    
    // Import file handler
    const importFile = document.getElementById('import-file');
    if (importFile) {
        importFile.addEventListener('change', (e) => {
            this.handleFileImport(e.target.files[0]);
        });
    }
}

saveSchoolInfo() {
    const schoolName = document.getElementById('school-name').value;
    const schoolAddress = document.getElementById('school-address').value;
    const academicYear = document.getElementById('academic-year').value;
    const currentTerm = document.getElementById('current-term').value;
    
    const schoolInfo = {
        name: schoolName,
        address: schoolAddress,
        academicYear: academicYear,
        currentTerm: currentTerm,
        updatedAt: new Date().toISOString()
    };
    
    // Update user's school info
    if (this.user) {
        this.user.school = schoolName;
        Storage.set('attendance_user', this.user);
    }
    
    // Save school info
    Storage.set('school_info', schoolInfo);
    
    alert('School information saved successfully!');
    console.log('School info saved:', schoolInfo);
}

showAddClassModal() {
    const modalHtml = `
        <div class="modal" id="add-class-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Class</h3>
                    <button class="modal-close" onclick="window.app.closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="add-class-form">
                        <div class="form-group">
                            <label>Class Name *</label>
                            <input type="text" id="class-name" required class="form-control" 
                                   placeholder="e.g., Form 1A, Grade 5B">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Grade/Year</label>
                                <input type="text" id="class-grade" class="form-control" 
                                       placeholder="e.g., Grade 5, Year 7">
                            </div>
                            <div class="form-group">
                                <label>Subject</label>
                                <input type="text" id="class-subject" class="form-control" 
                                       placeholder="e.g., Mathematics, English">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Teacher Name</label>
                            <input type="text" id="class-teacher" class="form-control" 
                                   value="${this.user?.name || ''}" placeholder="Teacher's name">
                        </div>
                        <div class="form-group">
                            <label>Class Description</label>
                            <textarea id="class-description" class="form-control" rows="3" 
                                      placeholder="Optional description"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="window.app.saveNewClass()">Save Class</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

closeModal() {
    const modal = document.getElementById('add-class-modal');
    if (modal) {
        modal.remove();
    }
}

saveNewClass() {
    const className = document.getElementById('class-name').value;
    const classGrade = document.getElementById('class-grade').value;
    const classSubject = document.getElementById('class-subject').value;
    const classTeacher = document.getElementById('class-teacher').value;
    const classDescription = document.getElementById('class-description').value;
    
    if (!className) {
        alert('Please enter a class name');
        return;
    }
    
    const newClass = {
        id: 'class_' + Date.now(),
        name: className,
        grade: classGrade,
        subject: classSubject,
        teacher: classTeacher,
        description: classDescription,
        studentCount: 0,
        createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    const classes = Storage.get('classes') || [];
    classes.push(newClass);
    Storage.set('classes', classes);
    
    // Close modal and refresh
    this.closeModal();
    this.loadSetupData();
    
    alert('Class added successfully!');
    console.log('New class saved:', newClass);
}

editClass(classId) {
    const classes = Storage.get('classes') || [];
    const classData = classes.find(c => c.id === classId);
    
    if (!classData) {
        alert('Class not found');
        return;
    }
    
    // Similar modal to add class but with pre-filled values
    // Implementation similar to showAddClassModal but with edit functionality
    console.log('Edit class:', classId, classData);
}

deleteClass(classId) {
    if (!confirm('Are you sure you want to delete this class? This will also delete all students in this class.')) {
        return;
    }
    
    // Delete class
    let classes = Storage.get('classes') || [];
    classes = classes.filter(c => c.id !== classId);
    Storage.set('classes', classes);
    
    // Delete students in this class
    let students = Storage.get('students') || [];
    students = students.filter(s => s.classId !== classId);
    Storage.set('students', students);
    
    // Refresh display
    this.loadSetupData();
    
    alert('Class deleted successfully');
}

showAddStudentModal() {
    // Similar modal for adding students
    console.log('Show add student modal');
}

updateStudentCounts() {
    const classes = Storage.get('classes') || [];
    const students = Storage.get('students') || [];
    
    // Update student counts in classes
    classes.forEach(cls => {
        const studentCount = students.filter(s => s.classId === cls.id).length;
        cls.studentCount = studentCount;
    });
    
    Storage.set('classes', classes);
}

exportToCSV() {
    console.log('Exporting to CSV...');
    // CSV export logic
}

exportToExcel() {
    console.log('Exporting to Excel...');
    // Excel export logic
}

backupData() {
    const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        user: this.user,
        classes: Storage.get('classes') || [],
        students: Storage.get('students') || [],
        attendance: Storage.get('attendance') || [],
        settings: Storage.get('settings') || {}
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `attendance-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    console.log('Backup created:', backup);
}

// ==================== GENERAL HELPERS ====================
goToPage(page) {
    window.location.href = page;
}

showError(message) {
    console.error('Error:', message);
    alert(`Error: ${message}`);
}
    
    // ========== FIREBASE AUTH METHODS ==========
    async syncLocalUserToFirebase(localUser) {
        try {
            // Dynamically import Firebase to avoid loading errors
            const { auth } = await import('./firebase.js');
            
            // If Firebase user already exists, we're good
            if (auth.currentUser) {
                console.log('Firebase user already logged in:', auth.currentUser.email);
                return true;
            }
            
            // Try to login with Firebase using localStorage credentials
            const { signInWithEmailAndPassword } = await import(
                'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js'
            );
            
            // Use the email from localStorage or default
            const email = localUser.email || 'teacher@school.edu';
            const password = 'demo123'; // Default password for Firebase
            
            console.log('Attempting Firebase auto-login for:', email);
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Firebase auto-login successful:', userCredential.user.email);
            
            // Update localStorage user with Firebase UID
            this.state.currentUser.id = userCredential.user.uid;
            Storage.set('attendance_user', this.state.currentUser);
            
            return true;
            
        } catch (error) {
            console.log('Firebase auto-login failed, continuing with localStorage:', error.message);
            
            // If user doesn't exist in Firebase, create it
            if (error.code === 'auth/user-not-found') {
                return await this.createFirebaseUser(
                    localUser.email || 'teacher@school.edu',
                    'demo123',
                    localUser.name || 'Teacher'
                );
            }
            
            return false;
        }
    }

    async createFirebaseUser(email, password, name) {
        try {
            const { createUserWithEmailAndPassword } = await import(
                'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js'
            );
            const { auth } = await import('./firebase.js');
            
            console.log('Creating new Firebase user:', email);
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Firebase user created:', user.email);
            
            // Update localStorage with new Firebase user info
            this.state.currentUser = {
                id: user.uid,
                email: user.email,
                name: name || user.email.split('@')[0],
                role: 'teacher'
            };
            
            Storage.set('attendance_user', this.state.currentUser);
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to create Firebase user:', error);
            return false;
        }
    }

    async checkFirebaseAuth() {
        try {
            const { auth } = await import('./firebase.js');
            
            console.log('Firebase auth object:', auth);
            console.log('Current user:', auth.currentUser);
            
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
            console.log('Falling back to localStorage authentication');
            return false;
        }
    }

    // ========== LOGIN HANDLER (for login page) ==========
    async handleLogin() {
        const email = document.getElementById('email')?.value || 'teacher@school.edu';
        const password = document.getElementById('password')?.value || 'demo123';
        
        console.log('Attempting Firebase login with:', email);
        
        try {
            // Import Firebase auth functions
            const { signInWithEmailAndPassword } = await import(
                'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js'
            );
            const { auth } = await import('./firebase.js');
            
            // Try Firebase login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Firebase login successful:', user.email);
            
            // Update user in state
            this.state.currentUser = {
                id: user.uid,
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                role: 'teacher'
            };
            
            // Save to localStorage
            Storage.set('attendance_user', this.state.currentUser);
            
            Utils.showToast('Firebase login successful!', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                this.goToDashboard();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Firebase login error:', error.code, error.message);
            
            // Check if it's a "user-not-found" error
            if (error.code === 'auth/user-not-found') {
                // Create the user first, then login
                await this.createFirebaseUser(email, password, email.split('@')[0]);
                Utils.showToast('New account created! Logged in.', 'success');
                
                setTimeout(() => {
                    this.goToDashboard();
                }, 1000);
                
            } else if (error.code === 'auth/wrong-password') {
                Utils.showToast('Wrong password. Try "demo123"', 'error');
            } else {
                Utils.showToast(`Login failed: ${error.message}`, 'error');
                // Fallback to demo mode
                this.startDemoMode();
            }
        }
    }

    // ========== HEADER & UI METHODS ==========
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
                                <div class="user-auth" style="font-size: 0.8rem; color: #666;">
                                    ${this.state.currentUser.id?.startsWith('demo-') ? 'Demo Mode' : 'Firebase'}
                                </div>
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

    // ========== PAGE CONTENT METHODS ==========
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
                                value="teacher@school.edu"
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
                            Sign In with Firebase
                        </button>
                        
                        <div class="login-options">
                            <button type="button" class="btn btn-link" onclick="app.startDemoMode()">
                                Try Demo Mode (No Firebase)
                            </button>
                            <button type="button" class="btn btn-link" onclick="app.goToIndex()">
                                Back to Home
                            </button>
                        </div>
                        
                        <div id="firebase-status" style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px; text-align: center;">
                            <small>Firebase Status: <span id="status-text">Checking...</span></small>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Add Firebase status check
        setTimeout(async () => {
            try {
                const { auth } = await import('./firebase.js');
                const statusText = document.getElementById('status-text');
                
                if (auth) {
                    statusText.textContent = 'Connected ✅';
                    statusText.style.color = '#28a745';
                } else {
                    statusText.textContent = 'Not connected ❌';
                    statusText.style.color = '#dc3545';
                }
            } catch (error) {
                document.getElementById('status-text').textContent = 'Error loading Firebase';
                document.getElementById('status-text').style.color = '#dc3545';
            }
        }, 100);
        
        // Setup login form handler
        this.setupPageHandlers();
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
                                Login with Firebase
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

// In attendance-app.js - Update the loadDashboardContent function
async loadDashboardContent() {
    console.log("📊 Loading dashboard content...");
    
    try {
        // Dynamically import the dashboard module
        const dashboardModule = await import('./dashboard.js');
        
        // Check if DashboardManager is available
        if (dashboardModule && dashboardModule.DashboardManager) {
            // Initialize the dashboard
            this.dashboardManager = new dashboardModule.DashboardManager();
            console.log("✅ DashboardManager initialized successfully");
        } else {
            throw new Error("DashboardManager not found in module");
        }
    } catch (error) {
        console.error("❌ Failed to load dashboard module:", error);
        
        // Fallback: Try to load globally if module loading failed
        if (window.DashboardManager) {
            console.log("🔄 Falling back to global DashboardManager");
            this.dashboardManager = new window.DashboardManager();
        } else {
            // Last resort: Create a basic dashboard
            this.createBasicDashboard();
        }
    }
}

// Fallback function if module loading fails
createBasicDashboard() {
    console.log("🛠️ Creating basic dashboard...");
    
    // Update dashboard cards with sample data
    const stats = {
        'total-students': 425,
        'present-today': 398,
        'absent-today': 27,
        'attendance-rate': '93.6%',
        'total-classes': 24,
        'total-teachers': 38
    };
    
    Object.keys(stats).forEach(cardId => {
        const element = document.getElementById(cardId);
        if (element) {
            element.textContent = stats[cardId];
        }
    });
}

    async loadAttendanceContent(container) {
        if (!this.state.currentUser) {
            this.goToLogin();
            return;
        }
        
        // Import AttendanceManager dynamically
        import('./attendance.js').then(module => {
            this.attendanceManager = new module.AttendanceManager(this);
            this.attendanceManager.init();
        }).catch(error => {
            console.error('Failed to load attendance module:', error);
            this.loadBasicAttendanceContent(container);
        });
    }

    async loadBasicDashboardContent(container) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📊</div>
                <h2>Dashboard</h2>
                <p>Welcome to Attendance Track v2</p>
                <button class="btn btn-primary" onclick="app.goToAttendance()">
                    Take Attendance
                </button>
            </div>
        `;
    }

    async loadBasicAttendanceContent(container) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📋</div>
                <h2>Attendance</h2>
                <p>Loading attendance system...</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    Retry
                </button>
            </div>
        `;
    }

    // ========== NAVIGATION METHODS ==========
    navigateTo(page) {
        console.log(`Navigating to: ${page}`);
        const basePath = this.getBasePath();
        const targetUrl = basePath + page + '.html';
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

    // ========== AUTH METHODS ==========
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
        // Try Firebase logout if available
        import('./firebase.js').then(({ auth }) => {
            import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js').then(({ signOut }) => {
                signOut(auth).catch(error => {
                    console.log('Firebase logout error (may not be logged in):', error);
                });
            });
        }).catch(error => {
            console.log('Firebase not available for logout');
        });
        
        // Clear local data
        Storage.remove('attendance_user');
        Storage.remove('demo_mode');
        this.state.currentUser = null;
        
        Utils.showToast('Logged out successfully', 'success');
        
        setTimeout(() => {
            this.goToIndex();
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

    // ... add other page content methods as needed
}

// Create global instance
window.app = new AttendanceApp();
