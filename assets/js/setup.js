import { Utils, Storage } from './utils.js';

export class SetupModule {
    constructor(app) {
        this.app = app;
        this.yearGroups = [
            '1st Years', '2nd Years', '3rd Years', 
            '4th Years', 'L5th Years', 'U5th Years'
        ];
    }

    async init() {
        await this.loadSetupPage();
        this.setupEventListeners();
        this.renderClasses();
    }

    async loadSetupPage() {
        try {
            // The setup page is already loaded via navigation
            // Just ensure the container exists
            const container = document.getElementById('setup-container');
            if (!container) {
                throw new Error('Setup container not found');
            }
        } catch (error) {
            console.error('Error loading setup page:', error);
        }
    }

    renderClasses() {
        const container = document.getElementById('setup-container');
        if (!container) return;

        let html = '';
        
        this.yearGroups.forEach(yearGroup => {
            const shortName = yearGroup.split(' ')[0];
            const yearClasses = this.app.state.classes.filter(cls => cls.yearGroup === yearGroup);
            
            html += `
                <div class="year-groups-section">
                    <h3>${yearGroup}</h3>
                    <div data-year="${shortName}" class="classes-container">
            `;
            
            yearClasses.forEach(cls => {
                html += this.createClassInputHTML(cls, shortName);
            });
            
            if (yearClasses.length === 0) {
                html += this.createClassInputHTML({}, shortName);
            }
            
            html += `
                    </div>
                    <button type="button" class="btn btn-secondary add-class-btn" data-year="${shortName}">
                        <i class="fas fa-plus"></i> Add Class
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Setup event listeners for the newly created elements
        this.setupClassEventListeners();
    }

    createClassInputHTML(cls, yearGroup) {
        const classCode = cls.classCode || '';
        const males = cls.totalMales || '';
        const females = cls.totalFemales || '';
        const total = (parseInt(males) || 0) + (parseInt(females) || 0);
        
        return `
            <div class="class-input-group">
                <input type="text" class="form-control class-code" 
                       value="${classCode}" 
                       placeholder="Class Code (e.g., 1GRAN)" 
                       required>
                <input type="number" class="form-control male-count" 
                       value="${males}" 
                       min="0" 
                       placeholder="Males" 
                       required>
                <input type="number" class="form-control female-count" 
                       value="${females}" 
                       min="0" 
                       placeholder="Females" 
                       required>
                <span class="class-size">Total: <span class="total-count">${total}</span></span>
                <button type="button" class="btn btn-success btn-sm save-single-class" 
                        data-year="${yearGroup}">
                    <i class="fas fa-check"></i> Save
                </button>
                <button type="button" class="btn btn-danger btn-sm remove-class">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        document.addEventListener('click', async (e) => {
            if (e.target.matches('#save-all-classes')) {
                await this.saveAllClasses();
            } else if (e.target.matches('#reset-classes')) {
                this.resetClasses();
            }
        });
    }

    setupClassEventListeners() {
        // Add class buttons
        document.querySelectorAll('.add-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const yearGroup = e.target.getAttribute('data-year');
                const container = document.querySelector(`[data-year="${yearGroup}"]`);
                
                if (container) {
                    const html = this.createClassInputHTML({}, yearGroup);
                    container.insertAdjacentHTML('beforeend', html);
                    
                    // Setup listeners for the new input group
                    const newGroup = container.lastElementChild;
                    this.attachClassInputListeners(newGroup);
                }
            });
        });

