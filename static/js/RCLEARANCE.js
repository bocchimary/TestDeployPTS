// Registrar Clearance JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Set current date
    const today = new Date();
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('registrar_clearance_dateToday').textContent = today.toLocaleDateString('en-US', dateOptions);

    // Initialize clearance functionality
    initializeClearance();
    
    // Initialize filters and search
    initializeFilters();
    
    // Load initial data
    loadClearanceData();
    
    // Add reset filters functionality
    addResetFiltersButton();
    
    // Set up periodic refresh for real-time updates (every 2 minutes when tab is visible)
    let refreshInterval;
    
    function startAutoRefresh() {
        // Only refresh if page is visible and no sidebar is open
        if (!document.hidden && !document.querySelector('.registrar_clearance_otp-sidebar.show')) {
            refreshInterval = setInterval(() => {
                if (!document.hidden && !document.querySelector('.registrar_clearance_otp-sidebar.show')) {
                    loadClearanceData();
                }
            }, 120000); // 2 minutes instead of 30 seconds
        }
    }
    
    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }
    
    // Start auto refresh
    startAutoRefresh();
    
    // Pause/resume auto refresh when tab visibility changes
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAutoRefresh();
        } else {
            startAutoRefresh();
        }
    });
});

// Sidebar toggle functionality
function toggleSidebar() {
    const sidebar = document.getElementById("registrar_sidebar");
    const backdrop = document.getElementById("registrar_sidebar_sidebarBackdrop");

    if (window.innerWidth <= 768) {
      registrar_sidebar.classList.remove("collapsed");
      registrar_sidebar.classList.toggle("show");
      registrar_sidebar_backdrop.classList.toggle("active");
    } else {
      registrar_sidebar.classList.toggle("collapsed");
    }
  }

let currentClearanceId = null;
let currentAction = null;

function initializeClearance() {
    // Add event listeners for approval/disapproval buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('registrar-clearance-action-btn')) {
            const action = e.target.getAttribute('data-action');
            const clearanceId = e.target.getAttribute('data-id');
            
            if (action === 'Approved') {
                showOtpSidebar(clearanceId, 'approve');
            } else if (action === 'Disapproved') {
                showDisapproveSidebar(clearanceId);
            }
        }
    });
    
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
        } else if (e.target.classList.contains('table-icon-delete')) {
            // Handle delete functionality
            const row = e.target.closest('tr');
            const checkbox = row.querySelector('.clearance-checkbox');
            if (checkbox) {
                const clearanceId = checkbox.value;
                deleteClearance(clearanceId);
            }
        }
    });
}

function initializeFilters() {
    // Filter change handlers with better error handling
    const filterElements = [
        'registrar_clearance_filter_course',
        'registrar_clearance_filter_year', 
        'registrar_clearance_filter_section',
        'registrar_clearance_filter_status'
    ];
    
    filterElements.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', function() {
        
                loadClearanceData();
            });
        }
    });
    
    // Search input handler with debounce
    const searchInput = document.getElementById('registrar_clearance_search_input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
        
                loadClearanceData();
            }, 300);
        });
    }
}

function loadClearanceData() {
    // Show loading state
    const tbody = document.querySelector('.registrar_clearance_table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="19" class="text-center text-muted py-4">
                    <i class="bi bi-hourglass-split fs-1"></i><br>
                    Loading clearance data...
                </td>
            </tr>
        `;
    }
    
    // Get filter values with null checks
    const course = document.getElementById('registrar_clearance_filter_course')?.value || '';
    const year = document.getElementById('registrar_clearance_filter_year')?.value || '';
    const section = document.getElementById('registrar_clearance_filter_section')?.value || '';
    const status = document.getElementById('registrar_clearance_filter_status')?.value || '';
    const search = document.getElementById('registrar_clearance_search_input')?.value || '';
    
    // Build query string
    const params = new URLSearchParams();
    if (course && course !== 'Filter by Course') params.append('course', course);
    if (year && year !== 'Filter by Year') params.append('year', year);
    if (section && section !== 'Filter by Section') params.append('section', section);
    if (status && status !== 'Filter by Status') params.append('status', status);
    if (search) params.append('search', search);
    

    
    // Fetch data
    fetch(`/registrar/clearance/api/data/?${params.toString()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                console.error('Error loading clearance data:', data.error);
                updateClearanceTable([]);
                return;
            }

            updateClearanceTable(data.clearance_data || []);
        })
        .catch(error => {
            console.error('Error loading clearance data:', error);
            updateClearanceTable([]);
        });
}

