// Signatory Graduation JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing Graduation Page');
    
    // Set current date
    const today = new Date();
    const dateElement = document.getElementById('signatory_graduation_dateToday');
    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Load initial data
    loadGraduationData();
    updateBulkActionsVisibility();
    loadFilterOptions();
    
    // Add event listeners
    setupEventListeners();
});

let currentGraduationId = null;
let currentAction = null;
let filteredData = [];
let currentApproveId = null;

function setupEventListeners() {
    // Filter change events
    document.getElementById('signatory_graduation_filter_course').addEventListener('change', loadGraduationData);
    document.getElementById('signatory_graduation_filter_year').addEventListener('change', loadGraduationData);
    document.getElementById('signatory_graduation_filter_section').addEventListener('change', loadGraduationData);
    document.getElementById('signatory_graduation_filter_status').addEventListener('change', loadGraduationData);
    
    // Search input
    document.getElementById('signatory_graduation_search_input').addEventListener('input', debounce(loadGraduationData, 500));
    
    // Reset filter
    document.getElementById('signatory_graduation_reset_filter').addEventListener('click', resetFilters);
    
    // Select all checkbox
    document.getElementById('signatory_graduation_select_all').addEventListener('change', toggleSelectAll);
    
    // Bulk actions
    document.getElementById('signatory_graduation_bulk_print').addEventListener('click', bulkPrint);
    document.getElementById('signatory_graduation_bulk_approve').addEventListener('click', bulkApproveGraduation);
    document.getElementById('signatory_graduation_bulk_disapprove').addEventListener('click', bulkDisapproveGraduation);
    
    // PIN verification
    document.getElementById('signatory_graduation_verifyOtpBtn').addEventListener('click', verifyAndApprove);
    document.getElementById('signatory_graduation_disapprove_pin_submit_btn').addEventListener('click', verifyPinForDisapproval);
    document.getElementById('signatory_graduation_submit_Appointment_Disapproval_Btn').addEventListener('click', submitDisapproval);
}

function loadGraduationData() {
    console.log('Loading graduation data...');
    const filters = getFilterParams();
    console.log('Filter params:', filters);
    
    fetch(`/signatory/graduation/api/data/?${new URLSearchParams(filters)}`)
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            if (data.success) {
                console.log('Graduation data loaded successfully:', data.graduation_data);
                updateGraduationTable(data.graduation_data);
            } else {
                console.error('Failed to load graduation data:', data.error);
                showError('Failed to load graduation data');
            }
        })
        .catch(error => {
            console.error('Error loading graduation data:', error);
            showError('Error loading graduation data');
        });
}

function loadFilterOptions() {
    fetch('/signatory/graduation/filter-options/')
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
    const courseSelect = document.getElementById('signatory_graduation_filter_course');
    courseSelect.innerHTML = '<option selected disabled>Filter by Course</option>';
    data.courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseSelect.appendChild(option);
    });
    
    // Populate year filter
    const yearSelect = document.getElementById('signatory_graduation_filter_year');
    yearSelect.innerHTML = '<option selected disabled>Filter by Year</option>';
    data.years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    
    // Populate section filter
    const sectionSelect = document.getElementById('signatory_graduation_filter_section');
    sectionSelect.innerHTML = '<option selected disabled>Filter by Section</option>';
    data.sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = section;
        sectionSelect.appendChild(option);
    });
}

function getFilterParams() {
    const course = document.getElementById('signatory_graduation_filter_course').value;
    const year = document.getElementById('signatory_graduation_filter_year').value;
    const section = document.getElementById('signatory_graduation_filter_section').value;
    const status = document.getElementById('signatory_graduation_filter_status').value;
    const search = document.getElementById('signatory_graduation_search_input').value;
    
    return {
        course: course || '',
        year: year || '',
        section: section || '',
        status: status || '',
        search: search || ''
    };
}

