// Signatory Enrollment JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing Enrollment Page');
    
    // Set current date
    const today = new Date();
    const dateElement = document.getElementById('signatory_enrollment_dateToday');
    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Hide bulk actions by default
    
    // Load initial data
    loadEnrollmentData();
    updateBulkActionsVisibility();
    loadFilterOptions();
    
    // Add event listeners
    setupEventListeners();
});

let currentEnrollmentId = null;
let currentAction = null;
let filteredData = [];
let currentApproveId = null;

function initializeEnrollmentPage() {
    console.log('Initializing Signatory Enrollment Page');
    
    // Set today's date
    const today = new Date();
    const dateElement = document.getElementById('signatory_enrollment_dateToday');
    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Hide bulk actions by default - explicit hide
    const bulkActions = document.getElementById('signatory_enrollment_bulk_actions');
    console.log('Enrollment bulk actions element found:', !!bulkActions);
    if (bulkActions) {
        console.log('Current enrollment bulk actions display:', bulkActions.style.display);
        bulkActions.style.display = 'none';
        console.log('Enrollment bulk actions hidden explicitly');
    }
    updateBulkActionsVisibility();
    
    // Load initial data
    loadEnrollmentData();
    loadFilterOptions();
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Filter change events
    document.getElementById('signatory_enrollment_filter_course').addEventListener('change', loadEnrollmentData);
    document.getElementById('signatory_enrollment_filter_year').addEventListener('change', loadEnrollmentData);
    document.getElementById('signatory_enrollment_filter_section').addEventListener('change', loadEnrollmentData);
    document.getElementById('signatory_enrollment_filter_status').addEventListener('change', loadEnrollmentData);
    
    // Search input
    document.getElementById('signatory_enrollment_search_input').addEventListener('input', debounce(loadEnrollmentData, 500));
    
    // Reset filter
    document.getElementById('signatory_enrollment_reset_filter').addEventListener('click', resetFilters);
    
    // Select all checkbox
    document.getElementById('signatory_enrollment_select_all').addEventListener('change', toggleSelectAll);
    
    // Bulk actions
    document.getElementById('signatory_enrollment_bulk_print').addEventListener('click', bulkPrint);
    
    // PIN verification
    document.getElementById('signatory_enrollment_verifyOtpBtn').addEventListener('click', verifyAndApprove);
    document.getElementById('signatory_enrollment_disapprove_pin_submit_btn').addEventListener('click', verifyPinForDisapproval);
    document.getElementById('signatory_enrollment_submit_Appointment_Disapproval_Btn').addEventListener('click', submitDisapproval);
    
    // Print button in modal
    const printBtn = document.getElementById('printPreviewBtn');
    if (printBtn) {
        printBtn.addEventListener('click', printPreviewContent);
    }
}

function loadEnrollmentData() {
    console.log('Loading enrollment data...');
    const filters = getFilterParams();
    console.log('Filter params:', filters);
    
    fetch(`/signatory/enrollment/api/data/?${new URLSearchParams(filters)}`)
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            if (data.success) {
                console.log('Enrollment data loaded successfully:', data.enrollments);
                updateEnrollmentTable(data.enrollments);
            } else {
                console.error('Failed to load enrollment data:', data.error);
                showError('Failed to load enrollment data');
            }
        })
        .catch(error => {
            console.error('Error loading enrollment data:', error);
            showError('Error loading enrollment data');
        });
}

function loadFilterOptions() {
    fetch('/signatory/enrollment/filter-options/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateFilterOptions(data);
            }
        })
        .catch(error => {
            console.error('Error loading filter options:', error);
        });
}

function populateFilterOptions(data) {
    // Populate course filter
    const courseSelect = document.getElementById('signatory_enrollment_filter_course');
    courseSelect.innerHTML = '<option selected disabled>Filter by Course</option>';
    data.courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseSelect.appendChild(option);
    });
    
    // Populate year filter
    const yearSelect = document.getElementById('signatory_enrollment_filter_year');
    yearSelect.innerHTML = '<option selected disabled>Filter by Year</option>';
    data.years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    
    // Populate section filter
    const sectionSelect = document.getElementById('signatory_enrollment_filter_section');
    sectionSelect.innerHTML = '<option selected disabled>Filter by Section</option>';
    data.sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = section;
        sectionSelect.appendChild(option);
    });
}

