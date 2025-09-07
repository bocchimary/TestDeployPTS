// Business Manager Clearance JavaScript (mirrors registrar clearance functionality)
console.log('BMCLEARANCE.js: Script loading started');

// Sorting state
let currentSortField = 'created_at';
let currentSortOrder = 'desc';

document.addEventListener('DOMContentLoaded', function() {
    // Set current date
    const today = new Date();
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('bm_clearance_dateToday').textContent = today.toLocaleDateString('en-US', dateOptions);

    // Initialize clearance functionality
    initializeClearance();
    
    // Initialize filters and search
    initializeFilters();
    
    // Load initial data
    loadClearanceData();
    
    // Add reset filters functionality
    addResetFiltersButton();
    
    // Initialize table sorting
    initializeTableSorting();
    
    // Set up periodic refresh for real-time updates (every 30 seconds)
    setInterval(loadClearanceData, 30000);
});

// Sidebar toggle functionality
function toggleSidebar() {
    const sidebar = document.getElementById('bm_sidebar');
    const backdrop = document.getElementById('bm_sidebar_sidebarBackdrop');
    const mainContent = document.querySelector('.bm_clearance_main-content');
    
    if (window.innerWidth <= 768) {
        // Mobile behavior
        if (sidebar.classList.contains('show')) {
            sidebar.classList.remove('show');
            backdrop.classList.remove('active');
        } else {
            sidebar.classList.add('show');
            backdrop.classList.add('active');
        }
    } else {
        // Desktop behavior
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            mainContent.classList.add('sidebar-collapsed');
        } else {
            mainContent.classList.remove('sidebar-collapsed');
        }
    }
}

let currentClearanceId = null;
let currentAction = null;

function initializeClearance() {
    // Add event listeners for approval/disapproval buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('bm-clearance-action-btn')) {
            const action = e.target.getAttribute('data-action');
            const clearanceId = e.target.getAttribute('data-id');
            
            if (action === 'Approved') {
                showOtpSidebar(clearanceId, 'approve');
            } else if (action === 'Disapproved') {
                showDisapproveSidebar(clearanceId);
            }
        }
    });
    
    // Add event listener for approve button in sidebar - DISABLED: using DOMContentLoaded handler instead
    // const verifyOtpBtn = document.getElementById('bm_clearance_verifyOtpBtn');
    // if (verifyOtpBtn) {
    //     verifyOtpBtn.addEventListener('click', proceedWithApproval);
    // }
    
    // Add event listener for disapprove PIN submit button
    const disapprovePinSubmitBtn = document.getElementById('bm_clearance_disapprove_pin_submit_btn');
    if (disapprovePinSubmitBtn) {
        disapprovePinSubmitBtn.addEventListener('click', proceedToReasonSelection);
    }
    
    // Add event listener for disapprove submit button
    const submitDisapprovalBtn = document.getElementById('bm_clearance_submit_Appointment_Disapproval_Btn');
    if (submitDisapprovalBtn) {
        submitDisapprovalBtn.addEventListener('click', proceedWithDisapproval);
    }
    
    // Add event listeners for action icons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('table-icon-print')) {
            // Handle print functionality
            const row = e.target.closest('tr');
            const checkbox = row.querySelector('.clearance-checkbox');
            if (checkbox) {
                const clearanceId = checkbox.value;
                printClearance(clearanceId);
            }
        }
    });
}

function initializeFilters() {
    // Filter change handlers with better error handling
    const filterElements = [
        'bm_clearance_filter_course', 
        'bm_clearance_filter_year',  
        'bm_clearance_filter_section', 
        'bm_clearance_filter_status'
    ];
    
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', loadClearanceData);
        }
    });
    
    // Search input with debounce
    const searchInput = document.getElementById('bm_clearance_search_input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(loadClearanceData, 500);
        });
    }
}

function loadClearanceData() {
    console.log('Loading business manager clearance data...');
    
    // Get filter values
    const courseFilter = document.getElementById('bm_clearance_filter_course').value;
    const yearFilter = document.getElementById('bm_clearance_filter_year').value;
    const sectionFilter = document.getElementById('bm_clearance_filter_section').value;
    const statusFilter = document.getElementById('bm_clearance_filter_status').value;
    const searchQuery = document.getElementById('bm_clearance_search_input').value;
    
    // Build query parameters
    const params = new URLSearchParams();
    if (courseFilter && courseFilter !== 'Filter by Course') params.append('course', courseFilter);
    if (yearFilter && yearFilter !== 'Filter by Year') params.append('year', yearFilter);
    if (sectionFilter && sectionFilter !== 'Filter by Section') params.append('section', sectionFilter);
    if (statusFilter && statusFilter !== 'Filter by Status') params.append('status', statusFilter);
    if (searchQuery) params.append('search', searchQuery);
    
    // Add sorting parameters
    params.append('sort', currentSortField);
    params.append('order', currentSortOrder);
    
    console.log('Loading clearance data with params:', params.toString());
    
    fetch(`/business-manager/clearance/api/data/?${params.toString()}`)
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Received clearance data:', data);
            if (data.error) {
                throw new Error(data.error);
            }
            renderClearanceTable(data.data || []);
            loadFilterOptions();
        })
        .catch(error => {
            console.error('Error loading clearance data:', error);
            document.querySelector('.bm_clearance_table tbody').innerHTML = 
                '<tr><td colspan="10" class="text-center text-muted">' +
                '<div class="alert alert-warning mb-0">' +
                '<i class="bi bi-exclamation-triangle me-2"></i>' +
                'Unable to load clearance data. Please refresh the page or contact support if the problem persists.' +
                '</div></td></tr>';
        });
}

