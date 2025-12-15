// attendance-track-v2/assets/js/modules/maintenance.js - HYBRID VERSION
import { Utils, Storage } from './utils.js';

export class MaintenanceModule {
    constructor(app) {
        this.app = app;
        this.terms = [];
        this.settings = {};
        this.backupHistory = [];
        this.initialize();
    }

    async initialize() {
        await this.loadTerms();
        await this.loadSettings();
        await this.loadBackupHistory();
        this.setupEventListeners();
        this.updateBackupStatus();
        this.setupAutoBackup();
    }

    async loadTerms() {
        this.terms = await Storage.get('attendance_terms') || [
            { id: 'term1', name: 'Term 1', startDate: '2024-01-15', endDate: '2024-04-05', weeks: 12, active: true },
            { id: 'term2', name: 'Term 2', startDate: '2024-04-22', endDate: '2024-07-05', weeks: 11, active: true },
            { id: 'term3', name: 'Term 3', startDate: '2024-07-22', endDate: '2024-10-04', weeks: 11, active: true }
        ];
        this.renderTerms();
    }

    async loadSettings() {
        this.settings = await Storage.get('app_settings') || {
            schoolName: 'Greenwood Academy',
            syncEnabled: true,
            autoBackup: true,
            backupInterval: 7,
            emailNotifications: true,
            attendanceThreshold: 75,
            lowAttendanceAlert: true,
            dataRetention: 365 // days
        };
        this.renderSettings();
    }

    async loadBackupHistory() {
        this.backupHistory = await Storage.get('backup_history') || [];
    }

