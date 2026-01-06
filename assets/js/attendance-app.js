// attendance-app.js - CLEANED VERSION
// ==================== STORAGE UTILITY ====================
const Storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading ${key} from localStorage:`, error);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error saving ${key} to localStorage:`, error);
            return false;
        }
    },
    
    remove(key) {
        localStorage.removeItem(key);
    },
    
    clear() {
        localStorage.clear();
    }
};

// ==================== MAIN APP ====================
class AttendanceApp {
    constructor() {
        console.log('🎯 AttendanceApp constructor');
        this.user = null;
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Attendance System...');
        
        try {
            // Check authentication
            const userJson = localStorage.getItem('attendance_user');
            if (!userJson) {
                window.location.href = 'index.html';
                return;
            }
            
            this.user = JSON.parse(userJson);
            console.log('👤 User:', this.user);
            
            // Update UI
            this.updateUserStatus();
            
            // Load dashboard content
            await this.loadDashboardContent();
            
            console.log('✅ Attendance System initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showToast('Failed to initialize application', 'error');
        }
    }
    
    updateUserStatus() {
        const userStatus = document.getElementById('navUserStatus');
        if (!userStatus || !this.user) return;
        
        userStatus.innerHTML = `
            <div class="status-content">
                <i class="fas fa-user-circle"></i>
                <div class="user-info">
                    <div class="user-name">${this.user.name || this.user.email}</div>
                    <div class="user-role">${this.user.role || 'Teacher'}</div>
                </div>
            </div>
        `;
    }
    
    async loadDashboardContent() {
        const container = document.getElementById('app-container') || document.getElementById('page-content');
        if (!container) {
            console.error('❌ Container not found');
            return;
        }
        
        container.innerHTML = `
            <div class="dashboard-container">
                <h1>Welcome, ${this.user?.name || 'Teacher'}</h1>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">🏫</div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-classes">0</div>
                            <div class="stat-label">Total Classes</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">👨‍🎓</div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-students">0</div>
                            <div class="stat-label">Total Students</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-sessions">0</div>
                            <div class="stat-label">Sessions</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <div class="stat-value" id="attendance-rate">0%</div>
                            <div class="stat-label">Today's Rate</div>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-sections">
                    <div class="section">
                        <h2>Recent Activity</h2>
                        <div id="recent-activity" class="activity-list">
                            <div class="activity-placeholder">No recent activity</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>Quick Actions</h2>
                        <div class="quick-actions">
                            <button onclick="window.app.navigateTo('take-attendance')" class="action-btn primary">
                                <i class="fas fa-clipboard-check"></i>
                                Take Attendance
                            </button>
                            <button onclick="window.app.navigateTo('manage-classes')" class="action-btn secondary">
                                <i class="fas fa-chalkboard-teacher"></i>
                                Manage Classes
                            </button>
                            <button onclick="window.app.loadDashboardData()" class="action-btn tertiary">
                                <i class="fas fa-sync"></i>
                                Refresh Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load data after rendering
        await this.loadDashboardData();
    }
    
    async loadDashboardData() {
        try {
            console.log('📊 Loading dashboard data...');
            
            const classes = Storage.get('classes') || [];
            const students = Storage.get('students') || [];
            const attendance = Storage.get('attendance') || [];
            
            // Update stats
            const totalClasses = document.getElementById('total-classes');
            const totalStudents = document.getElementById('total-students');
            const totalSessions = document.getElementById('total-sessions');
            const attendanceRate = document.getElementById('attendance-rate');
            
            if (totalClasses) totalClasses.textContent = classes.length;
            if (totalStudents) totalStudents.textContent = students.length;
            if (totalSessions) totalSessions.textContent = attendance.length;
            
            // Calculate today's attendance rate
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendance.filter(a => a.date === today);
            
            let rate = 0;
            if (todayAttendance.length > 0) {
                const totalPresent = todayAttendance.reduce((sum, a) => sum + (a.totalPresent || 0), 0);
                const totalStudentsCount = todayAttendance.reduce((sum, a) => sum + (a.totalStudents || 0), 0);
                rate = totalStudentsCount > 0 ? Math.round((totalPresent / totalStudentsCount) * 100) : 0;
            }
            
            if (attendanceRate) attendanceRate.textContent = `${rate}%`;
            
            // Load recent activity
            this.loadRecentActivity(attendance);
            
            console.log('✅ Dashboard data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }
    
    loadRecentActivity(attendance) {
        try {
            const container = document.getElementById('recent-activity');
            if (!container) return;
            
            if (!attendance || attendance.length === 0) {
                container.innerHTML = `
                    <div class="activity-placeholder">
                        <i class="fas fa-calendar-times"></i>
                        <p>No attendance records yet</p>
                        <button onclick="window.app.navigateTo('take-attendance')" class="btn btn-sm btn-primary">
                            Take First Attendance
                        </button>
                    </div>
                `;
                return;
            }
            
            // Sort by date (newest first) and take last 5
            const recent = [...attendance]
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                .slice(0, 5);
            
            container.innerHTML = recent.map(item => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    <div class="activity-details">
                        <div class="activity-title">${item.className || 'Class'} Attendance</div>
                        <div class="activity-info">
                            <span class="activity-date">${this.formatDate(item.date)}</span>
                            <span class="activity-stats">${item.totalPresent || 0}/${item.totalStudents || 0} present</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('❌ Error loading recent activity:', error);
        }
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    navigateTo(page) {
        console.log(`Navigating to: ${page}`);
        window.location.href = `${page}.html`;
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
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM fully loaded');
    window.app = new AttendanceApp();
    
    // Add CSS for animations
    const style = document.createElement('style');
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
});
