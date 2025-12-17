// attendance-app.js - COMPLETE FIXED VERSION with PROPER AUTH FLOW
// Clear old caches
if ('serviceWorker' in navigator && 'caches' in window) {
    caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
            if (cacheName.startsWith('attendance-cache-')) {
                caches.delete(cacheName);
                console.log('🗑️ Cleared cache:', cacheName);
            }
        });
    });
}

import { Storage, Utils } from './utils.js';

class AttendanceApp {
    constructor() {
        console.log('🎯 AttendanceApp constructor');
        
        this.state = {
            currentUser: null,
            currentPage: this.getCurrentPage(),
            isOnline: navigator.onLine,
            settings: Storage.get('app_settings', {})
        };

        this.user = null;
        this.firebaseAvailable = false;
        
        // Don't auto-init - wait for DOM
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page.replace('.html', '').split('?')[0];
    }

    getBasePath() {
        const pathname = window.location.pathname;
        
        // Handle different deployment scenarios
        if (pathname.includes('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        } else if (pathname === '/Attendance-Track-v2' || pathname.endsWith('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        }
        return '/';
    }

    // ==================== LOGIN HANDLER ====================
    async handleLogin(email, password, rememberMe = false) {
        console.log('🔐 Handling login:', email);
        
        try {
            // Validate
            if (!email || !password) {
                this.showError('Please enter email and password');
                return;
            }
            
            // Check if user exists and redirect if already logged in
            const existingUser = Storage.get('attendance_user');
            if (existingUser && existingUser.email === email) {
                console.log('User already logged in, redirecting...');
                this.redirectTo('dashboard.html');
                return;
            }
            
            // Create user object
            const user = {
                id: 'user_' + Date.now(),
                email: email,
                name: email.split('@')[0],
                role: 'teacher',
                school: 'My School',
                lastLogin: new Date().toISOString()
            };
            
            // Save to storage
            Storage.set('attendance_user', user);
            
            // Remember email if requested
            if (rememberMe) {
                localStorage.setItem('remember_email', email);
            } else {
                localStorage.removeItem('remember_email');
            }
            
            // Update app state
            this.user = user;
            this.state.currentUser = user;
            
            this.showToast('Login successful!', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                this.redirectTo('dashboard.html');
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed: ' + error.message);
        }
    }

    // ==================== LOGOUT HANDLER ====================
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            Storage.remove('attendance_user');
            this.user = null;
            this.state.currentUser = null;
            
            this.showToast('Logged out successfully', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        }
    }
    
    // ==================== SIGNUP HANDLER ====================
    async handleSignup(name, email, password, role, school, termsAccepted) {
        console.log('📝 Handling signup:', email);
        
        try {
            // Validate
            if (!name || !email || !password) {
                this.showError('Please fill all required fields');
                return;
            }
            
            if (!termsAccepted) {
                this.showError('You must accept the terms');
                return;
            }
            
            // Create user object
            const user = {
                id: 'user_' + Date.now(),
                name: name,
                email: email,
                role: role || 'teacher',
                school: school || 'My School',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            
            // Save to storage
            Storage.set('attendance_user', user);
            
            // Update app state
            this.user = user;
            this.state.currentUser = user;
            
            this.showToast('Account created successfully!', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                this.redirectTo('dashboard.html');
            }, 1500);
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('Signup failed: ' + error.message);
        }
    }

    // ==================== DEMO MODE ====================
    startDemoMode() {
        console.log('🎮 Starting demo mode');
        
        const demoUser = {
            id: 'demo_' + Date.now(),
            email: 'demo@attendance-track.app',
            name: 'Demo Teacher',
            role: 'teacher',
            school: 'Demo Academy',
            demo: true,
            lastLogin: new Date().toISOString()
        };
        
        Storage.set('attendance_user', demoUser);
        this.user = demoUser;
        this.state.currentUser = demoUser;
        
        this.showToast('Demo mode activated!', 'success');
        
        setTimeout(() => {
            this.redirectTo('dashboard.html');
        }, 1000);
    }

    // ==================== REDIRECT HELPER ====================
    redirectTo(page) {
        console.log('🔀 Redirecting to:', page);
        window.location.href = page;
    }

    // ==================== APP INITIALIZATION ====================
    async init() {
        console.log('🚀 Initializing AttendanceApp...');
        console.log('=== INIT DEBUG ===');
        console.log('Current page:', this.state.currentPage);
        console.log('Pathname:', window.location.pathname);
        console.log('Full URL:', window.location.href);
        console.log('=== END DEBUG ===');
        
        try {
            // Perform auth check
            await this.checkAuth();
            
            // Load appropriate page content
            await this.loadPageContent();
            
            // Initialize service worker
            await this.initServiceWorker();
            
            console.log('✅ AttendanceApp initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError(error.message || 'Failed to initialize app');
        }
    }

    // ==================== AUTH CHECK ====================
    async checkAuth() {
        console.log('🔐 Performing auth check...');
        
        // Get user from storage
        const storedUser = Storage.get('attendance_user');
        console.log('Raw user from localStorage:', storedUser);
        
        if (storedUser) {
            this.user = storedUser;
            this.state.currentUser = storedUser;
            console.log('✅ User authenticated:', storedUser.email);
            return true;
        }
        
        console.log('⚠️ No user found in storage');
        return false;
    }

    // ==================== PAGE LOADING ====================
    async loadPageContent() {
        const page = this.state.currentPage;
        console.log('📄 Loading content for:', page);
        
        try {
            const container = document.getElementById('main-content');
            if (!container) {
                console.error('Main content container not found');
                return;
            }
            
            // Check if page requires auth
            const publicPages = ['index', 'login', 'signup'];
            const requiresAuth = !publicPages.includes(page);
            
            // Redirect logic
            if (requiresAuth && !this.user) {
                console.log('🔒 Redirecting to login (protected page, no user)');
                this.redirectTo('index.html');
                return;
            }
            
            // Load page content
            switch(page) {
                case 'index':
                case 'login':
                    if (this.user) {
                        this.redirectTo('dashboard.html');
                        return;
                    }
                    await this.loadLoginContent(container);
                    break;
                case 'signup':
                    if (this.user) {
                        this.redirectTo('dashboard.html');
                        return;
                    }
                    await this.loadSignupContent(container);
                    break;
                case 'dashboard':
                    if (!this.user) {
                        this.redirectTo('index.html');
                        return;
                    }
                    await this.loadDashboardContent(container);
                    break;
                case 'attendance':
                    if (!this.user) {
                        this.redirectTo('index.html');
                        return;
                    }
                    await this.loadAttendanceContent(container);
                    break;
                case 'reports':
                    if (!this.user) {
                        this.redirectTo('index.html');
                        return;
                    }
                    await this.loadReportsContent(container);
                    break;
                case 'setup':
                    if (!this.user) {
                        this.redirectTo('index.html');
                        return;
                    }
                    await this.loadSetupContent(container);
                    break;
                default:
                    console.log('📄 Unknown page, using dashboard as default');
                    if (this.user) {
                        this.redirectTo('dashboard.html');
                    } else {
                        this.redirectTo('index.html');
                    }
            }
            
        } catch (error) {
            console.error('❌ Error loading page content:', error);
            this.showError('Failed to load page: ' + error.message);
        }
    }

    // ==================== SERVICE WORKER ====================
    async initServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./service-worker.js');
                console.log('✅ Service Worker registered:', registration.scope);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 New service worker found');
                    
                    newWorker.addEventListener('statechange', () => {
                        console.log('📦 Service Worker state:', newWorker.state);
                    });
                });
                
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }
    }

    // ==================== ERROR HANDLING ====================
    showError(message) {
        console.error('❌ Error:', message);
        
        // Remove existing errors
        const existingErrors = document.querySelectorAll('.app-error');
        existingErrors.forEach(error => error.remove());
        
        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'app-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // ==================== TOAST NOTIFICATIONS ====================
    showToast(message, type = 'info') {
        // Use Utils.showToast if available
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(message, type);
            return;
        }
        
        // Fallback implementation
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // ==================== PAGE CONTENT METHODS ====================

    // Login Page
    async loadLoginContent(container) {
        container.innerHTML = `
            <!-- Your login page HTML -->
            <h2>Login Page</h2>
        `;
    }

    // Signup Page
    async loadSignupContent(container) {
        container.innerHTML = `
            <!-- Your signup page HTML -->
            <h2>Signup Page</h2>
        `;
    }

    // Dashboard Page
    async loadDashboardContent(container) {
        container.innerHTML = `
            <!-- Your dashboard page HTML -->
            <h2>Dashboard Page</h2>
        `;
    }

    // Attendance Page
    async loadAttendanceContent(container) {
        container.innerHTML = `
            <!-- Your attendance page HTML -->
            <h2>Attendance Page</h2>
        `;
    }

    // Reports Page
    async loadReportsContent(container) {
        container.innerHTML = `
            <!-- Your reports page HTML -->
            <h2>Reports Page</h2>
        `;
    }

    // ==================== SETUP PAGE METHODS ====================

    // Setup Page Content
    async loadSetupContent(container) {
        if (!this.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="setup-page">
                <!-- Your setup page HTML from earlier -->
                <h2>Setup Page</h2>
                <div class="setup-tabs">
                    <button class="tab-btn active" data-tab="classes">Classes</button>
                    <button class="tab-btn" data-tab="students">Students</button>
                    <button class="tab-btn" data-tab="import">Import</button>
                    <button class="tab-btn" data-tab="settings">Settings</button>
                </div>
                
                <div class="tab-content active" id="classes-tab">
                    <div class="section-title">Class Management</div>
                    <div class="setup-form">
                        <input type="text" id="className" placeholder="Class Name">
                        <input type="text" id="classCode" placeholder="Class Code">
                        <button id="save-class">Save Class</button>
                        <button id="clear-class">Clear</button>
                    </div>
                    <div id="classes-list"></div>
                </div>
                
                <div class="tab-content" id="students-tab">
                    <div class="section-title">Student Management</div>
                    <div class="setup-form">
                        <input type="text" id="firstName" placeholder="First Name">
                        <input type="text" id="lastName" placeholder="Last Name">
                        <select id="studentClass"></select>
                        <button id="save-student">Save Student</button>
                        <button id="clear-student">Clear</button>
                    </div>
                    <div id="students-list"></div>
                </div>
                
                <!-- Other tabs... -->
            </div>
        `;
        
        // Initialize the setup page
        this.initializeSetupPage();
    }

    // Initialize Setup Page
    initializeSetupPage() {
        console.log('⚙️ Initializing setup page...');
        const app = this;
        
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                
                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show active tab content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabId}-tab`) {
                        content.classList.add('active');
                    }
                });
                
                // Load data for active tab
                if (tabId === 'classes') {
                    app.loadClassesList();
                } else if (tabId === 'students') {
                    app.loadStudentsList();
                    app.populateClassDropdown();
                }
            });
        });
        
        // Class management
        const saveClassBtn = document.getElementById('save-class');
        const clearClassBtn = document.getElementById('clear-class');
        
        if (saveClassBtn) {
            saveClassBtn.addEventListener('click', () => app.saveClass());
        }
        
        if (clearClassBtn) {
            clearClassBtn.addEventListener('click', () => app.clearClassForm());
        }
        
        // Student management
        const saveStudentBtn = document.getElementById('save-student');
        const clearStudentBtn = document.getElementById('clear-student');
        
        if (saveStudentBtn) {
            saveStudentBtn.addEventListener('click', () => app.saveStudent());
        }
        
        if (clearStudentBtn) {
            clearStudentBtn.addEventListener('click', () => app.clearStudentForm());
        }
        
        // Load initial data
        app.loadClassesList();
        app.loadStudentsList();
        app.populateClassDropdown();
        app.loadSystemSettings();
    }

    // CLASS MANAGEMENT METHODS
    saveClass() {
        console.log('💾 Saving class...');
        const className = document.getElementById('className')?.value;
        const classCode = document.getElementById('classCode')?.value;
        const yearGroup = document.getElementById('yearGroup')?.value;
        const subject = document.getElementById('subject')?.value;
        
        if (!className || !classCode) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const classes = Storage.get('classes') || [];
        
        // Check for duplicate class code
        if (classes.some(c => c.code === classCode)) {
            this.showToast('Class code already exists', 'error');
            return;
        }
        
        const newClass = {
            id: `class_${Date.now()}`,
            name: className,
            code: classCode,
            yearGroup: yearGroup || null,
            subject: subject || null,
            createdAt: new Date().toISOString(),
            teacherId: this.user?.id
        };
        
        classes.push(newClass);
        Storage.set('classes', classes);
        
        this.showToast('Class saved successfully!', 'success');
        this.clearClassForm();
        this.loadClassesList();
        this.populateClassDropdown();
    }

    clearClassForm() {
        const className = document.getElementById('className');
        const classCode = document.getElementById('classCode');
        const yearGroup = document.getElementById('yearGroup');
        const subject = document.getElementById('subject');
        
        if (className) className.value = '';
        if (classCode) classCode.value = '';
        if (yearGroup) yearGroup.value = '';
        if (subject) subject.value = '';
    }

    loadClassesList() {
        console.log('📋 Loading classes list...');
        const classesList = document.getElementById('classes-list');
        if (!classesList) {
            console.error('classes-list element not found');
            return;
        }
        
        const classes = Storage.get('classes') || [];
        const students = Storage.get('students') || [];
        
        console.log('Found classes:', classes);
        
        if (classes.length === 0) {
            classesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="empty-text">No classes added yet</div>
                    <div class="empty-hint">Add your first class using the form above</div>
                </div>
            `;
            return;
        }
        
        classesList.innerHTML = classes.map(cls => {
            const studentCount = students.filter(s => s.classId === cls.id).length;
            
            return `
                <div class="class-card">
                    <div class="class-header">
                        <div class="class-title">${cls.name}</div>
                        <div class="class-code">${cls.code}</div>
                    </div>
                    <div class="class-info">
                        <div class="info-item">
                            <span class="info-label">Year Group</span>
                            <span class="info-value">${cls.yearGroup ? 'Year ' + cls.yearGroup : 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Subject</span>
                            <span class="info-value">${cls.subject || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Students</span>
                            <span class="info-value">${studentCount}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Created</span>
                            <span class="info-value">${new Date(cls.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="class-actions">
                        <button class="action-btn save-btn" onclick="window.app.editClass('${cls.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn delete-btn" onclick="window.app.deleteClass('${cls.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    editClass(classId) {
        const classes = Storage.get('classes') || [];
        const cls = classes.find(c => c.id === classId);
        
        if (!cls) {
            this.showToast('Class not found', 'error');
            return;
        }
        
        // Fill form with class data
        const className = document.getElementById('className');
        const classCode = document.getElementById('classCode');
        const yearGroup = document.getElementById('yearGroup');
        const subject = document.getElementById('subject');
        
        if (className) className.value = cls.name;
        if (classCode) classCode.value = cls.code;
        if (yearGroup) yearGroup.value = cls.yearGroup || '';
        if (subject) subject.value = cls.subject || '';
        
        // Update save button to edit mode
        const saveBtn = document.getElementById('save-class');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Class';
            saveBtn.dataset.editId = classId;
            saveBtn.onclick = () => this.updateClass(classId);
        }
    }

    updateClass(classId) {
        const className = document.getElementById('className').value;
        const classCode = document.getElementById('classCode').value;
        const yearGroup = document.getElementById('yearGroup').value;
        const subject = document.getElementById('subject').value;
        
        if (!className || !classCode) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const classes = Storage.get('classes') || [];
        const classIndex = classes.findIndex(c => c.id === classId);
        
        if (classIndex === -1) {
            this.showToast('Class not found', 'error');
            return;
        }
        
        // Check for duplicate class code (excluding current class)
        if (classes.some(c => c.code === classCode && c.id !== classId)) {
            this.showToast('Class code already exists', 'error');
            return;
        }
        
        classes[classIndex] = {
            ...classes[classIndex],
            name: className,
            code: classCode,
            yearGroup: yearGroup || null,
            subject: subject || null,
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('classes', classes);
        this.showToast('Class updated successfully!', 'success');
        
        // Reset form and button
        this.clearClassForm();
        const saveBtn = document.getElementById('save-class');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Class';
            saveBtn.dataset.editId = '';
            saveBtn.onclick = () => this.saveClass();
        }
        
        this.loadClassesList();
        this.populateClassDropdown();
    }

    deleteClass(classId) {
        if (!confirm('Delete this class? This will also remove all students from this class.')) {
            return;
        }
        
        const classes = Storage.get('classes') || [];
        const students = Storage.get('students') || [];
        
        // Remove class
        const updatedClasses = classes.filter(c => c.id !== classId);
        
        // Unassign students from this class
        const updatedStudents = students.map(student => {
            if (student.classId === classId) {
                return { ...student, classId: null };
            }
            return student;
        });
        
        Storage.set('classes', updatedClasses);
        Storage.set('students', updatedStudents);
        
        this.showToast('Class deleted successfully', 'info');
        this.loadClassesList();
        this.loadStudentsList();
        this.populateClassDropdown();
    }

    // STUDENT MANAGEMENT METHODS
    saveStudent() {
        console.log('💾 Saving student...');
        const firstName = document.getElementById('firstName')?.value;
        const lastName = document.getElementById('lastName')?.value;
        const studentId = document.getElementById('studentId')?.value;
        const gender = document.getElementById('gender')?.value;
        const studentClass = document.getElementById('studentClass')?.value;
        
        if (!firstName || !lastName) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const students = Storage.get('students') || [];
        
        // Check for duplicate student ID if provided
        if (studentId && students.some(s => s.studentId === studentId)) {
            this.showToast('Student ID already exists', 'error');
            return;
        }
        
        const newStudent = {
            id: `student_${Date.now()}`,
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`,
            studentId: studentId || `STU${Date.now().toString().slice(-6)}`,
            gender: gender || null,
            classId: studentClass || null,
            createdAt: new Date().toISOString(),
            enrollmentDate: new Date().toISOString()
        };
        
        students.push(newStudent);
        Storage.set('students', students);
        
        this.showToast('Student saved successfully!', 'success');
        this.clearStudentForm();
        this.loadStudentsList();
    }

    clearStudentForm() {
        const firstName = document.getElementById('firstName');
        const lastName = document.getElementById('lastName');
        const studentId = document.getElementById('studentId');
        const gender = document.getElementById('gender');
        const studentClass = document.getElementById('studentClass');
        
        if (firstName) firstName.value = '';
        if (lastName) lastName.value = '';
        if (studentId) studentId.value = '';
        if (gender) gender.value = '';
        if (studentClass) studentClass.value = '';
    }

    loadStudentsList() {
        console.log('📋 Loading students list...');
        const studentsList = document.getElementById('students-list');
        if (!studentsList) {
            console.error('students-list element not found');
            return;
        }
        
        const students = Storage.get('students') || [];
        const classes = Storage.get('classes') || [];
        
        console.log('Found students:', students);
        
        if (students.length === 0) {
            studentsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="empty-text">No students added yet</div>
                    <div class="empty-hint">Add your first student using the form above</div>
                </div>
            `;
            return;
        }
        
        studentsList.innerHTML = students.map(student => {
            const studentClass = classes.find(c => c.id === student.classId);
            const className = studentClass ? studentClass.name : 'Unassigned';
            
            return `
                <div class="student-card">
                    <div class="student-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="student-info">
                        <div class="student-name">${student.fullName}</div>
                        <div class="student-details">
                            <span class="detail-item">
                                <i class="fas fa-id-card"></i> ${student.studentId}
                            </span>
                            <span class="detail-item">
                                <i class="fas fa-chalkboard-teacher"></i> ${className}
                            </span>
                            <span class="detail-item">
                                <i class="fas fa-${student.gender === 'female' ? 'venus' : student.gender === 'male' ? 'mars' : 'genderless'}"></i>
                                ${student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'Not set'}
                            </span>
                            <span class="detail-item">
                                <i class="fas fa-calendar-alt"></i>
                                ${new Date(student.enrollmentDate).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <div class="student-actions">
                        <button class="action-btn save-btn" onclick="window.app.editStudent('${student.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn delete-btn" onclick="window.app.deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    populateClassDropdown() {
        const classDropdown = document.getElementById('studentClass');
        if (!classDropdown) return;
        
        const classes = Storage.get('classes') || [];
        
        // Keep the first option (Select Class)
        classDropdown.innerHTML = '<option value="">Select Class</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.name} (${cls.code})`;
            classDropdown.appendChild(option);
        });
    }

    editStudent(studentId) {
        const students = Storage.get('students') || [];
        const student = students.find(s => s.id === studentId);
        
        if (!student) {
            this.showToast('Student not found', 'error');
            return;
        }
        
        // Fill form with student data
        const firstName = document.getElementById('firstName');
        const lastName = document.getElementById('lastName');
        const studentIdInput = document.getElementById('studentId');
        const gender = document.getElementById('gender');
        const studentClass = document.getElementById('studentClass');
        
        if (firstName) firstName.value = student.firstName;
        if (lastName) lastName.value = student.lastName;
        if (studentIdInput) studentIdInput.value = student.studentId;
        if (gender) gender.value = student.gender || '';
        if (studentClass) studentClass.value = student.classId || '';
        
        // Update save button to edit mode
        const saveBtn = document.getElementById('save-student');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Student';
            saveBtn.dataset.editId = studentId;
            saveBtn.onclick = () => this.updateStudent(studentId);
        }
    }

    updateStudent(studentId) {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const studentIdInput = document.getElementById('studentId').value;
        const gender = document.getElementById('gender').value;
        const studentClass = document.getElementById('studentClass').value;
        
        if (!firstName || !lastName) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const students = Storage.get('students') || [];
        const studentIndex = students.findIndex(s => s.id === studentId);
        
        if (studentIndex === -1) {
            this.showToast('Student not found', 'error');
            return;
        }
        
        // Check for duplicate student ID (excluding current student)
        if (studentIdInput && students.some(s => s.studentId === studentIdInput && s.id !== studentId)) {
            this.showToast('Student ID already exists', 'error');
            return;
        }
        
        students[studentIndex] = {
            ...students[studentIndex],
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`,
            studentId: studentIdInput || students[studentIndex].studentId,
            gender: gender || null,
            classId: studentClass || null,
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('students', students);
        this.showToast('Student updated successfully!', 'success');
        
        // Reset form and button
        this.clearStudentForm();
        const saveBtn = document.getElementById('save-student');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Student';
            saveBtn.dataset.editId = '';
            saveBtn.onclick = () => this.saveStudent();
        }
        
        this.loadStudentsList();
    }

    deleteStudent(studentId) {
        if (!confirm('Delete this student? This will also remove all attendance records for this student.')) {
            return;
        }
        
        const students = Storage.get('students') || [];
        const attendance = Storage.get('attendance') || [];
        
        // Remove student
        const updatedStudents = students.filter(s => s.id !== studentId);
        
        // Remove attendance records for this student
        const updatedAttendance = attendance.filter(a => a.studentId !== studentId);
        
        Storage.set('students', updatedStudents);
        Storage.set('attendance', updatedAttendance);
        
        this.showToast('Student deleted successfully', 'info');
        this.loadStudentsList();
    }

    // SYSTEM SETTINGS METHODS
    loadSystemSettings() {
        console.log('⚙️ Loading system settings...');
        const settings = Storage.get('systemSettings') || {
            schoolName: 'My School',
            currentTerm: '1',
            academicYear: new Date().getFullYear().toString(),
            schoolType: 'secondary',
            attendanceSessions: {
                am: true,
                pm: true
            }
        };
        
        const schoolNameInput = document.getElementById('schoolName');
        const currentTermSelect = document.getElementById('currentTerm');
        const academicYearInput = document.getElementById('academicYear');
        const schoolTypeSelect = document.getElementById('schoolType');
        const amSessionCheckbox = document.getElementById('am-session');
        const pmSessionCheckbox = document.getElementById('pm-session');
        
        if (schoolNameInput) schoolNameInput.value = settings.schoolName;
        if (currentTermSelect) currentTermSelect.value = settings.currentTerm;
        if (academicYearInput) academicYearInput.value = settings.academicYear;
        if (schoolTypeSelect) schoolTypeSelect.value = settings.schoolType || 'secondary';
        if (amSessionCheckbox) amSessionCheckbox.checked = settings.attendanceSessions?.am !== false;
        if (pmSessionCheckbox) pmSessionCheckbox.checked = settings.attendanceSessions?.pm !== false;
    }

    saveSystemSettings() {
        const schoolName = document.getElementById('schoolName')?.value;
        const currentTerm = document.getElementById('currentTerm')?.value;
        const academicYear = document.getElementById('academicYear')?.value;
        const schoolType = document.getElementById('schoolType')?.value;
        const amSession = document.getElementById('am-session')?.checked;
        const pmSession = document.getElementById('pm-session')?.checked;
        
        const settings = {
            schoolName: schoolName || 'My School',
            currentTerm: currentTerm || '1',
            academicYear: academicYear || new Date().getFullYear().toString(),
            schoolType: schoolType || 'secondary',
            attendanceSessions: {
                am: amSession,
                pm: pmSession
            },
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('systemSettings', settings);
        this.showToast('System settings saved successfully!', 'success');
    }

    resetSystemSettings() {
        const defaultSettings = {
            schoolName: 'My School',
            currentTerm: '1',
            academicYear: new Date().getFullYear().toString(),
            schoolType: 'secondary',
            attendanceSessions: {
                am: true,
                pm: true
            },
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('systemSettings', defaultSettings);
        this.loadSystemSettings();
        this.showToast('Settings reset to defaults', 'info');
    }

    // DATA MANAGEMENT METHODS
    backupData() {
        try {
            const backup = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                data: {
                    classes: Storage.get('classes') || [],
                    students: Storage.get('students') || [],
                    attendance: Storage.get('attendance') || [],
                    systemSettings: Storage.get('systemSettings') || {},
                    users: Storage.get('users') || []
                }
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showToast('Backup downloaded successfully!', 'success');
        } catch (error) {
            this.showToast('Error creating backup: ' + error.message, 'error');
        }
    }

    restoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    
                    if (!backup.data) {
                        throw new Error('Invalid backup file format');
                    }
                    
                    if (confirm('Restoring backup will overwrite all current data. Continue?')) {
                        Storage.set('classes', backup.data.classes || []);
                        Storage.set('students', backup.data.students || []);
                        Storage.set('attendance', backup.data.attendance || []);
                        Storage.set('systemSettings', backup.data.systemSettings || {});
                        Storage.set('users', backup.data.users || []);
                        
                        this.showToast('Data restored successfully!', 'success');
                        
                        // Refresh all lists
                        this.loadClassesList();
                        this.loadStudentsList();
                        this.populateClassDropdown();
                        this.loadSystemSettings();
                    }
                } catch (error) {
                    this.showToast('Error restoring backup: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearAllData() {
        if (confirm('WARNING: This will delete ALL data including classes, students, and attendance records. This action cannot be undone. Continue?')) {
            if (confirm('Are you absolutely sure? Type "DELETE" to confirm.')) {
                const confirmation = prompt('Type DELETE to confirm:');
                if (confirmation === 'DELETE') {
                    // Clear all data except current user
                    const currentUser = this.user;
                    Storage.clear();
                    
                    // Restore current user
                    if (currentUser) {
                        Storage.set('attendance_user', currentUser);
                        this.user = currentUser;
                    }
                    
                    this.showToast('All data has been cleared', 'info');
                    
                    // Refresh all lists
                    this.loadClassesList();
                    this.loadStudentsList();
                    this.populateClassDropdown();
                    this.loadSystemSettings();
                }
            }
        }
    }

    // ADD THESE IMPORT METHODS AS WELL:

    handleFileImport(file) {
        console.log('📁 Handling file import:', file.name);
        const importZone = document.getElementById('import-zone');
        const fileName = document.createElement('div');
        fileName.className = 'import-filename';
        fileName.textContent = `Selected: ${file.name}`;
        
        const existing = importZone.querySelector('.import-filename');
        if (existing) {
            existing.remove();
        }
        
        importZone.appendChild(fileName);
        this.showToast(`File "${file.name}" ready for import`, 'info');
    }

    processImport() {
        console.log('🔄 Processing import...');
        this.showToast('Import functionality coming soon!', 'info');
    }

    downloadTemplate() {
        console.log('📄 Downloading template...');
        this.showToast('Template download coming soon!', 'info');
    }

} // END OF AttendanceApp CLASS

// ==================== GLOBAL INITIALIZATION ====================

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    window.app = new AttendanceApp();
});

// For backward compatibility
if (typeof window !== 'undefined') {
    window.AttendanceApp = AttendanceApp;
}

console.log('✅ attendance-app.js loaded successfully');
