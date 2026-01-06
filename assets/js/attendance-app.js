// attendance-app.js - Main App Integration
import { Auth } from './firebase.js';

class AttendanceApp {
    constructor() {
        this.auth = Auth;
        this.currentUser = null;
        this.modules = {};
        this.initialized = false;
    }

    // Main initialization
    async init() {
        try {
            console.log('📱 AttendanceApp initializing...');
            
            // Check authentication
            const isAuthenticated = await this.checkAuth();
            if (!isAuthenticated) {
                window.location.href = 'login.html';
                return false;
            }
            
            // Get current user
            this.currentUser = this.auth.getCurrentUser();
            
            // Register globally
            window.app = this;
            
            this.initialized = true;
            console.log('✅ AttendanceApp initialized');
            return true;
            
        } catch (error) {
            console.error('❌ AttendanceApp init error:', error);
            return false;
        }
    }

    // Check authentication
    async checkAuth() {
        try {
            // Check Firebase auth
            const user = this.auth.getCurrentUser();
            
            if (user) {
                console.log('✅ User authenticated:', user.email);
                return true;
            }
            
            // Fallback to localStorage
            const storedUser = localStorage.getItem('attendance_user');
            if (storedUser) {
                console.log('✅ User authenticated (localStorage)');
                return true;
            }
            
            console.log('❌ No user authenticated');
            return false;
            
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    // Load header component
    async loadHeader(container) {
        if (!container) return;
        
        try {
            console.log('Loading header...');
            
            // Use ComponentLoader if available
            if (window.ComponentLoader) {
                await window.ComponentLoader.loadComponent('header', 'header-container');
            } else {
                // Fallback: create basic header
                container.innerHTML = this.createBasicHeader();
            }
            
            // Setup header events
            this.setupHeaderEvents();
            
        } catch (error) {
            console.error('Header load error:', error);
            container.innerHTML = '<div class="header-error">Header load failed</div>';
        }
    }

    // Load footer component
    async loadFooter(container) {
        if (!container) return;
        
        try {
            console.log('Loading footer...');
            
            if (window.ComponentLoader) {
                await window.ComponentLoader.loadComponent('footer', 'footer-container');
            } else {
                container.innerHTML = this.createBasicFooter();
            }
            
        } catch (error) {
            console.error('Footer load error:', error);
            container.innerHTML = '<div class="footer-error">Footer load failed</div>';
        }
    }

    // Create basic header HTML
    createBasicHeader() {
        const user = JSON.parse(localStorage.getItem('attendance_user') || '{}');
        const userName = user.name || user.email || 'User';
        
        return `
            <header class="app-header">
                <div class="header-left">
                    <div class="logo">
                        <img src="./assets/icons/icon-192.png" alt="Logo" width="40">
                        <span class="app-name">Attendance Track</span>
                    </div>
                </div>
                
                <div class="header-center">
                    <nav class="main-nav">
                        <a href="dashboard.html" class="nav-link">
                            <i class="fas fa-tachometer-alt"></i> Dashboard
                        </a>
                        <a href="attendance.html" class="nav-link active">
                            <i class="fas fa-calendar-check"></i> Attendance
                        </a>
                        <a href="reports.html" class="nav-link">
                            <i class="fas fa-chart-bar"></i> Reports
                        </a>
                        <a href="maintenance.html" class="nav-link">
                            <i class="fas fa-cogs"></i> Setup
                        </a>
                        <a href="export.html" class="nav-link">
                            <i class="fas fa-file-export"></i> Export
                        </a>
                    </nav>
                </div>
                
                <div class="header-right">
                    <div class="user-menu">
                        <div class="user-info">
                            <div class="user-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <span class="user-name">${userName}</span>
                        </div>
                        <div class="dropdown-menu">
                            <a href="profile.html" class="dropdown-item">
                                <i class="fas fa-user"></i> Profile
                            </a>
                            <a href="settings.html" class="dropdown-item">
                                <i class="fas fa-cog"></i> Settings
                            </a>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item logout-btn">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }

    // Create basic footer HTML
    createBasicFooter() {
        return `
            <footer class="app-footer">
                <div class="footer-content">
                    <div class="footer-left">
                        <span class="copyright">Attendance Track v2 &copy; ${new Date().getFullYear()}</span>
                    </div>
                    <div class="footer-center">
                        <span class="version">Version 2.0.0</span>
                    </div>
                    <div class="footer-right">
                        <a href="#" class="footer-link">Help</a>
                        <span class="footer-separator">•</span>
                        <a href="#" class="footer-link">Privacy</a>
                        <span class="footer-separator">•</span>
                        <a href="#" class="footer-link">Terms</a>
                    </div>
                </div>
            </footer>
        `;
    }

    // Setup header events
    setupHeaderEvents() {
        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Dropdown menu toggle
        const userMenu = document.querySelector('.user-menu');
        if (userMenu) {
            userMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = userMenu.querySelector('.dropdown-menu');
                if (dropdown) {
                    dropdown.classList.toggle('show');
                }
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            const dropdowns = document.querySelectorAll('.dropdown-menu.show');
            dropdowns.forEach(dropdown => dropdown.classList.remove('show'));
        });
    }

    // Logout function
    async logout() {
        try {
            // Firebase logout
            if (this.auth.signOutUser) {
                await this.auth.signOutUser();
            }
            
            // Clear localStorage
            localStorage.removeItem('attendance_user');
            
            // Redirect to login
            window.location.href = 'login.html';
            
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = 'login.html';
        }
    }

    // ========== MODULE LOADING METHODS ==========
    
    // Load attendance content
    async loadAttendanceContent(container) {
        try {
            console.log('📊 Loading attendance module...');
            
            // Clear and show loading
            container.innerHTML = this.createLoadingHTML('Loading attendance report...');
            
            // Import attendance module
            const { AttendanceModule } = await import('./modules/attendance.js');
            
            // Initialize module
            const module = new AttendanceModule(this);
            await module.init();
            
            // Store module reference
            this.modules.attendance = module;
            
            // Render module UI
            container.innerHTML = module.render();
            
            console.log('✅ Attendance module loaded');
            
        } catch (error) {
            console.error('Attendance module load error:', error);
            container.innerHTML = this.createErrorHTML('Failed to load attendance module', error);
        }
    }

    // Load dashboard content
    async loadDashboardContent(container) {
        try {
            console.log('📈 Loading dashboard...');
            
            container.innerHTML = this.createLoadingHTML('Loading dashboard...');
            
            // You would import a DashboardModule here
            const { DashboardModule } = await import('./modules/dashboard.js');
            const module = new DashboardModule(this);
            await module.init();
            this.modules.dashboard = module;
            
            container.innerHTML = module.render();
            
            console.log('✅ Dashboard loaded');
            
        } catch (error) {
            console.error('Dashboard load error:', error);
            container.innerHTML = this.createErrorHTML('Failed to load dashboard', error);
        }
    }

    // Load reports content
    async loadReportsContent(container) {
        try {
            console.log('📋 Loading reports...');
            
            container.innerHTML = this.createLoadingHTML('Loading reports...');
            
            // Import from your existing reports.js
            const { ReportsModule } = await import('./modules/reports.js');
            const module = new ReportsModule(this);
            await module.init();
            this.modules.reports = module;
            
            container.innerHTML = this.createReportsHTML();
            
            console.log('✅ Reports module loaded');
            
        } catch (error) {
            console.error('Reports load error:', error);
            container.innerHTML = this.createErrorHTML('Failed to load reports', error);
        }
    }

    // Load maintenance/setup content
    async loadMaintenanceContent(container) {
        try {
            console.log('⚙️ Loading maintenance...');
            
            container.innerHTML = this.createLoadingHTML('Loading setup...');
            
            // You would import a MaintenanceModule here
            const { MaintenanceModule } = await import('./modules/maintenance.js');
            const module = new MaintenanceModule(this);
            await module.init();
            this.modules.maintenance = module;
            
            container.innerHTML = module.render();
            
            console.log('✅ Maintenance module loaded');
            
        } catch (error) {
            console.error('Maintenance load error:', error);
            container.innerHTML = this.createErrorHTML('Failed to load setup', error);
        }
    }

    // Load export content
    async loadExportContent(container) {
        try {
            console.log('📤 Loading export...');
            
            container.innerHTML = this.createLoadingHTML('Loading export module...');
            
            // Use your existing ExportModule
            const { ExportModule } = await import('./modules/export.js');
            const module = new ExportModule(this);
            await module.initialize();
            this.modules.export = module;
            
            // Render the export interface
            module.renderExportInterface();
            
            console.log('✅ Export module loaded');
            
        } catch (error) {
            console.error('Export load error:', error);
            container.innerHTML = this.createErrorHTML('Failed to load export module', error);
        }
    }

    // ========== HELPER METHODS ==========
    
    createLoadingHTML(message = 'Loading...') {
        return `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p>${message}</p>
            </div>
        `;
    }

    createErrorHTML(message, error = null) {
        const errorDetails = error ? `<small>${error.message}</small>` : '';
        
        return `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error</h3>
                <p>${message}</p>
                ${errorDetails}
                <div class="error-actions">
                    <button onclick="window.location.reload()" class="btn-primary">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                    <a href="dashboard.html" class="btn-secondary">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </a>
                </div>
            </div>
        `;
    }

    createReportsHTML() {
        return `
            <div class="reports-container">
                <div class="page-header">
                    <h1><i class="fas fa-chart-bar"></i> Reports</h1>
                    <p class="subtitle">Generate and view attendance reports</p>
                </div>
                
                <div class="reports-grid">
                    <div class="report-card">
                        <div class="card-icon">
                            <i class="fas fa-calendar-day"></i>
                        </div>
                        <h3>Daily Report</h3>
                        <p>View today's attendance summary</p>
                        <button class="btn-primary" onclick="app.generateDailyReport()">
                            Generate
                        </button>
                    </div>
                    
                    <div class="report-card">
                        <div class="card-icon">
                            <i class="fas fa-calendar-week"></i>
                        </div>
                        <h3>Weekly Report</h3>
                        <p>Weekly attendance trends and analysis</p>
                        <button class="btn-primary" onclick="app.generateWeeklyReport()">
                            Generate
                        </button>
                    </div>
                    
                    <div class="report-card">
                        <div class="card-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <h3>Monthly Report</h3>
                        <p>Monthly attendance statistics</p>
                        <button class="btn-primary" onclick="app.generateMonthlyReport()">
                            Generate
                        </button>
                    </div>
                    
                    <div class="report-card">
                        <div class="card-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <h3>Class Report</h3>
                        <p>Class-wise attendance analysis</p>
                        <button class="btn-primary" onclick="app.generateClassReport()">
                            Generate
                        </button>
                    </div>
                    
                    <div class="report-card">
                        <div class="card-icon">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <h3>Student Report</h3>
                        <p>Individual student attendance history</p>
                        <button class="btn-primary" onclick="app.generateStudentReport()">
                            Generate
                        </button>
                    </div>
                    
                    <div class="report-card">
                        <div class="card-icon">
                            <i class="fas fa-file-export"></i>
                        </div>
                        <h3>Custom Report</h3>
                        <p>Create custom reports with filters</p>
                        <button class="btn-primary" onclick="app.showCustomReport()">
                            Create
                        </button>
                    </div>
                </div>
                
                <div class="recent-reports">
                    <h3>Recent Reports</h3>
                    <div class="reports-list" id="reports-list">
                        <p class="no-data">No recent reports</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== GLOBAL METHODS FOR HTML PAGES ==========
    
    // For dashboard.html
    async loadPageContent(container) {
        // This is called from dashboard.html
        await this.loadDashboardContent(container);
    }

    // For reports.html
    async loadReportsPage(container) {
        await this.loadReportsContent(container);
    }

    // For maintenance.html
    async loadMaintenancePage(container) {
        await this.loadMaintenanceContent(container);
    }

    // For export.html
    async loadExportPage(container) {
        await this.loadExportContent(container);
    }

    // For setup.html
    async loadSetupPage(container) {
        // Setup is same as maintenance
        await this.loadMaintenanceContent(container);
    }

    // File import handler (for setup page)
    handleFileImport(file) {
        console.log('File import:', file);
        // Implement file import logic here
        alert(`File selected: ${file.name}`);
    }
}

// Create and initialize the app
const attendanceApp = new AttendanceApp();

// Export for module usage
export { AttendanceApp, attendanceApp };

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📱 DOM loaded, initializing AttendanceApp...');
        await attendanceApp.init();
    });
} else {
    console.log('📱 DOM already loaded, initializing AttendanceApp...');
    attendanceApp.init();
}

// Also initialize when window loads
window.addEventListener('load', () => {
    console.log('🖥️ Window loaded');
});
