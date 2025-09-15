// Global variables
let currentApproveId = null;
let currentDisapproveId = null;
let signatoryType = null;
let clearanceData = [];

// Initialize the page
  document.addEventListener("DOMContentLoaded", function () {
    initializePage();
    setupEventListeners();
    loadClearanceData();
});

function initializePage() {
    console.log('Initializing signatory clearance page');
    
    // Set current date
    const dateSpan = document.getElementById("signatory_clearance_dateToday");
    const today = new Date();
    const formatted = today.toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    dateSpan.textContent = formatted;
    
    // Ensure bulk actions are hidden on page load
    const bulkActions = document.getElementById('signatory_clearance_bulk_actions');
    console.log('Bulk actions element found:', !!bulkActions);
    if (bulkActions) {
        console.log('Current bulk actions display:', bulkActions.style.display);
        bulkActions.style.display = 'none';
        console.log('Bulk actions hidden in initializePage');
    }
    
    // Force call updateBulkActionsVisibility to ensure proper state
    updateBulkActionsVisibility();
}

function setupEventListeners() {
    // Filter change events
    document.getElementById('signatory_clearance_filter_course').addEventListener('change', loadClearanceData);
    document.getElementById('signatory_clearance_filter_year').addEventListener('change', loadClearanceData);
    document.getElementById('signatory_clearance_filter_section').addEventListener('change', loadClearanceData);
    document.getElementById('signatory_clearance_filter_status').addEventListener('change', loadClearanceData);
    
    // Search input
    document.getElementById('signatory_clearance_search_input').addEventListener('input', debounce(loadClearanceData, 300));
    
    // Reset filters
    document.getElementById('signatory_clearance_reset_filters').addEventListener('click', resetFilters);
    
    // Select all checkbox  
    document.getElementById('signatory_clearance_select_all').addEventListener('change', toggleSelectAll);
    
    // Bulk print functionality
    document.getElementById('signatory_clearance_bulk_print').addEventListener('click', bulkPrint);
    
    // Bulk approve/disapprove functionality
    document.getElementById('signatory_clearance_bulk_approve').addEventListener('click', bulkApproveClearance);
    document.getElementById('signatory_clearance_bulk_disapprove').addEventListener('click', bulkDisapproveClearance);
    
    // Print button event handler - COPIED FROM BUSINESS MANAGER
    const printBtn = document.getElementById('printPreviewBtn');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            printPreviewContent();
        });
    }
    
    
    // Print click handler - COPIED FROM BUSINESS MANAGER
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('table-icon-print')) {
            // Handle print functionality
            const row = e.target.closest('tr');
            const checkbox = row.querySelector('.signatory_clearance_row_checkbox');
            if (checkbox) {
                const clearanceId = checkbox.value;
                printClearance(clearanceId);
            }
        }
    });
    
    
    

    
    // Approval/Disapproval handlers
    document.getElementById('signatory_clearance_verifyOtpBtn').addEventListener('click', handleApproval);
    document.getElementById('signatory_clearance_disapprove_pin_submit_btn').addEventListener('click', handleDisapprovePin);
    document.getElementById('signatory_clearance_submit_Appointment_Disapproval_Btn').addEventListener('click', handleDisapproval);
    
    // Other reason toggle
    document.getElementById('signatory_clearance_reasonOther').addEventListener('change', toggleOtherReasonInput);
}



function loadClearanceData() {
    const courseFilter = document.getElementById('signatory_clearance_filter_course').value;
    const yearFilter = document.getElementById('signatory_clearance_filter_year').value;
    const sectionFilter = document.getElementById('signatory_clearance_filter_section').value;
    const statusFilter = document.getElementById('signatory_clearance_filter_status').value;
    const searchQuery = document.getElementById('signatory_clearance_search_input').value;
    
    const params = new URLSearchParams();
    if (courseFilter && courseFilter !== 'Filter by Course') params.append('course', courseFilter);
    if (yearFilter && yearFilter !== 'Filter by Year') params.append('year', yearFilter);
    if (sectionFilter && sectionFilter !== 'Filter by Section') params.append('section', sectionFilter);
    if (statusFilter && statusFilter !== 'Filter by Status') params.append('status', statusFilter);
    if (searchQuery) params.append('search', searchQuery);
    
    console.log('Loading clearance data with params:', params.toString());
    
    fetch(`/signatory/clearance/api/data/?${params.toString()}`)
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);
            if (data.error) {
                throw new Error(data.error);
            }
            clearanceData = data.data || [];
            signatoryType = data.data && data.data.length > 0 ? data.data[0].signatory_type : null;
            console.log('Current signatory type:', signatoryType);
            updateSignatoryHeader();
            renderTable(data.data || []);
            updateFilterOptions();
        })
        .catch(error => {
            console.error('Error loading clearance data:', error);
            document.getElementById('signatory_clearance_table_body').innerHTML = 
                '<tr><td colspan="10" class="text-center text-muted">' +
                '<div class="alert alert-warning mb-0">' +
                '<i class="bi bi-exclamation-triangle me-2"></i>' +
                'Unable to load clearance data. Please refresh the page or contact support if the problem persists.' +
                '</div></td></tr>';
        });
}

function renderTable(data) {
    const tbody = document.getElementById('signatory_clearance_table_body');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No clearance records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(item => createTableRow(item)).join('');
    
    // Re-attach event listeners to new buttons
    attachButtonListeners();
}

