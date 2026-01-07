// attendance-app.js - MINIMAL STABLE VERSION
class AttendanceApp {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
        console.log('📱 AttendanceApp created');
    }

    async init() {
        try {
            console.log('🚀 Initializing app...');
            
            // Get user from localStorage
            const userData = localStorage.getItem('attendance_user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                console.log('✅ User loaded:', this.currentUser.email);
            }
            
            // Set global reference
            window.app = this;
            window.attendanceApp = this;
            
            this.initialized = true;
            console.log('✅ App initialized');
            
            return true;
        } catch (error) {
            console.error('❌ Init error:', error);
            return false;
        }
    }

    async checkAuth() {
        try {
            const userData = localStorage.getItem('attendance_user');
            return !!userData;
        } catch (error) {
            return false;
        }
    }

    async loadHeader(container) {
        if (!container) return;
        
        try {
            console.log('🔼 Loading header...');
            
            // SIMPLE HEADER - No complex navigation
            container.innerHTML = `
                <header style="
                    background: #2c3e50;
                    color: white;
                    padding: 0 20px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                ">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: white;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="fas fa-calendar-check" style="color: #2c3e50;"></i>
                        </div>
                        <h1 style="margin: 0; font-size: 1.2rem;">Attendance Track</h1>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 0.9rem;">
                            ${this.currentUser?.name || 'User'}
                        </span>
                        <button onclick="app.logout()" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: white;
                            padding: 8px 15px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">
                            Logout
                        </button>
                    </div>
                </header>
            `;
            
            console.log('✅ Header loaded');
        } catch (error) {
            console.error('Header error:', error);
            container.innerHTML = `<div style="height: 60px; background: #f5f5f5;"></div>`;
        }
    }

    async loadFooter(container) {
        if (!container) return;
        
        try {
            container.innerHTML = `
                <footer style="
                    background: #2c3e50;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    font-size: 0.9rem;
                    margin-top: auto;
                ">
                    <p style="margin: 0;">Attendance Track v2 &copy; ${new Date().getFullYear()}</p>
                </footer>
            `;
        } catch (error) {
            // Silent fail for footer
        }
    }

    async loadDashboardContent(container) {
        if (!container) return;
        
        try {
            console.log('📊 Loading dashboard...');
            
            // SIMPLE DASHBOARD CONTENT
            container.innerHTML = `
                <div style="padding: 20px; max-width: 1200px; margin: 0 auto;">
                    <!-- Page Header -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin-bottom: 10px;">
                            <i class="fas fa-tachometer-alt"></i> Dashboard
                        </h2>
                        <p style="color: #666;">Welcome back, ${this.currentUser?.name || 'Teacher'}!</p>
                    </div>
                    
                    <!-- Simple Stats -->
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                    ">
                        <div style="
                            background: white;
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            text-align: center;
                        ">
                            <h3 style="color: #3498db; margin-bottom: 10px;">
                                <i class="fas fa-calendar-check"></i>
                            </h3>
                            <p style="font-size: 2rem; font-weight: bold; color: #333;">0</p>
                            <p style="color: #666; font-size: 0.9rem;">Today's Attendance</p>
                        </div>
                        
                        <div style="
                            background: white;
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            text-align: center;
                        ">
                            <h3 style="color: #2ecc71; margin-bottom: 10px;">
                                <i class="fas fa-users"></i>
                            </h3>
                            <p style="font-size: 2rem; font-weight: bold; color: #333;">3</p>
                            <p style="color: #666; font-size: 0.9rem;">Total Classes</p>
                        </div>
                    </div>
                    
                    <!-- Simple Navigation -->
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                    ">
                        <a href="./attendance.html" style="
                            display: block;
                            padding: 15px;
                            background: white;
                            border: 2px solid #3498db;
                            border-radius: 8px;
                            text-decoration: none;
                            text-align: center;
                            color: #3498db;
                            font-weight: bold;
                            transition: all 0.3s;
                        ">
                            <i class="fas fa-calendar-plus"></i> Take Attendance
                        </a>
                        
                        <a href="./reports.html" style="
                            display: block;
                            padding: 15px;
                            background: white;
                            border: 2px solid #2ecc71;
                            border-radius: 8px;
                            text-decoration: none;
                            text-align: center;
                            color: #2ecc71;
                            font-weight: bold;
                            transition: all 0.3s;
                        ">
                            <i class="fas fa-chart-bar"></i> View Reports
                        </a>
                    </div>
                    
                    <!-- Status Message -->
                    <div style="
                        margin-top: 30px;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 8px;
                        text-align: center;
                        color: #666;
                    ">
                        <p>System is running normally</p>
                    </div>
                </div>
            `;
            
            console.log('✅ Dashboard loaded');
        } catch (error) {
            console.error('Dashboard error:', error);
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
            console.log('📅 Loading attendance page...');
            
            container.innerHTML = `
                <div style="padding: 20px; max-width: 1200px; margin: 0 auto;">
                    <h2 style="color: #2c3e50; margin-bottom: 20px;">
                        <i class="fas fa-calendar-check"></i> Attendance
                    </h2>
                    
                    <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <p style="color: #666; margin-bottom: 20px;">
                            This is the attendance recording page.
                        </p>
                        
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-calendar-plus" style="font-size: 3rem; color: #ddd; margin-bottom: 20px;"></i>
                            <p style="color: #999;">Attendance functionality would be here</p>
                            
                            <a href="./dashboard.html" style="
                                display: inline-block;
                                margin-top: 20px;
                                padding: 10px 20px;
                                background: #405dde;
                                color: white;
                                text-decoration: none;
                                border-radius: 5px;
                            ">
                                ← Back to Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ Attendance page loaded');
        } catch (error) {
            console.error('Attendance page error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h3>Error Loading Attendance</h3>
                    <p>${error.message}</p>
                    <a href="./dashboard.html" style="
                        padding: 10px 20px;
                        background: #405dde;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                    ">
                        Back to Dashboard
                    </a>
                </div>
            `;
        }
    }

    async loadReportsContent(container) {
        if (!container) return;
        
        try {
            console.log('📈 Loading reports page...');
            
            container.innerHTML = `
                <div style="padding: 20px; max-width: 1200px; margin: 0 auto;">
                    <h2 style="color: #2c3e50; margin-bottom: 20px;">
                        <i class="fas fa-chart-bar"></i> Reports
                    </h2>
                    
                    <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <p style="color: #666; margin-bottom: 20px;">
                            This is the reports page.
                        </p>
                        
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-chart-line" style="font-size: 3rem; color: #ddd; margin-bottom: 20px;"></i>
                            <p style="color: #999;">Report generation would be here</p>
                            
                            <a href="./dashboard.html" style="
                                display: inline-block;
                                margin-top: 20px;
                                padding: 10px 20px;
                                background: #405dde;
                                color: white;
                                text-decoration: none;
                                border-radius: 5px;
                            ">
                                ← Back to Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ Reports page loaded');
        } catch (error) {
            console.error('Reports page error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h3>Error Loading Reports</h3>
                    <p>${error.message}</p>
                    <a href="./dashboard.html" style="
                        padding: 10px 20px;
                        background: #405dde;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                    ">
                        Back to Dashboard
                    </a>
                </div>
            `;
        }
    }

    async loadMaintenancePage(container) {
        if (!container) return;
        
        try {
            console.log('⚙️ Loading maintenance page...');
            
            container.innerHTML = `
                <div style="padding: 20px; max-width: 1200px; margin: 0 auto;">
                    <h2 style="color: #2c3e50; margin-bottom: 20px;">
                        <i class="fas fa-cogs"></i> Setup
                    </h2>
                    
                    <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <p style="color: #666; margin-bottom: 20px;">
                            This is the setup/maintenance page.
                        </p>
                        
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-tools" style="font-size: 3rem; color: #ddd; margin-bottom: 20px;"></i>
                            <p style="color: #999;">Setup and configuration would be here</p>
                            
                            <a href="./dashboard.html" style="
                                display: inline-block;
                                margin-top: 20px;
                                padding: 10px 20px;
                                background: #405dde;
                                color: white;
                                text-decoration: none;
                                border-radius: 5px;
                            ">
                                ← Back to Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ Maintenance page loaded');
        } catch (error) {
            console.error('Maintenance page error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h3>Error Loading Setup</h3>
                    <p>${error.message}</p>
                    <a href="./dashboard.html" style="
                        padding: 10px 20px;
                        background: #405dde;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                    ">
                        Back to Dashboard
                    </a>
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

// Initialize immediately
const attendanceApp = new AttendanceApp();

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing app...');
    attendanceApp.init();
});

// Make available globally
window.attendanceApp = attendanceApp;
window.app = attendanceApp;
