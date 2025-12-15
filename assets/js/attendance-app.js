// attendance-app.js - Updated with proper Storage handling
console.log('🎯 attendance-app.js loading');

// Try to import utils, but have fallbacks
let Utils, Storage;

(async function initApp() {
    try {
        // Try to import utils
        const utilsModule = await import('./utils.js');
        Utils = utilsModule.Utils;
        Storage = utilsModule.Storage;
        console.log('✅ Utils imported successfully');
    } catch (error) {
        console.warn('⚠️ Could not import utils.js, using fallbacks:', error);
        
        // Fallback implementations
        Utils = {
            formatDate: (date = new Date()) => {
                const d = new Date(date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            },
            showToast: (message, type = 'info') => {
                console.log(`[${type}] ${message}`);
                alert(message);
            }
        };
        
        Storage = {
            get: (key, defaultValue = null) => {
                try {
                    const item = localStorage.getItem(key);
                    return item ? JSON.parse(item) : defaultValue;
                } catch (e) {
                    console.error(`Error getting ${key}:`, e);
                    return defaultValue;
                }
            },
            set: (key, value) => {
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (e) {
                    console.error(`Error setting ${key}:`, e);
                    return false;
                }
            },
            remove: (key) => {
                try {
                    localStorage.removeItem(key);
                    return true;
                } catch (e) {
                    console.error(`Error removing ${key}:`, e);
                    return false;
                }
            }
        };
    }

    // Now define the AttendanceApp class
    class AttendanceApp {
        constructor() {
            console.log('🎯 AttendanceApp constructor');
            
            this.state = {
                currentUser: null,
                currentPage: this.getCurrentPage(),
                isOnline: navigator.onLine
            };

            this.init();
        }

        getCurrentPage() {
            const path = window.location.pathname;
            const page = path.split('/').pop() || 'index.html';
            return page.replace('.html', '');
        }

        async init() {
            console.log('🚀 Initializing AttendanceApp...');
            
            try {
                // Check for existing user
                const user = Storage.get('attendance_user');
                if (user) {
                    this.state.currentUser = user;
                    console.log('User found:', user.name);
                }

                // Load UI
                await this.loadUI();
                
                console.log('✅ AttendanceApp initialized successfully');
                
            } catch (error) {
                console.error('❌ Error initializing app:', error);
                this.showError(error.message);
            }
        }

        async loadUI() {
            // Load header
            const headerContainer = document.getElementById('header-container');
            if (headerContainer) {
                headerContainer.innerHTML = `
                    <header style="
                        background: #405dde;
                        color: white;
                        padding: 15px 30px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <h1 style="margin: 0; font-size: 1.5rem;">
                                📋 Attendance Track v2
                            </h1>
                        </div>
                        <div>
                            ${this.state.currentUser ? `
                                <span>Welcome, ${this.state.currentUser.name}</span>
                                <button onclick="app.logout()" style="
                                    margin-left: 15px;
                                    padding: 8px 16px;
                                    background: white;
                                    color: #405dde;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                ">
                                    Logout
                                </button>
                            ` : `
                                <button onclick="app.goToLogin()" style="
                                    padding: 8px 16px;
                                    background: white;
                                    color: #405dde;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                ">
                                    Login
                                </button>
                                <button onclick="app.startDemoMode()" style="
                                    margin-left: 10px;
                                    padding: 8px 16px;
                                    background: transparent;
                                    color: white;
                                    border: 1px solid white;
                                    border-radius: 4px;
                                    cursor: pointer;
                                ">
                                    Try Demo
                                </button>
                            `}
                        </div>
                    </header>
                `;
            }

            // Load main content
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                // Hide loading
                const loadingContent = document.getElementById('loading-content');
                if (loadingContent) {
                    loadingContent.style.display = 'none';
                }

                // Show welcome message
                appContainer.innerHTML = `
                    <div style="padding: 40px; text-align: center;">
                        <h1>Welcome to Attendance Track v2</h1>
                        <p style="margin: 20px 0; color: #666;">
                            A modern attendance tracking system
                        </p>
                        ${this.state.currentUser ? `
                            <div>
                                <p>You are logged in as ${this.state.currentUser.name}</p>
                                <button onclick="app.goToDashboard()" style="
                                    padding: 12px 24px;
                                    background: #405dde;
                                    color: white;
                                    border: none;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    margin-top: 20px;
                                ">
                                    Go to Dashboard
                                </button>
                            </div>
                        ` : `
                            <div>
                                <button onclick="app.goToLogin()" style="
                                    padding: 12px 24px;
                                    background: #405dde;
                                    color: white;
                                    border: none;
                                    border-radius: 6px;
                                    cursor: pointer;
                                ">
                                    Login
                                </button>
                                <button onclick="app.startDemoMode()" style="
                                    padding: 12px 24px;
                                    background: white;
                                    color: #405dde;
                                    border: 2px solid #405dde;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    margin-left: 15px;
                                ">
                                    Try Demo
                                </button>
                            </div>
                        `}
                    </div>
                `;
            }
        }

        // Navigation methods
        getBasePath() {
            const pathname = window.location.pathname;
            if (pathname.includes('/Attendance-Track-v2/')) {
                return '/Attendance-Track-v2/';
            }
            return '/';
        }

        navigateTo(page) {
            window.location.href = this.getBasePath() + page + '.html';
        }

        goToLogin() { this.navigateTo('login'); }
        goToDashboard() { this.navigateTo('dashboard'); }
        goToAttendance() { this.navigateTo('attendance'); }
        goToReports() { this.navigateTo('reports'); }

        startDemoMode() {
            const demoUser = {
                id: 'demo-001',
                name: 'Demo Teacher',
                email: 'demo@school.edu',
                role: 'teacher',
                demo: true
            };
            
            Storage.set('attendance_user', demoUser);
            this.state.currentUser = demoUser;
            Utils.showToast('Demo mode activated!', 'success');
            setTimeout(() => this.goToDashboard(), 1000);
        }

        logout() {
            console.log('Logout called');
            try {
                Storage.remove('attendance_user');
                Storage.remove('demo_mode');
                this.state.currentUser = null;
                Utils.showToast('Logged out', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error('Logout error:', error);
                // Fallback
                localStorage.clear();
                window.location.reload();
            }
        }

        showError(message) {
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #dc3545;">
                        <h2>Error</h2>
                        <p>${message}</p>
                        <button onclick="window.location.reload()" style="
                            padding: 10px 20px;
                            background: #405dde;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            margin-top: 20px;
                        ">
                            Reload
                        </button>
                    </div>
                `;
            }
        }
    }

    // Create global instance
    window.app = new AttendanceApp();
})();