function updateGraduationTable(graduations) {
    filteredData = graduations; // Store data for bulk operations
    const tableBody = document.getElementById('signatory_graduation_table_body');
    const bulkActions = document.getElementById('signatory_graduation_bulk_actions');
    const selectAllCheckbox = document.getElementById('signatory_graduation_select_all');

    // Reset table
    tableBody.innerHTML = '';

    // Clear select-all and hide bulk buttons first
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    if (bulkActions) bulkActions.style.display = 'none';

    if (graduations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="16" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    No graduation forms found
                </td>
            </tr>
        `;
        return;
    }

    graduations.forEach(graduation => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="graduation-checkbox" value="${graduation.id}" 
                       onchange="updateBulkActionsVisibility()">
            </td>
            <td>${graduation.student_name}</td>
            <td>${graduation.course}</td>
            <td>${graduation.year}</td>
            <td>${graduation.section}</td>
            <td>${graduation.student_number}</td>
            <td><div class="small text-muted">${graduation.grad_appno || 'N/A'}</div></td>
            <td>${graduation.date_submitted}</td>
            <td>
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="previewGraduationPDF('${graduation.id}')">
                    <i class="bi bi-file-pdf"></i> View Form
                </button>
            </td>
            <td>
                <div class="small text-muted">${graduation.user_role === 'dean' ? getPresidentActionButtons(graduation.id, graduation.user_status, graduation.user_timestamp) : getSignatoryStatus(graduation.dean_status, graduation.dean_timestamp)}</div>
            </td>
            <td>
                <div class="small text-muted">${getSignatoryStatus(graduation.business_status, graduation.business_timestamp)}</div>
            </td>
            <td>
                <div class="small text-muted">${getSignatoryStatus(graduation.registrar_status, graduation.registrar_timestamp)}</div>
            </td>
            <td>
                <div class="small text-muted">${graduation.user_role === 'president' ? getPresidentActionButtons(graduation.id, graduation.user_status, graduation.user_timestamp) : getSignatoryStatus(graduation.president_status, graduation.president_timestamp)}</div>
            </td>
            <td>
                <div class="small text-muted">${getOverallStatusBadge(graduation)}</div>
            </td>
            <td>
                <div class="signatory_graduation_table-icons">
                    <i class="bi bi-printer table-icon-print" onclick="previewGraduationPDF('${graduation.id}')" title="Print"></i>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    attachActionButtonListeners();
}

function attachActionButtonListeners() {
    const buttons = document.querySelectorAll(".president-graduation-action-btn");
    
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            
            if (action === 'Approved') {
                showApproveSidebar(id);
            } else if (action === 'Disapproved') {
                showDisapproveSidebar(id);
            }
        });
    });
    
    // Add event listeners for edit buttons
    const editButtons = document.querySelectorAll(".graduation-edit-btn");
    
    editButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            editGraduation(id);
        });
    });
}

function getPresidentActionButtons(graduationId, presidentStatus, presidentTimestamp) {
    if (presidentStatus && presidentStatus !== 'pending') {
        if (presidentStatus === 'approved') {
            return `<span class="text-success"><i class="bi bi-check-circle"></i> Approved</span><br><small>${presidentTimestamp || ''}</small>`;
        } else if (presidentStatus === 'disapproved') {
            return `
                <span class="text-danger fw-bold"><i class="bi bi-x-circle"></i> Disapproved</span><br><small>${presidentTimestamp || ''}</small>
                <button type="button" class="btn btn-warning btn-sm mt-1 graduation-edit-btn" data-id="${graduationId}">
                    <i class="bi bi-pencil"></i> Edit
                </button>
            `;
        }
    }
    
    return `
        <div class="d-flex flex-column gap-1">
            <button type="button" class="btn btn-success btn-sm president-graduation-action-btn" data-action="Approved" data-id="${graduationId}">Approve</button>
            <button type="button" class="btn btn-danger btn-sm president-graduation-action-btn" data-action="Disapproved" data-id="${graduationId}">Disapprove</button>
        </div>
    `;
}

function getSignatoryStatus(status, timestamp) {
    if (!status || status === 'pending') {
        return `<span class="text-warning"><i class="bi bi-clock"></i> Pending</span>`;
    } else if (status === 'approved') {
        return `<span class="text-success"><i class="bi bi-check-circle"></i> Approved</span><br><small>${timestamp || ''}</small>`;
    } else if (status === 'disapproved') {
        return `<span class="text-danger"><i class="bi bi-x-circle"></i> Disapproved</span><br><small>${timestamp || ''}</small>`;
    } else {
        return `<span class="text-secondary"><i class="bi bi-question-circle"></i> Unknown</span>`;
    }
}

function getOverallStatusBadge(graduation) {
    if (graduation.overall_status === 'completed') {
        return '<span class="badge bg-success">Completed</span>';
    } else {
        return '<span class="badge bg-warning">Pending</span>';
    }
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

function approveGraduation(graduationId) {
    currentGraduationId = graduationId;
    currentAction = 'approve';
    openOtpSidebar();
}

function disapproveGraduation(graduationId) {
    currentGraduationId = graduationId;
    currentAction = 'disapprove';
    openDisapproveSidebar();
}

function editGraduation(graduationId) {
    currentGraduationId = graduationId;
    currentAction = 'approve'; // This will be treated as editing disapproved to approved
    openOtpSidebar();
    
    // Change the button text to indicate this is an edit
    const approveBtn = document.getElementById("signatory_graduation_verifyOtpBtn");
    if (approveBtn) {
        approveBtn.textContent = "UPDATE TO APPROVED";
        approveBtn.classList.remove("btn-dark");
        approveBtn.classList.add("btn-success");
    }
    
    // Update header to indicate editing
    const header = document.getElementById("signatory_graduation_approve_title");
    if (header) {
        header.textContent = "EDIT STATUS - APPROVAL PIN";
    }
    
    // Add note about editing
    const noteElement = document.createElement('p');
    noteElement.className = 'text-info small mb-3';
    noteElement.id = 'edit-status-note';
    noteElement.textContent = 'Changing disapproved status back to approved. Please enter your PIN to confirm.';
    
    const bodyElement = document.querySelector('.signatory_graduation_otp-body');
    const firstP = bodyElement.querySelector('p');
    if (firstP && !document.getElementById('edit-status-note')) {
        bodyElement.insertBefore(noteElement, firstP);
    }
}

function printGraduation(graduationId) {
    window.open(`/signatory/graduation/print/${graduationId}/`, '_blank');
}

function previewGraduationPDF(graduationId) {
    console.log('previewGraduationPDF called with ID:', graduationId);
    if (!graduationId) {
        alert('No graduation ID provided');
        return;
    }

    // Use the dedicated graduation form modal
    const modal = new bootstrap.Modal(document.getElementById('graduationFormModal'));
    const loadingEl = document.getElementById('pdfPreviewLoading');
    const contentEl = document.getElementById('pdfPreviewContent');
    
    console.log('Modal elements found:', {
        modal: !!modal,
        loadingEl: !!loadingEl,
        contentEl: !!contentEl
    });
    
    if (!loadingEl || !contentEl) {
        console.error('Modal loading or content elements not found');
        alert('Modal configuration error');
        return;
    }
    
    // Show loading state - same as bulk printing
    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';
    contentEl.innerHTML = '';
    
    // Update modal title
    const titleEl = document.getElementById('graduationFormModalLabel');
    if (titleEl) {
        titleEl.innerHTML = `<i class="bi bi-file-pdf me-2"></i>Graduation Form Preview`;
    }
    
    // Add modal close handler to restore screen
    const modalElement = document.getElementById('graduationFormModal');
    const handleModalHidden = function() {
        // Reset loading state for next use
        loadingEl.style.display = 'flex';
        loadingEl.style.visibility = 'visible';
        loadingEl.style.minHeight = 'auto';
        loadingEl.style.height = 'auto';
        loadingEl.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span class="ms-2">Loading form preview...</span>
        `;
        contentEl.style.display = 'none';
        contentEl.innerHTML = '';
        // Hide print button
        const printBtn = document.getElementById('printGraduationBtn');
        if (printBtn) {
            printBtn.style.display = 'none';
            printBtn.onclick = null;
        }
        modalElement.removeEventListener('hidden.bs.modal', handleModalHidden);
    };
    modalElement.addEventListener('hidden.bs.modal', handleModalHidden);
    
    // Don't show modal - we'll load content invisibly
    // modal.show();
    
    // Load form content - using same URL pattern as working bulk printing
    const url = `/signatory/graduation/bulk-print/?ids=${graduationId}`;
    console.log('Starting fetch request to:', url);
    fetch(url)
        .then(response => {
            console.log('Fetch response received:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            console.log('HTML response received, length:', html ? html.length : 0);
            console.log('HTML preview (first 200 chars):', html ? html.substring(0, 200) : 'NO HTML');
            
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from server');
            }
            
            console.log('Setting content to individual modal...');
            
            // Use same method as bulk printing - direct HTML injection
            loadingEl.style.display = 'none';
            loadingEl.style.visibility = 'hidden';
            loadingEl.style.minHeight = '0';
            loadingEl.style.height = '0';
            loadingEl.innerHTML = ''; // Clear loading text
            contentEl.innerHTML = html;
            contentEl.style.display = 'block';
            
            console.log('Content set successfully, contentEl display:', contentEl.style.display);
            
            // Auto-trigger print after content loads
            setTimeout(function() {
                createPrintIframe(html);
            }, 500);
            
            // Show print button
            const printBtn = document.getElementById('printGraduationBtn');
            if (printBtn) {
                printBtn.style.display = 'inline-block';
                printBtn.onclick = function() {
                    createPrintIframe(html);
                };
            }
        })
        .catch(error => {
            console.error('Error loading graduation form:', error);
            loadingEl.style.display = 'none';
            loadingEl.style.visibility = 'hidden';
            loadingEl.style.minHeight = '0';
            loadingEl.style.height = '0';
            loadingEl.innerHTML = ''; // Clear loading text
            contentEl.innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error loading graduation form. Please try again.
                    <br><small class="text-muted">Error: ${error.message}</small>
                </div>
            `;
            contentEl.style.display = 'block';
            
            // Hide print button on error
            const printBtn = document.getElementById('printGraduationBtn');
            if (printBtn) {
                printBtn.style.display = 'none';
            }
        });
}

function toggleSelectAll() {
    const selectAll = document.getElementById('signatory_graduation_select_all');
    const checkboxes = document.querySelectorAll('.graduation-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateBulkActionsVisibility();
}

function updateBulkActionsVisibility() {
    const selectedCheckboxes = document.querySelectorAll('.graduation-checkbox:checked');
    const bulkActions = document.getElementById('signatory_graduation_bulk_actions');
    const selectedCount = document.getElementById('signatory_graduation_selected_count');

    console.log(`Found ${selectedCheckboxes.length} selected checkboxes`);
    console.log('Bulk actions element:', bulkActions);

    if (selectedCheckboxes.length > 0) {
        console.log('Showing bulk actions');
        bulkActions.style.display = 'block';
        bulkActions.style.visibility = 'visible';
        if (selectedCount) {
            selectedCount.textContent = `${selectedCheckboxes.length} selected`;
        }
    } else {
        console.log('Hiding bulk actions');
        if (bulkActions) {
            bulkActions.style.display = 'none';
        }
        if (selectedCount) {
            selectedCount.textContent = '0 selected';
        }
    }
}

function resetFilters() {
    document.getElementById('signatory_graduation_filter_course').selectedIndex = 0;
    document.getElementById('signatory_graduation_filter_year').selectedIndex = 0;
    document.getElementById('signatory_graduation_filter_section').selectedIndex = 0;
    document.getElementById('signatory_graduation_filter_status').selectedIndex = 0;
    document.getElementById('signatory_graduation_search_input').value = '';

    // Uncheck checkboxes
    document.getElementById('signatory_graduation_select_all').checked = false;
    document.querySelectorAll('.graduation-checkbox').forEach(cb => cb.checked = false);

    updateBulkActionsVisibility(); // 💡 important
    loadGraduationData(); // ✅ reload with clean filters
}

// Sidebar functions
function openOtpSidebar() {
    // Close any open sidebars first
    closeAllSidebars();
    
    document.getElementById('signatory_graduation_otpSidebar').style.right = '0';
    document.getElementById('signatory_graduation_otpinput').focus();
}

function closeOtpSidebar() {
    document.getElementById('signatory_graduation_otpSidebar').style.right = '-400px';
    document.getElementById('signatory_graduation_otpinput').value = '';
    document.getElementById('signatory_graduation_otpComment').value = '';
    document.getElementById('signatory_graduation_otpError').style.display = 'none';
    
    // Reset UI elements that may have been modified during edit operation
    const approveBtn = document.getElementById("signatory_graduation_verifyOtpBtn");
    if (approveBtn) {
        approveBtn.textContent = "APPROVE";
        approveBtn.classList.remove("btn-success");
        approveBtn.classList.add("btn-dark");
    }
    
    // Reset header
    const header = document.getElementById("signatory_graduation_approve_title");
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
    
    document.getElementById('signatory_graduation_disapproveSidebar').style.right = '0';
    document.getElementById('signatory_graduation_disapprove_pin_input').focus();
}

function closeDisapproveSidebar() {
    document.getElementById('signatory_graduation_disapproveSidebar').style.right = '-400px';
    document.getElementById('signatory_graduation_disapprove_pin_input').value = '';
    document.getElementById('signatory_graduation_disapproveComment').value = '';
    document.getElementById('signatory_graduation_disapprove_pin_error').style.display = 'none';
    document.getElementById('signatory_graduation_disapproveError').style.display = 'none';
    
    // Reset PIN step and hide reason step
    document.getElementById('signatory_graduation_disapprove_pin_step').style.display = 'block';
    document.getElementById('signatory_graduation_disapprove_reason_step').style.display = 'none';
    
    // Reset all checkboxes
    document.querySelectorAll('input[type="checkbox"][id^="signatory_graduation_reason"]').forEach(cb => {
        cb.checked = false;
    });
}

function closeAllSidebars() {
    const sidebars = ['signatory_graduation_otpSidebar', 'signatory_graduation_disapproveSidebar'];
    sidebars.forEach(sidebarId => {
        const sidebar = document.getElementById(sidebarId);
        if (sidebar) {
            sidebar.style.right = '-400px';
        }
    });
}

function verifyPinForDisapproval() {
    const pin = document.getElementById('signatory_graduation_disapprove_pin_input').value;
    
    if (!pin) {
        showDisapprovePinError('Please enter PIN');
        return;
    }
    
    // Verify PIN with server
    const formData = new FormData();
    formData.append('pin', pin);
    formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);
    
    fetch('/signatory/clearance/verify-pin/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // PIN verified successfully, proceed to reason step
            document.getElementById('signatory_graduation_disapprove_pin_step').style.display = 'none';
            document.getElementById('signatory_graduation_disapprove_reason_step').style.display = 'block';
            
            // Store the PIN for later use
            window.tempDisapprovalPin = pin;
            
            // Clear any previous error
            hideDisapprovePinError();
        } else {
            showDisapprovePinError(data.error || 'Invalid PIN');
        }
    })
    .catch(error => {
        console.error('Error verifying PIN:', error);
        showDisapprovePinError('Error verifying PIN');
    });
}

function toggleOtherReasonInput() {
    const otherCheckbox = document.getElementById('signatory_graduation_reasonOther');
    const otherContainer = document.getElementById('signatory_graduation_otherReasonContainer');
    
    if (otherCheckbox.checked) {
        otherContainer.style.display = 'block';
    } else {
        otherContainer.style.display = 'none';
        document.getElementById('signatory_graduation_otherReasonInput').value = '';
    }
}

function verifyAndApprove() {
    const pin = document.getElementById('signatory_graduation_otpinput').value;
    const comment = document.getElementById('signatory_graduation_otpComment').value;
    
    if (!pin) {
        showOtpError('Please enter PIN');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('signatory_graduation_verifyOtpBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    const formData = new FormData();
    
    // Check if this is bulk operation
    if (currentAction === 'bulk_approve' && Array.isArray(currentApproveId)) {
        // Bulk approval
        currentApproveId.forEach(id => formData.append('graduation_ids[]', id));
        formData.append('pin', pin);
        formData.append('comment', comment);
        
        fetch('/signatory/graduation/bulk-approve/', {
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
                    `${data.processed_count} graduation(s) approved successfully` :
                    'No graduations were processed';
                showSuccess(message);
                
                // Reset bulk operation state
                currentAction = null;
                currentApproveId = null;
                
                // Reset title
                const approveTitle = document.getElementById('signatory_graduation_approve_title');
                if (approveTitle) {
                    approveTitle.textContent = 'APPROVAL PIN';
                }
                
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadGraduationData();
                }, 1000);
            } else {
                showOtpError(data.error || 'Failed to approve graduations');
            }
        })
        .catch(error => {
            console.error('Error bulk approving graduations:', error);
            showOtpError('Error bulk approving graduations');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    } else {
        // Individual approval
        formData.append('graduation_id', currentGraduationId);
        formData.append('pin', pin);
        formData.append('comment', comment);
        
        fetch('/signatory/graduation/approve/', {
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
                showSuccess('Graduation approved successfully');
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadGraduationData();
                }, 1000);
            } else {
                showOtpError(data.error || 'Failed to approve graduation');
            }
        })
        .catch(error => {
            console.error('Error approving graduation:', error);
            showOtpError('Error approving graduation');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }
}

function submitDisapproval() {
    const reasons = getSelectedReasons();
    const comment = document.getElementById('signatory_graduation_disapproveComment').value;
    const appointmentDate = document.getElementById('signatory_graduation_appointmentDate').value;
    
    if (reasons.length === 0) {
        showDisapproveError('Please select at least one reason');
        return;
    }
    
    if (!appointmentDate) {
        showAppointmentError('Please select an appointment date');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('signatory_graduation_submit_Appointment_Disapproval_Btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    const formData = new FormData();
    
    // Check if this is bulk operation
    if (currentAction === 'bulk_disapprove' && Array.isArray(currentApproveId)) {
        // Bulk disapproval
        currentApproveId.forEach(id => formData.append('graduation_ids[]', id));
        formData.append('pin', window.tempDisapprovalPin || '');
        formData.append('comment', comment);
        formData.append('appointment_date', appointmentDate);
        reasons.forEach(reason => formData.append('reasons[]', reason));
        
        fetch('/signatory/graduation/bulk-disapprove/', {
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
                    `${data.processed_count} graduation(s) disapproved successfully` :
                    'No graduations were processed';
                showSuccess(message);
                
                // Reset bulk operation state
                currentAction = null;
                currentApproveId = null;
                
                // Reset title
                const disapproveTitle = document.getElementById('signatory_graduation_disapprove_title');
                if (disapproveTitle) {
                    disapproveTitle.textContent = 'DISAPPROVE REASON';
                }
                
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadGraduationData();
                }, 1000);
            } else {
                showDisapproveError(data.error || 'Failed to disapprove graduations');
            }
        })
        .catch(error => {
            console.error('Error bulk disapproving graduations:', error);
            showDisapproveError('Error bulk disapproving graduations');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    } else {
        // Individual disapproval
        formData.append('graduation_id', currentGraduationId);
        formData.append('pin', window.tempDisapprovalPin || '');
        formData.append('comment', comment);
        formData.append('appointment_date', appointmentDate);
        reasons.forEach(reason => formData.append('reasons[]', reason));
        
        fetch('/signatory/graduation/disapprove/', {
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
                showSuccess('Graduation disapproved successfully');
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadGraduationData();
                }, 1000);
            } else {
                showDisapproveError(data.error || 'Failed to disapprove graduation');
            }
        })
        .catch(error => {
            console.error('Error disapproving graduation:', error);
            showDisapproveError('Error disapproving graduation');
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
        if (checkbox.id.startsWith('signatory_graduation_reason')) {
            if (checkbox.id === 'signatory_graduation_reasonOther') {
                const otherInput = document.getElementById('signatory_graduation_otherReasonInput');
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

function bulkPrint() {
    const selectedIds = getSelectedGraduationIds();
    if (selectedIds.length === 0) {
        showError('Please select at least one graduation form');
        return;
    }

    // Show preview modal
    const modal = new bootstrap.Modal(document.getElementById('previewPrintModal'));
    const spinnerEl = document.getElementById('previewLoadingSpinner');
    const contentEl = document.getElementById('previewContent');
    
    // Show loading state
    spinnerEl.style.display = 'flex';
    contentEl.style.display = 'none';
    
    // Update modal title
    const titleEl = document.getElementById('previewPrintModalLabel');
    if (titleEl) {
        const title = selectedIds.length === 1 ? 
            'Preview & Print Graduation Form' : 
            `Preview & Print ${selectedIds.length} Graduation Forms`;
        titleEl.innerHTML = `<i class="bi bi-printer me-2"></i>${title}`;
    }
    
    // Add modal close handler to restore screen
    const modalElement = document.getElementById('previewPrintModal');
    const handleModalHidden = function() {
        // Reset loading state for next use
        spinnerEl.style.display = 'flex';
        spinnerEl.style.visibility = 'visible';
        spinnerEl.style.minHeight = '200px';
        spinnerEl.style.height = 'auto';
        spinnerEl.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading preview...</span>
            </div>
            <span class="ms-2">Loading preview...</span>
        `;
        contentEl.style.display = 'none';
        contentEl.innerHTML = '';
        // Hide print button
        const printBtn = document.getElementById('printPreviewBtn');
        if (printBtn) {
            printBtn.style.display = 'none';
            printBtn.onclick = null;
        }
        modalElement.removeEventListener('hidden.bs.modal', handleModalHidden);
    };
    modalElement.addEventListener('hidden.bs.modal', handleModalHidden);
    
    // Don't show modal - we'll load content invisibly
    // modal.show();
    
    // Fetch preview content
    const url = `/signatory/graduation/bulk-print/?ids=${selectedIds.join(',')}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from server');
            }
            
            // Completely hide loading spinner and show content
            spinnerEl.style.display = 'none';
            spinnerEl.style.visibility = 'hidden';
            spinnerEl.style.minHeight = '0';
            spinnerEl.style.height = '0';
            spinnerEl.innerHTML = ''; // Clear loading text
            contentEl.innerHTML = html;
            contentEl.style.display = 'block';
            
            // Auto-trigger print after content loads
            setTimeout(function() {
                createPrintIframe(contentEl.innerHTML);
            }, 500);
            
            // Setup print button
            const printBtn = document.getElementById('printPreviewBtn');
            if (printBtn) {
                printBtn.style.display = 'inline-block';
                printBtn.onclick = function() {
                    createPrintIframe(contentEl.innerHTML);
                };
            }
        })
        .catch(error => {
            console.error('Error loading bulk print preview:', error);
            spinnerEl.style.display = 'none';
            spinnerEl.style.visibility = 'hidden';
            spinnerEl.style.minHeight = '0';
            spinnerEl.style.height = '0';
            spinnerEl.innerHTML = ''; // Clear loading text
            contentEl.style.display = 'block';
            contentEl.innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error loading graduation forms for printing. Please try again.
                    <br><small class="text-muted">Error: ${error.message}</small>
                </div>
            `;
        });
}

