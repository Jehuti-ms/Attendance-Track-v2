// dashboard.js - Dashboard Module for Attendance Track
// Proper ES6 Module Export

/**
 * DashboardManager - Main dashboard controller
 */
export class DashboardManager {
    constructor() {
        console.log("📊 DashboardManager: Constructor called");
        this.initializeDashboard();
    }

    /**
     * Initialize the dashboard
     */
    initializeDashboard() {
        console.log("🚀 DashboardManager: Initializing...");
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDashboard());
        } else {
            this.setupDashboard();
        }
    }

    /**
     * Setup all dashboard components
     */
    setupDashboard() {
        console.log("🛠️ DashboardManager: Setting up components");
        
        // Setup core dashboard features
        this.setupDashboardCards();
        this.setupCharts();
        this.setupEventListeners();
        this.updateUserInfo();
        
        // Load data
        this.loadDashboardData();
        
        console.log("✅ DashboardManager: Setup complete");
    }

    /**
     * Setup dashboard statistics cards
     */
    setupDashboardCards() {
        console.log("🃏 Setting up dashboard cards...");
        
        // Sample statistics data
        const statsData = {
            totalStudents: 425,
            presentToday: 398,
            absentToday: 27,
            attendanceRate: 93.6,
            totalClasses: 24,
            totalTeachers: 38
        };
        
        // Update each card with animated values
        Object.keys(statsData).forEach(statKey => {
            const element = document.getElementById(statKey);
            if (element) {
                this.animateValue(element, statsData[statKey], statKey.includes('Rate') ? '%' : '');
            }
        });
    }

    /**
     * Animate a value from 0 to target
     * @param {HTMLElement} element - Target element
     * @param {number} targetValue - Target value
     * @param {string} suffix - Optional suffix (%, $, etc.)
     */
    animateValue(element, targetValue, suffix = '') {
        const duration = 1500;
        const startTime = performance.now();
        const startValue = 0;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic for smooth animation
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (targetValue - startValue) * easeProgress;
            
            // Format the display value
            let displayValue;
            if (suffix === '%') {
                displayValue = `${currentValue.toFixed(1)}%`;
            } else {
                displayValue = Math.floor(currentValue).toLocaleString();
            }
            
            element.textContent = displayValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Setup dashboard charts
     */
    setupCharts() {
        console.log("📈 Setting up charts...");
        
        // Setup attendance chart
        this.createAttendanceChart();
        
        // Setup trend chart if element exists
        if (document.getElementById('weekly-trend-chart')) {
            this.createWeeklyTrendChart();
        }
    }

    /**
     * Create attendance bar chart
     */
    createAttendanceChart() {
        const chartContainer = document.getElementById('attendance-chart');
        if (!chartContainer) return;
        
        // Sample data
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const attendance = [85, 92, 88, 95, 90, 93, 96];
        const maxAttendance = Math.max(...attendance);
        
        // Create chart HTML
        chartContainer.innerHTML = `
            <div class="chart-header">
                <h3>Weekly Attendance</h3>
                <span class="chart-subtitle">Last 7 days</span>
            </div>
            <div class="chart-bars-container">
                ${days.map((day, index) => {
                    const height = (attendance[index] / maxAttendance) * 100;
                    const color = attendance[index] >= 90 ? '#27ae60' : 
                                 attendance[index] >= 80 ? '#f39c12' : '#e74c3c';
                    
                    return `
                        <div class="chart-bar-wrapper">
                            <div class="chart-bar" 
                                 style="height: ${height}%; background-color: ${color};"
                                 data-value="${attendance[index]}%">
                            </div>
                            <div class="chart-label">${day}</div>
                            <div class="chart-value">${attendance[index]}%</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Create weekly trend chart
     */
    createWeeklyTrendChart() {
        const chartContainer = document.getElementById('weekly-trend-chart');
        if (!chartContainer) return;
        
        chartContainer.innerHTML = `
            <div class="trend-chart">
                <div class="trend-header">
                    <h3>Attendance Trend</h3>
                    <span class="trend-change positive">+2.4%</span>
                </div>
                <div class="trend-description">
                    <p>Weekly attendance shows a positive trend with overall improvement.</p>
                </div>
                <div class="trend-metrics">
                    <div class="metric">
                        <span class="metric-label">This Week</span>
                        <span class="metric-value">93.6%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Last Week</span>
                        <span class="metric-value">91.2%</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load dashboard data from API/source
     */
    loadDashboardData() {
        console.log("📥 Loading dashboard data...");
        
        // Simulate API call delay
        setTimeout(() => {
            this.updateRecentActivity();
            this.updateUpcomingEvents();
            console.log("✅ Dashboard data loaded");
        }, 800);
    }

    /**
     * Update recent activity list
     */
    updateRecentActivity() {
        const activityList = document.getElementById('recent-activity-list');
        if (!activityList) return;
        
        const activities = [
            { time: '10:30 AM', action: 'Marked attendance for Grade 10-A', user: 'Ms. Johnson' },
            { time: '9:45 AM', action: 'Submitted absence report', user: 'Mr. Thompson' },
            { time: 'Yesterday, 3:15 PM', action: 'Updated student records', user: 'Admin' },
            { time: 'Yesterday, 11:20 AM', action: 'Generated monthly report', user: 'Principal' },
            { time: 'Oct 12, 2:00 PM', action: 'System maintenance completed', user: 'IT Dept' }
        ];
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-action">${activity.action}</div>
                    <div class="activity-user">${activity.user}</div>
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `).join('');
    }

    /**
     * Update upcoming events list
     */
    updateUpcomingEvents() {
        const eventsList = document.getElementById('upcoming-events-list');
        if (!eventsList) return;
        
        const events = [
            { date: 'Tomorrow', event: 'Parent-Teacher Conference', time: '3:00 PM' },
            { date: 'Oct 20', event: 'Staff Development Day', time: 'All day' },
            { date: 'Oct 25', event: 'Mid-term Exams Begin', time: '9:00 AM' },
            { date: 'Nov 1', event: 'Report Cards Distribution', time: '2:00 PM' }
        ];
        
        eventsList.innerHTML = events.map(event => `
            <div class="event-item">
                <div class="event-date">${event.date}</div>
                <div class="event-details">
                    <div class="event-title">${event.event}</div>
                    <div class="event-time">${event.time}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        console.log("🎯 Setting up event listeners...");
        
        // Dashboard refresh button
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        // User logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
        
        // Mobile menu toggle
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navList = document.querySelector('.nav-list');
        
        if (mobileMenuBtn && navList) {
            mobileMenuBtn.addEventListener('click', () => {
                const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
                mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
                navList.classList.toggle('active');
                
                // Animate hamburger icon
                mobileMenuBtn.classList.toggle('active');
            });
        }
        
        // Highlight current page in navigation
        this.highlightCurrentPage();
    }

    /**
     * Highlight the current page in navigation
     */
    highlightCurrentPage() {
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }

    /**
     * Update user information in header
     */
    updateUserInfo() {
        const userNameElement = document.getElementById('currentUser');
        if (userNameElement) {
            const userName = localStorage.getItem('user') || 
                             localStorage.getItem('userName') || 
                             localStorage.getItem('email') || 
                             'User';
            userNameElement.textContent = userName.split('@')[0]; // Remove domain if email
        }
    }

    /**
     * Handle user logout
     */
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            console.log("👋 Logging out user...");
            
            // Clear all user data
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to login page
            window.location.href = 'index.html';
        }
    }

    /**
     * Refresh dashboard data
     */
    refreshDashboard() {
        console.log("🔄 Refreshing dashboard...");
        
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            // Show loading state
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
            
            // Simulate refresh process
            setTimeout(() => {
                // Reload dashboard data
                this.setupDashboardCards();
                this.loadDashboardData();
                
                // Restore button state
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
                
                // Show success notification
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Dashboard refreshed successfully!', 'success');
                }
                
                console.log("✅ Dashboard refreshed");
            }, 1200);
        }
    }

    /**
     * Public method to manually refresh dashboard
     */
    refresh() {
        this.refreshDashboard();
    }

    /**
     * Cleanup method (for when dashboard is closed)
     */
    destroy() {
        console.log("🧹 Cleaning up dashboard...");
        // Remove event listeners, clear intervals, etc.
    }
}

// Export as default as well for compatibility
export default DashboardManager;

// Global fallback for non-module environments
if (typeof window !== 'undefined') {
    window.DashboardManager = DashboardManager;
}

console.log("✅ dashboard.js module loaded and ready");
