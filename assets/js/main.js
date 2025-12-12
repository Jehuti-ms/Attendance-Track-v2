import AttendanceApp from './attendance-app.js';

class MainApp {
    constructor() {
        this.app = null;
        this.init();
    }

    async init() {
        try {
            // Initialize the main application
            this.app = new AttendanceApp();
            
            // Make app globally available for debugging
            window.attendanceApp = this.app;
            
            console.log('Attendance Track v2 initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            
            // Show error toast
            const toastContainer = document.getElementById('toast-container');
            if (toastContainer) {
                toastContainer.innerHTML = `
                    <div class="toast error">
                        <span>Failed to initialize application. Please refresh the page.</span>
                        <button class="toast-close">✕</button>
                    </div>
                `;
            }
        }
    }
}

// Initialize when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mainApp = new MainApp();
    });
} else {
    window.mainApp = new MainApp();
}

// Export for module usage
export default MainApp;