function updateClearanceTable(clearanceData) {
    const tbody = document.querySelector('.registrar_clearance_table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (clearanceData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="19" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i><br>
                    No clearance records found
                </td>
            </tr>
        `;
        return;
    }
    
    clearanceData.forEach(clearance => {
        const row = createClearanceRow(clearance);
        tbody.appendChild(row);
    });
    
    // Set up checkbox listeners for bulk actions
    setupCheckboxListeners();
}

function createClearanceRow(clearance) {
    const row = document.createElement('tr');
    
    // Get signatory statuses
    const signatories = clearance.signatories || {};
    console.log(`Creating row for clearance ${clearance.id}, signatories:`, signatories);
    
    // Define the order of signatories in the table
    const signatoryOrder = [
        'dorm_supervisor',
        'canteen_concessionaire', 
        'library_director',
        'scholarship_director',
        'it_director',
        'student_affairs',
        'cashier',
        'business_manager',
        'registrar',
        'academic_dean'
    ];
    
    // Generate signatory cells dynamically
    let signatoryCells = '';
    signatoryOrder.forEach((role, index) => {
        if (role === 'registrar') {
            // Special handling for registrar with action buttons
            console.log(`Processing registrar role, signatory data:`, signatories[role]);
            signatoryCells += `
                <td>
                    <div class="d-flex flex-column align-items-center gap-1">
                        ${getRegistrarActionButtons(clearance.id, signatories[role])}
                    </div>
                </td>
            `;
        } else {
            signatoryCells += `<td><div class="small text-muted">${getSignatoryStatus(signatories[role])}</div></td>`;
        }
    });
    
    row.innerHTML = `
        <td><input type="checkbox" class="clearance-checkbox" value="${clearance.id}"></td>
        <td class="text-start">${clearance.student_name || 'N/A'}</td>
        <td>${clearance.course || 'N/A'}</td>
        <td>${clearance.year || 'N/A'}</td>
        <td>${clearance.section || 'N/A'}</td>
        <td>${clearance.id_number || 'N/A'}</td>
        <td><div class="small text-muted">${clearance.date_submitted || 'N/A'}</div></td>
        ${signatoryCells}
        <td><div class="small text-muted">${getStatusBadge(clearance.status)}</div></td>
        <td>
            <div class="registrar_clearance_table-icons">
                <i class="bi bi-printer table-icon-print" title="Print"></i>
                <i class="bi bi-trash table-icon-delete" title="Delete"></i>
            </div>
        </td>
    `;
    
    return row;
}

function getSignatoryStatus(signatory) {
    if (!signatory) return '';
    
    const status = signatory.status;
    const timestamp = signatory.timestamp;
    
    if (status === 'approved') {
        return `<span class="text-success"><i class="bi bi-check-circle"></i> Approved</span><br><small>${timestamp || ''}</small>`;
    } else if (status === 'disapproved') {
        return `<span class="text-danger"><i class="bi bi-x-circle"></i> Disapproved</span><br><small>${timestamp || ''}</small>`;
    } else {
        return `<span class="text-warning"><i class="bi bi-clock"></i> Pending</span>`;
    }
}

function getStatusBadge(status) {
    switch(status) {
        case 'completed':
            return '<span class="badge bg-success">Completed</span>';
        case 'pending':
            return '<span class="badge bg-warning">Pending</span>';
        default:
            return '<span class="badge bg-secondary">Unknown</span>';
    }
}

function getRegistrarActionButtons(clearanceId, registrarSignatory) {
    console.log(`getRegistrarActionButtons called for clearance ${clearanceId} with signatory data:`, registrarSignatory);
    
    // If registrar has already taken action, show status text instead of buttons
    if (registrarSignatory && registrarSignatory.status) {
        console.log(`Registrar has status: ${registrarSignatory.status}`);
        const timestamp = registrarSignatory.timestamp || '';
        
        if (registrarSignatory.status === 'approved') {
            return `
                <div class="d-flex flex-column align-items-center gap-1">
                    <span class="text-success fw-bold"><i class="bi bi-check-circle"></i> Approved</span>
                    <small class="text-muted">${timestamp}</small>
                </div>
            `;
        } else if (registrarSignatory.status === 'disapproved') {
            return `
                <div class="d-flex flex-column align-items-center gap-1">
                    <span class="text-danger fw-bold"><i class="bi bi-x-circle"></i> Disapproved</span>
                    <small class="text-muted">${timestamp}</small>
                    <button type="button" class="btn btn-warning btn-sm mt-1" onclick="editDisapprovedClearance('${clearanceId}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                </div>
            `;
        } else if (registrarSignatory.status === 'pending') {
            console.log('Registrar status is pending, showing buttons');
            // If status is pending, show the buttons
            return `
                <div class="d-flex flex-column align-items-center gap-1">
                    <button type="button" class="btn btn-success btn-sm registrar-clearance-action-btn" data-action="Approved" data-id="${clearanceId}">Approve</button>
                    <button type="button" class="btn btn-danger btn-sm registrar-clearance-action-btn" data-action="Disapproved" data-id="${clearanceId}">Disapprove</button>
                </div>
            `;
        }
    }
    
    console.log('No registrar signatory data, showing buttons');
    // If no signatory data at all, show the buttons
    return `
        <div class="d-flex flex-column align-items-center gap-1">
            <button type="button" class="btn btn-success btn-sm registrar-clearance-action-btn" data-action="Approved" data-id="${clearanceId}">Approve</button>
            <button type="button" class="btn btn-danger btn-sm registrar-clearance-action-btn" data-action="Disapproved" data-id="${clearanceId}">Disapprove</button>
        </div>
    `;
}

// OTP Sidebar Functions
function showOtpSidebar(clearanceId, action) {
    // Close any open sidebars first
    closeAllSidebars();
    
    currentClearanceId = clearanceId;
    currentAction = action;
    
    // Update title for individual action
    document.getElementById('registrar_clearance_approve_title').textContent = 'APPROVAL PIN';
    
    const sidebar = document.getElementById('registrar_clearance_otpSidebar');
    sidebar.classList.add('show');
    
    // Clear previous inputs
    document.getElementById('registrar_clearance_otpinput').value = '';
    document.getElementById('registrar_clearance_otpComment').value = '';
    document.getElementById('registrar_clearance_otpError').style.display = 'none';
}

function closeOtpSidebar() {
    const sidebar = document.getElementById('registrar_clearance_otpSidebar');
    sidebar.classList.remove('show');
    currentClearanceId = null;
    currentAction = null;
}

// Disapprove Sidebar Functions
function showDisapproveSidebar(clearanceId) {
    // Close any open sidebars first
    closeAllSidebars();
    
    currentClearanceId = clearanceId;
    currentAction = 'disapprove';
    
    // Update title for individual action  
    document.getElementById('registrar_clearance_disapprove_title').textContent = 'DISAPPROVE REASON';
    
    const sidebar = document.getElementById('registrar_clearance_disapproveSidebar');
    sidebar.classList.add('show');
    
    // Reset to step 1
    document.getElementById('registrar_clearance_disapprove_pin_step').style.display = 'block';
    document.getElementById('registrar_clearance_disapprove_reason_step').style.display = 'none';
    
    // Clear previous inputs
    document.getElementById('registrar_clearance_disapprove_pin_input').value = '';
    document.getElementById('registrar_clearance_disapprove_pin_error').style.display = 'none';
    
    // Clear checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('registrar_clearance_otherReasonInput').value = '';
    document.getElementById('registrar_clearance_otherReasonContainer').style.display = 'none';
    document.getElementById('registrar_clearance_disapproveComment').value = '';
    document.getElementById('registrar_clearance_appointmentDate').value = '';
}

function closeDisapproveSidebar() {
    const sidebar = document.getElementById('registrar_clearance_disapproveSidebar');
    sidebar.classList.remove('show');
    currentClearanceId = null;
}

function closeAllSidebars() {
    // Close OTP sidebar
    const otpSidebar = document.getElementById('registrar_clearance_otpSidebar');
    if (otpSidebar) {
        otpSidebar.classList.remove('show');
    }
    
    // Close disapprove sidebar
    const disapproveSidebar = document.getElementById('registrar_clearance_disapproveSidebar');
    if (disapproveSidebar) {
        disapproveSidebar.classList.remove('show');
    }
    
    // Reset titles to default
    document.getElementById('registrar_clearance_approve_title').textContent = 'APPROVAL PIN';
    document.getElementById('registrar_clearance_disapprove_title').textContent = 'DISAPPROVE REASON';
    
    // Reset global variables
    currentClearanceId = null;
    currentAction = null;
    window.bulkClearanceIds = null;
}

// Event handlers
document.getElementById('registrar_clearance_verifyOtpBtn').addEventListener('click', function() {
    const pin = document.getElementById('registrar_clearance_otpinput').value;
    const comment = document.getElementById('registrar_clearance_otpComment').value;
    
    if (!pin) {
        document.getElementById('registrar_clearance_otpError').textContent = 'Please enter PIN';
        document.getElementById('registrar_clearance_otpError').style.display = 'block';
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('registrar_clearance_verifyOtpBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    // Check if this is bulk or individual action  
    if (currentAction === 'bulk_approve') {
        // Bulk approve
        fetch('/registrar/clearance/bulk-approve/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                clearance_ids: window.bulkClearanceIds,
                pin: pin,
                comment: comment
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeOtpSidebar();
                showNotification(data.message || 'Bulk approve completed successfully', 'success');
                
                // Immediately update UI for each clearance first
                window.bulkClearanceIds.forEach(clearanceId => {
                    console.log('Calling updateRegistrarActionUI for bulk approval...');
                    updateRegistrarActionUI(clearanceId, 'approved');
                });
                
                // Clear selections
                document.querySelectorAll('.clearance-checkbox:checked').forEach(cb => cb.checked = false);
                updateBulkActionVisibility();
                
                // Then reload table data after a short delay to ensure all columns are synced
                setTimeout(() => {
                    console.log('Reloading table data after bulk approval...');
                    loadClearanceData();
                }, 500); // Short delay to let immediate updates show first
            } else {
                document.getElementById('registrar_clearance_otpError').textContent = data.error || 'Failed to approve clearances';
                document.getElementById('registrar_clearance_otpError').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('registrar_clearance_otpError').textContent = 'Network error';
            document.getElementById('registrar_clearance_otpError').style.display = 'block';
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    } else {
        // Individual approve
        fetch('/registrar/clearance/approve/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
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
                closeOtpSidebar();
                showNotification('Clearance approved successfully!', 'success');
                
                // Immediately update the UI for this specific row first
                if (currentClearanceId) {
                    console.log('Calling updateRegistrarActionUI for individual approval...');
                    updateRegistrarActionUI(currentClearanceId, 'approved');
                }
                
                // Then reload table data after a short delay to ensure all columns are synced
                setTimeout(() => {
                    console.log('Reloading table data after individual approval...');
                    loadClearanceData();
                }, 500); // Short delay to let immediate update show first
            } else {
                console.log('Approval failed:', data.error);
                document.getElementById('registrar_clearance_otpError').textContent = data.error || 'Error approving clearance';
                document.getElementById('registrar_clearance_otpError').style.display = 'block';
                
                // If the error is "already approved", refresh the table to show correct status
                if (data.error && data.error.includes('already approved')) {
                    setTimeout(() => {
                        console.log('Refreshing table after already approved error...');
                        loadClearanceData();
                    }, 1000);
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('registrar_clearance_otpError').textContent = 'Network error';
            document.getElementById('registrar_clearance_otpError').style.display = 'block';
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }
});

document.getElementById('registrar_clearance_disapprove_pin_submit_btn').addEventListener('click', function() {
    const pin = document.getElementById('registrar_clearance_disapprove_pin_input').value;
    
    if (!pin) {
        document.getElementById('registrar_clearance_disapprove_pin_error').textContent = 'Please enter PIN';
        document.getElementById('registrar_clearance_disapprove_pin_error').style.display = 'block';
        return;
    }
    
    // Verify PIN first via backend
    // For registrar, reuse the enroll/graduation endpoints which now validate PIN server-side
    
    // Show step 2
    document.getElementById('registrar_clearance_disapprove_pin_step').style.display = 'none';
    document.getElementById('registrar_clearance_disapprove_reason_step').style.display = 'block';
    document.getElementById('registrar_clearance_disapprove_pin_error').style.display = 'none';
});

document.getElementById('registrar_clearance_submit_Appointment_Disapproval_Btn').addEventListener('click', function() {
    // Get selected reasons
    const reasons = [];
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        if (cb.value === 'Other') {
            const otherReason = document.getElementById('registrar_clearance_otherReasonInput').value;
            if (otherReason) {
                reasons.push(otherReason);
            }
        } else {
            reasons.push(cb.value);
        }
    });
    
    const comment = document.getElementById('registrar_clearance_disapproveComment').value;
    const appointmentDate = document.getElementById('registrar_clearance_appointmentDate').value;
    
    // Validate
    if (reasons.length === 0) {
        document.getElementById('registrar_clearance_disapproveError').style.display = 'block';
        return;
    }
    
    if (!appointmentDate) {
        document.getElementById('registrar_clearance_appointmentError').style.display = 'block';
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('registrar_clearance_submit_Appointment_Disapproval_Btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    // Check if this is bulk or individual action
    if (currentAction === 'bulk_disapprove') {
        // Bulk disapprove
        fetch('/registrar/clearance/bulk-disapprove/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                clearance_ids: window.bulkClearanceIds,
                pin: document.getElementById('registrar_clearance_disapprove_pin_input').value,
                reason: reasons.join(', '),
                comment: comment,
                appointment_date: appointmentDate
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeDisapproveSidebar();
                showNotification(data.message || 'Bulk disapprove completed successfully', 'success');
                
                // Immediately update UI for each clearance first
                window.bulkClearanceIds.forEach(clearanceId => {
                    console.log('Calling updateRegistrarActionUI for bulk disapproval...');
                    updateRegistrarActionUI(clearanceId, 'disapproved');
                });
                
                // Clear selections
                document.querySelectorAll('.clearance-checkbox:checked').forEach(cb => cb.checked = false);
                updateBulkActionVisibility();
                
                // Then reload table data after a short delay to ensure all columns are synced
                setTimeout(() => {
                    console.log('Reloading table data after bulk disapproval...');
                    loadClearanceData();
                }, 500); // Short delay to let immediate updates show first
            } else {
                document.getElementById('registrar_clearance_disapproveError').textContent = data.error || 'Failed to disapprove clearances';
                document.getElementById('registrar_clearance_disapproveError').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('registrar_clearance_disapproveError').textContent = 'Network error';
            document.getElementById('registrar_clearance_disapproveError').style.display = 'block';
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    } else {
        // Individual disapprove
        fetch('/registrar/clearance/disapprove/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                clearance_id: currentClearanceId,
                pin: document.getElementById('registrar_clearance_disapprove_pin_input').value,
                reasons: reasons,
                comment: comment,
                appointment_date: appointmentDate
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeDisapproveSidebar();
                showNotification('Clearance disapproved successfully!', 'success');
                
                // Immediately update the UI for this specific row first
                if (currentClearanceId) {
                    console.log('Calling updateRegistrarActionUI for individual disapproval...');
                    updateRegistrarActionUI(currentClearanceId, 'disapproved');
                }
                
                // Then reload table data after a short delay to ensure all columns are synced
                setTimeout(() => {
                    console.log('Reloading table data after individual disapproval...');
                    loadClearanceData();
                }, 500); // Short delay to let immediate update show first
            } else {
                console.log('Disapproval failed:', data.error);
                document.getElementById('registrar_clearance_disapproveError').textContent = data.error || 'Error disapproving clearance';
                document.getElementById('registrar_clearance_disapproveError').style.display = 'block';
                
                // If the error is "already disapproved", refresh the table to show correct status
                if (data.error && data.error.includes('already disapproved')) {
                    setTimeout(() => {
                        console.log('Refreshing table after already disapproved error...');
                        loadClearanceData();
                    }, 1000);
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('registrar_clearance_disapproveError').textContent = 'Network error';
            document.getElementById('registrar_clearance_disapproveError').style.display = 'block';
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }
});

// Utility functions
function toggleOtherReasonInput() {
    const otherCheckbox = document.getElementById('registrar_clearance_reasonOther');
    const otherContainer = document.getElementById('registrar_clearance_otherReasonContainer');
    
    if (otherCheckbox.checked) {
        otherContainer.style.display = 'block';
    } else {
        otherContainer.style.display = 'none';
        document.getElementById('registrar_clearance_otherReasonInput').value = '';
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function getCookie(name) {
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

document.addEventListener("DOMContentLoaded", function () {
    const resetButton = document.getElementById('registrar_clearance_reset_filters');
    if (resetButton) {
        resetButton.addEventListener('click', resetFilters);
    }
});


function resetFilters() {
    // Reset all filter dropdowns
    const filterElements = [
        'registrar_clearance_filter_course',
        'registrar_clearance_filter_year', 
        'registrar_clearance_filter_section',
        'registrar_clearance_filter_status'
    ];
    
    filterElements.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.selectedIndex = 0; // Reset to first option (disabled placeholder)
        }
    });
    
    // Reset search input
    const searchInput = document.getElementById('registrar_clearance_search_input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Reload data
    loadClearanceData();
}

function updateRegistrarActionUI(clearanceId, action) {
    console.log('updateRegistrarActionUI called with:', clearanceId, action);
    
    if (!clearanceId) {
        return;
    }
    
    // Get current timestamp in the same format as the API
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(now.getDate()).padStart(2, '0') + ' ' + 
                     String(now.getHours()).padStart(2, '0') + ':' + 
                     String(now.getMinutes()).padStart(2, '0');
    
    // Find the row with this clearance ID - look for any element with data-id
    const elementWithId = document.querySelector(`[data-id="${clearanceId}"]`);
    console.log(`Looking for element with data-id="${clearanceId}"`);
    
    if (!elementWithId) {
        console.log('No element found with clearance ID:', clearanceId);
        return;
    }
    
    const row = elementWithId.closest('tr');
    if (!row) {
        console.log('Row not found for clearance ID:', clearanceId);
        return;
    }
    
    // Get all cells in the row
    const allCells = Array.from(row.querySelectorAll('td'));
    console.log(`Found ${allCells.length} cells in row`);
    
    // Table structure (based on template):
    // 0: Checkbox, 1: Student Name, 2: Course, 3: Year, 4: Section, 5: ID Number, 6: Date Submitted
    // 7: Dorm Supervisor, 8: Canteen, 9: Library, 10: Scholarship, 11: IT, 12: Student Affairs
    // 13: Cashier, 14: Business Mgr, 15: Registrar, 16: Academic Dean, 17: Status, 18: Actions
    
    // The registrar column should be at index 15 (16th column)
    let registrarCell = null;
    if (allCells.length > 15) {
        registrarCell = allCells[15]; // 16th column (0-indexed)
        console.log('Found registrar cell at expected index 15');
    } else {
        // Fallback: look for cell with registrar-specific content
        for (let i = 7; i < allCells.length - 2; i++) { // Skip first 7 columns and last 2 (Status, Actions)
            const cell = allCells[i];
            // Check if this cell contains registrar-specific buttons or content
            if (cell.innerHTML.includes('Registrar') || 
                (cell.querySelector('.registrar-clearance-action-btn')) ||
                (cell.innerHTML.includes('Approve') && cell.innerHTML.includes('Disapprove'))) {
                registrarCell = cell;
                console.log(`Found registrar cell at fallback index ${i}`);
                break;
            }
        }
    }
    
    if (registrarCell) {
        console.log('Updating registrar cell content with action:', action);
        console.log('Current cell content:', registrarCell.innerHTML);
        
        // Replace the entire cell content with new status and timestamp
        if (action === 'approved') {
            registrarCell.innerHTML = `
                <div class="d-flex flex-column align-items-center gap-1">
                    <span class="text-success fw-bold"><i class="bi bi-check-circle"></i> Approved</span>
                    <small class="text-muted">${timestamp}</small>
                </div>
            `;
        } else if (action === 'disapproved') {
            registrarCell.innerHTML = `
                <div class="d-flex flex-column align-items-center gap-1">
                    <span class="text-danger fw-bold"><i class="bi bi-x-circle"></i> Disapproved</span>
                    <small class="text-muted">${timestamp}</small>
                    <button type="button" class="btn btn-warning btn-sm mt-1" onclick="editDisapprovedClearance('${clearanceId}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                </div>
            `;
        }
        console.log('Registrar cell updated successfully with timestamp:', timestamp);
        console.log('New cell content:', registrarCell.innerHTML);
    } else {
        console.log('Registrar cell not found for clearance ID:', clearanceId);
    }
}

// Function to edit a disapproved clearance
function editDisapprovedClearance(clearanceId) {
    // Show the approval sidebar for editing
    showOtpSidebar(clearanceId, 'edit_approved');
}

// Function to update any signatory status dynamically
function updateSignatoryStatus(clearanceId, signatoryRole, status, timestamp = null) {
    const row = document.querySelector(`[data-id="${clearanceId}"]`).closest('tr');
    if (!row) return;
    
    // Define the order of signatories in the table
    const signatoryOrder = [
        'dorm_supervisor',
        'canteen_concessionaire', 
        'library_director',
        'scholarship_director',
        'it_director',
        'student_affairs',
        'cashier',
        'business_manager',
        'registrar',
        'academic_dean'
    ];
    
    // Find the index of the signatory
    const signatoryIndex = signatoryOrder.indexOf(signatoryRole);
    if (signatoryIndex === -1) return;
    
    // Calculate the cell position (7 base columns + signatory index)
    const cellIndex = 7 + signatoryIndex;
    const signatoryCell = row.querySelector(`td:nth-child(${cellIndex + 1})`);
    
    if (signatoryCell) {
        if (signatoryRole === 'registrar') {
            // Special handling for registrar
            const actionContainer = signatoryCell.querySelector('.d-flex.flex-column.align-items-center.gap-1');
            if (actionContainer) {
                if (status === 'approved') {
                    actionContainer.innerHTML = '<span class="text-success fw-bold"><i class="bi bi-check-circle"></i> Approved</span>';
                } else if (status === 'disapproved') {
                    actionContainer.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-x-circle"></i> Disapproved</span>';
                }
            }
        } else {
            // Regular signatory status update
            signatoryCell.innerHTML = `<div class="small text-muted">${getSignatoryStatus({status, timestamp})}</div>`;
        }
    }
}

// Action Functions
function editClearance(clearanceId) {
    // Remove edit functionality since it's irrelevant for clearance forms
    console.log('Edit functionality removed - not applicable for clearance forms');
}

function printClearance(clearanceId) {
    // Single printing
    window.open(`/registrar/clearance/print/${clearanceId}/`, '_blank');
}

function bulkPrintClearance() {
    const selectedCheckboxes = document.querySelectorAll('.clearance-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select at least one clearance form to print', 'warning');
        return;
    }
    
    const clearanceIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    
    // Open new window for bulk printing
    const printWindow = window.open(`/registrar/clearance/bulk-print/?ids=${clearanceIds.join(',')}`, '_blank');
    
    if (!printWindow) {
        showNotification('Please allow pop-ups to print multiple forms', 'warning');
    }
}

function deleteClearance(clearanceId) {
    // Single delete
    showDeleteModal([clearanceId], false);
}

function showDeleteModal(clearanceIds, isBulk) {
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="deleteModalLabel">
                            <i class="bi bi-exclamation-triangle text-warning"></i>
                            Confirm Delete
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-3">
                            Are you sure you want to delete ${isBulk ? clearanceIds.length + ' clearance(s)' : 'this clearance'}?
                        </p>
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle"></i>
                            <strong>Warning:</strong> This action cannot be undone. The clearance data will be permanently removed.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle"></i> Cancel
                        </button>
                        <button type="button" class="btn btn-danger" onclick="confirmDelete('${clearanceIds.join(',')}', ${isBulk})">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('deleteModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
    
    // Clean up modal when hidden
    document.getElementById('deleteModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function confirmDelete(clearanceIdsString, isBulk) {
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    modal.hide();
    
    // Convert string back to array
    const clearanceIds = clearanceIdsString.split(',').map(id => id.trim());
    
    if (isBulk) {
        bulkDeleteClearance(clearanceIds);
    } else {
        performDeleteClearance(clearanceIds[0]);
    }
}

function bulkDeleteClearance(clearanceIds) {
    fetch('/registrar/clearance/bulk-delete/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            clearance_ids: clearanceIds
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(`Successfully deleted ${clearanceIds.length} clearance(s)`, 'success');
            loadClearanceData(); // Refresh the table
        } else {
            showNotification(data.error || 'Error deleting clearances', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error', 'danger');
    });
}

// Function for bulk delete from button click (no parameters)
function bulkDeleteClearanceFromButton() {
    const selectedCheckboxes = document.querySelectorAll('.clearance-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select at least one clearance form to delete', 'warning');
        return;
    }
    
    const clearanceIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    showDeleteModal(clearanceIds, true);
}

function performDeleteClearance(clearanceId) {
    fetch(`/registrar/clearance/delete/${clearanceId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Clearance deleted successfully', 'success');
            loadClearanceData(); // Refresh the table
        } else {
            showNotification(data.error || 'Error deleting clearance', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error', 'danger');
    });
}

// Checkbox functionality for bulk actions
function setupCheckboxListeners() {
    const selectAllCheckbox = document.getElementById('registrar_clearance_select_all');
    const individualCheckboxes = document.querySelectorAll('.clearance-checkbox');
    
    // Select all functionality
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            individualCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateBulkActions();
        });
    }
    
    // Individual checkbox functionality
    individualCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateBulkActions();
            updateSelectAllCheckbox();
        });
    });
}

