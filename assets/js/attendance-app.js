// attendance-app.js - CSS-COMPATIBLE VERSION
class AttendanceApp {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
        this.modules = {}; // Add modules object
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
            if (!userData) {
                return false;
            }
            
            const user = JSON.parse(userData);
            const now = Date.now();
            const lastLogin = new Date(user.lastLogin).getTime();
            const hoursSinceLogin = (now - lastLogin) / (1000 * 60 * 60);
            
            // Session expires after 24 hours
            if (hoursSinceLogin > 24) {
                localStorage.removeItem('attendance_user');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    async loadHeader(container) {
        if (!container) return;
        
        try {
            console.log('🔼 Loading header...');
            
            // Use your CSS classes instead of inline styles
            container.innerHTML = `
                <header class="main-header">
                    <div class="header-container">
                        <!-- Logo -->
                        <div class="header-logo">
                            <a href="./dashboard.html" class="logo-link">
                                <div class="logo-icon">
                                    <i class="fas fa-calendar-check"></i>
                                </div>
                                <div class="logo-text">
                                    <div class="logo-primary">Attendance Track</div>
                                    <div class="logo-secondary">v2.0</div>
                                </div>
                            </a>
                        </div>
                        
                        <!-- Navigation -->
                        <nav class="main-nav">
                            <ul class="nav-list toggleable-links">
                                <li class="nav-item">
                                    <a href="./dashboard.html" class="nav-link">
                                        <i class="fas fa-tachometer-alt"></i>
                                        <span>Dashboard</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="./attendance.html" class="nav-link">
                                        <i class="fas fa-calendar-check"></i>
                                        <span>Attendance</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="./reports.html" class="nav-link">
                                        <i class="fas fa-chart-bar"></i>
                                        <span>Reports</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="./maintenance.html" class="nav-link">
                                        <i class="fas fa-cogs"></i>
                                        <span>Setup</span>
                                    </a>
                                </li>
                            </ul>
                            
                            <!-- Mobile menu toggle -->
                            <button class="hamburger-menu navbar-toggle" onclick="app.toggleMobileMenu()">
                                <div class="menu-line"></div>
                                <div class="menu-line"></div>
                                <div class="menu-line"></div>
                            </button>
                        </nav>
                        
                        <!-- User Menu -->
                        <div class="user-menu">
                            <div id="navUserStatus" class="user-status">
                                <div class="status-content">
                                    <div class="user-display">
                                        <i class="fas fa-user user-icon"></i>
                                        <span class="user-name">${this.currentUser?.name || 'User'}</span>
                                    </div>
                                    <div class="connection-status">
                                        <span class="status-dot online"></span>
                                        <span class="status-text">Online</span>
                                    </div>
                                </div>
                            </div>
                            <button onclick="app.logout()" class="logout-btn-styled logout-hover">
                                <i class="fas fa-sign-out-alt logout-icon"></i>
                            </button>
                        </div>
                    </div>
                </header>
                
                <style>
                    /* Ensure navigation is visible on desktop */
                    @media (min-width: 768px) {
                        .toggleable-links {
                            display: flex !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                        }
                        .hamburger-menu.navbar-toggle {
                            display: none !important;
                        }
                    }
                </style>
            `;
            
            console.log('✅ Header loaded');
            
        } catch (error) {
            console.error('Header load error:', error);
            container.innerHTML = `
                <div style="background: #f8d7da; color: #721c24; padding: 10px; text-align: center;">
                    Header failed to load: ${error.message}
                </div>
            `;
        }
    }

    async loadFooter(container) {
        if (!container) return;
        
        try {
            console.log('🔽 Loading footer...');
            
            // Use your CSS footer structure
            container.innerHTML = `
                <footer class="main-footer">
                    <div class="footer-container">
                        <div class="footer-content">
                            <div class="footer-copyright">
                                Attendance Track v2 &copy; ${new Date().getFullYear()} | Secure Attendance Management
                            </div>
                            <div class="footer-links">
                                <a href="#" class="footer-link">Help</a>
                                <a href="#" class="footer-link">Privacy</a>
                                <a href="#" class="footer-link">Terms</a>
                                <a href="#" class="footer-link">Contact</a>
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

    async loadDashboardContent(container) {
        try {
            console.log('📊 Loading dashboard content...');
            
            if (!container) throw new Error('Container not found');
            
            // Create dashboard using YOUR dashboard.css classes
            container.innerHTML = `
                <div class="dashboard-page">
                    <!-- Dashboard Header - using unified-header -->
                    <div class="dashboard-header">
                        <div class="header-top-row">
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
                        
                        <div class="date-display">
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
                        
                        <a href="#" class="action-card" onclick="app.exportData()">
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
                            <button class="btn-refresh" onclick="app.refreshActivity()">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                        
                        <div class="activity-list" id="activity-list">
                            <!-- Activities loaded dynamically -->
                        </div>
                    </div>
                </div>
            `;
            
            // Load real data
            this.loadDashboardData();
            this.loadRecentActivities();
            
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
                        <a href="./index.html" class="btn-secondary">
                            <i class="fas fa-arrow-left"></i> Return Home
                        </a>
                    </div>
                </div>
            `;
        }
    }

    async loadDashboardData() {
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
            
            // Calculate attendance rate
            if (attendanceRateEl) {
                const totalRecords = attendance.length;
                const presentRecords = attendance.filter(a => a.status === 'present').length;
                const rate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 95;
                attendanceRateEl.textContent = `${rate}%`;
            }
            
            // Update pending actions
            if (pendingEl) {
                pendingEl.textContent = '0';
            }
            
        } catch (error) {
            console.error('Dashboard data load error:', error);
        }
    }

