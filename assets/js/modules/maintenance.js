import { Utils, Storage } from './utils.js';

export class MaintenanceModule {
    constructor(app) {
        this.app = app;
    }

    async init() {
        await this.loadMaintenancePage();
        this.setupEventListeners();
        this.renderTerms();
    }

    async loadMaintenancePage() {
        // Page is loaded via navigation, just ensure containers exist
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('#add-term-btn')) {
                this.addTerm();
            } else if (e.target.matches('#save-terms-btn')) {
                this.saveTerms();
            } else if (e.target.matches('#reset-terms-btn')) {
                this.resetTerms();
            } else if (e.target.matches('#export-data-btn')) {
                this.exportAllData();
            } else if (e.target.matches('#import-data-btn')) {
                document.getElementById('import-file-input').click();
            } else if (e.target.matches('#clear-attendance-data-btn')) {
                this.clearAttendanceData();
            } else if (e.target.matches('.remove-term')) {
                this.removeTerm(e.target.closest('.term-input-group'));
            }
        });

        // File import handler
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.importData(e));
        }
    }

    renderTerms() {
        const container = document.getElementById('terms-container');
        if (!container) return;

        let html = '';
        
        this.app.state.terms.forEach((term, index) => {
            html += `
                <div class="term-input-group">
                    <input type="text" class="form-control term-name" 
                           value="${term.name}" placeholder="Term Name" required>
                    <input type="date" class="form-control term-start" 
                           value="${term.startDate}" required>
                    <input type="date" class="form-control term-end" 
                           value="${term.endDate}" required>
                    <input type="number" class="form-control term-weeks" 
                           value="${term.weeks}" min="1" max="20" required>
                    <label class="term-active-label">
                        <input type="checkbox" class="term-active" ${term.isActive ? 'checked' : ''}>
                        Active
                    </label>
                    <button type="button" class="btn btn-danger remove-term">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    addTerm() {
        const container = document.getElementById('terms-container');
        const termNumber = container.querySelectorAll('.term-input-group').length + 1;
        
        const html = `
            <div class="term-input-group">
                <input type="text" class="form-control term-name" 
                       value="Term ${termNumber}" placeholder="Term Name" required>
                <input type="date" class="form-control term-start" required>
                <input type="date" class="form-control term-end" required>
                <input type="number" class="form-control term-weeks" 
                       value="14" min="1" max="20" required>
                <label class="term-active-label">
                    <input type="checkbox" class="term-active" checked>
                    Active
                </label>
                <button type="button" class="btn btn-danger remove-term">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    }

    removeTerm(termGroup) {
        if (confirm('Remove this term?')) {
            termGroup.remove();
        }
    }

    async saveTerms() {
        const termInputs = document.querySelectorAll('#terms-container .term-input-group');
        const newTerms = [];
        
        termInputs.forEach((input, index) => {
            const name = input.querySelector('.term-name').value.trim();
            const startDate = input.querySelector('.term-start').value;
            const endDate = input.querySelector('.term-end').value;
            const weeks = parseInt(input.querySelector('.term-weeks').value);
            const isActive = input.querySelector('.term-active').checked;
            
            if (name && startDate && endDate && weeks) {
                newTerms.push({
                    id: `term${index + 1}`,
                    name: name,
                    startDate: startDate,
                    endDate: endDate,
                    weeks: weeks,
                    isActive: isActive,
                    updatedAt: new Date().toISOString()
                });
            }
        });
        
        if (newTerms.length === 0) {
            this.app.showToast('Please add at least one term', 'error');
            return;
        }
        
        // Update app state
        this.app.state.terms = newTerms;
        Storage.set('gams_terms', newTerms);
        
        // Try to save to Google Sheets if online
        if (this.app.state.isOnline) {
            try {
                await this.saveToGoogleSheets(newTerms);
                this.app.showToast('Terms saved to Google Sheets!', 'success');
            } catch (error) {
                this.app.showToast(`Terms saved locally (${error.message})`, 'warning');
            }
        } else {
            this.app.showToast('Terms saved successfully!', 'success');
        }
        
        // Update dashboard if needed
        if (this.app.modules.dashboard) {
            this.app.modules.dashboard.updateWeekOptions();
        }
    }

    async saveToGoogleSheets(terms) {
        if (!this.app.state.isOnline || !this.app.state.settings.webAppUrl) {
            return false;
        }
        
        try {
            const url = new URL(this.app.state.settings.webAppUrl);
            url.searchParams.append('action', 'saveTerms');
            url.searchParams.append('terms', JSON.stringify(terms));
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                redirect: 'follow',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to save terms');
            }
            
            return data;
        } catch (error) {
            console.error('Google Sheets save error:', error);
            throw error;
        }
    }

    resetTerms() {
        if (confirm('Reset terms to default values?')) {
            const defaultTerms = [
                { id: 'term1', name: 'Term 1', startDate: '2024-09-08', endDate: '2024-12-15', weeks: 14, isActive: true },
                { id: 'term2', name: 'Term 2', startDate: '2025-01-08', endDate: '2025-04-15', weeks: 14, isActive: true },
                { id: 'term3', name: 'Term 3', startDate: '2025-04-22', endDate: '2025-07-15', weeks: 12, isActive: true }
            ];
            
            this.app.state.terms = defaultTerms;
            Storage.set('gams_terms', defaultTerms);
            this.renderTerms();
            
            this.app.showToast('Terms reset to default values', 'warning');
        }
    }

    exportAllData() {
        const exportData = {
            app: 'Attendance Track v2',
            version: '2.0.0',
            exportDate: new Date().toISOString(),
            data: {
                classes: this.app.state.classes,
                attendanceRecords: this.app.state.attendanceRecords,
                terms: this.app.state.terms,
                cumulativeData: this.app.state.cumulativeData,
                historicalAverages: this.app.state.historicalAverages,
                settings: this.app.state.settings
            },
            metadata: {
                totalClasses: this.app.state.classes.length,
                totalRecords: this.app.state.attendanceRecords.length,
                totalTerms: this.app.state.terms.length,
                generatedBy: this.app.state.currentUser?.name || 'Unknown'
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance-backup-${Utils.formatDate(new Date())}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.app.showToast('All data exported successfully', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate the imported data structure
                if (!importedData.data || typeof importedData.data !== 'object') {
                    throw new Error('Invalid data format');
                }
                
                // Ask for import options
                this.showImportOptions(importedData.data);
                
            } catch (error) {
                console.error('Import error:', error);
                this.app.showToast('Failed to import data: Invalid file format', 'error');
            }
        };
        
        reader.onerror = () => {
            this.app.showToast('Failed to read file', 'error');
        };
        
        reader.readAsText(file);
    }

    showImportOptions(importedData) {
        const modalContent = `
            <div class="import-options">
                <h4>Import Data</h4>
                <p>Select what to import from the backup file:</p>
                
                <div class="import-option">
                    <label>
                        <input type="checkbox" id="import-classes" checked>
                        Classes (${importedData.classes?.length || 0} classes)
                    </label>
                </div>
                
                <div class="import-option">
                    <label>
                        <input type="checkbox" id="import-attendance" checked>
                        Attendance Records (${importedData.attendanceRecords?.length || 0} records)
                    </label>
                </div>
                
                <div class="import-option">
                    <label>
                        <input type="checkbox" id="import-terms" checked>
                        Terms (${importedData.terms?.length || 0} terms)
                    </label>
                </div>
                
                <div class="import-option">
                    <label>
                        <input type="checkbox" id="import-settings">
                        Settings
                    </label>
                </div>
                
                <div class="import-strategy">
                    <label>Import Strategy:</label>
                    <select id="import-strategy" class="form-control">
                        <option value="merge">Merge with existing data</option>
                        <option value="replace">Replace all data</option>
                        <option value="add">Add only new items</option>
                    </select>
                </div>
                
                <div class="import-warning">
                    <p><i class="fas fa-exclamation-triangle"></i> This action cannot be undone. Please backup your current data first.</p>
                </div>
                
                <div class="import-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-import">Cancel</button>
                    <button type="button" class="btn btn-primary" id="confirm-import">Import Selected Data</button>
                </div>
            </div>
        `;

        const modal = Utils.showModal(modalContent, { title: 'Import Data Options' });
        
        modal.querySelector('#confirm-import').addEventListener('click', () => {
            const strategy = modal.querySelector('#import-strategy').value;
            const importClasses = modal.querySelector('#import-classes').checked;
            const importAttendance = modal.querySelector('#import-attendance').checked;
            const importTerms = modal.querySelector('#import-terms').checked;
            const importSettings = modal.querySelector('#import-settings').checked;
            
            this.performImport(importedData, {
                strategy,
                importClasses,
                importAttendance,
                importTerms,
                importSettings
            });
            
            modal.remove();
        });
        
        modal.querySelector('#cancel-import').addEventListener('click', () => {
            modal.remove();
        });
    }

    performImport(importedData, options) {
        let importedCount = 0;
        let skippedCount = 0;
        let replacedCount = 0;
        
        // Import classes
        if (options.importClasses && importedData.classes) {
            switch (options.strategy) {
                case 'replace':
                    this.app.state.classes = importedData.classes;
                    replacedCount += this.app.state.classes.length;
                    break;
                    
                case 'merge':
                    importedData.classes.forEach(importedClass => {
                        const existingIndex = this.app.state.classes.findIndex(
                            c => c.classCode === importedClass.classCode && 
                                 c.yearGroup === importedClass.yearGroup
                        );
                        
                        if (existingIndex >= 0) {
                            this.app.state.classes[existingIndex] = importedClass;
                            replacedCount++;
                        } else {
                            this.app.state.classes.push(importedClass);
                            importedCount++;
                        }
                    });
                    break;
                    
                case 'add':
                    importedData.classes.forEach(importedClass => {
                        const exists = this.app.state.classes.some(
                            c => c.classCode === importedClass.classCode && 
                                 c.yearGroup === importedClass.yearGroup
                        );
                        
                        if (!exists) {
                            this.app.state.classes.push(importedClass);
                            importedCount++;
                        } else {
                            skippedCount++;
                        }
                    });
                    break;
            }
            
            Storage.set('gams_classes', this.app.state.classes);
        }
        
        // Import attendance records
        if (options.importAttendance && importedData.attendanceRecords) {
            switch (options.strategy) {
                case 'replace':
                    this.app.state.attendanceRecords = importedData.attendanceRecords;
                    replacedCount += this.app.state.attendanceRecords.length;
                    break;
                    
                case 'merge':
                    importedData.attendanceRecords.forEach(importedRecord => {
                        const existingIndex = this.app.state.attendanceRecords.findIndex(
                            r => r.date === importedRecord.date && 
                                 r.session === importedRecord.session &&
                                 r.classId === importedRecord.classId
                        );
                        
                        if (existingIndex >= 0) {
                            this.app.state.attendanceRecords[existingIndex] = importedRecord;
                            replacedCount++;
                        } else {
                            this.app.state.attendanceRecords.push(importedRecord);
                            importedCount++;
                        }
                    });
                    break;
                    
                case 'add':
                    importedData.attendanceRecords.forEach(importedRecord => {
                        const exists = this.app.state.attendanceRecords.some(
                            r => r.date === importedRecord.date && 
                                 r.session === importedRecord.session &&
                                 r.classId === importedRecord.classId
                        );
                        
                        if (!exists) {
                            this.app.state.attendanceRecords.push(importedRecord);
                            importedCount++;
                        } else {
                            skippedCount++;
                        }
                    });
                    break;
            }
            
            Storage.set('gams_attendance', this.app.state.attendanceRecords);
            
            // Recalculate cumulative data
            if (this.app.modules.attendance) {
                this.app.modules.attendance.calculateCumulativeData();
            }
        }
        
        // Import terms
        if (options.importTerms && importedData.terms) {
            switch (options.strategy) {
                case 'replace':
                    this.app.state.terms = importedData.terms;
                    replacedCount += this.app.state.terms.length;
                    break;
                    
                case 'merge':
                    importedData.terms.forEach(importedTerm => {
                        const existingIndex = this.app.state.terms.findIndex(
                            t => t.id === importedTerm.id
                        );
                        
                        if (existingIndex >= 0) {
                            this.app.state.terms[existingIndex] = importedTerm;
                            replacedCount++;
                        } else {
                            this.app.state.terms.push(importedTerm);
                            importedCount++;
                        }
                    });
                    break;
                    
                case 'add':
                    importedData.terms.forEach(importedTerm => {
                        const exists = this.app.state.terms.some(t => t.id === importedTerm.id);
                        
                        if (!exists) {
                            this.app.state.terms.push(importedTerm);
                            importedCount++;
                        } else {
                            skippedCount++;
                        }
                    });
                    break;
            }
            
            Storage.set('gams_terms', this.app.state.terms);
        }
        
        // Import settings
        if (options.importSettings && importedData.settings) {
            this.app.state.settings = { ...this.app.state.settings, ...importedData.settings };
            Storage.set('gams_settings', this.app.state.settings);
            importedCount++;
        }
        
        // Import cumulative data
        if (importedData.cumulativeData) {
            this.app.state.cumulativeData = { 
                ...this.app.state.cumulativeData, 
                ...importedData.cumulativeData 
            };
            Storage.set('gams_cumulative', this.app.state.cumulativeData);
        }
        
        // Import historical averages
        if (importedData.historicalAverages) {
            this.app.state.historicalAverages = { 
                ...this.app.state.historicalAverages, 
                ...importedData.historicalAverages 
            };
            Storage.set('gams_averages', this.app.state.historicalAverages);
        }
        
        // Show import summary
        const summary = [];
        if (importedCount > 0) summary.push(`${importedCount} imported`);
        if (replacedCount > 0) summary.push(`${replacedCount} replaced`);
        if (skippedCount > 0) summary.push(`${skippedCount} skipped`);
        
        this.app.showToast(`Import completed: ${summary.join(', ')}`, 'success');
        
        // Refresh affected pages
        if (options.importClasses && this.app.modules.setup) {
            this.app.modules.setup.renderClasses();
        }
        
        if (options.importTerms) {
            this.renderTerms();
        }
    }

    clearAttendanceData() {
        if (confirm('Are you sure you want to clear all attendance history? This action cannot be undone.')) {
            this.app.state.attendanceRecords = [];
            this.app.state.cumulativeData = {};
            this.app.state.historicalAverages = {};
            
            Storage.set('gams_attendance', []);
            Storage.set('gams_cumulative', {});
            Storage.set('gams_averages', {});
            
            // Also clear daily attendance from localStorage
            const today = Utils.formatDate(new Date());
            Storage.remove(`gams_att_am_${today}`);
            Storage.remove(`gams_att_pm_${today}`);
            
            this.app.showToast('Attendance history cleared', 'warning');
        }
    }

    // Database maintenance functions
    async compactDatabase() {
        // Remove duplicate records
        const uniqueRecords = [];
        const seen = new Set();
        
        this.app.state.attendanceRecords.forEach(record => {
            const key = `${record.date}-${record.session}-${record.classId}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueRecords.push(record);
            }
        });
        
        this.app.state.attendanceRecords = uniqueRecords;
        Storage.set('gams_attendance', uniqueRecords);
        
        this.app.showToast(`Database compacted: ${this.app.state.attendanceRecords.length} unique records`, 'success');
    }

        async validateData() {
        const issues = [];
        let classesChecked = 0;
        let recordsChecked = 0;
        let termsChecked = 0;

        // Validate classes
        this.app.state.classes.forEach((cls, index) => {
            classesChecked++;
            const errors = [];
            
            if (!cls.classCode?.trim()) {
                errors.push('Missing class code');
            }
            
            if (!cls.subject?.trim()) {
                errors.push('Missing subject');
            }
            
            if (!cls.yearGroup || cls.yearGroup < 1 || cls.yearGroup > 13) {
                errors.push('Invalid year group');
            }
            
            if (!cls.teacherName?.trim()) {
                errors.push('Missing teacher name');
            }
            
            if (cls.studentCount < 0 || cls.studentCount > 100) {
                errors.push('Invalid student count');
            }
            
            if (!cls.room?.trim()) {
                errors.push('Missing room');
            }
            
            if (errors.length > 0) {
                issues.push({
                    type: 'class',
                    index: index,
                    id: cls.classCode,
                    errors: errors,
                    data: cls
                });
            }
        });

        // Validate attendance records
        this.app.state.attendanceRecords.forEach((record, index) => {
            recordsChecked++;
            const errors = [];
            
            if (!record.date || !Utils.isValidDate(record.date)) {
                errors.push('Invalid date');
            }
            
            if (!['AM', 'PM'].includes(record.session)) {
                errors.push('Invalid session');
            }
            
            if (!record.classId || typeof record.classId !== 'string') {
                errors.push('Invalid class ID');
            }
            
            if (typeof record.present !== 'number' || record.present < 0) {
                errors.push('Invalid present count');
            }
            
            if (typeof record.absent !== 'number' || record.absent < 0) {
                errors.push('Invalid absent count');
            }
            
            if (typeof record.late !== 'number' || record.late < 0) {
                errors.push('Invalid late count');
            }
            
            // Check if class exists
            const classExists = this.app.state.classes.some(cls => cls.id === record.classId);
            if (!classExists) {
                errors.push('Referenced class not found');
            }
            
            // Check if date is in future
            const recordDate = new Date(record.date);
            if (recordDate > new Date()) {
                errors.push('Date is in future');
            }
            
            if (errors.length > 0) {
                issues.push({
                    type: 'attendance',
                    index: index,
                    date: record.date,
                    classId: record.classId,
                    errors: errors,
                    data: record
                });
            }
        });

        // Validate terms
        this.app.state.terms.forEach((term, index) => {
            termsChecked++;
            const errors = [];
            
            if (!term.id || !term.name?.trim()) {
                errors.push('Missing term ID or name');
            }
            
            if (!term.startDate || !Utils.isValidDate(term.startDate)) {
                errors.push('Invalid start date');
            }
            
            if (!term.endDate || !Utils.isValidDate(term.endDate)) {
                errors.push('Invalid end date');
            }
            
            const startDate = new Date(term.startDate);
            const endDate = new Date(term.endDate);
            
            if (endDate <= startDate) {
                errors.push('End date must be after start date');
            }
            
            if (typeof term.weeks !== 'number' || term.weeks < 1 || term.weeks > 20) {
                errors.push('Invalid number of weeks');
            }
            
            // Check for overlapping terms
            const overlappingTerm = this.app.state.terms.find((t, i) => {
                if (i === index) return false;
                const tStart = new Date(t.startDate);
                const tEnd = new Date(t.endDate);
                return (startDate <= tEnd && endDate >= tStart);
            });
            
            if (overlappingTerm) {
                errors.push(`Overlaps with ${overlappingTerm.name}`);
            }
            
            if (errors.length > 0) {
                issues.push({
                    type: 'term',
                    index: index,
                    name: term.name,
                    errors: errors,
                    data: term
                });
            }
        });

        // Validate cumulative data structure
        if (this.app.state.cumulativeData) {
            Object.entries(this.app.state.cumulativeData).forEach(([classId, data]) => {
                if (!this.app.state.classes.some(cls => cls.id === classId)) {
                    issues.push({
                        type: 'cumulative',
                        classId: classId,
                        errors: ['Referenced class not found'],
                        data: data
                    });
                }
            });
        }

        // Show validation results
        const modalContent = `
            <div class="validation-results">
                <h4>Data Validation Results</h4>
                
                <div class="validation-summary">
                    <div class="summary-item">
                        <span class="summary-label">Classes checked:</span>
                        <span class="summary-value ${issues.filter(i => i.type === 'class').length === 0 ? 'valid' : 'invalid'}">
                            ${classesChecked} (${issues.filter(i => i.type === 'class').length} issues)
                        </span>
                    </div>
                    
                    <div class="summary-item">
                        <span class="summary-label">Records checked:</span>
                        <span class="summary-value ${issues.filter(i => i.type === 'attendance').length === 0 ? 'valid' : 'invalid'}">
                            ${recordsChecked} (${issues.filter(i => i.type === 'attendance').length} issues)
                        </span>
                    </div>
                    
                    <div class="summary-item">
                        <span class="summary-label">Terms checked:</span>
                        <span class="summary-value ${issues.filter(i => i.type === 'term').length === 0 ? 'valid' : 'invalid'}">
                            ${termsChecked} (${issues.filter(i => i.type === 'term').length} issues)
                        </span>
                    </div>
                    
                    <div class="summary-total ${issues.length === 0 ? 'all-valid' : 'has-issues'}">
                        <i class="fas ${issues.length === 0 ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                        ${issues.length === 0 ? 'All data is valid!' : `Found ${issues.length} issues`}
                    </div>
                </div>
                
                ${issues.length > 0 ? `
                    <div class="issues-list">
                        <h5>Issues Found:</h5>
                        ${issues.map((issue, idx) => `
                            <div class="issue-item">
                                <div class="issue-header">
                                    <span class="issue-type">${issue.type.toUpperCase()}</span>
                                    <span class="issue-id">${issue.name || issue.classId || issue.id || `#${idx + 1}`}</span>
                                </div>
                                <div class="issue-errors">
                                    ${issue.errors.map(error => `
                                        <div class="error-item">
                                            <i class="fas fa-exclamation-circle"></i>
                                            ${error}
                                        </div>
                                    `).join('')}
                                </div>
                                ${issue.data ? `
                                    <div class="issue-data">
                                        <small>Data: ${JSON.stringify(issue.data).substring(0, 100)}...</small>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="validation-actions">
                        <button type="button" class="btn btn-danger" id="auto-fix-issues">
                            <i class="fas fa-magic"></i> Auto-fix Common Issues
                        </button>
                        <button type="button" class="btn btn-warning" id="export-issues">
                            <i class="fas fa-download"></i> Export Issues Report
                        </button>
                    </div>
                ` : ''}
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="close-validation">Close</button>
                </div>
            </div>
        `;

        const modal = Utils.showModal(modalContent, { title: 'Data Validation', width: '800px' });
        
        if (issues.length > 0) {
            modal.querySelector('#auto-fix-issues').addEventListener('click', () => {
                this.autoFixIssues(issues);
                modal.remove();
            });
            
            modal.querySelector('#export-issues').addEventListener('click', () => {
                this.exportIssuesReport(issues, { classesChecked, recordsChecked, termsChecked });
            });
        }
        
        modal.querySelector('#close-validation').addEventListener('click', () => {
            modal.remove();
        });
    }

    autoFixIssues(issues) {
        let fixedCount = 0;
        let removedCount = 0;
        
        // Fix class issues
        const classIssues = issues.filter(i => i.type === 'class');
        classIssues.forEach(issue => {
            const cls = this.app.state.classes[issue.index];
            if (cls) {
                // Fix common issues
                if (!cls.classCode?.trim()) {
                    cls.classCode = `CLASS_${Date.now()}`;
                    fixedCount++;
                }
                
                if (!cls.subject?.trim()) {
                    cls.subject = 'Unknown';
                    fixedCount++;
                }
                
                if (!cls.teacherName?.trim()) {
                    cls.teacherName = 'Unknown Teacher';
                    fixedCount++;
                }
                
                if (cls.studentCount < 0) {
                    cls.studentCount = 0;
                    fixedCount++;
                } else if (cls.studentCount > 100) {
                    cls.studentCount = 100;
                    fixedCount++;
                }
                
                if (!cls.room?.trim()) {
                    cls.room = 'TBA';
                    fixedCount++;
                }
            }
        });
        
        // Fix attendance record issues
        const attendanceIssues = issues.filter(i => i.type === 'attendance');
        const recordsToKeep = [];
        
        this.app.state.attendanceRecords.forEach((record, index) => {
            const issue = attendanceIssues.find(i => i.index === index);
            
            if (issue) {
                // Check if it's a fixable issue
                const isFixable = !issue.errors.some(error => 
                    error.includes('Referenced class not found') || 
                    error.includes('Date is in future')
                );
                
                if (isFixable) {
                    // Fix common issues
                    if (!['AM', 'PM'].includes(record.session)) {
                        record.session = 'AM';
                        fixedCount++;
                    }
                    
                    if (record.present < 0) record.present = 0;
                    if (record.absent < 0) record.absent = 0;
                    if (record.late < 0) record.late = 0;
                    
                    recordsToKeep.push(record);
                    fixedCount++;
                } else {
                    removedCount++;
                }
            } else {
                recordsToKeep.push(record);
            }
        });
        
        this.app.state.attendanceRecords = recordsToKeep;
        
        // Fix term issues
        const termIssues = issues.filter(i => i.type === 'term');
        termIssues.forEach(issue => {
            const term = this.app.state.terms[issue.index];
            if (term) {
                if (!term.name?.trim()) {
                    term.name = `Term ${issue.index + 1}`;
                    fixedCount++;
                }
                
                if (term.weeks < 1) {
                    term.weeks = 14;
                    fixedCount++;
                } else if (term.weeks > 20) {
                    term.weeks = 20;
                    fixedCount++;
                }
            }
        });
        
        // Save all changes
        Storage.set('gams_classes', this.app.state.classes);
        Storage.set('gams_attendance', this.app.state.attendanceRecords);
        Storage.set('gams_terms', this.app.state.terms);
        
        // Recalculate cumulative data
        if (this.app.modules.attendance) {
            this.app.modules.attendance.calculateCumulativeData();
        }
        
        // Show results
        const results = [];
        if (fixedCount > 0) results.push(`${fixedCount} issues fixed`);
        if (removedCount > 0) results.push(`${removedCount} invalid records removed`);
        
        this.app.showToast(`Auto-fix completed: ${results.join(', ')}`, 'success');
    }

    exportIssuesReport(issues, stats) {
        const report = {
            title: 'Attendance System Data Validation Report',
            generated: new Date().toISOString(),
            statistics: stats,
            issues: issues.map(issue => ({
                type: issue.type,
                identifier: issue.name || issue.classId || issue.id,
                errors: issue.errors,
                data: issue.data
            })),
            summary: {
                totalIssues: issues.length,
                byType: {
                    class: issues.filter(i => i.type === 'class').length,
                    attendance: issues.filter(i => i.type === 'attendance').length,
                    term: issues.filter(i => i.type === 'term').length
                }
            }
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `validation-report-${Utils.formatDate(new Date())}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.app.showToast('Issues report exported', 'success');
    }

    // Statistics and reporting
    async generateSystemReport() {
        const report = {
            generated: new Date().toISOString(),
            system: {
                version: '2.0.0',
                lastSync: this.app.state.lastSync || 'Never',
                isOnline: this.app.state.isOnline,
                storageUsed: await this.calculateStorageUsage()
            },
            data: {
                classes: {
                    total: this.app.state.classes.length,
                    byYearGroup: this.groupByYearGroup(),
                    bySubject: this.groupBySubject()
                },
                attendance: {
                    totalRecords: this.app.state.attendanceRecords.length,
                    recordsByMonth: this.getRecordsByMonth(),
                    averageAttendance: this.calculateOverallAverage()
                },
                terms: {
                    total: this.app.state.terms.length,
                    active: this.app.state.terms.filter(t => t.isActive).length,
                    upcoming: this.getUpcomingTerms()
                }
            },
            performance: {
                databaseSize: this.app.state.attendanceRecords.length * 100, // Approximate
                lastBackup: Storage.get('last_backup_date') || 'Never',
                syncStatus: this.checkSyncStatus()
            }
        };
        
        // Show report in modal
        this.showSystemReport(report);
    }

    async calculateStorageUsage() {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    percentage: (estimate.usage / estimate.quota * 100).toFixed(2)
                };
            } catch (error) {
                console.error('Storage estimate error:', error);
            }
        }
        return null;
    }

    groupByYearGroup() {
        const groups = {};
        this.app.state.classes.forEach(cls => {
            const year = cls.yearGroup || 'Unknown';
            groups[year] = (groups[year] || 0) + 1;
        });
        return groups;
    }

    groupBySubject() {
        const subjects = {};
        this.app.state.classes.forEach(cls => {
            const subject = cls.subject || 'Unknown';
            subjects[subject] = (subjects[subject] || 0) + 1;
        });
        return subjects;
    }

    getRecordsByMonth() {
        const months = {};
        this.app.state.attendanceRecords.forEach(record => {
            if (record.date) {
                const month = record.date.substring(0, 7); // YYYY-MM
                months[month] = (months[month] || 0) + 1;
            }
        });
        return months;
    }

    calculateOverallAverage() {
        if (this.app.state.attendanceRecords.length === 0) return 0;
        
        let totalPresent = 0;
        let totalPossible = 0;
        
        this.app.state.attendanceRecords.forEach(record => {
            totalPresent += record.present || 0;
            totalPossible += (record.present || 0) + (record.absent || 0);
        });
        
        return totalPossible > 0 ? (totalPresent / totalPossible * 100).toFixed(1) : 0;
    }

    getUpcomingTerms() {
        const now = new Date();
        return this.app.state.terms.filter(term => {
            const startDate = new Date(term.startDate);
            return startDate > now;
        }).map(term => ({
            name: term.name,
            startDate: term.startDate,
            weeks: term.weeks
        }));
    }

    checkSyncStatus() {
        const lastSync = this.app.state.lastSync;
        if (!lastSync) return 'never';
        
        const lastSyncDate = new Date(lastSync);
        const now = new Date();
        const hoursDiff = (now - lastSyncDate) / (1000 * 60 * 60);
        
        if (hoursDiff < 1) return 'recent';
        if (hoursDiff < 24) return 'today';
        if (hoursDiff < 168) return 'this_week';
        return 'old';
    }

    showSystemReport(report) {
        const modalContent = `
            <div class="system-report">
                <h4>System Report</h4>
                <p class="report-date">Generated: ${Utils.formatDate(new Date(report.generated))}</p>
                
                <div class="report-section">
                    <h5><i class="fas fa-server"></i> System Status</h5>
                    <div class="status-grid">
                        <div class="status-item ${report.system.isOnline ? 'online' : 'offline'}">
                            <span>Connection:</span>
                            <strong>${report.system.isOnline ? 'Online' : 'Offline'}</strong>
                        </div>
                        <div class="status-item">
                            <span>Last Sync:</span>
                            <strong>${report.system.lastSync === 'Never' ? 'Never' : Utils.formatDate(new Date(report.system.lastSync))}</strong>
                        </div>
                    </div>
                </div>
                
                <div class="report-section">
                    <h5><i class="fas fa-chart-bar"></i> Data Statistics</h5>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${report.data.classes.total}</div>
                            <div class="stat-label">Classes</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${report.data.attendance.totalRecords}</div>
                            <div class="stat-label">Records</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${report.data.terms.active}</div>
                            <div class="stat-label">Active Terms</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${report.data.attendance.averageAttendance}%</div>
                            <div class="stat-label">Avg. Attendance</div>
                        </div>
                    </div>
                </div>
                
                <div class="report-section">
                    <h5><i class="fas fa-database"></i> Storage</h5>
                    ${report.system.storageUsed ? `
                        <div class="storage-info">
                            <div class="storage-bar">
                                <div class="storage-fill" style="width: ${report.system.storageUsed.percentage}%"></div>
                            </div>
                            <div class="storage-text">
                                ${(report.system.storageUsed.usage / 1024 / 1024).toFixed(2)} MB / 
                                ${(report.system.storageUsed.quota / 1024 / 1024).toFixed(2)} MB
                                (${report.system.storageUsed.percentage}%)
                            </div>
                        </div>
                    ` : '<p>Storage information not available</p>'}
                </div>
                
                <div class="report-actions">
                    <button type="button" class="btn btn-primary" id="export-report">
                        <i class="fas fa-download"></i> Export Report
                    </button>
                    <button type="button" class="btn btn-secondary" id="close-report">
                        Close
                    </button>
                </div>
            </div>
        `;

        const modal = Utils.showModal(modalContent, { title: 'System Report', width: '600px' });
        
        modal.querySelector('#export-report').addEventListener('click', () => {
            this.exportReport(report);
        });
        
        modal.querySelector('#close-report').addEventListener('click', () => {
            modal.remove();
        });
    }

    exportReport(report) {
        const formattedReport = {
            ...report,
            generated: Utils.formatDate(new Date(report.generated), 'full'),
            formattedData: {
                ...report.data,
                attendance: {
                    ...report.data.attendance,
                    averageAttendance: `${report.data.attendance.averageAttendance}%`
                }
            }
        };
        
        const blob = new Blob([JSON.stringify(formattedReport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `system-report-${Utils.formatDate(new Date())}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.app.showToast('System report exported', 'success');
    }

    // Clean up old data
    async cleanupOldData() {
        const modalContent = `
            <div class="cleanup-options">
                <h4>Data Cleanup</h4>
                <p>Select which old data to clean up:</p>
                
                <div class="cleanup-option">
                    <label>
                        <input type="checkbox" id="cleanup-old-records" checked>
                        Remove attendance records older than 3 years
                        <small>(${this.getOldRecordsCount(3)} records)</small>
                    </label>
                </div>
                
                <div class="cleanup-option">
                    <label>
                        <input type="checkbox" id="cleanup-inactive-classes">
                        Remove classes that haven't had attendance in 2 years
                        <small>(${this.getInactiveClassesCount(2)} classes)</small>
                    </label>
                </div>
                
                <div class="cleanup-option">
                    <label>
                        <input type="checkbox" id="cleanup-completed-terms">
                        Archive completed terms
                        <small>(${this.getCompletedTermsCount()} terms)</small>
                    </label>
                </div>
                
                <div class="cleanup-option">
                    <label>
                        <input type="checkbox" id="cleanup-temp-files">
                        Clear temporary files and cache
                    </label>
                </div>
                
                <div class="cleanup-preview">
                    <h5>What will be removed:</h5>
                    <div id="cleanup-preview-content"></div>
                </div>
                
                <div class="cleanup-warning">
                    <p><i class="fas fa-exclamation-triangle"></i> This action cannot be undone. Make sure to backup your data first.</p>
                </div>
                
                <div class="cleanup-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-cleanup">Cancel</button>
                    <button type="button" class="btn btn-warning" id="preview-cleanup">Preview</button>
                    <button type="button" class="btn btn-danger" id="execute-cleanup">Execute Cleanup</button>
                </div>
            </div>
        `;

        const modal = Utils.showModal(modalContent, { title: 'Data Cleanup' });
        
        const previewContent = modal.querySelector('#cleanup-preview-content');
        
        modal.querySelector('#preview-cleanup').addEventListener('click', () => {
            this.previewCleanup(modal, previewContent);
        });
        
        modal.querySelector('#execute-cleanup').addEventListener('click', () => {
            if (confirm('Are you sure you want to execute the cleanup? This cannot be undone.')) {
                this.executeCleanup(modal);
                modal.remove();
            }
        });
        
        modal.querySelector('#cancel-cleanup').addEventListener('click', () => {
            modal.remove();
        });
    }

    getOldRecordsCount(years) {
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - years);
        
        return this.app.state.attendanceRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate < cutoffDate;
        }).length;
    }

    getInactiveClassesCount(years) {
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - years);
        
        const activeClassIds = new Set(
            this.app.state.attendanceRecords
                .filter(record => {
                    const recordDate = new Date(record.date);
                    return recordDate >= cutoffDate;
                })
                .map(record => record.classId)
        );
        
        return this.app.state.classes.filter(cls => !activeClassIds.has(cls.id)).length;
    }

    getCompletedTermsCount() {
        const now = new Date();
        return this.app.state.terms.filter(term => {
            const endDate = new Date(term.endDate);
            return endDate < now;
        }).length;
    }

    previewCleanup(modal, previewElement) {
        const cleanupOldRecords = modal.querySelector('#cleanup-old-records').checked;
        const cleanupInactiveClasses = modal.querySelector('#cleanup-inactive-classes').checked;
        const cleanupCompletedTerms = modal.querySelector('#cleanup-completed-terms').checked;
        const cleanupTempFiles = modal.querySelector('#cleanup-temp-files').checked;
        
        let preview = '<ul>';
        
        if (cleanupOldRecords) {
            const oldRecordsCount = this.getOldRecordsCount(3);
            preview += `<li>Remove ${oldRecordsCount} attendance records older than 3 years</li>`;
        }
        
        if (cleanupInactiveClasses) {
            const inactiveClassesCount = this.getInactiveClassesCount(2);
            preview += `<li>Remove ${inactiveClassesCount} inactive classes</li>`;
        }
        
        if (cleanupCompletedTerms) {
            const completedTermsCount = this.getCompletedTermsCount();
            preview += `<li>Archive ${completedTermsCount} completed terms</li>`;
        }
        
        if (cleanupTempFiles) {
            preview += `<li>Clear temporary files and cache</li>`;
        }
        
        preview += '</ul>';
        
        previewElement.innerHTML = preview;
    }

    executeCleanup(modal) {
        let removedRecords = 0;
        let removedClasses = 0;
        let archivedTerms = 0;
        
        const cleanupOldRecords = modal.querySelector('#cleanup-old-records').checked;
        const cleanupInactiveClasses = modal.querySelector('#cleanup-inactive-classes').checked;
        const cleanupCompletedTerms = modal.querySelector('#cleanup-completed-terms').checked;
        const cleanupTempFiles = modal.querySelector('#cleanup-temp-files').checked;
        
        // Remove old records
        if (cleanupOldRecords) {
            const cutoffDate = new Date();
            cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
            
            const oldRecords = this.app.state.attendanceRecords.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= cutoffDate;
            });
            
            removedRecords = this.app.state.attendanceRecords.length - oldRecords.length;
            this.app.state.attendanceRecords = oldRecords;
            Storage.set('gams_attendance', oldRecords);
        }
        
        // Remove inactive classes
        if (cleanupInactiveClasses) {
            const cutoffDate = new Date();
            cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
            
            const activeClassIds = new Set(
                this.app.state.attendanceRecords
                    .filter(record => {
                        const recordDate = new Date(record.date);
                        return recordDate >= cutoffDate;
                    })
                    .map(record => record.classId)
            );
            
            const activeClasses = this.app.state.classes.filter(cls => activeClassIds.has(cls.id));
            
            removedClasses = this.app.state.classes.length - activeClasses.length;
            this.app.state.classes = activeClasses;
            Storage.set('gams_classes', activeClasses);
        }
        
        // Archive completed terms
        if (cleanupCompletedTerms) {
            const now = new Date();
            const archivedTerms = [];
            const activeTerms = [];
            
            this.app.state.terms.forEach(term => {
                const endDate = new Date(term.endDate);
                if (endDate < now) {
                    term.isActive = false;
                    archivedTerms.push(term);
                    archivedTerms++;
                } else {
                    activeTerms.push(term);
                }
            });
            
            // Optionally move archived terms to separate storage
            const existingArchived = Storage.get('gams_archived_terms') || [];
            Storage.set('gams_archived_terms', [...existingArchived, ...archivedTerms]);
            
            this.app.state.terms = activeTerms;
            Storage.set('gams_terms', activeTerms);
        }
        
        // Clear temporary files
        if (cleanupTempFiles) {
            // Clear localStorage items that start with 'temp_' or 'cache_'
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('temp_') || key.startsWith('cache_')) {
                    localStorage.removeItem(key);
                }
            });
            
            // Clear sessionStorage
            sessionStorage.clear();
        }
        
        // Recalculate cumulative data
        if (this.app.modules.attendance) {
            this.app.modules.attendance.calculateCumulativeData();
        }
        
        // Show results
        const results = [];
        if (removedRecords > 0) results.push(`${removedRecords} old records removed`);
        if (removedClasses > 0) results.push(`${removedClasses} inactive classes removed`);
        if (archivedTerms > 0) results.push(`${archivedTerms} terms archived`);
        if (cleanupTempFiles) results.push('Temporary files cleared');
        
        this.app.showToast(`Cleanup completed: ${results.join(', ')}`, 'success');
    }
}
        
       
