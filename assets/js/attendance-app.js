// ==================== ATTENDANCE SYSTEM ====================

class AttendanceSystem {
    constructor() {
        this.user = null;
        this.unsavedChanges = new Set();
        this.autoSaveEnabled = true;
        this.isSaving = false;
        this.autoSaveInterval = null;
        this.AUTO_SAVE_DELAY = 30000; // 30 seconds
        this.currentSession = 'both';
        this.init();
    }

    init() {
        console.log('🚀 Attendance System Initialized');
        this.setupSessionListeners();
        this.setupAutoSave();
    }

    // ==================== CORE ATTENDANCE METHODS ====================

    async loadAttendanceData() {
        console.log('📋 Loading attendance data...');
        
        try {
            // Get filters
            const selectedDate = this.getSelectedDate();
            const selectedSession = this.getSelectedSession();
            
            // Load data
            const classes = await this.loadClasses();
            const students = await this.loadStudents();
            const attendance = await this.loadAttendance(selectedDate, selectedSession);
            
            // Render table
            this.renderAttendanceTable(classes, students, attendance, selectedDate, selectedSession);
            
        } catch (error) {
            console.error('Error loading attendance:', error);
            this.showToast('Error loading attendance', 'error');
        }
    }

    async loadClasses() {
        // Try Firebase first, then localStorage
        if (this.user && typeof firestore !== 'undefined') {
            try {
                const snapshot = await firestore.collection('schools')
                    .doc(this.user.schoolId)
                    .collection('classes')
                    .get();
                const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                Storage.set('classes', classes);
                return classes;
            } catch (error) {
                console.log('Using cached classes:', error.message);
            }
        }
        return Storage.get('classes') || [];
    }

    async loadStudents() {
        if (this.user && typeof firestore !== 'undefined') {
            try {
                const snapshot = await firestore.collection('schools')
                    .doc(this.user.schoolId)
                    .collection('students')
                    .get();
                const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                Storage.set('students', students);
                return students;
            } catch (error) {
                console.log('Using cached students:', error.message);
            }
        }
        return Storage.get('students') || [];
    }

    async loadAttendance(date, session) {
        if (this.user && typeof firestore !== 'undefined') {
            try {
                let query = firestore.collection('schools')
                    .doc(this.user.schoolId)
                    .collection('attendance');
                
                if (date) query = query.where('date', '==', date);
                if (session !== 'both') query = query.where('session', '==', session);
                
                const snapshot = await query.get();
                const attendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                Storage.set('attendance', attendance);
                return attendance;
            } catch (error) {
                console.log('Using cached attendance:', error.message);
            }
        }
        return Storage.get('attendance') || [];
    }

    renderAttendanceTable(classes, students, attendance, date, session) {
        const tbody = document.getElementById('attendance-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (classes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="no-data">No classes found</td></tr>`;
            return;
        }
        
        classes.forEach(classItem => {
            const row = this.createClassRow(classItem, students, attendance, date, session);
            tbody.appendChild(row);
        });
        
        // Apply current session logic
        this.applySessionLogic(session);
    }