// Helper function to format signatory status (EXACT COPY FROM REGISTRAR)
function getSignatoryStatus(signatory) {
    if (!signatory) return '<span class="text-warning"><i class="bi bi-clock"></i> Pending</span>';
    
    const status = signatory.status;
    const timestamp = signatory.timestamp;
    
    if (status === 'approved') {
        return `<span class="text-success"><i class="bi bi-check-circle"></i> Approved</span><br><small>${timestamp || ''}</small>`;
    } else if (status === 'disapproved') {
        return `<span class="text-danger"><i class="bi bi-x-circle"></i> Disapproved</span><br><small>${timestamp || ''}</small>`;
    } else {
        return '<span class="text-warning"><i class="bi bi-clock"></i> Pending</span>';
    }
}

function renderClearanceTable(clearanceData) {
    const tbody = document.querySelector('.bm_clearance_table tbody');
    
    if (!clearanceData || clearanceData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    <p class="mb-0">No clearance forms found</p>
                    <small>Clearance forms will appear here when students submit them</small>
                </td>
            </tr>`;
        updateBulkActionVisibility();
        return;
    }
    
    // Generate table rows
    const rows = clearanceData.map(clearance => {
        const signatoryStatuses = clearance.signatory_statuses || {};
        
        // Build business manager column and summary column
        const bmStatus = signatoryStatuses['business_manager'];
        let bmCellContent = '';
        
        // Business manager column content
        if (!bmStatus || bmStatus.status === 'pending') {
            bmCellContent = `
                <div class="d-flex flex-column align-items-center gap-1">
                    <button type="button" class="btn btn-success btn-sm bm-clearance-action-btn" data-action="Approved" data-id="${clearance.id}">Approve</button>
                    <button type="button" class="btn btn-danger btn-sm bm-clearance-action-btn" data-action="Disapproved" data-id="${clearance.id}">Disapprove</button>
                </div>`;
        } else if (bmStatus.status === 'approved') {
            bmCellContent = `<div class="small text-muted">${getSignatoryStatus(bmStatus)}</div>`;
        } else if (bmStatus.status === 'disapproved') {
            bmCellContent = `
                <div class="d-flex flex-column align-items-center gap-1">
                    <div class="small text-muted">${getSignatoryStatus(bmStatus)}</div>
                    <button type="button" class="btn btn-warning btn-sm" onclick="editDisapprovedClearance('${clearance.id}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                </div>`;
        } else {
            bmCellContent = `<div class="small text-muted">${getSignatoryStatus(bmStatus)}</div>`;
        }
        
        // Summary column content - count all signatory statuses
        const signatoryTypes = [
            'dorm_supervisor', 'canteen_concessionaire', 'library_director', 'scholarship_director',
            'it_director', 'student_affairs', 'cashier', 'business_manager', 'registrar', 'academic_dean'
        ];
        
        let approvedCount = 0;
        let disapprovedCount = 0;
        let pendingCount = 0;
        
        signatoryTypes.forEach(type => {
            const status = signatoryStatuses[type];
            if (!status || status.status === 'pending') {
                pendingCount++;
            } else if (status.status === 'approved') {
                approvedCount++;
            } else if (status.status === 'disapproved') {
                disapprovedCount++;
            }
        });
        
        const summaryCellContent = `
            <div class="small">
                <div class="text-success">Approved: ${approvedCount}/10</div>
                ${disapprovedCount > 0 ? `<div class="text-danger">Disapproved: ${disapprovedCount}/10</div>` : ''}
                <div class="text-muted">Pending: ${pendingCount}/10</div>
            </div>
        `;
        
        const statusCells = `<td>${bmCellContent}</td><td>${summaryCellContent}</td>`;
        
        return `
            <tr>
                <td><input type="checkbox" class="clearance-checkbox" value="${clearance.id}" name="for_printing"></td>
                <td class="text-start">${clearance.student_name}</td>
                <td>${clearance.course}</td>
                <td>${clearance.year}</td>
                <td>${clearance.section}</td>
                <td>${clearance.student_number}</td>
                <td><div class="small text-muted">${clearance.date_submitted}</div></td>
                ${statusCells}
                <td><div class="small ${clearance.overall_status === 'completed' ? 'text-success' : 'text-muted'}">${clearance.overall_status === 'completed' ? 'Cleared' : 'Pending'}</div></td>
                <td>
                    <div class="bm_clearance_table-icons">
                        <i class="bi bi-printer table-icon-print"></i>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rows;
    
    // Initialize checkbox functionality after rendering
    initializeCheckboxes();
}

function loadFilterOptions() {
    fetch('/business-manager/clearance/api/filter-options/')
        .then(response => response.json())
        .then(data => {
            // Update course filter
            const courseSelect = document.getElementById('bm_clearance_filter_course');
            if (courseSelect && data.courses) {
                updateSelectOptions(courseSelect, data.courses, 'Filter by Course');
            }
            
            // Update year filter
            const yearSelect = document.getElementById('bm_clearance_filter_year');
            if (yearSelect && data.years) {
                updateSelectOptions(yearSelect, data.years, 'Filter by Year');
            }
            
            // Update section filter
            const sectionSelect = document.getElementById('bm_clearance_filter_section');
            if (sectionSelect && data.sections) {
                updateSelectOptions(sectionSelect, data.sections, 'Filter by Section');
            }
        })
        .catch(error => {
            console.error('Error loading filter options:', error);
        });
}

function updateSelectOptions(selectElement, options, placeholder) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = `<option value="" selected disabled>${placeholder}</option>`;
    
    options.forEach(option => {
        if (option) {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            if (option === currentValue) {
                optionElement.selected = true;
            }
            selectElement.appendChild(optionElement);
        }
    });
}

function addResetFiltersButton() {
    const resetButton = document.getElementById('bm_clearance_reset_filters');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            // Reset all filters
            document.getElementById('bm_clearance_filter_course').selectedIndex = 0;
            document.getElementById('bm_clearance_filter_year').selectedIndex = 0;
            document.getElementById('bm_clearance_filter_section').selectedIndex = 0;
            document.getElementById('bm_clearance_filter_status').selectedIndex = 0;
            document.getElementById('bm_clearance_search_input').value = '';
            
            // Reload data
            loadClearanceData();
        });
    }
}

// Sidebar functions
function showOtpSidebar(clearanceId, action) {
    // Close any open sidebars first
    closeAllSidebars();
    
    currentClearanceId = clearanceId;
    currentAction = action;
    
    // Clear any previous PIN input
    const otpInput = document.getElementById('bm_clearance_otpinput');
    if (otpInput) {
        otpInput.value = '';
    }
    
    // Clear any error messages
    const otpError = document.getElementById('bm_clearance_otpError');
    if (otpError) {
        otpError.style.display = 'none';
    }
    
    document.getElementById('bm_clearance_otpSidebar').classList.add('show');
}

function closeOtpSidebar() {
    document.getElementById('bm_clearance_otpSidebar').classList.remove('show');
    currentClearanceId = null;
    currentAction = null;
}

function closeDisapproveSidebar() {
    document.getElementById('bm_clearance_disapproveSidebar').classList.remove('show');
    document.getElementById('bm_clearance_disapprove_pin_step').style.display = 'block';
    document.getElementById('bm_clearance_disapprove_reason_step').style.display = 'none';
    currentClearanceId = null;
    currentAction = null;
}

function closeAllSidebars() {
    // Close OTP sidebar
    const otpSidebar = document.getElementById('bm_clearance_otpSidebar');
    if (otpSidebar) {
        otpSidebar.classList.remove('show');
    }
    
    // Close disapprove sidebar
    const disapproveSidebar = document.getElementById('bm_clearance_disapproveSidebar');
    if (disapproveSidebar) {
        disapproveSidebar.classList.remove('show');
        document.getElementById('bm_clearance_disapprove_pin_step').style.display = 'block';
        document.getElementById('bm_clearance_disapprove_reason_step').style.display = 'none';
    }
    
    // Don't reset global variables here since we're just switching between sidebars
    // Variables will be reset when sidebar is actually closed or on cancel
}

function showDisapproveSidebar(clearanceId) {
    // Close any open sidebars first
    closeAllSidebars();
    
    currentClearanceId = clearanceId;
    currentAction = 'disapprove';
    
    // Clear PIN input
    const pinInput = document.getElementById('bm_clearance_disapprove_pin_input');
    if (pinInput) {
        pinInput.value = '';
    }
    
    // Reset to PIN step
    document.getElementById('bm_clearance_disapprove_pin_step').style.display = 'block';
    document.getElementById('bm_clearance_disapprove_reason_step').style.display = 'none';
    
    // Clear error messages
    const pinError = document.getElementById('bm_clearance_disapprove_pin_error');
    if (pinError) {
        pinError.style.display = 'none';
    }
    
    document.getElementById('bm_clearance_disapproveSidebar').classList.add('show');
}

function toggleOtherReasonInput() {
    const otherCheckbox = document.getElementById('bm_clearance_reasonOther');
    const otherContainer = document.getElementById('bm_clearance_otherReasonContainer');
    
    if (otherCheckbox.checked) {
        otherContainer.style.display = 'block';
    } else {
        otherContainer.style.display = 'none';
    }
}

// Approve/Disapprove functionality - MIRROR SIGNATORY FUNCTIONALITY
let isProcessingApproval = false; // Prevent double submissions

function proceedWithApproval() {
    // Prevent double submissions
    if (isProcessingApproval) {
        console.log('Approval already in progress, ignoring duplicate request');
        return;
    }
    
    const pin = document.getElementById('bm_clearance_otpinput').value;
    const comment = ''; // Optional comment for approval
    
    if (!pin) {
        showAlert('Please enter your PIN', 'warning');
        return;
    }
    
    if (!currentClearanceId) {
        showAlert('No clearance selected', 'warning');
        return;
    }
    
    isProcessingApproval = true; // Set processing flag
    
    // Show loading state
    const submitBtn = document.getElementById('bm_clearance_verifyOtpBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    // Debug: Log the data being sent
    console.log('Approving clearance with data:', {
        clearance_id: currentClearanceId,
        pin: pin,
        comment: comment,
        currentAction: currentAction
    });
    
    fetch('/business-manager/clearance/approve/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            clearance_id: currentClearanceId,
            pin: pin,
            comment: comment
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showClearanceSuccessAlert('Clearance approved successfully!');
            closeOtpSidebar();
            // Add small delay to ensure database transaction completes
            setTimeout(() => {
                loadClearanceData(); // Reload the table
            }, 100);
        } else {
            showAlert('Error: ' + (data.error || 'Failed to approve clearance'), 'danger');
        }
    })
    .catch(error => {
        console.error('Error approving clearance:', error);
        showAlert('Error approving clearance. Please try again.', 'danger');
    })
    .finally(() => {
        isProcessingApproval = false; // Reset processing flag
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}

function proceedToReasonSelection() {
    const pin = document.getElementById('bm_clearance_disapprove_pin_input').value;
    
    if (!pin) {
        document.getElementById('bm_clearance_disapprove_pin_error').textContent = 'Please enter PIN';
        document.getElementById('bm_clearance_disapprove_pin_error').style.display = 'block';
        return;
    }
    
    // Verify PIN with backend before proceeding to reason step
    fetch('/business-manager/verify-pin/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin: pin })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // PIN is valid, proceed to reason selection
            document.getElementById('bm_clearance_disapprove_pin_error').style.display = 'none';
            document.getElementById('bm_clearance_disapprove_pin_step').style.display = 'none';
            document.getElementById('bm_clearance_disapprove_reason_step').style.display = 'block';
        } else {
            // PIN is invalid
            document.getElementById('bm_clearance_disapprove_pin_error').textContent = data.error || 'Invalid PIN';
            document.getElementById('bm_clearance_disapprove_pin_error').style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error verifying PIN:', error);
        document.getElementById('bm_clearance_disapprove_pin_error').textContent = 'Error verifying PIN. Please try again.';
        document.getElementById('bm_clearance_disapprove_pin_error').style.display = 'block';
    });
}

function backToPinStep() {
    // Show PIN step and hide reason step
    document.getElementById('bm_clearance_disapprove_pin_step').style.display = 'block';
    document.getElementById('bm_clearance_disapprove_reason_step').style.display = 'none';
}

function proceedWithDisapproval() {
    const pin = document.getElementById('bm_clearance_disapprove_pin_input').value;
    const comment = document.getElementById('bm_clearance_disapproveComment').value;
    const appointmentDate = document.getElementById('bm_clearance_appointmentDate').value;
    
    // Get selected reasons
    const reasons = [];
    const checkboxes = document.querySelectorAll('#bm_clearance_disapprove_reason_step input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
        if (checkbox.value === 'Other') {
            const otherReason = document.getElementById('bm_clearance_otherReasonInput').value;
            if (otherReason) {
                reasons.push(otherReason);
            }
        } else {
            reasons.push(checkbox.value);
        }
    });
    
    if (reasons.length === 0) {
        document.getElementById('bm_clearance_disapproveError').style.display = 'block';
        return;
    }
    
    if (!appointmentDate) {
        document.getElementById('bm_clearance_appointmentError').style.display = 'block';
        return;
    }
    
    // Determine if this is bulk or individual operation
    const isBulkOperation = currentActionBM === 'bulk_disapprove';
    const endpoint = isBulkOperation ? '/business-manager/clearance/bulk-disapprove/' : '/business-manager/clearance/disapprove/';
    
    let requestBody;
    if (isBulkOperation) {
        // For bulk operations, use clearance_ids array and different format
        requestBody = {
            clearance_ids: window.bulkClearanceIdsBM || [],
            pin: pin,
            reason: reasons.join(', '), // Combined reasons as string
            comment: comment,
            appointment_date: appointmentDate
        };
    } else {
        // For individual operations, use clearance_id and reasons array
        requestBody = {
            clearance_id: currentClearanceId,
            pin: pin,
            comment: comment,
            appointment_date: appointmentDate,
            reasons: reasons
        };
    }
    
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const message = isBulkOperation ? data.message || 'Bulk disapproval completed successfully!' : 'Clearance disapproved successfully!';
            showClearanceSuccessAlert(message);
            closeDisapproveSidebar();
            
            // Reset bulk operation state
            if (isBulkOperation) {
                currentActionBM = null;
                window.bulkClearanceIdsBM = null;
                // Reset sidebar title
                document.getElementById('bm_clearance_disapprove_title').textContent = 'DISAPPROVE REASON';
            }
            
            // Add small delay to ensure database transaction completes
            setTimeout(() => {
                loadClearanceData(); // Reload the table
            }, 100);
        } else {
            showAlert('Error: ' + (data.error || 'Failed to disapprove clearance'), 'danger');
        }
    })
    .catch(error => {
        console.error('Error disapproving clearance:', error);
        showAlert('Error disapproving clearance. Please try again.', 'danger');
    });
}

function resetPin() {
    document.getElementById('bm_clearance_otpinput').value = '';
    document.getElementById('bm_clearance_disapprove_pin_input').value = '';
}

// Function to edit a disapproved clearance
function editDisapprovedClearance(clearanceId) {
    // Show the approval sidebar for editing
    showOtpSidebar(clearanceId, 'edit_approved');
}

// Get CSRF token
function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return '';
}

// Checkbox functionality
function initializeCheckboxes() {
    const selectAllCheckbox = document.getElementById('bm_clearance_select_all');
    const clearanceCheckboxes = document.querySelectorAll('.clearance-checkbox');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            clearanceCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateBulkActionVisibility();
        });
    }
    
    clearanceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateBulkActionVisibility();
            
            // Update select all checkbox state
            if (selectAllCheckbox) {
                const checkedCount = document.querySelectorAll('.clearance-checkbox:checked').length;
                selectAllCheckbox.checked = checkedCount === clearanceCheckboxes.length && clearanceCheckboxes.length > 0;
                selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < clearanceCheckboxes.length;
            }
        });
    });
}

function updateBulkActionVisibility() {
    const checkedBoxes = document.querySelectorAll('.clearance-checkbox:checked');
    const bulkActions = document.getElementById('bm_clearance_bulk_actions');
    const selectedCount = document.getElementById('bm_clearance_selected_count');
    
    if (bulkActions && selectedCount) {
        if (checkedBoxes.length > 0) {
            bulkActions.style.display = 'block';
            selectedCount.textContent = `${checkedBoxes.length} selected`;
        } else {
            bulkActions.style.display = 'none';
        }
    }
}

// Print and delete functions
function printClearance(clearanceId) {
    // Use modal preview - MATCHES REGISTRAR FUNCTIONALITY
    openPreviewModal([clearanceId]);
}




// Bulk operations
function bulkPrintClearance() {
    const selectedCheckboxes = document.querySelectorAll('.clearance-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select at least one clearance form to print', 'warning');
        return;
    }

    const clearanceIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    
    // Use modal preview - MATCHES REGISTRAR FUNCTIONALITY
    openPreviewModal(clearanceIds);
}


function updateNotificationCount(count) {
  const badge = document.getElementById("bm_sidebar_notification_count");
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

// Notification function
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Preview and print modal functions
let currentPreviewController = null;

function openPreviewModal(clearanceIds) {
    const spinnerEl = document.getElementById('previewLoadingSpinner');
    const contentEl = document.getElementById('previewContent');
    const modalEl = document.getElementById('previewPrintModal');
    
    if (!spinnerEl || !contentEl || !modalEl) {
        console.error('Modal elements not found');
        showNotification('Modal elements not found. Please refresh the page.', 'error');
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
    
    // Show modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    // Update modal title based on count
    const title = clearanceIds.length === 1 ? 
        'Preview & Print Clearance Form' : 
        `Preview & Print ${clearanceIds.length} Clearance Forms`;
    const titleEl = document.getElementById('previewPrintModalLabel');
    if (titleEl) {
        titleEl.innerHTML = `<i class="bi bi-printer me-2"></i>${title}`;
    }
    
    // Fetch preview content with timeout
    const url = `/business-manager/clearance/preview-print/?ids=${clearanceIds.join(',')}`;
    
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
                return response.text().then(text => {
                    console.error('Preview response error:', text);
                    throw new Error(`Server error: ${response.status} - ${text}`);
                });
            }
            return response.text();
        })
        .then(html => {
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from server');
            }
            
            // Show content
            contentEl.innerHTML = html;
            contentEl.style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading preview:', error);
            clearTimeout(timeoutId);
            
            // Show error in content area
            let errorMessage = 'Failed to load preview. Please try again.';
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out after 15 seconds. Please try again.';
            } else if (error.message.includes('Server error:')) {
                errorMessage = error.message;
            }
            
            contentEl.innerHTML = `<div class="alert alert-danger m-3">${errorMessage}</div>`;
            contentEl.style.display = 'block';
            showNotification(errorMessage, 'error');
        })
        .finally(() => {
            // Always hide loader regardless of success/error
            hidePreviewLoader();
            currentPreviewController = null;
        });
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
    
    if (spinnerEl) {
        spinnerEl.style.display = 'flex';
        spinnerEl.classList.add('d-flex');
    }
    if (contentEl) {
        contentEl.style.display = 'none';
    }
}

function resetPreviewModal() {
    hidePreviewLoader();
    const contentEl = document.getElementById('previewContent');
    if (contentEl) {
        contentEl.innerHTML = '';
        contentEl.style.display = 'none';
    }
}

function printPreviewContent() {
    const contentEl = document.getElementById('previewContent');
    
    if (!contentEl || !contentEl.innerHTML.trim()) {
        showNotification('No content to print. Please wait for preview to load.', 'warning');
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
            
            /* Each clearance form should fit on one page */
            .clearance-form {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                page-break-before: auto;
                page-break-after: always;
                margin: 0;
                padding: 0;
            }
            
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
            
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
                font-size: 14px;
                margin: 0 0 2px 0;
                line-height: 1.1;
            }
            
            .subtitle {
                text-align: center;
                font-size: 10px;
                margin: 0 0 2px 0;
                line-height: 1.1;
            }
            
            .clearance {
                text-align: center;
                font-weight: bold;
                font-size: 12px;
                margin: 0 0 4px 0;
                line-height: 1.1;
            }
            
            .year {
                text-align: center;
                font-size: 10px;
                margin: 0 0 6px 0;
                line-height: 1.1;
            }
            
            .row-container {
                display: flex;
                justify-content: space-between;
                margin: 4px 0;
            }
            
            .name, .course {
                font-weight: bold;
                font-size: 10px;
                line-height: 1.1;
            }
            
            .row-line, .row-line-1 {
                text-decoration: underline;
                margin: 0 3px;
            }
            
            .desc {
                font-size: 9px;
                display: block;
                margin: 4px 0;
                line-height: 1.1;
            }
            
            .dept-table {
                width: 100%;
                border-collapse: collapse;
                margin: 4px 0;
                font-size: 8px;
                line-height: 1.1;
            }
            
            .dept-table th,
            .dept-table td {
                border: 1px solid #000;
                padding: 3px 4px;
                text-align: left;
                vertical-align: top;
            }
            
            .dept-table th {
                background-color: #f5f5f5;
                font-weight: bold;
                font-size: 8px;
            }
            
            .dept-table td {
                height: auto;
                min-height: 18px;
            }
            
            .approved-signature {
                color: #28a745;
                font-weight: bold;
                font-size: 8px;
            }
            
            .disapproved-signature {
                color: #dc3545;
                font-weight: bold;
                font-size: 8px;
            }
            
            .pending-signature {
                color: #6c757d;
                font-style: italic;
                font-size: 8px;
            }
            
            .signatory-reminder {
                font-size: 7px;
                margin: 3px 0;
                text-align: center;
                line-height: 1.1;
            }
            
            .purpose {
                font-size: 9px;
                font-weight: bold;
                margin: 3px 0 0 0;
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
            <meta charset="utf-8">
            <title>Clearance Forms</title>
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
                
                // Clean up iframe after printing
                setTimeout(() => {
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                }, 1000);
            } catch (e) {
                console.error('Print error:', e);
                showNotification('Print failed. Please try again.', 'error');
                if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                }
            }
        }, 100);
    };
    
    // Set iframe content
    iframe.srcdoc = fullHTML;
}

// Initialize print button and modal event handlers
document.addEventListener('DOMContentLoaded', function() {
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
});

// Initialize table sorting functionality
function initializeTableSorting() {
    const sortableHeaders = [
        { id: 'bm_sort_name', field: 'student_name' },
        { id: 'bm_sort_course', field: 'program' },
        { id: 'bm_sort_year', field: 'year_level' },
        { id: 'bm_sort_id', field: 'student_number' },
        { id: 'bm_sort_submitted', field: 'submitted_at' },
        { id: 'bm_sort_created', field: 'created_at' }
    ];
    
    sortableHeaders.forEach(header => {
        const element = document.getElementById(header.id);
        if (element) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', () => sortTable(header.field));
        }
    });
    
    // Set initial sort indicator
    updateSortIndicators();
}

// Sort table by field
function sortTable(field) {
    // Toggle sort order if same field, otherwise default to desc
    if (currentSortField === field) {
        currentSortOrder = currentSortOrder === 'desc' ? 'asc' : 'desc';
    } else {
        currentSortField = field;
        currentSortOrder = 'desc';
    }
    
    // Update visual indicators
    updateSortIndicators();
    
    // Reload data with new sorting
    loadClearanceData();
}

// Update sort indicators in table headers
function updateSortIndicators() {
    // Remove all existing sort indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Find the active header and add indicator
    const sortFieldMap = {
        'student_name': 'bm_sort_name',
        'program': 'bm_sort_course',
        'year_level': 'bm_sort_year',
        'student_number': 'bm_sort_id',
        'submitted_at': 'bm_sort_submitted',
        'created_at': 'bm_sort_created'
    };
    
    const headerId = sortFieldMap[currentSortField];
    const header = document.getElementById(headerId);
    if (header) {
        const indicator = document.createElement('i');
        indicator.className = `bi bi-caret-${currentSortOrder === 'asc' ? 'up' : 'down'}-fill ms-1 sort-indicator`;
        header.appendChild(indicator);
    }
}

// Success alert function to match signatory style
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

function showClearanceSuccessAlert(message) {
    showAlert(`<i class="bi bi-check-circle me-2"></i>${message}`, 'success');
}

// ========================================
// BULK APPROVE AND DISAPPROVE FUNCTIONALITY
// ========================================

// Global variables for bulk operations
let currentActionBM = null;
let currentDisapproveIdBM = null;

// Bulk Approve Functionality
function bulkApproveClearanceBM() {
    const selectedCheckboxes = document.querySelectorAll('.clearance-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select at least one clearance form to approve', 'warning');
        return;
    }
    
    // Filter out forms that are already approved or disapproved
    const actionableIds = [];
    const alreadyApproved = [];
    const alreadyDisapproved = [];
    
    selectedCheckboxes.forEach(checkbox => {
        const clearanceId = checkbox.value;
        const row = checkbox.closest('tr');
        
        // Find the business manager column (8th column - 0 indexed)
        const bmCell = row.children[8]; 
        
        if (bmCell) {
            const statusText = bmCell.textContent.trim();
            const studentName = row.children[1]?.textContent.trim() || clearanceId;
            
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
        const message = messages.length > 0 
            ? `No forms available for approval. ${messages.join('. ')}.`
            : 'No forms available for approval. All selected forms are already processed.';
        showNotification(message, 'warning');
        return;
    }
    
    // Show info about processed forms if any, but continue with actionable ones
    if (messages.length > 0) {
        showNotification(`${messages.join('. ')}. Proceeding with ${actionableIds.length} form(s) that need approval.`, 'info');
    }
    
    showBulkApproveSidebarBM(actionableIds);
}

// Bulk Disapprove Functionality  
function bulkDisapproveClearanceBM() {
    const selectedCheckboxes = document.querySelectorAll('.clearance-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select at least one clearance form to disapprove', 'warning');
        return;
    }
    
    // Filter out forms that are already disapproved or approved
    const actionableIds = [];
    const alreadyDisapproved = [];
    const alreadyApproved = [];
    
    selectedCheckboxes.forEach(checkbox => {
        const clearanceId = checkbox.value;
        const row = checkbox.closest('tr');
        
        // Find the business manager column (8th column - 0 indexed)
        const bmCell = row.children[8]; 
        
        if (bmCell) {
            const statusText = bmCell.textContent.trim();
            const studentName = row.children[1]?.textContent.trim() || clearanceId;
            
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
        const message = messages.length > 0 
            ? `No forms available for disapproval. ${messages.join('. ')}.`
            : 'No forms available for disapproval. All selected forms are already processed.';
        showNotification(message, 'warning');
        return;
    }
    
    // Show single comprehensive message if some forms were filtered out
    if (messages.length > 0) {
        const combinedMessage = `${messages.join('. ')}. Proceeding with ${actionableIds.length} form(s) that can be disapproved.`;
        showNotification(combinedMessage, 'info');
    }
    
    showBulkDisapproveSidebarBM(actionableIds);
}

// Show Bulk Approve Sidebar
function showBulkApproveSidebarBM(clearanceIds) {
    // Close any open sidebars first
    closeAllSidebarsBM();
    
    // Store clearance IDs and set bulk mode
    window.bulkClearanceIdsBM = clearanceIds;
    currentActionBM = 'bulk_approve';
    
    // Update sidebar title
    document.getElementById('bm_clearance_approve_title').textContent = `BULK APPROVE (${clearanceIds.length} items)`;
    
    const sidebar = document.getElementById('bm_clearance_otpSidebar');
    sidebar.classList.add('show');
    
    // Clear previous inputs
    document.getElementById('bm_clearance_otpinput').value = '';
    document.getElementById('bm_clearance_otpComment').value = '';
    document.getElementById('bm_clearance_otpError').style.display = 'none';
}

// Show Bulk Disapprove Sidebar  
function showBulkDisapproveSidebarBM(clearanceIds) {
    // Close any open sidebars first
    closeAllSidebarsBM();
    
    // Store clearance IDs and set bulk mode
    window.bulkClearanceIdsBM = clearanceIds;
    currentActionBM = 'bulk_disapprove';
    
    // Update sidebar title
    document.getElementById('bm_clearance_disapprove_title').textContent = `BULK DISAPPROVE (${clearanceIds.length} items)`;
    
    const sidebar = document.getElementById('bm_clearance_disapproveSidebar');
    sidebar.classList.add('show');
    
    // Reset to step 1
    document.getElementById('bm_clearance_disapprove_pin_step').style.display = 'block';
    document.getElementById('bm_clearance_disapprove_reason_step').style.display = 'none';
    
    // Clear previous inputs
    document.getElementById('bm_clearance_disapprove_pin_input').value = '';
    document.getElementById('bm_clearance_disapprove_pin_error').style.display = 'none';
    
    // Clear checkboxes and other inputs
    document.querySelectorAll('#bm_clearance_disapproveSidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('bm_clearance_disapproveComment').value = '';
    document.getElementById('bm_clearance_appointmentDate').value = '';
    document.getElementById('bm_clearance_otherReasonInput').value = '';
    document.getElementById('bm_clearance_otherReasonContainer').style.display = 'none';
}

// Close all sidebars
function closeAllSidebarsBM() {
    const sidebars = [
        document.getElementById('bm_clearance_otpSidebar'),
        document.getElementById('bm_clearance_disapproveSidebar')
    ];
    
    sidebars.forEach(sidebar => {
        if (sidebar) {
            sidebar.classList.remove('show');
        }
    });
    
    // Reset titles to default
    document.getElementById('bm_clearance_approve_title').textContent = 'APPROVAL PIN';
    document.getElementById('bm_clearance_disapprove_title').textContent = 'DISAPPROVE REASON';
    
    // Reset global variables
    currentActionBM = null;
    currentDisapproveIdBM = null;
    window.bulkClearanceIdsBM = null;
}

// Event Handlers for Bulk Operations
function setupBulkEventHandlers() {
    console.log('BMCLEARANCE: Setting up bulk event handlers');
    // Bulk Approve - PIN verification handler
    document.getElementById('bm_clearance_verifyOtpBtn').addEventListener('click', async function() {
        const pin = document.getElementById('bm_clearance_otpinput').value.trim();
        const comment = document.getElementById('bm_clearance_otpComment').value.trim();
        
        if (!pin) {
            document.getElementById('bm_clearance_otpError').style.display = 'block';
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('bm_clearance_verifyOtpBtn');
        console.log('BMCLEARANCE: Found submitBtn:', submitBtn);
        if (!submitBtn) {
            console.error('BMCLEARANCE: submitBtn not found!');
            return;
        }
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        try {
            let response;
            // Check if this is bulk or individual action
            if (currentActionBM === 'bulk_approve') {
                // Bulk approve
                response = await fetch('/business-manager/clearance/bulk-approve/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        clearance_ids: window.bulkClearanceIdsBM,
                        pin: pin,
                        comment: comment
                    })
                });
            } else {
                // Individual approve (existing functionality)
                response = await fetch('/business-manager/clearance/approve/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        clearance_id: currentDisapproveIdBM || currentClearanceId,
                        pin: pin,
                        comment: comment
                    })
                });
            }
            
            const result = await response.json();
            
            if (response.ok) {
                showNotification('Clearance(s) approved successfully', 'success');
                closeAllSidebarsBM();
                
                // Refresh data after successful operation
                setTimeout(() => {
                    loadClearanceData();
                }, 1000);
                
                if (currentActionBM === 'bulk_approve') {
                    // Clear bulk selection
                    document.querySelectorAll('.clearance-checkbox:checked').forEach(cb => cb.checked = false);
                    updateBulkActionsVisibility();
                }
            } else {
                if (result.error === 'Invalid PIN') {
                    document.getElementById('bm_clearance_otpError').style.display = 'block';
                } else {
                    showNotification(`Error: ${result.error}`, 'error');
                }
            }
        } catch (error) {
            console.error('Approval error:', error);
            showNotification('Failed to process approval', 'error');
        } finally {
            // Restore button state
            const submitBtn = document.getElementById('bm_clearance_verifyOtpBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });

    // Bulk Disapprove - PIN verification handler
    document.getElementById('bm_clearance_disapprove_pin_submit_btn').addEventListener('click', function() {
        const pin = document.getElementById('bm_clearance_disapprove_pin_input').value.trim();
        
        if (!pin) {
            document.getElementById('bm_clearance_disapprove_pin_error').style.display = 'block';
            document.getElementById('bm_clearance_disapprove_pin_error').textContent = 'PIN is required';
            return;
        }
        
        // Verify PIN with backend before proceeding to reason step
        fetch('/business-manager/verify-pin/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pin: pin })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Hide PIN error and move to reason step
                document.getElementById('bm_clearance_disapprove_pin_error').style.display = 'none';
                document.getElementById('bm_clearance_disapprove_pin_step').style.display = 'none';
                document.getElementById('bm_clearance_disapprove_reason_step').style.display = 'flex';
            } else {
                document.getElementById('bm_clearance_disapprove_pin_error').textContent = data.error || 'Invalid PIN';
                document.getElementById('bm_clearance_disapprove_pin_error').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('PIN verification error:', error);
            document.getElementById('bm_clearance_disapprove_pin_error').textContent = 'Error verifying PIN. Please try again.';
            document.getElementById('bm_clearance_disapprove_pin_error').style.display = 'block';
        });
    });
    
    // Bulk Disapprove - Submit with reasons
    document.getElementById('bm_clearance_submit_Appointment_Disapproval_Btn').addEventListener('click', async function() {
        let checkedReasons = Array.from(document.querySelectorAll('#bm_clearance_disapproveSidebar input[type="checkbox"]:checked')).map(cb => cb.value);
        const appointmentDate = document.getElementById('bm_clearance_appointmentDate').value;
        const comment = document.getElementById('bm_clearance_disapproveComment').value.trim();
        const pinInput = document.getElementById('bm_clearance_disapprove_pin_input').value.trim();
        
        const otherReasonChecked = document.getElementById('bm_clearance_reasonOther').checked;
        const otherReasonInput = document.getElementById('bm_clearance_otherReasonInput').value.trim();
        
        if (otherReasonChecked && otherReasonInput !== "") {
            checkedReasons = checkedReasons.filter(r => r !== "Other");
            checkedReasons.push(otherReasonInput);
        }
        
        document.getElementById('bm_clearance_disapproveError').style.display = 'none';
        document.getElementById('bm_clearance_appointmentError').style.display = 'none';
        
        if (checkedReasons.length === 0) {
            document.getElementById('bm_clearance_disapproveError').style.display = 'block';
            return;
        }
        
        if (!appointmentDate) {
            document.getElementById('bm_clearance_appointmentError').style.display = 'block';
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('bm_clearance_submit_Appointment_Disapproval_Btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        try {
            let response;
            // Check if this is bulk or individual action
            if (currentActionBM === 'bulk_disapprove') {
                // Bulk disapprove
                response = await fetch('/business-manager/clearance/bulk-disapprove/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        clearance_ids: window.bulkClearanceIdsBM,
                        pin: pinInput,
                        reason: checkedReasons.join(', '),
                        appointment_date: appointmentDate,
                        comment: comment
                    })
                });
            } else {
                // Individual disapprove (existing functionality)
                response = await fetch('/business-manager/clearance/disapprove/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        clearance_id: currentDisapproveIdBM || currentClearanceId,
                        pin: pinInput,
                        reasons: checkedReasons,
                        appointment_date: appointmentDate,
                        comment: comment
                    })
                });
            }
            
            const result = await response.json();
            
            if (response.ok) {
                showNotification('Clearance(s) disapproved successfully', 'success');
                closeAllSidebarsBM();
                
                // Refresh data after successful operation
                setTimeout(() => {
                    loadClearanceData();
                }, 1000);
                
                if (currentActionBM === 'bulk_disapprove') {
                    // Clear bulk selection
                    document.querySelectorAll('.clearance-checkbox:checked').forEach(cb => cb.checked = false);
                    updateBulkActionsVisibility();
                }
            } else {
                showNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Disapproval error:', error);
            showNotification('Failed to process disapproval', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// Call the setup function immediately and also on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBulkEventHandlers);
} else {
    setupBulkEventHandlers();
}

// Helper function to get CSRF token
function getCSRFToken() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    return cookieValue;
}