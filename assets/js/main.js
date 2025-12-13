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
// main.js - Debug visibility
console.log("🎯 main.js loaded!");

// Check if elements are visible
function checkVisibility() {
    console.log("=== VISIBILITY CHECK ===");
    
    const elements = [
        { id: 'header-container', name: 'Header' },
        { id: 'app-container', name: 'Main Content' },
        { id: 'toast-container', name: 'Toast' },
        { id: 'modal-container', name: 'Modal' }
    ];
    
    elements.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            const style = window.getComputedStyle(el);
            console.log(`${item.name}:`, {
                exists: true,
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                width: el.offsetWidth,
                height: el.offsetHeight,
                position: style.position
            });
        } else {
            console.log(`${item.name}: ❌ Element not found`);
        }
    });
}

// Run immediately
document.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM ready");
    checkVisibility();
    
    // Force everything to be visible
    forceVisibility();
});

// Make everything visible
function forceVisibility() {
    console.log("🔧 Forcing visibility...");
    
    // Make body visible
    document.body.style.cssText = `
        visibility: visible !important;
        opacity: 1 !important;
        display: block !important;
        background: #f5f5f5 !important;
    `;
    
    // Make all containers visible
    const containers = ['header-container', 'app-container', 'toast-container', 'modal-container'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: relative !important;
                z-index: 1 !important;
            `;
        }
    });
    
    // Add content to app-container
    const appContainer = document.getElementById('app-container');
    if (appContainer && appContainer.innerHTML.trim() === '') {
        appContainer.innerHTML = `
            <div style="
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            ">
                <h1 style="color: #405dde; text-align: center;">Attendance Track v2</h1>
                <p style="text-align: center; color: #666;">Complete School Attendance System</p>
                
                <div style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <h3>Getting Started</h3>
                    <p>This is your main application dashboard. To begin:</p>
                    <ol>
                        <li>Set up your classes and students</li>
                        <li>Start taking attendance</li>
                        <li>Generate reports</li>
                        <li>Export data as needed</li>
                    </ol>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button onclick="startApp()" style="
                        padding: 12px 30px;
                        background: #405dde;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        margin: 10px;
                    ">
                        Start Setup
                    </button>
                    <button onclick="goToAttendance()" style="
                        padding: 12px 30px;
                        background: #28a745;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        margin: 10px;
                    ">
                        Take Attendance
                    </button>
                </div>
            </div>
        `;
    }
    
    console.log("✅ Visibility forced");
}

// Global functions
window.startApp = function() {
    window.location.href = 'pages/setup.html';
};

window.goToAttendance = function() {
    window.location.href = 'pages/attendance.html';
};

// Check after a delay
setTimeout(checkVisibility, 1000);