function createTableRow(item) {
    const summaryColumn = createSummaryColumn(item);
    const currentSignatoryColumn = createCurrentSignatoryColumn(item);
    
    return `
        <tr data-clearance-id="${item.id}">
            <td>
                <input type="checkbox" class="signatory_clearance_row_checkbox" value="${item.id}">
            </td>
            <td class="text-start">${item.student_name}</td>
            <td>${item.course}</td>
            <td>${item.year}</td>
            <td>${item.section}</td>
            <td>${item.student_number}</td>
            <td><div class="small text-muted">${item.date_submitted}</div></td>
            ${currentSignatoryColumn}
            ${summaryColumn}
            <td><div class="small text-muted">${getStatusDisplay(item.status)}</div></td>
            <td>
                <div class="signatory_clearance_table-icons">
                    <i class="bi bi-printer table-icon-print" title="Print"></i>
                </div>
            </td>
        </tr>
    `;
}

function createSignatoryColumns(item) {
    const signatoryTypes = [
        'dorm_supervisor', 'canteen_concessionaire', 'library_director', 'scholarship_director',
        'it_director', 'student_affairs', 'cashier', 'business_manager', 'registrar', 'academic_dean'
    ];
    
    return signatoryTypes.map(type => {
        const signatoryData = item.signatories[type];
        const isCurrentSignatory = signatoryType === type;
        if (isCurrentSignatory) {
            console.log(`Buttons will appear in column: ${type}`);
        }
        
        if (!signatoryData) {
            return '<td><div class="small text-muted">-</div></td>';
        }
        
        if (signatoryData.status === 'approved') {
            if (isCurrentSignatory) {
                return `<td><div class="small text-success">Approved at ${signatoryData.timestamp}</div></td>`;
            } else {
                return `<td><div class="small text-success">Approved at ${signatoryData.timestamp}</div></td>`;
            }
        } else if (signatoryData.status === 'disapproved') {
            if (isCurrentSignatory) {
                return `
                    <td>
                        <div class="d-flex flex-column align-items-center gap-1">
                            <div class="small text-danger">Disapproved at ${signatoryData.timestamp}</div>
                            <button type="button" class="btn btn-warning btn-sm signatory-clearance-action-btn" 
                                    data-action="edit_disapproval" data-id="${item.id}">Edit</button>
                        </div>
                    </td>
                `;
            } else {
                return `<td><div class="small text-danger">Disapproved at ${signatoryData.timestamp}</div></td>`;
            }
        } else {
            // Pending status
            if (isCurrentSignatory) {
                return `
                    <td>
                        <div class="d-flex flex-column align-items-center gap-1">
                            <button type="button" class="btn btn-success btn-sm signatory-clearance-action-btn" 
                                    data-action="approve" data-id="${item.id}">Approve</button>
                            <button type="button" class="btn btn-danger btn-sm signatory-clearance-action-btn" 
                                    data-action="disapprove" data-id="${item.id}">Disapprove</button>
                        </div>
                    </td>
                `;
            } else {
                return '<td><div class="small text-muted">Pending</div></td>';
            }
        }
    }).join('');
}

function createSummaryColumn(item) {
    const signatoryTypes = [
        'dorm_supervisor', 'canteen_concessionaire', 'library_director', 'scholarship_director',
        'it_director', 'student_affairs', 'cashier', 'business_manager', 'registrar', 'academic_dean'
    ];
    
    let approvedCount = 0;
    let disapprovedCount = 0;
    let pendingCount = 0;
    
    signatoryTypes.forEach(type => {
        const signatoryData = item.signatories[type];
        if (!signatoryData) {
            pendingCount++;
        } else if (signatoryData.status === 'approved') {
            approvedCount++;
        } else if (signatoryData.status === 'disapproved') {
            disapprovedCount++;
        } else {
            pendingCount++;
        }
    });
    
    return `
        <td>
            <div class="small">
                <div class="text-success">Approved: ${approvedCount}/10</div>
                ${disapprovedCount > 0 ? `<div class="text-danger">Disapproved: ${disapprovedCount}/10</div>` : ''}
                <div class="text-muted">Pending: ${pendingCount}/10</div>
            </div>
        </td>
    `;
}

function createCurrentSignatoryColumn(item) {
    if (!signatoryType || !item.signatories[signatoryType]) {
        return '<td><div class="small text-muted">-</div></td>';
    }
    
    const signatoryData = item.signatories[signatoryType];
    
    if (signatoryData.status === 'approved') {
        return `<td><div class="small text-success">Approved at ${signatoryData.timestamp}</div></td>`;
    } else if (signatoryData.status === 'disapproved') {
        return `
            <td>
                <div class="d-flex flex-column align-items-center gap-1">
                    <div class="small text-danger">Disapproved at ${signatoryData.timestamp}</div>
                    <button type="button" class="btn btn-warning btn-sm signatory-clearance-action-btn" 
                            data-action="edit_disapproval" data-id="${item.id}">Edit</button>
                </div>
            </td>
        `;
    } else {
        // Pending status
        return `
            <td>
                <div class="d-flex flex-column align-items-center gap-1">
                    <button type="button" class="btn btn-success btn-sm signatory-clearance-action-btn" 
                            data-action="approve" data-id="${item.id}">Approve</button>
                    <button type="button" class="btn btn-danger btn-sm signatory-clearance-action-btn" 
                            data-action="disapprove" data-id="${item.id}">Disapprove</button>
                </div>
            </td>
        `;
    }
}

