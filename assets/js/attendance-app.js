// attendance-app.js - FIXED VERSION
class AttendanceApp {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
        this.modules = {};
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
            this.currentUser = this.getCurrentUser();
            
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
            // Check localStorage
            const storedUser = localStorage.getItem('attendance_user');
            if (storedUser) {
                console.log('✅ User authenticated (localStorage)');
                return true;
            }
            
            // Check Firebase if available
            if (typeof window !== 'undefined' && window.Auth) {
                const user = window.Auth.getCurrentUser();
                if (user) {
                    console.log('✅ User authenticated (Firebase)');
                    return true;
                }
            }
            
            console.log('❌ No user authenticated');
            return false;
            
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    // Get current user
    getCurrentUser() {
        try {
            const storedUser = localStorage.getItem('attendance_user');
            if (storedUser) {
                return JSON.parse(storedUser);
            }
            return null;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
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
            container.innerHTML = this.createBasicHeader();
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
            container.innerHTML = this.createBasicFooter();
        }
    }

    // Create basic header HTML
    createBasicHeader() {
        const user = this.getCurrentUser();
        const userName = user?.name || user?.email || 'User';
        
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
            // Firebase logout if available
            if (window.Auth && window.Auth.signOutUser) {
                await window.Auth.signOutUser();
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
    
    // Load attendance content (main method called from attendance.html)
    async loadAttendanceContent(container) {
        try {
            console.log('📊 Loading attendance module...');
            
            // Clear and show loading
            container.innerHTML = this.createLoadingHTML('Loading attendance...');
            
            // Dynamically import your existing attendance module
            const { AttendanceManager } = await import('./attendance.js');
            
            // Initialize the module
            const attendanceModule = new AttendanceManager(this);
            await attendanceModule.init();
            
            // Store reference
            this.modules.attendance = attendanceModule;
            
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
            
            // Simple dashboard for now
            container.innerHTML = this.createDashboardHTML();
            
            // Load dashboard data
            this.loadDashboardData();
            
            console.log('✅ Dashboard loaded');
            
        } catch (error) {
            console.error('Dashboard load error:', error);
            container.innerHTML = this.createErrorHTML('Failed to load dashboard', error);
        }
    }

    // Load dashboard data
    loadDashboardData() {
        try {
            // Load data from localStorage
            const classes = JSON.parse(localStorage.getItem('attendance_classes') || '[]');
            const attendance = JSON.parse(localStorage.getItem('attendance_records') || '[]');
            
            // Update dashboard stats
            const totalClassesEl = document.getElementById('total-classes');
            const totalAttendanceEl = document.getElementById('total-attendance');
            const attendanceRateEl = document.getElementById('attendance-rate');
            const pendingEl = document.getElementById('pending');
            
            if (totalClassesEl) totalClassesEl.textContent = classes.length;
            
            // Calculate today's attendance
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendance.filter(record => record.date === today);
            let totalPresent = 0;
            let totalPossible = 0;
            
            todayAttendance.forEach(record => {
                record.classes?.forEach(cls => {
                    totalPresent += (cls.male?.am || 0) + (cls.male?.pm || 0) + 
                                  (cls.female?.am || 0) + (cls.female?.pm || 0);
                    totalPossible += cls.totalStudents * 2; // AM and PM
                });
            });
            
            if (totalAttendanceEl) totalAttendanceEl.textContent = todayAttendance.length;
            if (attendanceRateEl) {
                const rate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
                attendanceRateEl.textContent = `${rate}%`;
            }
            if (pendingEl) pendingEl.textContent = '0';
            
        } catch (error) {
            console.error('Dashboard data load error:', error);
        }
    }

    // Load reports content
    async loadReportsContent(container) {
        try {
            console.log('📋 Loading reports...');
            
            container.innerHTML = this.createLoadingHTML('Loading reports...');
            
            // Import from your existing reports.js
            const { ReportsModule } = await import('./modules/reports.js');
            const reportsModule = new ReportsModule(this);
            await reportsModule.init();
            this.modules.reports = reportsModule;
            
            console.log('✅ Reports module loaded');
            
        } catch (error) {
            console.error('Reports load error:', error);
            container.innerHTML = this.createErrorHTML('Failed to load reports', error);
        }
    }

    // Load maintenance content
    async loadMaintenanceContent(container) {
        try {
            console.log('⚙️ Loading maintenance...');
            
            container.innerHTML = this.createLoadingHTML('Loading setup...');
            
            // Simple maintenance page for now
            container.innerHTML = this.createMaintenanceHTML();
            
            console.log('✅ Maintenance loaded');
            
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
            const exportModule = new ExportModule(this);
            await exportModule.initialize();
            this.modules.export = exportModule;
            
            // Render the export interface
            exportModule.renderExportInterface();
            
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

    createDashboardHTML() {
        return `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h1><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
                    <p class="subtitle">Welcome to Attendance Track v2</p>
                </div>
                
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="total-attendance">0</h3>
                            <p>Today's Attendance</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="total-classes">0</h3>
                            <p>Total Classes</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="attendance-rate">0%</h3>
                            <p>Overall Rate</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon info">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="pending">0</h3>
                            <p>Pending Actions</p>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-actions">
                    <div class="action-card">
                        <div class="action-icon">
                            <i class="fas fa-calendar-plus"></i>
                        </div>
                        <h4>Take Attendance</h4>
                        <p>Record today's attendance</p>
                        <a href="attendance.html" class="btn-primary">
                            Go to Attendance
                        </a>
                    </div>
                    
                    <div class="action-card">
                        <div class="action-icon">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <h4>View Reports</h4>
                        <p>Generate attendance reports</p>
                        <a href="reports.html" class="btn-primary">
                            View Reports
                        </a>
                    </div>
                    
                    <div class="action-card">
                        <div class="action-icon">
                            <i class="fas fa-cogs"></i>
                        </div>
                        <h4>Setup Classes</h4>
                        <p>Manage classes and settings</p>
                        <a href="maintenance.html" class="btn-primary">
                            Go to Setup
                        </a>
                    </div>
                    
                    <div class="action-card">
                        <div class="action-icon">
                            <i class="fas fa-file-export"></i>
                        </div>
                        <h4>Export Data</h4>
                        <p>Export attendance records</p>
                        <a href="export.html" class="btn-primary">
                            Export Data
                        </a>
                    </div>
                </div>
                
                <div class="recent-activity">
                    <h3>Recent Activity</h3>
                    <div class="activity-list">
                        <div class="activity-item">
                            <i class="fas fa-check-circle text-success"></i>
                            <div class="activity-details">
                                <p>Attendance recorded for 3AN</p>
                                <small>Just now</small>
                            </div>
                        </div>
                        <div class="activity-item">
                            <i class="fas fa-upload text-info"></i>
                            <div class="activity-details">
                                <p>Data exported to Excel</p>
                                <small>2 hours ago</small>
                            </div>
                        </div>
                        <div class="activity-item">
                            <i class="fas fa-user-plus text-warning"></i>
                            <div class="activity-details">
                                <p>New class added: 3TL</p>
                                <small>Yesterday</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createMaintenanceHTML() {
        return `
            <div class="maintenance-container">
                <div class="maintenance-header">
                    <h1><i class="fas fa-cogs"></i> Setup & Maintenance</h1>
                    <p class="subtitle">Configure your attendance system</p>
                </div>
                
                <div class="maintenance-grid">
                    <div class="setup-card">
                        <div class="setup-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <h3>Classes Setup</h3>
                        <p>Add, edit, and manage classes</p>
                        <button class="btn-primary" onclick="app.openClassesSetup()">
                            Manage Classes
                        </button>
                    </div>
                    
                    <div class="setup-card">
                        <div class="setup-icon">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <h3>Students</h3>
                        <p>Manage student information</p>
                        <button class="btn-primary" onclick="app.openStudentsSetup()">
                            Manage Students
                        </button>
                    </div>
                    
                    <div class="setup-card">
                        <div class="setup-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <h3>Academic Terms</h3>
                        <p>Set up terms and weeks</p>
                        <button class="btn-primary" onclick="app.openTermsSetup()">
                            Manage Terms
                        </button>
                    </div>
                    
                    <div class="setup-card">
                        <div class="setup-icon">
                            <i class="fas fa-database"></i>
                        </div>
                        <h3>Data Management</h3>
                        <p>Import, export, and backup data</p>
                        <button class="btn-primary" onclick="app.openDataManagement()">
                            Manage Data
                        </button>
                    </div>
                    
                    <div class="setup-card">
                        <div class="setup-icon">
                            <i class="fas fa-sliders-h"></i>
                        </div>
                        <h3>Settings</h3>
                        <p>Configure system settings</p>
                        <button class="btn-primary" onclick="app.openSettings()">
                            Open Settings
                        </button>
                    </div>
                    
                    <div class="setup-card">
                        <div class="setup-icon">
                            <i class="fas fa-sync-alt"></i>
                        </div>
                        <h3>Synchronization</h3>
                        <p>Sync data with cloud</p>
                        <button class="btn-primary" onclick="app.openSync()">
                            Sync Now
                        </button>
                    </div>
                </div>
                
                <div class="data-actions">
                    <h3>Data Actions</h3>
                    <div class="action-buttons">
                        <button class="btn btn-secondary" onclick="app.importData()">
                            <i class="fas fa-file-import"></i> Import Data
                        </button>
                        <button class="btn btn-secondary" onclick="app.backupData()">
                            <i class="fas fa-database"></i> Backup Data
                        </button>
                        <button class="btn btn-danger" onclick="app.resetData()">
                            <i class="fas fa-trash"></i> Reset Data
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== SETUP METHODS ==========
    openClassesSetup() {
        console.log('Opening classes setup');
        alert('Classes setup would open here');
    }

    openStudentsSetup() {
        console.log('Opening students setup');
        alert('Students setup would open here');
    }

    openTermsSetup() {
        console.log('Opening terms setup');
        alert('Terms setup would open here');
    }

    openDataManagement() {
        console.log('Opening data management');
        alert('Data management would open here');
    }

    openSettings() {
        console.log('Opening settings');
        alert('Settings would open here');
    }

    openSync() {
        console.log('Opening sync');
        alert('Sync would open here');
    }

    importData() {
        console.log('Importing data');
        alert('Import data feature');
    }

    backupData() {
        console.log('Backing up data');
        alert('Backup data feature');
    }

    resetData() {
        if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            console.log('Resetting data');
            localStorage.clear();
            alert('Data reset completed');
            window.location.reload();
        }
    }

    // ========== GLOBAL METHODS FOR HTML PAGES ==========
    
    // For dashboard.html
    async loadPageContent(container) {
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
        await this.loadMaintenanceContent(container);
    }

    // File import handler (for setup page)
    handleFileImport(file) {
        console.log('File import:', file);
        alert(`File selected: ${file.name}\n\nThis would import the data in a real implementation.`);
    }

    // Navigation helper
    goToSetup() {
        window.location.href = 'maintenance.html';
    }
}

// Create and initialize the app
const attendanceApp = new AttendanceApp();

// Export for module usage
export { AttendanceApp, attendanceApp };

// Auto-initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 DOM loaded, initializing AttendanceApp...');
    await attendanceApp.init();
});

// Make sure app is available globally
window.attendanceApp = attendanceApp;
