export class AuthModule {
    constructor(app) {
        this.app = app;
    }

    async init() {
        console.log('🔐 AuthModule initialized');
        
        // Check if user is logged in
        const user = Storage.get('attendance_user');
        if (user) {
            this.app.state.currentUser = user;
            console.log('User found:', user.name);
        }
        
        // Setup login form if on login page
        if (this.app.state.currentPage === 'login') {
            this.setupLoginForm();
        }
    }

    setupLoginForm() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login({
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                });
            });
        }
    }

    async login(credentials) {
        try {
            // Demo authentication
            const user = {
                id: Utils.generateId(),
                name: credentials.email.split('@')[0],
                email: credentials.email,
                role: 'teacher',
                school: 'Demo Academy',
                demo: true
            };
            
            Storage.set('attendance_user', user);
            this.app.state.currentUser = user;
            
            Utils.showToast('Login successful!', 'success');
            await this.app.navigateTo('dashboard');
            
        } catch (error) {
            console.error('Login error:', error);
            Utils.showToast('Login failed', 'error');
        }
    }

    logout() {
        Storage.clear('attendance_user');
        Storage.clear('demo_mode');
        this.app.state.currentUser = null;
        
        Utils.showToast('Logged out successfully', 'success');
        this.app.navigateTo('login');
    }
}