function getStatusDisplay(status) {
    const statusMap = {
        'pending': 'Pending',
        'completed': 'Completed'
    };
    return statusMap[status] || status;
}

function updateSignatoryHeader() {
    const header = document.getElementById('current_signatory_header');
    if (!header || !signatoryType) return;
    
    const signatoryTypeMap = {
        'dorm_supervisor': 'Dorm Supervisor',
        'canteen_concessionaire': 'Canteen Concessionaire', 
        'library_director': 'Library Director',
        'scholarship_director': 'Scholarship Director',
        'it_director': 'IT Director',
        'student_affairs': 'Student Affairs',
        'cashier': 'Cashier',
        'business_manager': 'Business Manager',
        'registrar': 'Registrar',
        'academic_dean': 'Academic Dean'
    };
    
    const roleName = signatoryTypeMap[signatoryType] || 'My Approval';
    header.textContent = roleName;
}

function attachButtonListeners() {
    // Approval/Disapproval buttons
    document.querySelectorAll('.signatory-clearance-action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            const id = this.dataset.id;
            
            if (action === 'approve') {
        // Close any open sidebars first
        closeAllSidebars();
        
        currentApproveId = id;
        clearOtpInput();
        document.getElementById("signatory_clearance_otpError").style.display = "none";
        document.getElementById("signatory_clearance_otpSidebar").classList.add("show");
            } else if (action === 'disapprove') {
        // Close any open sidebars first
        closeAllSidebars();
        
        currentDisapproveId = id;
        clearDisapproveChecks();
        document.getElementById("signatory_clearance_disapprove_pin_step").style.display = "block";
                document.getElementById("signatory_clearance_disapprove_reason_step").style.display = "none";
        document.getElementById("signatory_clearance_disapproveSidebar").classList.add("show");
            } else if (action === 'edit_disapproval') {
                // Close any open sidebars first
                closeAllSidebars();
                
                currentApproveId = id;
                clearOtpInput();
                document.getElementById("signatory_clearance_otpError").style.display = "none";
                document.getElementById("signatory_clearance_otpSidebar").classList.add("show");
      }
    });
  });

    
    
    // Row checkboxes
    document.querySelectorAll('.signatory_clearance_row_checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Individual checkbox functionality can be added here if needed
            updateBulkActionsVisibility();
        });
    });
    
    updateBulkActionsVisibility();
}

function handleApproval() {
    const pin = document.getElementById('signatory_clearance_otpinput').value;
    const comment = document.getElementById('signatory_clearance_otpComment').value;
    
    if (!pin) {
        document.getElementById('signatory_clearance_otpError').textContent = 'PIN is required';
        document.getElementById('signatory_clearance_otpError').style.display = 'block';
        return;
    }
    
    // Check if this is bulk operation
    if (currentActionSignatory === 'bulk_approve') {
        handleBulkApproval(pin, comment);
        return;
    }
    
    // Individual approval logic (unchanged)
    const isEditAction = currentApproveId && clearanceData.find(item => item.id === currentApproveId)?.signatories[signatoryType]?.status === 'disapproved';
    
    // Show loading state
    const approveBtn = document.getElementById('signatory_clearance_verifyOtpBtn');
    const originalText = approveBtn.innerHTML;
    approveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';
    approveBtn.disabled = true;
    
    // Hide previous errors
    document.getElementById('signatory_clearance_otpError').style.display = 'none';
    
    const formData = new FormData();
    formData.append('clearance_id', currentApproveId);
    formData.append('pin', pin);
    formData.append('comment', comment);
    
    fetch('/signatory/clearance/approve/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const message = isEditAction ? 'Clearance status updated from disapproved to approved!' : 'Clearance approved successfully!';
            closeOtpSidebar();
            loadClearanceData();
            showClearanceSuccessAlert(message);
        } else {
            document.getElementById('signatory_clearance_otpError').textContent = data.error;
            document.getElementById('signatory_clearance_otpError').style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error approving clearance:', error);
        document.getElementById('signatory_clearance_otpError').textContent = 'An error occurred. Please try again.';
        document.getElementById('signatory_clearance_otpError').style.display = 'block';
    })
    .finally(() => {
        // Reset button state
        approveBtn.innerHTML = originalText;
        approveBtn.disabled = false;
    });
}

function handleDisapprovePin() {
    const pin = document.getElementById('signatory_clearance_disapprove_pin_input').value;
    
    if (!pin) {
        document.getElementById('signatory_clearance_disapprove_pin_error').textContent = 'PIN is required';
        document.getElementById('signatory_clearance_disapprove_pin_error').style.display = 'block';
        return;
    }
    
    // Verify PIN (in production, this should be verified server-side)
    // For now, we'll send the PIN to the server for verification
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
        document.getElementById('signatory_clearance_disapprove_pin_step').style.display = 'none';
        document.getElementById('signatory_clearance_disapprove_reason_step').style.display = 'block';
        document.getElementById('signatory_clearance_disapprove_pin_error').style.display = 'none';
    } else {
        document.getElementById('signatory_clearance_disapprove_pin_error').textContent = data.error || 'Invalid PIN';
        document.getElementById('signatory_clearance_disapprove_pin_error').style.display = 'block';
    }
    })
    .catch(error => {
        console.error('Error verifying PIN:', error);
        document.getElementById('signatory_clearance_disapprove_pin_error').textContent = 'An error occurred';
        document.getElementById('signatory_clearance_disapprove_pin_error').style.display = 'block';
    });
}

