// assets/js/dashboard.js - Global namespace version
console.log('📊 dashboard.js loaded');

window.dashboard = window.dashboard || {
    init: function() {
        console.log('Initializing dashboard...');
        if (!this.isAuthenticated()) {
            window.location.href = window.getBasePath() + 'login.html';
            return;
        }
        
        this.loadStats();
        this.setupEventListeners();
    },

    isAuthenticated: function() {
        return !!utils.loadData('attendance_user');
    },

    loadStats: function() {
        console.log('Loading dashboard statistics...');
        // Load stats from localStorage or generate demo data
        const stats = {
            totalStudents: 24,
            attendanceRate: '92%',
            classesToday: 5,
            pendingActions: 3,
            recentActivity: [
                { type: 'attendance', text: 'Attendance taken for Mathematics 101', time: 'Today, 9:00 AM' },
                { type: 'export', text: 'Report exported for Week 45', time: 'Yesterday, 3:30 PM' },
                { type: 'add', text: '3 new students added', time: 'Monday, 10:15 AM' }
            ]
        };
        
        // Update UI with stats
        if (typeof this.updateUI === 'function') {
            this.updateUI(stats);
        }
    },

    setupEventListeners: function() {
        console.log('Setting up dashboard event listeners...');
        
        // Quick action buttons
        document.querySelectorAll('.quick-action').forEach(button => {
            button.addEventListener('click', function() {
                const action = this.dataset.action;
                window.dashboard.handleQuickAction(action);
            });
        });
    },

    handleQuickAction: function(action) {
        console.log('Quick action:', action);
        
        switch(action) {
            case 'attendance':
                window.goToAttendance();
                break;
            case 'reports':
                window.goToReports();
                break;
            case 'maintenance':
                window.goToMaintenance();
                break;
            case 'settings':
                window.goToSettings();
                break;
        }
    },

    updateUI: function(stats) {
        // This function would update the dashboard UI with stats
        console.log('Updating dashboard UI with stats:', stats);
    }
};

// Auto-initialize if on dashboard page
if (window.location.pathname.includes('dashboard.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        window.dashboard.init();
    });
}