    createClassRow(classItem, students, attendance, date, session) {
        const classStudents = students.filter(s => s.classId === classItem.id);
        const classAttendance = attendance.filter(a => a.classId === classItem.id && a.date === date);
        
        // Calculate totals
        const totalStudents = classStudents.length;
        const totalMale = classStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
        const totalFemale = classStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
        
        // Get saved attendance or defaults
        const savedRecord = classAttendance.find(a => 
            a.session === session || session === 'both' || !a.session
        );
        
        const maleAm = savedRecord?.malePresentAM || 0;
        const malePm = savedRecord?.malePresentPM || 0;
        const femaleAm = savedRecord?.femalePresentAM || 0;
        const femalePm = savedRecord?.femalePresentPM || 0;
        
        // Calculate rates
        const amRate = this.calculateRate(maleAm + femaleAm, totalStudents);
        const pmRate = this.calculateRate(malePm + femalePm, totalStudents);
        const dailyRate = this.calculateRate((maleAm + malePm + femaleAm + femalePm), totalStudents * 2);
        
        const row = document.createElement('tr');
        row.className = 'attendance-data-row';
        row.dataset.classId = classItem.id;
        
        row.innerHTML = `
            <td>${classItem.yearGroup || ''}</td>
            <td><strong>${classItem.code || classItem.name}</strong></td>
            <td class="total-students">${totalStudents}</td>
            
            <!-- Male AM -->
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input male-am" 
                       value="${maleAm}"
                       min="0" 
                       max="${totalMale}"
                       data-gender="male"
                       data-session="am"
                       data-original="${maleAm}">
            </td>
            
            <!-- Male PM -->
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input male-pm" 
                       value="${malePm}"
                       min="0" 
                       max="${totalMale}"
                       data-gender="male"
                       data-session="pm"
                       data-original="${malePm}">
            </td>
            
            <!-- Female AM -->
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input female-am" 
                       value="${femaleAm}"
                       min="0" 
                       max="${totalFemale}"
                       data-gender="female"
                       data-session="am"
                       data-original="${femaleAm}">
            </td>
            
            <!-- Female PM -->
            <td class="input-cell">
                <input type="number" 
                       class="attendance-input female-pm" 
                       value="${femalePm}"
                       min="0" 
                       max="${totalFemale}"
                       data-gender="female"
                       data-session="pm"
                       data-original="${femalePm}">
            </td>
            
            <!-- Rates -->
            <td class="rate-cell am-rate ${this.getRateClass(amRate)}">${amRate}%</td>
            <td class="rate-cell pm-rate ${this.getRateClass(pmRate)}">${pmRate}%</td>
            <td class="rate-cell daily-rate ${this.getRateClass(dailyRate)}">${dailyRate}%</td>
            
            <!-- Actions -->
            <td class="actions-cell">
                <button class="btn btn-sm btn-success save-btn" onclick="attendanceSystem.saveClassAttendance('${classItem.id}')">
                    <i class="fas fa-save"></i> Save
                </button>
                <button class="btn btn-sm btn-secondary reset-btn" onclick="attendanceSystem.resetClassAttendance('${classItem.id}')">
                    <i class="fas fa-undo"></i> Reset
                </button>
            </td>
        `;
        
        // Add event listeners
        const inputs = row.querySelectorAll('.attendance-input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => this.handleInput(e.target));
            input.addEventListener('change', (e) => this.handleInput(e.target));
        });
        
