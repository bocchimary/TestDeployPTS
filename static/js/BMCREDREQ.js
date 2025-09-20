// Business Manager Credential Request - Matches Registrar Functionality Exactly
window.BMCredentialRequest = (function() {
    // Private variables
    let credentialData = [];
    let filteredData = [];
    let currentApproveId = null;
    let currentDisapproveId = null;
    let currentPreviewController = null;
    let currentEditMode = false;
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

    // Load credential data from API
    function loadCredentialData() {
        const tableBody = document.getElementById('bm_cred_req_table_body');
        if (!tableBody) return;

        // Show loading
        tableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-muted py-4">
                    <i class="bi bi-hourglass-split fs-1"></i><br>
                    Loading credential request data...
                </td>
            </tr>
        `;

        fetch('/registrar/document-release/api/data/', {
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

            credentialData = data.data || [];
            filteredData = [...credentialData];
            
            // Populate filter options
            populateFilterOptions();
            
            // Render table
            renderTable();
            
            console.log('Credential data loaded successfully:', credentialData.length, 'records');
        })
        .catch(error => {
            console.error('Error loading credential data:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle fs-1"></i><br>
                        Error loading data: ${error.message}
                    </td>
                </tr>
            `;
        });
    }

    // Populate filter dropdowns with unique values
    function populateFilterOptions() {
        const courseSet = new Set();
        const yearSet = new Set();
        const sectionSet = new Set();

        credentialData.forEach(item => {
            if (item.requester?.profile?.program) courseSet.add(item.requester.profile.program);
            if (item.requester?.profile?.year_level) yearSet.add(item.requester.profile.year_level);
            if (item.requester?.section) sectionSet.add(item.requester.section);
        });

        // Populate course filter
        const courseFilter = document.getElementById('bm_cred_req_filter_course');
        if (courseFilter) {
            courseFilter.innerHTML = '<option selected disabled>Filter by Course</option>';
            Array.from(courseSet).sort().forEach(course => {
                const option = document.createElement('option');
                option.value = course;
                option.textContent = course;
                courseFilter.appendChild(option);
            });
        }

        // Populate year filter
        const yearFilter = document.getElementById('bm_cred_req_filter_year');
        if (yearFilter) {
            yearFilter.innerHTML = '<option selected disabled>Filter by Year</option>';
            Array.from(yearSet).sort().forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            });
        }

        // Populate section filter
        const sectionFilter = document.getElementById('bm_cred_req_filter_section');
        if (sectionFilter) {
            sectionFilter.innerHTML = '<option selected disabled>Filter by Section</option>';
            Array.from(sectionSet).sort().forEach(section => {
                const option = document.createElement('option');
                option.value = section;
                option.textContent = section;
                sectionFilter.appendChild(option);
            });
        }
    }

    // Apply all active filters
    function applyFilters() {
        const courseFilter = document.getElementById('bm_cred_req_filter_course')?.value;
        const yearFilter = document.getElementById('bm_cred_req_filter_year')?.value;
        const sectionFilter = document.getElementById('bm_cred_req_filter_section')?.value;
        const statusFilter = document.getElementById('bm_cred_req_filter_status')?.value;
        const searchTerm = document.getElementById('bm_cred_req_search_input')?.value?.toLowerCase() || '';

        filteredData = credentialData.filter(item => {
            const matchesCourse = !courseFilter || courseFilter === 'Filter by Course' || item.requester?.profile?.program === courseFilter;
            const matchesYear = !yearFilter || yearFilter === 'Filter by Year' || item.requester?.profile?.year_level === yearFilter;
            const matchesSection = !sectionFilter || sectionFilter === 'Filter by Section' || item.requester?.section === sectionFilter;
            const matchesStatus = !statusFilter || statusFilter === 'Filter by Status' || item.status?.toLowerCase() === statusFilter.toLowerCase();
            const matchesSearch = !searchTerm || 
                item.requester?.full_name?.toLowerCase().includes(searchTerm) || 
                item.requester?.profile?.student_number?.toLowerCase().includes(searchTerm);

            return matchesCourse && matchesYear && matchesSection && matchesStatus && matchesSearch;
        });

        renderTable();
    }

    // Reset all filters
    function resetFilters() {
        document.getElementById('bm_cred_req_filter_course').selectedIndex = 0;
        document.getElementById('bm_cred_req_filter_year').selectedIndex = 0;
        document.getElementById('bm_cred_req_filter_section').selectedIndex = 0;
        document.getElementById('bm_cred_req_filter_status').selectedIndex = 0;
        document.getElementById('bm_cred_req_search_input').value = '';

        filteredData = [...credentialData];
        renderTable();
    }

    // Render table with current filtered data
    function renderTable() {
        const tableBody = document.getElementById('bm_cred_req_table_body');
        if (!tableBody) return;

        if (filteredData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-1"></i><br>
                        No credential requests found
                    </td>
                </tr>
            `;
            return;
        }

        const rows = filteredData.map(item => {
            const statusClass = getStatusClass(item.status);
            const bmStatus = getBMApprovalStatus(item);
            
            return `
                <tr data-id="${item.id}">
                    <td><input type="checkbox" class="row-checkbox" data-id="${item.id}"></td>
                    <td class="text-start">${item.requester?.full_name || ''}</td>
                    <td>${item.requester?.profile?.program || ''}</td>
                    <td>${item.requester?.profile?.year_level || ''}</td>
                    <td>${item.requester?.section || ''}</td>
                    <td>${item.requester?.profile?.student_number || ''}</td>
                    <td><small class="text-muted">${formatDate(item.created_at)}</small></td>
                    <td><small>${item.document_type || ''}</small></td>
                    <td><small>${item.purpose || ''}</small></td>
                    <td>${renderBMApprovalColumn(item)}</td>
                    <td><span class="badge ${statusClass}">${item.status || 'Pending'}</span></td>
                    <td>
                        <div class="d-flex gap-1 justify-content-center">
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="event.preventDefault(); BMCredentialRequest.printSingle('${item.id}'); return false;" title="Print">
                                <i class="bi bi-printer"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rows;
        updateBulkActionVisibility();
    }

    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    // Get status class for badge styling
    function getStatusClass(status) {
        switch(status?.toLowerCase()) {
            case 'pending': return 'bg-warning text-dark';
            case 'processing': return 'bg-info text-dark';
            case 'ready': return 'bg-success';
            case 'released': return 'bg-secondary';
            default: return 'bg-warning text-dark';
        }
    }

    // Get BM approval status
    function getBMApprovalStatus(item) {
        return item.business_manager_status || 'pending';
    }

    // Render Business Manager approval column
    function renderBMApprovalColumn(item) {
        const bmStatus = getBMApprovalStatus(item);
        const timestamp = item.business_manager_timestamp || '';
        
        if (bmStatus === 'approved') {
            return `<div class="text-success small">
                <i class="bi bi-check-circle"></i> Approved
                ${timestamp ? `<br><small class="text-muted">${timestamp}</small>` : ''}
            </div>`;
        } else if (bmStatus === 'disapproved') {
            return `<div class="text-danger small">
                <i class="bi bi-x-circle"></i> Disapproved
                ${timestamp ? `<br><small class="text-muted">${timestamp}</small>` : ''}
                <br><button type="button" class="btn btn-warning btn-xs mt-1" onclick="event.preventDefault(); editCredentialStatus('${item.id}'); return false;">Edit</button>
            </div>`;
        } else {
            return `<div class="d-flex flex-column align-items-center gap-1">
                <button type="button" class="btn btn-success btn-sm" onclick="event.preventDefault(); BMCredentialRequest.openApprovalSidebar('${item.id}'); return false;">Approve</button>
                <button type="button" class="btn btn-danger btn-sm" onclick="event.preventDefault(); BMCredentialRequest.openDisapprovalSidebar('${item.id}'); return false;">Disapprove</button>
            </div>`;
        }
    }

    // Bulk action functions
    function updateBulkActionVisibility() {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
        const bulkActions = document.getElementById('bm_cred_req_bulk_actions');
        const selectedCount = document.getElementById('bm_cred_req_selected_count');
        const selectAllCheckbox = document.getElementById('bm_cred_req_select_all');

        if (bulkActions && selectedCount) {
            if (checkedBoxes.length > 0) {
                bulkActions.style.display = 'block';
                selectedCount.textContent = `${checkedBoxes.length} selected`;
            } else {
                bulkActions.style.display = 'none';
            }
        }

        // Update select all checkbox state
        if (selectAllCheckbox) {
            if (checkedBoxes.length === 0) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            } else if (checkedBoxes.length === checkboxes.length) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            } else {
                selectAllCheckbox.indeterminate = true;
            }
        }
    }

    // Public API
    return {
        init: function() {
            console.log('Initializing Business Manager Credential Request...');
            
            // Set date
            const dateSpan = document.getElementById('bm_cred_req_dateToday');
            if (dateSpan) {
                const today = new Date();
                dateSpan.textContent = today.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            // Load data
            loadCredentialData();

            // Setup event listeners
            this.setupEventListeners();
        },

        setupEventListeners: function() {
            // Filter change events
            ['bm_cred_req_filter_course', 'bm_cred_req_filter_year', 'bm_cred_req_filter_section', 'bm_cred_req_filter_status'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', applyFilters);
                }
            });

            // Search input
            const searchInput = document.getElementById('bm_cred_req_search_input');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', function() {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(applyFilters, 300);
                });
            }

            // Reset filters button
            const resetBtn = document.getElementById('bm_cred_req_reset_filters');
            if (resetBtn) {
                resetBtn.addEventListener('click', resetFilters);
            }

            // Select all checkbox
            const selectAllCheckbox = document.getElementById('bm_cred_req_select_all');
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', function() {
                    const checkboxes = document.querySelectorAll('.row-checkbox');
                    checkboxes.forEach(cb => cb.checked = this.checked);
                    updateBulkActionVisibility();
                });
            }

            // Individual row checkboxes (delegated event)
            document.addEventListener('change', function(e) {
                if (e.target.classList.contains('row-checkbox')) {
                    updateBulkActionVisibility();
                }
            });

            // OTP/Approval sidebar events
            this.setupApprovalEvents();

            // Modal events
            this.setupModalEvents();
        },

        setupApprovalEvents: function() {
            // OTP verification
            const verifyOtpBtn = document.getElementById('bm_cred_req_verifyOtpBtn');
            if (verifyOtpBtn) {
                verifyOtpBtn.addEventListener('click', () => {
                    this.handleApproval(currentApproveId, 'approved');
                });
            }

            // Disapproval PIN verification
            const disapprovePinBtn = document.getElementById('bm_cred_req_disapprove_pin_submit_btn');
            if (disapprovePinBtn) {
                disapprovePinBtn.addEventListener('click', () => {
                    const pinInput = document.getElementById('bm_cred_req_disapprove_pin_input');
                    const pin = pinInput.value.trim();
                    
                    if (!pin) {
                        document.getElementById('bm_cred_req_disapprove_pin_error').style.display = 'block';
                        document.getElementById('bm_cred_req_disapprove_pin_error').textContent = 'PIN is required';
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
                            document.getElementById('bm_cred_req_disapprove_pin_error').style.display = 'none';
                            document.getElementById('bm_cred_req_disapprove_pin_step').style.display = 'none';
                            document.getElementById('bm_cred_req_disapprove_reason_step').style.display = 'block';
                        } else {
                            // PIN is invalid
                            document.getElementById('bm_cred_req_disapprove_pin_error').textContent = data.error || 'Invalid PIN';
                            document.getElementById('bm_cred_req_disapprove_pin_error').style.display = 'block';
                        }
                    })
                    .catch(error => {
                        console.error('Error verifying PIN:', error);
                        document.getElementById('bm_cred_req_disapprove_pin_error').textContent = 'Error verifying PIN. Please try again.';
                        document.getElementById('bm_cred_req_disapprove_pin_error').style.display = 'block';
                    });
                });
            }
            
            // Submit disapproval
            const submitDisapprovalBtn = document.getElementById('bm_cred_req_submit_Appointment_Disapproval_Btn');
            if (submitDisapprovalBtn) {
                submitDisapprovalBtn.addEventListener('click', () => {
                    this.handleDisapproval();
                });
            }

            // Close sidebar buttons
            const closeBtns = document.querySelectorAll('.btn-close, .cred-req-close-otp-btn, .cred-req-close-disapprove-btn');
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.closeOtpSidebar();
                    this.closeDisapproveSidebar();
                });
            });
        },

        setupModalEvents: function() {
            // Print preview modal
            const printBtn = document.getElementById('printPreviewBtn');
            if (printBtn) {
                printBtn.addEventListener('click', function() {
                    // Get the preview content and print only that
                    const previewContent = document.getElementById('previewContent');
                    if (previewContent && previewContent.innerHTML.trim()) {
                        // Create a new window for printing
                        const printWindow = window.open('', '_blank', 'width=800,height=600');
                        
                        // Write the content with proper styling
                        printWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Credential Request Form</title>
                                <style>
                                    body { 
                                        font-family: 'Open Sans', Arial, sans-serif;
                                        margin: 0;
                                        padding: 20px;
                                    }
                                    @media print {
                                        body { margin: 0; padding: 0; }
                                    }
                                </style>
                            </head>
                            <body>
                                ${previewContent.innerHTML}
                            </body>
                            </html>
                        `);
                        
                        printWindow.document.close();
                        
                        // Wait for content to load then print
                        setTimeout(() => {
                            printWindow.print();
                            printWindow.close();
                        }, 500);
                    } else {
                        console.error('No preview content available for printing');
                    }
                });
            }

            // Reset modal state when closed - match enrollment pattern
            const previewModal = document.getElementById('previewPrintModal');
            if (previewModal) {
                previewModal.addEventListener('hidden.bs.modal', function() {
                    // Cancel any ongoing request
                    if (currentPreviewController) {
                        currentPreviewController.abort();
                        currentPreviewController = null;
                    }
                    // Reset modal state
                    resetPreviewModal();
                });

                // Show loader when opening modal
                previewModal.addEventListener('show.bs.modal', function() {
                    showPreviewLoader();
                });
            }

        },

        openApprovalSidebar: function(id) {
            currentApproveId = id;
            currentEditMode = false; // Regular approval mode
            this.resetApprovalSidebar();
            this.showApprovalSidebar();
        },

        openDisapprovalSidebar: function(id) {
            currentDisapproveId = id;
            this.clearDisapprovalForm();
            this.closeOtpSidebar();
            document.getElementById('bm_cred_req_disapproveSidebar').classList.add('show');
        },

        openEditStatusSidebar: function(id) {
            console.log('openEditStatusSidebar called with id:', id);
            currentApproveId = id;
            currentEditMode = true; // Flag to indicate edit mode
            this.clearOtpInput();
            document.getElementById('bm_cred_req_otpError').style.display = 'none';
            this.closeDisapprovalSidebar();
            const sidebar = document.getElementById('bm_cred_req_otpSidebar');
            if (sidebar) {
                sidebar.classList.add('show');
                console.log('Edit sidebar should be visible now');
            } else {
                console.error('Edit sidebar element not found');
            }
        },

        closeOtpSidebar: function() {
            document.getElementById('bm_cred_req_otpSidebar').classList.remove('show');
        },

        closeDisapproveSidebar: function() {
            document.getElementById('bm_cred_req_disapproveSidebar').classList.remove('show');
        },

        clearOtpInput: function() {
            document.getElementById('bm_cred_req_otpComment').value = '';
            const input = document.getElementById('bm_cred_req_otpinput');
            input.value = '';
            input.focus();
        },

        clearDisapprovalForm: function() {
            // Clear PIN input
            document.getElementById('bm_cred_req_disapprove_pin_input').value = '';
            
            // Clear reason checkboxes
            const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="bm_cred_req_reason"]');
            checkboxes.forEach(checkbox => checkbox.checked = false);
            
            // Clear other reason input
            document.getElementById('bm_cred_req_otherReasonInput').value = '';
            document.getElementById('bm_cred_req_otherReasonContainer').style.display = 'none';
            
            // Clear comment and date
            document.getElementById('bm_cred_req_disapproveComment').value = '';
            document.getElementById('bm_cred_req_appointmentDate').value = '';
            
            // Hide errors
            document.getElementById('bm_cred_req_disapprove_pin_error').style.display = 'none';
            document.getElementById('bm_cred_req_disapproveError').style.display = 'none';
            document.getElementById('bm_cred_req_appointmentError').style.display = 'none';
            
            // Show PIN step, hide reason step
            document.getElementById('bm_cred_req_disapprove_pin_step').style.display = 'block';
            document.getElementById('bm_cred_req_disapprove_reason_step').style.display = 'none';
        },

        resetApprovalSidebar: function() {
            document.getElementById('bm_cred_req_otpComment').value = '';
            const input = document.getElementById('bm_cred_req_otpinput');
            if (input) {
                input.value = '';
                input.focus();
            }
            document.getElementById('bm_cred_req_otpError').style.display = 'none';
            
            // Reset edit-specific changes
            const approveBtn = document.getElementById('bm_cred_req_verifyOtpBtn');
            if (approveBtn) {
                approveBtn.textContent = 'APPROVE';
                approveBtn.classList.remove('btn-success');
                approveBtn.classList.add('btn-dark');
            }
            
            // Reset header text
            const header = document.querySelector('#bm_cred_req_otpSidebar h4');
            if (header) {
                header.textContent = 'APPROVAL PIN';
            }
        },

        showApprovalSidebar: function() {
            this.closeDisapproveSidebar();
            document.getElementById('bm_cred_req_otpSidebar').classList.add('show');
        },

        handleApproval: function(id, action) {
            const input = document.getElementById('bm_cred_req_otpinput');
            const comment = document.getElementById('bm_cred_req_otpComment').value.trim();
            const pin = input.value.trim();
            
            if (!pin) {
                document.getElementById('bm_cred_req_otpError').style.display = 'block';
                document.getElementById('bm_cred_req_otpError').textContent = 'PIN is required';
                return;
            }
            
            // Show loading state
            const submitBtn = document.getElementById('bm_cred_req_verifyOtpBtn');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            
            // Determine endpoint and request data based on bulk operation and edit mode
            const isBulkOperation = currentActionBM === 'bulk_approve';
            let endpoint, requestData;
            
            if (isBulkOperation) {
                endpoint = '/business-manager/credential-request/bulk-approve/';
                requestData = {
                    credential_ids: currentApproveId, // Array for bulk
                    pin: pin,
                    remarks: comment
                };
            } else {
                endpoint = currentEditMode ? 
                    '/business-manager/credential-request/edit-status/' : 
                    '/business-manager/credential-request/approve/';
                requestData = {
                    credential_id: id,
                    pin: pin,
                    comment: comment
                };
            }
            
            // Send approval/edit to backend
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const message = isBulkOperation ? data.message : 
                                  currentEditMode ? 'Credential status updated successfully!' : 
                                  'Credential request approved successfully!';
                    showAlert(message, 'success');
                    this.closeOtpSidebar();
                    currentEditMode = false; // Reset edit mode
                    
                    // Reset bulk operation state
                    if (isBulkOperation) {
                        currentActionBM = null;
                        // Reset sidebar title
                        const approveTitle = document.getElementById('bm_cred_req_approve_title');
                        if (approveTitle) {
                            approveTitle.textContent = 'APPROVAL PIN';
                        }
                    }
                    
                    loadCredentialData(); // Reload data
                } else {
                    document.getElementById('bm_cred_req_otpError').style.display = 'block';
                    document.getElementById('bm_cred_req_otpError').textContent = data.error || 'Operation failed';
                }
            })
            .catch(error => {
                console.error('Error approving credential request:', error);
                document.getElementById('bm_cred_req_otpError').style.display = 'block';
                document.getElementById('bm_cred_req_otpError').textContent = 'Network error occurred';
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });
        },

        handleDisapproval: function() {
            // Get selected reasons
            const reasons = [];
            const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="bm_cred_req_reason"]:checked');
            checkboxes.forEach(checkbox => {
                if (checkbox.value === 'Other' && checkbox.checked) {
                    const otherInput = document.getElementById('bm_cred_req_otherReasonInput');
                    if (otherInput.value.trim()) {
                        reasons.push(`Other: ${otherInput.value.trim()}`);
                    }
                } else {
                    reasons.push(checkbox.value);
                }
            });
            
            const comment = document.getElementById('bm_cred_req_disapproveComment').value.trim();
            const appointmentDate = document.getElementById('bm_cred_req_appointmentDate').value;
            const pin = document.getElementById('bm_cred_req_disapprove_pin_input').value.trim();
            
            // Validation
            if (reasons.length === 0) {
                document.getElementById('bm_cred_req_disapproveError').style.display = 'block';
                document.getElementById('bm_cred_req_disapproveError').textContent = 'Please select at least one reason';
                return;
            }
            
            if (!appointmentDate) {
                document.getElementById('bm_cred_req_appointmentError').style.display = 'block';
                document.getElementById('bm_cred_req_appointmentError').textContent = 'Please select an appointment date';
                return;
            }
            
            // Show loading state
            const submitBtn = document.getElementById('bm_cred_req_submit_Appointment_Disapproval_Btn');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            
            // Determine if this is bulk or individual operation
            const isBulkOperation = currentActionBM === 'bulk_disapprove';
            const url = isBulkOperation ? '/business-manager/credential-request/bulk-disapprove/' : '/business-manager/credential-request/disapprove/';
            
            const remarksText = reasons.join(", ") + (comment ? " - " + comment : "") + (appointmentDate ? " (Appointment: " + appointmentDate + ")" : "");
            
            const requestData = isBulkOperation ? {
                credential_ids: currentDisapproveIdBM, // Array for bulk
                pin: pin,
                remarks: remarksText,
                appointment_date: appointmentDate
            } : {
                credential_id: currentDisapproveId, // Single ID for individual
                pin: pin,
                reasons: reasons,
                comment: comment,
                appointment_date: appointmentDate
            };

            // Send disapproval to backend
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const message = isBulkOperation ? data.message : 'Credential request disapproved successfully!';
                    showAlert(message, 'success');
                    this.closeDisapproveSidebar();
                    
                    // Reset bulk operation state
                    if (isBulkOperation) {
                        currentActionBM = null;
                        currentDisapproveIdBM = null;
                        // Reset sidebar title
                        const disapproveTitle = document.getElementById('bm_cred_req_disapprove_title');
                        if (disapproveTitle) {
                            disapproveTitle.textContent = 'DISAPPROVE REASON';
                        }
                    }
                    
                    loadCredentialData(); // Reload data
                } else {
                    document.getElementById('bm_cred_req_disapproveError').style.display = 'block';
                    document.getElementById('bm_cred_req_disapproveError').textContent = data.error || 'Disapproval failed';
                }
            })
            .catch(error => {
                console.error('Error disapproving credential request:', error);
                document.getElementById('bm_cred_req_disapproveError').style.display = 'block';
                document.getElementById('bm_cred_req_disapproveError').textContent = 'Network error occurred';
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });
        },

        printSingle: function(id) {
            this.showPreviewPrintModal([id]);
        },


        showPreviewPrintModal: function(ids) {
            if (!ids || ids.length === 0) {
                showAlert('No credential requests selected for printing', 'warning');
                return;
            }
            
            const modal = new bootstrap.Modal(document.getElementById('previewPrintModal'));
            resetPreviewModal();
            modal.show();
            
            // Prepare IDs for the API call
            const idsParam = ids.join(',');
            
            // Cancel any existing request
            if (currentPreviewController) {
                currentPreviewController.abort();
            }
            
            // Create new controller for this request
            currentPreviewController = new AbortController();
            
            // Fetch preview content
            fetch(`/business-manager/credential-request/preview-print/?ids=${idsParam}`, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                signal: currentPreviewController.signal
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                hidePreviewLoader();
                const contentEl = document.getElementById('previewContent');
                // Store the raw HTML for printing
                contentEl.innerHTML = html;
                contentEl.style.display = 'block';
                currentPreviewController = null;
            })
            .catch(error => {
                if (error.name !== 'AbortError') {
                    console.error('Error loading preview:', error);
                    hidePreviewLoader();
                    const contentEl = document.getElementById('previewContent');
                    contentEl.innerHTML = `
                        <div class="text-center text-danger p-4">
                            <i class="bi bi-exclamation-triangle fs-1"></i><br>
                            Error loading preview: ${error.message}
                        </div>
                    `;
                    contentEl.style.display = 'block';
                }
                currentPreviewController = null;
            });
        },


        reload: function() {
            loadCredentialData();
        },

        editCredentialStatus: function(credentialId) {
            console.log('editCredentialStatus called with id:', credentialId);
            currentApproveId = credentialId;
            currentEditMode = true; // Set edit mode
            
            // Clear input and errors
            this.clearOtpInput();
            document.getElementById('bm_cred_req_otpError').style.display = 'none';
            this.closeDisapproveSidebar();
            
            // Change the button text to indicate this is an edit
            const approveBtn = document.getElementById('bm_cred_req_verifyOtpBtn');
            if (approveBtn) {
                approveBtn.textContent = 'UPDATE TO APPROVED';
                approveBtn.classList.remove('btn-dark');
                approveBtn.classList.add('btn-success');
            }
            
            // Add edit note
            const bodyElement = document.getElementById('bm_cred_req_otpSidebar').querySelector('.bm_cred_req_otp-body');
            if (bodyElement) {
                const existingNote = document.getElementById('credential-edit-status-note');
                if (!existingNote) {
                    const noteElement = document.createElement('div');
                    noteElement.id = 'credential-edit-status-note';
                    noteElement.className = 'alert alert-info small mb-3';
                    noteElement.innerHTML = '<i class="bi bi-info-circle me-1"></i>You are editing a disapproved credential to approved status.';
                    const firstP = bodyElement.querySelector('p');
                    if (firstP) {
                        bodyElement.insertBefore(noteElement, firstP);
                    }
                }
            }
            
            // Show the sidebar
            document.getElementById('bm_cred_req_otpSidebar').classList.add('show');
        },

        // Functions needed for bulk operations
        setBulkAction: function(action, ids) {
            currentActionBM = action;
            if (action === 'bulk_approve') {
                currentApproveId = ids;
            } else if (action === 'bulk_disapprove') {
                currentDisapproveIdBM = ids;
            }
        },

        getFilteredData: function() {
            return filteredData;
        },

        showAlert: function(message, type) {
            showAlert(message, type);
        },

        openApprovalSidebar: function(credentialId, isBulk = false) {
            if (!isBulk) {
                currentApproveId = credentialId;
                currentEditMode = false;
            }
            
            // Reset form
            document.getElementById('bm_cred_req_otpinput').value = '';
            document.getElementById('bm_cred_req_otpComment').value = '';
            document.getElementById('bm_cred_req_otpError').style.display = 'none';
            
            // Show the sidebar
            document.getElementById('bm_cred_req_otpSidebar').classList.add('show');
        },

        openDisapprovalSidebar: function(credentialId, isBulk = false) {
            if (!isBulk) {
                currentDisapproveId = credentialId;
            }
            
            // Reset form
            document.getElementById('bm_cred_req_disapprove_pin_step').style.display = 'block';
            document.getElementById('bm_cred_req_disapprove_reason_step').style.display = 'none';
            document.getElementById('bm_cred_req_disapprove_pin_input').value = '';
            document.getElementById('bm_cred_req_disapprove_pin_error').style.display = 'none';
            
            // Reset checkboxes and other fields
            document.querySelectorAll('#bm_cred_req_disapproveSidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.getElementById('bm_cred_req_disapproveComment').value = '';
            document.getElementById('bm_cred_req_appointmentDate').value = '';
            
            // Show the sidebar
            document.getElementById('bm_cred_req_disapproveSidebar').classList.add('show');
        }
    };
})();

// Legacy functions for compatibility
function toggleSidebar() {
    const bm_sidebar = document.getElementById("bm_sidebar");
    const bm_sidebar_backdrop = document.getElementById("bm_sidebar_sidebarBackdrop");

    if (window.innerWidth <= 768) {
        bm_sidebar.classList.remove("collapsed");
        bm_sidebar.classList.toggle("show");
        bm_sidebar_backdrop.classList.toggle("active");
    } else {
        bm_sidebar.classList.toggle("collapsed");
    }
}

function updateNotificationCount(count) {
    const badge = document.getElementById("bm_sidebar_notification_count");
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? "inline-block" : "none";
    }
}

// Bulk operations (global functions for onclick attributes)
function bulkApproveCredentialBM() {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        BMCredentialRequest.showAlert('Please select at least one credential request to approve', 'warning');
        return;
    }

    // Get selected credential data and filter actionable ones
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
    const selectedCredentials = BMCredentialRequest.getFilteredData().filter(cred => selectedIds.includes(cred.id));
    
    let actionableIds = [];
    let alreadyApproved = [];
    let alreadyDisapproved = [];
    
    selectedCredentials.forEach(credential => {
        const statusCell = document.querySelector(`tr input[data-id="${credential.id}"]`).closest('tr').children[9]; // Business Manager column
        const statusText = statusCell.textContent.trim();
        
        if (statusText.includes('Approved')) {
            alreadyApproved.push(credential.requester?.full_name || 'Unknown');
        } else if (statusText.includes('Disapproved')) {
            alreadyDisapproved.push(credential.requester?.full_name || 'Unknown');
        } else {
            actionableIds.push(credential.id);
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
        message = `${actionableIds.length} credential request(s) will be approved. ${skippedMessages.join('; ')}`;
        BMCredentialRequest.showAlert(message, 'info');
    } else if (alreadyApproved.length > 0 || alreadyDisapproved.length > 0) {
        let allProcessedMessages = [];
        if (alreadyApproved.length > 0) {
            allProcessedMessages.push(`${alreadyApproved.length} already approved: ${alreadyApproved.join(', ')}`);
        }
        if (alreadyDisapproved.length > 0) {
            allProcessedMessages.push(`${alreadyDisapproved.length} already disapproved: ${alreadyDisapproved.join(', ')}`);
        }
        message = `All selected credentials are already processed - ${allProcessedMessages.join('; ')}`;
        BMCredentialRequest.showAlert(message, 'info');
        return;
    }

    if (actionableIds.length === 0) {
        return;
    }

    // Set up bulk approval
    BMCredentialRequest.setBulkAction('bulk_approve', actionableIds);
    
    // Update sidebar title
    const approveTitle = document.getElementById('bm_cred_req_approve_title');
    if (approveTitle) {
        approveTitle.textContent = `BULK APPROVAL PIN (${actionableIds.length} items)`;
    }
    
    BMCredentialRequest.openApprovalSidebar(actionableIds[0], true);
}

function bulkDisapproveCredentialBM() {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        BMCredentialRequest.showAlert('Please select at least one credential request to disapprove', 'warning');
        return;
    }

    // Get selected credential data and filter actionable ones
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
    const selectedCredentials = BMCredentialRequest.getFilteredData().filter(cred => selectedIds.includes(cred.id));
    
    let actionableIds = [];
    let alreadyApproved = [];
    let alreadyDisapproved = [];
    
    selectedCredentials.forEach(credential => {
        const statusCell = document.querySelector(`tr input[data-id="${credential.id}"]`).closest('tr').children[9]; // Business Manager column
        const statusText = statusCell.textContent.trim();
        
        if (statusText.includes('Approved')) {
            alreadyApproved.push(credential.requester?.full_name || 'Unknown');
        } else if (statusText.includes('Disapproved')) {
            alreadyDisapproved.push(credential.requester?.full_name || 'Unknown');
        } else {
            actionableIds.push(credential.id);
        }
    });

    // Show combined message if needed
    let message = '';
    if ((alreadyApproved.length > 0 || alreadyDisapproved.length > 0) && actionableIds.length > 0) {
        let skippedMsg = '';
        if (alreadyApproved.length > 0) {
            skippedMsg += `${alreadyApproved.length} approved credential(s): ${alreadyApproved.join(', ')}`;
        }
        if (alreadyDisapproved.length > 0) {
            if (skippedMsg) skippedMsg += '; ';
            skippedMsg += `${alreadyDisapproved.length} already disapproved credential(s): ${alreadyDisapproved.join(', ')}`;
        }
        message = `${actionableIds.length} credential(s) will be disapproved. Skipped: ${skippedMsg}`;
        BMCredentialRequest.showAlert(message, 'info');
    } else if (alreadyApproved.length > 0 || alreadyDisapproved.length > 0) {
        let skippedMsg = '';
        if (alreadyApproved.length > 0) {
            skippedMsg = `${alreadyApproved.length} credential(s) are already approved: ${alreadyApproved.join(', ')}`;
        }
        if (alreadyDisapproved.length > 0) {
            if (skippedMsg) skippedMsg += '; ';
            skippedMsg += `${alreadyDisapproved.length} credential(s) are already disapproved: ${alreadyDisapproved.join(', ')}`;
        }
        BMCredentialRequest.showAlert(skippedMsg, 'info');
        return;
    }

    if (actionableIds.length === 0) {
        return;
    }

    // Set up bulk disapproval
    BMCredentialRequest.setBulkAction('bulk_disapprove', actionableIds);
    
    // Update sidebar title
    const disapproveTitle = document.getElementById('bm_cred_req_disapprove_title');
    if (disapproveTitle) {
        disapproveTitle.textContent = `BULK DISAPPROVAL REASON (${actionableIds.length} items)`;
    }
    
    BMCredentialRequest.openDisapprovalSidebar(actionableIds[0], true);
}

function bulkPrintCredentialRequest() {
    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
    if (checkedBoxes.length === 0) {
        showAlert('Please select at least one credential request to print.', 'warning');
        return;
    }
    
    const ids = Array.from(checkedBoxes).map(cb => cb.dataset.id);
    BMCredentialRequest.showPreviewPrintModal(ids);
}


// Global functions for template compatibility following enrollment pattern
function approveCredential(credentialId) {
    BMCredentialRequest.openApprovalSidebar(credentialId);
}

function disapproveCredential(credentialId) {
    BMCredentialRequest.openDisapprovalSidebar(credentialId);
}

function editCredentialStatus(credentialId) {
    BMCredentialRequest.editCredentialStatus(credentialId);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('BMCredentialRequest object:', window.BMCredentialRequest);
    BMCredentialRequest.init();
});

// Toggle other reason input visibility
function toggleOtherReasonInput() {
    const otherCheckbox = document.getElementById('bm_cred_req_reasonOther');
    const otherContainer = document.getElementById('bm_cred_req_otherReasonContainer');
    
    if (otherCheckbox && otherContainer) {
        otherContainer.style.display = otherCheckbox.checked ? 'block' : 'none';
        if (otherCheckbox.checked) {
            document.getElementById('bm_cred_req_otherReasonInput').focus();
        }
    }
}

// Handle window resize
window.addEventListener("resize", function () {
    const bm_sidebar = document.getElementById("bm_sidebar");
    const bm_sidebar_backdrop = document.getElementById("bm_sidebar_sidebarBackdrop");
    if (window.innerWidth > 768) {
        bm_sidebar.classList.remove("show");
        bm_sidebar_backdrop.classList.remove("active");
    }
});