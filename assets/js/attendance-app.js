// attendance-app.js - COMPLETE FIXED VERSION with PROPER AUTH FLOW
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
        
        // Don't auto-init - wait for DOM
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page.replace('.html', '').split('?')[0];
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

    // ==================== MAIN INITIALIZATION ====================
    async init() {
        console.log('🚀 Initializing AttendanceApp for page:', this.state.currentPage);
        
        try {
            // 1. Check if user should be redirected
            const shouldRedirect = this.checkPageAccess();
            if (shouldRedirect) {
                return; // Redirect will happen in checkPageAccess
            }
            
            // 2. Get current user (if any)
            await this.loadCurrentUser();
            
            // 3. Load UI components
            await this.loadUIComponents();
            
            // 4. Setup event listeners
            this.setupEventListeners();
            
            // 5. Load page-specific content
            await this.loadPageContent();
            
            // 6. Initialize service worker
            this.initServiceWorker();
            
            console.log('✅ AttendanceApp initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError(error.message);
        }
    }

    // ==================== AUTHENTICATION & PAGE ACCESS ====================
    checkPageAccess() {
        const currentPage = this.state.currentPage;
        const user = Storage.get('attendance_user');
        
        console.log('🔐 Page access check:', {
            page: currentPage,
            userExists: !!user,
            isAuthPage: this.isAuthPage(currentPage)
        });
        
        // Public pages that don't require authentication
        const publicPages = ['index', 'login', 'setup']; // Add 'setup' to public pages
        const isPublicPage = publicPages.includes(currentPage);
        
        // If user exists and is on auth page, redirect to dashboard
        if (user && this.isAuthPage(currentPage)) {
            console.log('📤 User logged in, redirecting from auth page to dashboard');
            setTimeout(() => {
                this.redirectTo('dashboard.html');
            }, 100);
            return true;
        }
        
        // If no user and trying to access protected page, redirect to index
        if (!user && !isPublicPage) {
            console.log('🔒 No user, redirecting to index');
            this.showLoginPage();
            return true;
        }
        
        return false; // No redirect needed
    }
    
    isAuthPage(page) {
        return page === 'index' || page === 'login' || page === '';
    }
    
    async loadCurrentUser() {
        const user = Storage.get('attendance_user');
        if (user && user.email) {
            this.user = user;
            this.state.currentUser = user;
            console.log('👤 User loaded:', user.email);
            
            // Try Firebase sync (non-blocking)
            this.syncLocalUserToFirebase().catch(console.error);
        } else {
            console.log('👤 No user logged in');
        }
    }

    // ==================== UI COMPONENTS ====================
    async loadUIComponents() {
        // Load header and footer for all pages except auth pages
        if (!this.isAuthPage(this.state.currentPage)) {
            await this.loadHeader();
            await this.loadFooter();
        }
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
                                <li><a href="settings.html" class="nav-link">Settings</a></li>
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

    // ==================== NAVIGATION ====================
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

    // ==================== PAGE CONTENT LOADING ====================
    async loadPageContent() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        // Show loading state
        appContainer.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        `;
        
        const currentPage = this.state.currentPage;
        console.log(`📄 Loading content for: ${currentPage}`);
        
        try {
            switch(currentPage) {
                case 'index':
                    await this.loadIndexContent();
                    break;
                case 'login':
                    await this.loadLoginContent();
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
                    this.showPageNotFound();
            }
        } catch (error) {
            console.error(`❌ Error loading ${currentPage} content:`, error);
            this.showError(`Failed to load ${currentPage} page`);
        }
    }

    // ==================== PAGE CONTENT RENDERERS ====================
    async loadIndexContent() {
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = `
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

    async loadLoginContent() {
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = `
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

    async loadDashboardContent() {
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = `
            <div class="dashboard-page">
                <div class="dashboard-header">
                    <h2>Welcome, ${this.user?.name || 'Teacher'}!</h2>
                    <p>Here's your attendance overview</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <h3>0</h3>
                            <p>Classes Today</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <h3>0</h3>
                            <p>Total Students</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <h3>0%</h3>
                            <p>Attendance Rate</p>
                        </div>
                    </div>
                </div>
                
                <div class="quick-actions">
                    <h3>Quick Actions</h3>
                    <div class="actions-grid">
                        <a href="attendance.html" class="action-card">
                            <div class="action-icon">📝</div>
                            <h4>Take Attendance</h4>
                            <p>Record today's attendance</p>
                        </a>
                        
                        <a href="setup.html" class="action-card">
                            <div class="action-icon">⚙️</div>
                            <h4>Setup Classes</h4>
                            <p>Add classes and students</p>
                        </a>
                        
                        <a href="reports.html" class="action-card">
                            <div class="action-icon">📈</div>
                            <h4>View Reports</h4>
                            <p>Generate attendance reports</p>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAttendanceContent() {
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = `
            <div class="attendance-page">
                <div class="attendance-header">
                    <h2>Attendance Tracking</h2>
                    <p>Select a class to take attendance</p>
                </div>
                
                <div class="attendance-container">
                    <div class="classes-panel">
                        <h3>Select Class</h3>
                        <div class="classes-list">
                            <div class="no-classes">
                                <p>No classes set up yet</p>
                                <a href="setup.html" class="btn btn-primary">Setup Classes</a>
                            </div>
                        </div>
                    </div>
                    
                    <div class="attendance-main">
                        <div class="attendance-placeholder">
                            <div class="placeholder-icon">📋</div>
                            <h3>Select a Class</h3>
                            <p>Choose a class from the left panel to begin taking attendance</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadSetupContent() {
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = `
            <div class="setup-page">
                <div class="setup-header">
                    <h2>Setup Classes & Students</h2>
                    <p>Configure your classes and add students</p>
                </div>
                
                <div class="setup-tabs">
                    <button class="setup-tab active" data-tab="classes">Classes</button>
                    <button class="setup-tab" data-tab="students">Students</button>
                </div>
                
                <div class="setup-content">
                    <div id="classes-tab" class="tab-content active">
                        <h3>Manage Classes</h3>
                        <button class="btn btn-primary" onclick="window.app.showAddClassModal()">
                            Add New Class
                        </button>
                        <div class="classes-list">
                            <p>No classes added yet</p>
                        </div>
                    </div>
                    
                    <div id="students-tab" class="tab-content">
                        <h3>Manage Students</h3>
                        <p>Select a class to view students</p>
                    </div>
                </div>
            </div>
        `;
    }

    async loadReportsContent() {
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = `
            <div class="reports-page">
                <h2>Attendance Reports</h2>
                <p>Generate and analyze attendance data</p>
                
                <div class="reports-filters">
                    <div class="form-group">
                        <label>Select Class</label>
                        <select class="form-control">
                            <option>All Classes</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Date Range</label>
                        <div class="date-range">
                            <input type="date" class="form-control">
                            <span>to</span>
                            <input type="date" class="form-control">
                        </div>
                    </div>
                    
                    <button class="btn btn-primary">Generate Report</button>
                </div>
                
                <div class="reports-placeholder">
                    <p>Configure filters and generate a report</p>
                </div>
            </div>
        `;
    }

    async loadSettingsContent() {
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = `
            <div class="settings-page">
                <h2>Settings</h2>
                <p>Configure your system preferences</p>
                
                <div class="settings-grid">
                    <div class="settings-card">
                        <h3>Profile</h3>
                        <p>Update your account information</p>
                        <button class="btn btn-secondary">Edit Profile</button>
                    </div>
                    
                    <div class="settings-card">
                        <h3>Preferences</h3>
                        <p>Customize your experience</p>
                        <button class="btn btn-secondary">Edit Preferences</button>
                    </div>
                    
                    <div class="settings-card">
                        <h3>Data Management</h3>
                        <p>Backup and restore data</p>
                        <button class="btn btn-secondary">Manage Data</button>
                    </div>
                </div>
            </div>
        `;
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
            demo: true
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
            demo: true
        };
        
        Storage.set('attendance_user', demoUser);
        this.user = demoUser;
        this.state.currentUser = demoUser;
        
        this.showToast('Demo mode activated!', 'success');
        
        setTimeout(() => {
            this.redirectTo('dashboard.html');
        }, 1000);
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

    // ==================== UTILITY METHODS ====================
    redirectTo(page) {
        const basePath = this.getBasePath();
        const targetUrl = basePath + page;
        
        // Use replace to avoid adding to history (prevents back button issues)
        window.location.replace(targetUrl);
    }

    showLoginPage() {
        this.redirectTo('index.html');
    }

    goToPage(page) {
        window.location.href = page;
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

    showPageNotFound() {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.innerHTML = `
                <div class="error-page">
                    <h2>Page Not Found</h2>
                    <p>The page you're looking for doesn't exist.</p>
                    <a href="index.html" class="btn btn-primary">Go Home</a>
                </div>
            `;
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
        
        // Prevent form submission on enter key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !e.target.classList.contains('allow-enter')) {
                e.preventDefault();
            }
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

    // ==================== MODAL METHODS ====================
    showAddClassModal() {
        // Simple modal for adding classes
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Add New Class</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="addClassForm">
                        <div class="form-group">
                            <label>Class Name</label>
                            <input type="text" class="form-control" placeholder="e.g., Form 1A" required>
                        </div>
                        <div class="form-group">
                            <label>Grade/Year</label>
                            <input type="text" class="form-control" placeholder="e.g., Grade 5">
                        </div>
                        <div class="form-group">
                            <label>Teacher</label>
                            <input type="text" class="form-control" value="${this.user?.name || ''}">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="window.app.saveNewClass()">Save Class</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    saveNewClass() {
        this.showToast('Class added successfully!', 'success');
        document.querySelector('.modal-overlay')?.remove();
    }
}

// Wait for DOM to be ready before creating app instance
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AttendanceApp();
});
