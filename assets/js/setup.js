// assets/js/setup.js - ES6 Module Version
import { Utils, Storage } from './utils.js';

export class SetupModule {
    constructor(app) {
        this.app = app;
    }

    async init() {
        console.log('⚙️ SetupModule initialized');
        this.loadFormData();
        this.setupEventListeners();
        return true;
    }

    loadFormData() {
        // Load saved setup data
        const savedData = Storage.get('setup_data');
        
        if (savedData) {
            console.log('Found saved setup data:', savedData);
            this.populateForm(savedData);
        }
    }

    populateForm(data) {
        // Populate form fields with saved data
        Object.keys(data).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = data[key];
            }
        });
    }

    setupEventListeners() {
        console.log('Setting up setup page event listeners...');
        
        const setupForm = document.getElementById('setup-form');
        if (setupForm) {
            setupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSetup(new FormData(setupForm));
            });
        }

        // Quick setup buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-setup-action]')) {
                const action = e.target.getAttribute('data-setup-action');
                this.handleSetupAction(action);
            }
        });
    }

    handleSetupAction(action) {
        switch(action) {
            case 'demo-setup':
                this.setupDemoData();
                break;
            case 'reset-setup':
                this.resetSetup();
                break;
            case 'export-setup':
                this.exportSetup();
                break;
            case 'import-setup':
                this.importSetup();
                break;
        }
    }

    setupDemoData() {
        const demoData = {
            schoolName: 'Demo Academy',
            schoolYear: '2024-2025',
            semester: 'Spring',
            numberOfTerms: 3,
            defaultClassSize: 25,
            attendanceThreshold: 75,
            gradingScale: 'Percentage',
            teacherName: 'Demo Teacher',
            teacherEmail: 'demo@school.edu',
            setupComplete: true
        };

        this.populateForm(demoData);
        this.showNotification('Demo data loaded', 'info');
    }

    async saveSetup(formData) {
        console.log('Saving setup data...');
        
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        // Mark as complete
        data.setupComplete = true;
        data.setupDate = new Date().toISOString();
        
        try {
            Storage.set('setup_data', data);
            
            // Also update app state
            if (this.app) {
                this.app.state.settings = { ...this.app.state.settings, ...data };
            }
            
            this.showNotification('Setup saved successfully!', 'success');
            
            // Redirect to dashboard after setup
            setTimeout(() => {
                if (this.app && this.app.goToDashboard) {
                    this.app.goToDashboard();
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1500);
            
            return true;
        } catch (error) {
            console.error('Error saving setup:', error);
            this.showNotification('Failed to save setup: ' + error.message, 'error');
            return false;
        }
    }

    resetSetup() {
        if (confirm('Are you sure you want to reset all setup data? This cannot be undone.')) {
            Storage.remove('setup_data');
            document.getElementById('setup-form')?.reset();
            this.showNotification('Setup data reset', 'info');
        }
    }

    exportSetup() {
        const setupData = Storage.get('setup_data');
        if (!setupData) {
            this.showNotification('No setup data to export', 'warning');
            return;
        }
        
        const dataStr = JSON.stringify(setupData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'attendance-setup.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('Setup data exported', 'success');
    }

    importSetup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    Storage.set('setup_data', data);
                    this.populateForm(data);
                    this.showNotification('Setup data imported successfully', 'success');
                } catch (error) {
                    this.showNotification('Invalid setup file: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    showNotification(message, type = 'info') {
        // Use app's notification system if available
        if (this.app && this.app.showNotification) {
            this.app.showNotification(message, type);
        } else {
            Utils.showToast(message, type);
        }
    }

    // Helper methods for specific setup sections
    validateSetupForm() {
        const requiredFields = [
            'schoolName',
            'schoolYear',
            'teacherName',
            'teacherEmail'
        ];
        
        let isValid = true;
        const errors = [];
        
        requiredFields.forEach(field => {
            const element = document.getElementById(field);
            if (element && !element.value.trim()) {
                isValid = false;
                errors.push(`${field} is required`);
                element.classList.add('error');
            } else if (element) {
                element.classList.remove('error');
            }
        });
        
        return { isValid, errors };
    }

    getSetupSummary() {
        const data = Storage.get('setup_data');
        if (!data) return null;
        
        return {
            school: data.schoolName || 'Not set',
            year: data.schoolYear || 'Not set',
            teacher: data.teacherName || 'Not set',
            setupDate: data.setupDate ? new Date(data.setupDate).toLocaleDateString() : 'Not set',
            status: data.setupComplete ? 'Complete' : 'Incomplete'
        };
    }
}

// For backward compatibility during transition
if (typeof window !== 'undefined' && !window.SetupModule) {
    window.SetupModule = SetupModule;
}
