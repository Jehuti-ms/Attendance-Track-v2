// dashboard.js - Dashboard module for Attendance Track

class DashboardManager {
    constructor() {
        console.log("📊 DashboardManager constructor");
        this.initializeDashboard();
    }

    initializeDashboard() {
        console.log("🚀 Initializing dashboard...");
        
        // Set up dashboard elements
        this.setupDashboardCards();
        this.setupCharts();
        this.loadDashboardData();
        this.setupEventListeners();
    }

    setupDashboardCards() {
        console.log("🃏 Setting up dashboard cards...");
        
        // Sample data for dashboard cards
        const stats = {
            totalStudents: 425,
            presentToday: 398,
            absentToday: 27,
            attendanceRate: 93.6,
            classes: 24,
            teachers: 38
        };

        // Update dashboard cards with data
        this.updateCard('total-students', stats.totalStudents);
        this.updateCard('present-today', stats.presentToday);
        this.updateCard('absent-today', stats.absentToday);
        this.updateCard('attendance-rate', `${stats.attendanceRate}%`);
        this.updateCard('total-classes', stats.classes);
        this.updateCard('total-teachers', stats.teachers);
    }

    updateCard(cardId, value) {
        const cardElement = document.getElementById(cardId);
        if (cardElement) {
            // Find the value element within the card
            const valueElement = cardElement.querySelector('.card-value') || 
                                cardElement.querySelector('.stat-number') ||
                                cardElement;
            
            // Animate the number if it's numeric
            if (typeof value === 'number' || (!isNaN(value) && value.includes('%'))) {
                this.animateValue(valueElement, 0, value, 1000);
            } else {
                valueElement.textContent = value;
            }
        }
    }

    animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // Handle percentage values
            if (typeof end === 'string' && end.includes('%')) {
                const numericEnd = parseFloat(end);
                const currentValue = progress * numericEnd;
                element.textContent = `${currentValue.toFixed(1)}%`;
            } else {
                const currentValue = progress * end;
                element.textContent = Math.floor(currentValue);
            }
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    setupCharts() {
        console.log("📈 Setting up charts...");
        
        // Check if we're on a page that has chart containers
        const attendanceChart = document.getElementById('attendance-chart');
        const weeklyTrendChart = document.getElementById('weekly-trend-chart');
        
        if (attendanceChart) {
            this.createAttendanceChart();
        }
        
        if (weeklyTrendChart) {
            this.createWeeklyTrendChart();
        }
    }

    createAttendanceChart() {
        // This is a simplified chart implementation
        // In a real app, you would use Chart.js or similar library
        const chartContainer = document.getElementById('attendance-chart');
        if (!chartContainer) return;

        // Create a simple bar chart visualization
        const data = [85, 92, 88, 95, 90, 93, 96];
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        let chartHTML = '<div class="chart-bars">';
        const maxValue = Math.max(...data);
        
        data.forEach((value, index) => {
            const height = (value / maxValue) * 100;
            chartHTML += `
                <div class="chart-bar-container">
                    <div class="chart-bar" style="height: ${height}%"></div>
                    <div class="chart-label">${labels[index]}</div>
                    <div class="chart-value">${value}%</div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }

    createWeeklyTrendChart() {
        const chartContainer = document.getElementById('weekly-trend-chart');
        if (!chartContainer) return;

        // Create a simple line chart
        const data = [82, 85, 88, 90, 92, 93, 94];
        const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Current'];
        
        let chartHTML = '<div class="line-chart">';
        
        // Create points and lines
        data.forEach((value, index) => {
            const leftPosition = (index / (data.length - 1)) * 100;
            chartHTML += `
                <div class="chart-point" style="left: ${leftPosition}%; bottom: ${value}%"></div>
            `;
            
            if (index > 0) {
                const prevValue = data[index - 1];
                const prevLeft = ((index - 1) / (data.length - 1)) * 100;
                chartHTML += `
                    <div class="chart-line" 
                         style="left: ${prevLeft}%; 
                                width: ${leftPosition - prevLeft}%;
                                bottom: ${prevValue}%;
                                height: ${Math.abs(value - prevValue)}%">
                    </div>
                `;
            }
        });
        
        // Add labels
        chartHTML += '<div class="chart-labels">';
        labels.forEach((label, index) => {
            const leftPosition = (index / (data.length - 1)) * 100;
            chartHTML += `<div class="chart-label" style="left: ${leftPosition}%">${label}</div>`;
        });
        chartHTML += '</div>';
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }

    loadDashboardData() {
        console.log("📥 Loading dashboard data...");
        
        // Simulate API call
        setTimeout(() => {
            this.updateRecentActivity();
            this.updateUpcomingEvents();
        }, 500);
    }

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

        let activityHTML = '';
        activities.forEach(activity => {
            activityHTML += `
                <div class="activity-item">
                    <div class="activity-time">${activity.time}</div>
                    <div class="activity-action">${activity.action}</div>
                    <div class="activity-user">${activity.user}</div>
                </div>
            `;
        });

        activityList.innerHTML = activityHTML;
    }

    updateUpcomingEvents() {
        const eventsList = document.getElementById('upcoming-events-list');
        if (!eventsList) return;

        const events = [
            { date: 'Tomorrow', event: 'Parent-Teacher Conference', time: '3:00 PM' },
            { date: 'Oct 20', event: 'Staff Development Day', time: 'All day' },
            { date: 'Oct 25', event: 'Mid-term Exams Begin', time: '9:00 AM' },
            { date: 'Nov 1', event: 'Report Cards Distribution', time: '2:00 PM' },
            { date: 'Nov 5', event: 'Sports Day', time: '8:00 AM' }
        ];

        let eventsHTML = '';
        events.forEach(event => {
            eventsHTML += `
                <div class="event-item">
                    <div class="event-date">${event.date}</div>
                    <div class="event-details">
                        <div class="event-title">${event.event}</div>
                        <div class="event-time">${event.time}</div>
                    </div>
                </div>
            `;
        });

        eventsList.innerHTML = eventsHTML;
    }

    setupEventListeners() {
        console.log("🎯 Setting up dashboard event listeners...");
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshDashboard();
            });
        }

        // Quick action buttons
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action || e.target.closest('.quick-action-btn').dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    refreshDashboard() {
        console.log("🔄 Refreshing dashboard...");
        
        // Show loading state
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
            
            // Simulate refresh
            setTimeout(() => {
                this.loadDashboardData();
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
                
                // Show notification
                if (window.showNotification) {
                    window.showNotification('Dashboard refreshed successfully!', 'success');
                }
            }, 1500);
        }
    }

    handleQuickAction(action) {
        console.log(`🚀 Quick action: ${action}`);
        
        const actions = {
            'take-attendance': 'Take Attendance',
            'generate-report': 'Generate Report',
            'add-student': 'Add Student',
            'send-alerts': 'Send Alerts'
        };

        const actionName = actions[action] || action;
        
        if (window.showNotification) {
            window.showNotification(`Opening ${actionName}...`, 'info');
        }
        
        // In a real app, this would navigate to the appropriate section
        setTimeout(() => {
            if (window.showNotification) {
                window.showNotification(`${actionName} feature would open here.`, 'success');
            }
        }, 500);
    }

    // Public method to refresh dashboard from other modules
    refresh() {
        this.refreshDashboard();
    }
}

// Export the DashboardManager class
export { DashboardManager };

// Also make it available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.DashboardManager = DashboardManager;
}
