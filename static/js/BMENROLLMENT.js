// Business Manager Enrollment - Matches Registrar Functionality Exactly
console.log('BMENROLLMENT.js: Script loading started');
window.BMEnrollment = (function() {
    // Private variables
    let enrollmentData = [];
    let filteredData = [];
    let currentApproveId = null;
    let currentDisapproveId = null;
    let currentPreviewController = null;
    let currentActionBM = null;
    let currentDisapproveIdBM = null;

    // Private helper functions
    function getCSRFToken() {
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    function hidePreviewLoader() {
        const spinnerEl = document.getElementById('previewLoadingSpinner');
        if (spinnerEl) {
            spinnerEl.style.display = 'none';
            spinnerEl.classList.remove('d-flex');
        }
    }

    function showPreviewLoader() {
        const spinnerEl = document.getElementById('previewLoadingSpinner');
        const contentEl = document.getElementById('previewContent');
        
        if (spinnerEl && contentEl) {
            spinnerEl.style.display = 'flex';
            spinnerEl.classList.add('d-flex');
            contentEl.style.display = 'none';
        }
    }

    function resetPreviewModal() {
        const contentEl = document.getElementById('previewContent');
        if (contentEl) {
            contentEl.innerHTML = '';
            contentEl.style.display = 'none';
        }
        showPreviewLoader();
    }

    // Load enrollment data from API
    function loadEnrollmentData() {
        const tableBody = document.getElementById('bm_enrollment_table_body');
        if (!tableBody) return;

        // Show loading
        tableBody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center text-muted py-4">
                    <i class="bi bi-hourglass-split fs-1"></i><br>
                    Loading enrollment data...
                </td>
            </tr>
        `;

        fetch('/business-manager/enrollment/api/data/', {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            enrollmentData = data.data;
            populateFilters();
            applyFilters();
        })
        .catch(error => {
            console.error('Error loading enrollment data:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="13" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle fs-1"></i><br>
                        Error loading enrollment data: ${error.message}
                    </td>
                </tr>
            `;
        });
    }

    // Populate filter dropdowns
    function populateFilters() {
        const courses = [...new Set(enrollmentData.map(item => item.course))].sort();
        const years = [...new Set(enrollmentData.map(item => item.year))].sort();
        const sections = [...new Set(enrollmentData.map(item => item.section))].sort();

        populateSelect('bm_enrollment_filter_course', courses);
        populateSelect('bm_enrollment_filter_year', years);
        populateSelect('bm_enrollment_filter_section', sections);
    }

    function populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Keep the first option (placeholder)
        const firstOption = select.children[0];
        select.innerHTML = '';
        select.appendChild(firstOption);

        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option;
            optionEl.textContent = option;
            select.appendChild(optionEl);
        });
    }

    // Apply filters and search
    function applyFilters() {
        const courseFilter = document.getElementById('bm_enrollment_filter_course')?.value;
        const yearFilter = document.getElementById('bm_enrollment_filter_year')?.value;
        const sectionFilter = document.getElementById('bm_enrollment_filter_section')?.value;
        const statusFilter = document.getElementById('bm_enrollment_filter_status')?.value;
        const searchTerm = document.getElementById('bm_enrollment_search_input')?.value.toLowerCase() || '';

        filteredData = enrollmentData.filter(item => {
            const matchesCourse = !courseFilter || courseFilter === 'Filter by Course' || item.course === courseFilter;
            const matchesYear = !yearFilter || yearFilter === 'Filter by Year' || item.year === yearFilter;
            const matchesSection = !sectionFilter || sectionFilter === 'Filter by Section' || item.section === sectionFilter;
            const matchesStatus = !statusFilter || statusFilter === 'Filter by Status' || 
                               (statusFilter === 'pending' && item.overall_status === 'pending') ||
                               (statusFilter === 'completed' && item.overall_status === 'approved');
            const matchesSearch = !searchTerm || 
                                item.student_name.toLowerCase().includes(searchTerm) || 
                                item.id_number.toLowerCase().includes(searchTerm);

            return matchesCourse && matchesYear && matchesSection && matchesStatus && matchesSearch;
        });

        renderEnrollmentTable();
    }

    // Render enrollment table
    function renderEnrollmentTable() {
        const tableBody = document.getElementById('bm_enrollment_table_body');
        if (!tableBody) return;

        if (filteredData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="13" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-1"></i><br>
                        No enrollment forms found
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        filteredData.forEach(enrollment => {
            // Fix status logic - completed only when ALL signatories approved
            const isCompleted = enrollment.dean_status === 'approved' && 
                              enrollment.business_status === 'approved' && 
                              enrollment.registrar_status === 'approved';
            const statusBadge = isCompleted ? 
                '<span class="badge bg-success">Completed</span>' : 
                '<span class="badge bg-warning">Pending</span>';
            
            const deanStatus = getSignatoryStatus(enrollment.dean_status, enrollment.dean_timestamp);
            const businessStatus = getSignatoryStatus(enrollment.business_status, enrollment.business_timestamp, true, enrollment.id);
            const registrarStatus = getSignatoryStatus(enrollment.registrar_status, enrollment.registrar_timestamp);

            html += `
                <tr>
                    <td>
                        <input type="checkbox" class="enrollment-checkbox" value="${enrollment.id}" name="for_deletion">
                    </td>
                    <td class="text-start">${enrollment.student_name}</td>
                    <td>${enrollment.course}</td>
                    <td>${enrollment.year}</td>
                    <td>${enrollment.section}</td>
                    <td>${enrollment.id_number}</td>
                    <td>${enrollment.date_submitted}</td>
                    <td>
                        <button type="button" class="btn btn-outline-primary btn-sm" onclick="previewEnrollmentPDF('${enrollment.id}')">
                            <i class="bi bi-file-pdf"></i> View Form
                        </button>
                    </td>
                    <td>${deanStatus}</td>
                    <td>${businessStatus}</td>
                    <td>${registrarStatus}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="bm_enrollment_table-icons">
                            <i class="bi bi-printer table-icon-print enrollment-print-btn" data-id="${enrollment.id}" title="Print"></i>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
        updateSelectAllCheckbox();
        updateBulkActionsVisibility();
    }

    function getStatusBadge(status) {
        switch (status) {
            case 'approved':
                return '<span class="badge bg-success">Approved</span>';
            case 'disapproved':
                return '<span class="badge bg-danger">Disapproved</span>';
            default:
                return '<span class="badge bg-warning">Pending</span>';
        }
    }

    function getSignatoryStatus(status, timestamp, isBusinessManager = false, enrollmentId = null) {
        let statusClass = 'text-muted';
        let statusText = 'Pending';
        let icon = 'bi-clock';

        switch (status) {
            case 'approved':
                statusClass = 'text-success fw-bold';
                statusText = 'Approved';
                icon = 'bi-check-circle';
                break;
            case 'disapproved':
                statusClass = 'text-danger fw-bold';
                statusText = 'Disapproved';
                icon = 'bi-x-circle';
                break;
        }

        let html = '';
        
        // For Business Manager column - show buttons based on status
        if (isBusinessManager) {
            if (status === 'pending') {
                html = `
                    <div class="d-flex flex-column align-items-center gap-1">
                        <button type="button" class="btn btn-success btn-sm bm-enrollment-action-btn" data-id="${enrollmentId}" onclick="approveEnrollment('${enrollmentId}')">
                            <i class="bi bi-check-circle"></i> Approve
                        </button>
                        <button type="button" class="btn btn-danger btn-sm bm-enrollment-action-btn" data-id="${enrollmentId}" onclick="disapproveEnrollment('${enrollmentId}')">
                            <i class="bi bi-x-circle"></i> Disapprove
                        </button>
                    </div>
                `;
            } else if (status === 'disapproved') {
                // Show status with edit button for disapproved items
                html = `<span class="${statusClass}"><i class="bi ${icon}"></i> ${statusText}</span>`;
                if (timestamp) {
                    html += `<br><small class="text-muted">${timestamp}</small>`;
                }
                html += `
                    <div class="d-flex justify-content-center mt-1">
                        <button type="button" class="btn btn-warning btn-sm bm-enrollment-edit-btn" data-id="${enrollmentId}" onclick="editEnrollmentStatus('${enrollmentId}')" title="Edit Status">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                    </div>
                `;
            } else {
                // For approved status, just show the status
                html = `<span class="${statusClass}"><i class="bi ${icon}"></i> ${statusText}</span>`;
                if (timestamp) {
                    html += `<br><small class="text-muted">${timestamp}</small>`;
                }
            }
        } else {
            // For other columns - show status with timestamp
            html = `<span class="${statusClass}"><i class="bi ${icon}"></i> ${statusText}</span>`;
            if (timestamp) {
                html += `<br><small class="text-muted">${timestamp}</small>`;
            }
        }

        return html;
    }

    // Handle checkbox selection
    function handleCheckboxChange() {
        updateSelectAllCheckbox();
        updateBulkActionsVisibility();
    }

    function updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('bm_enrollment_select_all');
        const checkboxes = document.querySelectorAll('.enrollment-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');

        if (selectAllCheckbox) {
            selectAllCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < checkboxes.length;
            selectAllCheckbox.checked = checkboxes.length > 0 && checkedCheckboxes.length === checkboxes.length;
        }
    }

    function updateBulkActionsVisibility() {
        const checkedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');
        const bulkActions = document.getElementById('bm_enrollment_bulk_actions');
        const selectedCount = document.getElementById('bm_enrollment_selected_count');

        if (bulkActions && selectedCount) {
            if (checkedCheckboxes.length > 0) {
                bulkActions.style.display = 'block';
                selectedCount.textContent = `${checkedCheckboxes.length} selected`;
            } else {
                bulkActions.style.display = 'none';
            }
        }
    }

    // Print functions
    function printEnrollment(enrollmentId) {
        openPreviewModal([enrollmentId]);
    }

    function bulkPrintEnrollment() {
        const selectedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            showAlert('Please select at least one enrollment form to print', 'warning');
            return;
        }

        const enrollmentIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
        openPreviewModal(enrollmentIds);
    }

    function openPreviewModal(enrollmentIds) {
        // Verify modal elements exist
        const spinnerEl = document.getElementById('previewLoadingSpinner');
        const contentEl = document.getElementById('previewContent');
        const modalEl = document.getElementById('previewPrintModal');
        
        if (!spinnerEl || !contentEl || !modalEl) {
            console.error('Modal elements not found');
            showAlert('Modal elements not found. Please refresh the page.', 'error');
            return;
        }

        // Cancel any existing request
        if (currentPreviewController) {
            currentPreviewController.abort();
            currentPreviewController = null;
        }
        
        // Reset modal state and show loading
        resetPreviewModal();
        showPreviewLoader();
        
        // Don't show modal - we'll load content invisibly
        const modal = new bootstrap.Modal(modalEl);
        
        // Update modal title based on count
        const title = enrollmentIds.length === 1 ? 
            'Preview & Print Enrollment Form' : 
            `Preview & Print ${enrollmentIds.length} Enrollment Forms`;
        const titleEl = document.getElementById('previewPrintModalLabel');
        if (titleEl) {
            titleEl.innerHTML = `<i class="bi bi-printer me-2"></i>${title}`;
        }
        
        // Fetch preview content with timeout
        const url = `/business-manager/enrollment/preview-print/?ids=${enrollmentIds.join(',')}`;
        
        // Create AbortController for timeout and cancellation
        currentPreviewController = new AbortController();
        const timeoutId = setTimeout(() => currentPreviewController.abort(), 15000); // 15 second timeout
        
        fetch(url, {
            signal: currentPreviewController.signal,
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            hidePreviewLoader();
            contentEl.innerHTML = html;
            contentEl.style.display = 'block';
            
            // Auto-trigger print after content loads
            setTimeout(function() {
                printPreviewContent();
            }, 500);
        })
        .catch(error => {
            clearTimeout(timeoutId);
            hidePreviewLoader();
            
            if (error.name === 'AbortError') {
                contentEl.innerHTML = '<div class="alert alert-warning text-center p-4">Preview loading was cancelled or timed out. Please try again.</div>';
            } else {
                console.error('Error loading preview:', error);
                contentEl.innerHTML = `<div class="alert alert-danger text-center p-4">Error loading preview: ${error.message}</div>`;
            }
            contentEl.style.display = 'block';
        });
    }

    function printPreviewContent() {
        const contentEl = document.getElementById('previewContent');
        
        if (!contentEl || !contentEl.innerHTML.trim()) {
            showAlert('No content to print. Please wait for preview to load.', 'warning');
            return;
        }
        
        // Create dedicated iframe for printing
        createPrintIframe(contentEl.innerHTML);
    }

    function createPrintIframe(htmlContent) {
        // Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.top = '-9999px';
        iframe.style.left = '-9999px';
        iframe.style.width = '210mm'; // A4 width
        iframe.style.height = '297mm'; // A4 height
        iframe.style.border = 'none';
        
        // Add to body
        document.body.appendChild(iframe);
        
        // Build complete HTML document for iframe
        const printCSS = `
            <style>
                @page {
                    size: A4;
                    margin: 10mm;
                }
                
                * {
                    box-sizing: border-box;
                }
                
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    line-height: 1.2;
                    color: #000;
                    background: white;
                }
                
                /* Enrollment form specific styles */
                .enrollment-form {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                    page-break-after: always;
                    margin: 0;
                    padding: 0;
                }
                
                .form-header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .form-field {
                    margin-bottom: 10px;
                }
                
                .form-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                }
                
                .form-table th,
                .form-table td {
                    border: 1px solid #000;
                    padding: 8px;
                    text-align: left;
                }
                
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    .enrollment-form {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                        page-break-before: auto !important;
                        page-break-after: always !important;
                    }
                }
            </style>
        `;
        
        const fullHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Enrollment Forms</title>
                ${printCSS}
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `;
        
        // Set iframe content and handle print
        iframe.onload = function() {
            setTimeout(() => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    
                    // Refresh immediately when print dialog closes
                    iframe.contentWindow.onafterprint = function() {
                        location.reload();
                    };
                    
                    // Fallback in case onafterprint doesn't work
                    setTimeout(() => {
                        if (iframe.parentNode) {
                            document.body.removeChild(iframe);
                        }
                        location.reload();
                    }, 100);
                } catch (e) {
                    console.error('Print error:', e);
                    showAlert('Print failed. Please try again.', 'error');
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                    location.reload();
                }
            }, 100);
        };
        
        // Set iframe content
        iframe.srcdoc = fullHTML;
    }





    // Approval functions with sidebar UI - MATCHES REGISTRAR EXACTLY
    function approveEnrollment(enrollmentId) {
        currentApproveId = enrollmentId;
        resetApprovalSidebar();
        showApprovalSidebar();
    }

    function disapproveEnrollment(enrollmentId) {
        currentDisapproveId = enrollmentId;
        resetDisapprovalSidebar();
        showDisapprovalSidebar();
    }

    function editEnrollmentStatus(enrollmentId) {
        currentApproveId = enrollmentId;
        resetApprovalSidebar();
        showApprovalSidebar();
        
        // Change the button text to indicate this is an edit
        const approveBtn = document.getElementById("bm_enrollment_verifyOtpBtn");
        if (approveBtn) {
            approveBtn.textContent = "UPDATE TO APPROVED";
            approveBtn.classList.remove("btn-dark");
            approveBtn.classList.add("btn-success");
        }
        
        // Update header to indicate editing
        const header = document.querySelector("#bm_enrollment_otpSidebar h4");
        if (header) {
            header.textContent = "EDIT STATUS - APPROVAL PIN";
        }
        
        // Add note about editing
        const noteElement = document.createElement('p');
        noteElement.className = 'text-info small mb-3';
        noteElement.id = 'edit-status-note';
        noteElement.textContent = 'Changing disapproved status back to approved. Please enter your PIN to confirm.';
        
        const bodyElement = document.querySelector('.bm_enrollment_otp-body');
        const firstP = bodyElement.querySelector('p');
        if (firstP && !document.getElementById('edit-status-note')) {
            bodyElement.insertBefore(noteElement, firstP);
        }
    }

    function showApprovalSidebar() {
        // Close any open sidebars first
        closeAllSidebars();
        
        document.getElementById("bm_enrollment_otpSidebar").classList.add("show");
    }

    function hideApprovalSidebar() {
        document.getElementById("bm_enrollment_otpSidebar").classList.remove("show");
    }

    function showDisapprovalSidebar() {
        // Close any open sidebars first
        closeAllSidebars();
        
        document.getElementById("bm_enrollment_disapproveSidebar").classList.add("show");
    }

    function hideDisapprovalSidebar() {
        document.getElementById("bm_enrollment_disapproveSidebar").classList.remove("show");
    }

    function closeAllSidebars() {
        // Close OTP sidebar
        const otpSidebar = document.getElementById('bm_enrollment_otpSidebar');
        if (otpSidebar) {
            otpSidebar.classList.remove('show');
        }
        
        // Close disapprove sidebar
        const disapproveSidebar = document.getElementById('bm_enrollment_disapproveSidebar');
        if (disapproveSidebar) {
            disapproveSidebar.classList.remove('show');
        }
        
        // Don't reset global variables here since we're just switching between sidebars
        // Variables will be reset when sidebar is actually closed or on cancel
    }

    function resetApprovalSidebar() {
        document.getElementById("bm_enrollment_otpComment").value = "";
        const input = document.getElementById("bm_enrollment_otpinput");
        if (input) {
            input.value = "";
            input.focus();
        }
        document.getElementById("bm_enrollment_otpError").style.display = "none";
        
        // Reset edit-specific changes
        const approveBtn = document.getElementById("bm_enrollment_verifyOtpBtn");
        if (approveBtn) {
            approveBtn.textContent = "APPROVE";
            approveBtn.classList.remove("btn-success");
            approveBtn.classList.add("btn-dark");
        }
        
        const header = document.querySelector("#bm_enrollment_otpSidebar h4");
        if (header) {
            header.textContent = "APPROVAL PIN";
        }
        
        // Remove edit note if it exists
        const editNote = document.getElementById('edit-status-note');
        if (editNote) {
            editNote.remove();
        }
    }

    function resetDisapprovalSidebar() {
        document.getElementById("bm_enrollment_disapprove_pin_step").style.display = "block";
        document.getElementById("bm_enrollment_disapprove_reason_step").style.display = "none";
        
        document.getElementById("bm_enrollment_disapproveComment").value = "";
        document.querySelectorAll('#bm_enrollment_disapproveSidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.getElementById("bm_enrollment_appointmentDate").value = "";
        document.getElementById("bm_enrollment_appointmentError").style.display = "none";
        document.getElementById("bm_enrollment_disapproveError").style.display = "none";
        document.getElementById("bm_enrollment_otherReasonInput").value = "";
        document.getElementById("bm_enrollment_otherReasonContainer").style.display = "none";
        
        document.getElementById("bm_enrollment_disapprove_pin_input").value = "";
        document.getElementById("bm_enrollment_disapprove_pin_error").style.display = "none";
    }

    function handleApproval() {
        const pin = document.getElementById("bm_enrollment_otpinput").value.trim();
        const comment = document.getElementById("bm_enrollment_otpComment").value.trim();
        
        if (!pin) {
            document.getElementById("bm_enrollment_otpError").style.display = "block";
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('bm_enrollment_verifyOtpBtn');
        console.log('BMENROLLMENT: Found submitBtn:', submitBtn);
        if (!submitBtn) {
            console.error('BMENROLLMENT: submitBtn not found!');
            return;
        }
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        // Determine if this is bulk or individual operation
        const isBulkOperation = currentActionBM === 'bulk_approve';
        const url = isBulkOperation ? '/business-manager/enrollment/bulk-approve/' : '/business-manager/enrollment/approve/';
        
        const requestData = isBulkOperation ? {
            enrollment_ids: currentApproveId, // Array for bulk
            pin: pin,
            remarks: comment
        } : {
            enrollment_id: currentApproveId, // Single ID for individual
            pin: pin,
            remarks: comment
        };

        // Make API call
        fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message, 'success');
                hideApprovalSidebar();
                // Reset bulk operation state
                if (isBulkOperation) {
                    currentActionBM = null;
                    // Reset sidebar title
                    const approveTitle = document.getElementById('bm_enrollment_approve_title');
                    if (approveTitle) {
                        approveTitle.textContent = 'APPROVAL PIN';
                    }
                }
                // Add delay to ensure database transaction is committed
                setTimeout(() => {
                    loadEnrollmentData(); // Reload data
                }, 1000);
            } else {
                document.getElementById("bm_enrollment_otpError").style.display = "block";
                document.getElementById("bm_enrollment_otpError").textContent = data.error || 'Incorrect PIN';
            }
        })
        .catch(error => {
            console.error('Error approving enrollment:', error);
            document.getElementById("bm_enrollment_otpError").style.display = "block";
            document.getElementById("bm_enrollment_otpError").textContent = 'Error approving enrollment form';
        })
        .finally(() => {
            console.log('BMENROLLMENT: Restoring button state');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }

    function handlePinVerification() {
        const pinInput = document.getElementById("bm_enrollment_disapprove_pin_input").value.trim();
        
        if (!pinInput) {
            document.getElementById("bm_enrollment_disapprove_pin_error").textContent = "Please enter PIN";
            document.getElementById("bm_enrollment_disapprove_pin_error").style.display = "block";
            return;
        }
        
        // Verify PIN with backend before proceeding to reason step
        fetch('/business-manager/verify-pin/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pin: pinInput })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // PIN is valid, proceed to reason selection
                document.getElementById("bm_enrollment_disapprove_pin_error").style.display = "none";
                document.getElementById("bm_enrollment_disapprove_pin_step").style.display = "none";
                document.getElementById("bm_enrollment_disapprove_reason_step").style.display = "block";
            } else {
                // PIN is invalid
                document.getElementById("bm_enrollment_disapprove_pin_error").textContent = data.error || "Invalid PIN";
                document.getElementById("bm_enrollment_disapprove_pin_error").style.display = "block";
            }
        })
        .catch(error => {
            console.error('Error verifying PIN:', error);
            document.getElementById("bm_enrollment_disapprove_pin_error").textContent = "Error verifying PIN. Please try again.";
            document.getElementById("bm_enrollment_disapprove_pin_error").style.display = "block";
        });
    }

    function handleDisapproval() {
        let checkedReasons = Array.from(document.querySelectorAll('#bm_enrollment_disapproveSidebar input[type="checkbox"]:checked')).map(cb => cb.value);
        const appointmentDate = document.getElementById("bm_enrollment_appointmentDate").value;
        
        const otherReasonChecked = document.getElementById("bm_enrollment_reasonOther").checked;
        const otherReasonInput = document.getElementById("bm_enrollment_otherReasonInput").value.trim();
        
        if (otherReasonChecked && otherReasonInput) {
            checkedReasons = checkedReasons.filter(reason => reason !== "Other");
            checkedReasons.push(otherReasonInput);
        }
        
        document.getElementById("bm_enrollment_disapproveError").style.display = "none";
        document.getElementById("bm_enrollment_appointmentError").style.display = "none";
        
        if (checkedReasons.length === 0) {
            document.getElementById("bm_enrollment_disapproveError").style.display = "block";
            return;
        }
        
        if (!appointmentDate) {
            document.getElementById("bm_enrollment_appointmentError").style.display = "block";
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('bm_enrollment_submit_Appointment_Disapproval_Btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        const pin = document.getElementById("bm_enrollment_disapprove_pin_input").value.trim();
        const comment = document.getElementById("bm_enrollment_disapproveComment").value.trim();
        const remarksText = checkedReasons.join(", ") + (comment ? " - " + comment : "") + " (Appointment: " + appointmentDate + ")";
        
        // Determine if this is bulk or individual operation
        const isBulkOperation = currentActionBM === 'bulk_disapprove';
        const url = isBulkOperation ? '/business-manager/enrollment/bulk-disapprove/' : '/business-manager/enrollment/disapprove/';
        
        const requestData = isBulkOperation ? {
            enrollment_ids: currentDisapproveIdBM, // Array for bulk
            pin: pin,
            remarks: remarksText,
            appointment_date: appointmentDate
        } : {
            enrollment_id: currentDisapproveId, // Single ID for individual
            pin: pin,
            remarks: remarksText
        };
        
        // Make API call
        fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message, 'success');
                hideDisapprovalSidebar();
                // Reset bulk operation state
                if (isBulkOperation) {
                    currentActionBM = null;
                    currentDisapproveIdBM = null;
                    // Reset sidebar title
                    const disapproveTitle = document.getElementById('bm_enrollment_disapprove_title');
                    if (disapproveTitle) {
                        disapproveTitle.textContent = 'DISAPPROVE REASON';
                    }
                }
                // Add delay to ensure database transaction is committed
                setTimeout(() => {
                    loadEnrollmentData(); // Reload data
                }, 1000);
            } else {
                document.getElementById("bm_enrollment_disapprove_pin_error").style.display = "block";
                document.getElementById("bm_enrollment_disapprove_pin_error").textContent = data.error || 'Error disapproving enrollment form';
            }
        })
        .catch(error => {
            console.error('Error disapproving enrollment:', error);
            document.getElementById("bm_enrollment_disapprove_pin_error").style.display = "block";
            document.getElementById("bm_enrollment_disapprove_pin_error").textContent = 'Error disapproving enrollment form';
        })
        .finally(() => {
            console.log('BMENROLLMENT: Restoring button state');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }

    function toggleOtherReasonInput() {
        const otherCheckbox = document.getElementById("bm_enrollment_reasonOther");
        const otherInputContainer = document.getElementById("bm_enrollment_otherReasonContainer");
        
        if (otherCheckbox && otherInputContainer) {
            if (otherCheckbox.checked) {
                otherInputContainer.style.display = "block";
            } else {
                otherInputContainer.style.display = "none";
                document.getElementById("bm_enrollment_otherReasonInput").value = "";
            }
        }
    }

    // Bulk Operations - MATCHES REGISTRAR EXACTLY
    function bulkApproveEnrollmentBM() {
        const selectedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            showAlert('Please select at least one enrollment form to approve', 'warning');
            return;
        }

        // Get selected enrollment data and filter actionable ones
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        const selectedEnrollments = filteredData.filter(enrollment => selectedIds.includes(enrollment.id));
        
        let actionableIds = [];
        let alreadyApproved = [];
        let alreadyDisapproved = [];
        
        selectedEnrollments.forEach(enrollment => {
            const statusCell = document.querySelector(`tr input[value="${enrollment.id}"]`).closest('tr').children[9]; // Business Manager column
            const statusText = statusCell.textContent.trim();
            
            if (statusText.includes('Approved')) {
                alreadyApproved.push(enrollment.student_name);
            } else if (statusText.includes('Disapproved')) {
                // Cannot approve disapproved forms
                alreadyDisapproved.push(enrollment.student_name);
            } else {
                actionableIds.push(enrollment.id);
            }
        });

        // Show combined message if needed
        let message = '';
        if ((alreadyApproved.length > 0 || alreadyDisapproved.length > 0) && actionableIds.length > 0) {
            let skippedMessages = [];
            if (alreadyApproved.length > 0) {
                skippedMessages.push(`${alreadyApproved.length} already approved: ${alreadyApproved.join(', ')}`);
            }
            if (alreadyDisapproved.length > 0) {
                skippedMessages.push(`${alreadyDisapproved.length} already disapproved: ${alreadyDisapproved.join(', ')}`);
            }
            message = `${actionableIds.length} enrollment(s) will be approved. ${skippedMessages.join('; ')}`;
            showAlert(message, 'info');
        } else if (alreadyApproved.length > 0 || alreadyDisapproved.length > 0) {
            let allProcessedMessages = [];
            if (alreadyApproved.length > 0) {
                allProcessedMessages.push(`${alreadyApproved.length} already approved: ${alreadyApproved.join(', ')}`);
            }
            if (alreadyDisapproved.length > 0) {
                allProcessedMessages.push(`${alreadyDisapproved.length} already disapproved: ${alreadyDisapproved.join(', ')}`);
            }
            message = `All selected enrollments are already processed - ${allProcessedMessages.join('; ')}`;
            showAlert(message, 'info');
            return;
        }

        if (actionableIds.length === 0) {
            return;
        }

        // Set up bulk approval
        currentActionBM = 'bulk_approve';
        currentApproveId = actionableIds; // Store array of IDs
        
        // Update sidebar title
        const approveTitle = document.getElementById('bm_enrollment_approve_title');
        if (approveTitle) {
            approveTitle.textContent = `BULK APPROVAL PIN (${actionableIds.length} items)`;
        }
        
        resetApprovalSidebar();
        showApprovalSidebar();
    }

    function bulkDisapproveEnrollmentBM() {
        const selectedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            showAlert('Please select at least one enrollment form to disapprove', 'warning');
            return;
        }

        // Get selected enrollment data and filter actionable ones
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        const selectedEnrollments = filteredData.filter(enrollment => selectedIds.includes(enrollment.id));
        
        let actionableIds = [];
        let alreadyApproved = [];
        let alreadyDisapproved = [];
        
        selectedEnrollments.forEach(enrollment => {
            const statusCell = document.querySelector(`tr input[value="${enrollment.id}"]`).closest('tr').children[9]; // Business Manager column
            const statusText = statusCell.textContent.trim();
            
            if (statusText.includes('Approved')) {
                alreadyApproved.push(enrollment.student_name);
            } else if (statusText.includes('Disapproved')) {
                alreadyDisapproved.push(enrollment.student_name);
            } else {
                actionableIds.push(enrollment.id);
            }
        });

        // Show combined message if needed
        let message = '';
        if ((alreadyApproved.length > 0 || alreadyDisapproved.length > 0) && actionableIds.length > 0) {
            let skippedMsg = '';
            if (alreadyApproved.length > 0) {
                skippedMsg += `${alreadyApproved.length} approved enrollment(s): ${alreadyApproved.join(', ')}`;
            }
            if (alreadyDisapproved.length > 0) {
                if (skippedMsg) skippedMsg += '; ';
                skippedMsg += `${alreadyDisapproved.length} already disapproved enrollment(s): ${alreadyDisapproved.join(', ')}`;
            }
            message = `${actionableIds.length} enrollment(s) will be disapproved. Skipped: ${skippedMsg}`;
            showAlert(message, 'info');
        } else if (alreadyApproved.length > 0 || alreadyDisapproved.length > 0) {
            let skippedMsg = '';
            if (alreadyApproved.length > 0) {
                skippedMsg = `${alreadyApproved.length} enrollment(s) are already approved: ${alreadyApproved.join(', ')}`;
            }
            if (alreadyDisapproved.length > 0) {
                if (skippedMsg) skippedMsg += '; ';
                skippedMsg += `${alreadyDisapproved.length} enrollment(s) are already disapproved: ${alreadyDisapproved.join(', ')}`;
            }
            showAlert(skippedMsg, 'info');
            return;
        }

        if (actionableIds.length === 0) {
            return;
        }

        // Set up bulk disapproval
        currentActionBM = 'bulk_disapprove';
        currentDisapproveIdBM = actionableIds; // Store array of IDs
        
        // Update sidebar title
        const disapproveTitle = document.getElementById('bm_enrollment_disapprove_title');
        if (disapproveTitle) {
            disapproveTitle.textContent = `BULK DISAPPROVAL REASON (${actionableIds.length} items)`;
        }
        
        resetDisapprovalSidebar();
        showDisapprovalSidebar();
    }

    // Event handlers
    function initializeEventHandlers() {
        console.log('BMENROLLMENT: initializeEventHandlers() called');
        // Date display
        const dateSpan = document.getElementById("bm_enrollment_dateToday");
        if (dateSpan) {
            const today = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            dateSpan.textContent = today.toLocaleDateString('en-US', options);
        }

        // Filter changes
        document.getElementById('bm_enrollment_filter_course')?.addEventListener('change', applyFilters);
        document.getElementById('bm_enrollment_filter_year')?.addEventListener('change', applyFilters);
        document.getElementById('bm_enrollment_filter_section')?.addEventListener('change', applyFilters);
        document.getElementById('bm_enrollment_filter_status')?.addEventListener('change', applyFilters);

        // Search
        document.getElementById('bm_enrollment_search_input')?.addEventListener('input', applyFilters);

        // Reset filters
        document.getElementById('bm_enrollment_reset_filters')?.addEventListener('click', () => {
            document.getElementById('bm_enrollment_filter_course').selectedIndex = 0;
            document.getElementById('bm_enrollment_filter_year').selectedIndex = 0;
            document.getElementById('bm_enrollment_filter_section').selectedIndex = 0;
            document.getElementById('bm_enrollment_filter_status').selectedIndex = 0;
            document.getElementById('bm_enrollment_search_input').value = '';
            applyFilters();
        });

        // Select all checkbox
        document.getElementById('bm_enrollment_select_all')?.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.enrollment-checkbox');
            checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
            updateBulkActionsVisibility();
        });

        // Table event delegation
        const tableBody = document.getElementById('bm_enrollment_table_body');
        if (tableBody) {
            tableBody.addEventListener('change', (e) => {
                if (e.target.classList.contains('enrollment-checkbox')) {
                    handleCheckboxChange();
                }
            });

            tableBody.addEventListener('click', (e) => {
                if (e.target.classList.contains('table-icon-print') || e.target.closest('.table-icon-print')) {
                    const button = e.target.closest('.table-icon-print');
                    const enrollmentId = button.getAttribute('data-id');
                    printEnrollment(enrollmentId);
                }
            });
        }

        // Print button and modal event handlers
        const printBtn = document.getElementById('printPreviewBtn');
        const modalEl = document.getElementById('previewPrintModal');

        if (printBtn) {
            printBtn.addEventListener('click', function() {
                printPreviewContent();
            });
        }

        // Reset modal state when closed
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', function() {
                // Cancel any ongoing request
                if (currentPreviewController) {
                    currentPreviewController.abort();
                    currentPreviewController = null;
                }
                // Reset modal state
                resetPreviewModal();
            });

            // Show loader when opening modal
            modalEl.addEventListener('show.bs.modal', function() {
                showPreviewLoader();
            });
        }

        // Sidebar event handlers - MATCHES REGISTRAR EXACTLY
        const approveBtn = document.getElementById("bm_enrollment_verifyOtpBtn");
        console.log('BMENROLLMENT: Found approve button:', approveBtn);
        approveBtn?.addEventListener("click", handleApproval);
        
        document.getElementById("bm_enrollment_disapprove_pin_submit_btn")?.addEventListener("click", handlePinVerification);
        
        document.getElementById("bm_enrollment_submit_Appointment_Disapproval_Btn")?.addEventListener("click", handleDisapproval);
        
        document.getElementById("bm_enrollment_reasonOther")?.addEventListener("change", toggleOtherReasonInput);
        
        // Close sidebar buttons
        document.querySelector(".enrollment-close-otp-btn")?.addEventListener("click", hideApprovalSidebar);
        document.querySelector(".enrollment-close-disapprove-btn")?.addEventListener("click", hideDisapprovalSidebar);
        
        // Allow Enter key to submit PIN forms
        document.getElementById('bm_enrollment_otpinput')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleApproval();
            }
        });

        document.getElementById('bm_enrollment_disapprove_pin_input')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handlePinVerification();
            }
        });
    }

    // Public API
    return {
        init: function() {
            console.log('BMENROLLMENT: init() called');
            initializeEventHandlers();
            loadEnrollmentData();
        },
        printEnrollment: printEnrollment,
        approveEnrollment: approveEnrollment,
        disapproveEnrollment: disapproveEnrollment,
        editEnrollmentStatus: editEnrollmentStatus,
        bulkPrintEnrollment: bulkPrintEnrollment,
        bulkApproveEnrollmentBM: bulkApproveEnrollmentBM,
        bulkDisapproveEnrollmentBM: bulkDisapproveEnrollmentBM,
    };
})();

