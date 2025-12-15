// assets/js/utils.js - Global namespace version
console.log('🛠️ utils.js loaded');

// Create global utils object
window.utils = window.utils || {
    // Format date to YYYY-MM-DD
    formatDate: function(date = new Date()) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Format time to HH:MM
    formatTime: function(date = new Date()) {
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    // Get day of week
    getDayOfWeek: function(date = new Date()) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    },

    // Generate unique ID
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Save to localStorage
    saveData: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    },

    // Load from localStorage
    loadData: function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    },

    // Clear data
    clearData: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }
};

// Make compatible with main.js notification system
if (!window.showNotification) {
    window.showNotification = function(message, type = 'info') {
        console.log(`Notification [${type}]: ${message}`);
        
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#405dde'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            font-size: 14px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    };
}
