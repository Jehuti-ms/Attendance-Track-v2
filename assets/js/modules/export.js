import { Utils } from './utils.js';

export class ExportModule {
    constructor(app) {
        this.app = app;
        this.pdf = null;
    }

    async init() {
        // Setup event listeners for export buttons
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('click', async (e) => {
            if (e.target.matches('#export-pdf')) {
                await this.exportPDF();
            } else if (e.target.matches('#export-excel')) {
                this.exportExcel();
            } else if (e.target.matches('#email-report')) {
                await this.sendEmail();
            } else if (e.target.matches('#print-report')) {
                this.printReport();
            }
        });
    }

    async exportPDF(options = {}) {
        try {
            const defaultOptions = {
                title: 'Attendance Report',
                filename: `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`,
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
                content: document.getElementById('report-content') || document.body
            };

            const config = { ...defaultOptions, ...options };
            
            // Check if jsPDF is available
            if (typeof jsPDF === 'undefined') {
                throw new Error('PDF library not loaded. Please check your internet connection.');
            }

            // Create PDF document
            const { jsPDF } = window;
            this.pdf = new jsPDF({
                orientation: config.orientation,
                unit: config.unit,
                format: config.format
            });

            // Add header
            this.addPDFHeader(config.title);

            // Add content based on type
            await this.addPDFContent(config.content);

            // Add footer
            this.addPDFFooter();

            // Save the PDF
            this.pdf.save(config.filename);

            this.app.showToast('PDF exported successfully!', 'success');
            return this.pdf;
        } catch (error) {
            console.error('PDF export error:', error);
            this.app.showToast(`PDF export failed: ${error.message}`, 'error');
            throw error;
        }
    }

    addPDFHeader(title) {
        const pdf = this.pdf;
        
        // School logo/name
        pdf.setFontSize(20);
        pdf.setTextColor(30, 60, 114);
        pdf.text('Attendance Track System', 105, 20, { align: 'center' });
        
        // Report title
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text(title, 105, 30, { align: 'center' });
        
        // Report details
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 105, 38, { align: 'center' });
        