// Global functions for template compatibility
function printEnrollment(enrollmentId) {
    BMEnrollment.printEnrollment(enrollmentId);
}


function approveEnrollment(enrollmentId) {
    BMEnrollment.approveEnrollment(enrollmentId);
}

function disapproveEnrollment(enrollmentId) {
    BMEnrollment.disapproveEnrollment(enrollmentId);
}

function editEnrollmentStatus(enrollmentId) {
    BMEnrollment.editEnrollmentStatus(enrollmentId);
}

function bulkPrintEnrollment() {
    BMEnrollment.bulkPrintEnrollment();
}

function bulkApproveEnrollmentBM() {
    BMEnrollment.bulkApproveEnrollmentBM();
}

function bulkDisapproveEnrollmentBM() {
    BMEnrollment.bulkDisapproveEnrollmentBM();
}


// Initialize when DOM is ready
// Initialize BMEnrollment
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        BMEnrollment.init();
    });
} else {
    BMEnrollment.init();
}

// PDF Preview function for consistent design
function previewEnrollmentPDF(enrollmentId) {
    console.log('previewEnrollmentPDF called with ID:', enrollmentId);
    if (!enrollmentId) {
        showAlert('No enrollment ID provided', 'warning');
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('pdfPreviewModal'));
    const loadingEl = document.getElementById('pdfPreviewLoading');
    const contentEl = document.getElementById('pdfPreviewContent');
    const modalElement = document.getElementById('pdfPreviewModal');
    
    // Add modal close handler to clean up any CSS interference
    const handleModalHidden = function() {
        // Clear content to prevent CSS bleeding
        if (contentEl) contentEl.innerHTML = '';
        if (loadingEl) loadingEl.innerHTML = '';
        // Remove any dynamically added styles that might affect the main page
        const dynamicStyles = document.querySelectorAll('style[data-modal-injected]');
        dynamicStyles.forEach(style => style.remove());
        modalElement.removeEventListener('hidden.bs.modal', handleModalHidden);
    };
    modalElement.addEventListener('hidden.bs.modal', handleModalHidden);
    
    // Show loading
    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';
    contentEl.innerHTML = '';
    
    // Don't show modal - we'll load content invisibly
    // modal.show();
    
    // Load form content - use preview-print endpoint with single ID
    fetch(`/business-manager/enrollment/preview-print/?ids=${enrollmentId}`)
        .then(response => response.text())
        .then(html => {
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from server');
            }
            
            // Show content and apply styles programmatically to avoid global CSS bleeding
            contentEl.innerHTML = `<div class="pdf-modal-content">${html}</div>`;
            
            // Apply styles directly to elements within the modal to prevent global scope issues
            const modalContent = contentEl.querySelector('.pdf-modal-content');
            if (modalContent) {
                modalContent.style.fontFamily = 'Arial, sans-serif';
                modalContent.style.lineHeight = '1.6';
                modalContent.style.background = 'white';
                modalContent.style.padding = '20px';
                
                // Apply table styles
                const tables = modalContent.querySelectorAll('table');
                tables.forEach(table => {
                    table.style.width = '100%';
                    table.style.borderCollapse = 'collapse';
                    table.style.marginBottom = '20px';
                    
                    // Apply cell styles
                    const cells = table.querySelectorAll('th, td');
                    cells.forEach(cell => {
                        cell.style.border = '1px solid #000';
                        cell.style.padding = '8px';
                        cell.style.textAlign = 'left';
                    });
                    
                    // Apply header styles
                    const headers = table.querySelectorAll('th');
                    headers.forEach(header => {
                        header.style.backgroundColor = '#f5f5f5';
                        header.style.fontWeight = 'bold';
                    });
                });
            }
            contentEl.style.display = 'block';
            
            // Auto-trigger print after content loads
            setTimeout(function() {
                printPreviewContent();
            }, 500);
        })
        .catch(error => {
            console.error('Error loading form:', error);
            
            // Show error
            contentEl.innerHTML = `<div class="alert alert-danger m-3">Failed to load form preview. Please try again.</div>`;
            contentEl.style.display = 'block';
        })
        .finally(() => {
            // Always hide loading with additional safety checks
            if (loadingEl) {
                loadingEl.style.display = 'none';
                loadingEl.innerHTML = ''; // Clear loading content as well
                console.log('Loading indicator hidden and cleared');
            } else {
                console.error('Loading element not found during cleanup');
            }
        });
}