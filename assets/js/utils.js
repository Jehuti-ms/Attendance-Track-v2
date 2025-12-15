// utils.js - ES6 Module with proper Storage class
export class Utils {
    static formatDate(date = new Date()) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static formatTime(date = new Date()) {
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Enhanced notification system
    static showNotification(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        
        // Remove existing notifications
        const existing = document.querySelectorAll('.app-notification');
        existing.forEach(el => el.remove());
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `app-notification notification-${type}`;
        notification.textContent = message;
        
        // Style it
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#2a5298'};
            color: white;
            border-radius: 8px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            font-weight: 500;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Add animations if not present
        if (!document.querySelector('#notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
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
        
        return notification;
    }
    
    // Backward compatible toast method (calls showNotification)
    static showToast(message, type = 'info') {
        return this.showNotification(message, type);
    }
}

// Storage class with all required methods
export class Storage {
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error getting ${key}:`, error);
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error setting ${key}:`, error);
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing ${key}:`, error);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    static has(key) {
        return localStorage.getItem(key) !== null;
    }
}

// For backward compatibility - expose globally
if (typeof window !== 'undefined') {
    window.Utils = Utils;
    window.Storage = Storage;
    window.utils = {
        formatDate: Utils.formatDate,
        formatTime: Utils.formatTime,
        generateId: Utils.generateId,
        showToast: Utils.showToast,
        showNotification: Utils.showNotification,
        saveData: Storage.set,
        loadData: Storage.get,
        clearData: Storage.remove
    };
}

console.log('🛠️ utils.js loaded with enhanced notification system');
