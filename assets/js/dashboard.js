// dashboard.js - Proper DashboardManager Implementation
console.log("🚀 dashboard.js loading...");

/**
 * DashboardManager - Main dashboard controller class
 */
class DashboardManager {
    constructor() {
        console.log("📊 DashboardManager constructor called");
        this.initializeDashboard();
    }

    /**
     * Initialize dashboard components
     */
    initializeDashboard() {
        console.log("🛠️ Initializing dashboard...");
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDashboard());
        } else {
            this.setupDashboard();
        }
    }

    /**
     * Setup all dashboard functionality
     */
    setupDashboard() {
        console.log("🔧 Setting up dashboard components...");
        
        // Update user info in header
        this.updateUserInfo();
        
        // Setup dashboard statistics
        this.setupDashboardStats();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load dashboard data
        this.loadDashboardData();
        
        console.log("✅ Dashboard setup complete");
    }

    /**
     * Update user information in header
     */
    updateUserInfo() {
        const userElement = document.getElementById('currentUser');
        if (userElement) {
            const userName = localStorage.getItem('user') || 
                             localStorage.getItem('userName') || 
                             localStorage.getItem('email') || 
                             'User';
            // Remove domain if it's an email
            const displayName = userName.includes('@') ? 
                               userName.split('@')[0] : 
                               userName;
            userElement.textContent = displayName;
            console.log("👤 User updated:", displayName);
        }
    }

    /**
     * Setup dashboard statistics and cards
     */
    setupDashboardStats() {
        console.log("📈 Setting up dashboard statistics...");
        
        // Sample data
        const stats = {
            'total-students': 425,
            'present-today': 398,
            'absent-today': 27,
            'attendance-rate': 93.6,
            'total-classes': 24,
            'total-teachers': 38
        };
        
        // Update each statistic element
        Object.keys(stats).forEach(statId => {
            const element = document.getElementById(statId);
            if (element) {
                this.animateStatValue(element, stats[statId], statId.includes('rate'));
            }
        });
    }

    /**
     * Animate a statistic value
     */
    animateStatValue(element, targetValue, isPercentage = false) {
        if (!element) return;
        
        const duration = 1500;
        const startTime = performance.now();
        const startValue = 0;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = startValue + (targetValue - startValue) * easeProgress;
            
            // Update display
            if (isPercentage) {
                element.textContent = `${current.toFixed(1)}%`;
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        console.log("🎯 Setting up event listeners...");
        
        // Logout button
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
                mobileMenuBtn.classList.toggle('active');
            });
        }
        
        // Navigation highlighting
        this.highlightCurrentPage();
        
        // Refresh button (if exists)
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
    }

    /**
     * Highlight current page in navigation
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
     * Load dashboard data
     */
    loadDashboardData() {
        console.log("📥 Loading dashboard data...");
        
        // Simulate API delay
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
            { time: 'Yesterday, 3:15 PM', action: 'Updated student records', user: 'Admin' }
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
            { date: 'Oct 20', event: 'Staff Development Day', time: 'All day' }
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
     * Handle user logout
     */
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            console.log("👋 Logging out...");
            
            // Clear all user data
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to login
            window.location.href = 'index.html';
        }
    }

    /**
     * Refresh dashboard
     */
    refreshDashboard() {
        console.log("🔄 Refreshing dashboard...");
        
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            // Show loading
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
            
            setTimeout(() => {
                // Reload data
                this.setupDashboardStats();
                this.loadDashboardData();
                
                // Restore button
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
                
                // Show notification
                if (typeof showNotification === 'function') {
                    showNotification('Dashboard refreshed!', 'success');
                }
                
                console.log("✅ Dashboard refreshed");
            }, 1200);
        }
    }

    /**
     * Public refresh method
     */
    refresh() {
        this.refreshDashboard();
    }

    /**
     * Cleanup
     */
    destroy() {
        console.log("🧹 Cleaning up dashboard...");
        // Cleanup code if needed
    }
}

// EXPORT the DashboardManager class
export { DashboardManager };

// Also make available globally for compatibility
if (typeof window !== 'undefined') {
    window.DashboardManager = DashboardManager;
}

console.log("✅ dashboard.js loaded - DashboardManager exported");
