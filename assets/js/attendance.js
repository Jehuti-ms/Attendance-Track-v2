// assets/js/attendance.js - ES6 Module Version
import { Utils, Storage } from './utils.js';

export class AttendanceModule {
    constructor(app) {
        this.app = app;
        this.classes = [];
        this.currentClassStudents = [];
        this.currentClassId = null;
    }

    async init() {
        console.log('📝 AttendanceModule initialized');
        
        if (!this.isAuthenticated()) {
            window.location.href = this.getBasePath() + 'login.html';
            return;
        }
        
        await this.loadClasses();
        this.setupEventListeners();
    }

    isAuthenticated() {
        return !!Storage.get('attendance_user');
    }

    getBasePath() {
        const pathname = window.location.pathname;
        if (pathname.includes('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        }
        return '/';
    }

    async loadClasses() {
        console.log('Loading classes...');
        
        // Try to load from storage
        const storedClasses = Storage.get('attendance_classes');
        if (storedClasses && storedClasses.length > 0) {
            this.classes = storedClasses;
        } else {
            // Generate demo data
            this.classes = [
                { id: 'class-001', name: 'Mathematics 101', time: '9:00 AM', students: 24 },
                { id: 'class-002', name: 'Science 201', time: '11:00 AM', students: 18 },
                { id: 'class-003', name: 'English 101', time: '1:00 PM', students: 22 },
                { id: 'class-004', name: 'History 301', time: '3:00 PM', students: 20 }
            ];
            Storage.set('attendance_classes', this.classes);
        }
        
        this.renderClasses();
    }

    setupEventListeners() {
        console.log('Setting up attendance event listeners...');
        
        // Use arrow functions to maintain 'this' context
        document.addEventListener('click', (e) => {
            const classCard = e.target.closest('.class-card');
            if (classCard) {
                const classId = classCard.dataset.classId;
                this.selectClass(classId);
            }
            
            const attendanceBtn = e.target.closest('.attendance-btn');
            if (attendanceBtn) {
                const studentId = attendanceBtn.dataset.studentId;
                const status = attendanceBtn.dataset.status;
                this.markStudent(studentId, status);
            }
            
            // Save button
            if (e.target.matches('#save-attendance-btn')) {
                this.saveAttendance();
            }
        });
    }

    selectClass(classId) {
        console.log('Selected class:', classId);
        const selectedClass = this.classes.find(c => c.id === classId);
        
        if (selectedClass) {
            this.currentClassId = classId;
            this.loadStudentsForClass(classId);
            this.showNotification(`Selected: ${selectedClass.name}`, 'info');
        }
    }

    loadStudentsForClass(classId) {
        console.log('Loading students for class:', classId);
        
        // Try to load from storage
        const storedStudents = Storage.get(`attendance_class_${classId}_students`);
        
        if (storedStudents && storedStudents.length > 0) {
            this.currentClassStudents = storedStudents;
        } else {
            // Generate demo students
            this.currentClassStudents = this.generateDemoStudents(classId, 12);
            Storage.set(`attendance_class_${classId}_students`, this.currentClassStudents);
        }
        
        this.renderStudents();
    }

    generateDemoStudents(classId, count) {
        const firstNames = ['Alex', 'Jamie', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jordan', 'Avery'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
        const students = [];
        
        for (let i = 1; i <= count; i++) {
            students.push({
                id: `student-${classId}-${i}`,
                name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
                studentId: `S${1000 + i}`,
                status: Math.random() > 0.7 ? 'absent' : Math.random() > 0.5 ? 'late' : 'present'
            });
        }
        
        return students;
    }

    markStudent(studentId, status) {
        console.log(`Marking student ${studentId} as ${status}`);
        
        const student = this.currentClassStudents?.find(s => s.id === studentId);
        if (student) {
            student.status = status;
            this.showNotification(`Marked ${student.name} as ${status}`, 'success');
            this.updateStudentDisplay(studentId, status);
        }
    }

    async saveAttendance() {
        console.log('Saving attendance...');
        const today = Utils.formatDate();
        const attendanceData = {
            date: today,
            classId: this.currentClassId,
            className: this.classes.find(c => c.id === this.currentClassId)?.name || 'Unknown',
            students: this.currentClassStudents,
            teacher: Storage.get('attendance_user')?.name || 'Unknown',
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage
        const allAttendance = Storage.get('attendance_records', []);
        allAttendance.push(attendanceData);
        Storage.set('attendance_records', allAttendance);
        
        // Also save the students' current status for this class
        Storage.set(`attendance_class_${this.currentClassId}_students`, this.currentClassStudents);
        
        this.showNotification('Attendance saved successfully!', 'success');
        return true;
    }

    // UI rendering methods
    renderClasses() {
        const classesContainer = document.getElementById('classes-container');
        if (!classesContainer) return;
        
        classesContainer.innerHTML = this.classes.map(cls => `
            <div class="class-card" data-class-id="${cls.id}">
                <div class="class-info">
                    <h3 class="class-name">${cls.name}</h3>
                    <p class="class-time">⏰ ${cls.time}</p>
                    <p class="class-students">👥 ${cls.students} students</p>
                </div>
                <button class="btn btn-primary select-class-btn" data-class-id="${cls.id}">
                    Select Class
                </button>
            </div>
        `).join('');
    }

    renderStudents() {
        const studentsContainer = document.getElementById('students-container');
        if (!studentsContainer) return;
        
        studentsContainer.innerHTML = `
            <div class="attendance-header">
                <h3>Attendance for Class</h3>
                <button id="save-attendance-btn" class="btn btn-success">
                    💾 Save Attendance
                </button>
            </div>
            <div class="students-list">
                ${this.currentClassStudents.map(student => `
                    <div class="student-row" data-student-id="${student.id}">
                        <div class="student-info">
                            <span class="student-id">${student.studentId}</span>
                            <span class="student-name">${student.name}</span>
                        </div>
                        <div class="attendance-actions">
                            <button class="btn btn-sm btn-success attendance-btn present" 
                                    data-student-id="${student.id}" 
                                    data-status="present"
                                    ${student.status === 'present' ? 'disabled' : ''}>
                                ✅ Present
                            </button>
                            <button class="btn btn-sm btn-danger attendance-btn absent" 
                                    data-student-id="${student.id}" 
                                    data-status="absent"
                                    ${student.status === 'absent' ? 'disabled' : ''}>
                                ❌ Absent
                            </button>
                            <button class="btn btn-sm btn-warning attendance-btn late" 
                                    data-student-id="${student.id}" 
                                    data-status="late"
                                    ${student.status === 'late' ? 'disabled' : ''}>
                                ⏰ Late
                            </button>
                            <button class="btn btn-sm btn-info attendance-btn excused" 
                                    data-student-id="${student.id}" 
                                    data-status="excused"
                                    ${student.status === 'excused' ? 'disabled' : ''}>
                                📝 Excused
                            </button>
                        </div>
                        <span class="current-status badge status-${student.status}">
                            ${student.status.toUpperCase()}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateStudentDisplay(studentId, status) {
        const studentRow = document.querySelector(`.student-row[data-student-id="${studentId}"]`);
        if (!studentRow) return;
        
        // Update status badge
        const statusSpan = studentRow.querySelector('.current-status');
        if (statusSpan) {
            statusSpan.textContent = status.toUpperCase();
            statusSpan.className = `current-status badge status-${status}`;
        }
        
        // Update button states
        const buttons = studentRow.querySelectorAll('.attendance-btn');
        buttons.forEach(btn => {
            btn.disabled = btn.dataset.status === status;
        });
    }

    showNotification(message, type = 'info') {
        // Use app's notification system if available
        if (this.app && this.app.showNotification) {
            this.app.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
            // Simple alert fallback
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Note: NO auto-initialization here! 
// The module is only initialized through attendance-app.js
