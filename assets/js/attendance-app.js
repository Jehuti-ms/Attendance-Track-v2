// attendance-app.js - REORGANIZED & FIXED VERSION
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

class AttendanceApp {
    constructor() {
        console.log('🎯 AttendanceApp constructor');
        
        this.state = {
            currentUser: null,
            currentPage: this.getCurrentPage(),
            isOnline: navigator.onLine,
            settings: Storage.get('app_settings', {})
        };

        this.user = null;
        this.firebaseAvailable = false;
        
        // Initialize app
        this.init();
    }

    // ==================== CORE METHODS ====================
    getCurrentPage() {
        const path = window.location.pathname;
        console.log('📄 Path for getCurrentPage:', path);
        
        let page = path.split('/').pop() || 'index.html';
        console.log('📄 Page after split:', page);
        
        // Remove .html and any query parameters
        page = page.replace('.html', '').split('?')[0];
        console.log('📄 Final page name:', page);
        
        // Handle empty page (root)
        if (page === '' || page === '/' || page === 'index') {
            return 'index';
        }
        
        return page;
    }

    getBasePath() {
        const pathname = window.location.pathname;
        
        // Handle different deployment scenarios
        if (pathname.includes('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        } else if (pathname === '/Attendance-Track-v2' || pathname.endsWith('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        }
        return '/';
    }

    // ==================== INITIALIZATION ====================
    async init() {
        console.log('🚀 Initializing AttendanceApp...');
        
        // DEBUG: Check current state
        console.log('=== INIT DEBUG ===');
        console.log('Current page:', this.state.currentPage);
        console.log('Pathname:', window.location.pathname);
        console.log('Full URL:', window.location.href);
        
        const storedUser = localStorage.getItem('attendance_user');
        console.log('Stored user raw:', storedUser);
        console.log('Stored user parsed:', JSON.parse(storedUser || 'null'));
        console.log('=== END DEBUG ===');

        // Force service worker update
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    registration.update();
                }
            });
        }
        
        try {
            // 1. Get current page and user
            const currentPage = this.state.currentPage;
            const authResult = await this.checkAuth();
            const hasUser = authResult.success;
            
            console.log(`📄 Page: ${currentPage}, Has user: ${hasUser}`);
            
            // 2. Define which pages are public
            const publicPages = ['index', 'login', 'setup']; // ADDED 'setup' to public pages
            const isPublicPage = publicPages.includes(currentPage);
            
            // 3. DECISION MATRIX:
            console.log(`Decision: Public page? ${isPublicPage}, Has user? ${hasUser}`);
            
            // CASE 1: User logged in AND on public page → redirect to dashboard
            if (hasUser && isPublicPage && currentPage !== 'setup') {
                console.log('⚠️ Logged-in user on public page → redirecting to dashboard');
                window.location.replace('dashboard.html');
                return; // STOP here
            }
            
            // CASE 2: No user AND on protected page → redirect to index
            if (!hasUser && !isPublicPage) {
                console.log('🔒 No user on protected page → redirecting to index');
                window.location.replace('index.html');
                return; // STOP here
            }
            
            // CASE 3: User logged in AND on protected page → CONTINUE
            if (hasUser && !isPublicPage) {
                console.log('✅ Authenticated user accessing protected page');
                this.user = authResult.user;
                this.state.currentUser = authResult.user;
                
                // Try Firebase sync (non-blocking)
                this.syncLocalUserToFirebase().catch(err => {
                    console.log('Firebase sync optional:', err.message);
                });
            }
            
            // CASE 4: No user AND on public page → CONTINUE (show login form)
            if (!hasUser && isPublicPage) {
                console.log('👋 No user on public page → showing login form');
                this.user = null;
                this.state.currentUser = null;
            }
            
            // 4. Continue with app initialization (only if no redirect happened)
            console.log('Continuing with app initialization...');
            
            // Setup page specific initialization
            if (currentPage === 'setup') {
                await this.initSetupPage();
            } else {
                // Load UI components (header/footer only for protected pages)
                if (!isPublicPage) {
                    await this.loadUIComponents();
                }
                
                // Load page-specific content
                await this.loadPageContent();
            }
            
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

    // ==================== SETUP PAGE INITIALIZATION ====================
    async initSetupPage() {
        console.log('⚙️ Initializing setup page...');
        
        // Check if user is authenticated
        const authResult = await this.checkAuth();
        if (!authResult.success) {
            // If not authenticated, show login button
            this.renderSetupPageForGuest();
            return;
        }
        
        // User is authenticated, load full setup page
        this.user = authResult.user;
        this.state.currentUser = authResult.user;
        
        // Load UI components
        await this.loadUIComponents();
        
        // Render setup page content
        await this.loadPageContent();
        
        // Initialize setup page functionality
        this.initializeSetupPage();
    }

    renderSetupPageForGuest() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
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
    }

    // ==================== AUTHENTICATION ====================
    async checkAuth() {
        console.log("🔐 Performing auth check...");
        
        try {
            // Get user from localStorage
            const userJson = localStorage.getItem('attendance_user');
            console.log('Raw user from localStorage:', userJson);
            
            if (!userJson) {
                console.log("❌ No user found in localStorage");
                return { success: false, user: null };
            }
            
            const user = JSON.parse(userJson);
            console.log('Parsed user:', user);
            
            // Check if user has required properties
            if (!user || !user.email) {
                console.log("❌ Invalid user object - missing email");
                localStorage.removeItem('attendance_user'); // Clean up invalid data
                return { success: false, user: null };
            }
            
            console.log(`✅ User authenticated: ${user.email}`);
            return { success: true, user };
            
        } catch (error) {
            console.error("❌ Error in checkAuth:", error);
            return { success: false, user: null };
        }
    }

    // ==================== PAGE CONTENT LOADING ====================
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
            // Clear loading state
            appContainer.innerHTML = '';
            
            switch(currentPage) {
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
                default:
                    this.showPageNotFound(appContainer);
            }
        } catch (error) {
            console.error(`❌ Error loading ${currentPage} content:`, error);
            this.showError(`Failed to load ${currentPage} page`);
        }
    }

    // ==================== PAGE CONTENT RENDERERS ====================
    async loadIndexContent(container) {
        if (!container) {
            console.error('❌ No container provided for index page');
            return;
        }
        
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
        if (!container) {
            console.error('❌ No container provided for login page');
            return;
        }
        
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
        
        // Setup login form handler
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }

    loadDashboardContent(container) {
        if (!this.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="dashboard-page">
                <div class="dashboard-header">
                    <div class="header-content">
                        <div class="welcome-text">
                            <h2>Welcome, ${this.user.name || 'Teacher'}!</h2>
                            <p>Here's your attendance overview</p>
                        </div>
                        <div class="connection-status" id="connection-status">
                            <span class="status-dot ${this.state.isOnline ? 'connected' : 'offline'}"></span>
                            <span class="status-text">
                                ${this.state.isOnline ? 'Online' : 'Offline Mode'}
                            </span>
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
                
                <!-- Stats Grid -->
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
                
                <!-- Quick Actions -->
                <div class="actions-grid">
                    <a href="attendance.html" class="action-card">
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

                    <a href="reports.html" class="action-card">
                        <div class="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                        <h4>View Reports</h4>
                        <p>Generate attendance reports</p>
                    </a>

                    <a href="setup.html" class="action-card">
                        <div class="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </div>
                        <h4>Setup Classes</h4>
                        <p>Add classes and students</p>
                    </a>

                    <a href="settings.html" class="action-card">
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
                        <div class="activity-item">
                            <div class="activity-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <div class="activity-content">
                                <p>Welcome to Attendance Tracker v2!</p>
                                <small>${new Date().toLocaleDateString()}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load dashboard data
        this.loadDashboardData();
    }

    // ==================== SETUP PAGE ====================
    loadSetupContent(container) {
        if (!this.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
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
                        </div>
                        
                        <!-- Classes Tab -->
                        <div class="tab-content active" id="classes-tab">
                            <div class="section-title">Class Management</div>
                            <div class="setup-form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Class Name</label>
                                        <input type="text" id="className" class="form-input" placeholder="e.g., Grade 10 Mathematics">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Class Code</label>
                                        <input type="text" id="classCode" class="form-input" placeholder="e.g., 10MATHS">
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Year Group</label>
                                        <input type="text" id="yearGroup" class="form-input" placeholder="e.g., 10">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Subject</label>
                                        <input type="text" id="subject" class="form-input" placeholder="e.g., Mathematics">
                                    </div>
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
                        
                        <!-- Students Tab -->
                        <div class="tab-content" id="students-tab">
                            <div class="section-title">Student Management</div>
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
                                            <option value="other">Other</option>
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
                        
                        <!-- Import Tab -->
                        <div class="tab-content" id="import-tab">
                            <div class="section-title">Data Import</div>
                            <div class="import-container">
                                <div class="import-zone" id="import-zone">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drag & drop CSV file here</p>
                                    <p>or click to browse</p>
                                    <input type="file" id="import-file" accept=".csv" style="display: none;">
                                </div>
                                
                                <div class="import-options">
                                    <div class="form-group">
                                        <label class="form-label">Import Type</label>
                                        <select id="import-type" class="form-input">
                                            <option value="students">Students</option>
                                            <option value="classes">Classes</option>
                                            <option value="attendance">Attendance</option>
                                        </select>
                                    </div>
                                    
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="overwrite-data">
                                            <span>Overwrite existing data</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="create-missing" checked>
                                            <span>Create missing classes/students</span>
                                        </label>
                                    </div>
                                    
                                    <div class="actions-container">
                                        <button class="action-btn save-btn" id="process-import">
                                            <i class="fas fa-file-import"></i> Process Import
                                        </button>
                                        <button class="action-btn secondary-btn" id="download-template">
                                            <i class="fas fa-download"></i> Download Template
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="import-instructions">
                                <h4>Import Instructions:</h4>
                                <ul>
                                    <li>Download the template for your import type</li>
                                    <li>Fill in the data following the template format</li>
                                    <li>Save as CSV file</li>
                                    <li>Drag and drop or browse to import</li>
                                </ul>
                            </div>
                        </div>
                        
                        <!-- System Settings Tab -->
                        <div class="tab-content" id="system-tab">
                            <div class="section-title">System Configuration</div>
                            
                            <div class="setup-form">
                                <div class="form-group">
                                    <label class="form-label">School Name</label>
                                    <input type="text" id="schoolName" class="form-input" placeholder="Enter school name">
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Current Term</label>
                                        <select id="currentTerm" class="form-input">
                                            <option value="1">Term 1</option>
                                            <option value="2">Term 2</option>
                                            <option value="3">Term 3</option>
                                            <option value="4">Term 4</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Academic Year</label>
                                        <input type="text" id="academicYear" class="form-input" placeholder="e.g., 2023-2024">
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Attendance Sessions</label>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="am-session" checked>
                                            <span>Morning Session (AM)</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="pm-session" checked>
                                            <span>Afternoon Session (PM)</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="actions-container">
                                    <button class="action-btn save-btn" id="save-system-settings">
                                        <i class="fas fa-save"></i> Save System Settings
                                    </button>
                                    <button class="action-btn cancel-btn" id="reset-system-settings">
                                        <i class="fas fa-undo"></i> Reset to Defaults
                                    </button>
                                </div>
                            </div>
                            
                            <div class="section-title">Data Management</div>
                            
                            <div class="setup-form">
                                <div class="form-group">
                                    <label class="form-label">Backup Data</label>
                                    <p class="form-hint">Export all data to JSON file</p>
                                    <button class="action-btn save-btn" id="backup-data">
                                        <i class="fas fa-download"></i> Create Backup
                                    </button>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Restore Data</label>
                                    <p class="form-hint">Import from backup file</p>
                                    <button class="action-btn secondary-btn" id="restore-data">
                                        <i class="fas fa-upload"></i> Restore Backup
                                    </button>
                                </div>
                                
                                <div class="form-group warning-form">
                                    <label class="form-label">Clear All Data</label>
                                    <p class="form-hint warning-text">
                                        <i class="fas fa-exclamation-triangle"></i> 
                                        This will delete ALL data including classes, students, and attendance records
                                    </p>
                                    <button class="action-btn delete-btn" id="clear-all-data">
                                        <i class="fas fa-trash-alt"></i> Clear All Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
        
        // Initialize setup page
        this.initializeSetupPage();
    }

    // ==================== SETUP PAGE METHODS ====================
    initializeSetupPage() {
        // Tab switching
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
                
                // Load data for active tab
                if (tabId === 'classes') {
                    this.loadClassesList();
                } else if (tabId === 'students') {
                    this.loadStudentsList();
                    this.populateClassDropdown();
                } else if (tabId === 'system') {
                    this.loadSystemSettings();
                }
            });
        });
        
        // Class management
        const saveClassBtn = document.getElementById('save-class');
        const clearClassBtn = document.getElementById('clear-class');
        
        if (saveClassBtn) {
            saveClassBtn.addEventListener('click', () => this.saveClass());
        }
        
        if (clearClassBtn) {
            clearClassBtn.addEventListener('click', () => this.clearClassForm());
        }
        
        // Student management
        const saveStudentBtn = document.getElementById('save-student');
        const clearStudentBtn = document.getElementById('clear-student');
        
        if (saveStudentBtn) {
            saveStudentBtn.addEventListener('click', () => this.saveStudent());
        }
        
        if (clearStudentBtn) {
            clearStudentBtn.addEventListener('click', () => this.clearStudentForm());
        }
        
        // Import functionality
        const importZone = document.getElementById('import-zone');
        const importFile = document.getElementById('import-file');
        const processImportBtn = document.getElementById('process-import');
        const downloadTemplateBtn = document.getElementById('download-template');
        
        if (importZone && importFile) {
            importZone.addEventListener('click', () => importFile.click());
            importZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                importZone.style.borderColor = '#3498db';
                importZone.style.background = '#f0f7ff';
            });
            importZone.addEventListener('dragleave', () => {
                importZone.style.borderColor = '#ddd';
                importZone.style.background = '#f8f9fa';
            });
            importZone.addEventListener('drop', (e) => {
                e.preventDefault();
                importZone.style.borderColor = '#ddd';
                importZone.style.background = '#f8f9fa';
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileImport(e.dataTransfer.files[0]);
                }
            });
            
            importFile.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileImport(e.target.files[0]);
                }
            });
        }
        
        if (processImportBtn) {
            processImportBtn.addEventListener('click', () => this.processImport());
        }
        
        if (downloadTemplateBtn) {
            downloadTemplateBtn.addEventListener('click', () => this.downloadTemplate());
        }
        
        // System settings
        const saveSettingsBtn = document.getElementById('save-system-settings');
        const resetSettingsBtn = document.getElementById('reset-system-settings');
        const backupDataBtn = document.getElementById('backup-data');
        const restoreDataBtn = document.getElementById('restore-data');
        const clearAllDataBtn = document.getElementById('clear-all-data');
        
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSystemSettings());
        }
        
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => this.resetSystemSettings());
        }
        
        if (backupDataBtn) {
            backupDataBtn.addEventListener('click', () => this.backupData());
        }
        
        if (restoreDataBtn) {
            restoreDataBtn.addEventListener('click', () => this.restoreData());
        }
        
        if (clearAllDataBtn) {
            clearAllDataBtn.addEventListener('click', () => this.clearAllData());
        }
        
        // Load initial data
        this.loadClassesList();
        this.loadStudentsList();
        this.populateClassDropdown();
        this.loadSystemSettings();
    }

    saveClass() {
        const className = document.getElementById('className')?.value;
        const classCode = document.getElementById('classCode')?.value;
        
        if (!className || !classCode) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const classes = Storage.get('classes') || [];
        
        // Check for duplicate class code
        if (classes.some(c => c.code === classCode)) {
            this.showToast('Class code already exists', 'error');
            return;
        }
        
        const newClass = {
            id: `class_${Date.now()}`,
            name: className,
            code: classCode,
            yearGroup: document.getElementById('yearGroup')?.value || null,
            subject: document.getElementById('subject')?.value || null,
            createdAt: new Date().toISOString(),
            teacherId: this.user?.id
        };
        
        classes.push(newClass);
        Storage.set('classes', classes);
        
        this.showToast('Class saved successfully!', 'success');
        this.clearClassForm();
        this.loadClassesList();
        this.populateClassDropdown();
    }

    clearClassForm() {
        ['className', 'classCode', 'yearGroup', 'subject'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
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
        
        classesList.innerHTML = classes.map(cls => `
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
                        <span class="info-label">Subject:</span>
                        <span class="info-value">${cls.subject || 'Not set'}</span>
                    </div>
                </div>
                <div class="class-actions">
                    <button class="action-btn delete-btn" onclick="window.app.deleteClass('${cls.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    deleteClass(classId) {
        if (!confirm('Delete this class?')) {
            return;
        }
        
        const classes = Storage.get('classes') || [];
        const updatedClasses = classes.filter(c => c.id !== classId);
        Storage.set('classes', updatedClasses);
        
        this.showToast('Class deleted successfully', 'info');
        this.loadClassesList();
        this.populateClassDropdown();
    }

    saveStudent() {
        const firstName = document.getElementById('firstName')?.value;
        const lastName = document.getElementById('lastName')?.value;
        
        if (!firstName || !lastName) {
            this.showToast('Please fill in all required fields', 'error');
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
        
        this.showToast('Student saved successfully!', 'success');
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

    loadStudentsList() {
        const studentsList = document.getElementById('students-list');
        if (!studentsList) return;
        
        const students = Storage.get('students') || [];
        const classes = Storage.get('classes') || [];
        
        if (students.length === 0) {
            studentsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="empty-text">No students added yet</div>
                </div>
            `;
            return;
        }
        
        studentsList.innerHTML = students.map(student => {
            const studentClass = classes.find(c => c.id === student.classId);
            const className = studentClass ? studentClass.name : 'Unassigned';
            
            return `
                <div class="student-card">
                    <div class="student-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="student-info">
                        <div class="student-name">${student.fullName}</div>
                        <div class="student-details">
                            <span class="detail-item">
                                <i class="fas fa-id-card"></i> ${student.studentId}
                            </span>
                            <span class="detail-item">
                                <i class="fas fa-chalkboard-teacher"></i> ${className}
                            </span>
                        </div>
                    </div>
                    <div class="student-actions">
                        <button class="action-btn delete-btn" onclick="window.app.deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    populateClassDropdown() {
        const classDropdown = document.getElementById('studentClass');
        if (!classDropdown) return;
        
        const classes = Storage.get('classes') || [];
        
        // Keep the first option (Select Class)
        classDropdown.innerHTML = '<option value="">Select Class</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.name} (${cls.code})`;
            classDropdown.appendChild(option);
        });
    }

    deleteStudent(studentId) {
        if (!confirm('Delete this student?')) {
            return;
        }
        
        const students = Storage.get('students') || [];
        const updatedStudents = students.filter(s => s.id !== studentId);
        Storage.set('students', updatedStudents);
        
        this.showToast('Student deleted successfully', 'info');
        this.loadStudentsList();
    }

    handleFileImport(file) {
        const importZone = document.getElementById('import-zone');
        const fileName = document.createElement('div');
        fileName.className = 'import-filename';
        fileName.textContent = `Selected: ${file.name}`;
        
        // Remove any existing filename display
        const existing = importZone.querySelector('.import-filename');
        if (existing) {
            existing.remove();
        }
        
        importZone.appendChild(fileName);
        this.showToast(`File "${file.name}" ready for import`, 'info');
    }

    processImport() {
        const importFile = document.getElementById('import-file');
        if (!importFile.files.length) {
            this.showToast('Please select a file to import', 'error');
            return;
        }
        
        this.showToast('Import processing...', 'info');
        // Add your import logic here
    }

    downloadTemplate() {
        this.showToast('Template downloaded', 'success');
        // Add template download logic here
    }

    loadSystemSettings() {
        const settings = Storage.get('systemSettings') || {
            schoolName: 'My School',
            currentTerm: '1',
            academicYear: new Date().getFullYear().toString()
        };
        
        const schoolNameInput = document.getElementById('schoolName');
        const currentTermSelect = document.getElementById('currentTerm');
        const academicYearInput = document.getElementById('academicYear');
        
        if (schoolNameInput) schoolNameInput.value = settings.schoolName;
        if (currentTermSelect) currentTermSelect.value = settings.currentTerm;
        if (academicYearInput) academicYearInput.value = settings.academicYear;
    }

    saveSystemSettings() {
        const schoolName = document.getElementById('schoolName')?.value;
        const currentTerm = document.getElementById('currentTerm')?.value;
        const academicYear = document.getElementById('academicYear')?.value;
        
        const settings = {
            schoolName: schoolName || 'My School',
            currentTerm: currentTerm || '1',
            academicYear: academicYear || new Date().getFullYear().toString(),
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('systemSettings', settings);
        this.showToast('System settings saved successfully!', 'success');
    }

    resetSystemSettings() {
        const defaultSettings = {
            schoolName: 'My School',
            currentTerm: '1',
            academicYear: new Date().getFullYear().toString(),
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('systemSettings', defaultSettings);
        this.loadSystemSettings();
        this.showToast('Settings reset to defaults', 'info');
    }

    backupData() {
        try {
            const backup = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                data: {
                    classes: Storage.get('classes') || [],
                    students: Storage.get('students') || [],
                    attendance: Storage.get('attendance') || [],
                    systemSettings: Storage.get('systemSettings') || {}
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
            
            this.showToast('Backup downloaded successfully!', 'success');
        } catch (error) {
            this.showToast('Error creating backup: ' + error.message, 'error');
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
                        Storage.set('systemSettings', backup.data.systemSettings || {});
                        
                        this.showToast('Data restored successfully!', 'success');
                        
                        // Refresh all lists
                        this.loadClassesList();
                        this.loadStudentsList();
                        this.populateClassDropdown();
                        this.loadSystemSettings();
                    }
                } catch (error) {
                    this.showToast('Error restoring backup: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearAllData() {
        if (confirm('WARNING: This will delete ALL data including classes, students, and attendance records. This action cannot be undone. Continue?')) {
            if (confirm('Are you absolutely sure? Type "DELETE" to confirm.')) {
                const confirmation = prompt('Type DELETE to confirm:');
                if (confirmation === 'DELETE') {
                    // Clear all data except current user
                    const currentUser = this.user;
                    Storage.clear();
                    
                    // Restore current user
                    if (currentUser) {
                        Storage.set('attendance_user', currentUser);
                        this.user = currentUser;
                    }
                    
                    this.showToast('All data has been cleared', 'info');
                    
                    // Refresh all lists
                    this.loadClassesList();
                    this.loadStudentsList();
                    this.populateClassDropdown();
                    this.loadSystemSettings();
                }
            }
        }
    }

    // ==================== AUTH METHODS ====================
    async handleLogin() {
        const email = document.getElementById('loginEmail')?.value || 'teacher@school.edu';
        const password = document.getElementById('loginPassword')?.value || 'demo123';
        
        console.log('Attempting login with:', email);
        
        // Create demo user
        const user = {
            id: 'user_' + Date.now(),
            email: email,
            name: email.split('@')[0],
            role: 'teacher',
            school: 'Demo School',
            lastLogin: new Date().toISOString()
        };
        
        // Save user to localStorage
        Storage.set('attendance_user', user);
        
        // Update app state
        this.user = user;
        this.state.currentUser = user;
        
        this.showToast('Login successful!', 'success');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            this.redirectTo('dashboard.html');
        }, 1000);
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear user data
            Storage.remove('attendance_user');
            this.user = null;
            this.state.currentUser = null;
            
            this.showToast('Logged out successfully', 'success');
            
            // Redirect to index page
            setTimeout(() => {
                this.redirectTo('index.html');
            }, 500);
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

    // ==================== DASHBOARD METHODS ====================
    async loadDashboardData() {
        console.log('📊 Loading dashboard data...');
        
        try {
            // Load existing data
            const classes = Storage.get('classes') || [];
            const students = Storage.get('students') || [];
            const attendance = Storage.get('attendance') || [];
            
            // Update stats
            const totalClasses = document.getElementById('total-classes');
            const totalStudents = document.getElementById('total-students');
            const totalSessions = document.getElementById('total-sessions');
            const attendanceRate = document.getElementById('attendance-rate');
            
            if (totalClasses) totalClasses.textContent = classes.length;
            if (totalStudents) totalStudents.textContent = students.length;
            if (totalSessions) totalSessions.textContent = attendance.length;
            
            // Calculate today's attendance rate
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendance.filter(a => a.date === today);
            if (todayAttendance.length > 0) {
                const totalPresent = todayAttendance.reduce((sum, a) => sum + (a.totalPresent || 0), 0);
                const totalStudents = todayAttendance.reduce((sum, a) => sum + (a.totalStudents || 0), 0);
                const rate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
                if (attendanceRate) attendanceRate.textContent = `${rate}%`;
            }
            
            // Load recent activity
            this.loadRecentActivity(attendance);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    loadRecentActivity(attendance) {
        const activityList = document.getElementById('recent-activity');
        if (!activityList) return;
        
        // Get last 5 attendance records
        const recent = attendance.slice(-5).reverse();
        
        if (recent.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">📋</div>
                    <div class="activity-content">
                        <p>No attendance recorded yet</p>
                        <small>Take your first attendance to see activity here</small>
                    </div>
                </div>
            `;
            return;
        }
        
        const activityHTML = recent.map(record => `
            <div class="activity-item">
                <div class="activity-icon">
                    ${record.totalPresent > 0 ? '✅' : '📋'}
                </div>
                <div class="activity-content">
                    <p>Attendance for ${record.className || 'Class'}</p>
                    <small>${record.date} • ${record.totalPresent || 0}/${record.totalStudents || 0} present</small>
                </div>
            </div>
        `).join('');
        
        // Keep the welcome message if no real activity
        if (activityHTML.trim() !== '') {
            activityList.innerHTML = activityHTML;
        }
    }

    refreshDashboard() {
        console.log('🔄 Refreshing dashboard...');
        this.loadDashboardData();
        this.showToast('Dashboard refreshed', 'success');
    }

    // ==================== UTILITY METHODS ====================
    async loadUIComponents() {
        // Load header and footer
        await this.loadHeader();
        await this.loadFooter();
    }

    async loadHeader() {
        try {
            const headerContainer = document.getElementById('header-container');
            if (!headerContainer) return;
            
            const basePath = this.getBasePath();
            const response = await fetch(`${basePath}components/header.html`);
            
            if (!response.ok) {
                throw new Error(`Failed to load header: ${response.status}`);
            }
            
            const html = await response.text();
            headerContainer.innerHTML = html;
            
            // Setup navigation after header loads
            setTimeout(() => {
                this.setupNavigation();
            }, 100);
            
        } catch (error) {
            console.error('❌ Failed to load header:', error);
            this.renderFallbackHeader();
        }
    }

    async loadFooter() {
        try {
            const footerContainer = document.getElementById('footer-container');
            if (!footerContainer) return;
            
            const basePath = this.getBasePath();
            const response = await fetch(`${basePath}components/footer.html`);
            
            if (!response.ok) {
                throw new Error(`Failed to load footer: ${response.status}`);
            }
            
            const html = await response.text();
            footerContainer.innerHTML = html;
            
        } catch (error) {
            console.error('❌ Failed to load footer:', error);
            this.renderFallbackFooter();
        }
    }

    renderFallbackHeader() {
        const headerContainer = document.getElementById('header-container');
        if (headerContainer) {
            headerContainer.innerHTML = `
                <header class="app-header">
                    <nav class="nav-container">
                        <div class="nav-brand">
                            <h1>Attendance Tracker</h1>
                        </div>
                        <button class="mobile-menu-btn" aria-label="Toggle menu" aria-expanded="false">
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                        <ul class="nav-list">
                            ${this.user ? `
                                <li><a href="dashboard.html" class="nav-link">Dashboard</a></li>
                                <li><a href="attendance.html" class="nav-link">Attendance</a></li>
                                <li><a href="reports.html" class="nav-link">Reports</a></li>
                                <li><a href="setup.html" class="nav-link">Setup</a></li>
                                <li><a href="#" id="logoutBtn" class="nav-link">Logout</a></li>
                            ` : `
                                <li><a href="index.html" class="nav-link">Home</a></li>
                                <li><a href="index.html" class="nav-link">Login</a></li>
                            `}
                        </ul>
                    </nav>
                </header>
            `;
            this.setupNavigation();
        }
    }

    renderFallbackFooter() {
        const footerContainer = document.getElementById('footer-container');
        if (footerContainer) {
            footerContainer.innerHTML = `
                <footer class="app-footer">
                    <div class="footer-content">
                        <p>&copy; ${new Date().getFullYear()} Attendance Tracker v2</p>
                        <p>Version: 2.0.0</p>
                    </div>
                </footer>
            `;
        }
    }

    setupNavigation() {
        setTimeout(() => {
            this.highlightCurrentPage();
            this.setupMobileMenu();
            this.setupLogoutHandler();
        }, 100);
    }
    
    highlightCurrentPage() {
        const currentPage = this.getCurrentPage();
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                const linkPage = href.replace('.html', '').split('?')[0];
                if (linkPage === currentPage || (currentPage === '' && linkPage === 'index')) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.classList.remove('active');
                    link.removeAttribute('aria-current');
                }
            }
        });
    }
    
    setupMobileMenu() {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navList = document.querySelector('.nav-list');
        
        if (mobileMenuBtn && navList) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
                mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
                navList.classList.toggle('active');
                mobileMenuBtn.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (navList.classList.contains('active') && 
                    !mobileMenuBtn.contains(e.target) && 
                    !navList.contains(e.target)) {
                    navList.classList.remove('active');
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                    mobileMenuBtn.classList.remove('active');
                }
            });
        }
    }
    
    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    // ==================== OTHER PAGE RENDERERS (simplified) ====================
    loadAttendanceContent(container) {
        if (!this.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="attendance-page">
                <h1>Attendance Tracking</h1>
                <p>Attendance functionality will be implemented here.</p>
            </div>
        `;
    }

    loadReportsContent(container) {
        if (!this.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="reports-page">
                <h1>Reports</h1>
                <p>Reports functionality will be implemented here.</p>
            </div>
        `;
    }

    loadSettingsContent(container) {
        if (!this.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="settings-page">
                <h1>Settings</h1>
                <p>Settings functionality will be implemented here.</p>
            </div>
        `;
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

    // ==================== FIREBASE METHODS ====================
    async syncLocalUserToFirebase() {
        // This is a non-blocking Firebase sync attempt
        try {
            if (typeof firebase !== 'undefined' && this.user?.email) {
                console.log('Attempting Firebase sync...');
                // Add your Firebase sync logic here
                this.firebaseAvailable = true;
            }
        } catch (error) {
            console.log('Firebase sync not available');
            this.firebaseAvailable = false;
        }
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.showToast('You are back online', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.showToast('You are offline', 'warning');
        });
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            const basePath = this.getBasePath();
            const swPath = `${basePath}service-worker.js`;
            
            navigator.serviceWorker.register(swPath)
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration.scope);
                })
                .catch(error => {
                    console.warn('⚠️ Service Worker registration failed:', error);
                });
        }
    }

    // ==================== HELPER METHODS ====================
    redirectTo(page) {
        const basePath = this.getBasePath();
        const targetUrl = basePath + page;
        window.location.href = targetUrl;
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
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showError(message) {
        console.error('❌ Error:', message);
        this.showToast(message, 'error');
    }
}

// Wait for DOM to be ready before creating app instance
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AttendanceApp();
});
