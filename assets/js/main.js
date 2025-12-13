// utils.js - Basic utility functions
export function showNotification(message, type = 'info') {
    console.log(`Notification [${type}]: ${message}`);
    
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

export async function checkAuth() {
    try {
        const user = localStorage.getItem('user');
        return !!user;
    } catch (error) {
        console.warn('Auth check failed:', error);
        return false;
    }
}

export async function loadComponent(url, containerId) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Failed to load component ${url}:`, error);
        return false;
    }
}

export function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