        return row;
    }

    // ==================== INPUT HANDLING ====================

    handleInput(inputElement) {
        const classId = inputElement.closest('tr').dataset.classId;
        const gender = inputElement.dataset.gender;
        const session = inputElement.dataset.session;
        let value = parseInt(inputElement.value) || 0;
        
        // Get max value
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        const totalCell = row.querySelector('.total-students');
        const total = parseInt(totalCell.textContent) || 0;
        
        // Get gender-specific max
        const students = Storage.get('students') || [];
        const classStudents = students.filter(s => s.classId === classId);
        const genderTotal = classStudents.filter(s => s.gender?.toLowerCase() === gender).length;
        
        // Validate
        value = Math.max(0, Math.min(value, genderTotal));
        inputElement.value = value;
        
        // Session-based copying
        this.handleSessionCopying(inputElement, value, gender);
        
        // Update calculations
        this.updateCalculations(classId);
        
        // Mark as unsaved
        this.markAsUnsaved(classId);
    }

    handleSessionCopying(changedInput, value, gender) {
        const session = this.getSelectedSession();
        const classId = changedInput.closest('tr').dataset.classId;
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        
        if (session === 'am') {
            // Copy AM to PM
            const pmInput = row.querySelector(`.${gender}-pm`);
            if (pmInput) {
                pmInput.value = value;
                pmInput.dataset.original = value;
            }
        } else if (session === 'pm') {
            // Copy PM to AM
            const amInput = row.querySelector(`.${gender}-am`);
            if (amInput) {
                amInput.value = value;
                amInput.dataset.original = value;
            }
        }
    }

    applySessionLogic(session) {
        this.currentSession = session;
        const rows = document.querySelectorAll('.attendance-data-row');
        
        rows.forEach(row => {
            const classId = row.dataset.classId;
            const maleAm = row.querySelector('.male-am');
            const malePm = row.querySelector('.male-pm');
            const femaleAm = row.querySelector('.female-am');
            const femalePm = row.querySelector('.female-pm');
            
            if (!maleAm || !malePm || !femaleAm || !femalePm) return;
            
            if (session === 'am') {
                malePm.value = maleAm.value;
                femalePm.value = femaleAm.value;
            } else if (session === 'pm') {
                maleAm.value = malePm.value;
                femaleAm.value = femalePm.value;
            }
            
            this.updateCalculations(classId);
        });
    }

    updateCalculations(classId) {
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        // Get input values
        const maleAm = parseInt(row.querySelector('.male-am').value) || 0;
        const malePm = parseInt(row.querySelector('.male-pm').value) || 0;
        const femaleAm = parseInt(row.querySelector('.female-am').value) || 0;
        const femalePm = parseInt(row.querySelector('.female-pm').value) || 0;
        const total = parseInt(row.querySelector('.total-students').textContent) || 0;
        
        // Calculate rates
        const amRate = this.calculateRate(maleAm + femaleAm, total);
        const pmRate = this.calculateRate(malePm + femalePm, total);
        const dailyRate = this.calculateRate((maleAm + malePm + femaleAm + femalePm), total * 2);
        
        // Update display
        row.querySelector('.am-rate').textContent = `${amRate}%`;
        row.querySelector('.pm-rate').textContent = `${pmRate}%`;
        row.querySelector('.daily-rate').textContent = `${dailyRate}%`;
        
        // Update classes
        row.querySelector('.am-rate').className = `rate-cell am-rate ${this.getRateClass(amRate)}`;
        row.querySelector('.pm-rate').className = `rate-cell pm-rate ${this.getRateClass(pmRate)}`;
        row.querySelector('.daily-rate').className = `rate-cell daily-rate ${this.getRateClass(dailyRate)}`;
        
        // Update save button
        this.updateSaveButton(row, classId);
    }

    updateSaveButton(row, classId) {
        const saveBtn = row.querySelector('.save-btn');
        const inputs = row.querySelectorAll('.attendance-input');
        
        let hasChanges = false;
        inputs.forEach(input => {
            const original = parseInt(input.dataset.original) || 0;
            const current = parseInt(input.value) || 0;
            if (original !== current) hasChanges = true;
        });
        
        if (hasChanges) {
            saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Save Changes';
            saveBtn.classList.add('btn-warning');
            this.unsavedChanges.add(classId);
        } else {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            saveBtn.classList.remove('btn-warning');
            this.unsavedChanges.delete(classId);
        }
    }

    markAsUnsaved(classId) {
        this.unsavedChanges.add(classId);
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (row) {
            row.classList.add('unsaved');
        }
    }

    // ==================== SAVE METHODS ====================

    async saveClassAttendance(classId) {
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        // Get values
        const maleAm = parseInt(row.querySelector('.male-am').value) || 0;
        const malePm = parseInt(row.querySelector('.male-pm').value) || 0;
        const femaleAm = parseInt(row.querySelector('.female-am').value) || 0;
        const femalePm = parseInt(row.querySelector('.female-pm').value) || 0;
        
        // Get class info
        const classes = Storage.get('classes') || [];
        const classItem = classes.find(c => c.id === classId);
        if (!classItem) return;
        
        // Prepare record
        const attendanceRecord = {
            id: `attendance_${Date.now()}`,
            classId: classId,
            classCode: classItem.code,
            date: this.getSelectedDate(),
            session: this.getSelectedSession(),
            malePresentAM: maleAm,
            malePresentPM: malePm,
            femalePresentAM: femaleAm,
            femalePresentPM: femalePm,
            recordedBy: this.user?.email || 'Unknown',
            recordedAt: new Date().toISOString()
        };
        
        // Save to localStorage
        let attendance = Storage.get('attendance') || [];
        attendance = attendance.filter(a => 
            !(a.classId === classId && 
              a.date === attendanceRecord.date && 
              a.session === attendanceRecord.session)
        );
        attendance.push(attendanceRecord);
        Storage.set('attendance', attendance);
        
        // Save to Firebase
        if (this.user && typeof firestore !== 'undefined') {
            try {
                await firestore.collection('schools')
                    .doc(this.user.schoolId)
                    .collection('attendance')
                    .doc(attendanceRecord.id)
                    .set({
                        ...attendanceRecord,
                        schoolId: this.user.schoolId
                    });
                console.log('✅ Saved to Firebase');
            } catch (error) {
                console.error('Firebase save error:', error);
            }
        }
        
        // Update UI
        const inputs = row.querySelectorAll('.attendance-input');
        inputs.forEach(input => {
            input.dataset.original = input.value;
        });
        
        row.classList.remove('unsaved');
        this.unsavedChanges.delete(classId);
        
        const saveBtn = row.querySelector('.save-btn');
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
        saveBtn.classList.remove('btn-warning');
        saveBtn.classList.add('btn-success');
        
        setTimeout(() => {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            saveBtn.classList.remove('btn-success');
        }, 2000);
        
        this.showToast(`Saved ${classItem.code}`, 'success');
        this.updateLastSavedTime();
    }

    async saveAllAttendance() {
        const unsavedClasses = Array.from(this.unsavedChanges);
        if (unsavedClasses.length === 0) {
            this.showToast('No changes to save', 'info');
            return;
        }
        
        for (const classId of unsavedClasses) {
            await this.saveClassAttendance(classId);
        }
        
        this.showToast(`Saved ${unsavedClasses.length} classes`, 'success');
    }

    resetClassAttendance(classId) {
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        const inputs = row.querySelectorAll('.attendance-input');
        inputs.forEach(input => {
            input.value = input.dataset.original || '0';
        });
        
        this.updateCalculations(classId);
        row.classList.remove('unsaved');
        this.unsavedChanges.delete(classId);
        
        this.showToast('Reset to saved values', 'info');
    }

    // ==================== AUTO-SAVE ====================

    setupAutoSave() {
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
        
        this.autoSaveInterval = setInterval(() => {
            if (this.autoSaveEnabled && this.unsavedChanges.size > 0 && !this.isSaving) {
                this.autoSave();
            }
        }, this.AUTO_SAVE_DELAY);
        
        // Warn before leaving
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges.size > 0) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }

    async autoSave() {
        if (this.isSaving || this.unsavedChanges.size === 0) return;
        
        this.isSaving = true;
        this.showSaveStatus('saving');
        
        try {
            const unsavedClasses = Array.from(this.unsavedChanges);
            for (const classId of unsavedClasses) {
                await this.saveClassAttendance(classId);
            }
            
            this.showAutoSaveNotification(`Auto-saved ${unsavedClasses.length} classes`);
            
        } catch (error) {
            console.error('Auto-save error:', error);
        } finally {
            this.isSaving = false;
            this.showSaveStatus('saved');
        }
    }

    // ==================== SESSION MANAGEMENT ====================

    setupSessionListeners() {
        const sessionOptions = document.querySelectorAll('.session-option');
        sessionOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const session = option.dataset.session;
                this.currentSession = session;
                
                // Update UI
                sessionOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Apply session logic
                this.applySessionLogic(session);
                
                // Save preference
                this.saveSessionPreference(session);
                
                // Reload data
                this.loadAttendanceData();
            });
        });
    }

    saveSessionPreference(session) {
        localStorage.setItem('attendance_session', session);
    }

    getSelectedSession() {
        const activeOption = document.querySelector('.session-option.active');
        return activeOption?.dataset.session || 'both';
    }

    // ==================== HELPER METHODS ====================

    getSelectedDate() {
        const datePicker = document.getElementById('date-picker');
        return datePicker?.value || new Date().toISOString().split('T')[0];
    }

    calculateRate(present, total) {
        return total > 0 ? Math.round((present / total) * 100) : 0;
    }

    getRateClass(rate) {
        if (rate >= 90) return 'high';
        if (rate >= 75) return 'medium';
        return 'low';
    }

    updateLastSavedTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const element = document.getElementById('last-saved-time');
        if (element) {
            element.textContent = `Last saved: ${timeString}`;
        }
    }

    showSaveStatus(status) {
        const element = document.getElementById('save-status');
        if (element) {
            element.textContent = status === 'saving' ? 'Saving...' : 
                                 status === 'unsaved' ? 'Unsaved changes' : 'All saved';
            element.className = `save-status ${status}`;
        }
    }

    showAutoSaveNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'auto-save-notification';
        notification.innerHTML = `<i class="fas fa-save"></i> ${message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    showToast(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Implement your toast UI here
    }

    // ==================== INITIALIZATION ====================

    async initialize(user) {
        this.user = user;
        console.log('👤 Attendance System ready for:', user?.email);
        
        // Load saved session preference
        const savedSession = localStorage.getItem('attendance_session') || 'both';
        const sessionOption = document.querySelector(`.session-option[data-session="${savedSession}"]`);
        if (sessionOption) {
            sessionOption.click();
        }
        
        // Load initial data
        await this.loadAttendanceData();
        
        // Setup auto-save indicator
        this.setupAutoSaveIndicator();
    }

    setupAutoSaveIndicator() {
        const indicator = document.getElementById('auto-save-indicator');
        if (indicator) {
            indicator.innerHTML = `
                <div class="auto-save-toggle">
                    <span class="auto-save-status">
                        <i class="fas fa-circle"></i>
                        Auto-save <span id="save-status">active</span>
                    </span>
                    <label class="switch">
                        <input type="checkbox" ${this.autoSaveEnabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="last-saved" id="last-saved-time">Last saved: Never</div>
            `;
            
            // Toggle event
            const toggle = indicator.querySelector('input');
            toggle.addEventListener('change', (e) => {
                this.autoSaveEnabled = e.target.checked;
                if (this.autoSaveEnabled) {
                    this.setupAutoSave();
                    this.showToast('Auto-save enabled', 'success');
                } else {
                    clearInterval(this.autoSaveInterval);
                    this.showToast('Auto-save disabled', 'warning');
                }
            });
        }
    }
}

// ==================== GLOBAL INSTANCE ====================
const attendanceSystem = new AttendanceSystem();

// Make it globally accessible
window.attendanceSystem = attendanceSystem;
