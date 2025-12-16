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

        this.user = null;
        this.firebaseAvailable = false;
        
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page.replace('.html', '').split('?')[0];
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
            // 1. Check authentication (skip for login/index pages)
            const currentPage = this.state.currentPage;
            if (currentPage !== 'index' && currentPage !== 'login' && currentPage !== '') {
                const authResult = await this.checkAuth();
                
                if (!authResult.success) {
                    console.log('❌ Auth failed - redirecting to login');
                    this.showLoginPage();
                    return;
                }
                
                // Auth passed - set user
                this.user = authResult.user;
                this.state.currentUser = authResult.user;
                console.log('✅ User authenticated:', authResult.user.name);
                
                // Try to sync with Firebase if available
                await this.syncLocalUserToFirebase();
            }
            
            // 2. Load shared UI components
            await this.loadHeader();
            await this.loadFooter();
            
            // 3. Setup app-wide event listeners
            this.setupEventListeners();
            
            // 4. Load page-specific content
            await this.loadPageContent();
            
            // 5. Initialize service worker
            this.initServiceWorker();
            
            console.log('✅ AttendanceApp initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError(error.message);
        }
    }

    // ==================== COMPONENT LOADING ====================
    async loadHeader() {
        try {
            const headerContainer = document.getElementById('header-container');
            if (headerContainer) {
                const basePath = this.getBasePath();
                const response = await fetch(`${basePath}components/header.html`);
                
                if (!response.ok) {
                    throw new Error(`Failed to load header: ${response.status} ${response.statusText}`);
                }
                
                const html = await response.text();
                headerContainer.innerHTML = html;
                console.log('✅ Header loaded');
                
                // Setup navigation after header loads
                this.setupNavigation();
            }
        } catch (error) {
            console.error('❌ Failed to load header:', error);
            this.renderFallbackHeader();
        }
    }

    async loadFooter() {
        try {
            const footerContainer = document.getElementById('footer-container');
            if (footerContainer) {
                const basePath = this.getBasePath();
                const response = await fetch(`${basePath}components/footer.html`);
                
                if (!response.ok) {
                    throw new Error(`Failed to load footer: ${response.status} ${response.statusText}`);
                }
                
                const html = await response.text();
                footerContainer.innerHTML = html;
                console.log('✅ Footer loaded');
            }
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
                            <li><a href="index.html" class="nav-link">Home</a></li>
                            <li><a href="attendance.html" class="nav-link">Attendance</a></li>
                            <li><a href="reports.html" class="nav-link">Reports</a></li>
                            <li><a href="setup.html" class="nav-link">Setup</a></li>
                            <li><a href="settings.html" class="nav-link">Settings</a></li>
                            <li><a href="#" id="logoutBtn" class="nav-link">Logout</a></li>
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

    // ==================== NAVIGATION SETUP ====================
    setupNavigation() {
        console.log('🔧 Setting up navigation...');
        
        setTimeout(() => {
            this.highlightCurrentPage();
            this.setupMobileMenu();
            this.setupLogoutHandler();
            this.setupNavLinks();
        }, 100);
    }
    
    highlightCurrentPage() {
        const currentPage = this.getCurrentPage();
        console.log('Current page for highlighting:', currentPage);
        
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                const linkPage = href.replace('.html', '').split('?')[0];
                console.log(`Checking link: ${href} -> ${linkPage}`);
                
                if (linkPage === currentPage || (currentPage === '' && linkPage === 'index')) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                    console.log(`✅ Activated: ${href}`);
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
            // Remove existing event listeners
            const newMobileMenuBtn = mobileMenuBtn.cloneNode(true);
            const newNavList = navList.cloneNode(true);
            
            mobileMenuBtn.parentNode.replaceChild(newMobileMenuBtn, mobileMenuBtn);
            navList.parentNode.replaceChild(newNavList, navList);
            
            // Setup new event listeners
            newMobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isExpanded = newMobileMenuBtn.getAttribute('aria-expanded') === 'true';
                newMobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
                newNavList.classList.toggle('active');
                newMobileMenuBtn.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (newNavList.classList.contains('active') && 
                    !newMobileMenuBtn.contains(e.target) && 
                    !newNavList.contains(e.target)) {
                    newNavList.classList.remove('active');
                    newMobileMenuBtn.setAttribute('aria-expanded', 'false');
                    newMobileMenuBtn.classList.remove('active');
                }
            });
            
            // Close menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && newNavList.classList.contains('active')) {
                    newNavList.classList.remove('active');
                    newMobileMenuBtn.setAttribute('aria-expanded', 'false');
                    newMobileMenuBtn.classList.remove('active');
                }
            });
        }
    }
    
    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            // Remove existing listener
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            
            newLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }
    
    setupNavLinks() {
        const navLinks = document.querySelectorAll('.nav-link:not([href="#"])');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                console.log('Navigating to:', link.getAttribute('href'));
                // Close mobile menu if open
                const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
                const navList = document.querySelector('.nav-list');
                if (mobileMenuBtn && navList && navList.classList.contains('active')) {
                    navList.classList.remove('active');
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                    mobileMenuBtn.classList.remove('active');
                }
            });
        });
    }
    
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            console.log('👋 Logging out user...');
            
            // Clear user-related data only
            localStorage.removeItem('attendance_user');
            sessionStorage.clear();
            
            // Clear app-specific settings if needed
            localStorage.removeItem('app_settings');
            
            // Redirect to login page
            const basePath = this.getBasePath();
            window.location.href = `${basePath}index.html`;
        }
    }

    // ==================== PAGE CONTENT LOADING ====================
    async loadPageContent() {
        const currentPage = this.state.currentPage;
        console.log(`📄 Loading content for page: ${currentPage}`);
        
        switch(currentPage) {
            case 'index':
            case 'login':
                await this.loadIndexContent();
                break;
            case 'dashboard':
                await this.loadDashboardContent();
                break;
            case 'attendance':
                await this.loadAttendanceContent();
                break;
            case 'reports':
                await this.loadReportsContent();
                break;
            case 'setup':
                await this.loadSetupContent();
                break;
            case 'settings':
                await this.loadSettingsContent();
                break;
            default:
                this.showError(`Page "${currentPage}" not found`);
        }
    }

    async loadIndexContent() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
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
                        ${this.user ? `
                            <button class="btn btn-lg btn-primary" onclick="window.app.goToPage('dashboard.html')">
                                Go to Dashboard
                            </button>
                        ` : `
                            <button class="btn btn-lg btn-primary" onclick="window.app.goToPage('login.html')">
                                Login with Firebase
                            </button>
                            <button class="btn btn-lg btn-secondary" onclick="window.app.startDemoMode()">
                                Try Demo Mode
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    async loadDashboardContent() {
        console.log("📊 Loading dashboard content...");
        this.renderDashboard();
    }

    async loadAttendanceContent() {
        console.log("📋 Loading attendance content...");
        this.renderAttendance();
    }

    async loadReportsContent() {
        console.log("📈 Loading reports content...");
        this.renderReports();
    }

    async loadSetupContent() {
        console.log("⚙️ Loading setup content...");
        this.renderSetup();
    }

    async loadSettingsContent() {
        console.log("⚙️ Loading settings content...");
        this.renderSettings();
    }

    // ==================== PAGE RENDERERS ====================
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

    renderAttendance() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="attendance-page">
                <h2>Attendance Tracking</h2>
                <p>Select a class to take attendance</p>
                <div id="attendance-content">
                    Loading attendance system...
                </div>
            </div>
        `;
    }

    renderReports() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="reports-page">
                <h2>Attendance Reports</h2>
                <p>Generate and analyze attendance data</p>
                <div id="reports-content">
                    Loading reports system...
                </div>
            </div>
        `;
    }

    renderSetup() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="setup-page">
                <h2>Setup Classes & Students</h2>
                <p>Configure your classes, add students, and manage your school setup</p>
                <div id="setup-content">
                    Loading setup system...
                </div>
            </div>
        `;
    }

    renderSettings() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="settings-page">
                <h2>Settings</h2>
                <p>Configure your attendance system</p>
                <div id="settings-content">
                    Loading settings...
                </div>
            </div>
        `;
    }

    // ==================== AUTHENTICATION ====================
    async checkAuth() {
        console.log("🔐 Performing auth check...");
        
        // Get user from localStorage
        const user = Storage.get('attendance_user');
        
        if (!user || !user.email) {
            console.log("❌ No valid user found");
            return { success: false, user: null };
        }
        
        // Check if user data is expired (optional)
        if (user.expires && new Date() > new Date(user.expires)) {
            console.log("❌ User session expired");
            Storage.remove('attendance_user');
            return { success: false, user: null };
        }
        
        console.log(`✅ User found: ${user.email}`);
        return { success: true, user };
    }

    showLoginPage() {
        console.log("🔐 Redirecting to login page...");
        
        // Check if we're already on login page
        if (this.getCurrentPage() === 'index') {
            console.log("⚠️ Already on login page");
            return;
        }
        
        // Get base path
        const basePath = this.getBasePath();
        
        // Clear user data if needed
        if (this.getCurrentPage() !== 'index') {
            localStorage.removeItem('attendance_user');
        }
        
        console.log(`Redirecting to: ${basePath}index.html`);
        window.location.href = `${basePath}index.html`;
    }

    // ==================== FIREBASE METHODS ====================
    async syncLocalUserToFirebase() {
        try {
            console.log("Attempting Firebase auto-login...");
            
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                console.log("Firebase not loaded yet");
                this.firebaseAvailable = false;
                return null;
            }
            
            const email = this.user?.email;
            const password = localStorage.getItem('userPassword');
            
            if (!email || !password) {
                console.log("No credentials stored for Firebase login");
                this.firebaseAvailable = false;
                return null;
            }
            
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            console.log("✅ Firebase auto-login successful:", userCredential.user.email);
            this.firebaseAvailable = true;
            return userCredential.user;
        } catch (error) {
            console.error("Firebase auto-login failed:", error.message);
            this.firebaseAvailable = false;
            return null;
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

    // ==================== HELPER METHODS ====================
    async loadDashboardData() {
        // This would load actual dashboard data
        console.log('Loading dashboard data...');
    }

    refreshDashboard() {
        this.loadDashboardData();
        this.showToast('Dashboard refreshed', 'success');
    }

    goToPage(page) {
        window.location.href = page;
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
        this.user = demoUser;
        this.state.currentUser = demoUser;
        
        this.showToast('Demo mode activated!', 'success');
        
        setTimeout(() => {
            this.goToPage('dashboard.html');
        }, 1000);
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            console.log('🌐 App is online');
            this.showToast('Online - Syncing data...', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            console.log('📴 App is offline');
            this.showToast('Offline - Working locally', 'warning');
        });
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

    // ==================== UTILITY METHODS ====================
    showToast(message, type = 'info') {
        // Create toast element
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
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showError(message) {
        console.error('❌ Error:', message);
        
        // Show error toast
        this.showToast(message, 'error');
        
        // Optional: Show error in error container if it exists
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="alert alert-error">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }
    }
}

// Create global instance
window.app = new AttendanceApp();