        // Setup listeners for existing class input groups
        document.querySelectorAll('.class-input-group').forEach(group => {
            this.attachClassInputListeners(group);
        });
    }

    attachClassInputListeners(group) {
        // Update total when male/female counts change
        const maleInput = group.querySelector('.male-count');
        const femaleInput = group.querySelector('.female-count');
        const totalSpan = group.querySelector('.total-count');
        
        const updateTotal = () => {
            const males = parseInt(maleInput.value) || 0;
            const females = parseInt(femaleInput.value) || 0;
            totalSpan.textContent = males + females;
        };
        
        maleInput.addEventListener('input', updateTotal);
        femaleInput.addEventListener('input', updateTotal);
        
        // Remove class button
        const removeBtn = group.querySelector('.remove-class');
        removeBtn.addEventListener('click', () => {
            if (group.querySelector('.class-code').value || 
                group.querySelector('.male-count').value || 
                group.querySelector('.female-count').value) {
                
                if (confirm('Remove this class?')) {
                    group.remove();
                }
            } else {
                group.remove();
            }
        });
        
        // Save single class button
        const saveBtn = group.querySelector('.save-single-class');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                const yearGroup = e.target.getAttribute('data-year');
                this.saveSingleClass(group, yearGroup);
            });
        }
    }

    async saveSingleClass(group, shortYearGroup) {
        const classCode = group.querySelector('.class-code').value.trim();
        const males = parseInt(group.querySelector('.male-count').value) || 0;
        const females = parseInt(group.querySelector('.female-count').value) || 0;
        
        if (!classCode) {
            this.app.showToast('Please enter a class code', 'error');
            return;
        }
        
        if (males < 0 || females < 0) {
            this.app.showToast('Counts cannot be negative', 'error');
            return;
        }
        
        const yearGroup = `${shortYearGroup} Years`;
        const classSize = males + females;
        
        const newClass = {
            id: Utils.generateId(),
            classCode: classCode,
            yearGroup: yearGroup,
            totalMales: males,
            totalFemales: females,
            classSize: classSize,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Check if class already exists
        const existingIndex = this.app.state.classes.findIndex(
            c => c.classCode === classCode && c.yearGroup === yearGroup
        );
        
        if (existingIndex >= 0) {
            // Update existing class
            this.app.state.classes[existingIndex] = {
                ...this.app.state.classes[existingIndex],
                ...newClass,
                updatedAt: new Date().toISOString()
            };
        } else {
            // Add new class
            this.app.state.classes.push(newClass);
        }
        
        // Save to localStorage
        Storage.set('gams_classes', this.app.state.classes);
        
        // Try to save to Google Sheets if online
        if (this.app.state.isOnline) {
            try {
                await this.saveToGoogleSheets();
                this.app.showToast(`Class ${classCode} saved to Google Sheets!`, 'success');
            } catch (error) {
                this.app.showToast(`Class saved locally (${error.message})`, 'warning');
            }
        } else {
            this.app.showToast(`Class ${classCode} saved successfully!`, 'success');
        }
        
        // Update UI
        group.querySelector('.class-code').style.borderColor = '#4caf50';
        setTimeout(() => {
            group.querySelector('.class-code').style.borderColor = '';
        }, 1000);
    }

    async saveAllClasses() {
        const classes = [];
        
        this.yearGroups.forEach(shortName => {
            const container = document.querySelector(`[data-year="${shortName}"]`);
            if (!container) return;
            
            container.querySelectorAll('.class-input-group').forEach(group => {
                const classCode = group.querySelector('.class-code').value.trim();
                const males = parseInt(group.querySelector('.male-count').value) || 0;
                const females = parseInt(group.querySelector('.female-count').value) || 0;
                
                if (classCode) {
                    classes.push({
                        id: Utils.generateId(),
                        classCode: classCode,
                        yearGroup: `${shortName} Years`,
                        totalMales: males,
                        totalFemales: females,
                        classSize: males + females,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }
            });
        });
        
        if (classes.length === 0) {
            this.app.showToast('No classes to save', 'warning');
            return;
        }
        
        // Update app state
        this.app.state.classes = classes;
        Storage.set('gams_classes', classes);
        
        // Try to save to Google Sheets if online
        if (this.app.state.isOnline) {
            try {
                await this.saveToGoogleSheets();
                this.app.showToast('All classes saved to Google Sheets!', 'success');
            } catch (error) {
                this.app.showToast(`Classes saved locally (${error.message})`, 'warning');
            }
        } else {
            this.app.showToast('All classes saved successfully!', 'success');
        }
        
        // Update other parts of the app
        if (this.app.modules.dashboard) {
            this.app.modules.dashboard.updateDashboard();
        }
    }

    async saveToGoogleSheets() {
        if (!this.app.state.isOnline || !this.app.state.settings.webAppUrl) {
            return false;
        }
        
        try {
            const url = new URL(this.app.state.settings.webAppUrl);
            url.searchParams.append('action', 'saveClasses');
            url.searchParams.append('classes', JSON.stringify(this.app.state.classes));
            
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
                throw new Error(data.error || 'Failed to save classes');
            }
            
            return data;
        } catch (error) {
            console.error('Google Sheets save error:', error);
            throw error;
        }
    }

    resetClasses() {
        if (confirm('Are you sure you want to reset all classes? This cannot be undone.')) {
            this.app.state.classes = [];
            Storage.remove('gams_classes');
            this.renderClasses();
            this.app.showToast('All classes have been reset', 'warning');
        }
    }

    importClassesFromCSV(csvText) {
        try {
            const lines = csvText.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            
            const codeIndex = headers.findIndex(h => h.includes('code') || h.includes('class'));
            const yearIndex = headers.findIndex(h => h.includes('year') || h.includes('form'));
            const maleIndex = headers.findIndex(h => h.includes('male') || h.includes('boy'));
            const femaleIndex = headers.findIndex(h => h.includes('female') || h.includes('girl'));
            const totalIndex = headers.findIndex(h => h.includes('total') || h.includes('size'));
            
            const importedClasses = [];
            
            for (let i = 1; i < lines.length; i++) {
                const cells = lines[i].split(',').map(c => c.trim());
                if (cells.length < Math.max(codeIndex, yearIndex, maleIndex, femaleIndex) + 1) {
                    continue;
                }
                
                const classCode = cells[codeIndex];
                const yearGroup = cells[yearIndex] || 'Unknown';
                const males = parseInt(cells[maleIndex]) || 0;
                const females = parseInt(cells[femaleIndex]) || 0;
                let total = parseInt(cells[totalIndex]) || 0;
                
                if (!classCode) continue;
                
                if (!total && (males > 0 || females > 0)) {
                    total = males + females;
                }
                
                importedClasses.push({
                    id: Utils.generateId(),
                    classCode: classCode,
                    yearGroup: yearGroup,
                    totalMales: males,
                    totalFemales: females,
                    classSize: total,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    imported: true
                });
            }
            
            // Merge with existing classes
            importedClasses.forEach(importedClass => {
                const existingIndex = this.app.state.classes.findIndex(
                    c => c.classCode === importedClass.classCode && 
                         c.yearGroup === importedClass.yearGroup
                );
                
                if (existingIndex >= 0) {
                    this.app.state.classes[existingIndex] = {
                        ...this.app.state.classes[existingIndex],
                        ...importedClass
                    };
                } else {
                    this.app.state.classes.push(importedClass);
                }
            });
            
            Storage.set('gams_classes', this.app.state.classes);
            this.renderClasses();
            
            this.app.showToast(`Imported ${importedClasses.length} classes`, 'success');
            return importedClasses.length;
        } catch (error) {
            console.error('CSV import error:', error);
            this.app.showToast('Failed to import CSV file', 'error');
            return 0;
        }
    }

    exportClassesToCSV() {
        if (this.app.state.classes.length === 0) {
            this.app.showToast('No classes to export', 'warning');
            return;
        }
        
        const headers = ['Class Code', 'Year Group', 'Males', 'Females', 'Total'];
        const rows = this.app.state.classes.map(cls => [
            cls.classCode,
            cls.yearGroup,
            cls.totalMales,
            cls.totalFemales,
            cls.classSize
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `classes-export-${Utils.formatDate(new Date())}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.app.showToast('Classes exported to CSV', 'success');
    }
}

export default SetupModule;
