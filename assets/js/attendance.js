// assets/js/attendance.js - UPDATED ES6 Module
import { Utils, Storage } from './utils.js';

export class AttendanceManager {
    constructor(app) {
        this.app = app;
        this.currentSession = 'both';
        this.currentClass = null;
        this.classes = [
            { id: '3AN', name: '3AN', yearGroup: '3rd Years', total: 18, male: 9, female: 9 },
            { id: '3TL', name: '3TL', yearGroup: '3rd Years', total: 16, male: 8, female: 8 },
            { id: '3EY', name: '3EY', yearGroup: '3rd Years', total: 25, male: 13, female: 12 }
        ];
        this.attendanceData = {};
    }

    async init() {
    console.log('📊 AttendanceManager initialized');
    
    // Inject the attendance HTML content FIRST
    await this.injectAttendanceContent();
    
    // THEN set up everything else
    this.setCurrentDate();
    this.initAttendanceTable();
    this.initClassesList();  // This was causing the error - fixed now
    this.loadSavedData();
    
    // Set up event listeners AFTER content is injected
    setTimeout(() => {
        this.setupEventListeners();
        this.calculateAllRates();
    }, 100);
    
    this.hideLoading();
}

    async injectAttendanceContent() {
        const container = document.getElementById('app-container');
        if (!container) return;
        
        // Hide the loading indicator that's already in the HTML
        const loading = document.getElementById('loading-content');
        if (loading) loading.style.display = 'none';
        
        // Inject the attendance content
        container.innerHTML = `
            <div id="attendance-content" style="display: block;" class="attendance-page">
                <!-- Header with date and session tabs -->
                <div class="attendance-header">
                    <div class="header-top">
                        <div>
                            <h1 style="margin: 0; font-size: 2rem;">📊 Daily Attendance</h1>
                            <div class="term-week-display">
                                <span id="current-term">Term 1</span> • 
                                <span id="current-week">Week 1</span>
                            </div>
                        </div>
                        <div class="date-display" id="current-date">
                            <!-- Date will be set by JavaScript -->
                        </div>
                    </div>
                    
                    <div class="session-tabs">
                        <div class="session-tab active" data-session="both">
                            <span>☀️🌙</span>
                            Both Sessions
                        </div>
                        <div class="session-tab" data-session="am">
                            <span>☀️</span>
                            AM Session Only
                        </div>
                        <div class="session-tab" data-session="pm">
                            <span>🌙</span>
                            PM Session Only
                        </div>
                    </div>
                    
                    <div class="quick-actions">
                        <button class="quick-action-btn" id="mark-all-present">
                            <span>✓</span> Mark All Present
                        </button>
                        <button class="quick-action-btn" id="clear-all">
                            <span>🗑️</span> Clear All
                        </button>
                        <button class="quick-action-btn" id="copy-am-to-pm">
                            <span>📋→</span> Copy AM to PM
                        </button>
                        <button class="quick-action-btn" id="copy-pm-to-am">
                            <span>←📋</span> Copy PM to AM
                        </button>
                    </div>
                </div>
                
                <div class="attendance-container">
                    <!-- Classes List Panel -->
                    <div class="classes-panel">
                        <h3><span>📚</span> Classes</h3>
                        <div class="classes-list" id="classes-list">
                            <!-- Classes will be loaded here -->
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <h4><span>📊</span> Today's Summary</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                                <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px;">
                                    <div style="font-size: 1.8rem; font-weight: bold; color: #28a745;" id="am-total">0%</div>
                                    <div style="font-size: 0.9rem; color: #666;">AM Rate</div>
                                </div>
                                <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px;">
                                    <div style="font-size: 1.8rem; font-weight: bold; color: #ffc107;" id="pm-total">0%</div>
                                    <div style="font-size: 0.9rem; color: #666;">PM Rate</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Attendance Table Panel -->
                    <div class="attendance-table-container">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h3 style="margin: 0;">
                                <span id="selected-class-name">Select a Class</span>
                                <span style="color: #666; font-size: 1rem;" id="selected-class-year"></span>
                            </h3>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <span>Total: <strong id="total-students">0</strong></span>
                                <button class="btn btn-secondary" id="view-student-list">
                                    <span>👥</span> Student List
                                </button>
                            </div>
                        </div>
                        
                        <!-- The attendance table exactly like your image -->
                        <table class="attendance-table">
                            <thead>
                                <tr>
                                    <th>Year Group</th>
                                    <th>Class</th>
                                    <th>Total</th>
                                    <th colspan="2">Male Present</th>
                                    <th colspan="2">Female Present</th>
                                    <th>AM Rate</th>
                                    <th>PM Rate</th>
                                    <th>Daily Rate</th>
                                    <th>Cumulative</th>
                                    <th>vs Avg</th>
                                </tr>
                                <tr>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th>AM</th>
                                    <th>PM</th>
                                    <th>AM</th>
                                    <th>PM</th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="attendance-table-body">
                                <!-- Rows will be populated by JavaScript -->
                            </tbody>
                        </table>
                        
                        <div class="action-buttons">
                            <button class="btn btn-secondary" id="save-draft">
                                <span>💾</span> Save Draft
                            </button>
                            <button class="btn btn-primary" id="submit-attendance">
                                <span>✓</span> Submit Attendance
                            </button>
                            <button class="btn btn-secondary" id="print-attendance">
                                <span>🖨️</span> Print
                            </button>
                            <button class="btn btn-secondary" id="export-attendance">
                                <span>📤</span> Export
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    hideLoading() {
        const loading = document.getElementById('loading-content');
        if (loading) loading.style.display = 'none';
        
        const content = document.getElementById('attendance-content');
        if (content) content.style.display = 'block';
    }

    setCurrentDate() {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const year = today.getFullYear();
        
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            dateElement.textContent = `${month} / ${day} / ${year}`;
        }
    }
    
initClassesList() {
    const container = document.getElementById('classes-list');
    if (!container) return;
    
    container.innerHTML = this.classes.map(cls => `
        <div class="class-item" data-class-id="${cls.id}">
            <div style="font-weight: 600; color: #2a5298;">${cls.name}</div>
            <div style="font-size: 0.9rem; color: #666;">${cls.yearGroup}</div>
            <div style="font-size: 0.85rem; margin-top: 5px;">
                <span style="color: #28a745;">✓ AM: 0/${cls.total}</span> • 
                <span style="color: #ffc107;">✓ PM: 0/${cls.total}</span>
            </div>
        </div>
    `).join('');
    
    // FIX: Use the correct method name
    if (this.classes.length > 0) {
        this.updateSelectedClassUI(this.classes[0].id);
    }
}

// Add this new helper method
updateSelectedClassUI(classId) {
    const classItem = document.querySelector(`.class-item[data-class-id="${classId}"]`);
    if (classItem) {
        document.querySelectorAll('.class-item').forEach(i => i.classList.remove('active'));
        classItem.classList.add('active');
        this.currentClass = classId;
        this.updateSelectedClass();
    }
}
    
    initAttendanceTable() {
        const tbody = document.getElementById('attendance-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.classes.forEach(cls => {
            const row = document.createElement('tr');
            row.dataset.classId = cls.id;
            
            // EXACT structure from your image
            row.innerHTML = `
                <td class="year-group-cell">${cls.yearGroup}</td>
                <td class="class-cell"><strong>${cls.name}</strong></td>
                <td class="total-cell">${cls.total}</td>
                <td>
                    <input type="number" class="attendance-input male-am" 
                           min="0" max="${cls.male}" value="0" 
                           data-class="${cls.id}" data-gender="male" data-session="am">
                </td>
                <td>
                    <input type="number" class="attendance-input male-pm" 
                           min="0" max="${cls.male}" value="0" 
                           data-class="${cls.id}" data-gender="male" data-session="pm">
                </td>
                <td>
                    <input type="number" class="attendance-input female-am" 
                           min="0" max="${cls.female}" value="0" 
                           data-class="${cls.id}" data-gender="female" data-session="am">
                </td>
                <td>
                    <input type="number" class="attendance-input female-pm" 
                           min="0" max="${cls.female}" value="0" 
                           data-class="${cls.id}" data-gender="female" data-session="pm">
                </td>
                <td class="percentage-cell am-rate">0%</td>
                <td class="percentage-cell pm-rate">0%</td>
                <td class="percentage-cell daily-rate">0%</td>
                <td class="cumulative-cell">287 / 31</td>
                <td class="vs-avg-cell" style="color: #dc3545;">-100.0%</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    loadSavedData() {
        const draft = Storage.get('attendance_draft');
        if (draft) {
            this.attendanceData = draft;
            this.loadAttendanceData(draft);
            Utils.showToast('Draft loaded from previous session', 'info');
        }
    }

    autoCopyAMtoPM(classId) {
    const row = document.querySelector(`tr[data-class-id="${classId}"]`);
    if (!row) return;
    
    const maleAm = parseInt(row.querySelector('.male-am').value) || 0;
    const femaleAm = parseInt(row.querySelector('.female-am').value) || 0;
    const malePm = parseInt(row.querySelector('.male-pm').value) || 0;
    const femalePm = parseInt(row.querySelector('.female-pm').value) || 0;
    
    // Only auto-copy if PM inputs are empty (0) and AM has values
    if (malePm === 0 && femalePm === 0 && (maleAm > 0 || femaleAm > 0)) {
        row.querySelector('.male-pm').value = maleAm;
        row.querySelector('.female-pm').value = femaleAm;
        
        // Trigger input events to recalculate
        row.querySelector('.male-pm').dispatchEvent(new Event('input'));
        row.querySelector('.female-pm').dispatchEvent(new Event('input'));
    }
}
    
    setupEventListeners() {
    // Use event delegation for dynamic elements
    document.addEventListener('click', (e) => {
        // Session tabs
        if (e.target.closest('.session-tab')) {
            const tab = e.target.closest('.session-tab');
            this.handleSessionChange({ currentTarget: tab });
        }
        
        // Class selection
        if (e.target.closest('.class-item')) {
            const classItem = e.target.closest('.class-item');
            this.updateSelectedClassUI(classItem.dataset.classId);
        }
        
        // Quick actions
        const actionMap = {
            'mark-all-present': () => this.markallpresent(),
            'clear-all': () => this.clearall(),
            'copy-am-to-pm': () => this.copyamtpm(),
            'copy-pm-to-am': () => this.copypmtoam()
        };
        
        for (const [id, handler] of Object.entries(actionMap)) {
            if (e.target.closest(`#${id}`)) {
                e.preventDefault();
                handler();
                break;
            }
        }
        
        // Action buttons
        const actionButtons = {
            'save-draft': () => this.savedraft(),
            'submit-attendance': () => this.submitattendance(),
            'print-attendance': () => this.printattendance(),
            'export-attendance': () => this.exportattendance(),
            'view-student-list': () => this.viewstudentlist()
        };
        
        for (const [id, handler] of Object.entries(actionButtons)) {
            if (e.target.closest(`#${id}`)) {
                e.preventDefault();
                handler();
                break;
            }
        }
    });
    
    // Attendance inputs
    document.addEventListener('input', (e) => this.handleAttendanceInput(e));
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('attendance-input')) {
            this.handleKeyboardInput(e);
        }
    });
}
    
    handleSessionChange(event) {
        const tab = event.currentTarget;
        document.querySelectorAll('.session-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentSession = tab.dataset.session;
        this.updateSessionView();
    }

    handleKeyboardInput(event) {
    const input = event.target;
    const classId = input.dataset.class;
    
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        let value = parseInt(input.value) || 0;
        const max = parseInt(input.max) || 0;
        if (value < max) {
            input.value = value + 1;
            input.dispatchEvent(new Event('input'));
        }
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        let value = parseInt(input.value) || 0;
        if (value > 0) {
            input.value = value - 1;
            input.dispatchEvent(new Event('input'));
        }
    } else if (event.key === 'Tab' && input.dataset.session === 'am') {
        // When tabbing from AM, auto-focus PM equivalent
        const gender = input.dataset.gender;
        const pmInput = document.querySelector(`.${gender}-pm[data-class="${classId}"]`);
        if (pmInput) {
            setTimeout(() => pmInput.focus(), 10);
        }
    }
}
    
    updateSessionView() {
        const amInputs = document.querySelectorAll('.male-am, .female-am');
        const pmInputs = document.querySelectorAll('.male-pm, .female-pm');
        
        if (this.currentSession === 'am') {
            amInputs.forEach(input => {
                input.disabled = false;
                input.style.opacity = '1';
            });
            pmInputs.forEach(input => {
                input.disabled = true;
                input.style.opacity = '0.3';
            });
        } else if (this.currentSession === 'pm') {
            amInputs.forEach(input => {
                input.disabled = true;
                input.style.opacity = '0.3';
            });
            pmInputs.forEach(input => {
                input.disabled = false;
                input.style.opacity = '1';
            });
        } else {
            amInputs.forEach(input => {
                input.disabled = false;
                input.style.opacity = '1';
            });
            pmInputs.forEach(input => {
                input.disabled = false;
                input.style.opacity = '1';
            });
        }
    }

    handleClassSelect(classItem) {
        document.querySelectorAll('.class-item').forEach(i => i.classList.remove('active'));
        classItem.classList.add('active');
        this.currentClass = classItem.dataset.classId;
        this.updateSelectedClass();
    }

    updateSelectedClass() {
        const className = document.getElementById('selected-class-name');
        const classYear = document.getElementById('selected-class-year');
        const classTotal = document.getElementById('total-students');
        
        if (this.currentClass) {
            const cls = this.classes.find(c => c.id === this.currentClass);
            if (cls) {
                if (className) className.textContent = cls.name;
                if (classYear) classYear.textContent = `(${cls.yearGroup})`;
                if (classTotal) classTotal.textContent = cls.total;
            }
        }
    }

