// dashboard.js - Fixed version
export class DashboardManager {
    constructor() {
        console.log("📊 DashboardManager constructor called");
        this.initializeDashboard();
    }

    initializeDashboard() {
        console.log("🚀 Initializing dashboard...");
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDashboard());
        } else {
            this.setupDashboard();
        }
    }

    setupDashboard() {
        console.log("Setting up dashboard components...");
        
        // Setup dashboard elements
        this.setupDashboardCards();
        this.setupCharts();
        this.loadDashboardData();
        this.setupEventListeners();
        
        // Update user info
        this.updateUserInfo();
        
        console.log("✅ Dashboard setup complete");
    }

    setupDashboardCards() {
        console.log("🃏 Setting up dashboard cards...");
        
        // Sample data
        const stats = {
            'total-students': 425,
            'present-today': 398,
            'absent-today': 27,
            'attendance-rate': '93.6%',
            'total-classes': 24,
            'total-teachers': 38
        };

        // Update each card
        Object.keys(stats).forEach(cardId => {
            const card = document.getElementById(cardId);
            if (card) {
                // Find the value element
                const valueElement = card.querySelector('.card-value') || 
                                    card.querySelector('.stat-value') ||
                                    card.querySelector('.value') ||
                                    card;
                
                if (valueElement) {
                    this.animateValue(valueElement, stats[cardId]);
                }
            }
        });
    }

    animateValue(element, endValue) {
        if (!element) return;
        
        // Clear existing content
        element.textContent = '';
        
        // Check if it's a percentage
        const isPercent = typeof endValue === 'string' && endValue.includes('%');
        const numericValue = isPercent ? parseFloat(endValue) : Number(endValue);
        
        let start = 0;
        const duration = 1500;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = start + (numericValue - start) * easeOutQuart;
            
            // Update display
            if (isPercent) {
                element.textContent = `${current.toFixed(1)}%`;
            } else {
                element.textContent = Math.floor(current);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    setupCharts() {
        console.log("📈 Setting up charts...");
        
        // Simple chart implementation
        this.createAttendanceChart();
        this.createWeeklyTrendChart();
    }

    createAttendanceChart() {
        const chartContainer = document.getElementById('attendance-chart');
        if (!chartContainer) return;
        
        const data = [85, 92, 88, 95, 90, 93, 96];
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const maxValue = Math.max(...data);
        
        let chartHTML = '<div class="chart-bars" style="display:flex;height:200px;align-items:flex-end;gap:15px;padding:20px;">';
        
        data.forEach((value, index) => {
            const height = (value / maxValue) * 100;
            const color = value >= 90 ? '#27ae60' : value >= 80 ? '#f39c12' : '#e74c3c';
            
            chartHTML += `
                <div style="display:flex;flex-direction:column;align-items:center;flex:1;">
                    <div style="width:40px;height:${height}%;background:${color};border-radius:4px 4px 0 0;transition:height 0.5s;"></div>
                    <div style="margin-top:10px;font-weight:600;">${labels[index]}</div>
                    <div style="margin-top:5px;color:#666;font-size:14px;">${value}%</div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }

    createWeeklyTrendChart() {
        const chartContainer = document.getElementById('weekly-trend-chart');
        if (!chartContainer) return;
        
        chartContainer.innerHTML = `
            <div style="padding:20px;color:#666;">
                <div style="font-weight:600;margin-bottom:15px;">Weekly Attendance Trend</div>
                <div style="height:150px;background:#f8f9fa;border-radius:8px;padding:15px;display:flex;align-items:center;justify-content:center;">
                    <div style="text-align:center;">
                        <div style="font-size:24px;color:#3498db;font-weight:700;">+2.4%</div>
                        <div style="font-size:14px;margin-top:5px;">Improvement this week</div>
                    </div>
                </div>
            </div>
        `;
    }

    loadDashboardData() {
        console.log("📥 Loading dashboard data...");
        
        // Simulate API call
        setTimeout(() => {
            this.updateRecentActivity();
            this.updateUpcomingEvents();
        }, 1000);
    }

    updateRecentActivity() {
        const activityList = document.getElementById('recent-activity-list');
        if (!activityList) return;
        
        const activities = [
            { time: '10:30 AM', action: 'Marked attendance for Grade 10-A', user: 'Ms. Johnson' },
            { time: '9:45 AM', action: 'Submitted absence report', user: 'Mr. Thompson' },
            { time: 'Yesterday, 3:15 PM', action: 'Updated student records', user: 'Admin' }
        ];
        
        let html = '';
        activities.forEach(activity => {
            html += `
                <div style="padding:12px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;">
                    <div>
                        <div style="font-weight:600;">${activity.action}</div>
                        <div style="font-size:12px;color:#666;">${activity.user}</div>
                    </div>
                    <div style="font-size:12px;color:#999;">${activity.time}</div>
                </div>
            `;
        });
        
        activityList.innerHTML = html;
    }

    updateUpcomingEvents() {
        const eventsList = document.getElementById('upcoming-events-list');
        if (!eventsList) return;
        
        const events = [
            { date: 'Tomorrow', event: 'Parent-Teacher Conference', time: '3:00 PM' },
            { date: 'Oct 20', event: 'Staff Development Day', time: 'All day' }
        ];
        
        let html = '';
        events.forEach(event => {
            html += `
                <div style="padding:12px;border-bottom:1px solid #eee;">
                    <div style="font-weight:600;color:#2c3e50;">${event.event}</div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-top:5px;">
                        <span>${event.date}</span>
                        <span>${event.time}</span>
                    </div>
                </div>
            `;
        });
        
        eventsList.innerHTML = html;
    }

    setupEventListeners() {
        console.log("🎯 Setting up event listeners...");
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    localStorage.clear();
                    window.location.href = 'index.html';
                }
            });
        }
        
        // Mobile menu
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navList = document.querySelector('.nav-list');
        
        if (mobileMenuBtn && navList) {
            mobileMenuBtn.addEventListener('click', () => {
                const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
                mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
                navList.classList.toggle('active');
            });
        }
    }

    updateUserInfo() {
        const userNameElement = document.getElementById('currentUser');
        if (userNameElement) {
            const userName = localStorage.getItem('user') || localStorage.getItem('userName') || 'User';
            userNameElement.textContent = userName;
        }
    }

    refreshDashboard() {
        console.log("🔄 Refreshing dashboard...");
        
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
            
            setTimeout(() => {
                this.setupDashboardCards();
                this.loadDashboardData();
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
                
                // Show notification
                if (typeof showNotification === 'function') {
                    showNotification('Dashboard refreshed successfully!', 'success');
                }
            }, 1500);
        }
    }
}

// For backward compatibility
if (typeof window !== 'undefined') {
    window.DashboardManager = DashboardManager;
}

console.log("✅ dashboard.js loaded and exported DashboardManager");