    async loadRecentActivities() {
        try {
            const activities = [
                {
                    icon: 'check-circle',
                    color: '#27ae60',
                    text: 'Attendance recorded for 3AN',
                    time: 'Just now'
                },
                {
                    icon: 'upload',
                    color: '#3498db',
                    text: 'Data exported to Excel',
                    time: '2 hours ago'
                },
                {
                    icon: 'user-plus',
                    color: '#e67e22',
                    text: 'New class added: 3TL',
                    time: 'Yesterday'
                },
                {
                    icon: 'chart-line',
                    color: '#9b59b6',
                    text: 'Monthly report generated',
                    time: '2 days ago'
                }
            ];
            
            const container = document.getElementById('activity-list');
            if (!container) return;
            
            container.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon" style="color: ${activity.color};">
                        <i class="fas fa-${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${activity.text}</p>
                        <small>${activity.time}</small>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Activities load error:', error);
        }
    }

    refreshActivity() {
        console.log('Refreshing activity...');
        this.loadRecentActivities();
        
        // Show notification
        this.showNotification('Activity refreshed!', 'success');
    }

    toggleMobileMenu() {
        const navLinks = document.querySelector('.toggleable-links');
        const hamburger = document.querySelector('.hamburger-menu');
        
        if (navLinks) {
            navLinks.classList.toggle('links-hidden');
            navLinks.classList.toggle('links-visible');
            
            if (hamburger) {
                hamburger.classList.toggle('active');
            }
        }
    }