function getSelectedGraduationIds() {
    const checkboxes = document.querySelectorAll('.graduation-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Bulk Operations
function bulkApproveGraduation() {
    const selectedCheckboxes = document.querySelectorAll('.graduation-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one graduation form to approve', 'warning');
        return;
    }

    // Get selected graduation data and filter actionable ones
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    const selectedGraduations = filteredData.filter(graduation => selectedIds.includes(graduation.id));
    
    let actionableIds = [];
    let alreadyApproved = [];
    let alreadyDisapproved = [];
    
    selectedGraduations.forEach(graduation => {
        // Check president status (President handles graduation forms)
        const statusText = graduation.president_status || 'pending';
        
        if (statusText === 'approved') {
            alreadyApproved.push(graduation.student_name);
        } else if (statusText === 'disapproved') {
            alreadyDisapproved.push(graduation.student_name);
        } else {
            actionableIds.push(graduation.id);
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
        message = `${actionableIds.length} graduation(s) will be approved. ${skippedMessages.join('; ')}`;
        showAlert(message, 'info');
    } else if (alreadyApproved.length > 0 || alreadyDisapproved.length > 0) {
        let allProcessedMessages = [];
        if (alreadyApproved.length > 0) {
            allProcessedMessages.push(`${alreadyApproved.length} already approved: ${alreadyApproved.join(', ')}`);
        }
        if (alreadyDisapproved.length > 0) {
            allProcessedMessages.push(`${alreadyDisapproved.length} already disapproved: ${alreadyDisapproved.join(', ')}`);
        }
        message = `All selected graduations are already processed - ${allProcessedMessages.join('; ')}`;
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
    const approveTitle = document.getElementById('signatory_graduation_approve_title');
    if (approveTitle) {
        approveTitle.textContent = `BULK APPROVAL PIN (${actionableIds.length} items)`;
    }
    
    resetApprovalSidebar();
    openOtpSidebar();
}

function bulkDisapproveGraduation() {
    const selectedCheckboxes = document.querySelectorAll('.graduation-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one graduation form to disapprove', 'warning');
        return;
    }

    // Get selected graduation data and filter actionable ones
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    const selectedGraduations = filteredData.filter(graduation => selectedIds.includes(graduation.id));
    
    let actionableIds = [];
    let alreadyApproved = [];
    let alreadyDisapproved = [];
    
    selectedGraduations.forEach(graduation => {
        // Check president status (President handles graduation forms)
        const statusText = graduation.president_status || 'pending';
        
        if (statusText === 'approved') {
            alreadyApproved.push(graduation.student_name);
        } else if (statusText === 'disapproved') {
            alreadyDisapproved.push(graduation.student_name);
        } else {
            actionableIds.push(graduation.id);
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
        message = `${actionableIds.length} graduation(s) will be disapproved. ${skippedMessages.join('; ')}`;
        showAlert(message, 'info');
    } else if (alreadyApproved.length > 0 || alreadyDisapproved.length > 0) {
        let allProcessedMessages = [];
        if (alreadyApproved.length > 0) {
            allProcessedMessages.push(`${alreadyApproved.length} already approved: ${alreadyApproved.join(', ')}`);
        }
        if (alreadyDisapproved.length > 0) {
            allProcessedMessages.push(`${alreadyDisapproved.length} already disapproved: ${alreadyDisapproved.join(', ')}`);
        }
        message = `All selected graduations are already processed - ${allProcessedMessages.join('; ')}`;
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
    const disapproveTitle = document.getElementById('signatory_graduation_disapprove_title');
    if (disapproveTitle) {
        disapproveTitle.textContent = `BULK DISAPPROVE REASON (${actionableIds.length} items)`;
    }
    
    resetDisapprovalSidebar();
    openDisapproveSidebar();
}

function resetApprovalSidebar() {
    document.getElementById('signatory_graduation_otpinput').value = '';
    document.getElementById('signatory_graduation_otpComment').value = '';
    document.getElementById('signatory_graduation_otpError').style.display = 'none';
    
    // Reset UI elements that may have been modified during edit operation
    const approveBtn = document.getElementById("signatory_graduation_verifyOtpBtn");
    if (approveBtn) {
        approveBtn.textContent = "APPROVE";
        approveBtn.classList.remove("btn-success");
        approveBtn.classList.add("btn-dark");
    }
    
    // Reset header
    const header = document.getElementById("signatory_graduation_approve_title");
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
    document.getElementById('signatory_graduation_disapprove_pin_input').value = '';
    document.getElementById('signatory_graduation_disapproveComment').value = '';
    document.getElementById('signatory_graduation_disapprove_pin_error').style.display = 'none';
    document.getElementById('signatory_graduation_disapproveError').style.display = 'none';
    
    // Reset all checkboxes
    document.querySelectorAll('input[type="checkbox"][id^="signatory_graduation_reason"]').forEach(cb => {
        cb.checked = false;
    });
}

// Sidebar show functions for button compatibility
function showApproveSidebar(graduationId) {
    currentGraduationId = graduationId;
    window.selectedGraduationId = graduationId;
    openOtpSidebar();
}

function showDisapproveSidebar(graduationId) {
    currentGraduationId = graduationId;
    window.selectedGraduationId = graduationId;
    openDisapproveSidebar();
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
    const errorElement = document.getElementById('signatory_graduation_otpError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function showDisapproveError(message) {
    const errorElement = document.getElementById('signatory_graduation_disapproveError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function showDisapprovePinError(message) {
    const errorElement = document.getElementById('signatory_graduation_disapprove_pin_error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideDisapprovePinError() {
    const errorElement = document.getElementById('signatory_graduation_disapprove_pin_error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function showAppointmentError(message) {
    const errorElement = document.getElementById('signatory_graduation_appointmentError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function createPrintIframe(htmlContent) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    
    document.body.appendChild(iframe);
    
    iframe.onload = function() {
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
                    iframe.parentNode.removeChild(iframe);
                }
                location.reload();
            }, 100);
        } catch (e) {
            console.error('Print error:', e);
            showError('Print failed. Please try again.');
            
            // Fallback: open in new window
            try {
                const printWindow = window.open('', '_blank', 'width=800,height=600');
                printWindow.document.open();
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => printWindow.print(), 500);
            } catch (fallbackError) {
                showError('Print functionality is not available.');
            }
            
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            location.reload();
        }
    };
    
    iframe.onerror = function() {
        console.error('Iframe load error');
        if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    };
    
    iframe.contentDocument.open();
    iframe.contentDocument.write(htmlContent);
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
  
  