function handleDisapproval() {
    const reasons = Array.from(document.querySelectorAll('#signatory_clearance_disapproveSidebar input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const comment = document.getElementById('signatory_clearance_disapproveComment').value;
    const appointmentDate = document.getElementById('signatory_clearance_appointmentDate').value;
    const otherReason = document.getElementById('signatory_clearance_otherReasonInput').value;
    
    if (reasons.length === 0) {
        document.getElementById('signatory_clearance_disapproveError').style.display = 'block';
        return;
    }

    if (!appointmentDate) {
        document.getElementById('signatory_clearance_appointmentError').style.display = 'block';
        return;
    }
    
    // Handle "Other" reason
    if (reasons.includes('Other') && otherReason) {
        reasons.splice(reasons.indexOf('Other'), 1, otherReason);
    }
    
    // Check if this is bulk operation
    if (currentActionSignatory === 'bulk_disapprove') {
        const pin = document.getElementById('signatory_clearance_disapprove_pin_input').value;
        handleBulkDisapproval(pin, reasons, comment, appointmentDate);
        return;
    }

    // Individual disapproval logic (unchanged)
    // Show loading state
    const disapproveBtn = document.getElementById('signatory_clearance_submit_Appointment_Disapproval_Btn');
    const originalText = disapproveBtn.innerHTML;
    disapproveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';
    disapproveBtn.disabled = true;
    
    const formData = new FormData();
    formData.append('clearance_id', currentDisapproveId);
    formData.append('pin', document.getElementById('signatory_clearance_disapprove_pin_input').value);
    reasons.forEach(reason => formData.append('reasons[]', reason));
    formData.append('comment', comment);
    formData.append('appointment_date', appointmentDate);
    
    fetch('/signatory/clearance/disapprove/', {
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
            loadClearanceData();
            showClearanceSuccessAlert('Clearance disapproved successfully!');
        } else {
            showClearanceAlert('Error: ' + data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error disapproving clearance:', error);
        showClearanceAlert('An error occurred. Please try again.', 'danger');
    })
    .finally(() => {
        // Reset button state
        disapproveBtn.innerHTML = originalText;
        disapproveBtn.disabled = false;
    });
}



function toggleSelectAll() {
    const selectAll = document.getElementById('signatory_clearance_select_all');
    const checkboxes = document.querySelectorAll('.signatory_clearance_row_checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateBulkActionsVisibility();
    
    
}


function resetFilters() {
    // Reset all filter dropdowns to their default state
    const courseSelect = document.getElementById('signatory_clearance_filter_course');
    const yearSelect = document.getElementById('signatory_clearance_filter_year');
    const sectionSelect = document.getElementById('signatory_clearance_filter_section');
    const statusSelect = document.getElementById('signatory_clearance_filter_status');
    const searchInput = document.getElementById('signatory_clearance_search_input');
    
    // Reset to first option (which should be the default)
    if (courseSelect) courseSelect.selectedIndex = 0;
    if (yearSelect) yearSelect.selectedIndex = 0;
    if (sectionSelect) sectionSelect.selectedIndex = 0;
    if (statusSelect) statusSelect.selectedIndex = 0;
    if (searchInput) searchInput.value = '';
    
    // Reload data with reset filters
    loadClearanceData();
}

function updateFilterOptions() {
    // Load filter options from server
    fetch('/signatory/clearance/filter-options/')
        .then(response => response.json())
        .then(data => {
            console.log('Filter options data:', data);
            
            if (data.courses && data.courses.length > 0) {
                const courseSelect = document.getElementById('signatory_clearance_filter_course');
                if (courseSelect) {
                    courseSelect.innerHTML = '<option selected disabled>Filter by Course</option>';
                    data.courses.forEach(course => {
                        courseSelect.innerHTML += `<option>${course}</option>`;
                    });
                }
            }
            
            if (data.years && data.years.length > 0) {
                const yearSelect = document.getElementById('signatory_clearance_filter_year');
                if (yearSelect) {
                    yearSelect.innerHTML = '<option selected disabled>Filter by Year</option>';
                    data.years.forEach(year => {
                        yearSelect.innerHTML += `<option>${year}</option>`;
                    });
                }
            }
            
            if (data.sections && data.sections.length > 0) {
                const sectionSelect = document.getElementById('signatory_clearance_filter_section');
                if (sectionSelect) {
                    sectionSelect.innerHTML = '<option selected disabled>Filter by Section</option>';
                    data.sections.forEach(section => {
                        sectionSelect.innerHTML += `<option>${section}</option>`;
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error loading filter options:', error);
            // Set default options if loading fails
            const courseSelect = document.getElementById('signatory_clearance_filter_course');
            const yearSelect = document.getElementById('signatory_clearance_filter_year');
            const sectionSelect = document.getElementById('signatory_clearance_filter_section');
            
            if (courseSelect) courseSelect.innerHTML = '<option selected disabled>Filter by Course</option>';
            if (yearSelect) yearSelect.innerHTML = '<option selected disabled>Filter by Year</option>';
            if (sectionSelect) sectionSelect.innerHTML = '<option selected disabled>Filter by Section</option>';
        });
}

// Utility functions
function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

function showClearanceSuccessAlert(message) {
    // Create a temporary success alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        <i class="bi bi-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function showClearanceAlert(message, type = 'warning') {
    // Create a temporary alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

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

function closeOtpSidebar() {
  document.getElementById("signatory_clearance_otpSidebar").classList.remove("show");
}

function closeDisapproveSidebar() {
  document.getElementById("signatory_clearance_disapproveSidebar").classList.remove("show");
}

function closeAllSidebars() {
    // Close OTP sidebar
    const otpSidebar = document.getElementById('signatory_clearance_otpSidebar');
    if (otpSidebar) {
        otpSidebar.classList.remove('show');
    }
    
    // Close disapprove sidebar
    const disapproveSidebar = document.getElementById('signatory_clearance_disapproveSidebar');
    if (disapproveSidebar) {
        disapproveSidebar.classList.remove('show');
    }
    
    // Don't reset global variables here since we're just switching between sidebars
    // Variables will be reset when sidebar is actually closed or on cancel
}

function clearOtpInput() {
  document.getElementById("signatory_clearance_otpComment").value = "";
  const input = document.getElementById("signatory_clearance_otpinput");
  input.value = "";
  input.focus();
}

function clearDisapproveChecks() {
  document.getElementById("signatory_clearance_disapproveComment").value = "";
  document.querySelectorAll('#signatory_clearance_disapproveSidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
  document.getElementById("signatory_clearance_appointmentDate").value = "";
  document.getElementById("signatory_clearance_appointmentError").style.display = "none";
  document.getElementById("signatory_clearance_disapproveError").style.display = "none";
  document.getElementById("signatory_clearance_otherReasonInput").value = "";
  document.getElementById("signatory_clearance_otherReasonContainer").style.display = "none";
}

function toggleOtherReasonInput() {
  const otherCheckbox = document.getElementById("signatory_clearance_reasonOther");
  const otherInputContainer = document.getElementById("signatory_clearance_otherReasonContainer");
  otherInputContainer.style.display = otherCheckbox.checked ? "block" : "none";
}

// View clearance details
function viewClearanceDetails(clearanceId) {
    window.open(`/signatory/clearance/details/${clearanceId}/`, '_blank');
}

// Print individual clearance - COPIED FROM BUSINESS MANAGER MODAL SYSTEM
function printClearance(clearanceId) {
    if (!clearanceId) {
        console.error('No clearance ID provided');
        return;
    }
    // Use modal preview - MATCHES BUSINESS MANAGER FUNCTIONALITY
    openPreviewModal([clearanceId]);
}

// Bulk print functionality - COPIED FROM BUSINESS MANAGER MODAL SYSTEM
function bulkPrint() {
    const selectedCheckboxes = document.querySelectorAll('.signatory_clearance_row_checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('Please select at least one clearance form to print.');
        return;
    }
    
    const clearanceIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    
    // Use modal preview - MATCHES BUSINESS MANAGER FUNCTIONALITY
    openPreviewModal(clearanceIds);
}

// Modal preview system - COPIED FROM BUSINESS MANAGER
function openPreviewModal(clearanceIds) {
    const spinnerEl = document.getElementById('previewLoadingSpinner');
    const contentEl = document.getElementById('previewContent');
    const modalEl = document.getElementById('previewPrintModal');
    
    if (!spinnerEl || !contentEl || !modalEl) {
        console.error('Modal elements not found');
        alert('Modal elements not found. Please refresh the page.');
        return;
    }
    
    // Reset modal state and show loading
    resetPreviewModal();
    showPreviewLoader();
    
    // Don't show modal - we'll load content invisibly
    const modal = new bootstrap.Modal(modalEl);
    
    const url = `/signatory/clearance/preview-print/?ids=${clearanceIds.join(',')}`;
    
    fetch(url)
        .then(response => response.text())
        .then(html => {
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from server');
            }
            
            // Show content
            contentEl.innerHTML = html;
            contentEl.style.display = 'block';
            
            // Hide loading spinner since content is loaded
            hidePreviewLoader();
            
            // Auto-trigger print after content loads
            setTimeout(function() {
                printPreviewContent();
            }, 500);
        })
        .catch(error => {
            console.error('Error loading preview:', error);
            
            // Show error in content area
            let errorMessage = 'Failed to load preview. Please try again.';
            if (error.message.includes('Empty response')) {
                errorMessage = error.message;
            }
            
            contentEl.innerHTML = `<div class="alert alert-danger m-3">${errorMessage}</div>`;
            contentEl.style.display = 'block';
        })
        .finally(() => {
            // Always hide loader regardless of success/error
            hidePreviewLoader();
        });
}

function resetPreviewModal() {
    hidePreviewLoader();
    const contentEl = document.getElementById('previewContent');
    if (contentEl) {
        contentEl.innerHTML = '';
        contentEl.style.display = 'none';
    }
}

function showPreviewLoader() {
    const spinnerEl = document.getElementById('previewLoadingSpinner');
    const contentEl = document.getElementById('previewContent');
    
    if (spinnerEl) {
        spinnerEl.style.display = 'flex';
        spinnerEl.classList.add('d-flex');
    }
    if (contentEl) {
        contentEl.style.display = 'none';
    }
}

function hidePreviewLoader() {
    const spinnerEl = document.getElementById('previewLoadingSpinner');
    if (spinnerEl) {
        spinnerEl.style.display = 'none';
        spinnerEl.classList.remove('d-flex');
    }
}

// Print preview content - COPIED FROM BUSINESS MANAGER
function printPreviewContent() {
    const contentEl = document.getElementById('previewContent');
    
    if (!contentEl || !contentEl.innerHTML.trim()) {
        alert('No content to print. Please wait for preview to load.');
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
    
    // Build complete HTML document for iframe - COMPRESSED PRINT FORMAT
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
            
            /* Each clearance form should fit on one page */
            .clearance-form {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                page-break-before: auto;
                page-break-after: always;
                margin: 0;
                padding: 0;
            }
            
            /* Both copies should fit in one page without overflow */
            .copy-container {
                border: 1px solid #000;
                padding: 8px;
                margin-bottom: 4px;
                background: white;
                position: relative;
            }
            
            .copy-container:last-child {
                margin-bottom: 0;
            }
            
            .separator-line {
                border: none;
                border-top: 2px dashed #000;
                margin: 8px 0;
                width: 100%;
                clear: both;
                page-break-inside: avoid;
                flex-shrink: 0;
                height: auto;
            }
            
            .page-break {
                break-after: page !important;
                page-break-after: always !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                visibility: hidden !important;
                display: none !important;
            }
            
            .watermark {
                position: absolute;
                top: 3px;
                right: 8px;
                font-size: 8px;
                color: #666;
                font-weight: bold;
            }
            
            .title {
                text-align: center;
                font-weight: bold;
                font-size: 12px;
                margin: 2px 0;
                line-height: 1.1;
            }
            
            .subtitle {
                text-align: center;
                font-size: 9px;
                margin: 1px 0 3px 0;
                line-height: 1.1;
            }
            
            .clearance {
                text-align: center;
                font-weight: bold;
                font-size: 11px;
                margin: 2px 0;
                text-decoration: underline;
                line-height: 1.1;
            }
            
            .year {
                text-align: center;
                font-size: 9px;
                margin: 2px 0;
                line-height: 1.1;
            }
            
            .row-container {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
                gap: 10px;
            }
            
            .row-item {
                flex: 1;
            }
            
            .name, .course {
                font-size: 9px;
                margin: 1px 0;
                line-height: 1.1;
            }
            
            .row-line, .row-line-1 {
                border-bottom: 1px solid #000;
                display: inline-block;
                min-width: 80px;
                padding: 0 2px;
                margin: 0 2px;
                font-size: 9px;
            }
            
            .desc {
                font-size: 8px;
                margin: 3px 0;
                text-align: center;
                line-height: 1.1;
            }
            
            .dept-table {
                width: 100%;
                border-collapse: collapse;
                margin: 3px 0;
                font-size: 7px;
                table-layout: fixed;
            }
            
            .dept-table th,
            .dept-table td {
                border: 1px solid #000;
                padding: 2px;
                text-align: left;
                line-height: 1.1;
                height: auto;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
            
            .dept-table th {
                background-color: #f0f0f0;
                font-weight: bold;
                text-align: center;
                font-size: 7px;
            }
            
            .dept-text {
                width: 70%;
                font-size: 7px;
            }
            
            .dept-sign {
                width: 30%;
                text-align: center;
                font-size: 7px;
            }
            
            .approved-signature {
                color: #28a745;
                font-weight: bold;
                font-size: 6px;
            }
            
            .disapproved-signature {
                color: #dc3545;
                font-weight: bold;
                font-size: 6px;
            }
            
            .pending-signature {
                color: #6c757d;
                font-style: italic;
                font-size: 6px;
            }
            
            .signatory-reminder {
                font-size: 6px;
                margin: 2px 0;
                text-align: center;
                line-height: 1.1;
            }
            
            .purpose {
                font-size: 8px;
                font-weight: bold;
                margin: 2px 0 0 0;
                line-height: 1.1;
            }
            
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .clearance-form {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                    page-break-before: auto !important;
                    page-break-after: always !important;
                }
                
                .page-break {
                    display: none !important;
                }
                
                /* Prevent any internal breaks */
                .copy-container {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                }
                
                .dept-table {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                }
            }
        </style>
    `;
    
    const fullHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Print Clearance Forms</title>
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
                alert('Print failed. Please try again.');
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

// Update bulk actions visibility - matches registrar pattern
function updateBulkActionsVisibility() {
    const checkedBoxes = document.querySelectorAll('.signatory_clearance_row_checkbox:checked');
    const bulkActions = document.getElementById('signatory_clearance_bulk_actions');
    const selectedCount = document.getElementById('signatory_clearance_selected_count');
    
    console.log('updateBulkActionsVisibility called, checked boxes:', checkedBoxes.length);

    if (checkedBoxes.length > 0) {
        if (bulkActions) {
            bulkActions.style.display = 'flex'; // Use flex to match the d-flex class
            bulkActions.style.visibility = 'visible';
        }
        if (selectedCount) selectedCount.textContent = `${checkedBoxes.length} selected`;
        console.log('Showing bulk actions');
    } else {
        if (bulkActions) {
            bulkActions.style.display = 'none';
            bulkActions.style.visibility = 'hidden';
            // Force override any CSS classes
            bulkActions.style.setProperty('display', 'none', 'important');
        }
        console.log('Hiding bulk actions');
    }
}

// Global variables for bulk operations
let currentActionSignatory = null;
let bulkClearanceIdsSignatory = [];

// Bulk Approve Functionality  
function bulkApproveClearance() {
    const selectedCheckboxes = document.querySelectorAll('.signatory_clearance_row_checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showClearanceAlert('Please select at least one clearance form to approve', 'warning');
        return;
    }
    
    // Filter out forms that are already approved or disapproved
    const actionableIds = [];
    const alreadyApproved = [];
    const alreadyDisapproved = [];
    
    selectedCheckboxes.forEach(cb => {
        const clearanceId = cb.value;
        const row = cb.closest('tr');
        
        // Get the user's status cell based on signatory type
        const statusCell = getSignatoryStatusCell(row);
        
        if (statusCell) {
            const statusText = statusCell.textContent.trim();
            const studentName = row.cells[1]?.textContent.trim() || clearanceId;
            
            // Check if already approved or disapproved
            if (statusText.includes('Approved')) {
                alreadyApproved.push(studentName);
            } else if (statusText.includes('Disapproved')) {
                // Cannot approve disapproved forms
                alreadyDisapproved.push(studentName);
            } else {
                actionableIds.push(clearanceId);
            }
        } else {
            // If we can't determine status, include it to be safe
            actionableIds.push(clearanceId);
        }
    });
    
    // Combine all feedback into a single message
    const messages = [];
    
    if (alreadyApproved.length > 0) {
        const names = alreadyApproved.join(', ');
        messages.push(`${alreadyApproved.length} already approved: ${names}`);
    }
    
    if (alreadyDisapproved.length > 0) {
        const names = alreadyDisapproved.join(', ');
        messages.push(`${alreadyDisapproved.length} already disapproved (cannot approve): ${names}`);
    }
    
    // Check if any forms need approval
    if (actionableIds.length === 0) {
        console.log('DEBUG: No actionable forms for approval, returning early');
        const message = messages.length > 0 
            ? `No forms available for approval. ${messages.join('. ')}.`
            : 'No forms available for approval. All selected forms are already processed.';
        showClearanceAlert(message, 'warning');
        return;
    }
    
    // Show info about processed forms if any, but continue with actionable ones
    if (messages.length > 0) {
        showClearanceAlert(`${messages.join('. ')}. Proceeding with ${actionableIds.length} form(s) that need approval.`, 'info');
    }
    
    console.log('DEBUG: Showing bulk approve sidebar with', actionableIds.length, 'forms');
    showBulkApproveSidebar(actionableIds);
}

// Bulk Disapprove Functionality  
function bulkDisapproveClearance() {
    const selectedCheckboxes = document.querySelectorAll('.signatory_clearance_row_checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showClearanceAlert('Please select at least one clearance form to disapprove', 'warning');
        return;
    }
    
    // Filter out forms that are already disapproved or approved
    const actionableIds = [];
    const alreadyDisapproved = [];
    const alreadyApproved = [];
    
    selectedCheckboxes.forEach(cb => {
        const clearanceId = cb.value;
        const row = cb.closest('tr');
        
        // Get the user's status cell based on signatory type
        const statusCell = getSignatoryStatusCell(row);
        
        if (statusCell) {
            const statusText = statusCell.textContent.trim();
            const studentName = row.cells[1]?.textContent.trim() || clearanceId;
            
            // Check if already disapproved or approved
            if (statusText.includes('Disapproved')) {
                alreadyDisapproved.push(studentName);
            } else if (statusText.includes('Approved')) {
                // Already approved forms cannot be disapproved
                alreadyApproved.push(studentName);
            } else {
                actionableIds.push(clearanceId);
            }
        } else {
            // If we can't determine status, include it to be safe
            actionableIds.push(clearanceId);
        }
    });
    
    // Combine all feedback into a single message
    const messages = [];
    
    if (alreadyDisapproved.length > 0) {
        const names = alreadyDisapproved.join(', ');
        messages.push(`${alreadyDisapproved.length} already disapproved: ${names}`);
    }
    
    if (alreadyApproved.length > 0) {
        const names = alreadyApproved.join(', ');
        messages.push(`${alreadyApproved.length} already approved (cannot disapprove): ${names}`);
    }
    
    // Check if any forms need disapproval
    if (actionableIds.length === 0) {
        console.log('DEBUG: No actionable forms for disapproval, returning early');
        const message = messages.length > 0 
            ? `No forms available for disapproval. ${messages.join('. ')}.`
            : 'No forms available for disapproval. All selected forms are already processed.';
        showClearanceAlert(message, 'warning');
        return;
    }
    
    // Show info about processed forms if any, but continue with actionable ones
    if (messages.length > 0) {
        showClearanceAlert(`${messages.join('. ')}. Proceeding with ${actionableIds.length} form(s) that need disapproval.`, 'info');
    }
    
    console.log('DEBUG: Showing bulk disapprove sidebar with', actionableIds.length, 'forms');
    showBulkDisapproveSidebar(actionableIds);
}

function showBulkApproveSidebar(clearanceIds) {
    // Close any open sidebars first
    closeAllSidebars();
    
    // Store clearance IDs and set bulk mode
    bulkClearanceIdsSignatory = clearanceIds;
    currentActionSignatory = 'bulk_approve';
    
    // Update sidebar title (if there's a title element)
    const titleElement = document.querySelector('#signatory_clearance_otpSidebar h4');
    if (titleElement) {
        titleElement.textContent = `BULK APPROVE (${clearanceIds.length} items)`;
    }
    
    const sidebar = document.getElementById('signatory_clearance_otpSidebar');
    sidebar.classList.add('show');
    
    // Clear previous inputs
    document.getElementById('signatory_clearance_otpinput').value = '';
    document.getElementById('signatory_clearance_otpComment').value = '';
    document.getElementById('signatory_clearance_otpError').style.display = 'none';
}

function showBulkDisapproveSidebar(clearanceIds) {
    // Close any open sidebars first
    closeAllSidebars();
    
    // Store clearance IDs and set bulk mode
    bulkClearanceIdsSignatory = clearanceIds;
    currentActionSignatory = 'bulk_disapprove';
    
    // Update sidebar title (if there's a title element)
    const titleElement = document.querySelector('#signatory_clearance_disapproveSidebar h4');
    if (titleElement) {
        titleElement.textContent = `BULK DISAPPROVE (${clearanceIds.length} items)`;
    }
    
    const sidebar = document.getElementById('signatory_clearance_disapproveSidebar');
    sidebar.classList.add('show');
    
    // Reset to step 1
    document.getElementById('signatory_clearance_disapprove_pin_step').style.display = 'block';
    document.getElementById('signatory_clearance_disapprove_reason_step').style.display = 'none';
    
    // Clear previous inputs
    document.getElementById('signatory_clearance_disapprove_pin_input').value = '';
    document.getElementById('signatory_clearance_disapprove_pin_error').style.display = 'none';
}

function closeAllSidebars() {
    const sidebars = [
        'signatory_clearance_otpSidebar',
        'signatory_clearance_disapproveSidebar'
    ];
    
    sidebars.forEach(id => {
        const sidebar = document.getElementById(id);
        if (sidebar) {
            sidebar.classList.remove('show');
        }
    });
}

function getSignatoryStatusCell(row) {
    // Map signatory types to table column indices (adjust based on your table structure)
    const signatoryColumnMap = {
        'dorm_supervisor': 7,
        'canteen_concessionaire': 8,
        'library_director': 9,
        'scholarship_director': 10,
        'it_director': 11,
        'student_affairs': 12,
        'cashier': 13,
        'business_manager': 14,
        'registrar': 15,
        'academic_dean': 16
    };
    
    const columnIndex = signatoryColumnMap[signatoryType];
    
    if (columnIndex && row.cells[columnIndex]) {
        return row.cells[columnIndex];
    } else {
        return null;
    }
}

// Separate bulk approval handler
function handleBulkApproval(pin, comment) {
    const approveBtn = document.getElementById('signatory_clearance_verifyOtpBtn');
    const originalText = approveBtn.innerHTML;
    approveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';
    approveBtn.disabled = true;
    
    // Hide previous errors
    document.getElementById('signatory_clearance_otpError').style.display = 'none';
    
    fetch('/signatory/clearance/bulk-approve/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            clearance_ids: bulkClearanceIdsSignatory,
            pin: pin,
            comment: comment
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeOtpSidebar();
            loadClearanceData();
            showClearanceSuccessAlert(`Successfully approved ${data.approved_count} clearance forms!`);
            
            // Clear bulk selection
            document.querySelectorAll('.signatory_clearance_row_checkbox:checked').forEach(cb => cb.checked = false);
            updateBulkActionsVisibility();
        } else {
            document.getElementById('signatory_clearance_otpError').textContent = data.error;
            document.getElementById('signatory_clearance_otpError').style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Bulk approval error:', error);
        document.getElementById('signatory_clearance_otpError').textContent = 'Failed to process bulk approval. Please try again.';
        document.getElementById('signatory_clearance_otpError').style.display = 'block';
    })
    .finally(() => {
        // Reset button state
        approveBtn.innerHTML = originalText;
        approveBtn.disabled = false;
    });
}

// Update handleDisapproval to support bulk operations too
function handleBulkDisapproval(pin, reasons, comment, appointmentDate) {
    const disapproveBtn = document.getElementById('signatory_clearance_submit_Appointment_Disapproval_Btn');
    const originalText = disapproveBtn.innerHTML;
    disapproveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';
    disapproveBtn.disabled = true;
    
    fetch('/signatory/clearance/bulk-disapprove/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            clearance_ids: bulkClearanceIdsSignatory,
            pin: pin,
            reason: reasons.join(', '),
            comment: comment,
            appointment_date: appointmentDate
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeDisapproveSidebar();
            loadClearanceData();
            showClearanceSuccessAlert(`Successfully disapproved ${data.disapproved_count} clearance forms!`);
            
            // Clear bulk selection
            document.querySelectorAll('.signatory_clearance_row_checkbox:checked').forEach(cb => cb.checked = false);
            updateBulkActionsVisibility();
        } else {
            showClearanceAlert('Error: ' + data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Bulk disapproval error:', error);
        showClearanceAlert('Failed to process bulk disapproval. Please try again.', 'danger');
    })
    .finally(() => {
        // Reset button state
        disapproveBtn.innerHTML = originalText;
        disapproveBtn.disabled = false;
    });
}

// Sidebar toggle functionality
function toggleSidebar() {
    const sidebar = document.getElementById("signatory_sidebar");
    const backdrop = document.getElementById("signatory_sidebar_sidebarBackdrop");

    if (window.innerWidth <= 768) {
        sidebar.classList.remove("collapsed");
        sidebar.classList.toggle("show");
        backdrop.classList.toggle("active");
    } else {
        sidebar.classList.toggle("collapsed");
    }
}

window.addEventListener("resize", function () {
    const sidebar = document.getElementById("signatory_sidebar");
    const backdrop = document.getElementById("signatory_sidebar_sidebarBackdrop");
    if (window.innerWidth > 768) {
        sidebar.classList.remove("show");
        backdrop.classList.remove("active");
    }
});

// Notification count update
function updateNotificationCount(count) {
    const badge = document.getElementById("signatory_sidebar_notification_count");
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? "inline-block" : "none";
    }
}