function updateBulkActions() {
    const selectedCheckboxes = document.querySelectorAll('.clearance-checkbox:checked');
    const bulkActionsDiv = document.getElementById('registrar_clearance_bulk_actions');
    const selectedCountSpan = document.getElementById('registrar_clearance_selected_count');
    
    if (selectedCheckboxes.length > 0) {
        bulkActionsDiv.style.display = 'block';
        selectedCountSpan.textContent = `${selectedCheckboxes.length} selected`;
    } else {
        bulkActionsDiv.style.display = 'none';
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('registrar_clearance_select_all');
    const individualCheckboxes = document.querySelectorAll('.clearance-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.clearance-checkbox:checked');
    
    if (checkedCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCheckboxes.length === individualCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// Bulk Approve Functionality
function bulkApproveClearance() {
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
        
        // Find the registrar column (15th column - 0 indexed)
        const registrarCell = row.children[15]; 
        
        if (registrarCell) {
            const statusText = registrarCell.textContent.trim();
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
    
    showBulkApproveSidebar(actionableIds);
}

// Bulk Disapprove Functionality  
function bulkDisapproveClearance() {
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
        
        // Find the registrar column (15th column - 0 indexed)
        const registrarCell = row.children[15]; 
        
        if (registrarCell) {
            const statusText = registrarCell.textContent.trim();
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
    
    showBulkDisapproveSidebar(actionableIds);
}

// Show Bulk Approve Sidebar
function showBulkApproveSidebar(clearanceIds) {
    // Close any open sidebars first
    closeAllSidebars();
    
    // Store clearance IDs and set bulk mode
    window.bulkClearanceIds = clearanceIds;
    currentAction = 'bulk_approve';
    
    // Update sidebar title
    document.getElementById('registrar_clearance_approve_title').textContent = `BULK APPROVE (${clearanceIds.length} items)`;
    
    const sidebar = document.getElementById('registrar_clearance_otpSidebar');
    sidebar.classList.add('show');
    
    // Clear previous inputs
    document.getElementById('registrar_clearance_otpinput').value = '';
    document.getElementById('registrar_clearance_otpComment').value = '';
    document.getElementById('registrar_clearance_otpError').style.display = 'none';
}

// Show Bulk Disapprove Sidebar
function showBulkDisapproveSidebar(clearanceIds) {
    // Close any open sidebars first
    closeAllSidebars();
    
    // Store clearance IDs and set bulk mode
    window.bulkClearanceIds = clearanceIds;
    currentAction = 'bulk_disapprove';
    
    // Update sidebar title
    document.getElementById('registrar_clearance_disapprove_title').textContent = `BULK DISAPPROVE (${clearanceIds.length} items)`;
    
    const sidebar = document.getElementById('registrar_clearance_disapproveSidebar');
    sidebar.classList.add('show');
    
    // Reset to step 1
    document.getElementById('registrar_clearance_disapprove_pin_step').style.display = 'block';
    document.getElementById('registrar_clearance_disapprove_reason_step').style.display = 'none';
    
    // Clear previous inputs
    document.getElementById('registrar_clearance_disapprove_pin_input').value = '';
    document.getElementById('registrar_clearance_disapprove_pin_error').style.display = 'none';
    
    // Clear checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('registrar_clearance_otherReasonInput').value = '';
    document.getElementById('registrar_clearance_otherReasonContainer').style.display = 'none';
}

