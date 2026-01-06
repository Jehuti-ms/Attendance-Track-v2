// attendance-app.js - CSS-COMPATIBLE VERSION
class AttendanceApp {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
    }

    async init() {
        try {
            console.log('🚀 AttendanceApp initializing...');
            
            // Get current user from localStorage
            const userData = localStorage.getItem('attendance_user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                console.log('✅ User found:', this.currentUser.email);
            } else {
                console.log('⚠️ No user found in localStorage');
            }
            
            // Register globally
            window.app = this;
            window.attendanceApp = this;
            
            this.initialized = true;
            console.log('✅ AttendanceApp initialized');
            
            return true;
            
        } catch (error) {
            console.error('❌ AttendanceApp init error:', error);
            return false;
        }
    }

    async checkAuth() {
        try {
            const userData = localStorage.getItem('attendance_user');
            return !!userData;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    async loadHeader(container) {
        if (!container) return;
        
        try {
            console.log('🔼 Loading header...');
            
            // Create header that uses your CSS classes
            container.innerHTML = `
                <header class="app-header" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 0 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                ">
                    <div style="
                        max-width: 1200px;
                        margin: 0 auto;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        height: 70px;
                    ">
                        <!-- Logo Section -->
                        <div class="logo" style="display: flex; align-items: center; gap: 15px;">
                            <div style="
                                width: 40px;
                                height: 40px;
                                background: white;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <img src="./assets/icons/icon-192.png" alt="Logo" width="30" height="30">
                            </div>
                            <h1 style="margin: 0; font-size: 1.5rem; font-weight: 600;">Attendance Track</h1>
                        </div>
                        
                        <!-- Navigation -->
                        <nav class="main-nav" style="display: flex; gap: 5px;">
                            <a href="./dashboard.html" class="nav-link" style="
                                color: white;
                                text-decoration: none;
                                padding: 10px 20px;
                                border-radius: 4px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                transition: all 0.3s;
                            ">
                                <i class="fas fa-tachometer-alt"></i>
                                <span>Dashboard</span>
                            </a>
                            <a href="./attendance.html" class="nav-link" style="
                                color: white;
                                text-decoration: none;
                                padding: 10px 20px;
                                border-radius: 4px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                transition: all 0.3s;
                                background: rgba(255,255,255,0.15);
                            ">
                                <i class="fas fa-calendar-check"></i>
                                <span>Attendance</span>
                            </a>
                            <a href="./reports.html" class="nav-link" style="
                                color: white;
                                text-decoration: none;
                                padding: 10px 20px;
                                border-radius: 4px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                transition: all 0.3s;
                            ">
                                <i class="fas fa-chart-bar"></i>
                                <span>Reports</span>
                            </a>
                            <a href="./maintenance.html" class="nav-link" style="
                                color: white;
                                text-decoration: none;
                                padding: 10px 20px;
                                border-radius: 4px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                transition: all 0.3s;
                            ">
                                <i class="fas fa-cogs"></i>
                                <span>Setup</span>
                            </a>
                        </nav>
                        
                        <!-- User Menu -->
                        <div class="user-menu" style="display: flex; align-items: center; gap: 15px;">
                            <div class="user-info" style="display: flex; align-items: center; gap: 10px;">
                                <div class="user-avatar" style="
                                    width: 36px;
                                    height: 36px;
                                    background: rgba(255,255,255,0.2);
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                ">
                                    <i class="fas fa-user"></i>
                                </div>
                                <span class="user-name" style="font-weight: 500;">
                                    ${this.currentUser?.name || 'User'}
                                </span>
                            </div>
                            <button onclick="window.app.logout()" class="logout-btn" style="
                                background: rgba(255,255,255,0.2);
                                border: none;
                                color: white;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                transition: all 0.3s;
                            ">
                                <i class="fas fa-sign-out-alt"></i>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </header>
            `;
            
            console.log('✅ Header loaded');
            
        } catch (error) {
            console.error('Header load error:', error);
            container.innerHTML = `
                <div style="background: #f8d7da; color: #721c24; padding: 10px; text-align: center;">
                    Header failed to load
                </div>
            `;
        }
    }

    async loadFooter(container) {
        if (!container) return;
        
        try {
            console.log('🔽 Loading footer...');
            
            container.innerHTML = `
                <footer class="app-footer" style="
                    background: #2c3e50;
                    color: white;
                    padding: 30px 20px;
                    margin-top: auto;
                ">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            flex-wrap: wrap;
                            gap: 20px;
                        ">
                            <div class="footer-left" style="flex: 1;">
                                <span class="copyright" style="font-size: 0.95rem;">
                                    Attendance Track v2 &copy; ${new Date().getFullYear()}
                                </span>
                                <p style="margin: 8px 0 0; color: #bdc3c7; font-size: 0.9rem;">
                                    Simple, powerful classroom management
                                </p>
                            </div>
                            
                            <div class="footer-center" style="flex: 1; text-align: center;">
                                <span class="version" style="
                                    background: rgba(255,255,255,0.1);
                                    padding: 5px 15px;
                                    border-radius: 20px;
                                    font-size: 0.85rem;
                                ">
                                    Version 2.0.0
                                </span>
                            </div>
                            
                            <div class="footer-right" style="flex: 1; text-align: right;">
                                <div style="display: flex; gap: 20px; justify-content: flex-end;">
                                    <a href="#" class="footer-link" style="color: #3498db; text-decoration: none;">
                                        Help
                                    </a>
                                    <a href="#" class="footer-link" style="color: #3498db; text-decoration: none;">
                                        Privacy
                                    </a>
                                    <a href="#" class="footer-link" style="color: #3498db; text-decoration: none;">
                                        Terms
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            `;
            
            console.log('✅ Footer loaded');
            
        } catch (error) {
            console.error('Footer load error:', error);
            // Don't show error for footer
        }
    }

    async loadPageContent(container) {
        try {
            console.log('📊 Loading dashboard content...');
            
            if (!container) throw new Error('Container not found');
            
            // Create dashboard using YOUR dashboard.css classes
            container.innerHTML = `
                <div class="dashboard-page">
                    <!-- Dashboard Header -->
                    <div class="dashboard-header">
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            flex-wrap: wrap;
                            gap: 20px;
                        ">
                            <div class="welcome-text">
                                <h1>
                                    <i class="fas fa-tachometer-alt"></i>
                                    Dashboard
                                </h1>
                                <p class="dashboard-subtitle">
                                    Welcome back, ${this.currentUser?.name || 'Teacher'}!
                                </p>
                            </div>
                            
                            <div class="connection-status">
                                <span class="status-dot connected"></span>
                                <span class="status-text">Online</span>
                            </div>
                        </div>
                        
                        <div class="date-display" style="margin-top: 15px;">
                            <i class="fas fa-calendar"></i>
                            ${new Date().toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </div>
                    </div>
                    
                    <!-- Stats Grid -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon" style="color: #3498db;">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <div class="stat-content">
                                <h3 id="total-attendance">0</h3>
                                <p>Today's Attendance</p>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon" style="color: #2ecc71;">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-content">
                                <h3 id="total-classes">3</h3>
                                <p>Total Classes</p>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon" style="color: #e67e22;">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <div class="stat-content">
                                <h3 id="attendance-rate">95%</h3>
                                <p>Overall Rate</p>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon" style="color: #9b59b6;">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="stat-content">
                                <h3 id="pending">0</h3>
                                <p>Pending Actions</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Actions Grid -->
                    <div class="actions-grid">
                        <a href="./attendance.html" class="action-card">
                            <div class="action-icon">
                                <i class="fas fa-calendar-plus"></i>
                            </div>
                            <h4>Take Attendance</h4>
                            <p>Record today's attendance for all classes</p>
                        </a>
                        
                        <a href="./reports.html" class="action-card">
                            <div class="action-icon">
                                <i class="fas fa-chart-bar"></i>
                            </div>
                            <h4>View Reports</h4>
                            <p>Generate and analyze attendance reports</p>
                        </a>
                        
                        <a href="./maintenance.html" class="action-card">
                            <div class="action-icon">
                                <i class="fas fa-cogs"></i>
                            </div>
                            <h4>Setup Classes</h4>
                            <p>Manage classes, students, and settings</p>
                        </a>
                        
                        <a href="./export.html" class="action-card">
                            <div class="action-icon">
                                <i class="fas fa-file-export"></i>
                            </div>
                            <h4>Export Data</h4>
                            <p>Export attendance records in various formats</p>
                        </a>
                    </div>
                    
                    <!-- Recent Activity -->
                    <div class="recent-activity">
                        <div class="activity-header">
                            <h3><i class="fas fa-history"></i> Recent Activity</h3>
                            <button class="btn-refresh" onclick="window.app.refreshActivity()">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                        
                        <div class="activity-list">
                            <div class="activity-item">
                                <div class="activity-icon" style="color: #27ae60;">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                <div class="activity-content">
                                    <p>Attendance recorded for 3AN</p>
                                    <small>Just now</small>
                                </div>
                            </div>
                            
                            <div class="activity-item">
                                <div class="activity-icon" style="color: #3498db;">
                                    <i class="fas fa-upload"></i>
                                </div>
                                <div class="activity-content">
                                    <p>Data exported to Excel</p>
                                    <small>2 hours ago</small>
                                </div>
                            </div>
                            
                            <div class="activity-item">
                                <div class="activity-icon" style="color: #e67e22;">
                                    <i class="fas fa-user-plus"></i>
                                </div>
                                <div class="activity-content">
                                    <p>New class added: 3TL</p>
                                    <small>Yesterday</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Load real data
            this.loadDashboardData();
            
            console.log('✅ Dashboard content loaded');
            
        } catch (error) {
            console.error('Dashboard content load error:', error);
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2>Error Loading Dashboard</h2>
                    <p>${error.message}</p>
                    <div class="error-actions">
                        <button onclick="window.location.reload()" class="btn-primary">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                        <a href="./dashboard.html" class="btn-secondary">
                            <i class="fas fa-arrow-left"></i> Back to Dashboard
                        </a>
                    </div>
                </div>
            `;
        }
    }

    loadDashboardData() {
        try {
            // Load data from localStorage
            const classes = JSON.parse(localStorage.getItem('attendance_classes') || '[]');
            const attendance = JSON.parse(localStorage.getItem('attendance_records') || '[]');
            
            // Update stats
            const totalClassesEl = document.getElementById('total-classes');
            const totalAttendanceEl = document.getElementById('total-attendance');
            const attendanceRateEl = document.getElementById('attendance-rate');
            const pendingEl = document.getElementById('pending');
            
            if (totalClassesEl) {
                totalClassesEl.textContent = classes.length > 0 ? classes.length : '3';
            }
            
            // Calculate today's attendance
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendance.filter(record => record.date === today);
            
            if (totalAttendanceEl) {
                totalAttendanceEl.textContent = todayAttendance.length;
            }
            
            // Update pending actions
            if (pendingEl) {
                pendingEl.textContent = '0';
            }
            
        } catch (error) {
            console.error('Dashboard data load error:', error);
        }
    }

    refreshActivity() {
        console.log('Refreshing activity...');
        // In a real app, this would fetch new data
        alert('Activity refreshed!');
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('attendance_user');
            window.location.href = './login.html';
        }
    }

    // Other page loaders
    async loadAttendanceContent(container) {
        window.location.href = './attendance.html';
    }

    // Add this method to your AttendanceApp class in attendance-app.js
async loadReportsContent(container) {
    try {
        console.log('📈 Loading reports content...');
        
        if (!container) throw new Error('Container not found');
        
        // Show loading state
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p>Loading reports...</p>
            </div>
        `;
        
        // Import and initialize your ReportsModule
        const { ReportsModule } = await import('./modules/reports.js');
        const reportsModule = new ReportsModule(this);
        await reportsModule.init();
        
        // Store reference
        this.modules.reports = reportsModule;
        
        console.log('✅ Reports module loaded');
        
        // Note: Your ReportsModule should handle the UI rendering
        // If it doesn't, you might need to add a render() method to it
        
    } catch (error) {
        console.error('Reports content load error:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Reports</h3>
                <p>${error.message}</p>
                <div class="error-actions">
                    <button onclick="window.location.reload()" class="btn-primary">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                    <a href="./dashboard.html" class="btn-secondary">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </a>
                </div>
            </div>
        `;
    }
}

    async loadMaintenancePage(container) {
        window.location.href = './maintenance.html';
    }

    async loadExportPage(container) {
        window.location.href = './export.html';
    }

    async loadSetupPage(container) {
        window.location.href = './setup.html';
    }

    handleFileImport(file) {
        console.log('File import:', file);
        alert(`File selected: ${file.name}`);
    }

    goToSetup() {
        window.location.href = './maintenance.html';
    }
}

// Create and initialize the app
const attendanceApp = new AttendanceApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🌐 DOM loaded, starting app...');
        attendanceApp.init();
    });
} else {
    console.log('🌐 DOM already loaded, starting app...');
    attendanceApp.init();
}

// Make app available globally
window.attendanceApp = attendanceApp;

// Export for module usage
export { AttendanceApp, attendanceApp };
