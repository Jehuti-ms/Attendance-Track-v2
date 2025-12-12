// attendance-track-v2/assets/js/modules/export.js
import { Utils, Storage } from './utils.js';

export class ExportModule {
    constructor(app) {
        this.app = app;
        this.exportTemplates = {};
        this.exportHistory = [];
        this.initialize();
    }

    async initialize() {
        await this.loadTemplates();
        await this.loadExportHistory();
        this.setupEventListeners();
        this.initializeVendors();
    }

    async loadTemplates() {
        this.exportTemplates = await Storage.get('export_templates') || {
            'daily_attendance': {
                name: 'Daily Attendance Report',
                description: 'Daily attendance summary for selected classes',
                format: 'pdf',
                sections: ['summary', 'by_class', 'statistics'],
                filters: ['date', 'classes', 'session'],
                layout: 'portrait'
            },
            'weekly_summary': {
                name: 'Weekly Summary Report',
                description: 'Weekly attendance summary with trends',
                format: 'excel',
                sections: ['summary', 'trends', 'detailed', 'charts'],
                filters: ['week', 'classes', 'term'],
                layout: 'landscape'
            },
            'term_report': {
                name: 'Term Report',
                description: 'Complete term attendance report',
                format: 'pdf',
                sections: ['overview', 'class_performance', 'student_attendance', 'analysis'],
                filters: ['term', 'year_group', 'subject'],
                layout: 'portrait'
            },
            'student_attendance': {
                name: 'Student Attendance Record',
                description: 'Individual student attendance history',
                format: 'pdf',
                sections: ['student_info', 'attendance_history', 'statistics', 'comments'],
                filters: ['student', 'date_range', 'class'],
                layout: 'portrait'
            },
            'class_register': {
                name: 'Class Register',
                description: 'Class attendance register for printing',
                format: 'pdf',
                sections: ['class_info', 'student_list', 'attendance_grid'],
                filters: ['class', 'date_range'],
                layout: 'landscape'
            },
            'data_backup': {
                name: 'Complete Data Backup',
                description: 'Full system data backup',
                format: 'json',
                sections: ['all_data'],
                filters: ['none'],
                layout: 'none'
            }
        };
    }

    async loadExportHistory() {
        this.exportHistory = await Storage.get('export_history') || [];
    }

    initializeVendors() {
        // Check if required vendor libraries are loaded
        this.checkVendorLibraries();
    }

    checkVendorLibraries() {
        // These would be loaded from assets/js/vendors/
        const requiredLibs = {
            'jsPDF': typeof jsPDF !== 'undefined',
            'autoTable': typeof jsPDF !== 'undefined' && jsPDF.API.autoTable,
            'html2canvas': typeof html2canvas !== 'undefined'
        };
        
        this.vendorsAvailable = requiredLibs;
        
        if (!requiredLibs.jsPDF) {
            console.warn('jsPDF library not loaded. PDF exports will be limited.');
        }
        
        if (!requiredLibs.html2canvas) {
            console.warn('html2canvas library not loaded. Some export features may not work.');
        }
    }