handleAttendanceInput(event) {
    if (event.target.classList.contains('attendance-input')) {
        const input = event.target;
        const classId = input.dataset.class;
        
        // Validate input
        const max = parseInt(input.max) || 0;
        let value = parseInt(input.value) || 0;
        
        if (value < 0) value = 0;
        if (value > max) value = max;
        
        input.value = value;
        
        // Auto-copy AM to PM if it's an AM input
        if (input.dataset.session === 'am') {
            this.autoCopyAMtoPM(classId);
        }
        
        // Calculate rates
        this.calculateClassRates(classId);
        this.updateSummary();
    }
}

    calculateClassRates(classId) {
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;

        const total = parseInt(row.querySelector('.total-cell').textContent) || 0;
        const maleAm = parseInt(row.querySelector('.male-am').value) || 0;
        const malePm = parseInt(row.querySelector('.male-pm').value) || 0;
        const femaleAm = parseInt(row.querySelector('.female-am').value) || 0;
        const femalePm = parseInt(row.querySelector('.female-pm').value) || 0;

        const amPresent = maleAm + femaleAm;
        const pmPresent = malePm + femalePm;
        
        const amRate = total > 0 ? Math.round((amPresent / total) * 100) : 0;
        const pmRate = total > 0 ? Math.round((pmPresent / total) * 100) : 0;
        const dailyRate = Math.round((amRate + pmRate) / 2);

        row.querySelector('.am-rate').textContent = `${amRate}%`;
        row.querySelector('.pm-rate').textContent = `${pmRate}%`;
        row.querySelector('.daily-rate').textContent = `${dailyRate}%`;

        // Update class item in sidebar
        const classItem = document.querySelector(`.class-item[data-class-id="${classId}"]`);
        if (classItem) {
            const summary = classItem.querySelector('div:nth-child(3)');
            if (summary) {
                summary.innerHTML = `
                    <span style="color: #28a745;">✓ AM: ${amPresent}/${total}</span> • 
                    <span style="color: #ffc107;">✓ PM: ${pmPresent}/${total}</span>
                `;
            }
        }
    }

    calculateAllRates() {
        this.classes.forEach(cls => {
            this.calculateClassRates(cls.id);
        });
        this.updateSummary();
    }

    updateSummary() {
        let totalStudents = 0;
        let totalAmPresent = 0;
        let totalPmPresent = 0;

        this.classes.forEach(cls => {
            const row = document.querySelector(`tr[data-class-id="${cls.id}"]`);
            if (row) {
                const total = parseInt(row.querySelector('.total-cell').textContent) || 0;
                const maleAm = parseInt(row.querySelector('.male-am').value) || 0;
                const malePm = parseInt(row.querySelector('.male-pm').value) || 0;
                const femaleAm = parseInt(row.querySelector('.female-am').value) || 0;
                const femalePm = parseInt(row.querySelector('.female-pm').value) || 0;
                
                totalStudents += total;
                totalAmPresent += maleAm + femaleAm;
                totalPmPresent += malePm + femalePm;
            }
        });

        const amPercentage = totalStudents > 0 ? Math.round((totalAmPresent / totalStudents) * 100) : 0;
        const pmPercentage = totalStudents > 0 ? Math.round((totalPmPresent / totalStudents) * 100) : 0;

        const amTotal = document.getElementById('am-total');
        const pmTotal = document.getElementById('pm-total');
        
        if (amTotal) amTotal.textContent = `${amPercentage}%`;
        if (pmTotal) pmTotal.textContent = `${pmPercentage}%`;
    }

    // Quick Actions
    markallpresent() {
        const inputs = this.currentSession === 'am' ? 
            document.querySelectorAll('.male-am, .female-am') :
            this.currentSession === 'pm' ?
            document.querySelectorAll('.male-pm, .female-pm') :
            document.querySelectorAll('.attendance-input');

        inputs.forEach(input => {
            const max = parseInt(input.max) || 0;
            input.value = max;
            input.dispatchEvent(new Event('input'));
        });
    }

    clearall() {
        const inputs = this.currentSession === 'am' ? 
            document.querySelectorAll('.male-am, .female-am') :
            this.currentSession === 'pm' ?
            document.querySelectorAll('.male-pm, .female-pm') :
            document.querySelectorAll('.attendance-input');

        inputs.forEach(input => {
            input.value = 0;
            input.dispatchEvent(new Event('input'));
        });
    }

    copyamtpm() {
        document.querySelectorAll('.male-am').forEach(amInput => {
            const classId = amInput.dataset.class;
            const pmInput = document.querySelector(`.male-pm[data-class="${classId}"]`);
            if (pmInput) {
                pmInput.value = amInput.value;
                pmInput.dispatchEvent(new Event('input'));
            }
        });

        document.querySelectorAll('.female-am').forEach(amInput => {
            const classId = amInput.dataset.class;
            const pmInput = document.querySelector(`.female-pm[data-class="${classId}"]`);
            if (pmInput) {
                pmInput.value = amInput.value;
                pmInput.dispatchEvent(new Event('input'));
            }
        });
    }

    copypmtoam() {
        document.querySelectorAll('.male-pm').forEach(pmInput => {
            const classId = pmInput.dataset.class;
            const amInput = document.querySelector(`.male-am[data-class="${classId}"]`);
            if (amInput) {
                amInput.value = pmInput.value;
                amInput.dispatchEvent(new Event('input'));
            }
        });

        document.querySelectorAll('.female-pm').forEach(pmInput => {
            const classId = pmInput.dataset.class;
            const amInput = document.querySelector(`.female-am[data-class="${classId}"]`);
            if (amInput) {
                amInput.value = pmInput.value;
                amInput.dispatchEvent(new Event('input'));
            }
        });
    }

    // Action Methods
    savedraft() {
        const data = this.collectData();
        Storage.set('attendance_draft', data);
        Utils.showToast('Draft saved successfully!', 'success');
    }

    submitattendance() {
        if (confirm('Submit attendance for all classes?')) {
            const data = this.collectData();
            const dateKey = `attendance_${new Date().toISOString().split('T')[0]}`;
            Storage.set(dateKey, data);
            Storage.remove('attendance_draft');
            Utils.showToast('Attendance submitted successfully!', 'success');
        }
    }

    printattendance() {
        window.print();
    }

    exportattendance() {
        const data = this.collectData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Utils.showToast('Attendance data exported!', 'success');
    }

    viewstudentlist() {
        Utils.showToast('Student list feature coming soon!', 'info');
    }

    collectData() {
        const data = {
            date: document.getElementById('current-date')?.textContent || '',
            term: document.getElementById('current-term')?.textContent || '',
            week: document.getElementById('current-week')?.textContent || '',
            classes: []
        };

        this.classes.forEach(cls => {
            const row = document.querySelector(`tr[data-class-id="${cls.id}"]`);
            if (row) {
                const classData = {
                    classId: cls.id,
                    maleAm: parseInt(row.querySelector('.male-am').value) || 0,
                    malePm: parseInt(row.querySelector('.male-pm').value) || 0,
                    femaleAm: parseInt(row.querySelector('.female-am').value) || 0,
                    femalePm: parseInt(row.querySelector('.female-pm').value) || 0,
                    amRate: row.querySelector('.am-rate').textContent,
                    pmRate: row.querySelector('.pm-rate').textContent,
                    dailyRate: row.querySelector('.daily-rate').textContent
                };
                data.classes.push(classData);
            }
        });

        return data;
    }

    loadAttendanceData(data) {
        data.classes?.forEach(classData => {
            const row = document.querySelector(`tr[data-class-id="${classData.classId}"]`);
            if (row) {
                row.querySelector('.male-am').value = classData.maleAm;
                row.querySelector('.male-pm').value = classData.malePm;
                row.querySelector('.female-am').value = classData.femaleAm;
                row.querySelector('.female-pm').value = classData.femalePm;
                
                row.querySelector('.male-am').dispatchEvent(new Event('input'));
            }
        });
    }
}
