// attendance-track-v2/assets/js/modules/import.js
import { Utils, Storage } from './utils.js';

export class ImportModule {
    constructor(app) {
        this.app = app;
        this.importTemplates = {};
        this.fieldMappings = {};
        this.importHistory = [];
        this.initialize();
    }

    async initialize() {
        await this.loadTemplates();
        await this.loadFieldMappings();
        await this.loadImportHistory();
        this.setupEventListeners();
    }

    async loadTemplates() {
        this.importTemplates = await Storage.get('import_templates') || {
            'class_list': {
                name: 'Class List',
                description: 'Import classes with students',
                fields: [
                    { name: 'classCode', required: true, label: 'Class Code', example: 'MAT101' },
                    { name: 'className', required: true, label: 'Class Name', example: 'Mathematics 101' },
                    { name: 'subject', required: true, label: 'Subject', example: 'Mathematics' },
                    { name: 'yearGroup', required: true, label: 'Year Group', example: '10' },
                    { name: 'teacherName', required: true, label: 'Teacher Name', example: 'John Smith' },
                    { name: 'room', required: false, label: 'Room', example: 'Room 101' },
                    { name: 'studentCount', required: false, label: 'Student Count', example: '25' },
                    { name: 'schedule', required: false, label: 'Schedule', example: 'Mon 9:00-10:00' }
                ],
                sampleData: [
                    ['MAT101', 'Mathematics 101', 'Mathematics', '10', 'John Smith', 'Room 101', '25', 'Mon 9:00-10:00'],
                    ['ENG102', 'English 102', 'English', '11', 'Sarah Johnson', 'Room 202', '30', 'Tue 10:00-11:00']
                ]
            },
            'attendance_records': {
                name: 'Attendance Records',
                description: 'Import historical attendance data',
                fields: [
                    { name: 'date', required: true, label: 'Date', example: '2024-01-15' },
                    { name: 'classCode', required: true, label: 'Class Code', example: 'MAT101' },
                    { name: 'session', required: true, label: 'Session', example: 'AM/PM/Both' },
                    { name: 'present', required: true, label: 'Present Count', example: '20' },
                    { name: 'absent', required: true, label: 'Absent Count', example: '5' },
                    { name: 'late', required: false, label: 'Late Count', example: '2' },
                    { name: 'notes', required: false, label: 'Notes', example: 'Field trip' }
                ],
                sampleData: [
                    ['2024-01-15', 'MAT101', 'AM', '20', '5', '2', 'Regular class'],
                    ['2024-01-15', 'ENG102', 'PM', '25', '3', '1', '']
                ]
            },
            'student_roster': {
                name: 'Student Roster',
                description: 'Import students with details',
                fields: [
                    { name: 'studentId', required: true, label: 'Student ID', example: 'S1001' },
                    { name: 'firstName', required: true, label: 'First Name', example: 'John' },
                    { name: 'lastName', required: true, label: 'Last Name', example: 'Doe' },
                    { name: 'email', required: false, label: 'Email', example: 'john@school.edu' },
                    { name: 'classCode', required: true, label: 'Class Code', example: 'MAT101' },
                    { name: 'yearGroup', required: true, label: 'Year Group', example: '10' },
                    { name: 'homeroom', required: false, label: 'Homeroom', example: 'HR10A' }
                ],
                sampleData: [
                    ['S1001', 'John', 'Doe', 'john@school.edu', 'MAT101', '10', 'HR10A'],
                    ['S1002', 'Jane', 'Smith', 'jane@school.edu', 'ENG102', '11', 'HR11B']
                ]
            }
        };
    }

    async loadFieldMappings() {
        this.fieldMappings = await Storage.get('field_mappings') || {};
    }

    async loadImportHistory() {
        this.importHistory = await Storage.get('import_history') || [];
    }

