// attendance-app.js - Updated with navigation functions
import { AuthModule } from './auth.js';
import { DashboardModule } from './dashboard.js';
import { SetupModule } from './setup.js';
import { AttendanceModule } from './attendance.js';
import { ReportsModule } from './reports.js';
import { ExportModule } from './export.js';
import { MaintenanceModule } from './maintenance.js';
import { SettingsModule } from './settings.js';
import { ImportModule } from './import.js';
import { Utils, Storage } from './utils.js';

class AttendanceApp {
    constructor() {
        console.log('🎯 AttendanceApp constructor');
        
        this.state = {
            currentUser: null,
            currentPage: this.getCurrentPage(),
            settings: Storage.get('gams_settings', {}),
            classes: Storage.get('gams_classes', []),
            attendanceRecords: Storage.get('gams_attendance', []),
            terms: Storage.get('gams_terms', [
                { id: 'term1', name: 'Term 1', startDate: '2024-09-08', endDate: '2024-12-15', weeks: 14, isActive: true },
                { id: 'term2', name: 'Term 2', startDate: '2025-01-08', endDate: '2025-04-15', weeks: 14, isActive: true },
                { id: 'term3', name: 'Term 3', startDate: '2025-04-22', endDate: '2025-07-15', weeks: 12, isActive: true }
            ]),
            cumulativeData: Storage.get('gams_cumulative', {}),
            historicalAverages: Storage.get('gams_averages', {}),
            isOnline: navigator.onLine
        };

        this.modules = {
            auth: new AuthModule(this),
            dashboard: new DashboardModule(this),
            setup: new SetupModule(this),
            attendance: new AttendanceModule(this),
            reports: new ReportsModule(this),
            export: new ExportModule(this),
            maintenance: new MaintenanceModule(this),
            settings: new SettingsModule(this),
            import: new ImportModule(this)
        };

        this.init();
    }

    // ========== NAVIGATION FUNCTIONS (from main.js) ==========
    getBasePath() {
        const pathname = window.location.pathname;
        
        if (pathname.includes('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        } else if (pathname === '/Attendance-Track-v2/' || pathname === '/Attendance-Track-v2') {
            return '/Attendance-Track-v2/';
        }
        return '/';
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page.replace('.html', '');
    }

    navigateTo(pageName) {
        console.log(`Navigating to: ${pageName}`);
        const basePath = this.getBasePath();
        window.location.href = `${basePath}${pageName}.html`;
    }

    goToLogin() { this.navigateTo('login'); }
    goToAttendance() { this.navigateTo('attendance'); }
    goToReports() { this.navigateTo('reports'); }
    goToSettings() { this.navigateTo('settings'); }
    goToDashboard() { this.navigateTo('dashboard'); }
    goToSetup() { this.navigateTo('setup'); }
    goToMaintenance() { this.navigateTo('maintenance'); }
    goToIndex() { this.navigateTo('index'); }

    logout() {
        Storage.remove('attendance_user');
        Storage.remove('demo_mode');
        this.state.currentUser = null;
        this.showNotification('Logged out successfully', 'success');
        setTimeout(() => this.goToLogin(), 1000);
    }

    startDemoMode() {
        console.log("🚀 Starting demo mode...");
        
        const demoUser = {
            id: 'demo-001',
            name: 'Demo Teacher',
            email: 'demo@school.edu',
            role: 'teacher',
            school: 'Demo Academy',
            demo: true
        };
        
        Storage.set('attendance_user', demoUser);
        Storage.set('demo_mode', 'true');
        this.state.currentUser = demoUser;
        
        this.showNotification('Demo mode activated!', 'success');
        setTimeout(() => this.goToDashboard(), 1500);
    }

    showNotification(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        Utils.showToast(message, type);
    }

    // ========== MAIN INITIALIZATION ==========
    async init() {
        console.log('🚀 Initializing AttendanceApp...');
        
        try {
            // Check authentication
            const user = Storage.get('attendance_user');
            if (user) {
                this.state.currentUser = user;
                console.log('User found:', user.name);
            }

            // Load header
            await this.loadHeader();
            
            // Load main content
            await this.loadMainContent();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize service worker
            this.initServiceWorker();
            
            console.log('✅ AttendanceApp initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing AttendanceApp:', error);
            this.showNotification(`Initialization error: ${error.message}`, 'error');
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
                            <div>
                                <div class="user-name">${this.state.currentUser.name}</div>
                                <div class="user-role">${this.state.currentUser.role}</div>
                            </div>
                        </div>
                        <button class="btn btn-outline" onclick="app.logout()">Logout</button>
                    ` : `
                        <button class="btn btn-primary" onclick="app.goToLogin()">Login</button>
                        <button class="btn btn-secondary" onclick="app.startDemoMode()">Try Demo</button>
                    `}
                </div>
            </header>
        `;
    }

    async loadMainContent() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;

        // Load page-specific content
        if (this.state.currentUser) {
            await this.modules.dashboard.init();
        } else {
            await this.loadLandingPage();
        }
    }

    async loadLandingPage() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="landing-page">
                <div class="hero">
                    <div class="hero-icon">📋</div>
                    <h1>Attendance Track v2</h1>
                    <p class="hero-subtitle">Modern attendance tracking for educational institutions</p>
                    <div class="hero-actions">
                        <button class="btn btn-lg btn-primary" onclick="app.goToLogin()">
                            Login to Start
                        </button>
                        <button class="btn btn-lg btn-outline" onclick="app.startDemoMode()">
                            Try Demo Mode
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Online/offline status
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.updateOnlineStatus();
            this.showNotification('You are back online', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.updateOnlineStatus();
            this.showNotification('You are offline', 'warning');
        });
    }

    updateOnlineStatus() {
        const onlineStatus = document.getElementById('online-status');
        if (onlineStatus) {
            onlineStatus.innerHTML = `● ${this.state.isOnline ? 'Online' : 'Offline'}`;
            onlineStatus.style.color = this.state.isOnline ? '#28a745' : '#dc3545';
        }
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            const basePath = this.getBasePath();
            const swPath = basePath === '/' ? 'service-worker.js' : basePath + 'service-worker.js';
            
            navigator.serviceWorker.register(swPath)
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration.scope);
                })
                .catch(error => {
                    console.warn('⚠️ Service Worker registration failed:', error);
                });
        }
    }
}

// Create global instance
window.app = new AttendanceApp();