    setupEventListeners() {
        // Terms management
        document.addEventListener('click', (e) => {
            if (e.target.matches('#add-term-btn')) {
                this.addTerm();
            } else if (e.target.matches('#save-terms-btn')) {
                this.saveTerms();
            } else if (e.target.matches('.delete-term-btn')) {
                this.deleteTerm(e.target.closest('.term-card'));
            } else if (e.target.matches('#reset-terms-btn')) {
                this.resetTerms();
            } else if (e.target.matches('#validate-terms-btn')) {
                this.validateTerms();
            }
        });

        // Settings management
        document.addEventListener('click', (e) => {
            if (e.target.matches('#save-settings-btn')) {
                this.saveSettings();
            } else if (e.target.matches('#reset-settings-btn')) {
                this.resetSettings();
            } else if (e.target.matches('#compact-database-btn')) {
                this.compactDatabase();
            }
        });

        // Data management
        document.addEventListener('click', (e) => {
            if (e.target.matches('#export-data-btn')) {
                this.exportAllData();
            } else if (e.target.matches('#import-data-btn')) {
                document.getElementById('import-file').click();
            } else if (e.target.matches('#clear-old-data-btn')) {
                this.cleanupOldData();
            } else if (e.target.matches('#validate-data-btn')) {
                this.validateData();
            } else if (e.target.matches('#backup-now-btn')) {
                this.createBackup();
            } else if (e.target.matches('#system-report-btn')) {
                this.generateSystemReport();
            } else if (e.target.matches('#restore-backup-btn')) {
                this.showBackupRestore();
            }
        });

        // File import
        const importFile = document.getElementById('import-file');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.handleImportFile(e));
        }

        // Real-time validation
        document.addEventListener('input', (e) => {
            if (e.target.matches('.term-name, .term-start, .term-end, .term-weeks')) {
                this.validateTermInput(e.target);
            }
        });

        // Initialize tooltips
        if (typeof bootstrap !== 'undefined') {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    }

    setupAutoBackup() {
        // Check if backup is due
        if (this.settings.autoBackup) {
            const lastBackup = this.backupHistory[0]?.timestamp;
            if (lastBackup) {
                const lastBackupDate = new Date(lastBackup);
                const now = new Date();
                const daysDiff = Math.floor((now - lastBackupDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff >= this.settings.backupInterval) {
                    console.log('Auto-backup triggered');
                    this.createBackup();
                }
            } else {
                // No backup yet, create one
                this.createBackup();
            }
        }
    }

    // ========== TERMS MANAGEMENT ==========
    renderTerms() {
        const container = document.getElementById('terms-container');
        if (!container) return;

        if (this.terms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No terms configured. Add your first term to get started.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.terms.map(term => `
            <div class="term-card ${term.active ? 'active-term' : ''}" data-term-id="${term.id}">
                <div class="term-header">
                    <div class="term-title">
                        <h4>${term.name}</h4>
                        ${term.active ? '<span class="badge bg-success">Active</span>' : ''}
                    </div>
                    <div class="term-dates">
                        <small>${Utils.formatDate(term.startDate)} - ${Utils.formatDate(term.endDate)}</small>
                    </div>
                </div>
                <div class="term-stats">
                    <div class="stat-item">
                        <i class="fas fa-clock"></i>
                        <span>${term.weeks} weeks</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-chart-bar"></i>
                        <span>${this.getTermAttendanceCount(term.id)} records</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-percentage"></i>
                        <span>${this.getTermAverageAttendance(term.id)}% avg</span>
                    </div>
                </div>
                <div class="term-actions">
                    <button class="btn btn-sm btn-outline-primary set-active-btn" 
                            ${term.active ? 'disabled' : ''}
                            data-bs-toggle="tooltip" title="Set as active term">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary edit-term-btn"
                            data-bs-toggle="tooltip" title="Edit term">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-term-btn"
                            data-bs-toggle="tooltip" title="Delete term">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners for new buttons
        container.querySelectorAll('.set-active-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const termCard = e.target.closest('.term-card');
                this.setActiveTerm(termCard.dataset.termId);
            });
        });

        container.querySelectorAll('.edit-term-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const termCard = e.target.closest('.term-card');
                this.editTerm(termCard.dataset.termId);
            });
        });
    }

    getTermAttendanceCount(termId) {
        const attendance = Storage.get('attendance_records') || [];
        return attendance.filter(record => record.termId === termId).length;
    }

    getTermAverageAttendance(termId) {
        const attendance = Storage.get('attendance_records') || [];
        const termRecords = attendance.filter(record => record.termId === termId);
        
        if (termRecords.length === 0) return 0;
        
        const totalPresent = termRecords.reduce((sum, record) => sum + (record.present || 0), 0);
        const totalStudents = termRecords.reduce((sum, record) => {
            const classData = this.getClassById(record.classId);
            return sum + (classData?.studentCount || 0);
        }, 0);
        
        return totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
    }

    getClassById(classId) {
        const classes = Storage.get('classes') || [];
        return classes.find(cls => cls.id === classId);
    }

    addTerm() {
        const modalContent = `
            <div class="modal-form">
                <form id="add-term-form">
                    <div class="form-group">
                        <label for="term-name">Term Name *</label>
                        <input type="text" id="term-name" class="form-control" 
                               placeholder="e.g., Term 1 2024" required>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="term-start">Start Date *</label>
                                <input type="date" id="term-start" class="form-control" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="term-end">End Date *</label>
                                <input type="date" id="term-end" class="form-control" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="term-weeks">Number of Weeks *</label>
                        <input type="number" id="term-weeks" class="form-control" 
                               min="1" max="20" value="12" required>
                        <small class="form-text text-muted">Typically 10-14 weeks per term</small>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="term-active" class="form-check-input">
                        <label class="form-check-label" for="term-active">
                            Set as active term (only one term can be active at a time)
                        </label>
                    </div>
                    
                    <div class="form-group mt-3">
                        <label for="term-description">Description (Optional)</label>
                        <textarea id="term-description" class="form-control" rows="2"
                                  placeholder="Add notes about this term..."></textarea>
                    </div>
                </form>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Add New Term',
            size: 'modal-lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
                { text: 'Add Term', class: 'btn-primary', action: 'submit' }
            ],
            onShow: (modal) => {
                // Set default dates
                const today = new Date();
                const startDate = modal.querySelector('#term-start');
                const endDate = modal.querySelector('#term-end');
                
                startDate.value = Utils.formatDate(today, 'YYYY-MM-DD');
                today.setDate(today.getDate() + 84); // 12 weeks later
                endDate.value = Utils.formatDate(today, 'YYYY-MM-DD');
                
                // Form submission
                modal.querySelector('[data-action="submit"]').addEventListener('click', () => {
                    if (this.saveNewTerm(modal)) {
                        modal.remove();
                    }
                });
            }
        });
    }

    saveNewTerm(modal) {
        const form = modal.querySelector('#add-term-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }

        const termName = modal.querySelector('#term-name').value.trim();
        const startDate = modal.querySelector('#term-start').value;
        const endDate = modal.querySelector('#term-end').value;
        const weeks = parseInt(modal.querySelector('#term-weeks').value);
        const active = modal.querySelector('#term-active').checked;
        const description = modal.querySelector('#term-description')?.value.trim() || '';

        // Validation
        if (new Date(endDate) <= new Date(startDate)) {
            Utils.showAlert('End date must be after start date', 'error');
            return false;
        }

        // Check for overlapping terms
        if (this.hasOverlappingTerm(startDate, endDate)) {
            Utils.showAlert('This term overlaps with an existing term', 'error');
            return false;
        }

        const newTerm = {
            id: `term_${Date.now()}`,
            name: termName,
            startDate: startDate,
            endDate: endDate,
            weeks: weeks,
            active: active,
            description: description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.terms.push(newTerm);
        
        // If this term is set as active, deactivate others
        if (active) {
            this.deactivateOtherTerms(newTerm.id);
        }

        Storage.set('attendance_terms', this.terms);
        this.renderTerms();
        
        Utils.showAlert('Term added successfully', 'success');
        this.app.emitEvent('terms:updated', { terms: this.terms });
        
        return true;
    }

    hasOverlappingTerm(startDate, endDate) {
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);
        
        return this.terms.some(term => {
            const termStart = new Date(term.startDate);
            const termEnd = new Date(term.endDate);
            
            return (newStart <= termEnd && newEnd >= termStart);
        });
    }

    deactivateOtherTerms(activeTermId) {
        this.terms.forEach(term => {
            if (term.id !== activeTermId) {
                term.active = false;
            }
        });
    }

    setActiveTerm(termId) {
        this.terms.forEach(term => {
            term.active = (term.id === termId);
        });
        
        Storage.set('attendance_terms', this.terms);
        this.renderTerms();
        
        Utils.showAlert('Active term updated', 'success');
        this.app.emitEvent('terms:updated', { terms: this.terms });
    }

    editTerm(termId) {
        const term = this.terms.find(t => t.id === termId);
        if (!term) return;

        const modalContent = `
            <div class="modal-form">
                <form id="edit-term-form">
                    <div class="form-group">
                        <label for="edit-term-name">Term Name *</label>
                        <input type="text" id="edit-term-name" class="form-control" 
                               value="${term.name}" required>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="edit-term-start">Start Date *</label>
                                <input type="date" id="edit-term-start" class="form-control" 
                                       value="${term.startDate}" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="edit-term-end">End Date *</label>
                                <input type="date" id="edit-term-end" class="form-control" 
                                       value="${term.endDate}" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-term-weeks">Number of Weeks *</label>
                        <input type="number" id="edit-term-weeks" class="form-control" 
                               value="${term.weeks}" min="1" max="20" required>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="edit-term-active" class="form-check-input" 
                               ${term.active ? 'checked' : ''}>
                        <label class="form-check-label" for="edit-term-active">
                            Set as active term
                        </label>
                    </div>
                    
                    <div class="form-group mt-3">
                        <label for="edit-term-description">Description</label>
                        <textarea id="edit-term-description" class="form-control" rows="2">${term.description || ''}</textarea>
                    </div>
                </form>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Edit Term',
            size: 'modal-lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
                { text: 'Save Changes', class: 'btn-primary', action: 'submit' }
            ],
            onShow: (modal) => {
                modal.querySelector('[data-action="submit"]').addEventListener('click', () => {
                    if (this.updateTerm(termId, modal)) {
                        modal.remove();
                    }
                });
            }
        });
    }

    updateTerm(termId, modal) {
        const term = this.terms.find(t => t.id === termId);
        if (!term) return false;

        const form = modal.querySelector('#edit-term-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }

        term.name = modal.querySelector('#edit-term-name').value.trim();
        term.startDate = modal.querySelector('#edit-term-start').value;
        term.endDate = modal.querySelector('#edit-term-end').value;
        term.weeks = parseInt(modal.querySelector('#edit-term-weeks').value);
        term.active = modal.querySelector('#edit-term-active').checked;
        term.description = modal.querySelector('#edit-term-description')?.value.trim() || '';
        term.updatedAt = new Date().toISOString();

        // Validation
        if (new Date(term.endDate) <= new Date(term.startDate)) {
            Utils.showAlert('End date must be after start date', 'error');
            return false;
        }

        // Check for overlapping terms (excluding current term)
        const overlapping = this.terms.some(t => {
            if (t.id === termId) return false;
            const tStart = new Date(t.startDate);
            const tEnd = new Date(t.endDate);
            const newStart = new Date(term.startDate);
            const newEnd = new Date(term.endDate);
            return (newStart <= tEnd && newEnd >= tStart);
        });

        if (overlapping) {
            Utils.showAlert('This term overlaps with another term', 'error');
            return false;
        }

        // If this term is set as active, deactivate others
        if (term.active) {
            this.deactivateOtherTerms(termId);
        }

        Storage.set('attendance_terms', this.terms);
        this.renderTerms();
        
        Utils.showAlert('Term updated successfully', 'success');
        this.app.emitEvent('terms:updated', { terms: this.terms });
        
        return true;
    }

    deleteTerm(termCard) {
        const termId = termCard.dataset.termId;
        const term = this.terms.find(t => t.id === termId);
        
        if (!term) return;

        Utils.showConfirm(
            `Delete "${term.name}"?`,
            'This will remove the term from the system. Associated attendance records will not be deleted but will no longer be linked to a term.',
            'Delete Term',
            'Cancel'
        ).then((confirmed) => {
            if (confirmed) {
                this.terms = this.terms.filter(t => t.id !== termId);
                Storage.set('attendance_terms', this.terms);
                this.renderTerms();
                
                Utils.showAlert('Term deleted successfully', 'success');
                this.app.emitEvent('terms:updated', { terms: this.terms });
            }
        });
    }

    validateTerms() {
        const issues = [];
        
        this.terms.forEach((term, index) => {
            const termIssues = [];
            
            if (!term.name?.trim()) {
                termIssues.push('Missing term name');
            }
            
            if (!term.startDate) {
                termIssues.push('Missing start date');
            }
            
            if (!term.endDate) {
                termIssues.push('Missing end date');
            } else if (new Date(term.endDate) <= new Date(term.startDate)) {
                termIssues.push('End date must be after start date');
            }
            
            if (!term.weeks || term.weeks < 1 || term.weeks > 20) {
                termIssues.push('Invalid number of weeks (1-20)');
            }
            
            // Check for overlapping terms
            const overlappingTerm = this.terms.find((t, i) => {
                if (i === index) return false;
                const tStart = new Date(t.startDate);
                const tEnd = new Date(t.endDate);
                const termStart = new Date(term.startDate);
                const termEnd = new Date(term.endDate);
                return (termStart <= tEnd && termEnd >= tStart);
            });
            
            if (overlappingTerm) {
                termIssues.push(`Overlaps with "${overlappingTerm.name}"`);
            }
            
            if (termIssues.length > 0) {
                issues.push({
                    term: term.name,
                    issues: termIssues
                });
            }
        });

        if (issues.length === 0) {
            Utils.showAlert('All terms are valid!', 'success');
        } else {
            this.showValidationResults('Terms Validation', issues);
        }
    }

    // ========== SETTINGS MANAGEMENT ==========
    renderSettings() {
        const container = document.getElementById('settings-container');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-card">
                <h4><i class="fas fa-school"></i> School Information</h4>
                <div class="form-group">
                    <label for="school-name">School Name</label>
                    <input type="text" id="school-name" class="form-control" 
                           value="${this.settings.schoolName || ''}" placeholder="Enter school name">
                </div>
                <div class="form-group">
                    <label for="school-code">School Code</label>
                    <input type="text" id="school-code" class="form-control" 
                           value="${this.settings.schoolCode || ''}" placeholder="Optional">
                </div>
            </div>

            <div class="settings-card">
                <h4><i class="fas fa-sync"></i> Sync & Backup</h4>
                <div class="form-check mb-2">
                    <input type="checkbox" id="sync-enabled" class="form-check-input" 
                           ${this.settings.syncEnabled ? 'checked' : ''}>
                    <label class="form-check-label" for="sync-enabled">
                        Enable cloud sync
                    </label>
                </div>
                
                <div class="form-check mb-2">
                    <input type="checkbox" id="auto-backup" class="form-check-input" 
                           ${this.settings.autoBackup ? 'checked' : ''}>
                    <label class="form-check-label" for="auto-backup">
                        Automatic backups
                    </label>
                </div>
                
                <div class="form-group">
                    <label for="backup-interval">Backup Interval (days)</label>
                    <input type="number" id="backup-interval" class="form-control" 
                           min="1" max="30" value="${this.settings.backupInterval || 7}"
                           ${!this.settings.autoBackup ? 'disabled' : ''}>
                </div>
                
                <div class="form-group">
                    <label for="data-retention">Data Retention (days)</label>
                    <input type="number" id="data-retention" class="form-control" 
                           min="30" max="1095" value="${this.settings.dataRetention || 365}">
                    <small class="form-text text-muted">How long to keep attendance records (1-3 years)</small>
                </div>
            </div>

            <div class="settings-card">
                <h4><i class="fas fa-bell"></i> Notifications</h4>
                <div class="form-check mb-2">
                    <input type="checkbox" id="email-notifications" class="form-check-input" 
                           ${this.settings.emailNotifications ? 'checked' : ''}>
                    <label class="form-check-label" for="email-notifications">
                        Email notifications
                    </label>
                </div>
                
                <div class="form-check mb-2">
                    <input type="checkbox" id="low-attendance-alert" class="form-check-input" 
                           ${this.settings.lowAttendanceAlert ? 'checked' : ''}>
                    <label class="form-check-label" for="low-attendance-alert">
                        Low attendance alerts
                    </label>
                </div>
                
                <div class="form-group">
                    <label for="attendance-threshold">Low Attendance Threshold (%)</label>
                    <input type="number" id="attendance-threshold" class="form-control" 
                           min="1" max="100" value="${this.settings.attendanceThreshold || 75}">
                    <small class="form-text text-muted">Alert when attendance drops below this percentage</small>
                </div>
            </div>

            <div class="settings-card">
                <h4><i class="fas fa-chart-line"></i> Reporting</h4>
                <div class="form-group">
                    <label for="report-period">Default Report Period</label>
                    <select id="report-period" class="form-control">
                        <option value="week" ${this.settings.reportPeriod === 'week' ? 'selected' : ''}>Weekly</option>
                        <option value="month" ${this.settings.reportPeriod === 'month' ? 'selected' : ''}>Monthly</option>
                        <option value="term" ${this.settings.reportPeriod === 'term' ? 'selected' : ''}>Term</option>
                        <option value="year" ${this.settings.reportPeriod === 'year' ? 'selected' : ''}>Yearly</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="default-export-format">Default Export Format</label>
                    <select id="default-export-format" class="form-control">
                        <option value="pdf" ${this.settings.exportFormat === 'pdf' ? 'selected' : ''}>PDF</option>
                        <option value="excel" ${this.settings.exportFormat === 'excel' ? 'selected' : ''}>Excel</option>
                        <option value="csv" ${this.settings.exportFormat === 'csv' ? 'selected' : ''}>CSV</option>
                    </select>
                </div>
            </div>
        `;

        // Add event listeners for dependent fields
        const autoBackup = container.querySelector('#auto-backup');
        if (autoBackup) {
            autoBackup.addEventListener('change', (e) => {
                container.querySelector('#backup-interval').disabled = !e.target.checked;
            });
        }
    }

    saveSettings() {
        const newSettings = {
            schoolName: document.getElementById('school-name')?.value || 'Greenwood Academy',
            schoolCode: document.getElementById('school-code')?.value || '',
            syncEnabled: document.getElementById('sync-enabled')?.checked || false,
            autoBackup: document.getElementById('auto-backup')?.checked || false,
            backupInterval: parseInt(document.getElementById('backup-interval')?.value) || 7,
            dataRetention: parseInt(document.getElementById('data-retention')?.value) || 365,
            emailNotifications: document.getElementById('email-notifications')?.checked || false,
            lowAttendanceAlert: document.getElementById('low-attendance-alert')?.checked || false,
            attendanceThreshold: parseInt(document.getElementById('attendance-threshold')?.value) || 75,
            reportPeriod: document.getElementById('report-period')?.value || 'term',
            exportFormat: document.getElementById('default-export-format')?.value || 'pdf',
            updatedAt: new Date().toISOString()
        };

        this.settings = newSettings;
        Storage.set('app_settings', newSettings);
        
        // Update auto-backup if enabled
        if (newSettings.autoBackup) {
            this.setupAutoBackup();
        }
        
        Utils.showAlert('Settings saved successfully', 'success');
        this.app.emitEvent('settings:updated', { settings: newSettings });
    }

    resetSettings() {
        Utils.showConfirm(
            'Reset All Settings?',
            'This will restore all settings to their default values. Your data will not be affected.',
            'Reset Settings',
            'Cancel'
        ).then((confirmed) => {
            if (confirmed) {
                this.settings = {
                    schoolName: 'Greenwood Academy',
                    syncEnabled: true,
                    autoBackup: true,
                    backupInterval: 7,
                    dataRetention: 365,
                    emailNotifications: true,
                    lowAttendanceAlert: true,
                    attendanceThreshold: 75,
                    reportPeriod: 'term',
                    exportFormat: 'pdf'
                };
                Storage.set('app_settings', this.settings);
                this.renderSettings();
                Utils.showAlert('Settings reset to default values', 'success');
                this.app.emitEvent('settings:updated', { settings: this.settings });
            }
        });
    }

    // ========== DATA MANAGEMENT ==========
    async exportAllData() {
        try {
            // Gather all data
            const exportData = {
                app: 'Attendance Track v2',
                version: '2.0.0',
                exportDate: new Date().toISOString(),
                data: {
                    classes: await Storage.get('classes') || [],
                    attendance: await Storage.get('attendance_records') || [],
                    terms: this.terms,
                    settings: this.settings,
                    students: await Storage.get('students') || [],
                    teachers: await Storage.get('teachers') || [],
                    cumulative: await Storage.get('cumulative_data') || {}
                },
                statistics: await this.generateStatistics(),
                metadata: {
                    totalClasses: (await Storage.get('classes') || []).length,
                    totalAttendance: (await Storage.get('attendance_records') || []).length,
                    totalStudents: (await Storage.get('students') || []).length,
                    exportType: 'full_backup'
                }
            };

            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_backup_${Utils.formatDate(new Date(), 'YYYY-MM-DD_HH-mm')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Utils.showAlert('Data exported successfully', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            Utils.showAlert('Failed to export data', 'error');
        }
    }

    async generateStatistics() {
        const classes = await Storage.get('classes') || [];
        const attendance = await Storage.get('attendance_records') || [];
        
        return {
            totalClasses: classes.length,
            totalAttendanceRecords: attendance.length,
            averageAttendance: this.calculateOverallAverage(attendance, classes),
            recordsByMonth: this.getRecordsByMonth(attendance),
            classesBySubject: this.groupClassesBySubject(classes),
            classesByYear: this.groupClassesByYear(classes)
        };
    }

    calculateOverallAverage(attendance, classes) {
        if (attendance.length === 0) return 0;
        
        let totalPresent = 0;
        let totalPossible = 0;
        
        attendance.forEach(record => {
            totalPresent += record.present || 0;
            const classData = classes.find(c => c.id === record.classId);
            totalPossible += (classData?.studentCount || 0) * (record.session === 'Both' ? 2 : 1);
        });
        
        return totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
    }

    getRecordsByMonth(attendance) {
        const months = {};
        attendance.forEach(record => {
            if (record.date) {
                const month = record.date.substring(0, 7); // YYYY-MM
                months[month] = (months[month] || 0) + 1;
            }
        });
        return months;
    }

    groupClassesBySubject(classes) {
        const subjects = {};
        classes.forEach(cls => {
            const subject = cls.subject || 'Unknown';
            subjects[subject] = (subjects[subject] || 0) + 1;
        });
        return subjects;
    }

    groupClassesByYear(classes) {
        const years = {};
        classes.forEach(cls => {
            const year = cls.yearGroup || 'Unknown';
            years[year] = (years[year] || 0) + 1;
        });
        return years;
    }

    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            Utils.showAlert('File size too large (max 10MB)', 'error');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate import file
                if (!this.validateImportData(importedData)) {
                    Utils.showAlert('Invalid import file format', 'error');
                    return;
                }

                // Show import preview
                this.showImportPreview(importedData);
                
            } catch (error) {
                console.error('Import error:', error);
                Utils.showAlert('Failed to read import file. Please check the file format.', 'error');
            }
        };
        
        reader.onerror = () => {
            Utils.showAlert('Failed to read file', 'error');
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    validateImportData(data) {
        return data && 
               data.app === 'Attendance Track v2' && 
               data.data && 
               typeof data.data === 'object';
    }

    showImportPreview(importedData) {
        const stats = importedData.statistics || {};
        
        const modalContent = `
            <div class="import-preview">
                <div class="preview-header">
                    <h4><i class="fas fa-file-import"></i> Import Data Preview</h4>
                    <div class="preview-meta">
                        <small>Exported: ${Utils.formatDate(new Date(importedData.exportDate))}</small>
                        <small>Version: ${importedData.version || 'Unknown'}</small>
                    </div>
                </div>
                
                <div class="preview-stats">
                    <div class="stat-grid">
                        <div class="stat-card">
                            <div class="stat-value">${stats.totalClasses || importedData.data.classes?.length || 0}</div>
                            <div class="stat-label">Classes</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.totalAttendanceRecords || importedData.data.attendance?.length || 0}</div>
                            <div class="stat-label">Records</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${importedData.data.terms?.length || 0}</div>
                            <div class="stat-label">Terms</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.averageAttendance || 0}%</div>
                            <div class="stat-label">Avg Attendance</div>
                        </div>
                    </div>
                </div>
                
                <div class="import-options">
                    <h5>Select Data to Import:</h5>
                    
                    <div class="option-group">
                        <div class="form-check">
                            <input type="checkbox" id="import-classes" class="form-check-input" checked>
                            <label class="form-check-label" for="import-classes">
                                <strong>Classes</strong> (${importedData.data.classes?.length || 0})
                                <small class="d-block text-muted">Class lists and schedules</small>
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" id="import-attendance" class="form-check-input" checked>
                            <label class="form-check-label" for="import-attendance">
                                <strong>Attendance Records</strong> (${importedData.data.attendance?.length || 0})
                                <small class="d-block text-muted">Historical attendance data</small>
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" id="import-terms" class="form-check-input" checked>
                            <label class="form-check-label" for="import-terms">
                                <strong>Terms</strong> (${importedData.data.terms?.length || 0})
                                <small class="d-block text-muted">Academic terms and dates</small>
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" id="import-settings" class="form-check-input">
                            <label class="form-check-label" for="import-settings">
                                <strong>Settings</strong>
                                <small class="d-block text-muted">Application configuration</small>
                            </label>
                        </div>
                    </div>
                    
                    <div class="import-mode mt-3">
                        <label for="import-mode">Import Strategy:</label>
                        <select id="import-mode" class="form-control">
                            <option value="merge">Merge - Combine with existing data</option>
                            <option value="replace">Replace - Overwrite existing data</option>
                            <option value="append">Append - Only add new items</option>
                            <option value="update">Update - Only update existing items</option>
                        </select>
                        <small class="form-text text-muted">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Merge</strong> will combine data, updating existing items.<br>
                            <strong>Replace</strong> will delete all current data first.<br>
                            <strong>Append</strong> will only add items that don't already exist.<br>
                            <strong>Update</strong> will only update items that already exist.
                        </small>
                    </div>
                </div>
                
                <div class="import-warning alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Important:</strong> Consider creating a backup before importing.
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Import Data',
            size: 'modal-lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
                { text: 'Preview Changes', class: 'btn-info', action: 'preview' },
                { text: 'Start Import', class: 'btn-primary', action: 'import' }
            ],
            onShow: (modal) => {
                modal.querySelector('[data-action="preview"]').addEventListener('click', () => {
                    this.previewImportChanges(importedData, modal);
                });
                
                modal.querySelector('[data-action="import"]').addEventListener('click', () => {
                    this.executeImport(importedData, modal);
                });
                
                modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                    modal.remove();
                });
            }
        });
    }

    previewImportChanges(importedData, modal) {
        const importMode = modal.querySelector('#import-mode').value;
        const changes = this.calculateImportChanges(importedData, importMode);
        
        const previewContent = `
            <div class="changes-preview">
                <h5>Import Changes Preview</h5>
                <div class="changes-summary">
                    <div class="change-item ${changes.classes.added > 0 ? 'has-changes' : ''}">
                        <span>Classes:</span>
                        <span class="change-count">
                            +${changes.classes.added} / ↑${changes.classes.updated} / -${changes.classes.removed}
                        </span>
                    </div>
                    <div class="change-item ${changes.attendance.added > 0 ? 'has-changes' : ''}">
                        <span>Attendance:</span>
                        <span class="change-count">
                            +${changes.attendance.added} / ↑${changes.attendance.updated} / -${changes.attendance.removed}
                        </span>
                    </div>
                    <div class="change-item ${changes.terms.added > 0 ? 'has-changes' : ''}">
                        <span>Terms:</span>
                        <span class="change-count">
                            +${changes.terms.added} / ↑${changes.terms.updated} / -${changes.terms.removed}
                        </span>
                    </div>
                </div>
                
                ${importMode === 'replace' ? `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i>
                        <strong>Warning:</strong> This will DELETE all existing data before importing!
                    </div>
                ` : ''}
                
                <div class="changes-details mt-3">
                    <h6>Detailed Changes:</h6>
                    <pre class="changes-json">${JSON.stringify(changes, null, 2)}</pre>
                </div>
            </div>
        `;

        Utils.showModal(previewContent, {
            title: 'Import Changes Preview',
            size: 'modal-lg',
            buttons: [
                { text: 'Back', class: 'btn-secondary', action: 'back' },
                { text: 'Proceed with Import', class: 'btn-primary', action: 'proceed' }
            ],
            onShow: (previewModal) => {
                previewModal.querySelector('[data-action="back"]').addEventListener('click', () => {
                    previewModal.remove();
                });
                
                previewModal.querySelector('[data-action="proceed"]').addEventListener('click', () => {
                    previewModal.remove();
                    this.executeImport(importedData, modal);
                });
            }
        });
    }

    calculateImportChanges(importedData, importMode) {
        const changes = {
            classes: { added: 0, updated: 0, removed: 0 },
            attendance: { added: 0, updated: 0, removed: 0 },
            terms: { added: 0, updated: 0, removed: 0 }
        };

        const currentClasses = Storage.get('classes') || [];
        const currentAttendance = Storage.get('attendance_records') || [];
        const currentTerms = this.terms;

        switch (importMode) {
            case 'replace':
                changes.classes.removed = currentClasses.length;
                changes.classes.added = importedData.data.classes?.length || 0;
                
                changes.attendance.removed = currentAttendance.length;
                changes.attendance.added = importedData.data.attendance?.length || 0;
                
                changes.terms.removed = currentTerms.length;
                changes.terms.added = importedData.data.terms?.length || 0;
                break;

            case 'merge':
                // Calculate class changes
                importedData.data.classes?.forEach(impClass => {
                    const existingIndex = currentClasses.findIndex(c => c.id === impClass.id);
                    if (existingIndex >= 0) {
                        changes.classes.updated++;
                    } else {
                        changes.classes.added++;
                    }
                });
                break;

            case 'append':
                importedData.data.classes?.forEach(impClass => {
                    if (!currentClasses.some(c => c.id === impClass.id)) {
                        changes.classes.added++;
                    }
                });
                break;
        }

        return changes;
    }

    async executeImport(importedData, modal) {
        const importClasses = modal.querySelector('#import-classes').checked;
        const importAttendance = modal.querySelector('#import-attendance').checked;
        const importTerms = modal.querySelector('#import-terms').checked;
        const importSettings = modal.querySelector('#import-settings').checked;
        const importMode = modal.querySelector('#import-mode').value;

        try {
            // Create backup before import
            await this.createBackup();

            let results = {
                imported: 0,
                updated: 0,
                skipped: 0,
                errors: []
            };

            // Import based on mode
            switch (importMode) {
                case 'replace':
                    results = await this.importReplace(importedData, {
                        importClasses, importAttendance, importTerms, importSettings
                    });
                    break;

                case 'merge':
                    results = await this.importMerge(importedData, {
                        importClasses, importAttendance, importTerms, importSettings
                    });
                    break;

                case 'append':
                    results = await this.importAppend(importedData, {
                        importClasses, importAttendance, importTerms, importSettings
                    });
                    break;

                case 'update':
                    results = await this.importUpdate(importedData, {
                        importClasses, importAttendance, importTerms, importSettings
                    });
                    break;
            }

            modal.remove();
            this.showImportResults(results);
            
        } catch (error) {
            console.error('Import error:', error);
            Utils.showAlert('Import failed: ' + error.message, 'error');
        }
    }

    async importReplace(importedData, options) {
        const results = { imported: 0, updated: 0, skipped: 0, errors: [] };

        // Clear existing data first
        if (options.importClasses) {
            Storage.set('classes', []);
        }
        if (options.importAttendance) {
            Storage.set('attendance_records', []);
        }
        if (options.importTerms) {
            this.terms = [];
        }

        // Import new data
        if (options.importClasses && importedData.data.classes) {
            Storage.set('classes', importedData.data.classes);
            results.imported += importedData.data.classes.length;
        }

        if (options.importAttendance && importedData.data.attendance) {
            Storage.set('attendance_records', importedData.data.attendance);
            results.imported += importedData.data.attendance.length;
        }

        if (options.importTerms && importedData.data.terms) {
            this.terms = importedData.data.terms;
            Storage.set('attendance_terms', this.terms);
            results.imported += importedData.data.terms.length;
            this.renderTerms();
        }

        if (options.importSettings && importedData.data.settings) {
            this.settings = { ...this.settings, ...importedData.data.settings };
            Storage.set('app_settings', this.settings);
            results.updated++;
            this.renderSettings();
        }

        return results;
    }

    async importMerge(importedData, options) {
        const results = { imported: 0, updated: 0, skipped: 0, errors: [] };

        if (options.importClasses && importedData.data.classes) {
            const currentClasses = Storage.get('classes') || [];
            const merged = this.mergeArrays(currentClasses, importedData.data.classes, 'id');
            Storage.set('classes', merged);
            results.imported = merged.length - currentClasses.length;
            results.updated = currentClasses.length - results.imported;
        }

        if (options.importAttendance && importedData.data.attendance) {
            const currentAttendance = Storage.get('attendance_records') || [];
            const merged = this.mergeArrays(currentAttendance, importedData.data.attendance, 'id');
            Storage.set('attendance_records', merged);
            results.imported += merged.length - currentAttendance.length;
            results.updated += currentAttendance.length - (merged.length - currentAttendance.length);
        }

        if (options.importTerms && importedData.data.terms) {
            const merged = this.mergeArrays(this.terms, importedData.data.terms, 'id');
            this.terms = merged;
            Storage.set('attendance_terms', this.terms);
            results.imported += merged.length - this.terms.length;
            results.updated += this.terms.length - (merged.length - this.terms.length);
            this.renderTerms();
        }

        if (options.importSettings && importedData.data.settings) {
            this.settings = { ...this.settings, ...importedData.data.settings };
            Storage.set('app_settings', this.settings);
            results.updated++;
            this.renderSettings();
        }

        return results;
    }

    mergeArrays(current, imported, key) {
        const merged = [...current];
        const existingKeys = new Set(current.map(item => item[key]));
        
        imported.forEach(item => {
            const index = merged.findIndex(i => i[key] === item[key]);
            if (index >= 0) {
                merged[index] = { ...merged[index], ...item };
            } else {
                merged.push(item);
            }
        });
        
        return merged;
    }

    showImportResults(results) {
        const message = `
            Import completed successfully!
            
            Summary:
            • ${results.imported} items imported
            • ${results.updated} items updated
            • ${results.skipped} items skipped
            ${results.errors.length > 0 ? `• ${results.errors.length} errors` : ''}
        `;

        if (results.errors.length > 0) {
            Utils.showAlert(message, 'warning');
            console.error('Import errors:', results.errors);
        } else {
            Utils.showAlert(message, 'success');
        }

        this.app.emitEvent('data:imported', results);
    }

    // ========== DATA VALIDATION & CLEANUP ==========
    async validateData() {
        const issues = [];
        
        // Validate classes
        const classes = Storage.get('classes') || [];
        classes.forEach((cls, index) => {
            const classIssues = [];
            
            if (!cls.name?.trim()) {
                classIssues.push('Missing class name');
            }
            
            if (!cls.teacher?.trim()) {
                classIssues.push('Missing teacher');
            }
            
            if (!cls.subject?.trim()) {
                classIssues.push('Missing subject');
            }
            
            if (!cls.yearGroup) {
                classIssues.push('Missing year group');
            }
            
            if (!cls.studentCount || cls.studentCount < 0) {
                classIssues.push('Invalid student count');
            }
            
            if (classIssues.length > 0) {
                issues.push({
                    type: 'class',
                    id: cls.id || `class_${index}`,
                    name: cls.name,
                    issues: classIssues
                });
            }
        });

        // Validate attendance records
        const attendance = Storage.get('attendance_records') || [];
        const validClassIds = new Set(classes.map(c => c.id));
        
        attendance.forEach((record, index) => {
            const recordIssues = [];
            
            if (!record.date) {
                recordIssues.push('Missing date');
            }
            
            if (!record.classId) {
                recordIssues.push('Missing class ID');
            } else if (!validClassIds.has(record.classId)) {
                recordIssues.push('Invalid class reference');
            }
            
            if (typeof record.present !== 'number' || record.present < 0) {
                recordIssues.push('Invalid present count');
            }
            
            if (typeof record.absent !== 'number' || record.absent < 0) {
                recordIssues.push('Invalid absent count');
            }
            
            if (typeof record.late !== 'number' || record.late < 0) {
                recordIssues.push('Invalid late count');
            }
            
            // Check date validity
            if (record.date) {
                const recordDate = new Date(record.date);
                if (isNaN(recordDate.getTime())) {
                    recordIssues.push('Invalid date format');
                } else if (recordDate > new Date()) {
                    recordIssues.push('Date in future');
                }
            }
            
            if (recordIssues.length > 0) {
                issues.push({
                    type: 'attendance',
                    id: record.id || `record_${index}`,
                    date: record.date,
                    classId: record.classId,
                    issues: recordIssues
                });
            }
        });

        // Validate terms (already done in validateTerms)
        const termIssues = [];
        this.terms.forEach((term, index) => {
            if (new Date(term.endDate) <= new Date(term.startDate)) {
                termIssues.push(`Term "${term.name}" has invalid dates`);
            }
            
            // Check for overlapping terms
            const overlapping = this.terms.find((t, i) => {
                if (i === index) return false;
                const tStart = new Date(t.startDate);
                const tEnd = new Date(t.endDate);
                const termStart = new Date(term.startDate);
                const termEnd = new Date(term.endDate);
                return (termStart <= tEnd && termEnd >= tStart);
            });
            
            if (overlapping) {
                termIssues.push(`Term "${term.name}" overlaps with "${overlapping.name}"`);
            }
        });

        if (termIssues.length > 0) {
            issues.push({
                type: 'terms',
                issues: termIssues
            });
        }

        if (issues.length === 0) {
            Utils.showAlert('All data is valid! No issues found.', 'success');
        } else {
            this.showValidationResults('Data Validation', issues);
        }
    }

    showValidationResults(title, issues) {
        const modalContent = `
            <div class="validation-results">
                <h4>${title}</h4>
                <p class="text-muted">Found ${issues.length} issue${issues.length !== 1 ? 's' : ''}</p>
                
                <div class="issues-list">
                    ${issues.map((issue, idx) => `
                        <div class="issue-card ${issue.type}">
                            <div class="issue-header">
                                <span class="issue-type">${issue.type.toUpperCase()}</span>
                                <span class="issue-id">${issue.name || issue.id || `#${idx + 1}`}</span>
                            </div>
                            <div class="issue-details">
                                ${issue.issues.map(item => `
                                    <div class="issue-item">
                                        <i class="fas fa-exclamation-circle"></i>
                                        <span>${item}</span>
                                    </div>
                                `).join('')}
                            </div>
                            ${issue.date ? `<div class="issue-meta">Date: ${issue.date}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="validation-actions">
                    <button type="button" class="btn btn-outline-danger" id="auto-fix-issues">
                        <i class="fas fa-magic"></i> Auto-fix Issues
                    </button>
                    <button type="button" class="btn btn-outline-primary" id="export-issues">
                        <i class="fas fa-download"></i> Export Report
                    </button>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: title,
            size: 'modal-lg',
            buttons: [
                { text: 'Close', class: 'btn-secondary', action: 'close' }
            ],
            onShow: (modal) => {
                modal.querySelector('#auto-fix-issues').addEventListener('click', () => {
                    this.autoFixIssues(issues);
                    modal.remove();
                });
                
                modal.querySelector('#export-issues').addEventListener('click', () => {
                    this.exportValidationReport(issues);
                });
            }
        });
    }

    autoFixIssues(issues) {
        let fixedCount = 0;
        
        issues.forEach(issue => {
            if (issue.type === 'class') {
                fixedCount += this.fixClassIssues(issue);
            } else if (issue.type === 'attendance') {
                fixedCount += this.fixAttendanceIssues(issue);
            }
        });
        
        if (fixedCount > 0) {
            Utils.showAlert(`Auto-fixed ${fixedCount} issues`, 'success');
            this.app.emitEvent('data:updated');
        } else {
            Utils.showAlert('No issues could be auto-fixed', 'info');
        }
    }

    fixClassIssues(issue) {
        const classes = Storage.get('classes') || [];
        const classIndex = classes.findIndex(c => c.id === issue.id);
        
        if (classIndex >= 0) {
            const cls = classes[classIndex];
            
            // Fix common issues
            if (!cls.name?.trim()) {
                cls.name = 'Unnamed Class';
            }
            
            if (!cls.teacher?.trim()) {
                cls.teacher = 'Unknown Teacher';
            }
            
            if (!cls.subject?.trim()) {
                cls.subject = 'General';
            }
            
            if (!cls.yearGroup) {
                cls.yearGroup = 7; // Default year
            }
            
            if (!cls.studentCount || cls.studentCount < 0) {
                cls.studentCount = 0;
            }
            
            Storage.set('classes', classes);
            return 1;
        }
        
        return 0;
    }

    exportValidationReport(issues) {
        const report = {
            generated: new Date().toISOString(),
            totalIssues: issues.length,
            issues: issues,
            summary: {
                byType: {
                    class: issues.filter(i => i.type === 'class').length,
                    attendance: issues.filter(i => i.type === 'attendance').length,
                    terms: issues.filter(i => i.type === 'terms').length
                }
            }
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `validation_report_${Utils.formatDate(new Date(), 'YYYY-MM-DD_HH-mm')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showAlert('Validation report exported', 'success');
    }

    // ========== BACKUP SYSTEM ==========
    async createBackup() {
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                data: {
                    classes: Storage.get('classes') || [],
                    attendance: Storage.get('attendance_records') || [],
                    terms: this.terms,
                    settings: this.settings,
                    students: Storage.get('students') || [],
                    teachers: Storage.get('teachers') || []
                },
                statistics: await this.generateStatistics(),
                size: 0
            };

            // Calculate size
            const dataStr = JSON.stringify(backupData);
            backupData.size = new Blob([dataStr]).size;

            // Save backup
            const backupKey = `backup_${Date.now()}`;
            Storage.set(backupKey, backupData);

            // Update backup history
            this.backupHistory.unshift({
                key: backupKey,
                timestamp: backupData.timestamp,
                size: backupData.size,
                stats: backupData.statistics
            });

            // Keep only last 10 backups
            if (this.backupHistory.length > 10) {
                const oldBackup = this.backupHistory.pop();
                Storage.remove(oldBackup.key);
            }

            Storage.set('backup_history', this.backupHistory);
            
            // Update UI
            this.updateBackupStatus();
            
            Utils.showAlert('Backup created successfully', 'success');
            
            return backupKey;
            
        } catch (error) {
            console.error('Backup creation error:', error);
            Utils.showAlert('Failed to create backup', 'error');
            throw error;
        }
    }

    showBackupRestore() {
        if (this.backupHistory.length === 0) {
            Utils.showAlert('No backups available', 'info');
            return;
        }

        const modalContent = `
            <div class="backup-restore">
                <h4>Restore from Backup</h4>
                <p class="text-muted">Select a backup to restore:</p>
                
                <div class="backup-list">
                    ${this.backupHistory.map((backup, index) => `
                        <div class="backup-item" data-backup-key="${backup.key}">
                            <div class="backup-info">
                                <div class="backup-title">
                                    <strong>Backup ${index + 1}</strong>
                                    <span class="backup-date">${Utils.formatDate(new Date(backup.timestamp), 'relative')}</span>
                                </div>
                                <div class="backup-details">
                                    <small>
                                        ${backup.stats?.totalClasses || 0} classes • 
                                        ${backup.stats?.totalAttendanceRecords || 0} records • 
                                        ${Math.round(backup.size / 1024)} KB
                                    </small>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-outline-primary restore-btn">
                                <i class="fas fa-undo"></i> Restore
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div class="restore-options mt-3">
                    <h5>Restore Options:</h5>
                    <div class="form-check">
                        <input type="checkbox" id="restore-overwrite" class="form-check-input" checked>
                        <label class="form-check-label" for="restore-overwrite">
                            Overwrite existing data
                        </label>
                    </div>
                    <div class="form-check">
                        <input type="checkbox" id="restore-settings" class="form-check-input">
                        <label class="form-check-label" for="restore-settings">
                            Restore settings
                        </label>
                    </div>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Restore Backup',
            size: 'modal-lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' }
            ],
            onShow: (modal) => {
                modal.querySelectorAll('.restore-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const backupItem = e.target.closest('.backup-item');
                        const backupKey = backupItem.dataset.backupKey;
                        const overwrite = modal.querySelector('#restore-overwrite').checked;
                        const restoreSettings = modal.querySelector('#restore-settings').checked;
                        
                        this.restoreBackup(backupKey, { overwrite, restoreSettings });
                        modal.remove();
                    });
                });
            }
        });
    }

    async restoreBackup(backupKey, options) {
        try {
            const backupData = Storage.get(backupKey);
            if (!backupData) {
                throw new Error('Backup not found');
            }

            Utils.showConfirm(
                'Restore Backup?',
                `This will ${options.overwrite ? 'overwrite' : 'merge with'} your current data.`,
                'Restore',
                'Cancel'
            ).then(async (confirmed) => {
                if (confirmed) {
                    // Create backup before restoring
                    await this.createBackup();

                    if (options.overwrite) {
                        // Replace all data
                        Storage.set('classes', backupData.data.classes || []);
                        Storage.set('attendance_records', backupData.data.attendance || []);
                        
                        if (backupData.data.terms) {
                            this.terms = backupData.data.terms;
                            Storage.set('attendance_terms', this.terms);
                            this.renderTerms();
                        }
                    } else {
                        // Merge data
                        this.importMerge(backupData, {
                            importClasses: true,
                            importAttendance: true,
                            importTerms: true,
                            importSettings: options.restoreSettings
                        });
                    }

                    if (options.restoreSettings && backupData.data.settings) {
                        this.settings = backupData.data.settings;
                        Storage.set('app_settings', this.settings);
                        this.renderSettings();
                    }

                    Utils.showAlert('Backup restored successfully', 'success');
                    this.app.emitEvent('data:restored');
                }
            });
            
        } catch (error) {
            console.error('Restore error:', error);
            Utils.showAlert('Failed to restore backup: ' + error.message, 'error');
        }
    }

    updateBackupStatus() {
        const statusElement = document.getElementById('backup-status');
        if (!statusElement) return;

        if (this.backupHistory.length === 0) {
            statusElement.innerHTML = `
                <span class="text-danger">
                    <i class="fas fa-exclamation-circle"></i> No backups found
                </span>
            `;
            return;
        }

        const latestBackup = this.backupHistory[0];
        const backupDate = new Date(latestBackup.timestamp);
        const now = new Date();
        const daysDiff = Math.floor((now - backupDate) / (1000 * 60 * 60 * 24));

        let statusClass = 'text-success';
        let icon = 'fa-check-circle';
        let statusText = `Last backup: ${Utils.formatDate(backupDate, 'relative')}`;

        if (daysDiff > 7) {
            statusClass = 'text-danger';
            icon = 'fa-exclamation-circle';
            statusText += ' (Overdue)';
        } else if (daysDiff > 3) {
            statusClass = 'text-warning';
            icon = 'fa-exclamation-triangle';
            statusText += ' (Due soon)';
        }

        statusElement.innerHTML = `
            <span class="${statusClass}">
                <i class="fas ${icon}"></i> ${statusText}
            </span>
        `;
    }

    // ========== DATA CLEANUP ==========
    async cleanupOldData() {
        const retentionDays = this.settings.dataRetention || 365;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const attendance = Storage.get('attendance_records') || [];
        const oldRecords = attendance.filter(record => {
            if (!record.date) return false;
            const recordDate = new Date(record.date);
            return recordDate < cutoffDate;
        });

        if (oldRecords.length === 0) {
            Utils.showAlert('No old data to clean up', 'info');
            return;
        }

        Utils.showConfirm(
            'Clean Up Old Data?',
            `This will remove ${oldRecords.length} attendance records older than ${retentionDays} days.`,
            'Clean Up',
            'Cancel'
        ).then((confirmed) => {
            if (confirmed) {
                const newAttendance = attendance.filter(record => {
                    if (!record.date) return true;
                    const recordDate = new Date(record.date);
                    return recordDate >= cutoffDate;
                });

                Storage.set('attendance_records', newAttendance);
                
                Utils.showAlert(`Removed ${oldRecords.length} old records`, 'success');
                this.app.emitEvent('data:cleaned', { removed: oldRecords.length });
            }
        });
    }

    async compactDatabase() {
        try {
            const attendance = Storage.get('attendance_records') || [];
            const classes = Storage.get('classes') || [];
            
            let removedDuplicates = 0;
            let removedInvalid = 0;
            
            // Remove duplicate attendance records
            const uniqueRecords = [];
            const seen = new Set();
            
            attendance.forEach(record => {
                const key = `${record.date}-${record.session}-${record.classId}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueRecords.push(record);
                } else {
                    removedDuplicates++;
                }
            });
            
            // Remove invalid records
            const validClassIds = new Set(classes.map(c => c.id));
            const validRecords = uniqueRecords.filter(record => {
                if (!record.date || !record.classId || !validClassIds.has(record.classId)) {
                    removedInvalid++;
                    return false;
                }
                return true;
            });
            
            // Save compacted data
            Storage.set('attendance_records', validRecords);
            
            const totalRemoved = removedDuplicates + removedInvalid;
            
            if (totalRemoved > 0) {
                Utils.showAlert(
                    `Database compacted: ${totalRemoved} records removed (${removedDuplicates} duplicates, ${removedInvalid} invalid)`,
                    'success'
                );
                this.app.emitEvent('database:compacted', { removed: totalRemoved });
            } else {
                Utils.showAlert('Database is already optimized', 'info');
            }
            
        } catch (error) {
            console.error('Database compaction error:', error);
            Utils.showAlert('Failed to compact database', 'error');
        }
    }

    // ========== SYSTEM REPORT ==========
    async generateSystemReport() {
        try {
            const report = {
                generated: new Date().toISOString(),
                system: {
                    version: '2.0.0',
                    userAgent: navigator.userAgent,
                    online: navigator.onLine,
                    storage: await this.calculateStorageUsage()
                },
                data: await this.generateStatistics(),
                settings: this.settings,
                terms: this.terms.map(t => ({
                    name: t.name,
                    dates: `${t.startDate} to ${t.endDate}`,
                    weeks: t.weeks,
                    active: t.active,
                    records: this.getTermAttendanceCount(t.id)
                })),
                backups: {
                    total: this.backupHistory.length,
                    latest: this.backupHistory[0]?.timestamp,
                    totalSize: this.backupHistory.reduce((sum, b) => sum + b.size, 0)
                }
            };

            this.showSystemReport(report);
            
        } catch (error) {
            console.error('System report error:', error);
            Utils.showAlert('Failed to generate system report', 'error');
        }
    }

    async calculateStorageUsage() {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    percentage: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0
                };
            } catch (error) {
                console.error('Storage estimate error:', error);
            }
        }
        return null;
    }

    showSystemReport(report) {
        const modalContent = `
            <div class="system-report">
                <div class="report-header">
                    <h4><i class="fas fa-chart-pie"></i> System Report</h4>
                    <small class="text-muted">Generated: ${Utils.formatDate(new Date(report.generated))}</small>
                </div>
                
                <div class="report-section">
                    <h5>System Status</h5>
                    <div class="status-grid">
                        <div class="status-item ${report.system.online ? 'online' : 'offline'}">
                            <span>Connection:</span>
                            <strong>${report.system.online ? 'Online' : 'Offline'}</strong>
                        </div>
                        <div class="status-item">
                            <span>Storage Usage:</span>
                            <strong>
                                ${report.system.storage ? 
                                    `${Math.round(report.system.storage.percentage)}%` : 
                                    'N/A'}
                            </strong>
                        </div>
                        <div class="status-item">
                            <span>Backups:</span>
                            <strong>${report.backups.total}</strong>
                        </div>
                        <div class="status-item">
                            <span>Active Term:</span>
                            <strong>${this.terms.find(t => t.active)?.name || 'None'}</strong>
                        </div>
                    </div>
                </div>
                
                <div class="report-section">
                    <h5>Data Statistics</h5>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${report.data.totalClasses}</div>
                            <div class="stat-label">Classes</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${report.data.totalAttendanceRecords}</div>
                            <div class="stat-label">Records</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${report.data.averageAttendance}%</div>
                            <div class="stat-label">Avg. Attendance</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${this.terms.length}</div>
                            <div class="stat-label">Terms</div>
                        </div>
                    </div>
                </div>
                
                <div class="report-section">
                    <h5>Storage Information</h5>
                    ${report.system.storage ? `
                        <div class="storage-info">
                            <div class="storage-bar">
                                <div class="storage-fill" style="width: ${report.system.storage.percentage}%"></div>
                            </div>
                            <div class="storage-text">
                                ${Math.round(report.system.storage.usage / 1024 / 1024)} MB / 
                                ${Math.round(report.system.storage.quota / 1024 / 1024)} MB
                                (${report.system.storage.percentage}%)
                            </div>
                        </div>
                    ` : '<p class="text-muted">Storage information not available</p>'}
                </div>
                
                <div class="report-section">
                    <h5>Term Summary</h5>
                    <div class="terms-summary">
                        ${report.terms.map(term => `
                            <div class="term-summary-item ${term.active ? 'active' : ''}">
                                <div class="term-name">${term.name}</div>
                                <div class="term-stats">
                                    <span class="badge">${term.weeks}w</span>
                                    <span class="badge">${term.records} rec</span>
                                    ${term.active ? '<span class="badge bg-success">Active</span>' : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'System Report',
            size: 'modal-lg',
            buttons: [
                { text: 'Export Report', class: 'btn-primary', action: 'export' },
                { text: 'Close', class: 'btn-secondary', action: 'close' }
            ],
            onShow: (modal) => {
                modal.querySelector('[data-action="export"]').addEventListener('click', () => {
                    this.exportSystemReport(report);
                });
            }
        });
    }

    exportSystemReport(report) {
        const formattedReport = {
            ...report,
            generated: Utils.formatDate(new Date(report.generated), 'full'),
            school: this.settings.schoolName
        };
        
        const blob = new Blob([JSON.stringify(formattedReport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system_report_${Utils.formatDate(new Date(), 'YYYY-MM-DD_HH-mm')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showAlert('System report exported', 'success');
    }

    // ========== UTILITY METHODS ==========
    getActiveTerm() {
        return this.terms.find(term => term.active) || this.terms[0];
    }

    isDateInTerm(date, termId = null) {
        const term = termId ? 
            this.terms.find(t => t.id === termId) : 
            this.getActiveTerm();
        
        if (!term) return false;
        
        const checkDate = new Date(date);
        const startDate = new Date(term.startDate);
        const endDate = new Date(term.endDate);
        
        return checkDate >= startDate && checkDate <= endDate;
    }

    getTermByDate(date) {
        const checkDate = new Date(date);
        return this.terms.find(term => {
            const startDate = new Date(term.startDate);
            const endDate = new Date(term.endDate);
            return checkDate >= startDate && checkDate <= endDate;
        });
    }

    getWeekNumber(date, termId = null) {
        const term = termId ? 
            this.terms.find(t => t.id === termId) : 
            this.getTermByDate(date);
        
        if (!term) return null;
        
        const checkDate = new Date(date);
        const startDate = new Date(term.startDate);
        
        // Calculate days difference
        const diffTime = Math.abs(checkDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Calculate week number (starting from 1)
        const weekNumber = Math.floor(diffDays / 7) + 1;
        
        // Ensure week number doesn't exceed term weeks
        return Math.min(weekNumber, term.weeks);
    }

    validateTermInput(input) {
        const termGroup = input.closest('.term-input-group');
        if (!termGroup) return true;

        const name = termGroup.querySelector('.term-name')?.value.trim();
        const startDate = termGroup.querySelector('.term-start')?.value;
        const endDate = termGroup.querySelector('.term-end')?.value;
        const weeks = termGroup.querySelector('.term-weeks')?.value;

        let isValid = true;
        const errors = [];

        if (name && name.length < 2) {
            errors.push('Term name too short');
            isValid = false;
        }

        if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
            errors.push('End date must be after start date');
            isValid = false;
        }

        if (weeks && (weeks < 1 || weeks > 20)) {
            errors.push('Weeks must be between 1 and 20');
            isValid = false;
        }

        // Update validation UI
        const errorElement = termGroup.querySelector('.validation-errors') || 
                           (() => {
                               const div = document.createElement('div');
                               div.className = 'validation-errors mt-1';
                               termGroup.appendChild(div);
                               return div;
                           })();

        if (errors.length > 0) {
            errorElement.innerHTML = errors.map(err => 
                `<small class="text-danger"><i class="fas fa-exclamation-circle"></i> ${err}</small>`
            ).join('<br>');
            errorElement.style.display = 'block';
        } else {
            errorElement.style.display = 'none';
        }

        return isValid;
    }

    // ========== EVENT HANDLERS ==========
    onTermsUpdated(data) {
        this.terms = data.terms;
        this.renderTerms();
    }

    onSettingsUpdated(data) {
        this.settings = data.settings;
        this.renderSettings();
    }

    onDataImported(data) {
        // Refresh data after import
        this.loadTerms();
        this.loadSettings();
        this.updateBackupStatus();
    }

    // ========== PUBLIC API ==========
    getTerms() {
        return [...this.terms];
    }

    getSettings() {
        return { ...this.settings };
    }

    async refresh() {
        await this.loadTerms();
        await this.loadSettings();
        await this.loadBackupHistory();
        this.updateBackupStatus();
    }

    // Clean up method
    destroy() {
        // Remove event listeners if needed
        document.removeEventListener('click', this.boundEventHandlers);
    }
}