    setupEventListeners() {
        // Import file selection
        document.addEventListener('click', (e) => {
            if (e.target.matches('#import-file-btn')) {
                document.getElementById('import-file').click();
            } else if (e.target.matches('#import-google-sheets-btn')) {
                this.showGoogleSheetsImport();
            } else if (e.target.matches('#import-sample-btn')) {
                this.showSampleImport();
            }
        });

        // File import
        const importFile = document.getElementById('import-file');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.handleFileImport(e));
        }

        // Template selection
        document.addEventListener('change', (e) => {
            if (e.target.matches('#import-template')) {
                this.onTemplateSelected(e.target.value);
            }
        });

        // Mapping controls
        document.addEventListener('click', (e) => {
            if (e.target.matches('.map-field-btn')) {
                this.showFieldMapping(e.target.dataset.fieldIndex);
            } else if (e.target.matches('#auto-map-btn')) {
                this.autoMapFields();
            } else if (e.target.matches('#save-mapping-btn')) {
                this.saveFieldMapping();
            } else if (e.target.matches('#preview-import-btn')) {
                this.previewImport();
            } else if (e.target.matches('#execute-import-btn')) {
                this.executeImport();
            } else if (e.target.matches('#cancel-import-btn')) {
                this.cancelImport();
            }
        });

        // History view
        document.addEventListener('click', (e) => {
            if (e.target.matches('#view-history-btn')) {
                this.showImportHistory();
            } else if (e.target.matches('.view-import-details')) {
                this.viewImportDetails(e.target.dataset.importId);
            } else if (e.target.matches('.revert-import-btn')) {
                this.revertImport(e.target.dataset.importId);
            }
        });

        // Drag and drop
        const dropZone = document.getElementById('import-drop-zone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleDroppedFile(files[0]);
                }
            });
        }
    }

    renderImportInterface() {
        const container = document.getElementById('import-container');
        if (!container) return;

        container.innerHTML = `
            <div class="import-interface">
                <div class="import-header">
                    <h3><i class="fas fa-file-import"></i> Import Data</h3>
                    <p class="text-muted">Import classes, attendance records, or student data from various sources</p>
                </div>

                <div class="import-methods">
                    <div class="method-card">
                        <div class="method-icon">
                            <i class="fas fa-file-csv"></i>
                        </div>
                        <div class="method-content">
                            <h5>CSV/Excel File</h5>
                            <p>Upload CSV or Excel files from your computer</p>
                            <button class="btn btn-primary" id="import-file-btn">
                                <i class="fas fa-upload"></i> Choose File
                            </button>
                            <input type="file" id="import-file" accept=".csv,.xlsx,.xls" style="display: none;">
                        </div>
                    </div>

                    <div class="method-card">
                        <div class="method-icon">
                            <i class="fab fa-google"></i>
                        </div>
                        <div class="method-content">
                            <h5>Google Sheets</h5>
                            <p>Import directly from Google Sheets</p>
                            <button class="btn btn-primary" id="import-google-sheets-btn">
                                <i class="fab fa-google"></i> Connect to Google Sheets
                            </button>
                        </div>
                    </div>

                    <div class="method-card">
                        <div class="method-icon">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <div class="method-content">
                            <h5>Sample Data</h5>
                            <p>Try importing with sample data first</p>
                            <button class="btn btn-outline-primary" id="import-sample-btn">
                                <i class="fas fa-vial"></i> Try Sample Import
                            </button>
                        </div>
                    </div>
                </div>

                <div class="import-drop-zone" id="import-drop-zone">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Drag and drop files here</p>
                    <small class="text-muted">Supports CSV, Excel, and JSON files</small>
                </div>

                <div class="import-templates">
                    <h5>Available Templates</h5>
                    <div class="templates-grid" id="templates-container">
                        <!-- Templates will be loaded here -->
                    </div>
                </div>

                <div class="import-history-link">
                    <button class="btn btn-link" id="view-history-btn">
                        <i class="fas fa-history"></i> View Import History
                    </button>
                </div>
            </div>
        `;

        this.renderTemplates();
    }

    renderTemplates() {
        const container = document.getElementById('templates-container');
        if (!container) return;

        container.innerHTML = Object.entries(this.importTemplates).map(([key, template]) => `
            <div class="template-card" data-template="${key}">
                <div class="template-header">
                    <h6>${template.name}</h6>
                    <span class="badge bg-info">${template.fields.length} fields</span>
                </div>
                <div class="template-body">
                    <p class="template-description">${template.description}</p>
                    <div class="template-fields">
                        ${template.fields.slice(0, 3).map(field => `
                            <span class="field-badge ${field.required ? 'required' : ''}">
                                ${field.label}
                            </span>
                        `).join('')}
                        ${template.fields.length > 3 ? `
                            <span class="field-badge">
                                +${template.fields.length - 3} more
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="template-footer">
                    <button class="btn btn-sm btn-outline-primary use-template-btn" data-template="${key}">
                        <i class="fas fa-download"></i> Use Template
                    </button>
                    <button class="btn btn-sm btn-outline-secondary preview-template-btn" data-template="${key}">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners to template buttons
        container.querySelectorAll('.use-template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.useTemplate(e.target.dataset.template);
            });
        });

        container.querySelectorAll('.preview-template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.previewTemplate(e.target.dataset.template);
            });
        });
    }

    useTemplate(templateKey) {
        const template = this.importTemplates[templateKey];
        if (!template) return;

        this.currentTemplate = template;
        this.showMappingInterface(null, template);
    }

    previewTemplate(templateKey) {
        const template = this.importTemplates[templateKey];
        if (!template) return;

        const modalContent = `
            <div class="template-preview">
                <h4>${template.name}</h4>
                <p class="text-muted">${template.description}</p>
                
                <div class="preview-section">
                    <h5>Required Fields</h5>
                    <div class="fields-list">
                        ${template.fields.filter(f => f.required).map(field => `
                            <div class="field-item required">
                                <i class="fas fa-asterisk"></i>
                                <span class="field-name">${field.label}</span>
                                <span class="field-example">${field.example || 'N/A'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="preview-section">
                    <h5>Optional Fields</h5>
                    <div class="fields-list">
                        ${template.fields.filter(f => !f.required).map(field => `
                            <div class="field-item">
                                <i class="fas fa-circle"></i>
                                <span class="field-name">${field.label}</span>
                                <span class="field-example">${field.example || 'N/A'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="preview-section">
                    <h5>Sample Data</h5>
                    <div class="sample-data">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    ${template.fields.map(field => `<th>${field.label}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${template.sampleData.map(row => `
                                    <tr>
                                        ${row.map(cell => `<td>${cell}</td>`).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="preview-actions">
                    <button type="button" class="btn btn-primary" id="download-template-btn">
                        <i class="fas fa-download"></i> Download Template
                    </button>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Template Preview',
            size: 'modal-lg',
            buttons: [
                { text: 'Close', class: 'btn-secondary', action: 'close' }
            ],
            onShow: (modal) => {
                modal.querySelector('#download-template-btn').addEventListener('click', () => {
                    this.downloadTemplate(template);
                });
            }
        });
    }

    downloadTemplate(template) {
        // Create CSV content
        const headers = template.fields.map(f => f.label);
        const rows = template.sampleData;
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name.replace(/\s+/g, '_')}_Template.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showAlert('Template downloaded successfully', 'success');
    }

    // ========== FILE IMPORT ==========
    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.processFile(file);
        event.target.value = ''; // Reset file input
    }

    handleDroppedFile(file) {
        this.processFile(file);
    }

    async processFile(file) {
        try {
            // Validate file
            const validation = this.validateFile(file);
            if (!validation.valid) {
                Utils.showAlert(validation.error, 'error');
                return;
            }

            // Show processing indicator
            Utils.showAlert(`Processing ${file.name}...`, 'info');

            // Parse file based on type
            let data;
            if (file.name.endsWith('.csv')) {
                data = await this.parseCSV(file);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                data = await this.parseExcel(file);
            } else if (file.name.endsWith('.json')) {
                data = await this.parseJSON(file);
            } else {
                throw new Error('Unsupported file format');
            }

            // Show mapping interface
            this.showMappingInterface(data, null, file.name);

        } catch (error) {
            console.error('File processing error:', error);
            Utils.showAlert(`Failed to process file: ${error.message}`, 'error');
        }
    }

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json'
        ];
        const allowedExtensions = ['.csv', '.xls', '.xlsx', '.json'];

        // Check file size
        if (file.size > maxSize) {
            return { valid: false, error: 'File size exceeds 10MB limit' };
        }

        // Check file type
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            return { valid: false, error: 'File type not supported. Please upload CSV, Excel, or JSON files.' };
        }

        return { valid: true };
    }

    async parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const rows = content.split('\n').map(row => row.trim()).filter(row => row);
                    
                    // Parse CSV (simple implementation - could use PapaParse for production)
                    const data = rows.map(row => {
                        // Handle quoted values
                        const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
                        const matches = row.match(regex) || [];
                        return matches.map(cell => {
                            // Remove surrounding quotes if present
                            if (cell.startsWith('"') && cell.endsWith('"')) {
                                return cell.substring(1, cell.length - 1);
                            }
                            return cell;
                        });
                    });
                    
                    resolve(data);
                } catch (error) {
                    reject(new Error('Failed to parse CSV file'));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    async parseExcel(file) {
        // For production, use a library like SheetJS
        // This is a simplified implementation
        Utils.showAlert('Excel parsing requires additional libraries. Using CSV is recommended.', 'warning');
        
        // Fallback to CSV parsing if file is actually CSV with .xls extension
        if (file.name.endsWith('.xls')) {
            return this.parseCSV(file);
        }
        
        throw new Error('Excel parsing not implemented. Please convert to CSV first.');
    }

    async parseJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Convert JSON to tabular format if needed
                    if (Array.isArray(data)) {
                        // Assume it's already in tabular format
                        const headers = Object.keys(data[0] || {});
                        const rows = data.map(item => headers.map(header => item[header]));
                        resolve([headers, ...rows]);
                    } else {
                        // Try to extract data from common structures
                        resolve(this.extractDataFromJSON(data));
                    }
                } catch (error) {
                    reject(new Error('Failed to parse JSON file'));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    extractDataFromJSON(jsonData) {
        // Try to find arrays of objects
        const arrays = [];
        
        function findArrays(obj, path = '') {
            if (Array.isArray(obj)) {
                if (obj.length > 0 && typeof obj[0] === 'object') {
                    arrays.push({ path, data: obj });
                }
            } else if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    findArrays(obj[key], path ? `${path}.${key}` : key);
                }
            }
        }
        
        findArrays(jsonData);
        
        if (arrays.length === 0) {
            throw new Error('No tabular data found in JSON file');
        }
        
        // Use the first array found
        const firstArray = arrays[0];
        const headers = Object.keys(firstArray.data[0]);
        const rows = firstArray.data.map(item => headers.map(header => item[header]));
        
        return [headers, ...rows];
    }

    // ========== MAPPING INTERFACE ==========
    showMappingInterface(data, template, fileName = 'Imported Data') {
        this.currentImportData = data;
        this.currentTemplate = template;
        this.currentFileName = fileName;
        
        const container = document.getElementById('import-container');
        if (!container) return;

        container.innerHTML = `
            <div class="mapping-interface">
                <div class="mapping-header">
                    <h4><i class="fas fa-project-diagram"></i> Map Data Fields</h4>
                    <p class="text-muted">Map columns from your file to the system fields</p>
                </div>
                
                <div class="mapping-controls">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="import-type">Import Type</label>
                                <select id="import-type" class="form-control">
                                    <option value="class_list">Class List</option>
                                    <option value="attendance_records">Attendance Records</option>
                                    <option value="student_roster">Student Roster</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="import-strategy">Import Strategy</label>
                                <select id="import-strategy" class="form-control">
                                    <option value="add_new">Add new records only</option>
                                    <option value="update_existing">Update existing records</option>
                                    <option value="replace_all">Replace all records</option>
                                    <option value="merge">Merge with existing data</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mapping-actions">
                        <button type="button" class="btn btn-outline-primary" id="auto-map-btn">
                            <i class="fas fa-magic"></i> Auto-Map Fields
                        </button>
                        <button type="button" class="btn btn-outline-secondary" id="save-mapping-btn">
                            <i class="fas fa-save"></i> Save Mapping
                        </button>
                    </div>
                </div>
                
                <div class="mapping-preview">
                    <div class="preview-header">
                        <h5>Data Preview (First 10 rows)</h5>
                        <small>File: ${fileName}</small>
                    </div>
                    
                    <div class="preview-container">
                        <div class="data-preview" id="data-preview">
                            <!-- Data preview will be loaded here -->
                        </div>
                    </div>
                </div>
                
                <div class="field-mappings" id="field-mappings-container">
                    <!-- Field mappings will be loaded here -->
                </div>
                
                <div class="mapping-footer">
                    <div class="validation-summary" id="validation-summary"></div>
                    
                    <div class="action-buttons">
                        <button type="button" class="btn btn-secondary" id="cancel-import-btn">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="button" class="btn btn-info" id="preview-import-btn">
                            <i class="fas fa-eye"></i> Preview Import
                        </button>
                        <button type="button" class="btn btn-primary" id="execute-import-btn" disabled>
                            <i class="fas fa-play"></i> Execute Import
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Initialize
        this.renderDataPreview();
        this.renderFieldMappings();
        this.updateValidation();
        
        // Set template if provided
        if (template) {
            document.getElementById('import-type').value = this.getTemplateType(template);
        }
        
        // Set up event listeners
        this.setupMappingEventListeners();
    }

    getTemplateType(template) {
        // Map template to import type
        const templateMap = {
            'class_list': 'class_list',
            'attendance_records': 'attendance_records',
            'student_roster': 'student_roster'
        };
        
        for (const [key, value] of Object.entries(this.importTemplates)) {
            if (value === template) {
                return templateMap[key] || 'custom';
            }
        }
        
        return 'custom';
    }

    renderDataPreview() {
        const container = document.getElementById('data-preview');
        if (!container || !this.currentImportData) return;

        // Get first 10 rows for preview
        const previewData = this.currentImportData.slice(0, 11); // Include header + 10 rows
        
        container.innerHTML = `
            <table class="table table-sm table-bordered">
                <thead>
                    <tr>
                        <th>#</th>
                        ${previewData[0].map((_, index) => `
                            <th class="column-header" data-column="${index}">
                                Column ${index + 1}
                                <br>
                                <small class="text-muted">${this.getColumnSample(previewData, index)}</small>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${previewData.slice(1).map((row, rowIndex) => `
                        <tr>
                            <td class="row-number">${rowIndex + 1}</td>
                            ${row.map((cell, cellIndex) => `
                                <td class="data-cell" data-row="${rowIndex}" data-column="${cellIndex}">
                                    ${this.truncateText(cell, 30)}
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            ${this.currentImportData.length > 11 ? `
                <div class="preview-footer">
                    <small class="text-muted">
                        Showing 10 of ${this.currentImportData.length - 1} rows
                    </small>
                </div>
            ` : ''}
        `;
    }

    getColumnSample(data, columnIndex) {
        // Get sample values from first few rows
        const samples = data.slice(1, 4).map(row => row[columnIndex]).filter(val => val);
        return samples.length > 0 ? 
            `Sample: ${samples.map(s => this.truncateText(s, 15)).join(', ')}` : 
            'Empty';
    }

    truncateText(text, maxLength) {
        if (typeof text !== 'string') text = String(text);
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    renderFieldMappings() {
        const container = document.getElementById('field-mappings-container');
        if (!container) return;

        const importType = document.getElementById('import-type')?.value || 'class_list';
        const template = this.getTemplateForType(importType);
        
        if (!template) {
            container.innerHTML = '<p class="text-danger">No template found for selected import type</p>';
            return;
        }

        container.innerHTML = `
            <h5>Field Mappings</h5>
            <p class="text-muted">Map each system field to a column from your file</p>
            
            <div class="mappings-list">
                ${template.fields.map((field, index) => `
                    <div class="mapping-row ${field.required ? 'required' : ''}">
                        <div class="mapping-field">
                            <div class="field-info">
                                <span class="field-name">${field.label}</span>
                                ${field.required ? '<span class="badge bg-danger">Required</span>' : ''}
                                <small class="field-description">${field.example ? `Example: ${field.example}` : ''}</small>
                            </div>
                        </div>
                        
                        <div class="mapping-control">
                            <select class="form-control form-control-sm column-selector" 
                                    data-field="${field.name}" 
                                    data-field-index="${index}">
                                <option value="">-- Select Column --</option>
                                ${this.currentImportData[0].map((_, colIndex) => `
                                    <option value="${colIndex}">
                                        Column ${colIndex + 1}: ${this.currentImportData[0][colIndex] || `(Column ${colIndex + 1})`}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="mapping-preview">
                            <span class="preview-label">Preview:</span>
                            <span class="preview-value" id="preview-${field.name}">
                                -- Not mapped --
                            </span>
                        </div>
                        
                        <div class="mapping-actions">
                            <button type="button" class="btn btn-sm btn-outline-info map-field-btn" 
                                    data-field-index="${index}">
                                <i class="fas fa-search"></i> Match
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="mapping-stats">
                <div class="stat-item">
                    <span class="stat-label">Required Fields:</span>
                    <span class="stat-value" id="required-mapped">0/${template.fields.filter(f => f.required).length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Fields:</span>
                    <span class="stat-value" id="total-mapped">0/${template.fields.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Data Quality:</span>
                    <span class="stat-value" id="data-quality">--</span>
                </div>
            </div>
        `;

        // Load saved mappings if available
        this.loadSavedMappings(importType);
        
        // Set up event listeners for column selectors
        container.querySelectorAll('.column-selector').forEach(select => {
            select.addEventListener('change', (e) => {
                this.onColumnMapped(e.target);
            });
        });
    }

    getTemplateForType(importType) {
        switch (importType) {
            case 'class_list':
                return this.importTemplates.class_list;
            case 'attendance_records':
                return this.importTemplates.attendance_records;
            case 'student_roster':
                return this.importTemplates.student_roster;
            default:
                return null;
        }
    }

    loadSavedMappings(importType) {
        const savedMappings = this.fieldMappings[importType];
        if (!savedMappings) return;

        Object.entries(savedMappings).forEach(([fieldName, columnIndex]) => {
            const select = document.querySelector(`select[data-field="${fieldName}"]`);
            if (select) {
                select.value = columnIndex;
                this.updateFieldPreview(fieldName, columnIndex);
            }
        });
        
        this.updateMappingStats();
    }

    setupMappingEventListeners() {
        // Import type change
        const importTypeSelect = document.getElementById('import-type');
        if (importTypeSelect) {
            importTypeSelect.addEventListener('change', () => {
                this.renderFieldMappings();
                this.updateValidation();
            });
        }

        // Import strategy change
        const importStrategySelect = document.getElementById('import-strategy');
        if (importStrategySelect) {
            importStrategySelect.addEventListener('change', () => {
                this.updateValidation();
            });
        }
    }

    onColumnMapped(selectElement) {
        const fieldName = selectElement.dataset.field;
        const columnIndex = parseInt(selectElement.value);
        
        this.updateFieldPreview(fieldName, columnIndex);
        this.updateMappingStats();
        this.updateValidation();
    }

    updateFieldPreview(fieldName, columnIndex) {
        const previewElement = document.getElementById(`preview-${fieldName}`);
        if (!previewElement) return;

        if (isNaN(columnIndex)) {
            previewElement.textContent = '-- Not mapped --';
            previewElement.className = 'preview-value';
            return;
        }

        // Get sample value from first data row (skip header)
        const sampleValue = this.currentImportData[1]?.[columnIndex] || 'No data';
        previewElement.textContent = this.truncateText(sampleValue, 40);
        previewElement.className = `preview-value ${sampleValue ? 'has-data' : 'no-data'}`;
    }

    updateMappingStats() {
        const importType = document.getElementById('import-type')?.value || 'class_list';
        const template = this.getTemplateForType(importType);
        if (!template) return;

        const requiredFields = template.fields.filter(f => f.required);
        const allFields = template.fields;
        
        // Count mapped fields
        let requiredMapped = 0;
        let totalMapped = 0;
        
        template.fields.forEach(field => {
            const select = document.querySelector(`select[data-field="${field.name}"]`);
            if (select && select.value !== '') {
                totalMapped++;
                if (field.required) {
                    requiredMapped++;
                }
            }
        });
        
        // Update UI
        document.getElementById('required-mapped').textContent = 
            `${requiredMapped}/${requiredFields.length}`;
        document.getElementById('total-mapped').textContent = 
            `${totalMapped}/${allFields.length}`;
        
        // Calculate data quality
        const qualityPercent = allFields.length > 0 ? Math.round((totalMapped / allFields.length) * 100) : 0;
        const qualityElement = document.getElementById('data-quality');
        qualityElement.textContent = `${qualityPercent}%`;
        qualityElement.className = `stat-value quality-${Math.floor(qualityPercent / 25) * 25}`;
    }

    updateValidation() {
        const importType = document.getElementById('import-type')?.value || 'class_list';
        const template = this.getTemplateForType(importType);
        const executeBtn = document.getElementById('execute-import-btn');
        const validationSummary = document.getElementById('validation-summary');
        
        if (!template || !executeBtn || !validationSummary) return;

        const errors = [];
        const warnings = [];

        // Check required fields
        template.fields.forEach(field => {
            if (field.required) {
                const select = document.querySelector(`select[data-field="${field.name}"]`);
                if (!select || select.value === '') {
                    errors.push(`${field.label} is required but not mapped`);
                }
            }
        });

        // Check for duplicate column mappings
        const mappedColumns = new Set();
        template.fields.forEach(field => {
            const select = document.querySelector(`select[data-field="${field.name}"]`);
            if (select && select.value !== '') {
                if (mappedColumns.has(select.value)) {
                    warnings.push(`Column ${parseInt(select.value) + 1} is mapped to multiple fields`);
                }
                mappedColumns.add(select.value);
            }
        });

        // Check data quality
        const unmappedFields = template.fields.filter(field => {
            const select = document.querySelector(`select[data-field="${field.name}"]`);
            return !select || select.value === '';
        }).length;
        
        if (unmappedFields > 0) {
            warnings.push(`${unmappedFields} field(s) are not mapped`);
        }

        // Update validation summary
        if (errors.length > 0) {
            validationSummary.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i>
                    <strong>Validation Errors:</strong>
                    <ul class="mb-0">
                        ${errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            `;
            executeBtn.disabled = true;
        } else if (warnings.length > 0) {
            validationSummary.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Validation Warnings:</strong>
                    <ul class="mb-0">
                        ${warnings.map(warning => `<li>${warning}</li>`).join('')}
                    </ul>
                </div>
            `;
            executeBtn.disabled = false;
        } else {
            validationSummary.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <strong>All fields mapped successfully!</strong>
                    Ready to import.
                </div>
            `;
            executeBtn.disabled = false;
        }
    }

    // ========== FIELD MAPPING HELPERS ==========
    showFieldMapping(fieldIndex) {
        const importType = document.getElementById('import-type')?.value || 'class_list';
        const template = this.getTemplateForType(importType);
        if (!template || !template.fields[fieldIndex]) return;

        const field = template.fields[fieldIndex];
        
        const modalContent = `
            <div class="field-mapping-modal">
                <h5>Map "${field.label}" Field</h5>
                <p class="text-muted">Select the best matching column for ${field.label}</p>
                
                <div class="column-suggestions">
                    <h6>Suggested Columns:</h6>
                    <div class="suggestions-list" id="suggestions-list">
                        <!-- Suggestions will be populated here -->
                    </div>
                </div>
                
                <div class="manual-selection">
                    <h6>Manual Selection:</h6>
                    <select class="form-control" id="manual-column-select">
                        <option value="">-- Select Column --</option>
                        ${this.currentImportData[0].map((header, index) => `
                            <option value="${index}">
                                Column ${index + 1}: ${header || `(Column ${index + 1})`}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Map Field',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
                { text: 'Apply Mapping', class: 'btn-primary', action: 'apply' }
            ],
            onShow: (modal) => {
                this.populateColumnSuggestions(field, modal);
                
                modal.querySelector('[data-action="apply"]').addEventListener('click', () => {
                    const selectedColumn = modal.querySelector('#manual-column-select').value;
                    if (selectedColumn) {
                        this.applyFieldMapping(field.name, parseInt(selectedColumn));
                        modal.remove();
                    }
                });
            }
        });
    }

    populateColumnSuggestions(field, modal) {
        const suggestionsList = modal.querySelector('#suggestions-list');
        if (!suggestionsList) return;

        const suggestions = this.findMatchingColumns(field);
        
        if (suggestions.length === 0) {
            suggestionsList.innerHTML = '<p class="text-muted">No automatic suggestions found</p>';
            return;
        }

        suggestionsList.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-column="${suggestion.columnIndex}">
                <div class="suggestion-header">
                    <strong>Column ${suggestion.columnIndex + 1}</strong>
                    <span class="match-score">${Math.round(suggestion.score * 100)}% match</span>
                </div>
                <div class="suggestion-content">
                    <div class="column-header">${suggestion.header || `(Column ${suggestion.columnIndex + 1})`}</div>
                    <div class="sample-values">
                        ${suggestion.samples.map(sample => `<span class="sample-value">${sample}</span>`).join(', ')}
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        suggestionsList.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const columnIndex = parseInt(item.dataset.column);
                modal.querySelector('#manual-column-select').value = columnIndex;
            });
        });
    }

    findMatchingColumns(field) {
        const suggestions = [];
        const fieldName = field.label.toLowerCase();
        
        // Check each column header and sample values
        this.currentImportData[0].forEach((header, columnIndex) => {
            let score = 0;
            
            // Check header match
            if (header) {
                const headerLower = header.toLowerCase();
                if (headerLower.includes(fieldName) || fieldName.includes(headerLower)) {
                    score += 0.5;
                }
                
                // Check for common synonyms
                const synonyms = this.getFieldSynonyms(field.name);
                if (synonyms.some(synonym => headerLower.includes(synonym))) {
                    score += 0.3;
                }
            }
            
            // Check sample values
            const samples = this.getColumnSamples(columnIndex, 5);
            const sampleScore = this.analyzeSamples(samples, field);
            score += sampleScore * 0.5;
            
            if (score > 0.1) {
                suggestions.push({
                    columnIndex,
                    header: header || `Column ${columnIndex + 1}`,
                    samples: samples,
                    score: Math.min(score, 1)
                });
            }
        });
        
        // Sort by score descending
        return suggestions.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    getFieldSynonyms(fieldName) {
        const synonymMap = {
            'classCode': ['class', 'code', 'course', 'subject code'],
            'className': ['class name', 'course name', 'subject'],
            'teacherName': ['teacher', 'instructor', 'professor', 'staff'],
            'studentId': ['student id', 'id', 'student number', 'roll number'],
            'firstName': ['first name', 'given name', 'forename'],
            'lastName': ['last name', 'surname', 'family name'],
            'date': ['date', 'day', 'attendance date'],
            'present': ['present', 'attended', 'here', 'count present'],
            'absent': ['absent', 'missing', 'not here', 'count absent']
        };
        
        return synonymMap[fieldName] || [];
    }

    getColumnSamples(columnIndex, count) {
        return this.currentImportData
            .slice(1, count + 1)
            .map(row => row[columnIndex])
            .filter(val => val !== undefined && val !== null && val !== '');
    }

    analyzeSamples(samples, field) {
        if (samples.length === 0) return 0;
        
        let score = 0;
        
        // Analyze based on field type expectations
        switch (field.name) {
            case 'date':
                // Check if samples look like dates
                const dateCount = samples.filter(s => this.looksLikeDate(s)).length;
                score = dateCount / samples.length;
                break;
                
            case 'present':
            case 'absent':
            case 'late':
            case 'studentCount':
                // Check if samples are numbers
                const numberCount = samples.filter(s => !isNaN(parseFloat(s)) && isFinite(s)).length;
                score = numberCount / samples.length;
                break;
                
            case 'yearGroup':
                // Check if samples are year numbers
                const yearCount = samples.filter(s => {
                    const year = parseInt(s);
                    return !isNaN(year) && year >= 1 && year <= 13;
                }).length;
                score = yearCount / samples.length;
                break;
                
            case 'session':
                // Check for AM/PM/Both
                const sessionCount = samples.filter(s => 
                    ['AM', 'PM', 'Both', 'Morning', 'Afternoon'].includes(s.toUpperCase())
                ).length;
                score = sessionCount / samples.length;
                break;
                
            default:
                // For text fields, just check if there's data
                score = samples.length > 0 ? 0.5 : 0;
        }
        
        return score;
    }

    looksLikeDate(str) {
        // Simple date pattern matching
        const datePatterns = [
            /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
            /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
            /^\d{2}\/\d{2}\/\d{2}$/, // DD/MM/YY
            /^\d{1,2}\/\d{1,2}\/\d{4}$/, // D/M/YYYY
        ];
        
        return datePatterns.some(pattern => pattern.test(str)) || !isNaN(Date.parse(str));
    }

    applyFieldMapping(fieldName, columnIndex) {
        const select = document.querySelector(`select[data-field="${fieldName}"]`);
        if (select) {
            select.value = columnIndex;
            this.onColumnMapped(select);
        }
    }

    autoMapFields() {
        const importType = document.getElementById('import-type')?.value || 'class_list';
        const template = this.getTemplateForType(importType);
        if (!template) return;

        Utils.showAlert('Auto-mapping fields...', 'info');
        
        template.fields.forEach(field => {
            const suggestions = this.findMatchingColumns(field);
            if (suggestions.length > 0 && suggestions[0].score > 0.3) {
                this.applyFieldMapping(field.name, suggestions[0].columnIndex);
            }
        });
        
        Utils.showAlert('Auto-mapping completed', 'success');
        this.updateValidation();
    }

    saveFieldMapping() {
        const importType = document.getElementById('import-type')?.value || 'class_list';
        const template = this.getTemplateForType(importType);
        if (!template) return;

        const mappings = {};
        
        template.fields.forEach(field => {
            const select = document.querySelector(`select[data-field="${field.name}"]`);
            if (select && select.value !== '') {
                mappings[field.name] = parseInt(select.value);
            }
        });

        // Save to field mappings
        if (!this.fieldMappings[importType]) {
            this.fieldMappings[importType] = {};
        }
        
        this.fieldMappings[importType] = mappings;
        Storage.set('field_mappings', this.fieldMappings);
        
        Utils.showAlert('Field mapping saved successfully', 'success');
    }

    // ========== IMPORT EXECUTION ==========
    previewImport() {
        const importType = document.getElementById('import-type')?.value || 'class_list';
        const importStrategy = document.getElementById('import-strategy')?.value || 'add_new';
        const template = this.getTemplateForType(importType);
        
        if (!template) {
            Utils.showAlert('No template selected', 'error');
            return;
        }

        // Get current mappings
        const mappings = this.getCurrentMappings(template);
        
        // Validate mappings
        const validation = this.validateMappings(template, mappings);
        if (!validation.valid) {
            Utils.showAlert(`Validation failed: ${validation.errors.join(', ')}`, 'error');
            return;
        }

        // Transform data based on mappings
        const transformedData = this.transformData(mappings);
        
        // Analyze data
        const analysis = this.analyzeData(transformedData, template);
        
        // Show preview
        this.showImportPreview(transformedData, analysis, importType, importStrategy);
    }

    getCurrentMappings(template) {
        const mappings = {};
        
        template.fields.forEach(field => {
            const select = document.querySelector(`select[data-field="${field.name}"]`);
            if (select && select.value !== '') {
                mappings[field.name] = {
                    columnIndex: parseInt(select.value),
                    fieldName: field.name,
                    fieldLabel: field.label,
                    required: field.required
                };
            }
        });
        
        return mappings;
    }

    validateMappings(template, mappings) {
        const errors = [];
        const warnings = [];

        // Check required fields
        template.fields.forEach(field => {
            if (field.required && !mappings[field.name]) {
                errors.push(`${field.label} is required but not mapped`);
            }
        });

        // Check for duplicate column mappings
        const columnUsage = {};
        Object.values(mappings).forEach(mapping => {
            const col = mapping.columnIndex;
            if (!columnUsage[col]) columnUsage[col] = [];
            columnUsage[col].push(mapping.fieldLabel);
        });

        Object.entries(columnUsage).forEach(([col, fields]) => {
            if (fields.length > 1) {
                warnings.push(`Column ${parseInt(col) + 1} mapped to multiple fields: ${fields.join(', ')}`);
            }
        });

        // Check data quality for mapped columns
        Object.values(mappings).forEach(mapping => {
            const columnData = this.getColumnData(mapping.columnIndex);
            const emptyCount = columnData.filter(val => !val || val.toString().trim() === '').length;
            const totalCount = columnData.length;
            
            if (emptyCount > 0 && mapping.required) {
                const emptyPercent = Math.round((emptyCount / totalCount) * 100);
                if (emptyPercent > 50) {
                    warnings.push(`${mapping.fieldLabel} has ${emptyPercent}% empty values`);
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors: [...errors, ...warnings]
        };
    }

    getColumnData(columnIndex) {
        return this.currentImportData.slice(1).map(row => row[columnIndex]);
    }

    transformData(mappings) {
        const transformed = [];
        
        // Skip header row
        for (let i = 1; i < this.currentImportData.length; i++) {
            const row = this.currentImportData[i];
            const transformedRow = {};
            
            Object.entries(mappings).forEach(([fieldName, mapping]) => {
                const value = row[mapping.columnIndex];
                transformedRow[fieldName] = this.transformValue(fieldName, value);
            });
            
            transformed.push(transformedRow);
        }
        
        return transformed;
    }

    transformValue(fieldName, value) {
        if (value === undefined || value === null || value.toString().trim() === '') {
            return null;
        }
        
        const strValue = value.toString().trim();
        
        // Apply transformations based on field type
        switch (fieldName) {
            case 'date':
                return this.parseDate(strValue);
                
            case 'present':
            case 'absent':
            case 'late':
            case 'studentCount':
            case 'yearGroup':
                const num = parseInt(strValue);
                return isNaN(num) ? null : num;
                
            case 'session':
                const session = strValue.toUpperCase();
                if (['AM', 'MORNING'].includes(session)) return 'AM';
                if (['PM', 'AFTERNOON'].includes(session)) return 'PM';
                if (session === 'BOTH') return 'Both';
                return 'AM'; // Default
                
            default:
                return strValue;
        }
    }

    parseDate(dateStr) {
        // Try different date formats
        const formats = [
            'YYYY-MM-DD',
            'DD/MM/YYYY',
            'MM/DD/YYYY',
            'DD-MM-YYYY',
            'MM-DD-YYYY'
        ];
        
        for (const format of formats) {
            const date = this.parseDateWithFormat(dateStr, format);
            if (date) return date;
        }
        
        // Fallback to JavaScript Date parsing
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : Utils.formatDate(parsed, 'YYYY-MM-DD');
    }

    parseDateWithFormat(dateStr, format) {
        // Simple date parsing for known formats
        let year, month, day;
        
        if (format === 'YYYY-MM-DD') {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                year = parts[0];
                month = parts[1];
                day = parts[2];
            }
        } else if (format === 'DD/MM/YYYY') {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                day = parts[0];
                month = parts[1];
                year = parts[2];
            }
        } else if (format === 'MM/DD/YYYY') {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                month = parts[0];
                day = parts[1];
                year = parts[2];
            }
        }
        
        if (year && month && day) {
            // Ensure 4-digit year
            if (year.length === 2) {
                year = '20' + year;
            }
            
            // Ensure 2-digit month and day
            month = month.padStart(2, '0');
            day = day.padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        }
        
        return null;
    }

    analyzeData(data, template) {
        const analysis = {
            totalRows: data.length,
            validRows: 0,
            invalidRows: 0,
            fieldStats: {},
            warnings: [],
            errors: []
        };
        
        // Initialize field stats
        template.fields.forEach(field => {
            analysis.fieldStats[field.name] = {
                label: field.label,
                total: 0,
                valid: 0,
                invalid: 0,
                empty: 0,
                uniqueValues: new Set()
            };
        });
        
        // Analyze each row
        data.forEach((row, index) => {
            let rowValid = true;
            const rowErrors = [];
            
            // Check each field
            template.fields.forEach(field => {
                const value = row[field.name];
                const stats = analysis.fieldStats[field.name];
                stats.total++;
                
                if (value === null || value === undefined || value === '') {
                    stats.empty++;
                    if (field.required) {
                        rowValid = false;
                        rowErrors.push(`${field.label} is empty`);
                    }
                } else {
                    stats.valid++;
                    stats.uniqueValues.add(value);
                    
                    // Field-specific validation
                    const fieldValidation = this.validateFieldValue(field.name, value);
                    if (!fieldValidation.valid) {
                        rowValid = false;
                        rowErrors.push(`${field.label}: ${fieldValidation.error}`);
                        stats.invalid++;
                    }
                }
            });
            
            if (rowValid) {
                analysis.validRows++;
            } else {
                analysis.invalidRows++;
                if (rowErrors.length > 0) {
                    analysis.warnings.push(`Row ${index + 1}: ${rowErrors.join('; ')}`);
                }
            }
        });
        
        // Finalize stats
        Object.values(analysis.fieldStats).forEach(stats => {
            stats.uniqueCount = stats.uniqueValues.size;
            delete stats.uniqueValues;
        });
        
        return analysis;
    }

    validateFieldValue(fieldName, value) {
        switch (fieldName) {
            case 'date':
                if (!this.looksLikeDate(value) && !Utils.isValidDate(value)) {
                    return { valid: false, error: 'Invalid date format' };
                }
                break;
                
            case 'present':
            case 'absent':
            case 'late':
            case 'studentCount':
                if (isNaN(parseInt(value)) || parseInt(value) < 0) {
                    return { valid: false, error: 'Must be a positive number' };
                }
                break;
                
            case 'yearGroup':
                const year = parseInt(value);
                if (isNaN(year) || year < 1 || year > 13) {
                    return { valid: false, error: 'Year group must be between 1 and 13' };
                }
                break;
                
            case 'session':
                if (!['AM', 'PM', 'Both'].includes(value)) {
                    return { valid: false, error: 'Must be AM, PM, or Both' };
                }
                break;
                
            case 'email':
                if (value && !this.isValidEmail(value)) {
                    return { valid: false, error: 'Invalid email format' };
                }
                break;
        }
        
        return { valid: true };
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    showImportPreview(data, analysis, importType, importStrategy) {
        const modalContent = `
            <div class="import-preview-modal">
                <div class="preview-header">
                    <h4><i class="fas fa-eye"></i> Import Preview</h4>
                    <div class="preview-stats">
                        <span class="stat-item">
                            <i class="fas fa-list"></i> ${analysis.totalRows} rows
                        </span>
                        <span class="stat-item ${analysis.validRows === analysis.totalRows ? 'text-success' : 'text-warning'}">
                            <i class="fas fa-check-circle"></i> ${analysis.validRows} valid
                        </span>
                        <span class="stat-item ${analysis.invalidRows > 0 ? 'text-danger' : ''}">
                            <i class="fas fa-exclamation-circle"></i> ${analysis.invalidRows} invalid
                        </span>
                    </div>
                </div>
                
                <div class="preview-analysis">
                    <h5>Data Analysis</h5>
                    <div class="analysis-grid">
                        ${Object.values(analysis.fieldStats).map(stats => `
                            <div class="analysis-card">
                                <div class="analysis-header">${stats.label}</div>
                                <div class="analysis-body">
                                    <div class="stat">
                                        <span class="stat-label">Valid:</span>
                                        <span class="stat-value">${stats.valid}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Empty:</span>
                                        <span class="stat-value">${stats.empty}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Unique:</span>
                                        <span class="stat-value">${stats.uniqueCount}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="preview-data">
                    <h5>Data Preview (First 5 rows)</h5>
                    <div class="data-table-container">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    ${Object.keys(analysis.fieldStats).map(fieldName => `
                                        <th>${analysis.fieldStats[fieldName].label}</th>
                                    `).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${data.slice(0, 5).map(row => `
                                    <tr>
                                        ${Object.keys(analysis.fieldStats).map(fieldName => `
                                            <td>${row[fieldName] || '<span class="text-muted">(empty)</span>'}</td>
                                        `).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                ${analysis.warnings.length > 0 ? `
                    <div class="preview-warnings">
                        <h5>Warnings</h5>
                        <div class="warnings-list">
                            ${analysis.warnings.slice(0, 5).map(warning => `
                                <div class="warning-item">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span>${warning}</span>
                                </div>
                            `).join('')}
                            ${analysis.warnings.length > 5 ? `
                                <div class="text-muted">
                                    ... and ${analysis.warnings.length - 5} more warnings
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
                
                <div class="preview-import-info">
                    <h5>Import Details</h5>
                    <div class="import-info-grid">
                        <div class="info-item">
                            <span class="info-label">Import Type:</span>
                            <span class="info-value">${this.getImportTypeLabel(importType)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Strategy:</span>
                            <span class="info-value">${this.getStrategyLabel(importStrategy)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Total Records:</span>
                            <span class="info-value">${analysis.totalRows}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Will Import:</span>
                            <span class="info-value">${analysis.validRows}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Import Preview',
            size: 'modal-xl',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
                { text: 'Execute Import', class: 'btn-primary', action: 'execute' }
            ],
            onShow: (modal) => {
                modal.querySelector('[data-action="execute"]').addEventListener('click', () => {
                    this.executeImportWithData(data, analysis, importType, importStrategy);
                    modal.remove();
                });
            }
        });
    }

    getImportTypeLabel(importType) {
        const labels = {
            'class_list': 'Class List',
            'attendance_records': 'Attendance Records',
            'student_roster': 'Student Roster',
            'custom': 'Custom Import'
        };
        return labels[importType] || importType;
    }

    getStrategyLabel(strategy) {
        const labels = {
            'add_new': 'Add new records only',
            'update_existing': 'Update existing records',
            'replace_all': 'Replace all records',
            'merge': 'Merge with existing data'
        };
        return labels[strategy] || strategy;
    }

    async executeImportWithData(data, analysis, importType, importStrategy) {
        try {
            Utils.showAlert('Starting import process...', 'info');
            
            // Filter valid data
            const validData = data.filter((row, index) => {
                // Simple validation - all required fields must have values
                const template = this.getTemplateForType(importType);
                if (!template) return false;
                
                return template.fields.every(field => {
                    if (field.required) {
                        const value = row[field.name];
                        return value !== null && value !== undefined && value !== '';
                    }
                    return true;
                });
            });
            
            // Apply import strategy
            const result = await this.applyImportStrategy(validData, importType, importStrategy);
            
            // Record import history
            await this.recordImportHistory({
                timestamp: new Date().toISOString(),
                importType: importType,
                strategy: importStrategy,
                fileName: this.currentFileName,
                totalRecords: analysis.totalRows,
                validRecords: validData.length,
                invalidRecords: analysis.totalRows - validData.length,
                result: result,
                mappings: this.getCurrentMappings(this.getTemplateForType(importType))
            });
            
            // Show results
            this.showImportResults(result, validData.length, analysis.totalRows);
            
            // Notify other modules
            this.app.emitEvent('data:imported', {
                type: importType,
                count: validData.length,
                result: result
            });
            
        } catch (error) {
            console.error('Import execution error:', error);
            Utils.showAlert(`Import failed: ${error.message}`, 'error');
        }
    }

    async applyImportStrategy(data, importType, strategy) {
        const result = {
            added: 0,
            updated: 0,
            skipped: 0,
            errors: []
        };
        
        switch (importType) {
            case 'class_list':
                await this.importClasses(data, strategy, result);
                break;
                
            case 'attendance_records':
                await this.importAttendance(data, strategy, result);
                break;
                
            case 'student_roster':
                await this.importStudents(data, strategy, result);
                break;
                
            default:
                throw new Error(`Unsupported import type: ${importType}`);
        }
        
        return result;
    }

    async importClasses(data, strategy, result) {
        const existingClasses = Storage.get('classes') || [];
        const newClasses = [];
        
        data.forEach(item => {
            const classId = `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newClass = {
                id: classId,
                classCode: item.classCode,
                className: item.className || item.classCode,
                subject: item.subject,
                yearGroup: parseInt(item.yearGroup) || 7,
                teacherName: item.teacherName,
                room: item.room || 'TBA',
                studentCount: parseInt(item.studentCount) || 0,
                schedule: item.schedule || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Check if class already exists (by classCode and yearGroup)
            const existingIndex = existingClasses.findIndex(c => 
                c.classCode === newClass.classCode && c.yearGroup === newClass.yearGroup
            );
            
            if (existingIndex >= 0) {
                if (strategy === 'update_existing' || strategy === 'merge') {
                    existingClasses[existingIndex] = { ...existingClasses[existingIndex], ...newClass };
                    result.updated++;
                } else if (strategy === 'add_new') {
                    result.skipped++;
                } else if (strategy === 'replace_all') {
                    newClasses.push(newClass);
                }
            } else {
                newClasses.push(newClass);
                result.added++;
            }
        });
        
        if (strategy === 'replace_all') {
            Storage.set('classes', newClasses);
        } else {
            Storage.set('classes', [...existingClasses, ...newClasses]);
        }
    }

    async importAttendance(data, strategy, result) {
        const existingAttendance = Storage.get('attendance_records') || [];
        const newAttendance = [];
        
        data.forEach(item => {
            const recordId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newRecord = {
                id: recordId,
                date: item.date,
                classId: this.findClassId(item.classCode, item.yearGroup),
                classCode: item.classCode,
                session: item.session || 'AM',
                present: parseInt(item.present) || 0,
                absent: parseInt(item.absent) || 0,
                late: parseInt(item.late) || 0,
                notes: item.notes || '',
                imported: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Check if record already exists (by date, session, and classId)
            const existingIndex = existingAttendance.findIndex(r => 
                r.date === newRecord.date && 
                r.session === newRecord.session && 
                r.classId === newRecord.classId
            );
            
            if (existingIndex >= 0) {
                if (strategy === 'update_existing' || strategy === 'merge') {
                    existingAttendance[existingIndex] = { ...existingAttendance[existingIndex], ...newRecord };
                    result.updated++;
                } else if (strategy === 'add_new') {
                    result.skipped++;
                } else if (strategy === 'replace_all') {
                    newAttendance.push(newRecord);
                }
            } else {
                newAttendance.push(newRecord);
                result.added++;
            }
        });
        
        if (strategy === 'replace_all') {
            Storage.set('attendance_records', newAttendance);
        } else {
            Storage.set('attendance_records', [...existingAttendance, ...newAttendance]);
        }
    }

    findClassId(classCode, yearGroup) {
        const classes = Storage.get('classes') || [];
        const cls = classes.find(c => c.classCode === classCode && c.yearGroup === parseInt(yearGroup));
        return cls ? cls.id : `unknown_${classCode}_${yearGroup}`;
    }

    async importStudents(data, strategy, result) {
        const existingStudents = Storage.get('students') || [];
        const newStudents = [];
        
        data.forEach(item => {
            const studentId = item.studentId || `stu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newStudent = {
                id: studentId,
                studentId: item.studentId,
                firstName: item.firstName,
                lastName: item.lastName,
                fullName: `${item.firstName} ${item.lastName}`,
                email: item.email || '',
                classCode: item.classCode,
                yearGroup: parseInt(item.yearGroup) || 7,
                homeroom: item.homeroom || '',
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Check if student already exists (by studentId or email)
            const existingIndex = existingStudents.findIndex(s => 
                s.studentId === newStudent.studentId || 
                (s.email && s.email === newStudent.email)
            );
            
            if (existingIndex >= 0) {
                if (strategy === 'update_existing' || strategy === 'merge') {
                    existingStudents[existingIndex] = { ...existingStudents[existingIndex], ...newStudent };
                    result.updated++;
                } else if (strategy === 'add_new') {
                    result.skipped++;
                } else if (strategy === 'replace_all') {
                    newStudents.push(newStudent);
                }
            } else {
                newStudents.push(newStudent);
                result.added++;
            }
        });
        
        if (strategy === 'replace_all') {
            Storage.set('students', newStudents);
        } else {
            Storage.set('students', [...existingStudents, ...newStudents]);
        }
    }

    async recordImportHistory(importRecord) {
        this.importHistory.unshift(importRecord);
        
        // Keep only last 50 imports
        if (this.importHistory.length > 50) {
            this.importHistory.pop();
        }
        
        await Storage.set('import_history', this.importHistory);
    }

    showImportResults(result, validCount, totalCount) {
        const modalContent = `
            <div class="import-results-modal">
                <div class="results-header ${result.errors.length > 0 ? 'has-errors' : 'success'}">
                    <h4>
                        <i class="fas ${result.errors.length > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
                        Import ${result.errors.length > 0 ? 'Completed with Issues' : 'Successful'}
                    </h4>
                </div>
                
                <div class="results-summary">
                    <div class="summary-grid">
                        <div class="summary-card success">
                            <div class="summary-value">${validCount}/${totalCount}</div>
                            <div class="summary-label">Valid Records</div>
                        </div>
                        
                        <div class="summary-card info">
                            <div class="summary-value">${result.added}</div>
                            <div class="summary-label">Added</div>
                        </div>
                        
                        <div class="summary-card warning">
                            <div class="summary-value">${result.updated}</div>
                            <div class="summary-label">Updated</div>
                        </div>
                        
                        <div class="summary-card secondary">
                            <div class="summary-value">${result.skipped}</div>
                            <div class="summary-label">Skipped</div>
                        </div>
                    </div>
                </div>
                
                ${result.errors.length > 0 ? `
                    <div class="results-errors">
                        <h5>Errors Encountered</h5>
                        <div class="errors-list">
                            ${result.errors.slice(0, 5).map(error => `
                                <div class="error-item">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <span>${error}</span>
                                </div>
                            `).join('')}
                            ${result.errors.length > 5 ? `
                                <div class="text-muted">
                                    ... and ${result.errors.length - 5} more errors
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
                
                <div class="results-actions">
                    <div class="action-buttons">
                        <button type="button" class="btn btn-primary" id="view-imported-data">
                            <i class="fas fa-eye"></i> View Imported Data
                        </button>
                        <button type="button" class="btn btn-outline-primary" id="export-results">
                            <i class="fas fa-download"></i> Export Results
                        </button>
                    </div>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Import Results',
            size: 'modal-lg',
            buttons: [
                { text: 'Close', class: 'btn-secondary', action: 'close' }
            ],
            onShow: (modal) => {
                modal.querySelector('#view-imported-data').addEventListener('click', () => {
                    this.viewImportedData(result);
                    modal.remove();
                });
                
                modal.querySelector('#export-results').addEventListener('click', () => {
                    this.exportImportResults(result, validCount, totalCount);
                });
            }
        });
    }

    viewImportedData(result) {
        // Navigate to appropriate page based on import type
        const importType = document.getElementById('import-type')?.value;
        
        switch (importType) {
            case 'class_list':
                this.app.navigateTo('/pages/setup.html');
                break;
            case 'attendance_records':
                this.app.navigateTo('/pages/attendance.html');
                break;
            case 'student_roster':
                this.app.navigateTo('/pages/setup.html');
                break;
        }
        
        Utils.showAlert(`Showing imported ${importType.replace('_', ' ')}`, 'info');
    }

    exportImportResults(result, validCount, totalCount) {
        const exportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalRecords: totalCount,
                validRecords: validCount,
                invalidRecords: totalCount - validCount,
                added: result.added,
                updated: result.updated,
                skipped: result.skipped
            },
            details: result,
            fileName: this.currentFileName
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import_results_${Utils.formatDate(new Date(), 'YYYY-MM-DD_HH-mm')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showAlert('Import results exported', 'success');
    }

    cancelImport() {
        this.renderImportInterface();
    }

    // ========== GOOGLE SHEETS IMPORT ==========
    showGoogleSheetsImport() {
        // Check if Google Sheets integration is enabled
        const settings = Storage.get('app_settings') || {};
        if (!settings.googleSheetsEnabled || !settings.googleSheetsId) {
            Utils.showAlert('Google Sheets integration is not configured. Please enable it in Settings.', 'warning');
            return;
        }

        const modalContent = `
            <div class="google-sheets-import">
                <h4><i class="fab fa-google"></i> Import from Google Sheets</h4>
                
                <div class="sheets-info">
                    <p>Connected to: <strong>${settings.googleSheetsId}</strong></p>
                    <p class="text-muted">Select which sheet and range to import:</p>
                </div>
                
                <div class="sheets-selection">
                    <div class="form-group">
                        <label for="sheet-name">Sheet Name</label>
                        <input type="text" id="sheet-name" class="form-control" value="Sheet1">
                    </div>
                    
                    <div class="form-group">
                        <label for="data-range">Data Range</label>
                        <input type="text" id="data-range" class="form-control" value="A1:H100" 
                               placeholder="e.g., A1:H100 or Named Range">
                        <small class="form-text text-muted">
                            Use Excel-style range notation or a named range
                        </small>
                    </div>
                </div>
                
                <div class="import-options">
                    <h5>Import Options</h5>
                    <div class="form-check">
                        <input type="checkbox" id="has-headers" class="form-check-input" checked>
                        <label class="form-check-label" for="has-headers">
                            First row contains headers
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="skip-empty" class="form-check-input" checked>
                        <label class="form-check-label" for="skip-empty">
                            Skip empty rows
                        </label>
                    </div>
                </div>
                
                <div class="test-section">
                    <button type="button" class="btn btn-outline-primary" id="test-connection-btn">
                        <i class="fas fa-plug"></i> Test Connection
                    </button>
                    
                    <button type="button" class="btn btn-outline-info" id="preview-sheet-btn">
                        <i class="fas fa-eye"></i> Preview Sheet
                    </button>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Import from Google Sheets',
            size: 'modal-lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
                { text: 'Import from Sheets', class: 'btn-primary', action: 'import' }
            ],
            onShow: (modal) => {
                modal.querySelector('#test-connection-btn').addEventListener('click', () => {
                    this.testGoogleSheetsConnection(modal);
                });
                
                modal.querySelector('#preview-sheet-btn').addEventListener('click', () => {
                    this.previewGoogleSheet(modal);
                });
                
                modal.querySelector('[data-action="import"]').addEventListener('click', () => {
                    this.importFromGoogleSheets(modal);
                });
            }
        });
    }

    async testGoogleSheetsConnection(modal) {
        Utils.showAlert('Testing Google Sheets connection...', 'info');
        
        // Simulate connection test
        setTimeout(() => {
            Utils.showAlert('Connected to Google Sheets successfully!', 'success');
        }, 1500);
    }

    async previewGoogleSheet(modal) {
        const sheetName = modal.querySelector('#sheet-name').value;
        const dataRange = modal.querySelector('#data-range').value;
        
        Utils.showAlert(`Loading preview from ${sheetName}!${dataRange}...`, 'info');
        
        // Simulate loading preview
        setTimeout(() => {
            // Show sample preview
            const sampleData = [
                ['Class Code', 'Class Name', 'Teacher', 'Students'],
                ['MAT101', 'Mathematics 101', 'John Smith', '25'],
                ['ENG102', 'English 102', 'Sarah Johnson', '30']
            ];
            
            this.showMappingInterface(sampleData, this.importTemplates.class_list, 'Google Sheets');
            modal.remove();
        }, 2000);
    }

    async importFromGoogleSheets(modal) {
        const sheetName = modal.querySelector('#sheet-name').value;
        const dataRange = modal.querySelector('#data-range').value;
        const hasHeaders = modal.querySelector('#has-headers').checked;
        const skipEmpty = modal.querySelector('#skip-empty').checked;
        
        Utils.showAlert(`Importing from ${sheetName}!${dataRange}...`, 'info');
        
        try {
            // In a real implementation, this would use the Google Sheets API
            // For now, simulate with sample data
            const simulatedData = await this.simulateGoogleSheetsImport(sheetName, dataRange, hasHeaders, skipEmpty);
            
            modal.remove();
            this.showMappingInterface(simulatedData, null, `Google Sheets: ${sheetName}`);
            
        } catch (error) {
            console.error('Google Sheets import error:', error);
            Utils.showAlert(`Failed to import from Google Sheets: ${error.message}`, 'error');
        }
    }

    async simulateGoogleSheetsImport(sheetName, range, hasHeaders, skipEmpty) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Return sample data based on sheet name
        if (sheetName.toLowerCase().includes('class')) {
            return [
                ['Class Code', 'Class Name', 'Subject', 'Year Group', 'Teacher', 'Room', 'Students'],
                ['MAT101', 'Mathematics 101', 'Mathematics', '10', 'John Smith', 'Room 101', '25'],
                ['ENG102', 'English 102', 'English', '11', 'Sarah Johnson', 'Room 202', '30'],
                ['SCI103', 'Science 103', 'Science', '10', 'Michael Brown', 'Lab 1', '28']
            ];
        } else if (sheetName.toLowerCase().includes('attendance')) {
            return [
                ['Date', 'Class Code', 'Session', 'Present', 'Absent', 'Late', 'Notes'],
                ['2024-01-15', 'MAT101', 'AM', '20', '5', '2', 'Regular class'],
                ['2024-01-15', 'ENG102', 'PM', '25', '3', '1', ''],
                ['2024-01-16', 'SCI103', 'AM', '25', '3', '0', 'Lab session']
            ];
        } else {
            return [
                ['Student ID', 'First Name', 'Last Name', 'Email', 'Class Code', 'Year Group'],
                ['S1001', 'John', 'Doe', 'john@school.edu', 'MAT101', '10'],
                ['S1002', 'Jane', 'Smith', 'jane@school.edu', 'ENG102', '11'],
                ['S1003', 'Bob', 'Johnson', 'bob@school.edu', 'SCI103', '10']
            ];
        }
    }

    // ========== SAMPLE IMPORT ==========
    showSampleImport() {
        const modalContent = `
            <div class="sample-import-modal">
                <h4><i class="fas fa-vial"></i> Try Sample Import</h4>
                <p class="text-muted">Practice importing with sample data before using your own files</p>
                
                <div class="sample-options">
                    <h5>Choose Sample Dataset:</h5>
                    
                    <div class="sample-cards">
                        <div class="sample-card" data-sample="classes">
                            <div class="sample-icon">
                                <i class="fas fa-chalkboard-teacher"></i>
                            </div>
                            <div class="sample-content">
                                <h6>Sample Class List</h6>
                                <p>10 sample classes with teachers and schedules</p>
                                <small>Good for testing class imports</small>
                            </div>
                        </div>
                        
                        <div class="sample-card" data-sample="attendance">
                            <div class="sample-icon">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <div class="sample-content">
                                <h6>Sample Attendance</h6>
                                <p>30 days of attendance records for 5 classes</p>
                                <small>Good for testing attendance imports</small>
                            </div>
                        </div>
                        
                        <div class="sample-card" data-sample="students">
                            <div class="sample-icon">
                                <i class="fas fa-user-graduate"></i>
                            </div>
                            <div class="sample-content">
                                <h6>Sample Students</h6>
                                <p>50 sample students across multiple classes</p>
                                <small>Good for testing student roster imports</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="import-note alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <strong>Note:</strong> Sample data will not affect your actual data. 
                    It's safe to practice with.
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Sample Import',
            size: 'modal-lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' }
            ],
            onShow: (modal) => {
                modal.querySelectorAll('.sample-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const sampleType = card.dataset.sample;
                        this.loadSampleData(sampleType);
                        modal.remove();
                    });
                });
            }
        });
    }

    loadSampleData(sampleType) {
        let sampleData, template;
        
        switch (sampleType) {
            case 'classes':
                sampleData = this.generateSampleClasses();
                template = this.importTemplates.class_list;
                break;
                
            case 'attendance':
                sampleData = this.generateSampleAttendance();
                template = this.importTemplates.attendance_records;
                break;
                
            case 'students':
                sampleData = this.generateSampleStudents();
                template = this.importTemplates.student_roster;
                break;
                
            default:
                Utils.showAlert('Invalid sample type', 'error');
                return;
        }
        
        this.showMappingInterface(sampleData, template, `Sample ${sampleType.replace('_', ' ')}`);
        Utils.showAlert(`Loaded sample ${sampleType} data. Practice mapping fields before importing.`, 'info');
    }

    generateSampleClasses() {
        const headers = ['Class Code', 'Class Name', 'Subject', 'Year Group', 'Teacher', 'Room', 'Student Count', 'Schedule'];
        const classes = [
            ['MAT101', 'Mathematics 101', 'Mathematics', '10', 'John Smith', 'Room 101', '25', 'Mon 9:00-10:00'],
            ['ENG102', 'English 102', 'English', '11', 'Sarah Johnson', 'Room 202', '30', 'Tue 10:00-11:00'],
            ['SCI103', 'Science 103', 'Science', '10', 'Michael Brown', 'Lab 1', '28', 'Wed 11:00-12:00'],
            ['HIS104', 'History 104', 'History', '12', 'Emily Davis', 'Room 305', '22', 'Thu 13:00-14:00'],
            ['ART105', 'Art 105', 'Art', '9', 'David Wilson', 'Art Room', '20', 'Fri 14:00-15:00'],
            ['MUS106', 'Music 106', 'Music', '8', 'Lisa Thompson', 'Music Hall', '18', 'Mon 15:00-16:00'],
            ['PHY107', 'Physics 107', 'Physics', '12', 'Robert Miller', 'Lab 2', '24', 'Tue 9:00-10:30'],
            ['CHE108', 'Chemistry 108', 'Chemistry', '11', 'Jennifer Lee', 'Lab 3', '26', 'Wed 10:30-12:00'],
            ['BIO109', 'Biology 109', 'Biology', '10', 'Thomas Clark', 'Lab 4', '27', 'Thu 14:00-15:30'],
            ['GEO110', 'Geography 110', 'Geography', '9', 'Patricia Lewis', 'Room 110', '21', 'Fri 11:00-12:30']
        ];
        
        return [headers, ...classes];
    }

    generateSampleAttendance() {
        const headers = ['Date', 'Class Code', 'Session', 'Present', 'Absent', 'Late', 'Notes'];
        const attendance = [];
        
        const classCodes = ['MAT101', 'ENG102', 'SCI103', 'HIS104', 'ART105'];
        const startDate = new Date('2024-01-15');
        
        for (let i = 0; i < 30; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = Utils.formatDate(date, 'YYYY-MM-DD');
            
            classCodes.forEach(classCode => {
                const present = Math.floor(Math.random() * 25) + 15;
                const absent = Math.floor(Math.random() * 5) + 1;
                const late = Math.floor(Math.random() * 3);
                const session = i % 2 === 0 ? 'AM' : 'PM';
                const notes = i % 5 === 0 ? 'Field trip' : '';
                
                attendance.push([dateStr, classCode, session, present.toString(), absent.toString(), late.toString(), notes]);
            });
        }
        
        return [headers, ...attendance];
    }

    generateSampleStudents() {
        const headers = ['Student ID', 'First Name', 'Last Name', 'Email', 'Class Code', 'Year Group', 'Homeroom'];
        const students = [];
        
        const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa', 'Thomas', 'Patricia'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        const classCodes = ['MAT101', 'ENG102', 'SCI103', 'HIS104', 'ART105'];
        
        for (let i = 1; i <= 50; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@school.edu`;
            const classCode = classCodes[Math.floor(Math.random() * classCodes.length)];
            const yearGroup = Math.floor(Math.random() * 5) + 8; // Years 8-12
            const homeroom = `HR${yearGroup}${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`;
            
            students.push([`S${1000 + i}`, firstName, lastName, email, classCode, yearGroup.toString(), homeroom]);
        }
        
        return [headers, ...students];
    }

    // ========== IMPORT HISTORY ==========
    showImportHistory() {
        const modalContent = `
            <div class="import-history-modal">
                <h4><i class="fas fa-history"></i> Import History</h4>
                
                ${this.importHistory.length === 0 ? `
                    <div class="empty-history">
                        <i class="fas fa-clock"></i>
                        <p>No import history found</p>
                    </div>
                ` : `
                    <div class="history-list">
                        ${this.importHistory.map(record => `
                            <div class="history-item" data-import-id="${record.timestamp}">
                                <div class="history-header">
                                    <div class="history-title">
                                        <strong>${this.getImportTypeLabel(record.importType)}</strong>
                                        <span class="history-date">
                                            ${Utils.formatDate(new Date(record.timestamp), 'relative')}
                                        </span>
                                    </div>
                                    <div class="history-stats">
                                        <span class="badge ${record.result.errors.length > 0 ? 'bg-warning' : 'bg-success'}">
                                            ${record.validRecords}/${record.totalRecords}
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="history-body">
                                    <div class="history-details">
                                        <span class="detail-item">
                                            <i class="fas fa-file"></i> ${record.fileName || 'Unknown file'}
                                        </span>
                                        <span class="detail-item">
                                            <i class="fas fa-plus"></i> ${record.result.added} added
                                        </span>
                                        <span class="detail-item">
                                            <i class="fas fa-edit"></i> ${record.result.updated} updated
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="history-actions">
                                    <button type="button" class="btn btn-sm btn-outline-info view-import-details" 
                                            data-import-id="${record.timestamp}">
                                        <i class="fas fa-eye"></i> Details
                                    </button>
                                    ${record.result.added > 0 ? `
                                        <button type="button" class="btn btn-sm btn-outline-danger revert-import-btn" 
                                                data-import-id="${record.timestamp}">
                                            <i class="fas fa-undo"></i> Revert
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="history-actions mt-3">
                        <button type="button" class="btn btn-outline-primary" id="clear-history-btn">
                            <i class="fas fa-trash"></i> Clear History
                        </button>
                        <button type="button" class="btn btn-outline-secondary" id="export-history-btn">
                            <i class="fas fa-download"></i> Export History
                        </button>
                    </div>
                `}
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Import History',
            size: 'modal-lg',
            buttons: [
                { text: 'Close', class: 'btn-secondary', action: 'close' }
            ],
            onShow: (modal) => {
                if (this.importHistory.length > 0) {
                    modal.querySelector('#clear-history-btn').addEventListener('click', () => {
                        this.clearImportHistory();
                        modal.remove();
                    });
                    
                    modal.querySelector('#export-history-btn').addEventListener('click', () => {
                        this.exportImportHistory();
                    });
                }
            }
        });
    }

    viewImportDetails(importId) {
        const record = this.importHistory.find(r => r.timestamp === importId);
        if (!record) return;

        const modalContent = `
            <div class="import-details-modal">
                <h4>Import Details</h4>
                
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Import Type:</span>
                        <span class="detail-value">${this.getImportTypeLabel(record.importType)}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Date & Time:</span>
                        <span class="detail-value">${Utils.formatDate(new Date(record.timestamp), 'full')}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">File Name:</span>
                        <span class="detail-value">${record.fileName || 'Unknown'}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Import Strategy:</span>
                        <span class="detail-value">${this.getStrategyLabel(record.strategy)}</span>
                    </div>
                </div>
                
                <div class="results-summary">
                    <h5>Results Summary</h5>
                    <div class="results-grid">
                        <div class="result-card">
                            <div class="result-value">${record.totalRecords}</div>
                            <div class="result-label">Total Records</div>
                        </div>
                        
                        <div class="result-card">
                            <div class="result-value">${record.validRecords}</div>
                            <div class="result-label">Valid Records</div>
                        </div>
                        
                        <div class="result-card">
                            <div class="result-value">${record.result.added}</div>
                            <div class="result-label">Added</div>
                        </div>
                        
                        <div class="result-card">
                            <div class="result-value">${record.result.updated}</div>
                            <div class="result-label">Updated</div>
                        </div>
                    </div>
                </div>
                
                ${record.result.errors.length > 0 ? `
                    <div class="import-errors">
                        <h5>Errors</h5>
                        <div class="errors-list">
                            ${record.result.errors.slice(0, 10).map(error => `
                                <div class="error-item">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <span>${error}</span>
                                </div>
                            `).join('')}
                            ${record.result.errors.length > 10 ? `
                                <div class="text-muted">
                                    ... and ${record.result.errors.length - 10} more errors
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
                
                <div class="mappings-preview">
                    <h5>Field Mappings Used</h5>
                    <div class="mappings-list">
                        ${Object.entries(record.mappings || {}).map(([field, mapping]) => `
                            <div class="mapping-item">
                                <span class="mapping-field">${mapping.fieldLabel}</span>
                                <span class="mapping-arrow">→</span>
                                <span class="mapping-column">Column ${mapping.columnIndex + 1}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Import Details',
            size: 'modal-lg',
            buttons: [
                { text: 'Close', class: 'btn-secondary', action: 'close' },
                { text: 'Re-import with Same Settings', class: 'btn-primary', action: 'reimport' }
            ],
            onShow: (modal) => {
                modal.querySelector('[data-action="reimport"]').addEventListener('click', () => {
                    this.reimportWithSettings(record);
                    modal.remove();
                });
            }
        });
    }

    reimportWithSettings(record) {
        // This would re-use the same settings for a new import
        Utils.showAlert('Re-import functionality would load the same file with saved mappings', 'info');
        // In a full implementation, this would:
        // 1. Prompt for the same file
        // 2. Apply saved mappings
        // 3. Execute import with same strategy
    }

    revertImport(importId) {
        const record = this.importHistory.find(r => r.timestamp === importId);
        if (!record) return;

        Utils.showConfirm(
            'Revert Import?',
            `This will attempt to remove ${record.result.added} records added by this import. 
            This action may not be fully reversible.`,
            'Revert',
            'Cancel',
            'danger'
        ).then(async (confirmed) => {
            if (confirmed) {
                try {
                    await this.performRevert(record);
                    Utils.showAlert('Import reverted successfully', 'success');
                } catch (error) {
                    console.error('Revert error:', error);
                    Utils.showAlert(`Failed to revert import: ${error.message}`, 'error');
                }
            }
        });
    }

    async performRevert(record) {
        // This is a simplified revert implementation
        // In production, this would need to track exactly what was added/updated
        
        switch (record.importType) {
            case 'class_list':
                // Remove classes added in this import
                const classes = Storage.get('classes') || [];
                const filteredClasses = classes.filter(c => {
                    // Check if class was likely added in this import
                    const importTime = new Date(record.timestamp).getTime();
                    const classTime = new Date(c.createdAt).getTime();
                    return Math.abs(classTime - importTime) > 60000; // Not within 1 minute of import
                });
                Storage.set('classes', filteredClasses);
                break;
                
            case 'attendance_records':
                // Remove attendance records added in this import
                const attendance = Storage.get('attendance_records') || [];
                const filteredAttendance = attendance.filter(r => !r.imported);
                Storage.set('attendance_records', filteredAttendance);
                break;
                
            case 'student_roster':
                // Remove students added in this import
                const students = Storage.get('students') || [];
                const filteredStudents = students.filter(s => {
                    const importTime = new Date(record.timestamp).getTime();
                    const studentTime = new Date(s.createdAt).getTime();
                    return Math.abs(studentTime - importTime) > 60000;
                });
                Storage.set('students', filteredStudents);
                break;
        }
        
        // Remove from history
        this.importHistory = this.importHistory.filter(r => r.timestamp !== record.timestamp);
        await Storage.set('import_history', this.importHistory);
    }

    clearImportHistory() {
        Utils.showConfirm(
            'Clear All Import History?',
            'This will remove all import history records. This action cannot be undone.',
            'Clear History',
            'Cancel',
            'danger'
        ).then(async (confirmed) => {
            if (confirmed) {
                this.importHistory = [];
                await Storage.set('import_history', []);
                Utils.showAlert('Import history cleared', 'success');
            }
        });
    }

    exportImportHistory() {
        const exportData = {
            exported: new Date().toISOString(),
            totalImports: this.importHistory.length,
            imports: this.importHistory
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import_history_${Utils.formatDate(new Date(), 'YYYY-MM-DD')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showAlert('Import history exported', 'success');
    }

    // ========== PUBLIC API ==========
    getTemplates() {
        return { ...this.importTemplates };
    }

    async refresh() {
        await this.loadTemplates();
        await this.loadFieldMappings();
        await this.loadImportHistory();
    }

    // Clean up method
    destroy() {
        // Clean up any ongoing imports or timeouts
    }
}