function getFilterParams() {
    const course = document.getElementById('signatory_enrollment_filter_course').value;
    const year = document.getElementById('signatory_enrollment_filter_year').value;
    const section = document.getElementById('signatory_enrollment_filter_section').value;
    const status = document.getElementById('signatory_enrollment_filter_status').value;
    const search = document.getElementById('signatory_enrollment_search_input').value;

    // Treat placeholder values or undefined as empty
    return {
        course: course && course !== 'Filter by Course' ? course : '',
        year: year && year !== 'Filter by Year' ? year : '',
        section: section && section !== 'Filter by Section' ? section : '',
        status: status && status !== 'Filter by Status' ? status : '',
        search: search || ''
    };
}

function updateEnrollmentTable(enrollments) {
    filteredData = enrollments; // Store data for bulk operations
    const tableBody = document.getElementById('signatory_enrollment_table_body');
    const bulkActions = document.getElementById('signatory_enrollment_bulk_actions');
    const selectAllCheckbox = document.getElementById('signatory_enrollment_select_all');

    // Reset table
    tableBody.innerHTML = '';

    // Clear select-all and hide bulk buttons first
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    if (bulkActions) bulkActions.style.display = 'none';

    if (enrollments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    No enrollment forms found
                </td>
            </tr>
        `;
        return;
    }

    // Build table rows
    const rowsHtml = enrollments.map(enrollment => `
        <tr>
            <td>
                <input type="checkbox" class="enrollment-checkbox" value="${enrollment.enrollment_id}">
            </td>
            <td class="text-start">${enrollment.student_name}</td>
            <td>${enrollment.course}</td>
            <td>${enrollment.year}</td>
            <td>${enrollment.section}</td>
            <td>${enrollment.student_number}</td>
            <td class="small text-muted">${enrollment.date_submitted}</td>
            <td>
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="viewEnrollmentPDF('${enrollment.enrollment_id}')">
                    <i class="bi bi-file-pdf"></i> View PDF
                </button>
            </td>
            <td>
                ${getDeanStatusHTML(enrollment)}
            </td>
            <td>
                <div class="small text-muted">${getStatusBadge(enrollment.business_manager_status, enrollment.business_manager_timestamp)}</div>
            </td>
            <td>
                <div class="small text-muted">${getStatusBadge(enrollment.registrar_status, enrollment.registrar_timestamp)}</div>
            </td>
            <td>
                <div class="small text-muted">${getStatusBadge(enrollment.overall_status, enrollment.overall_timestamp)}</div>
            </td>
            <td>
                <div class="signatory_enrollment_table-icons">
                    <i class="bi bi-printer table-icon-print" onclick="printEnrollment('${enrollment.enrollment_id}')" title="Print"></i>
                </div>
            </td>
        </tr>
    `).join('');

    tableBody.innerHTML = rowsHtml;

    // Attach checkbox listeners
    document.querySelectorAll('.enrollment-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBulkActionsVisibility);
        cb.checked = false; // make sure all checkboxes are cleared
    });

    // Force hide bulk actions again just to be safe
    updateBulkActionsVisibility();
}


function getDeanStatusHTML(enrollment) {
    const timestamp = enrollment.dean_timestamp ? `at ${enrollment.dean_timestamp}` : '';

    if (enrollment.dean_status === 'pending') {
        return `
            <div class="d-flex flex-column align-items-center gap-1">
                <button type="button" class="btn btn-success btn-sm" onclick="approveEnrollment('${enrollment.id}')">Approve</button>
                <button type="button" class="btn btn-danger btn-sm" onclick="disapproveEnrollment('${enrollment.id}')">Disapprove</button>
            </div>
        `;
    } else if (enrollment.dean_status === 'approved') {
        return `
            <span class="text-success small">Approved ${timestamp}</span>
        `;
    } else if (enrollment.dean_status === 'disapproved') {
        return `
            <div class="d-flex flex-column align-items-center gap-1">
                <span class="text-danger small">Disapproved ${timestamp}</span>
                <button type="button" class="btn btn-warning btn-sm" onclick="editEnrollment('${enrollment.id}')">Edit</button>
            </div>
        `;
    }

    return `<span class="text-muted small">Unknown</span>`;
}


function getStatusBadge(status, timestamp = null) {
    if (status === 'approved') {
        return `<span class="text-success small">Approved at ${timestamp || '-'}</span>`;
    } else if (status === 'completed') {
        return `<span class="text-success small">Completed</span>`;
    } else if (status === 'disapproved') {
        return `<span class="text-danger small">Disapproved at ${timestamp || '-'}</span>`;
    } else if (status === 'pending') {
        return `<span class="text-warning small">Pending</span>`;
    }
    return `<span class="text-muted small">Unknown</span>`;
}


function approveEnrollment(enrollmentId) {
    currentEnrollmentId = enrollmentId;
    currentAction = 'approve';
    openOtpSidebar();
}

function disapproveEnrollment(enrollmentId) {
    currentEnrollmentId = enrollmentId;
    currentAction = 'disapprove';
    openDisapproveSidebar();
}

function verifyAndApprove() {
    const pin = document.getElementById('signatory_enrollment_otpinput').value;
    const comment = document.getElementById('signatory_enrollment_otpComment').value;
    
    if (!pin) {
        showOtpError('Please enter PIN');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('signatory_enrollment_verifyOtpBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    const formData = new FormData();
    
    // Check if this is bulk operation
    if (currentAction === 'bulk_approve' && Array.isArray(currentApproveId)) {
        // Bulk approval
        currentApproveId.forEach(id => formData.append('enrollment_ids[]', id));
        formData.append('pin', pin);
        formData.append('comment', comment);
        
        fetch('/signatory/enrollment/bulk-approve/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeOtpSidebar();
                const message = data.processed_count > 0 ? 
                    `${data.processed_count} enrollment(s) approved successfully` :
                    'No enrollments were processed';
                showSuccess(message);
                
                // Reset bulk operation state
                currentAction = null;
                currentApproveId = null;
                
                // Reset title
                const approveTitle = document.getElementById('signatory_enrollment_approve_title');
                if (approveTitle) {
                    approveTitle.textContent = 'APPROVAL PIN';
                }
                
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadEnrollmentData();
                }, 1000);
            } else {
                showOtpError(data.error || 'Failed to approve enrollments');
            }
        })
        .catch(error => {
            console.error('Error bulk approving enrollments:', error);
            showOtpError('Error bulk approving enrollments');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    } else {
        // Individual approval
        formData.append('enrollment_id', currentEnrollmentId);
        formData.append('pin', pin);
        formData.append('comment', comment);
        
        fetch('/signatory/enrollment/approve/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeOtpSidebar();
                showSuccess('Enrollment approved successfully');
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadEnrollmentData();
                }, 1000);
            } else {
                showOtpError(data.error || 'Failed to approve enrollment');
            }
        })
        .catch(error => {
            console.error('Error approving enrollment:', error);
            showOtpError('Error approving enrollment');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }
}

function submitDisapproval() {
    const reasons = getSelectedReasons();
    const comment = document.getElementById('signatory_enrollment_disapproveComment').value;
    const appointmentDate = document.getElementById('signatory_enrollment_appointmentDate').value;
    
    if (reasons.length === 0) {
        showDisapproveError('Please select at least one reason');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('signatory_enrollment_submit_Appointment_Disapproval_Btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    const formData = new FormData();
    
    // Check if this is bulk operation
    if (currentAction === 'bulk_disapprove' && Array.isArray(currentApproveId)) {
        // Bulk disapproval
        currentApproveId.forEach(id => formData.append('enrollment_ids[]', id));
        formData.append('pin', document.getElementById('signatory_enrollment_disapprove_pin_input').value);
        formData.append('comment', comment);
        reasons.forEach(reason => formData.append('reasons[]', reason));
        
        fetch('/signatory/enrollment/bulk-disapprove/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeDisapproveSidebar();
                const message = data.processed_count > 0 ? 
                    `${data.processed_count} enrollment(s) disapproved successfully` :
                    'No enrollments were processed';
                showSuccess(message);
                
                // Reset bulk operation state
                currentAction = null;
                currentApproveId = null;
                
                // Reset title
                const disapproveTitle = document.getElementById('signatory_enrollment_disapprove_title');
                if (disapproveTitle) {
                    disapproveTitle.textContent = 'DISAPPROVE REASON';
                }
                
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadEnrollmentData();
                }, 1000);
            } else {
                showDisapproveError(data.error || 'Failed to disapprove enrollments');
            }
        })
        .catch(error => {
            console.error('Error bulk disapproving enrollments:', error);
            showDisapproveError('Error bulk disapproving enrollments');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    } else {
        // Individual disapproval
        formData.append('enrollment_id', currentEnrollmentId);
        formData.append('pin', document.getElementById('signatory_enrollment_disapprove_pin_input').value);
        formData.append('comment', comment);
        reasons.forEach(reason => formData.append('reasons[]', reason));
        
        fetch('/signatory/enrollment/disapprove/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeDisapproveSidebar();
                showSuccess('Enrollment disapproved successfully');
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadEnrollmentData();
                }, 1000);
            } else {
                showDisapproveError(data.error || 'Failed to disapprove enrollment');
            }
        })
        .catch(error => {
            console.error('Error disapproving enrollment:', error);
            showDisapproveError('Error disapproving enrollment');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }
}

function getSelectedReasons() {
    const reasons = [];
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        if (checkbox.id.startsWith('signatory_enrollment_reason')) {
            if (checkbox.id === 'signatory_enrollment_reasonOther') {
                const otherInput = document.getElementById('signatory_enrollment_otherReasonInput');
                if (otherInput.value.trim()) {
                    reasons.push(otherInput.value.trim());
                }
            } else {
                reasons.push(checkbox.value);
            }
        }
    });
    return reasons;
}

function viewEnrollmentPDF(enrollmentId) {
    console.log('viewEnrollmentPDF called with ID:', enrollmentId);
    if (!enrollmentId) {
        showAlert('No enrollment ID provided', 'warning');
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('pdfPreviewModal'));
    const loadingEl = document.getElementById('pdfPreviewLoading');
    const contentEl = document.getElementById('pdfPreviewContent');
    
    // Show loading, hide content
    showLoadingSpinner();
    if (contentEl) {
        contentEl.style.display = 'none';
        contentEl.innerHTML = '';
    }
    
    // Don't show modal - we'll load content invisibly
    // modal.show();
    
    // Set up cleanup handlers to prevent CSS bleeding and fix loading text issue
    const handleModalHidden = function() {
        if (contentEl) contentEl.innerHTML = '';
        if (loadingEl) loadingEl.style.display = 'none';
        // Remove any dynamically injected styles
        const dynamicStyles = document.querySelectorAll('style[data-modal-injected]');
        dynamicStyles.forEach(style => style.remove());
        // Reset any table styles that might have been affected
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            table.style.border = '';
            table.style.borderCollapse = '';
        });
    };
    
    // Remove existing listener first to prevent duplicates
    document.getElementById('pdfPreviewModal').removeEventListener('hidden.bs.modal', handleModalHidden);
    // Add cleanup listener
    document.getElementById('pdfPreviewModal').addEventListener('hidden.bs.modal', handleModalHidden);
    
    // Load form content
    fetch(`/signatory/enrollment/print/${enrollmentId}/`)
        .then(response => response.text())
        .then(html => {
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from server');
            }
            
            // Ensure loading is properly hidden and content is shown
            hideLoadingSpinner();
            contentEl.innerHTML = `<div class="pdf-modal-content">${html}</div>`;
            contentEl.style.display = 'block';
            
            // Auto-trigger print after content loads
            setTimeout(function() {
                printPreviewContent();
            }, 500);
        })
        .catch(error => {
            console.error('Error loading form:', error);
            
            // Hide loading and show error
            hideLoadingSpinner();
            contentEl.innerHTML = `<div class="alert alert-danger m-3">Failed to load form preview. Please try again.</div>`;
            contentEl.style.display = 'block';
        });
}

function editEnrollment(enrollmentId) {
    currentEnrollmentId = enrollmentId;
    currentAction = 'approve'; // This will be treated as editing disapproved to approved
    openOtpSidebar();
    
    // Change the button text to indicate this is an edit
    const approveBtn = document.getElementById("signatory_enrollment_verifyOtpBtn");
    if (approveBtn) {
        approveBtn.textContent = "UPDATE TO APPROVED";
        approveBtn.classList.remove("btn-dark");
        approveBtn.classList.add("btn-success");
    }
    
    // Update header to indicate editing
    const header = document.getElementById("signatory_enrollment_approve_title");
    if (header) {
        header.textContent = "EDIT STATUS - APPROVAL PIN";
    }
    
    // Add note about editing
    const noteElement = document.createElement('p');
    noteElement.className = 'text-info small mb-3';
    noteElement.id = 'edit-status-note';
    noteElement.textContent = 'Changing disapproved status back to approved. Please enter your PIN to confirm.';
    
    const bodyElement = document.querySelector('.signatory_enrollment_otp-body');
    const firstP = bodyElement.querySelector('p');
    if (firstP && !document.getElementById('edit-status-note')) {
        bodyElement.insertBefore(noteElement, firstP);
    }
}

function printEnrollment(enrollmentId) {
    console.log('printEnrollment called with ID:', enrollmentId);
    if (!enrollmentId) {
        showAlert('No enrollment ID provided', 'warning');
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('pdfPreviewModal'));
    const loadingEl = document.getElementById('pdfPreviewLoading');
    const contentEl = document.getElementById('pdfPreviewContent');
    
    // Show loading, hide content
    showLoadingSpinner();
    if (contentEl) {
        contentEl.style.display = 'none';
        contentEl.innerHTML = '';
    }
    
    // Don't show modal - we'll load content invisibly
    // modal.show();
    
    // Set up cleanup handlers to prevent CSS bleeding
    const handleModalHidden = function() {
        if (contentEl) contentEl.innerHTML = '';
        // Remove any dynamically injected styles
        const dynamicStyles = document.querySelectorAll('style[data-modal-injected]');
        dynamicStyles.forEach(style => style.remove());
        // Reset any table styles that might have been affected
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            table.style.border = '';
            table.style.borderCollapse = '';
        });
    };
    
    // Remove existing listener first to prevent duplicates
    document.getElementById('pdfPreviewModal').removeEventListener('hidden.bs.modal', handleModalHidden);
    // Add cleanup listener
    document.getElementById('pdfPreviewModal').addEventListener('hidden.bs.modal', handleModalHidden);
    
    // Load form content
    fetch(`/signatory/enrollment/print/${enrollmentId}/`)
        .then(response => response.text())
        .then(html => {
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from server');
            }
            
            // Hide loading and show content
            hideLoadingSpinner();
            contentEl.innerHTML = `<div class="pdf-modal-content">${html}</div>`;
            contentEl.style.display = 'block';
            
            // Auto-trigger print after content loads
            setTimeout(function() {
                printPreviewContent();
            }, 500);
        })
        .catch(error => {
            console.error('Error loading form:', error);
            
            // Hide loading and show error
            hideLoadingSpinner();
            contentEl.innerHTML = `<div class="alert alert-danger m-3">Failed to load form preview. Please try again.</div>`;
            contentEl.style.display = 'block';
        });
}



function bulkPrint() {
    const selectedIds = getSelectedEnrollmentIds();
    if (selectedIds.length === 0) {
        showError('Please select at least one enrollment form');
        return;
    }

    console.log('bulkPrint called with IDs:', selectedIds);
    const modal = new bootstrap.Modal(document.getElementById('pdfPreviewModal'));
    const loadingEl = document.getElementById('pdfPreviewLoading');
    const contentEl = document.getElementById('pdfPreviewContent');
    
    // Show loading, hide content
    showLoadingSpinner();
    if (contentEl) {
        contentEl.style.display = 'none';
        contentEl.innerHTML = '';
    }
    
    // Don't show modal - we'll load content invisibly
    // modal.show();
    
    // Set up cleanup handlers to prevent CSS bleeding
    const handleModalHidden = function() {
        if (contentEl) contentEl.innerHTML = '';
        // Remove any dynamically injected styles
        const dynamicStyles = document.querySelectorAll('style[data-modal-injected]');
        dynamicStyles.forEach(style => style.remove());
        // Reset any table styles that might have been affected
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            table.style.border = '';
            table.style.borderCollapse = '';
        });
    };
    
    // Remove existing listener first to prevent duplicates
    document.getElementById('pdfPreviewModal').removeEventListener('hidden.bs.modal', handleModalHidden);
    // Add cleanup listener
    document.getElementById('pdfPreviewModal').addEventListener('hidden.bs.modal', handleModalHidden);
    
    // Load all selected forms using individual endpoints and combine them
    console.log('Bulk print called with IDs:', selectedIds);
    
    const fetchPromises = selectedIds.map(id => 
        fetch(`/signatory/enrollment/print/${id}/`)
            .then(response => response.text())
            .then(html => {
                if (html && html.trim().length > 0) {
                    // Wrap each form in a container with page break
                    return `<div class="enrollment-form" style="page-break-after: always; page-break-inside: avoid;">${html}</div>`;
                }
                return '';
            })
            .catch(error => {
                console.error(`Error loading enrollment ${id}:`, error);
                return '';
            })
    );
    
    Promise.all(fetchPromises).then(htmlArray => {
        const combinedHtml = htmlArray.filter(html => html).join('');
        
        if (!combinedHtml) {
            throw new Error('No valid forms received from server');
        }
        
        // Hide loading and show content
        hideLoadingSpinner();
        contentEl.innerHTML = `<div class="pdf-modal-content">${combinedHtml}</div>`;
        contentEl.style.display = 'block';
        
        // Auto-trigger print after content loads
        setTimeout(function() {
            printPreviewContent();
        }, 500);
        
        // Update modal title to reflect bulk operation
        const modalTitle = document.getElementById('pdfPreviewModalLabel');
        if (modalTitle && selectedIds.length > 1) {
            modalTitle.innerHTML = `<i class="bi bi-file-pdf me-2"></i>Enrollment Forms Preview (${selectedIds.length} selected)`;
        }
    }).catch(error => {
        console.error('Error in bulk print:', error);
        hideLoadingSpinner();
        contentEl.innerHTML = `
            <div class="alert alert-danger m-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Error loading enrollment forms for printing. Please try again.
                <br><small class="text-muted">Error: ${error.message}</small>
            </div>
        `;
        contentEl.style.display = 'block';
    });
}

function getSelectedEnrollmentIds() {
    const checkboxes = document.querySelectorAll('.enrollment-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.value);
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('signatory_enrollment_select_all');
    const checkboxes = document.querySelectorAll('.enrollment-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkActionsVisibility();
}

function updateBulkActionsVisibility() {
    const checkedBoxes = document.querySelectorAll('.enrollment-checkbox:checked');
    const bulkActions = document.getElementById('signatory_enrollment_bulk_actions');
    const selectedCount = document.getElementById('signatory_enrollment_selected_count');

    console.log("Checkboxes selected:", checkedBoxes.length);

    if (checkedBoxes.length > 0) {
        if (bulkActions) {
            bulkActions.style.display = 'flex'; // Use flex to match d-flex class
            bulkActions.style.visibility = 'visible';
        }
        if (selectedCount) selectedCount.textContent = `${checkedBoxes.length} selected`;
        console.log("🔵 Showing bulk actions");
    } else {
        if (bulkActions) {
            bulkActions.style.display = 'none';
            bulkActions.style.visibility = 'hidden';
            // Force override any CSS classes
            bulkActions.style.setProperty('display', 'none', 'important');
        }
        console.log("🟡 Hiding bulk actions");
    }
}

function resetFilters() {
    document.getElementById('signatory_enrollment_filter_course').selectedIndex = 0;
    document.getElementById('signatory_enrollment_filter_year').selectedIndex = 0;
    document.getElementById('signatory_enrollment_filter_section').selectedIndex = 0;
    document.getElementById('signatory_enrollment_filter_status').selectedIndex = 0;
    document.getElementById('signatory_enrollment_search_input').value = '';

    // Uncheck checkboxes
    document.getElementById('signatory_enrollment_select_all').checked = false;
    document.querySelectorAll('.enrollment-checkbox').forEach(cb => cb.checked = false);

    updateBulkActionsVisibility(); // 💡 important
    loadEnrollmentData(); // ✅ reload with clean filters
}

// Sidebar functions
function openOtpSidebar() {
    // Close any open sidebars first
    closeAllSidebars();
    
    document.getElementById('signatory_enrollment_otpSidebar').style.right = '0';
    document.getElementById('signatory_enrollment_otpinput').focus();
}

function closeOtpSidebar() {
    document.getElementById('signatory_enrollment_otpSidebar').style.right = '-400px';
    document.getElementById('signatory_enrollment_otpinput').value = '';
    document.getElementById('signatory_enrollment_otpComment').value = '';
    document.getElementById('signatory_enrollment_otpError').style.display = 'none';
    
    // Reset UI elements that may have been modified during edit operation
    const approveBtn = document.getElementById("signatory_enrollment_verifyOtpBtn");
    if (approveBtn) {
        approveBtn.textContent = "APPROVE";
        approveBtn.classList.remove("btn-success");
        approveBtn.classList.add("btn-dark");
    }
    
    // Reset header
    const header = document.getElementById("signatory_enrollment_approve_title");
    if (header) {
        header.textContent = "APPROVAL PIN";
    }
    
    // Remove edit note if it exists
    const editNote = document.getElementById('edit-status-note');
    if (editNote) {
        editNote.remove();
    }
}

function openDisapproveSidebar() {
    // Close any open sidebars first
    closeAllSidebars();
    
    document.getElementById('signatory_enrollment_disapproveSidebar').style.right = '0';
    document.getElementById('signatory_enrollment_disapprove_pin_input').focus();
}

function closeDisapproveSidebar() {
    document.getElementById('signatory_enrollment_disapproveSidebar').style.right = '-400px';
    document.getElementById('signatory_enrollment_disapprove_pin_input').value = '';
    document.getElementById('signatory_enrollment_disapproveComment').value = '';
    document.getElementById('signatory_enrollment_appointmentDate').value = '';
    document.getElementById('signatory_enrollment_disapprove_pin_error').style.display = 'none';
    document.getElementById('signatory_enrollment_disapproveError').style.display = 'none';
    document.getElementById('signatory_enrollment_appointmentError').style.display = 'none';
    
    // Reset checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Hide reason step
    document.getElementById('signatory_enrollment_disapprove_reason_step').style.display = 'none';
    document.getElementById('signatory_enrollment_disapprove_pin_step').style.display = 'block';
}

function closeAllSidebars() {
    // Close OTP sidebar
    const otpSidebar = document.getElementById('signatory_enrollment_otpSidebar');
    if (otpSidebar) {
        otpSidebar.style.right = '-400px';
    }
    
    // Close disapprove sidebar
    const disapproveSidebar = document.getElementById('signatory_enrollment_disapproveSidebar');
    if (disapproveSidebar) {
        disapproveSidebar.style.right = '-400px';
    }
    
    // Don't reset form fields or global variables here since we're just switching between sidebars
    // Fields and variables will be reset when sidebar is actually closed or on cancel
}

function verifyPinForDisapproval() {
    const pin = document.getElementById('signatory_enrollment_disapprove_pin_input').value;
    
    if (!pin) {
        showDisapprovePinError('Please enter PIN');
        return;
    }
    
    // Verify PIN with server
    const formData = new FormData();
    formData.append('pin', pin);
    
    fetch('/signatory/clearance/verify-pin/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // PIN verified successfully, proceed to reason step
            document.getElementById('signatory_enrollment_disapprove_pin_step').style.display = 'none';
            document.getElementById('signatory_enrollment_disapprove_reason_step').style.display = 'block';
            
            // Clear any previous PIN error
            document.getElementById('signatory_enrollment_disapprove_pin_error').style.display = 'none';
        } else {
            // PIN verification failed
            showDisapprovePinError(data.error || 'Invalid PIN');
        }
    })
    .catch(error => {
        console.error('Error verifying PIN:', error);
        showDisapprovePinError('Error verifying PIN');
    });
}

function toggleOtherReasonInput() {
    const otherCheckbox = document.getElementById('signatory_enrollment_reasonOther');
    const otherContainer = document.getElementById('signatory_enrollment_otherReasonContainer');
    
    if (otherCheckbox.checked) {
        otherContainer.style.display = 'block';
    } else {
        otherContainer.style.display = 'none';
        document.getElementById('signatory_enrollment_otherReasonInput').value = '';
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'danger');
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

function showOtpError(message) {
    const errorElement = document.getElementById('signatory_enrollment_otpError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function showDisapproveError(message) {
    const errorElement = document.getElementById('signatory_enrollment_disapproveError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function showDisapprovePinError(message) {
    const errorElement = document.getElementById('signatory_enrollment_disapprove_pin_error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Bulk Operations
function bulkApproveEnrollment() {
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
        // Check dean status (Academic Dean handles enrollment forms)
        const statusText = enrollment.dean_status || 'pending';
        
        if (statusText === 'approved') {
            alreadyApproved.push(enrollment.student_name);
        } else if (statusText === 'disapproved') {
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
    currentAction = 'bulk_approve';
    currentApproveId = actionableIds; // Store array of IDs
    
    // Update sidebar title
    const approveTitle = document.getElementById('signatory_enrollment_approve_title');
    if (approveTitle) {
        approveTitle.textContent = `BULK APPROVAL PIN (${actionableIds.length} items)`;
    }
    
    resetApprovalSidebar();
    openOtpSidebar();
}

function bulkDisapproveEnrollment() {
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
        // Check dean status (Academic Dean handles enrollment forms)
        const statusText = enrollment.dean_status || 'pending';
        
        if (statusText === 'approved') {
            alreadyApproved.push(enrollment.student_name);
        } else if (statusText === 'disapproved') {
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
        message = `${actionableIds.length} enrollment(s) will be disapproved. ${skippedMessages.join('; ')}`;
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

    // Set up bulk disapproval
    currentAction = 'bulk_disapprove';
    currentApproveId = actionableIds; // Store array of IDs
    
    // Update sidebar title
    const disapproveTitle = document.getElementById('signatory_enrollment_disapprove_title');
    if (disapproveTitle) {
        disapproveTitle.textContent = `BULK DISAPPROVE REASON (${actionableIds.length} items)`;
    }
    
    resetDisapprovalSidebar();
    openDisapproveSidebar();
}

function resetApprovalSidebar() {
    document.getElementById('signatory_enrollment_otpinput').value = '';
    document.getElementById('signatory_enrollment_otpComment').value = '';
    document.getElementById('signatory_enrollment_otpError').style.display = 'none';
}

function resetDisapprovalSidebar() {
    document.getElementById('signatory_enrollment_disapprove_pin_input').value = '';
    document.getElementById('signatory_enrollment_disapproveComment').value = '';
    document.getElementById('signatory_enrollment_appointmentDate').value = '';
    document.getElementById('signatory_enrollment_disapprove_pin_error').style.display = 'none';
    document.getElementById('signatory_enrollment_disapproveError').style.display = 'none';
    
    // Reset all checkboxes
    document.querySelectorAll('input[type="checkbox"][id^="signatory_enrollment_reason"]').forEach(cb => {
        cb.checked = false;
    });
}

// Helper function to properly hide loading spinner
function hideLoadingSpinner() {
    const loadingEl = document.getElementById('pdfPreviewLoading');
    if (loadingEl) {
        loadingEl.style.display = 'none !important';
        loadingEl.style.visibility = 'hidden';
        loadingEl.classList.add('d-none');
        loadingEl.classList.remove('d-flex');
        // Force hide with inline style override
        loadingEl.setAttribute('style', 'display: none !important; visibility: hidden;');
    }
}

// Helper function to show loading spinner
function showLoadingSpinner() {
    const loadingEl = document.getElementById('pdfPreviewLoading');
    if (loadingEl) {
        loadingEl.style.display = 'flex';
        loadingEl.style.visibility = 'visible';
        loadingEl.classList.remove('d-none');
        loadingEl.classList.add('d-flex');
        loadingEl.removeAttribute('style');
    }
}

// Print function for modal content
function printPreviewContent() {
    const contentEl = document.getElementById('pdfPreviewContent');
    
    if (!contentEl || !contentEl.innerHTML.trim()) {
        showAlert('No content to print. Please wait for preview to load.', 'warning');
        return;
    }
    
    // Create iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);
    
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
                showAlert('Unable to print. Please try again.', 'error');
                if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                }
                location.reload();
            }
        }, 500);
    };
    
    // Write content to iframe
    iframe.contentDocument.open();
    iframe.contentDocument.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Enrollment Form</title>
            <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            ${contentEl.innerHTML}
        </body>
        </html>
    `);
    iframe.contentDocument.close();
}
function toggleSidebar() {
    const signatory_sidebar = document.getElementById("signatory_sidebar");
    const signatory_sidebar_backdrop = document.getElementById("signatory_sidebar_sidebarBackdrop");
  
    if (window.innerWidth <= 768) {
      signatory_sidebar.classList.remove("collapsed");
      signatory_sidebar.classList.toggle("show");
      signatory_sidebar_backdrop.classList.toggle("active");
    } else {
      signatory_sidebar.classList.toggle("collapsed");
    }
  }
  
  // Window resize handler
  window.addEventListener("resize", function () {
    const signatory_sidebar = document.getElementById("signatory_sidebar");
    const signatory_sidebar_backdrop = document.getElementById("signatory_sidebar_sidebarBackdrop");
    if (window.innerWidth > 768) {
      signatory_sidebar.classList.remove("show");
      signatory_sidebar_backdrop.classList.remove("active");
    }
  });
  
  