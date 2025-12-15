import { Utils, Storage } from './utils.js';

export class AuthModule {
    constructor(app) {
        this.app = app;
    }

    async init() {
        // Check for existing session
        const savedUser = Storage.get('gams_user');
        
        if (savedUser) {
            this.app.state.currentUser = savedUser;
            await this.app.navigateTo('dashboard');
        } else {
            await this.app.navigateTo('login');
        }

        // Setup login event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('#google-signin')) {
                this.handleLogin('teacher');
            } else if (e.target.matches('#demo-login')) {
                this.handleLogin('demo');
            }
        });
    }

    async handleLogin(role) {
        try {
            // Simulate login process
            const user = {
                id: Utils.generateId(),
                name: role === 'teacher' ? 'Demo Teacher' : 'Demo User',
                email: `${role}@gams.edu`,
                role: role,
                avatar: role === 'teacher' ? '👨‍🏫' : '👤',
                loginTime: new Date().toISOString()
            };

            // Update app state
            this.app.state.currentUser = user;
            Storage.set('gams_user', user);

            // Show success message
            this.app.showToast(`Welcome ${user.name}!`, 'success');

            // Navigate to dashboard
            await this.app.navigateTo('dashboard');

            // Try to sync data if online
            if (this.app.state.settings.webAppUrl) {
                setTimeout(() => {
                    this.app.modules.settings.testConnection();
                }, 1000);
            }

            return user;
        } catch (error) {
            console.error('Login error:', error);
            this.app.showToast('Login failed. Please try again.', 'error');
            throw error;
        }
    }

    logout() {
        // Save any pending data
        if (this.app.modules.attendance) {
            this.app.modules.attendance.saveSessionAttendance();
        }

        // Clear user session
        this.app.state.currentUser = null;
        Storage.remove('gams_user');

        // Show logout message
        this.app.showToast('Successfully logged out', 'success');

        // Navigate to login page
        this.app.navigateTo('login');
    }

    async checkSession() {
        const user = Storage.get('gams_user');
        
        if (!user) {
            this.logout();
            return false;
        }

        // Check if session is expired (24 hours)
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
            this.app.showToast('Session expired. Please login again.', 'warning');
            this.logout();
            return false;
        }

        return true;
    }

    async changePassword(oldPassword, newPassword) {
        // In a real app, this would call an API
        // For demo purposes, we'll simulate
        return new Promise((resolve) => {
            setTimeout(() => {
                this.app.showToast('Password changed successfully', 'success');
                resolve(true);
            }, 1000);
        });
    }

    async resetPassword(email) {
        // In a real app, this would call an API
        return new Promise((resolve) => {
            setTimeout(() => {
                this.app.showToast(`Password reset instructions sent to ${email}`, 'info');
                resolve(true);
            }, 1000);
        });
    }

    getCurrentUser() {
        return this.app.state.currentUser;
    }

    hasPermission(permission) {
        const user = this.app.state.currentUser;
        
        if (!user) return false;

        const permissions = {
            teacher: [
                'view_dashboard',
                'take_attendance',
                'view_reports',
                'export_data',
                'manage_classes'
            ],
            demo: [
                'view_dashboard',
                'take_attendance',
                'view_reports'
            ],
            admin: [
                'view_dashboard',
                'take_attendance',
                'view_reports',
                'export_data',
                'manage_classes',
                'manage_users',
                'system_settings'
            ]
        };

        return permissions[user.role]?.includes(permission) || false;
    }
}

export default AuthModule;
