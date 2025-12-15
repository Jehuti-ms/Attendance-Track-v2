// assets/js/attendance.js - ES6 Module
import { Utils, Storage } from './utils.js';

export class AttendanceManager {
    constructor(app) {
        this.app = app;
        this.currentSession = 'both';
        this.currentClass = null;
        this.classes = [
            { id: '3AN', name: '3AN', yearGroup: '3rd Years', total: 18 },
            { id: '3TL', name: '3TL', yearGroup: '3rd Years', total: 16 },
            { id: '3EY', name: '3EY', yearGroup: '3rd Years', total: 25 }
        ];
        this.attendanceData = {};
    }

    async init() {
        console.log('📊 AttendanceManager initialized');
        
        // Set current date
        this.setCurrentDate();
        
        // Initialize table with exact structure from image
        this.initAttendanceTable();
        
        // Load saved data
        this.loadSavedData();
        
        // Initialize UI
        this.initUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Calculate initial rates
        this.calculateAllRates();
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
                           min="0" max="${cls.total}" value="0" 
                           data-class="${cls.id}" data-gender="male" data-session="am">
                </td>
                <td>
                    <input type="number" class="attendance-input male-pm" 
                           min="0" max="${cls.total}" value="0" 
                           data-class="${cls.id}" data-gender="male" data-session="pm">
                </td>
                <td>
                    <input type="number" class="attendance-input female-am" 
                           min="0" max="${cls.total}" value="0" 
                           data-class="${cls.id}" data-gender="female" data-session="am">
                </td>
                <td>
                    <input type="number" class="attendance-input female-pm" 
                           min="0" max="${cls.total}" value="0" 
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
        }
    }

    initUI() {
        const loading = document.getElementById('loading-content');
        const content = document.getElementById('attendance-content');
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
    }

    setupEventListeners() {
        // Session tabs
        document.querySelectorAll('.session-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleSessionChange(e));
        });

        // Class selection
        document.querySelectorAll('.class-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleClassSelect(e));
        });

        // Attendance inputs
        document.addEventListener('input', (e) => this.handleAttendanceInput(e));

        // Quick actions
        document.getElementById('mark-all-present')?.addEventListener('click', () => this.markAllPresent());
        document.getElementById('clear-all')?.addEventListener('click', () => this.clearAll());
        document.getElementById('copy-am-to-pm')?.addEventListener('click', () => this.copyAMtoPM());
        document.getElementById('copy-pm-to-am')?.addEventListener('click', () => this.copyPMtoAM());

        // Action buttons
        document.getElementById('save-draft')?.addEventListener('click', () => this.saveDraft());
        document.getElementById('submit-attendance')?.addEventListener('click', () => this.submitAttendance());
    }

    handleSessionChange(event) {
        const tab = event.currentTarget;
        document.querySelectorAll('.session-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentSession = tab.dataset.session;
        this.updateSessionView();
    }

    updateSessionView() {
        const amInputs = document.querySelectorAll('.male-am, .female-am');
        const pmInputs = document.querySelectorAll('.male-pm, .female-pm');
        
        if (this.currentSession === 'am') {
            amInputs.forEach(input => input.disabled = false);
            pmInputs.forEach(input => input.disabled = true);
        } else if (this.currentSession === 'pm') {
            amInputs.forEach(input => input.disabled = true);
            pmInputs.forEach(input => input.disabled = false);
        } else {
            amInputs.forEach(input => input.disabled = false);
            pmInputs.forEach(input => input.disabled = false);
        }
    }

    handleClassSelect(event) {
        const item = event.currentTarget;
        document.querySelectorAll('.class-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.currentClass = item.dataset.classId;
        this.updateSelectedClass();
    }

    updateSelectedClass() {
        const className = document.getElementById('selected-class-name');
        if (className && this.currentClass) {
            className.textContent = this.currentClass;
        }
    }

    handleAttendanceInput(event) {
        if (event.target.classList.contains('attendance-input')) {
            const input = event.target;
            const classId = input.dataset.class;
            
            // Validate input
            const max = parseInt(input.max) || 100;
            let value = parseInt(input.value) || 0;
            
            if (value < 0) value = 0;
            if (value > max) value = max;
            
            input.value = value;
            
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

        document.getElementById('am-total').textContent = `${amPercentage}%`;
        document.getElementById('pm-total').textContent = `${pmPercentage}%`;
    }

    // Quick Actions
    markAllPresent() {
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

    clearAll() {
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

    copyAMtoPM() {
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

    copyPMtoAM() {
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

    // Data Management
    saveDraft() {
        const data = this.collectData();
        Storage.set('attendance_draft', data);
        this.showNotification('Draft saved successfully!', 'success');
    }

    submitAttendance() {
        if (confirm('Submit attendance for all classes?')) {
            const data = this.collectData();
            const dateKey = `attendance_${new Date().toISOString().split('T')[0]}`;
            Storage.set(dateKey, data);
            Storage.remove('attendance_draft');
            this.showNotification('Attendance submitted successfully!', 'success');
        }
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

    showNotification(message, type = 'info') {
        if (this.app && this.app.showNotification) {
            this.app.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
}