    setupEventListeners() {
        // Export buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('#export-data-btn')) {
                this.showExportModal();
            } else if (e.target.matches('#quick-export-btn')) {
                this.quickExport();
            } else if (e.target.matches('#export-custom-btn')) {
                this.showCustomExport();
            } else if (e.target.matches('#export-history-btn')) {
                this.showExportHistory();
            }
        });

        // Template selection
        document.addEventListener('change', (e) => {
            if (e.target.matches('#export-template')) {
                this.onTemplateSelected(e.target.value);
            } else if (e.target.matches('#export-format')) {
                this.onFormatSelected(e.target.value);
            }
        });

        // Filter controls
        document.addEventListener('change', (e) => {
            if (e.target.matches('.export-filter')) {
                this.updateExportPreview();
            }
        });

        // Preview controls
        document.addEventListener('click', (e) => {
            if (e.target.matches('#preview-export-btn')) {
                this.previewExport();
            } else if (e.target.matches('#generate-export-btn')) {
                this.generateExport();
            } else if (e.target.matches('#schedule-export-btn')) {
                this.scheduleExport();
            } else if (e.target.matches('#cancel-export-btn')) {
                this.cancelExport();
            }
        });

        // History actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.re-export-btn')) {
                this.reExport(e.target.dataset.exportId);
            } else if (e.target.matches('.delete-export-btn')) {
                this.deleteExport(e.target.dataset.exportId);
            } else if (e.target.matches('#clear-history-btn')) {
                this.clearExportHistory();
            }
        });
    }

    renderExportInterface() {
        const container = document.getElementById('export-container');
        if (!container) return;

        container.innerHTML = `
            <div class="export-interface">
                <div class="export-header">
                    <h3><i class="fas fa-file-export"></i> Export Data</h3>
                    <p class="text-muted">Export attendance data in various formats for reporting and analysis</p>
                </div>

                <div class="export-quick-actions">
                    <h5>Quick Export</h5>
                    <div class="quick-actions-grid">
                        <button class="btn btn-outline-primary" id="quick-export-btn" data-type="today">
                            <i class="fas fa-calendar-day"></i> Today's Attendance
                        </button>
                        <button class="btn btn-outline-primary" id="quick-export-btn" data-type="week">
                            <i class="fas fa-calendar-week"></i> This Week
                        </button>
                        <button class="btn btn-outline-primary" id="quick-export-btn" data-type="term">
                            <i class="fas fa-calendar-alt"></i> Current Term
                        </button>
                        <button class="btn btn-outline-primary" id="quick-export-btn" data-type="all">
                            <i class="fas fa-database"></i> All Data
                        </button>
                    </div>
                </div>

                <div class="export-templates">
                    <h5>Report Templates</h5>
                    <div class="templates-grid" id="templates-container">
                        <!-- Templates will be loaded here -->
                    </div>
                </div>

                <div class="export-custom">
                    <div class="custom-header">
                        <h5>Custom Export</h5>
                        <p class="text-muted">Create a custom export with specific filters and options</p>
                    </div>
                    <button class="btn btn-primary" id="export-custom-btn">
                        <i class="fas fa-cogs"></i> Create Custom Export
                    </button>
                </div>

                <div class="export-history-link">
                    <button class="btn btn-link" id="export-history-btn">
                        <i class="fas fa-history"></i> View Export History
                    </button>
                </div>
            </div>
        `;

        this.renderTemplates();
        
        // Add event listeners for quick export buttons
        container.querySelectorAll('#quick-export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exportType = e.target.dataset.type;
                this.handleQuickExport(exportType);
            });
        });
    }

    renderTemplates() {
        const container = document.getElementById('templates-container');
        if (!container) return;

        container.innerHTML = Object.entries(this.exportTemplates).map(([key, template]) => `
            <div class="template-card" data-template="${key}">
                <div class="template-header">
                    <div class="template-icon">
                        <i class="fas ${this.getFormatIcon(template.format)}"></i>
                    </div>
                    <div class="template-info">
                        <h6>${template.name}</h6>
                        <span class="badge ${this.getFormatBadgeClass(template.format)}">
                            ${template.format.toUpperCase()}
                        </span>
                    </div>
                </div>
                <div class="template-body">
                    <p class="template-description">${template.description}</p>
                    <div class="template-sections">
                        ${template.sections.slice(0, 3).map(section => `
                            <span class="section-badge">
                                ${this.getSectionName(section)}
                            </span>
                        `).join('')}
                        ${template.sections.length > 3 ? `
                            <span class="section-badge">
                                +${template.sections.length - 3} more
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="template-footer">
                    <button class="btn btn-sm btn-primary use-template-btn" data-template="${key}">
                        <i class="fas fa-file-export"></i> Use Template
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
    }

    getFormatIcon(format) {
        const icons = {
            'pdf': 'fa-file-pdf',
            'excel': 'fa-file-excel',
            'csv': 'fa-file-csv',
            'json': 'fa-file-code'
        };
        return icons[format] || 'fa-file';
    }

    getFormatBadgeClass(format) {
        const classes = {
            'pdf': 'bg-danger',
            'excel': 'bg-success',
            'csv': 'bg-info',
            'json': 'bg-secondary'
        };
        return classes[format] || 'bg-secondary';
    }

    getSectionName(section) {
        const names = {
            'summary': 'Summary',
            'by_class': 'By Class',
            'statistics': 'Statistics',
            'trends': 'Trends',
            'detailed': 'Detailed',
            'charts': 'Charts',
            'overview': 'Overview',
            'class_performance': 'Class Performance',
            'student_attendance': 'Student Attendance',
            'analysis': 'Analysis',
            'student_info': 'Student Info',
            'attendance_history': 'Attendance History',
            'comments': 'Comments',
            'class_info': 'Class Info',
            'student_list': 'Student List',
            'attendance_grid': 'Attendance Grid',
            'all_data': 'All Data'
        };
        return names[section] || section;
    }

    // ========== QUICK EXPORT ==========
    handleQuickExport(type) {
        switch (type) {
            case 'today':
                this.exportTodayAttendance();
                break;
            case 'week':
                this.exportWeeklySummary();
                break;
            case 'term':
                this.exportTermReport();
                break;
            case 'all':
                this.exportAllData();
                break;
        }
    }

    async exportTodayAttendance() {
        const today = Utils.formatDate(new Date(), 'YYYY-MM-DD');
        const attendance = Storage.get('attendance_records') || [];
        const todayRecords = attendance.filter(record => record.date === today);
        
        if (todayRecords.length === 0) {
            Utils.showAlert('No attendance records found for today', 'info');
            return;
        }

        const data = await this.prepareDailyAttendanceData(todayRecords, today);
        await this.generatePDFReport('daily_attendance', data, `Today's Attendance - ${today}`);
    }

    async exportWeeklySummary() {
        const weekData = await this.getWeeklyData();
        if (weekData.records.length === 0) {
            Utils.showAlert('No attendance records found for this week', 'info');
            return;
        }

        await this.generateExcelReport('weekly_summary', weekData, 'Weekly Attendance Summary');
    }

    async exportTermReport() {
        const termData = await this.getCurrentTermData();
        if (termData.records.length === 0) {
            Utils.showAlert('No attendance records found for current term', 'info');
            return;
        }

        await this.generatePDFReport('term_report', termData, 'Term Attendance Report');
    }

    async exportAllData() {
        const allData = await this.getAllData();
        await this.generateJSONExport(allData, 'attendance_data_backup');
    }

    // ========== TEMPLATE-BASED EXPORT ==========
    useTemplate(templateKey) {
        const template = this.exportTemplates[templateKey];
        if (!template) return;

        this.showExportModal(template);
    }

    showExportModal(template = null) {
        const modalContent = `
            <div class="export-modal">
                <h4><i class="fas fa-file-export"></i> Export Data</h4>
                
                <div class="export-setup">
                    <div class="form-group">
                        <label for="export-template">Report Template</label>
                        <select id="export-template" class="form-control">
                            <option value="">-- Select Template --</option>
                            ${Object.entries(this.exportTemplates).map(([key, tpl]) => `
                                <option value="${key}" ${template && template.name === tpl.name ? 'selected' : ''}>
                                    ${tpl.name} (${tpl.format.toUpperCase()})
                                </option>
                            `).join('')}
                            <option value="custom">Custom Report</option>
                        </select>
                    </div>

                    <div id="export-options-container">
                        <!-- Options will be loaded based on template selection -->
                    </div>

                    <div id="export-preview-container" class="mt-4">
                        <!-- Preview will be shown here -->
                    </div>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Export Data',
            size: 'modal-lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
                { text: 'Preview', class: 'btn-info', action: 'preview' },
                { text: 'Export', class: 'btn-primary', action: 'export' }
            ],
            onShow: (modal) => {
                // Set initial template if provided
                if (template) {
                    this.loadTemplateOptions(template, modal);
                }

                // Template selection change
                modal.querySelector('#export-template').addEventListener('change', (e) => {
                    const selectedTemplate = this.exportTemplates[e.target.value];
                    if (selectedTemplate) {
                        this.loadTemplateOptions(selectedTemplate, modal);
                    } else if (e.target.value === 'custom') {
                        this.loadCustomOptions(modal);
                    }
                });

                // Button actions
                modal.querySelector('[data-action="preview"]').addEventListener('click', () => {
                    this.previewExportModal(modal);
                });

                modal.querySelector('[data-action="export"]').addEventListener('click', () => {
                    this.executeExportFromModal(modal);
                });
            }
        });
    }

    loadTemplateOptions(template, modal) {
        const container = modal.querySelector('#export-options-container');
        if (!container) return;

        container.innerHTML = `
            <div class="template-options">
                <div class="option-section">
                    <h6>Export Format</h6>
                    <select id="export-format" class="form-control">
                        <option value="pdf" ${template.format === 'pdf' ? 'selected' : ''}>PDF Document</option>
                        <option value="excel" ${template.format === 'excel' ? 'selected' : ''}>Excel Spreadsheet</option>
                        <option value="csv" ${template.format === 'csv' ? 'selected' : ''}>CSV File</option>
                        <option value="json" ${template.format === 'json' ? 'selected' : ''}>JSON Data</option>
                    </select>
                </div>

                <div class="option-section">
                    <h6>Report Sections</h6>
                    <div class="sections-list">
                        ${template.sections.map(section => `
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input section-checkbox" 
                                       id="section-${section}" value="${section}" checked>
                                <label class="form-check-label" for="section-${section}">
                                    ${this.getSectionName(section)}
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="option-section">
                    <h6>Filters</h6>
                    <div class="filters-container" id="filters-container">
                        <!-- Filters will be loaded based on template -->
                    </div>
                </div>

                <div class="option-section">
                    <h6>Additional Options</h6>
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="include-charts" checked>
                        <label class="form-check-label" for="include-charts">
                            Include charts and graphs
                        </label>
                    </div>
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="include-summary" checked>
                        <label class="form-check-label" for="include-summary">
                            Include executive summary
                        </label>
                    </div>
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="anonymize-data">
                        <label class="form-check-label" for="anonymize-data">
                            Anonymize student data
                        </label>
                    </div>
                </div>
            </div>
        `;

        this.loadTemplateFilters(template, modal);
    }

    loadTemplateFilters(template, modal) {
        const container = modal.querySelector('#filters-container');
        if (!container) return;

        let filtersHTML = '';

        template.filters.forEach(filter => {
            switch (filter) {
                case 'date':
                    filtersHTML += this.getDateFilter();
                    break;
                case 'date_range':
                    filtersHTML += this.getDateRangeFilter();
                    break;
                case 'classes':
                    filtersHTML += this.getClassFilter();
                    break;
                case 'session':
                    filtersHTML += this.getSessionFilter();
                    break;
                case 'week':
                    filtersHTML += this.getWeekFilter();
                    break;
                case 'term':
                    filtersHTML += this.getTermFilter();
                    break;
                case 'year_group':
                    filtersHTML += this.getYearGroupFilter();
                    break;
                case 'subject':
                    filtersHTML += this.getSubjectFilter();
                    break;
                case 'student':
                    filtersHTML += this.getStudentFilter();
                    break;
                case 'class':
                    filtersHTML += this.getSingleClassFilter();
                    break;
            }
        });

        container.innerHTML = filtersHTML;
    }

    getDateFilter() {
        const today = Utils.formatDate(new Date(), 'YYYY-MM-DD');
        return `
            <div class="form-group">
                <label for="filter-date">Date</label>
                <input type="date" id="filter-date" class="form-control export-filter" value="${today}">
            </div>
        `;
    }

    getDateRangeFilter() {
        const today = Utils.formatDate(new Date(), 'YYYY-MM-DD');
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = Utils.formatDate(oneWeekAgo, 'YYYY-MM-DD');

        return `
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="filter-start-date">Start Date</label>
                        <input type="date" id="filter-start-date" class="form-control export-filter" 
                               value="${oneWeekAgoStr}">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="filter-end-date">End Date</label>
                        <input type="date" id="filter-end-date" class="form-control export-filter" 
                               value="${today}">
                    </div>
                </div>
            </div>
        `;
    }

    getClassFilter() {
        const classes = Storage.get('classes') || [];
        return `
            <div class="form-group">
                <label for="filter-classes">Classes</label>
                <select id="filter-classes" class="form-control export-filter" multiple>
                    <option value="all">All Classes</option>
                    ${classes.map(cls => `
                        <option value="${cls.id}">${cls.classCode} - ${cls.className}</option>
                    `).join('')}
                </select>
                <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple classes</small>
            </div>
        `;
    }

    getSessionFilter() {
        return `
            <div class="form-group">
                <label for="filter-session">Session</label>
                <select id="filter-session" class="form-control export-filter">
                    <option value="all">All Sessions</option>
                    <option value="AM">Morning (AM)</option>
                    <option value="PM">Afternoon (PM)</option>
                    <option value="Both">Both Sessions</option>
                </select>
            </div>
        `;
    }

    getWeekFilter() {
        const weeks = this.getCurrentTermWeeks();
        return `
            <div class="form-group">
                <label for="filter-week">Week</label>
                <select id="filter-week" class="form-control export-filter">
                    <option value="current">Current Week</option>
                    <option value="last">Last Week</option>
                    ${weeks.map(week => `
                        <option value="week${week}">Week ${week}</option>
                    `).join('')}
                    <option value="all">All Weeks</option>
                </select>
            </div>
        `;
    }

    getCurrentTermWeeks() {
        // Get current term from maintenance module or settings
        const terms = Storage.get('attendance_terms') || [];
        const currentTerm = terms.find(term => term.active) || terms[0];
        
        if (!currentTerm) return Array.from({length: 12}, (_, i) => i + 1);
        
        return Array.from({length: currentTerm.weeks || 12}, (_, i) => i + 1);
    }

    getTermFilter() {
        const terms = Storage.get('attendance_terms') || [];
        return `
            <div class="form-group">
                <label for="filter-term">Term</label>
                <select id="filter-term" class="form-control export-filter">
                    <option value="current">Current Term</option>
                    ${terms.map(term => `
                        <option value="${term.id}">${term.name}</option>
                    `).join('')}
                    <option value="all">All Terms</option>
                </select>
            </div>
        `;
    }

    getYearGroupFilter() {
        return `
            <div class="form-group">
                <label for="filter-year-group">Year Group</label>
                <select id="filter-year-group" class="form-control export-filter">
                    <option value="all">All Year Groups</option>
                    ${Array.from({length: 13}, (_, i) => i + 1).map(year => `
                        <option value="${year}">Year ${year}</option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    getSubjectFilter() {
        const classes = Storage.get('classes') || [];
        const subjects = [...new Set(classes.map(c => c.subject).filter(s => s))];
        
        return `
            <div class="form-group">
                <label for="filter-subject">Subject</label>
                <select id="filter-subject" class="form-control export-filter">
                    <option value="all">All Subjects</option>
                    ${subjects.map(subject => `
                        <option value="${subject}">${subject}</option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    getStudentFilter() {
        const students = Storage.get('students') || [];
        return `
            <div class="form-group">
                <label for="filter-student">Student</label>
                <select id="filter-student" class="form-control export-filter">
                    <option value="">-- Select Student --</option>
                    ${students.map(student => `
                        <option value="${student.id}">
                            ${student.studentId} - ${student.firstName} ${student.lastName}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    getSingleClassFilter() {
        const classes = Storage.get('classes') || [];
        return `
            <div class="form-group">
                <label for="filter-single-class">Class</label>
                <select id="filter-single-class" class="form-control export-filter">
                    <option value="">-- Select Class --</option>
                    ${classes.map(cls => `
                        <option value="${cls.id}">${cls.classCode} - ${cls.className}</option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    loadCustomOptions(modal) {
        const container = modal.querySelector('#export-options-container');
        if (!container) return;

        container.innerHTML = `
            <div class="custom-options">
                <div class="option-section">
                    <h6>Export Type</h6>
                    <div class="form-check">
                        <input type="radio" class="form-check-input" name="export-type" 
                               id="export-data" value="data" checked>
                        <label class="form-check-label" for="export-data">
                            Raw Data Export
                        </label>
                    </div>
                    <div class="form-check">
                        <input type="radio" class="form-check-input" name="export-type" 
                               id="export-report" value="report">
                        <label class="form-check-label" for="export-report">
                            Formatted Report
                        </label>
                    </div>
                </div>

                <div class="option-section">
                    <h6>Data to Include</h6>
                    <div class="data-selection">
                        <div class="form-check">
                            <input type="checkbox" class="form-check-input" id="include-classes" checked>
                            <label class="form-check-label" for="include-classes">
                                Classes
                            </label>
                        </div>
                        <div class="form-check">
                            <input type="checkbox" class="form-check-input" id="include-attendance" checked>
                            <label class="form-check-label" for="include-attendance">
                                Attendance Records
                            </label>
                        </div>
                        <div class="form-check">
                            <input type="checkbox" class="form-check-input" id="include-students">
                            <label class="form-check-label" for="include-students">
                                Students
                            </label>
                        </div>
                        <div class="form-check">
                            <input type="checkbox" class="form-check-input" id="include-teachers">
                            <label class="form-check-label" for="include-teachers">
                                Teachers
                            </label>
                        </div>
                        <div class="form-check">
                            <input type="checkbox" class="form-check-input" id="include-settings">
                            <label class="form-check-label" for="include-settings">
                                Settings
                            </label>
                        </div>
                    </div>
                </div>

                <div class="option-section">
                    <h6>Filters</h6>
                    <div class="custom-filters">
                        <div class="form-group">
                            <label for="custom-date-range">Date Range</label>
                            <div class="row">
                                <div class="col-md-6">
                                    <input type="date" id="custom-start-date" class="form-control" 
                                           placeholder="Start Date">
                                </div>
                                <div class="col-md-6">
                                    <input type="date" id="custom-end-date" class="form-control" 
                                           placeholder="End Date">
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="custom-classes">Classes</label>
                            <select id="custom-classes" class="form-control" multiple>
                                ${this.getClassOptions()}
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="custom-year-groups">Year Groups</label>
                            <select id="custom-year-groups" class="form-control" multiple>
                                ${Array.from({length: 13}, (_, i) => i + 1).map(year => `
                                    <option value="${year}">Year ${year}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="option-section">
                    <h6>Format Options</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="custom-format">Format</label>
                                <select id="custom-format" class="form-control">
                                    <option value="json">JSON</option>
                                    <option value="csv">CSV</option>
                                    <option value="excel">Excel</option>
                                    <option value="pdf">PDF</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="custom-compression">Compression</label>
                                <select id="custom-compression" class="form-control">
                                    <option value="none">None</option>
                                    <option value="zip">ZIP Archive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getClassOptions() {
        const classes = Storage.get('classes') || [];
        return classes.map(cls => `
            <option value="${cls.id}">
                ${cls.classCode} - ${cls.className} (Year ${cls.yearGroup})
            </option>
        `).join('');
    }

    previewExportModal(modal) {
        const templateSelect = modal.querySelector('#export-template');
        const templateKey = templateSelect.value;
        
        if (!templateKey || templateKey === 'custom') {
            this.previewCustomExport(modal);
        } else {
            this.previewTemplateExport(modal, templateKey);
        }
    }

    previewTemplateExport(modal, templateKey) {
        const template = this.exportTemplates[templateKey];
        if (!template) return;

        const filters = this.getCurrentFilters(modal);
        const data = this.getDataForPreview(filters);

        const previewContainer = modal.querySelector('#export-preview-container');
        previewContainer.innerHTML = `
            <div class="export-preview">
                <h6><i class="fas fa-eye"></i> Export Preview</h6>
                
                <div class="preview-summary">
                    <div class="summary-item">
                        <span class="label">Report:</span>
                        <span class="value">${template.name}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Format:</span>
                        <span class="value">${template.format.toUpperCase()}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Records:</span>
                        <span class="value">${data.records.length}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Size:</span>
                        <span class="value">${this.estimateFileSize(data)}</span>
                    </div>
                </div>

                <div class="preview-sample">
                    <h6>Sample Data (First 5 records)</h6>
                    <div class="sample-table">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Class</th>
                                    <th>Present</th>
                                    <th>Absent</th>
                                    <th>Late</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.records.slice(0, 5).map(record => `
                                    <tr>
                                        <td>${record.date}</td>
                                        <td>${record.classCode}</td>
                                        <td>${record.present}</td>
                                        <td>${record.absent}</td>
                                        <td>${record.late || 0}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    previewCustomExport(modal) {
        const filters = this.getCustomFilters(modal);
        const data = this.getDataForCustomPreview(filters);

        const previewContainer = modal.querySelector('#export-preview-container');
        previewContainer.innerHTML = `
            <div class="export-preview">
                <h6><i class="fas fa-eye"></i> Custom Export Preview</h6>
                
                <div class="preview-summary">
                    <div class="summary-item">
                        <span class="label">Export Type:</span>
                        <span class="value">Custom Data Export</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Format:</span>
                        <span class="value">
                            ${modal.querySelector('#custom-format')?.value.toUpperCase() || 'JSON'}
                        </span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Total Items:</span>
                        <span class="value">${data.totalItems}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Estimated Size:</span>
                        <span class="value">${data.estimatedSize}</span>
                    </div>
                </div>

                <div class="preview-breakdown">
                    <h6>Data Breakdown</h6>
                    <ul class="breakdown-list">
                        ${data.breakdown.map(item => `
                            <li>
                                <span class="item-name">${item.name}:</span>
                                <span class="item-count">${item.count} items</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    getCurrentFilters(modal) {
        const filters = {};
        
        // Get date filter
        const dateFilter = modal.querySelector('#filter-date');
        if (dateFilter) {
            filters.date = dateFilter.value;
        }

        // Get date range filters
        const startDate = modal.querySelector('#filter-start-date');
        const endDate = modal.querySelector('#filter-end-date');
        if (startDate && endDate) {
            filters.dateRange = {
                start: startDate.value,
                end: endDate.value
            };
        }

        // Get class filters
        const classFilter = modal.querySelector('#filter-classes');
        if (classFilter) {
            filters.classes = Array.from(classFilter.selectedOptions).map(opt => opt.value);
        }

        // Get session filter
        const sessionFilter = modal.querySelector('#filter-session');
        if (sessionFilter) {
            filters.session = sessionFilter.value;
        }

        // Get week filter
        const weekFilter = modal.querySelector('#filter-week');
        if (weekFilter) {
            filters.week = weekFilter.value;
        }

        // Get term filter
        const termFilter = modal.querySelector('#filter-term');
        if (termFilter) {
            filters.term = termFilter.value;
        }

        // Get year group filter
        const yearGroupFilter = modal.querySelector('#filter-year-group');
        if (yearGroupFilter) {
            filters.yearGroup = yearGroupFilter.value;
        }

        // Get subject filter
        const subjectFilter = modal.querySelector('#filter-subject');
        if (subjectFilter) {
            filters.subject = subjectFilter.value;
        }

        // Get student filter
        const studentFilter = modal.querySelector('#filter-student');
        if (studentFilter) {
            filters.student = studentFilter.value;
        }

        // Get single class filter
        const singleClassFilter = modal.querySelector('#filter-single-class');
        if (singleClassFilter) {
            filters.singleClass = singleClassFilter.value;
        }

        return filters;
    }

    getDataForPreview(filters) {
        let attendance = Storage.get('attendance_records') || [];
        const classes = Storage.get('classes') || [];

        // Apply filters
        if (filters.date) {
            attendance = attendance.filter(record => record.date === filters.date);
        }

        if (filters.dateRange) {
            attendance = attendance.filter(record => {
                return record.date >= filters.dateRange.start && 
                       record.date <= filters.dateRange.end;
            });
        }

        if (filters.classes && !filters.classes.includes('all')) {
            attendance = attendance.filter(record => 
                filters.classes.includes(record.classId)
            );
        }

        if (filters.session && filters.session !== 'all') {
            attendance = attendance.filter(record => 
                record.session === filters.session || 
                (filters.session === 'Both' && record.session === 'Both')
            );
        }

        if (filters.term && filters.term !== 'all' && filters.term !== 'current') {
            // Filter by term - would need term date ranges
            // For now, just return all
        }

        if (filters.yearGroup && filters.yearGroup !== 'all') {
            // Filter by year group
            const yearGroupClasses = classes.filter(cls => 
                cls.yearGroup === parseInt(filters.yearGroup)
            ).map(cls => cls.id);
            
            attendance = attendance.filter(record => 
                yearGroupClasses.includes(record.classId)
            );
        }

        if (filters.subject && filters.subject !== 'all') {
            // Filter by subject
            const subjectClasses = classes.filter(cls => 
                cls.subject === filters.subject
            ).map(cls => cls.id);
            
            attendance = attendance.filter(record => 
                subjectClasses.includes(record.classId)
            );
        }

        if (filters.student) {
            // This would need student attendance data
            // For now, just return all
        }

        if (filters.singleClass) {
            attendance = attendance.filter(record => 
                record.classId === filters.singleClass
            );
        }

        return {
            records: attendance,
            classes: classes,
            totalRecords: attendance.length,
            dateRange: filters.dateRange || { start: '', end: '' }
        };
    }

    getCustomFilters(modal) {
        const filters = {};
        
        // Get export type
        const exportType = modal.querySelector('input[name="export-type"]:checked');
        if (exportType) {
            filters.exportType = exportType.value;
        }

        // Get data to include
        filters.includeClasses = modal.querySelector('#include-classes')?.checked || false;
        filters.includeAttendance = modal.querySelector('#include-attendance')?.checked || false;
        filters.includeStudents = modal.querySelector('#include-students')?.checked || false;
        filters.includeTeachers = modal.querySelector('#include-teachers')?.checked || false;
        filters.includeSettings = modal.querySelector('#include-settings')?.checked || false;

        // Get date range
        const startDate = modal.querySelector('#custom-start-date')?.value;
        const endDate = modal.querySelector('#custom-end-date')?.value;
        if (startDate && endDate) {
            filters.dateRange = { start: startDate, end: endDate };
        }

        // Get class filters
        const classFilter = modal.querySelector('#custom-classes');
        if (classFilter) {
            filters.classes = Array.from(classFilter.selectedOptions).map(opt => opt.value);
        }

        // Get year group filters
        const yearGroupFilter = modal.querySelector('#custom-year-groups');
        if (yearGroupFilter) {
            filters.yearGroups = Array.from(yearGroupFilter.selectedOptions).map(opt => opt.value);
        }

        // Get format
        const format = modal.querySelector('#custom-format')?.value;
        if (format) {
            filters.format = format;
        }

        // Get compression
        const compression = modal.querySelector('#custom-compression')?.value;
        if (compression) {
            filters.compression = compression;
        }

        return filters;
    }

    getDataForCustomPreview(filters) {
        const breakdown = [];
        let totalItems = 0;

        if (filters.includeClasses) {
            const classes = Storage.get('classes') || [];
            const filteredClasses = this.filterClasses(classes, filters);
            breakdown.push({ name: 'Classes', count: filteredClasses.length });
            totalItems += filteredClasses.length;
        }

        if (filters.includeAttendance) {
            const attendance = Storage.get('attendance_records') || [];
            const filteredAttendance = this.filterAttendance(attendance, filters);
            breakdown.push({ name: 'Attendance Records', count: filteredAttendance.length });
            totalItems += filteredAttendance.length;
        }

        if (filters.includeStudents) {
            const students = Storage.get('students') || [];
            const filteredStudents = this.filterStudents(students, filters);
            breakdown.push({ name: 'Students', count: filteredStudents.length });
            totalItems += filteredStudents.length;
        }

        if (filters.includeTeachers) {
            const teachers = Storage.get('teachers') || [];
            breakdown.push({ name: 'Teachers', count: teachers.length });
            totalItems += teachers.length;
        }

        if (filters.includeSettings) {
            breakdown.push({ name: 'Settings', count: 1 });
            totalItems += 1;
        }

        // Estimate file size (rough approximation)
        const estimatedSize = this.estimateCustomExportSize(breakdown);

        return {
            totalItems: totalItems,
            estimatedSize: estimatedSize,
            breakdown: breakdown
        };
    }

    filterClasses(classes, filters) {
        let filtered = [...classes];

        if (filters.classes && filters.classes.length > 0) {
            filtered = filtered.filter(cls => filters.classes.includes(cls.id));
        }

        if (filters.yearGroups && filters.yearGroups.length > 0) {
            filtered = filtered.filter(cls => 
                filters.yearGroups.includes(cls.yearGroup.toString())
            );
        }

        return filtered;
    }

    filterAttendance(attendance, filters) {
        let filtered = [...attendance];

        if (filters.dateRange) {
            filtered = filtered.filter(record => {
                return record.date >= filters.dateRange.start && 
                       record.date <= filters.dateRange.end;
            });
        }

        if (filters.classes && filters.classes.length > 0) {
            filtered = filtered.filter(record => 
                filters.classes.includes(record.classId)
            );
        }

        return filtered;
    }

    filterStudents(students, filters) {
        let filtered = [...students];

        if (filters.classes && filters.classes.length > 0) {
            // This would need class-student relationships
            // For now, just return all
        }

        return filtered;
    }

    estimateCustomExportSize(breakdown) {
        // Rough size estimation in KB
        let totalSize = 0;
        
        breakdown.forEach(item => {
            // Average sizes per item
            const sizePerItem = {
                'Classes': 0.5,
                'Attendance Records': 0.3,
                'Students': 0.4,
                'Teachers': 0.4,
                'Settings': 0.2
            };
            
            totalSize += item.count * (sizePerItem[item.name] || 0.3);
        });

        if (totalSize < 1024) {
            return `${Math.round(totalSize)} KB`;
        } else {
            return `${(totalSize / 1024).toFixed(1)} MB`;
        }
    }

    estimateFileSize(data) {
        const recordSize = 100; // bytes per record (approximate)
        const totalSize = data.records.length * recordSize;
        
        if (totalSize < 1024) {
            return `${totalSize} bytes`;
        } else if (totalSize < 1024 * 1024) {
            return `${(totalSize / 1024).toFixed(1)} KB`;
        } else {
            return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
        }
    }

    executeExportFromModal(modal) {
        const templateSelect = modal.querySelector('#export-template');
        const templateKey = templateSelect.value;
        
        if (!templateKey || templateKey === 'custom') {
            this.executeCustomExport(modal);
        } else {
            this.executeTemplateExport(modal, templateKey);
        }
    }

    async executeTemplateExport(modal, templateKey) {
        const template = this.exportTemplates[templateKey];
        if (!template) return;

        const filters = this.getCurrentFilters(modal);
        const data = await this.getDataForExport(filters, template);
        const exportName = this.generateExportName(template, filters);

        try {
            Utils.showAlert(`Generating ${template.name}...`, 'info');

            switch (template.format) {
                case 'pdf':
                    await this.generatePDFReport(templateKey, data, exportName);
                    break;
                case 'excel':
                    await this.generateExcelReport(templateKey, data, exportName);
                    break;
                case 'csv':
                    await this.generateCSVExport(data, exportName);
                    break;
                case 'json':
                    await this.generateJSONExport(data, exportName);
                    break;
            }

            modal.remove();
            
        } catch (error) {
            console.error('Export error:', error);
            Utils.showAlert(`Export failed: ${error.message}`, 'error');
        }
    }

    async executeCustomExport(modal) {
        const filters = this.getCustomFilters(modal);
        const data = await this.getCustomExportData(filters);
        const exportName = this.generateCustomExportName(filters);

        try {
            Utils.showAlert('Preparing custom export...', 'info');

            switch (filters.format) {
                case 'pdf':
                    await this.generateCustomPDF(data, exportName);
                    break;
                case 'excel':
                    await this.generateCustomExcel(data, exportName);
                    break;
                case 'csv':
                    await this.generateCustomCSV(data, exportName);
                    break;
                case 'json':
                default:
                    await this.generateCustomJSON(data, exportName, filters.compression);
                    break;
            }

            modal.remove();
            
        } catch (error) {
            console.error('Custom export error:', error);
            Utils.showAlert(`Export failed: ${error.message}`, 'error');
        }
    }

    // ========== DATA PREPARATION ==========
    async getDataForExport(filters, template) {
        const data = {
            template: template.name,
            filters: filters,
            generated: new Date().toISOString(),
            schoolInfo: this.getSchoolInfo(),
            data: {}
        };

        // Get attendance data
        const attendanceData = this.getDataForPreview(filters);
        data.data.attendance = attendanceData.records;

        // Get class data
        const classes = Storage.get('classes') || [];
        data.data.classes = this.filterClassesForExport(classes, filters);

        // Get student data if needed
        if (template.sections.includes('student_attendance') || 
            template.sections.includes('student_info')) {
            const students = Storage.get('students') || [];
            data.data.students = students;
        }

        // Calculate statistics if needed
        if (template.sections.includes('statistics') || 
            template.sections.includes('analysis')) {
            data.statistics = this.calculateStatistics(attendanceData.records, classes);
        }

        // Generate trends if needed
        if (template.sections.includes('trends')) {
            data.trends = this.calculateTrends(attendanceData.records, filters);
        }

        return data;
    }

    filterClassesForExport(classes, filters) {
        let filtered = [...classes];

        if (filters.classes && !filters.classes.includes('all')) {
            filtered = filtered.filter(cls => filters.classes.includes(cls.id));
        }

        if (filters.yearGroup && filters.yearGroup !== 'all') {
            filtered = filtered.filter(cls => 
                cls.yearGroup === parseInt(filters.yearGroup)
            );
        }

        if (filters.subject && filters.subject !== 'all') {
            filtered = filtered.filter(cls => cls.subject === filters.subject);
        }

        if (filters.singleClass) {
            filtered = filtered.filter(cls => cls.id === filters.singleClass);
        }

        return filtered;
    }

    calculateStatistics(attendanceRecords, classes) {
        if (attendanceRecords.length === 0) {
            return {
                totalPresent: 0,
                totalAbsent: 0,
                totalLate: 0,
                averageAttendance: 0,
                totalClasses: classes.length,
                totalRecords: 0
            };
        }

        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLate = 0;
        let totalPossible = 0;

        attendanceRecords.forEach(record => {
            totalPresent += record.present || 0;
            totalAbsent += record.absent || 0;
            totalLate += record.late || 0;
            
            const classData = classes.find(c => c.id === record.classId);
            const classSize = classData?.studentCount || 0;
            totalPossible += classSize;
        });

        const averageAttendance = totalPossible > 0 ? 
            (totalPresent / totalPossible * 100).toFixed(1) : 0;

        return {
            totalPresent,
            totalAbsent,
            totalLate,
            averageAttendance,
            totalClasses: new Set(attendanceRecords.map(r => r.classId)).size,
            totalRecords: attendanceRecords.length,
            dateRange: this.getDateRangeFromRecords(attendanceRecords)
        };
    }

    getDateRangeFromRecords(records) {
        if (records.length === 0) return { start: null, end: null };
        
        const dates = records.map(r => new Date(r.date)).sort((a, b) => a - b);
        return {
            start: Utils.formatDate(dates[0], 'YYYY-MM-DD'),
            end: Utils.formatDate(dates[dates.length - 1], 'YYYY-MM-DD')
        };
    }

    calculateTrends(attendanceRecords, filters) {
        const trends = {
            daily: [],
            weekly: [],
            monthly: []
        };

        // Group by day
        const dailyMap = {};
        attendanceRecords.forEach(record => {
            if (!dailyMap[record.date]) {
                dailyMap[record.date] = { present: 0, total: 0, count: 0 };
            }
            dailyMap[record.date].present += record.present || 0;
            
            // Estimate total based on average class size
            dailyMap[record.date].total += (record.present || 0) + (record.absent || 0);
            dailyMap[record.date].count++;
        });

        trends.daily = Object.entries(dailyMap).map(([date, data]) => ({
            date,
            attendance: data.total > 0 ? (data.present / data.total * 100).toFixed(1) : 0,
            records: data.count
        })).sort((a, b) => a.date.localeCompare(b.date));

        // Calculate weekly trends (group by week)
        if (trends.daily.length > 7) {
            const weeklyData = [];
            let weekStart = null;
            let weekPresent = 0;
            let weekTotal = 0;
            let weekRecords = 0;

            trends.daily.forEach(day => {
                const date = new Date(day.date);
                if (!weekStart) {
                    weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
                }

                weekPresent += parseFloat(day.attendance) * (day.records || 1);
                weekTotal += day.records || 1;
                weekRecords++;

                // End of week or last day
                if (date.getDay() === 6 || day === trends.daily[trends.daily.length - 1]) {
                    weeklyData.push({
                        week: `Week of ${Utils.formatDate(weekStart, 'MMM DD')}`,
                        attendance: weekTotal > 0 ? (weekPresent / weekTotal).toFixed(1) : 0,
                        records: weekRecords
                    });
                    
                    weekStart = null;
                    weekPresent = 0;
                    weekTotal = 0;
                    weekRecords = 0;
                }
            });

            trends.weekly = weeklyData;
        }

        return trends;
    }

    getSchoolInfo() {
        const settings = Storage.get('app_settings') || {};
        return {
            name: settings.schoolName || 'School',
            code: settings.schoolCode || '',
            address: settings.schoolAddress || '',
            phone: settings.schoolPhone || '',
            email: settings.schoolEmail || ''
        };
    }

    async getCustomExportData(filters) {
        const data = {
            exportType: filters.exportType,
            generated: new Date().toISOString(),
            schoolInfo: this.getSchoolInfo(),
            data: {}
        };

        if (filters.includeClasses) {
            const classes = Storage.get('classes') || [];
            data.data.classes = this.filterClasses(classes, filters);
        }

        if (filters.includeAttendance) {
            const attendance = Storage.get('attendance_records') || [];
            data.data.attendance = this.filterAttendance(attendance, filters);
        }

        if (filters.includeStudents) {
            const students = Storage.get('students') || [];
            data.data.students = this.filterStudents(students, filters);
        }

        if (filters.includeTeachers) {
            data.data.teachers = Storage.get('teachers') || [];
        }

        if (filters.includeSettings) {
            data.data.settings = Storage.get('app_settings') || {};
        }

        return data;
    }

    // ========== EXPORT GENERATION ==========
    generateExportName(template, filters) {
        const date = Utils.formatDate(new Date(), 'YYYY-MM-DD');
        let name = template.name.replace(/\s+/g, '_');
        
        if (filters.date) {
            name += `_${filters.date}`;
        } else if (filters.dateRange) {
            name += `_${filters.dateRange.start}_to_${filters.dateRange.end}`;
        } else {
            name += `_${date}`;
        }
        
        return name;
    }

    generateCustomExportName(filters) {
        const date = Utils.formatDate(new Date(), 'YYYY-MM-DD');
        let name = 'Attendance_Export';
        
        if (filters.dateRange) {
            name += `_${filters.dateRange.start}_to_${filters.dateRange.end}`;
        } else {
            name += `_${date}`;
        }
        
        return name;
    }

    async generatePDFReport(templateKey, data, fileName) {
        if (!this.vendorsAvailable.jsPDF) {
            Utils.showAlert('PDF generation requires jsPDF library. Please use another format.', 'error');
            return;
        }

        try {
            // Create new PDF document
            const { jsPDF } = window;
            const doc = new jsPDF({
                orientation: data.template?.layout === 'landscape' ? 'landscape' : 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Add header
            this.addPDFHeader(doc, data);

            // Add content based on template
            switch (templateKey) {
                case 'daily_attendance':
                    await this.addDailyAttendanceContent(doc, data);
                    break;
                case 'term_report':
                    await this.addTermReportContent(doc, data);
                    break;
                case 'student_attendance':
                    await this.addStudentReportContent(doc, data);
                    break;
                case 'class_register':
                    await this.addClassRegisterContent(doc, data);
                    break;
                default:
                    await this.addGenericReportContent(doc, data);
            }

            // Add footer
            this.addPDFFooter(doc);

            // Save the PDF
            doc.save(`${fileName}.pdf`);
            
            // Record export
            await this.recordExport({
                type: 'pdf',
                template: templateKey,
                fileName: `${fileName}.pdf`,
                dataSize: JSON.stringify(data).length,
                filters: data.filters
            });
            
            Utils.showAlert('PDF report generated successfully', 'success');
            
        } catch (error) {
            console.error('PDF generation error:', error);
            throw new Error('Failed to generate PDF report');
        }
    }

    addPDFHeader(doc, data) {
        const pageWidth = doc.internal.pageSize.width;
        
        // School name
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(data.schoolInfo.name, pageWidth / 2, 20, { align: 'center' });
        
        // Report title
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(data.template || 'Attendance Report', pageWidth / 2, 30, { align: 'center' });
        
        // Date range
        if (data.filters?.dateRange) {
            const dateText = `From ${data.filters.dateRange.start} to ${data.filters.dateRange.end}`;
            doc.setFontSize(10);
            doc.text(dateText, pageWidth / 2, 37, { align: 'center' });
        }
        
        // Generated date
        const generated = new Date(data.generated).toLocaleDateString();
        doc.setFontSize(9);
        doc.text(`Generated: ${generated}`, pageWidth - 10, 45, { align: 'right' });
        
        // Add horizontal line
        doc.setLineWidth(0.5);
        doc.line(10, 50, pageWidth - 10, 50);
    }

    addPDFFooter(doc) {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const pageCount = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Page number
            doc.setFontSize(9);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            
            // Confidential notice
            doc.setFontSize(8);
            doc.text('Confidential - For Internal Use Only', pageWidth / 2, pageHeight - 5, { align: 'center' });
        }
    }

    async addDailyAttendanceContent(doc, data) {
        let yPos = 60;
        
        // Summary section
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Daily Attendance Summary', 10, yPos);
        yPos += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        if (data.statistics) {
            const stats = data.statistics;
            doc.text(`Total Present: ${stats.totalPresent}`, 20, yPos);
            yPos += 7;
            doc.text(`Total Absent: ${stats.totalAbsent}`, 20, yPos);
            yPos += 7;
            doc.text(`Total Late: ${stats.totalLate}`, 20, yPos);
            yPos += 7;
            doc.text(`Average Attendance: ${stats.averageAttendance}%`, 20, yPos);
            yPos += 7;
            doc.text(`Total Classes: ${stats.totalClasses}`, 20, yPos);
            yPos += 7;
            doc.text(`Total Records: ${stats.totalRecords}`, 20, yPos);
            yPos += 15;
        }
        
        // Attendance table
        if (data.data.attendance && data.data.attendance.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Attendance Details', 10, yPos);
            yPos += 10;
            
            // Prepare table data
            const tableData = data.data.attendance.map(record => [
                record.date,
                record.classCode,
                record.session,
                record.present?.toString() || '0',
                record.absent?.toString() || '0',
                record.late?.toString() || '0'
            ]);
            
            // Add table using autoTable if available
            if (this.vendorsAvailable.autoTable) {
                doc.autoTable({
                    startY: yPos,
                    head: [['Date', 'Class', 'Session', 'Present', 'Absent', 'Late']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185] },
                    margin: { top: 10 }
                });
            } else {
                // Simple table without autoTable
                doc.setFontSize(9);
                const headers = ['Date', 'Class', 'Session', 'Present', 'Absent', 'Late'];
                const colWidths = [30, 40, 25, 25, 25, 25];
                
                // Draw headers
                let xPos = 10;
                headers.forEach((header, i) => {
                    doc.text(header, xPos, yPos);
                    xPos += colWidths[i];
                });
                
                yPos += 7;
                
                // Draw data rows
                tableData.forEach(row => {
                    xPos = 10;
                    row.forEach((cell, i) => {
                        doc.text(cell, xPos, yPos);
                        xPos += colWidths[i];
                    });
                    yPos += 7;
                    
                    // Check for page break
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }
        }
    }

    async addTermReportContent(doc, data) {
        // Similar structure with term-specific content
        let yPos = 60;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Term Attendance Report', 10, yPos);
        yPos += 15;
        
        // Add term statistics, trends, etc.
        // Implementation would be similar to daily report but with term focus
    }

    async addStudentReportContent(doc, data) {
        // Student-specific report
        // Implementation for individual student reports
    }

    async addClassRegisterContent(doc, data) {
        // Class register format
        // Implementation for printable class registers
    }

    async addGenericReportContent(doc, data) {
        // Generic report for other templates
        let yPos = 60;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(data.template || 'Report', 10, yPos);
        yPos += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        // Add basic information
        if (data.schoolInfo) {
            doc.text(`School: ${data.schoolInfo.name}`, 10, yPos);
            yPos += 7;
        }
        
        if (data.filters) {
            doc.text('Filters Applied:', 10, yPos);
            yPos += 7;
            
            Object.entries(data.filters).forEach(([key, value]) => {
                if (value && key !== 'undefined') {
                    doc.text(`  ${key}: ${JSON.stringify(value)}`, 15, yPos);
                    yPos += 7;
                }
            });
            yPos += 5;
        }
        
        // Add statistics if available
        if (data.statistics) {
            doc.setFont('helvetica', 'bold');
            doc.text('Statistics:', 10, yPos);
            yPos += 7;
            doc.setFont('helvetica', 'normal');
            
            Object.entries(data.statistics).forEach(([key, value]) => {
                if (value !== undefined) {
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    doc.text(`  ${label}: ${value}`, 15, yPos);
                    yPos += 7;
                }
            });
        }
    }

    async generateExcelReport(templateKey, data, fileName) {
        try {
            // For production, use a library like SheetJS (xlsx)
            // This is a simplified implementation that creates CSV for Excel
            
            let csvContent = '';
            
            // Add headers
            csvContent += 'Attendance Report\r\n';
            csvContent += `School: ${data.schoolInfo.name}\r\n`;
            csvContent += `Report: ${data.template}\r\n`;
            csvContent += `Generated: ${new Date(data.generated).toLocaleDateString()}\r\n`;
            csvContent += '\r\n';
            
            // Add summary
            if (data.statistics) {
                csvContent += 'SUMMARY\r\n';
                Object.entries(data.statistics).forEach(([key, value]) => {
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    csvContent += `${label},${value}\r\n`;
                });
                csvContent += '\r\n';
            }
            
            // Add attendance data
            if (data.data.attendance && data.data.attendance.length > 0) {
                csvContent += 'ATTENDANCE RECORDS\r\n';
                csvContent += 'Date,Class,Session,Present,Absent,Late,Notes\r\n';
                
                data.data.attendance.forEach(record => {
                    csvContent += `${record.date},${record.classCode},${record.session},${record.present || 0},${record.absent || 0},${record.late || 0},"${record.notes || ''}"\r\n`;
                });
            }
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Record export
            await this.recordExport({
                type: 'excel',
                template: templateKey,
                fileName: `${fileName}.csv`,
                dataSize: csvContent.length,
                filters: data.filters
            });
            
            Utils.showAlert('Excel report generated successfully', 'success');
            
        } catch (error) {
            console.error('Excel generation error:', error);
            throw new Error('Failed to generate Excel report');
        }
    }

    async generateCSVExport(data, fileName) {
        try {
            let csvContent = '';
            
            // Determine what data to export
            if (data.data.attendance) {
                // Export attendance records
                csvContent += 'Date,Class Code,Session,Present,Absent,Late,Notes\r\n';
                data.data.attendance.forEach(record => {
                    csvContent += `${record.date},${record.classCode},${record.session},${record.present || 0},${record.absent || 0},${record.late || 0},"${record.notes || ''}"\r\n`;
                });
            } else if (data.data.classes) {
                // Export classes
                csvContent += 'Class Code,Class Name,Subject,Year Group,Teacher,Room,Student Count,Schedule\r\n';
                data.data.classes.forEach(cls => {
                    csvContent += `${cls.classCode},"${cls.className}",${cls.subject},${cls.yearGroup},"${cls.teacherName}",${cls.room},${cls.studentCount || 0},"${cls.schedule || ''}"\r\n`;
                });
            }
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Record export
            await this.recordExport({
                type: 'csv',
                fileName: `${fileName}.csv`,
                dataSize: csvContent.length,
                filters: data.filters
            });
            
            Utils.showAlert('CSV export generated successfully', 'success');
            
        } catch (error) {
            console.error('CSV generation error:', error);
            throw new Error('Failed to generate CSV export');
        }
    }

    async generateJSONExport(data, fileName) {
        try {
            // Create JSON string
            const jsonContent = JSON.stringify(data, null, 2);
            
            // Create and download file
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Record export
            await this.recordExport({
                type: 'json',
                fileName: `${fileName}.json`,
                dataSize: jsonContent.length,
                filters: data.filters
            });
            
            Utils.showAlert('JSON export generated successfully', 'success');
            
        } catch (error) {
            console.error('JSON generation error:', error);
            throw new Error('Failed to generate JSON export');
        }
    }

    async generateCustomPDF(data, fileName) {
        // Similar to generatePDFReport but with custom data structure
        await this.generatePDFReport('custom', data, fileName);
    }

    async generateCustomExcel(data, fileName) {
        // Similar to generateExcelReport but with custom data
        await this.generateExcelReport('custom', data, fileName);
    }

    async generateCustomCSV(data, fileName) {
        // Similar to generateCSVExport but with custom data
        await this.generateCSVExport(data, fileName);
    }

    async generateCustomJSON(data, fileName, compression = 'none') {
        try {
            if (compression === 'zip') {
                // Would require a zip library like JSZip
                Utils.showAlert('ZIP compression requires additional libraries. Exporting as plain JSON.', 'warning');
            }
            
            await this.generateJSONExport(data, fileName);
            
        } catch (error) {
            console.error('Custom JSON generation error:', error);
            throw new Error('Failed to generate custom JSON export');
        }
    }

    // ========== EXPORT HISTORY ==========
    async recordExport(exportRecord) {
        const fullRecord = {
            ...exportRecord,
            id: `export_${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: this.getCurrentUser()
        };
        
        this.exportHistory.unshift(fullRecord);
        
        // Keep only last 100 exports
        if (this.exportHistory.length > 100) {
            this.exportHistory.pop();
        }
        
        await Storage.set('export_history', this.exportHistory);
    }

    getCurrentUser() {
        const user = Storage.get('current_user') || {};
        return user.name || 'System';
    }

    showExportHistory() {
        const modalContent = `
            <div class="export-history-modal">
                <h4><i class="fas fa-history"></i> Export History</h4>
                
                ${this.exportHistory.length === 0 ? `
                    <div class="empty-history">
                        <i class="fas fa-clock"></i>
                        <p>No export history found</p>
                    </div>
                ` : `
                    <div class="history-list">
                        ${this.exportHistory.map(record => `
                            <div class="history-item" data-export-id="${record.id}">
                                <div class="history-header">
                                    <div class="history-title">
                                        <div class="file-info">
                                            <i class="fas ${this.getFormatIcon(record.type)} ${record.type === 'pdf' ? 'text-danger' : record.type === 'excel' ? 'text-success' : 'text-info'}"></i>
                                            <strong>${record.fileName}</strong>
                                        </div>
                                        <span class="history-date">
                                            ${Utils.formatDate(new Date(record.timestamp), 'relative')}
                                        </span>
                                    </div>
                                    <div class="history-stats">
                                        <span class="badge bg-secondary">
                                            ${this.formatFileSize(record.dataSize)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="history-body">
                                    <div class="history-details">
                                        <span class="detail-item">
                                            <i class="fas fa-user"></i> ${record.user}
                                        </span>
                                        <span class="detail-item">
                                            <i class="fas fa-file"></i> ${record.template || 'Custom Export'}
                                        </span>
                                        <span class="detail-item">
                                            <i class="fas fa-download"></i> ${record.type.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="history-actions">
                                    <button type="button" class="btn btn-sm btn-outline-primary re-export-btn" 
                                            data-export-id="${record.id}">
                                        <i class="fas fa-redo"></i> Re-export
                                    </button>
                                    <button type="button" class="btn btn-sm btn-outline-danger delete-export-btn" 
                                            data-export-id="${record.id}">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="history-actions mt-3">
                        <button type="button" class="btn btn-outline-danger" id="clear-history-btn">
                            <i class="fas fa-trash"></i> Clear All History
                        </button>
                        <button type="button" class="btn btn-outline-secondary" id="export-all-history-btn">
                            <i class="fas fa-download"></i> Export History
                        </button>
                    </div>
                `}
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Export History',
            size: 'modal-lg',
            buttons: [
                { text: 'Close', class: 'btn-secondary', action: 'close' }
            ],
            onShow: (modal) => {
                if (this.exportHistory.length > 0) {
                    modal.querySelector('#clear-history-btn').addEventListener('click', () => {
                        this.clearExportHistory();
                        modal.remove();
                    });
                    
                    modal.querySelector('#export-all-history-btn').addEventListener('click', () => {
                        this.exportAllHistory();
                    });
                }
            }
        });
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    reExport(exportId) {
        const record = this.exportHistory.find(r => r.id === exportId);
        if (!record) return;

        Utils.showAlert(`Re-exporting ${record.fileName}...`, 'info');
        
        // This would reload the export with the same settings
        // For now, just show a message
        Utils.showAlert('Re-export functionality would use the same settings as the original export', 'info');
    }

    deleteExport(exportId) {
        const record = this.exportHistory.find(r => r.id === exportId);
        if (!record) return;

        Utils.showConfirm(
            'Delete Export Record?',
            `This will remove the record for "${record.fileName}" from history. The exported file will not be affected.`,
            'Delete',
            'Cancel'
        ).then(async (confirmed) => {
            if (confirmed) {
                this.exportHistory = this.exportHistory.filter(r => r.id !== exportId);
                await Storage.set('export_history', this.exportHistory);
                Utils.showAlert('Export record deleted', 'success');
                this.showExportHistory(); // Refresh the view
            }
        });
    }

    clearExportHistory() {
        Utils.showConfirm(
            'Clear All Export History?',
            'This will remove all export history records. This action cannot be undone.',
            'Clear History',
            'Cancel',
            'danger'
        ).then(async (confirmed) => {
            if (confirmed) {
                this.exportHistory = [];
                await Storage.set('export_history', []);
                Utils.showAlert('Export history cleared', 'success');
            }
        });
    }

    exportAllHistory() {
        const exportData = {
            exported: new Date().toISOString(),
            totalExports: this.exportHistory.length,
            exports: this.exportHistory
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_history_${Utils.formatDate(new Date(), 'YYYY-MM-DD')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showAlert('Export history downloaded', 'success');
    }

    // ========== UTILITY METHODS ==========
    showCustomExport() {
        this.showExportModal();
    }

    previewExport() {
        // This would show a preview of the current export configuration
        Utils.showAlert('Preview functionality requires export configuration', 'info');
    }

    generateExport() {
        // This would generate the export based on current configuration
        Utils.showAlert('Please use the export modal to generate reports', 'info');
    }

    scheduleExport() {
        // This would schedule regular exports
        Utils.showAlert('Export scheduling requires server-side integration', 'info');
    }

    cancelExport() {
        // Cancel current export operation
        this.renderExportInterface();
    }

    // ========== PUBLIC API ==========
    getTemplates() {
        return { ...this.exportTemplates };
    }

    getHistory() {
        return [...this.exportHistory];
    }

    async refresh() {
        await this.loadTemplates();
        await this.loadExportHistory();
    }

    // Clean up method
    destroy() {
        // Clean up any ongoing exports
    }
}