        // Separator line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, 42, 190, 42);
    }

    async addPDFContent(contentElement) {
        const pdf = this.pdf;
        
        if (!contentElement) return;

        try {
            // Check if content contains a table
            const tables = contentElement.querySelectorAll('table');
            
            if (tables.length > 0) {
                // Use autoTable for tables
                await this.addTablesToPDF(tables);
            } else {
                // Use html2canvas for complex content
                await this.addHtmlToPDF(contentElement);
            }
        } catch (error) {
            console.warn('Failed to add content with preferred method:', error);
            // Fallback to simple text
            this.addTextToPDF(contentElement.textContent || 'No content available');
        }
    }

    async addTablesToPDF(tables) {
        const pdf = this.pdf;
        
        tables.forEach((table, index) => {
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
            const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => 
                Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
            );

            if (headers.length > 0 && rows.length > 0) {
                pdf.autoTable({
                    head: [headers],
                    body: rows,
                    startY: pdf.lastAutoTable ? pdf.lastAutoTable.finalY + 10 : 45,
                    margin: { left: 20, right: 20 },
                    styles: {
                        fontSize: 8,
                        cellPadding: 3,
                        overflow: 'linebreak',
                        valign: 'middle'
                    },
                    headStyles: {
                        fillColor: [30, 60, 114],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        halign: 'center'
                    },
                    alternateRowStyles: {
                        fillColor: [245, 247, 250]
                    },
                    columnStyles: {
                        0: { cellWidth: 'auto' },
                        1: { cellWidth: 'auto' },
                        2: { cellWidth: 'auto', halign: 'center' }
                    }
                });
            }
        });
    }

    async addHtmlToPDF(element) {
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas library not loaded');
        }

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = this.pdf.internal.pageSize.getWidth() - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add new page if needed
        const pageHeight = this.pdf.internal.pageSize.getHeight();
        const currentY = this.pdf.lastAutoTable ? this.pdf.lastAutoTable.finalY + 10 : 45;
        
        if (currentY + imgHeight > pageHeight - 20) {
            this.pdf.addPage();
        }

        this.pdf.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
    }

    addTextToPDF(text) {
        const pdf = this.pdf;
        const lines = pdf.splitTextToSize(text, 170);
        
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(lines, 20, 45);
    }

    addPDFFooter() {
        const pdf = this.pdf;
        const pageCount = pdf.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            
            // Footer text
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text('Attendance Track System - Confidential', 105, 285, { align: 'center' });
            
            // Page number
            pdf.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
        }
    }

    exportExcel(data = null, filename = null) {
        try {
            if (!data) {
                data = this.app.state.attendanceRecords;
            }
            
            if (!filename) {
                filename = `attendance-data-${Utils.formatDate(new Date())}.csv`;
            }

            // Prepare CSV content
            let csvContent = "data:text/csv;charset=utf-8,";
            
            // Headers
            const headers = [
                "Date", "Session", "Term", "Week", 
                "Class Code", "Year Group", 
                "Males Present", "Females Present", 
                "Total Present", "Class Size", 
                "Attendance Rate"
            ];
            csvContent += headers.join(",") + "\n";
            
            // Data rows
            data.forEach(record => {
                const rate = record.classSize > 0 ? 
                    Math.round((record.totalPresent / record.classSize) * 100) : 0;
                
                const row = [
                    `"${record.date}"`,
                    `"${record.session}"`,
                    `"${record.term}"`,
                    record.week,
                    `"${record.classCode}"`,
                    `"${record.yearGroup}"`,
                    record.malesPresent,
                    record.femalesPresent,
                    record.totalPresent,
                    record.classSize,
                    `${rate}%`
                ];
                
                csvContent += row.join(",") + "\n";
            });
            
            // Create download link
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.href = encodedUri;
            link.download = filename;
            link.style.display = "none";
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.app.showToast('Excel file exported successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Excel export error:', error);
            this.app.showToast(`Excel export failed: ${error.message}`, 'error');
            return false;
        }
    }

    async sendEmail(options = {}) {
        try {
            const defaultOptions = {
                to: '',
                subject: 'Attendance Report',
                body: 'Please find the attendance report attached.\n\nGenerated by Attendance Track System',
                includePDF: true,
                includeExcel: false
            };

            const config = { ...defaultOptions, ...options };
            
            // If no email provided, show modal
            if (!config.to) {
                config.to = await this.showEmailModal();
                if (!config.to) return;
            }

            // Prepare email content
            let emailBody = config.body;
            
            if (config.includePDF) {
                // Generate PDF
                const pdf = await this.exportPDF({ returnPDF: true });
                // In a real implementation, you would upload the PDF
                // and get a download link or attach it via an email service
                emailBody += '\n\nPDF attachment available upon request.';
            }
            
            if (config.includeExcel) {
                const excelData = this.exportExcel(null, null, true);
                emailBody += '\n\nExcel data available upon request.';
            }

            // Create mailto link (simple solution)
            const mailtoLink = this.createMailtoLink(config.to, config.subject, emailBody);
            
            // Open email client
            window.location.href = mailtoLink;
            
            this.app.showToast(`Email opened for ${config.to}`, 'success');
            return true;
        } catch (error) {
            console.error('Email error:', error);
            this.app.showToast(`Email failed: ${error.message}`, 'error');
            return false;
        }
    }

    createMailtoLink(to, subject, body) {
        const params = new URLSearchParams({
            subject: subject,
            body: body,
            cc: '',
            bcc: ''
        });
        
        return `mailto:${to}?${params.toString()}`;
    }

    async showEmailModal() {
        return new Promise((resolve) => {
            const modalContent = `
                <div class="email-modal">
                    <h4>Send Email Report</h4>
                    <div class="control-group">
                        <label for="email-recipient">Recipient Email:</label>
                        <input type="email" id="email-recipient" class="form-control" 
                               placeholder="recipient@example.com" required>
                    </div>
                    <div class="control-group">
                        <label for="email-subject">Subject:</label>
                        <input type="text" id="email-subject" class="form-control" 
                               value="Attendance Report" required>
                    </div>
                    <div class="control-group">
                        <label for="email-message">Message:</label>
                        <textarea id="email-message" class="form-control" rows="4">
Please find the attendance report attached.

Generated by Attendance Track System
                        </textarea>
                    </div>
                    <div class="control-group">
                        <label>Attachments:</label>
                        <div style="display: flex; gap: 15px; margin-top: 5px;">
                            <label style="display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" id="attach-pdf" checked> PDF Report
                            </label>
                            <label style="display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" id="attach-excel"> Excel Data
                            </label>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" id="cancel-email">Cancel</button>
                        <button type="button" class="btn btn-primary" id="send-email">Send Email</button>
                    </div>
                </div>
            `;

            const modal = Utils.showModal(modalContent, { title: 'Send Email Report' });
            
            modal.querySelector('#send-email').addEventListener('click', () => {
                const recipient = modal.querySelector('#email-recipient').value;
                const subject = modal.querySelector('#email-subject').value;
                const message = modal.querySelector('#email-message').value;
                const includePDF = modal.querySelector('#attach-pdf').checked;
                const includeExcel = modal.querySelector('#attach-excel').checked;
                
                if (!recipient || !this.isValidEmail(recipient)) {
                    this.app.showToast('Please enter a valid email address', 'error');
                    return;
                }
                
                modal.remove();
                resolve({
                    to: recipient,
                    subject: subject,
                    body: message,
                    includePDF: includePDF,
                    includeExcel: includeExcel
                });
            });
            
            modal.querySelector('#cancel-email').addEventListener('click', () => {
                modal.remove();
                resolve(null);
            });
        });
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    printReport() {
        window.print();
        this.app.showToast('Printing report...', 'info');
    }

    // Additional export methods
    exportAttendanceTable() {
        const table = document.querySelector('.attendance-table');
        if (!table) {
            this.app.showToast('No attendance table found', 'error');
            return;
        }

        const filename = `attendance-table-${Utils.formatDate(new Date())}.csv`;
        this.exportTableToCSV(table, filename);
    }

    exportTableToCSV(table, filename) {
        const rows = table.querySelectorAll('tr');
        const csv = [];
        
        rows.forEach(row => {
            const rowData = [];
            const cells = row.querySelectorAll('th, td');
            
            cells.forEach(cell => {
                let cellText = cell.textContent.trim();
                
                // Handle special cases
                if (cell.querySelector('input')) {
                    cellText = cell.querySelector('input').value;
                }
                
                // Escape quotes and wrap in quotes if contains comma
                cellText = cellText.replace(/"/g, '""');
                if (cellText.includes(',')) {
                    cellText = `"${cellText}"`;
                }
                
                rowData.push(cellText);
            });
            
            csv.push(rowData.join(','));
        });
        
        const csvContent = 'data:text/csv;charset=utf-8,' + csv.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.href = encodedUri;
        link.download = filename;
        link.click();
        
        this.app.showToast('Table exported to CSV', 'success');
    }
}

export default ExportModule;
