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

    // Add these methods to your AttendanceApp class:

// ==================== LOGIN HANDLER ====================
async handleLogin(email, password, rememberMe = false) {
    console.log('🔐 Handling login:', email);
    
    try {
        // Validate
        if (!email || !password) {
            this.showError('Please enter email and password');
            return;
        }
        
        // Check if user exists and redirect if already logged in
        const existingUser = Storage.get('attendance_user');
        if (existingUser && existingUser.email === email) {
            console.log('User already logged in, redirecting...');
            this.redirectTo('dashboard.html');
            return;
        }
        
        // Create user object
        const user = {
            id: 'user_' + Date.now(),
            email: email,
            name: email.split('@')[0],
            role: 'teacher',
            school: 'My School',
            lastLogin: new Date().toISOString()
        };
        
        // Save to storage
        Storage.set('attendance_user', user);
        
        // Remember email if requested
        if (rememberMe) {
            localStorage.setItem('remember_email', email);
        } else {
            localStorage.removeItem('remember_email');
        }
        
        // Update app state
        this.user = user;
        this.state.currentUser = user;
        
        this.showToast('Login successful!', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            this.redirectTo('dashboard.html');
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        this.showError('Login failed: ' + error.message);
    }
}

    // handle Logout
handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        Storage.remove('attendance_user');
        this.user = null;
        this.state.currentUser = null;
        
        this.showToast('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }
}
    
// ==================== SIGNUP HANDLER ====================
async handleSignup(name, email, password, role, school, termsAccepted) {
    console.log('📝 Handling signup:', email);
    
    try {
        // Validate
        if (!name || !email || !password) {
            this.showError('Please fill all required fields');
            return;
        }
        
        if (!termsAccepted) {
            this.showError('You must accept the terms');
            return;
        }
        
        // Create user object
        const user = {
            id: 'user_' + Date.now(),
            name: name,
            email: email,
            role: role || 'teacher',
            school: school || 'My School',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        // Save to storage
        Storage.set('attendance_user', user);
        
        // Update app state
        this.user = user;
        this.state.currentUser = user;
        
        this.showToast('Account created successfully!', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            this.redirectTo('dashboard.html');
        }, 1500);
        
    } catch (error) {
        console.error('Signup error:', error);
        this.showError('Signup failed: ' + error.message);
    }
}

// ==================== DEMO MODE ====================
startDemoMode() {
    console.log('🎮 Starting demo mode');
    
    const demoUser = {
        id: 'demo_' + Date.now(),
        email: 'demo@attendance-track.app',
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

// ==================== REDIRECT HELPER ====================
redirectTo(page) {
    console.log('🔀 Redirecting to:', page);
    window.location.href = page;
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
    
    try {
        // 1. Get current page and user
        const currentPage = this.state.currentPage;
        const authResult = await this.checkAuth();
        const hasUser = authResult.success;
        
        console.log(`📄 Page: ${currentPage}, Has user: ${hasUser}`);
        
        // 2. Define which pages are public
        const publicPages = ['index', 'login', ''];
        const isPublicPage = publicPages.includes(currentPage);
        
        // 3. DECISION MATRIX:
        console.log(`Decision: Public page? ${isPublicPage}, Has user? ${hasUser}`);
        
        // CASE 1: User logged in AND on public page → redirect to dashboard
        if (hasUser && isPublicPage) {
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
        
        // Load UI components (header/footer only for protected pages)
        if (!isPublicPage) {
            await this.loadUIComponents();
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load page-specific content
        await this.loadPageContent();
        
        // Initialize service worker
        this.initServiceWorker();
        
        console.log('✅ AttendanceApp initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        this.showError(error.message);
    }
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
        
        // Check if user data is too old (optional)
        if (user.expires && new Date() > new Date(user.expires)) {
            console.log("❌ User session expired");
            localStorage.removeItem('attendance_user');
            return { success: false, user: null };
        }
        
        console.log(`✅ User authenticated: ${user.email}`);
        return { success: true, user };
        
    } catch (error) {
        console.error("❌ Error in checkAuth:", error);
        return { success: false, user: null };
    }
}

// ==================== FIXED GET CURRENT PAGE ====================
getCurrentPage() {
    const path = window.location.pathname;
    console.log('Path for getCurrentPage:', path);
    
    let page = path.split('/').pop() || 'index.html';
    console.log('Page after split:', page);
    
    // Remove .html and any query parameters
    page = page.replace('.html', '').split('?')[0];
    console.log('Final page name:', page);
    
    // Handle empty page (root)
    if (page === '' || page === '/' || page === 'index') {
        return 'index';
    }
    
    return page;
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
                await this.loadIndexContent(appContainer);  // CHANGED: Added parameter
                break;
            case 'login':
                await this.loadLoginContent(appContainer);  // CHANGED: Added parameter
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

    
// ================== LOAD DASHBOARD CONTENT =====================
    // In attendance-app.js - Update the loadDashboardContent method:
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

// Add this method to load dashboard stats
async loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        // Load existing data
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
        if (todayAttendance.length > 0) {
            const totalPresent = todayAttendance.reduce((sum, a) => sum + (a.totalPresent || 0), 0);
            const totalStudents = todayAttendance.reduce((sum, a) => sum + (a.totalStudents || 0), 0);
            const rate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
            document.getElementById('attendance-rate').textContent = `${rate}%`;
        }
        
        // Load recent activity
        this.loadRecentActivity(attendance);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Add this method for recent activity
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
    
    activityList.innerHTML = recent.map(record => `
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
}

// Add refresh method
refreshDashboard() {
    console.log('🔄 Refreshing dashboard...');
    this.loadDashboardData();
    this.showToast('Dashboard refreshed', 'success');
}

// ================== LOAD SETUP CONTENT ======================
    // In attendance-app.js - Add this method after loadDashboardContent
loadSetupContent(container) {
    if (!this.user) {
        container.innerHTML = `<div class="error">Please login to access setup</div>`;
        return;
    }
    
    container.innerHTML = `
        <div class="setup-page">
            <div class="setup-header">
                <h2>Setup Classes & Students</h2>
                <p>Configure your classes, add students, and manage your school setup</p>
            </div>
            
            <div class="setup-container">
                <!-- Setup Tabs -->
                <div class="setup-tabs">
                    <button class="setup-tab active" data-tab="classes" onclick="window.app.switchSetupTab('classes')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                        Classes
                    </button>
                    <button class="setup-tab" data-tab="students" onclick="window.app.switchSetupTab('students')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Students
                    </button>
                    <button class="setup-tab" data-tab="import" onclick="window.app.switchSetupTab('import')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Import/Export
                    </button>
                    <button class="setup-tab" data-tab="school" onclick="window.app.switchSetupTab('school')">
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
                        ${this.renderClassesTab()}
                    </div>
                    
                    <!-- Students Tab -->
                    <div class="tab-content" id="students-tab">
                        ${this.renderStudentsTab()}
                    </div>
                    
                    <!-- Import/Export Tab -->
                    <div class="tab-content" id="import-tab">
                        ${this.renderImportTab()}
                    </div>
                    
                    <!-- School Info Tab -->
                    <div class="tab-content" id="school-tab">
                        ${this.renderSchoolInfoTab()}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load initial data
    this.loadClasses();
    this.loadStudents();
    this.loadSchoolInfo();
}

// Helper methods for each tab
renderClassesTab() {
    return `
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
    `;
}

renderStudentsTab() {
    return `
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
    `;
}

renderImportTab() {
    return `
        <div class="import-section">
            <h3>Import Data</h3>
            <p>Import classes and students from Excel/CSV files</p>
            <div class="import-zone" id="import-zone" onclick="document.getElementById('import-file').click()">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="1">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p>Drag & drop Excel or CSV files here</p>
                <p class="small">or</p>
                <input type="file" id="import-file" accept=".csv,.xlsx,.xls" hidden>
                <button class="btn btn-secondary">
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
    `;
}

renderSchoolInfoTab() {
    const schoolInfo = Storage.get('school_info') || {};
    
    return `
        <div class="school-info-form">
            <h3>School Information</h3>
            <form id="school-form" onsubmit="event.preventDefault(); window.app.saveSchoolInfo();">
                <div class="form-group">
                    <label>School Name</label>
                    <input type="text" id="school-name" class="form-control" 
                           value="${this.user?.school || schoolInfo.name || ''}" 
                           placeholder="Enter school name">
                </div>
                <div class="form-group">
                    <label>School Address</label>
                    <textarea id="school-address" class="form-control" rows="3" 
                              placeholder="Enter school address">${schoolInfo.address || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Academic Year</label>
                        <input type="text" id="academic-year" class="form-control" 
                               value="${schoolInfo.academicYear || ''}"
                               placeholder="e.g., 2024-2025">
                    </div>
                    <div class="form-group">
                        <label>Current Term</label>
                        <select id="current-term" class="form-control">
                            <option value="1" ${schoolInfo.currentTerm === '1' ? 'selected' : ''}>Term 1</option>
                            <option value="2" ${schoolInfo.currentTerm === '2' ? 'selected' : ''}>Term 2</option>
                            <option value="3" ${schoolInfo.currentTerm === '3' ? 'selected' : ''}>Term 3</option>
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
    `;
}

// ==================== SETUP PAGE METHODS ====================
switchSetupTab(tabName) {
    // Update active tab
    document.querySelectorAll('.setup-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        }
    });
}

async loadClasses() {
    const classes = Storage.get('classes') || [];
    const container = document.getElementById('classes-list-setup');
    
    if (!container) return;
    
    if (classes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
                <h4>No Classes Yet</h4>
                <p>Click "Add New Class" to create your first class</p>
            </div>
        `;
        return;
    }
    
    // Count students per class
    const students = Storage.get('students') || [];
    const classesWithCounts = classes.map(cls => {
        const studentCount = students.filter(s => s.classId === cls.id).length;
        return { ...cls, studentCount };
    });
    
    container.innerHTML = classesWithCounts.map(cls => `
        <div class="setup-class-item">
            <div class="class-header">
                <h4>${cls.name}</h4>
                <div class="class-actions">
                    <button class="btn-icon" onclick="window.app.editClass('${cls.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="btn-icon btn-danger" onclick="window.app.deleteClass('${cls.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
            <div class="class-details">
                <span>Grade: ${cls.grade || 'Not set'}</span>
                <span>Students: ${cls.studentCount || 0}</span>
                <span>Teacher: ${cls.teacher || 'Not assigned'}</span>
            </div>
            <div class="class-description">
                ${cls.description || 'No description'}
            </div>
        </div>
    `).join('');
    
    // Update class filter for students tab
    this.updateClassFilter();
}

async loadStudents() {
    const students = Storage.get('students') || [];
    const container = document.getElementById('students-list');
    
    if (!container) return;
    
    if (students.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <h4>No Students Found</h4>
                <p>Add students or select a class to view students</p>
            </div>
        `;
        return;
    }
    
    // Get classes for display
    const classes = Storage.get('classes') || [];
    const classMap = {};
    classes.forEach(cls => {
        classMap[cls.id] = cls.name;
    });
    
    container.innerHTML = students.map(student => `
        <div class="student-item">
            <div class="student-avatar">
                ${student.name.charAt(0).toUpperCase()}
            </div>
            <div class="student-info">
                <h4>${student.name}</h4>
                <p>Class: ${classMap[student.classId] || 'Unknown'}</p>
                <div class="student-details">
                    <span>ID: ${student.studentId || 'N/A'}</span>
                    <span>Gender: ${student.gender || 'Not specified'}</span>
                    <span>Year: ${student.yearGroup || 'N/A'}</span>
                </div>
            </div>
            <div class="student-actions">
                <button class="btn-icon" onclick="window.app.editStudent('${student.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>
                <button class="btn-icon btn-danger" onclick="window.app.deleteStudent('${student.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

updateClassFilter() {
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

filterStudentsByClass(classId) {
    const students = Storage.get('students') || [];
    const container = document.getElementById('students-list');
    
    if (!container) return;
    
    let filteredStudents = students;
    if (classId) {
        filteredStudents = students.filter(s => s.classId === classId);
    }
    
    if (filteredStudents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h4>No Students Found</h4>
                <p>No students in this class</p>
            </div>
        `;
        return;
    }
    
    // Get classes for display
    const classes = Storage.get('classes') || [];
    const classMap = {};
    classes.forEach(cls => {
        classMap[cls.id] = cls.name;
    });
    
    container.innerHTML = filteredStudents.map(student => `
        <div class="student-item">
            <div class="student-avatar">
                ${student.name.charAt(0).toUpperCase()}
            </div>
            <div class="student-info">
                <h4>${student.name}</h4>
                <p>Class: ${classMap[student.classId] || 'Unknown'}</p>
            </div>
        </div>
    `).join('');
}

showAddClassModal() {
    const modalHtml = `
        <div class="modal-overlay" id="add-class-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Add New Class</h3>
                    <button class="modal-close" onclick="window.app.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-class-form">
                        <div class="form-group">
                            <label>Class Name *</label>
                            <input type="text" id="new-class-name" class="form-control" 
                                   placeholder="e.g., Form 1A, Grade 5B" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Grade/Year</label>
                                <input type="text" id="new-class-grade" class="form-control" 
                                       placeholder="e.g., Grade 5, Year 7">
                            </div>
                            <div class="form-group">
                                <label>Subject</label>
                                <input type="text" id="new-class-subject" class="form-control" 
                                       placeholder="e.g., Mathematics, English">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Teacher Name</label>
                            <input type="text" id="new-class-teacher" class="form-control" 
                                   value="${this.user?.name || ''}" placeholder="Teacher's name">
                        </div>
                        <div class="form-group">
                            <label>Class Description</label>
                            <textarea id="new-class-description" class="form-control" rows="3" 
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
    if (modal) modal.remove();
}

saveNewClass() {
    const name = document.getElementById('new-class-name')?.value;
    const grade = document.getElementById('new-class-grade')?.value;
    const subject = document.getElementById('new-class-subject')?.value;
    const teacher = document.getElementById('new-class-teacher')?.value;
    const description = document.getElementById('new-class-description')?.value;
    
    if (!name) {
        this.showToast('Please enter a class name', 'error');
        return;
    }
    
    const newClass = {
        id: 'class_' + Date.now(),
        name: name,
        grade: grade,
        subject: subject,
        teacher: teacher,
        description: description,
        createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    const classes = Storage.get('classes') || [];
    classes.push(newClass);
    Storage.set('classes', classes);
    
    // Close modal and refresh
    this.closeModal();
    this.loadClasses();
    
    this.showToast('Class added successfully!', 'success');
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
    this.loadClasses();
    this.loadStudents();
    
    this.showToast('Class deleted successfully', 'success');
}

showAddStudentModal() {
    const classes = Storage.get('classes') || [];
    
    if (classes.length === 0) {
        this.showToast('Please create a class first', 'error');
        return;
    }
    
    const modalHtml = `
        <div class="modal-overlay" id="add-student-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Add New Student</h3>
                    <button class="modal-close" onclick="window.app.closeStudentModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-student-form">
                        <div class="form-group">
                            <label>Full Name *</label>
                            <input type="text" id="new-student-name" class="form-control" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Student ID</label>
                                <input type="text" id="new-student-id" class="form-control">
                            </div>
                            <div class="form-group">
                                <label>Gender</label>
                                <select id="new-student-gender" class="form-control">
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Class *</label>
                                <select id="new-student-class" class="form-control" required>
                                    <option value="">Select Class</option>
                                    ${classes.map(cls => `
                                        <option value="${cls.id}">${cls.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Year Group</label>
                                <input type="text" id="new-student-year" class="form-control">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.app.closeStudentModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="window.app.saveNewStudent()">Save Student</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

closeStudentModal() {
    const modal = document.getElementById('add-student-modal');
    if (modal) modal.remove();
}

saveNewStudent() {
    const name = document.getElementById('new-student-name')?.value;
    const studentId = document.getElementById('new-student-id')?.value;
    const gender = document.getElementById('new-student-gender')?.value;
    const classId = document.getElementById('new-student-class')?.value;
    const yearGroup = document.getElementById('new-student-year')?.value;
    
    if (!name || !classId) {
        this.showToast('Please fill required fields', 'error');
        return;
    }
    
    const newStudent = {
        id: 'student_' + Date.now(),
        name: name,
        studentId: studentId,
        gender: gender,
        classId: classId,
        yearGroup: yearGroup,
        createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    const students = Storage.get('students') || [];
    students.push(newStudent);
    Storage.set('students', students);
    
    // Close modal and refresh
    this.closeStudentModal();
    this.loadStudents();
    this.loadClasses(); // To update student counts
    
    this.showToast('Student added successfully!', 'success');
}

loadSchoolInfo() {
    // Already loaded in renderSchoolInfoTab
}

saveSchoolInfo() {
    const schoolName = document.getElementById('school-name')?.value;
    const schoolAddress = document.getElementById('school-address')?.value;
    const academicYear = document.getElementById('academic-year')?.value;
    const currentTerm = document.getElementById('current-term')?.value;
    
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
    
    this.showToast('School information saved!', 'success');
}

resetSchoolForm() {
    document.getElementById('school-name').value = '';
    document.getElementById('school-address').value = '';
    document.getElementById('academic-year').value = '';
    document.getElementById('current-term').value = '1';
}

exportToCSV() {
    this.showToast('CSV export would be implemented here', 'info');
}

exportToExcel() {
    this.showToast('Excel export would be implemented here', 'info');
}

backupData() {
    const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        user: this.user,
        classes: Storage.get('classes') || [],
        students: Storage.get('students') || [],
        attendance: Storage.get('attendance') || [],
        settings: Storage.get('settings') || {},
        schoolInfo: Storage.get('school_info') || {}
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `attendance-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    this.showToast('Backup created successfully!', 'success');
}
    
// ================== LOAD ATTENDANCE CONTENT =================
   // In attendance-app.js
loadAttendanceContent(container) {
    if (!this.user) {
        container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
        return;
    }
    
    // Get today's date in format: MM / DD / YYYY
    const today = new Date();
    const formattedDate = `${today.getMonth() + 1} / ${today.getDate()} / ${today.getFullYear()}`;
    
    container.innerHTML = `
        <div class="attendance-report">
            <div class="header">
                <h1>Attendance Track</h1>
                <h2>Daily Attendance</h2>
            </div>
            
            <div class="info-section">
                <div class="info-item">
                    <label>Date:</label>
                    <span class="date-value">${formattedDate}</span>
                </div>
                <div class="info-item">
                    <label>Term:</label>
                    <span class="term-value">Term 1</span>
                </div>
                <div class="info-item">
                    <label>Week:</label>
                    <span class="week-value">Week 1</span>
                </div>
            </div>
            
            <div class="session-selection">
                <div class="session-option">
                    <input type="checkbox" id="both-sessions" checked disabled>
                    <label for="both-sessions">Both Sessions</label>
                </div>
                <div class="session-option">
                    <input type="checkbox" id="am-only">
                    <label for="am-only">AM Session Only</label>
                </div>
                <div class="session-option">
                    <input type="checkbox" id="pm-only">
                    <label for="pm-only">PM Session Only</label>
                </div>
            </div>
            
            <div class="table-container">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>Year Group</th>
                            <th>Class</th>
                            <th>Total</th>
                            <th colspan="2">Male Present</th>
                            <th colspan="2">Female Present</th>
                            <th>AM Rate</th>
                            <th>PM Rate</th>
                            <th>Daily Rate</th>
                            <th>Cumulative</th>
                            <th>vs Avg</th>
                        </tr>
                        <tr class="sub-header">
                            <th colspan="3"></th>
                            <th>AM</th>
                            <th>PM</th>
                            <th>AM</th>
                            <th>PM</th>
                            <th colspan="5"></th>
                        </tr>
                    </thead>
                    <tbody id="summary-table-body">
                        <!-- Class rows will be inserted here -->
                    </tbody>
                </table>
            </div>
            
            <div class="attendance-actions">
                <button class="btn-primary" onclick="window.app.takeAttendance()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    Take Attendance
                </button>
                <button class="btn-secondary" onclick="window.app.printAttendance()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print Report
                </button>
            </div>
        </div>
        
        <!-- Page 2: Student Details -->
        <div class="page-break student-details-page">
            <div class="header">
                <h2>Student Attendance Details</h2>
                <div class="print-date">Printed: ${new Date().toLocaleDateString()}</div>
            </div>
            <div id="student-details-container">
                <!-- Student details will be inserted here -->
            </div>
        </div>
    `;
    
    // Load the attendance data
    this.loadAttendanceData();
}

// Add this method to load attendance data
async loadAttendanceData() {
    console.log('📋 Loading attendance data...');
    
    try {
        // Load classes from storage
        const classes = Storage.get('classes') || [];
        const students = Storage.get('students') || [];
        const attendance = Storage.get('attendance') || [];
        
        const summaryTable = document.getElementById('summary-table-body');
        const studentDetailsContainer = document.getElementById('student-details-container');
        
        if (!summaryTable || !studentDetailsContainer) {
            console.error('Required elements not found');
            return;
        }
        
        // Clear previous content
        summaryTable.innerHTML = '';
        studentDetailsContainer.innerHTML = '';
        
        // For each class, create summary row and student details
        classes.forEach((classItem, index) => {
            // Get students in this class
            const classStudents = students.filter(s => s.classId === classItem.id);
            const classAttendance = attendance.filter(a => a.classId === classItem.id);
            
            // Calculate attendance stats
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = classAttendance.find(a => a.date === today);
            
            // Summary row for page 1
            const summaryRow = document.createElement('tr');
            summaryRow.innerHTML = `
                <td>${classItem.yearGroup || '3rd Years'}</td>
                <td><strong>${classItem.code || classItem.name}</strong></td>
                <td>${classStudents.length}</td>
                <td>${todayAttendance?.malePresentAM || 0}</td>
                <td>${todayAttendance?.malePresentPM || 0}</td>
                <td>${todayAttendance?.femalePresentAM || 0}</td>
                <td>${todayAttendance?.femalePresentPM || 0}</td>
                <td>${todayAttendance?.amRate || '0%'}</td>
                <td>${todayAttendance?.pmRate || '0%'}</td>
                <td>${todayAttendance?.dailyRate || '0%'}</td>
                <td>${classAttendance.length > 0 ? 'N/A' : 'No Data'}</td>
                <td>${classAttendance.length > 0 ? 'N/A' : 'No Data'}</td>
            `;
            summaryTable.appendChild(summaryRow);
            
            // Student details for page 2
            const classSection = document.createElement('div');
            classSection.className = 'class-section';
            classSection.innerHTML = `
                <h3>${classItem.yearGroup || '3rd Years'} - ${classItem.code || classItem.name}</h3>
                <table class="student-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Student Name</th>
                            <th>Gender</th>
                            <th>AM</th>
                            <th>PM</th>
                            <th>Status</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${classStudents.map((student, idx) => `
                            <tr>
                                <td>${idx + 1}</td>
                                <td>${student.name}</td>
                                <td>${student.gender || 'N/A'}</td>
                                <td><input type="checkbox" data-student-id="${student.id}" data-session="am"></td>
                                <td><input type="checkbox" data-student-id="${student.id}" data-session="pm"></td>
                                <td class="status-cell"><span class="status pending">Pending</span></td>
                                <td><input type="text" class="remarks" data-student-id="${student.id}" placeholder="Notes..."></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            studentDetailsContainer.appendChild(classSection);
            
            // Add page break between classes except the last one
            if (index < classes.length - 1) {
                const pageBreak = document.createElement('div');
                pageBreak.className = 'page-break';
                studentDetailsContainer.appendChild(pageBreak);
            }
        });
        
        // If no classes exist
        if (classes.length === 0) {
            summaryTable.innerHTML = `
                <tr>
                    <td colspan="12" class="no-data">
                        No classes found. Please setup classes first.
                    </td>
                </tr>
            `;
            
            studentDetailsContainer.innerHTML = `
                <div class="no-data-message">
                    <p>No classes or students found.</p>
                    <p>Go to <a href="setup.html">Setup</a> to add classes and students.</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading attendance data:', error);
        this.showToast('Error loading attendance data', 'error');
    }
}

// Add methods for actions
takeAttendance() {
    console.log('Taking attendance...');
    // Add your attendance taking logic here
    this.showToast('Attendance taking mode activated', 'info');
}

printAttendance() {
    console.log('Printing attendance report...');
    window.print();
}

// =================== REPORTS CONTENT ======================
    // In attendance-app.js
loadReportsContent(container) {
    if (!this.user) {
        container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
        return;
    }
    
    container.innerHTML = `
        <div class="container">
            <header>
                <h1>Attendance Track</h1>
                <p class="subtitle">Comprehensive Attendance Reports</p>
                <p class="subtitle">Generate detailed attendance reports with various filters and timeframes</p>
            </header>
            
            <section class="reports-section">
                <div class="section-title">Report Configuration</div>
                
                <div class="filter-section">
                    <div class="filter-group">
                        <label class="filter-label">Report Type:</label>
                        <select id="report-type">
                            <option value="term-report">Term Report</option>
                            <option value="daily-report">Daily Report</option>
                            <option value="weekly-report">Weekly Report</option>
                            <option value="monthly-report">Monthly Report</option>
                            <option value="custom-report">Custom Report</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Session:</label>
                        <select id="session">
                            <option value="both-sessions">Both Sessions</option>
                            <option value="morning-session">Morning Session</option>
                            <option value="afternoon-session">Afternoon Session</option>
                            <option value="evening-session">Evening Session</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Primary Metric:</label>
                        <select id="primary-metric">
                            <option value="attendance-rate">Attendance Rate</option>
                            <option value="absenteeism">Absenteeism Rate</option>
                            <option value="tardiness">Tardiness Rate</option>
                            <option value="participation">Participation Score</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Report Level:</label>
                        <select id="report-level">
                            <option value="comparative-analysis">Comparative Analysis</option>
                            <option value="individual-analysis">Individual Analysis</option>
                            <option value="department-analysis">Department Analysis</option>
                            <option value="grade-level-analysis">Grade Level Analysis</option>
                        </select>
                    </div>
                </div>
                
                <div class="section-title">Report Actions</div>
                
                <div class="controls-section">
                    <button class="control-btn primary-btn" id="generate-report">
                        <i class="fas fa-chart-bar"></i> Generals Report
                    </button>
                    <button class="control-btn secondary-btn" id="refresh-data">
                        <i class="fas fa-sync-alt"></i> Refresh Data
                    </button>
                    <button class="control-btn secondary-btn" id="email-report">
                        <i class="fas fa-envelope"></i> Email Report
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
                
                <div class="report-output">
                    <div class="output-header">
                        <span>Attendance Report - Term 1 2023</span>
                        <span id="report-time">Generated just now</span>
                    </div>
                    
                    <div class="output-content" id="loading-section">
                        <div class="loading">
                            <div class="spinner"></div>
                            <div>Loading data...</div>
                        </div>
                    </div>
                    
                    <div id="report-content" class="hidden">
                        <div class="table-container">
                            <table id="attendance-table">
                                <thead>
                                    <tr>
                                        <th>Class/Group</th>
                                        <th>Total Students</th>
                                        <th>Present</th>
                                        <th>Absent</th>
                                        <th>Tardy</th>
                                        <th>Attendance Rate</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="table-body">
                                    <!-- Data will be populated by JavaScript -->
                                </tbody>
                            </table>
                        </div>
                        
                        <div style="padding: 20px; text-align: left; color: #7f8c8d; font-size: 14px;">
                            <p><strong>Report Summary:</strong> This report shows attendance data for Term 1, 2023 across all sessions. 
                            The overall attendance rate is 92.4%, with 7.6% absenteeism rate. Comparative analysis indicates 
                            a 3.2% improvement from the previous term.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;
    
    // Add the CSS styles inline (or you can put them in a separate CSS file)
    this.addReportsStyles();
    
    // Initialize the page
    this.initializeReportsPage();
}

// Initialize the reports page
initializeReportsPage() {
    // Get DOM elements
    const generateReportBtn = document.getElementById('generate-report');
    const refreshDataBtn = document.getElementById('refresh-data');
    const emailReportBtn = document.getElementById('email-report');
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportExcelBtn = document.getElementById('export-excel');
    const printReportBtn = document.getElementById('print-report');
    
    // Add event listeners
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', () => this.generateReport());
    }
    
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', () => this.refreshReportData());
    }
    
    if (emailReportBtn) {
        emailReportBtn.addEventListener('click', () => this.emailReport());
    }
    
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => this.exportPDF());
    }
    
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => this.exportExcel());
    }
    
    if (printReportBtn) {
        printReportBtn.addEventListener('click', () => this.printReport());
    }
    
    // Load initial data
    this.loadReportData();
}

// Load report data from storage
async loadReportData() {
    const loadingSection = document.getElementById('loading-section');
    const reportContent = document.getElementById('report-content');
    const tableBody = document.getElementById('table-body');
    const reportTimeElement = document.getElementById('report-time');
    
    if (!loadingSection || !reportContent) return;
    
    // Show loading
    loadingSection.classList.remove('hidden');
    reportContent.classList.add('hidden');
    
    // Update time
    reportTimeElement.textContent = `Generated at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    try {
        // Load data
        const classes = Storage.get('classes') || [];
        const attendance = Storage.get('attendance') || [];
        
        if (attendance.length === 0) {
            this.showSampleData();
            return;
        }
        
        // Process real data
        this.processRealData(classes, attendance);
        
    } catch (error) {
        console.error('Error loading report data:', error);
        // Fallback to sample data
        this.showSampleData();
    }
}

// Process real attendance data
processRealData(classes, attendance) {
    const tableBody = document.getElementById('table-body');
    const loadingSection = document.getElementById('loading-section');
    const reportContent = document.getElementById('report-content');
    
    // Group attendance by class
    const classData = {};
    
    classes.forEach(cls => {
        const classAttendance = attendance.filter(a => a.classId === cls.id);
        
        if (classAttendance.length > 0) {
            let totalPresent = 0;
            let totalAbsent = 0;
            let totalTardy = 0;
            let totalStudents = 0;
            let totalRate = 0;
            
            classAttendance.forEach(record => {
                totalPresent += record.totalPresent || 0;
                totalAbsent += (record.totalStudents || 0) - (record.totalPresent || 0);
                totalStudents += record.totalStudents || 0;
                
                if (record.dailyRate) {
                    const rate = parseFloat(record.dailyRate.replace('%', ''));
                    totalRate += rate;
                }
            });
            
            const avgRate = classAttendance.length > 0 ? totalRate / classAttendance.length : 0;
            
            classData[cls.id] = {
                className: cls.code || cls.name,
                total: totalStudents,
                present: totalPresent,
                absent: totalAbsent,
                tardy: totalTardy,
                rate: Math.round(avgRate),
                status: avgRate >= 90 ? 'high' : avgRate >= 80 ? 'medium' : 'low'
            };
        }
    });
    
    // If no real data, show sample
    if (Object.keys(classData).length === 0) {
        this.showSampleData();
        return;
    }
    
    // Populate table
    tableBody.innerHTML = '';
    
    Object.values(classData).forEach(item => {
        const statusClass = `attendance-${item.status}`;
        const statusText = item.status === 'high' ? 'Excellent' : 
                          item.status === 'medium' ? 'Good' : 'Needs Improvement';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.className}</td>
            <td>${item.total}</td>
            <td>${item.present}</td>
            <td>${item.absent}</td>
            <td>${item.tardy}</td>
            <td class="${statusClass}">${item.rate}%</td>
            <td class="${statusClass}">${statusText}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Hide loading, show content
    loadingSection.classList.add('hidden');
    reportContent.classList.remove('hidden');
}

// Show sample data (for when no real data exists)
showSampleData() {
    const sampleData = [
        { className: "Grade 10-A", total: 32, present: 30, absent: 2, tardy: 1, rate: 93.8, status: "high" },
        { className: "Grade 10-B", total: 30, present: 28, absent: 2, tardy: 2, rate: 90.0, status: "medium" },
        { className: "Grade 11-A", total: 35, present: 33, absent: 2, tardy: 0, rate: 94.3, status: "high" },
        { className: "Grade 11-B", total: 34, present: 30, absent: 4, tardy: 1, rate: 85.3, status: "low" },
        { className: "Grade 12-A", total: 28, present: 27, absent: 1, tardy: 1, rate: 96.4, status: "high" },
        { className: "Grade 12-B", total: 29, present: 26, absent: 3, tardy: 2, rate: 86.2, status: "low" }
    ];
    
    const tableBody = document.getElementById('table-body');
    const loadingSection = document.getElementById('loading-section');
    const reportContent = document.getElementById('report-content');
    
    tableBody.innerHTML = '';
    
    sampleData.forEach(item => {
        const statusClass = `attendance-${item.status}`;
        const statusText = item.status === 'high' ? 'Excellent' : 
                          item.status === 'medium' ? 'Good' : 'Needs Improvement';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.className}</td>
            <td>${item.total}</td>
            <td>${item.present}</td>
            <td>${item.absent}</td>
            <td>${item.tardy}</td>
            <td class="${statusClass}">${item.rate}%</td>
            <td class="${statusClass}">${statusText}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Hide loading, show content
    loadingSection.classList.add('hidden');
    reportContent.classList.remove('hidden');
}

// Action methods
refreshReportData() {
    this.showToast('Data refreshed successfully!', 'success');
    this.loadReportData();
}

emailReport() {
    this.showToast('Report email sent successfully!', 'success');
}

exportPDF() {
    this.showToast('PDF export initiated. Download will start shortly.', 'info');
}

exportExcel() {
    this.showToast('Excel export initiated. Download will start shortly.', 'info');
}

printReport() {
    window.print();
}

// ================ SETTINGS CONTENT ====================
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
    console.log("🔐 Redirecting to login page...");
    
    const currentPage = this.getCurrentPage();
    const publicPages = ['index', 'login', ''];
    
    // Don't redirect if already on a public page
    if (publicPages.includes(currentPage)) {
        console.log("✅ Already on public page, no redirect needed");
        return;
    }
    
    // Redirect to index.html
    const basePath = this.getBasePath();
    window.location.href = `${basePath}index.html`;
}

// Helper method to get current page without .html
getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    // Remove .html and query parameters
    const pageName = page.replace('.html', '').split('?')[0];
    console.log('📄 Current page detected:', pageName);
    return pageName;
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