    async loadReportsContent(container) {
        try {
            console.log('📈 Loading reports content...');
            
            if (!container) throw new Error('Container not found');
            
            // Create reports page using reports.css classes
            container.innerHTML = `
                <div class="reports-page">
                    <div class="reports-container">
                        <!-- Reports Header -->
                        <div class="reports-header">
                            <h1><i class="fas fa-chart-bar"></i> Attendance Reports</h1>
                            <p class="reports-subtitle">Generate, analyze, and export attendance data</p>
                        </div>
                        
                        <!-- Reports Section -->
                        <div class="reports-section">
                            <!-- Filters -->
                            <div class="filter-section">
                                <h3 class="section-title">Report Filters</h3>
                                <div class="filter-row">
                                    <div class="filter-group">
                                        <label class="filter-label">Report Type</label>
                                        <select class="reports-select" id="report-type">
                                            <option value="daily">Daily Report</option>
                                            <option value="weekly">Weekly Summary</option>
                                            <option value="monthly">Monthly Analysis</option>
                                            <option value="comparison">Class Comparison</option>
                                            <option value="student">Student Performance</option>
                                        </select>
                                    </div>
                                    <div class="filter-group">
                                        <label class="filter-label">Class</label>
                                        <select class="reports-select" id="report-class">
                                            <option value="all">All Classes</option>
                                            <option value="3AN">3AN</option>
                                            <option value="3TL">3TL</option>
                                            <option value="3SR">3SR</option>
                                        </select>
                                    </div>
                                    <div class="filter-group">
                                        <label class="filter-label">Date Range</label>
                                        <div class="date-range">
                                            <input type="date" class="date-input" id="start-date">
                                            <span>to</span>
                                            <input type="date" class="date-input" id="end-date">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Actions -->
                            <div class="controls-section">
                                <button class="control-btn primary-btn" onclick="app.generateReport()">
                                    <i class="fas fa-play"></i> Generate Report
                                </button>
                                <button class="control-btn secondary-btn" onclick="app.exportReport()">
                                    <i class="fas fa-download"></i> Export as PDF
                                </button>
                                <button class="control-btn secondary-btn" onclick="app.exportExcel()">
                                    <i class="fas fa-file-excel"></i> Export as Excel
                                </button>
                            </div>
                            
                            <!-- Report Output -->
                            <div class="report-output">
                                <div class="output-header">
                                    <span>Report Output</span>
                                    <span id="report-info">No report generated yet</span>
                                </div>
                                <div class="output-content" id="report-output">
                                    <div class="no-report">
                                        <i class="fas fa-chart-line"></i>
                                        <h3>No Report Generated</h3>
                                        <p>Select filters and click "Generate Report" to view data</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ Reports content loaded');
            
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

    generateReport() {
        console.log('Generating report...');
        const reportType = document.getElementById('report-type').value;
        const reportClass = document.getElementById('report-class').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        // In a real app, this would generate actual report data
        const output = document.getElementById('report-output');
        const info = document.getElementById('report-info');
        
        if (output && info) {
            info.textContent = `${reportType} Report | ${reportClass} | ${startDate} to ${endDate}`;
            
            output.innerHTML = `
                <div class="comparison-report">
                    <div class="report-header">
                        <h3>Class Attendance Comparison Report</h3>
                        <p class="report-period">${startDate} to ${endDate}</p>
                    </div>
                    
                    <div class="comparison-summary">
                        <div class="summary-card">
                            <div class="summary-icon top">
                                <i class="fas fa-trophy"></i>
                            </div>
                            <div class="summary-info">
                                <div class="summary-value">3AN</div>
                                <div class="summary-label">Top Performing Class</div>
                            </div>
                        </div>
                        
                        <div class="summary-card">
                            <div class="summary-icon consistent">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <div class="summary-info">
                                <div class="summary-value">96.5%</div>
                                <div class="summary-label">Average Attendance</div>
                            </div>
                        </div>
                        
                        <div class="summary-card">
                            <div class="summary-icon gender">
                                <i class="fas fa-venus-mars"></i>
                            </div>
                            <div class="summary-info">
                                <div class="summary-value">92%</div>
                                <div class="summary-label">Girls vs 89% Boys</div>
                            </div>
                        </div>
                        
                        <div class="summary-card">
                            <div class="summary-icon session">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="summary-info">
                                <div class="summary-value">94% AM</div>
                                <div class="summary-label">Morning Session Higher</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Table would go here -->
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-chart-bar" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i>
                        <h3 style="color: #666;">Report Data Would Display Here</h3>
                        <p style="color: #999;">In a real implementation, detailed comparison data would appear here.</p>
                    </div>
                </div>
            `;
            
            this.showNotification('Report generated successfully!', 'success');
        }
    }

    exportReport() {
        this.showNotification('PDF export feature would be implemented here', 'info');
    }

    exportExcel() {
        this.showNotification('Excel export feature would be implemented here', 'info');
    }

    exportData() {
        this.showNotification('Export functionality coming soon!', 'info');
    }

    async loadAttendanceContent(container) {
        // Simple redirect to attendance page
        window.location.href = './attendance.html';
    }

    async loadMaintenancePage(container) {
        window.location.href = './maintenance.html';
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear user data
            localStorage.removeItem('attendance_user');
            
            // Optional: Clear other session data
            // localStorage.removeItem('attendance_classes');
            // localStorage.removeItem('attendance_records');
            
            // Redirect to logout/index page
            window.location.href = './index.html';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        // Add animation styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
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
window.app = attendanceApp;

// Export for module usage
export { AttendanceApp, attendanceApp };
