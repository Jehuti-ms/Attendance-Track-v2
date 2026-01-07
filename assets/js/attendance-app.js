// attendance-app.js - STABLE VERSION
class AttendanceApp {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
        this.modules = {};
        this.pageLoadHandlers = {
            'dashboard': this.loadDashboardContent.bind(this),
            'attendance': this.loadAttendanceContent.bind(this),
            'reports': this.loadReportsContent.bind(this),
            'maintenance': this.loadMaintenancePage.bind(this)
        };
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
                // If no user and not on login/index page, redirect to login
                const currentPage = window.location.pathname;
                if (!currentPage.includes('login.html') && 
                    !currentPage.includes('index.html') &&
                    currentPage.includes('.html')) {
                    window.location.href = './login.html';
                    return false;
                }
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
            return !!userData; // Simple check - just see if user exists
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    async loadHeader(container) {
        if (!container) return;
        
        try {
            console.log('🔼 Loading header...');
            
            // Get current page for active link
            const currentPage = window.location.pathname;
            const isDashboard = currentPage.includes('dashboard');
            const isAttendance = currentPage.includes('attendance');
            const isReports = currentPage.includes('reports');
            const isMaintenance = currentPage.includes('maintenance');
            
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
                                    <a href="./dashboard.html" class="nav-link ${isDashboard ? 'active' : ''}">
                                        <i class="fas fa-tachometer-alt"></i>
                                        <span>Dashboard</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="./attendance.html" class="nav-link ${isAttendance ? 'active' : ''}">
                                        <i class="fas fa-calendar-check"></i>
                                        <span>Attendance</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="./reports.html" class="nav-link ${isReports ? 'active' : ''}">
                                        <i class="fas fa-chart-bar"></i>
                                        <span>Reports</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="./maintenance.html" class="nav-link ${isMaintenance ? 'active' : ''}">
                                        <i class="fas fa-cogs"></i>
                                        <span>Setup</span>
                                    </a>
                                </li>
                            </ul>
                        </nav>
                        
                        <!-- User Menu -->
                        <div class="user-menu">
                            <div class="user-info">
                                <div class="user-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <span class="user-name">${this.currentUser?.name || 'User'}</span>
                            </div>
                            <button onclick="app.logout()" class="logout-btn">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                        </div>
                    </div>
                </header>
            `;
            
            console.log('✅ Header loaded');
            
        } catch (error) {
            console.error('Header load error:', error);
            container.innerHTML = `
                <div style="background: #f5f5f5; padding: 10px; text-align: center;">
                    <a href="./dashboard.html" style="color: #405dde; text-decoration: none;">
                        <i class="fas fa-calendar-check"></i> Attendance Track
                    </a>
                </div>
            `;
        }
    }

    async loadFooter(container) {
        if (!container) return;
        
        try {
            console.log('🔽 Loading footer...');
            
            container.innerHTML = `
                <footer class="main-footer">
                    <div class="footer-container">
                        <div class="footer-content">
                            <div class="footer-copyright">
                                Attendance Track v2 &copy; ${new Date().getFullYear()} | Secure Attendance Management
                            </div>
                        </div>
                    </div>
                </footer>
            `;
            
            console.log('✅ Footer loaded');
            
        } catch (error) {
            console.error('Footer load error:', error);
            // Silent fail for footer
        }
    }

    async loadDashboardContent(container) {
        if (!container) return;
        
        try {
            console.log('📊 Loading dashboard content...');
            
            // Clear container first
            container.innerHTML = '';
            
            // Create a simple, stable dashboard
            const dashboardHTML = `
                <div class="dashboard-page">
                    <div class="dashboard-header">
                        <h1><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
                        <p>Welcome back, ${this.currentUser?.name || 'Teacher'}!</p>
                    </div>
                    
                    <div style="padding: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                <h3 style="color: #3498db; margin-bottom: 10px;">
                                    <i class="fas fa-calendar-check"></i> Today's Attendance
                                </h3>
                                <p style="font-size: 2rem; font-weight: bold; color: #333;">0</p>
                            </div>
                            
                            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                <h3 style="color: #2ecc71; margin-bottom: 10px;">
                                    <i class="fas fa-users"></i> Total Classes
                                </h3>
                                <p style="font-size: 2rem; font-weight: bold; color: #333;">3</p>
                            </div>
                            
                            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                <h3 style="color: #e67e22; margin-bottom: 10px;">
                                    <i class="fas fa-chart-line"></i> Attendance Rate
                                </h3>
                                <p style="font-size: 2rem; font-weight: bold; color: #333;">95%</p>
                            </div>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <h3 style="margin-bottom: 20px; color: #2c3e50;">
                                <i class="fas fa-bolt"></i> Quick Actions
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                                <a href="./attendance.html" style="
                                    display: block;
                                    padding: 15px;
                                    background: #f0f7ff;
                                    border: 2px solid #3498db;
                                    border-radius: 8px;
                                    text-decoration: none;
                                    color: #3498db;
                                    text-align: center;
                                    transition: all 0.3s;
                                ">
                                    <i class="fas fa-calendar-plus" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
                                    <div style="font-weight: bold;">Take Attendance</div>
                                </a>
                                
                                <a href="./reports.html" style="
                                    display: block;
                                    padding: 15px;
                                    background: #f0f8ff;
                                    border: 2px solid #2ecc71;
                                    border-radius: 8px;
                                    text-decoration: none;
                                    color: #2ecc71;
                                    text-align: center;
                                    transition: all 0.3s;
                                ">
                                    <i class="fas fa-chart-bar" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
                                    <div style="font-weight: bold;">View Reports</div>
                                </a>
                                
                                <a href="./maintenance.html" style="
                                    display: block;
                                    padding: 15px;
                                    background: #fff8f0;
                                    border: 2px solid #e67e22;
                                    border-radius: 8px;
                                    text-decoration: none;
                                    color: #e67e22;
                                    text-align: center;
                                    transition: all 0.3s;
                                ">
                                    <i class="fas fa-cogs" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
                                    <div style="font-weight: bold;">Setup</div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Set content
            container.innerHTML = dashboardHTML;
            
            console.log('✅ Dashboard content loaded');
            
        } catch (error) {
            console.error('Dashboard content load error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h3>Error Loading Dashboard</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="
                        padding: 10px 20px;
                        background: #405dde;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 20px;
                    ">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }

    async loadAttendanceContent(container) {
        if (!container) return;
        
        try {
            console.log('📅 Loading attendance content...');
            
            container.innerHTML = `
                <div style="padding: 20px;">
                    <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #2c3e50; margin-bottom: 20px;">
                            <i class="fas fa-calendar-check"></i> Attendance Recording
                        </h2>
                        
                        <div style="margin-bottom: 30px;">
                            <label style="display: block; margin-bottom: 10px; font-weight: bold;">Select Date</label>
                            <input type="date" style="
                                width: 100%;
                                padding: 10px;
                                border: 1px solid #ddd;
                                border-radius: 5px;
                                font-size: 16px;
                            " value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div style="margin-bottom: 30px;">
                            <label style="display: block; margin-bottom: 10px; font-weight: bold;">Select Session</label>
                            <div style="display: flex; gap: 10px;">
                                <button style="
                                    padding: 10px 20px;
                                    background: #3498db;
                                    color: white;
                                    border: none;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    flex: 1;
                                ">Morning (AM)</button>
                                <button style="
                                    padding: 10px 20px;
                                    background: #f5f5f5;
                                    color: #333;
                                    border: 1px solid #ddd;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    flex: 1;
                                ">Afternoon (PM)</button>
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-calendar-plus" style="font-size: 48px; margin-bottom: 20px; color: #ddd;"></i>
                            <h3>Attendance Page</h3>
                            <p>This is where you would take attendance for your classes.</p>
                            <button onclick="location.href='./dashboard.html'" style="
                                padding: 10px 20px;
                                background: #405dde;
                                color: white;
                                border: none;
                                border-radius: 5px;
                                cursor: pointer;
                                margin-top: 20px;
                            ">
                                <i class="fas fa-arrow-left"></i> Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ Attendance content loaded');
            
        } catch (error) {
            console.error('Attendance content load error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h3>Error Loading Attendance</h3>
                    <p>${error.message}</p>
                    <button onclick="location.href='./dashboard.html'" style="
                        padding: 10px 20px;
                        background: #405dde;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 20px;
                    ">
                        Back to Dashboard
                    </button>
                </div>
            `;
        }
    }

    async loadReportsContent(container) {
        if (!container) return;
        
        try {
            console.log('📈 Loading reports content...');
            
            container.innerHTML = `
                <div style="padding: 20px;">
                    <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #2c3e50; margin-bottom: 20px;">
                            <i class="fas fa-chart-bar"></i> Attendance Reports
                        </h2>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px;">
                                <h4 style="color: #3498db; margin-bottom: 10px;">Daily Report</h4>
                                <p>View daily attendance statistics</p>
                                <button style="
                                    padding: 8px 15px;
                                    background: #3498db;
                                    color: white;
                                    border: none;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    margin-top: 10px;
                                ">Generate</button>
                            </div>
                            
                            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px;">
                                <h4 style="color: #2ecc71; margin-bottom: 10px;">Weekly Summary</h4>
                                <p>Weekly attendance overview</p>
                                <button style="
                                    padding: 8px 15px;
                                    background: #2ecc71;
                                    color: white;
                                    border: none;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    margin-top: 10px;
                                ">Generate</button>
                            </div>
                            
                            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px;">
                                <h4 style="color: #e67e22; margin-bottom: 10px;">Monthly Analysis</h4>
                                <p>Monthly attendance trends</p>
                                <button style="
                                    padding: 8px 15px;
                                    background: #e67e22;
                                    color: white;
                                    border: none;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    margin-top: 10px;
                                ">Generate</button>
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 20px; color: #ddd;"></i>
                            <h3>Reports Dashboard</h3>
                            <p>Generate and analyze attendance reports here.</p>
                            <button onclick="location.href='./dashboard.html'" style="
                                padding: 10px 20px;
                                background: #405dde;
                                color: white;
                                border: none;
                                border-radius: 5px;
                                cursor: pointer;
                                margin-top: 20px;
                            ">
                                <i class="fas fa-arrow-left"></i> Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ Reports content loaded');
            
        } catch (error) {
            console.error('Reports content load error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h3>Error Loading Reports</h3>
                    <p>${error.message}</p>
                    <button onclick="location.href='./dashboard.html'" style="
                        padding: 10px 20px;
                        background: #405dde;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 20px;
                    ">
                        Back to Dashboard
                    </button>
                </div>
            `;
        }
    }

    async loadMaintenancePage(container) {
        if (!container) return;
        
        try {
            console.log('⚙️ Loading maintenance content...');
            
            container.innerHTML = `
                <div style="padding: 20px;">
                    <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #2c3e50; margin-bottom: 20px;">
                            <i class="fas fa-cogs"></i> System Setup
                        </h2>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center;">
                                <i class="fas fa-users" style="font-size: 2rem; color: #3498db; margin-bottom: 10px;"></i>
                                <h4>Manage Classes</h4>
                                <p style="color: #666; font-size: 0.9rem;">Add, edit, or remove classes</p>
                            </div>
                            
                            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center;">
                                <i class="fas fa-user-graduate" style="font-size: 2rem; color: #2ecc71; margin-bottom: 10px;"></i>
                                <h4>Manage Students</h4>
                                <p style="color: #666; font-size: 0.9rem;">Add or remove students</p>
                            </div>
                            
                            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center;">
                                <i class="fas fa-sliders-h" style="font-size: 2rem; color: #e67e22; margin-bottom: 10px;"></i>
                                <h4>Settings</h4>
                                <p style="color: #666; font-size: 0.9rem;">Configure system settings</p>
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-tools" style="font-size: 48px; margin-bottom: 20px; color: #ddd;"></i>
                            <h3>Setup & Configuration</h3>
                            <p>Configure your attendance system settings here.</p>
                            <button onclick="location.href='./dashboard.html'" style="
                                padding: 10px 20px;
                                background: #405dde;
                                color: white;
                                border: none;
                                border-radius: 5px;
                                cursor: pointer;
                                margin-top: 20px;
                            ">
                                <i class="fas fa-arrow-left"></i> Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ Maintenance content loaded');
            
        } catch (error) {
            console.error('Maintenance content load error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h3>Error Loading Setup</h3>
                    <p>${error.message}</p>
                    <button onclick="location.href='./dashboard.html'" style="
                        padding: 10px 20px;
                        background: #405dde;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 20px;
                    ">
                        Back to Dashboard
                    </button>
                </div>
            `;
        }
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('attendance_user');
            window.location.href = './index.html';
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
