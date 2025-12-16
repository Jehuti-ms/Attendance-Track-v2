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
            
            console.log('✅ AttendanceApp initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError(error.message);
        }
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

    async loadDashboardContent(container) {
        if (!this.state.currentUser) {
            this.goToLogin();
            return;
        }
        
        // Import DashboardManager dynamically
        import('./dashboard.js').then(module => {
            this.dashboardManager = new module.DashboardManager(this);
            this.dashboardManager.init();
        }).catch(error => {
            console.error('Failed to load dashboard module:', error);
            this.loadBasicDashboardContent(container);
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
