// GraduationPrint namespace - COPIED FROM REGISTRAR
window.GraduationPrint = (function() {
    // Private variables
    let currentPreviewController = null;

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

    // Unified print function that accepts array of IDs - ADAPTED FOR BUSINESS MANAGER
    function printPreview(idsArray) {
        // Validate input
        if (!idsArray || !Array.isArray(idsArray) || idsArray.length === 0) {
            showAlert('No graduation forms selected for printing', 'warning');
            return;
        }

        // Verify modal elements exist
        const spinnerEl = document.getElementById('previewLoadingSpinner');
        const contentEl = document.getElementById('previewContent');
        const modalEl = document.getElementById('previewPrintModal');
        
        if (!spinnerEl || !contentEl || !modalEl) {
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
        
        // Show modal with proper focus management
        const modal = new bootstrap.Modal(modalEl, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        
        // Add proper event handlers for focus management
        modalEl.addEventListener('shown.bs.modal', function() {
            // Ensure modal has proper focus when shown
            modalEl.focus();
        });
        
        modalEl.addEventListener('hide.bs.modal', function() {
            // Remove focus from any buttons before hiding
            const focusedElement = modalEl.querySelector(':focus');
            if (focusedElement) {
                focusedElement.blur();
            }
        });
        
        modal.show();
        
        // Update modal title based on count
        const title = idsArray.length === 1 ? 
            'Preview & Print Graduation Form' : 
            `Preview & Print ${idsArray.length} Graduation Forms`;
        const titleEl = document.getElementById('previewPrintModalLabel');
        if (titleEl) {
            titleEl.innerHTML = `<i class="bi bi-printer me-2"></i>${title}`;
        }
        
        // Fetch preview content with timeout - BUSINESS MANAGER ENDPOINT
        const url = `/business-manager/graduation/preview-print/?ids=${idsArray.join(',')}`;
        
        currentPreviewController = new AbortController();
        const timeoutId = setTimeout(() => currentPreviewController.abort(), 15000);
        
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
                    throw new Error(`Server error: ${response.status} - ${text}`);
                });
            }
            return response.text();
        })
        .then(html => {
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from server');
            }
            
            contentEl.innerHTML = html;
            contentEl.style.display = 'block';
        })
        .catch(error => {
            clearTimeout(timeoutId);
            let errorMessage = 'Failed to load preview. Please try again.';
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out after 15 seconds. Please try again.';
            } else if (error.message.includes('Server error:')) {
                errorMessage = error.message;
            }
            
            contentEl.innerHTML = `<div class="alert alert-danger m-3">${errorMessage}</div>`;
            contentEl.style.display = 'block';
            showAlert(errorMessage, 'error');
        })
        .finally(() => {
            hidePreviewLoader();
            currentPreviewController = null;
        });
    }

    function printPreviewContent() {
        const contentEl = document.getElementById('previewContent');
        
        if (!contentEl || !contentEl.innerHTML.trim()) {
            showAlert('No content to print. Please wait for preview to load.', 'warning');
            return;
        }
        
        createPrintIframe(contentEl.innerHTML);
    }

    function createPrintIframe(htmlContent) {
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
                    
                    setTimeout(() => {
                        if (iframe.parentNode) {
                            document.body.removeChild(iframe);
                        }
                    }, 1000);
                } catch (e) {
                    console.error('Print error:', e);
                    showAlert('Print failed. Please try again.', 'error');
                    
                    // Fallback: open in new window
                    try {
                        const printWindow = window.open('', '_blank', 'width=800,height=600');
                        printWindow.document.open();
                        printWindow.document.write(htmlContent);
                        printWindow.document.close();
                        printWindow.focus();
                        setTimeout(() => printWindow.print(), 500);
                    } catch (fallbackError) {
                        showAlert('Print functionality is not available.', 'error');
                    }
                    
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                }
            }, 100);
        };
        
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(htmlContent);
        doc.close();
    }

    // Initialize event handlers - COPIED FROM REGISTRAR
    function initializePrintHandlers() {
        // Modal print button handler
        const printBtn = document.getElementById('printPreviewBtn');
        if (printBtn) {
            printBtn.addEventListener('click', function(e) {
                e.preventDefault();
                printPreviewContent();
            });
        }

        // Single print button handlers (replace inline onclick)
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('graduation-print-btn')) {
                e.preventDefault();
                const graduationId = e.target.dataset.id;
                if (graduationId) {
                    printPreview([graduationId]);
                }
            }
        });
    }

    // Get selected graduation IDs for bulk operations
    function getSelectedGraduationIds() {
        const selectedCheckboxes = document.querySelectorAll('.graduation-checkbox:checked');
        return Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    }

    // Cancel preview request on modal close and ensure proper cleanup
    function handleModalClose() {
        const modalEl = document.getElementById('previewPrintModal');
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', function() {
                if (currentPreviewController) {
                    currentPreviewController.abort();
                    currentPreviewController = null;
                }
                resetPreviewModal();
                
                // Force cleanup of modal state
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) {
                    modalInstance.dispose();
                }
                
                // Remove any stuck backdrops
                document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
                
                // Reset body state
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('overflow');
                document.body.style.removeProperty('padding-right');
            });
        }
    }

    // Public interface
    return {
        // Main print function - accepts array of graduation IDs
        print: printPreview,
        
        // Bulk print function
        bulkPrint: function() {
            const selectedIds = getSelectedGraduationIds();
            if (selectedIds.length === 0) {
                showAlert('Please select at least one graduation form to print', 'warning');
                return;
            }
            printPreview(selectedIds);
        },
        
        // Single print function
        printSingle: function(graduationId) {
            if (!graduationId) {
                showAlert('No graduation ID provided', 'error');
                return;
            }
            printPreview([graduationId]);
        },

        // Expose loader functions globally
        showPreviewLoader: showPreviewLoader,
        hidePreviewLoader: hidePreviewLoader,
        resetPreviewModal: resetPreviewModal,
        printPreviewContent: printPreviewContent,
        createPrintIframe: createPrintIframe,

        // Initialize function to be called on page load
        initialize: function() {
            initializePrintHandlers();
            handleModalClose();
        }
    };
})();

// Business Manager Graduation - Matches Registrar Functionality Exactly
window.BMGraduation = (function() {
    // Private variables
    let graduationData = [];
    let filteredData = [];
    let currentApproveId = null;
    let currentDisapproveId = null;
    let currentActionBM = null;
    let currentDisapproveIdBM = null;

    // CSRF token helper function - copied for BMGraduation scope
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

    // Load graduation data from API
    function loadGraduationData() {
        const tableBody = document.getElementById('bm_graduation_table_body');
        if (!tableBody) return;

        // Show loading
        tableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-muted py-4">
                    <i class="bi bi-hourglass-split fs-1"></i><br>
                    Loading graduation data...
                </td>
            </tr>
        `;

        fetch('/business-manager/graduation/api/data/', {
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

            graduationData = data.data || [];
            filteredData = [...graduationData];
            
            // Populate filter options
            populateFilterOptions();
            
            // Render table
            renderTable();
        })
        .catch(error => {
            console.error('Error loading graduation data:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle fs-1"></i><br>
                        Error loading graduation data: ${error.message}
                    </td>
                </tr>
            `;
        });
    }

    // Populate filter options based on available data
    function populateFilterOptions() {
        const courseSelect = document.getElementById('bm_graduation_filter_course');
        const yearSelect = document.getElementById('bm_graduation_filter_year');
        const sectionSelect = document.getElementById('bm_graduation_filter_section');

        if (courseSelect && yearSelect && sectionSelect) {
            const courses = [...new Set(graduationData.map(item => item.course))].filter(Boolean).sort();
            const years = [...new Set(graduationData.map(item => item.year))].filter(Boolean).sort();
            const sections = [...new Set(graduationData.map(item => item.section))].filter(Boolean).sort();

            // Populate courses
            courseSelect.innerHTML = '<option selected disabled>Filter by Course</option>';
            courses.forEach(course => {
                courseSelect.innerHTML += `<option value="${course}">${course}</option>`;
            });

            // Populate years
            yearSelect.innerHTML = '<option selected disabled>Filter by Year</option>';
            years.forEach(year => {
                yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
            });

            // Populate sections
            sectionSelect.innerHTML = '<option selected disabled>Filter by Section</option>';
            sections.forEach(section => {
                sectionSelect.innerHTML += `<option value="${section}">${section}</option>`;
            });
        }
    }

    // Render graduation table - COPIED FROM REGISTRAR
    function renderTable() {
        const tbody = document.getElementById('bm_graduation_table_body');
        if (!tbody) {
            return;
        }
        
        tbody.innerHTML = '';

        if (filteredData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="16" class="text-center text-muted py-4">
                        No graduation forms found
                    </td>
                </tr>
            `;
            return;
        }

        filteredData.forEach((graduation, index) => {
            const row = document.createElement('tr');
            
            const deanStatus = getSignatoryStatus(graduation.dean_status, graduation.dean_timestamp);
            const businessStatus = getBusinessManagerActionButtons(graduation.id, graduation.business_status, graduation.business_timestamp);
            const registrarStatus = getSignatoryStatus(graduation.registrar_status, graduation.registrar_timestamp);
            const presidentStatus = getSignatoryStatus(graduation.president_status, graduation.president_timestamp);
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="graduation-checkbox" value="${graduation.id}" data-index="${index}">
                </td>
                <td class="text-start">${graduation.student_name || 'N/A'}</td>
                <td>${graduation.course || 'N/A'}</td>
                <td>${graduation.year || 'N/A'}</td>
                <td>${graduation.section || 'N/A'}</td>
                <td>${graduation.id_number || 'N/A'}</td>
                <td><div class="small text-muted">${graduation.grad_appno || 'N/A'}</div></td>
                <td><div class="small text-muted">${graduation.date_submitted || 'N/A'}</div></td>
                <td>
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="BMGraduation.viewPDF('${graduation.id}')">
                        <i class="bi bi-file-pdf"></i> View Form
                    </button>
                </td>
                <td><div class="small text-muted">${deanStatus}</div></td>
                <td><div class="small text-muted">${businessStatus}</div></td>
                <td><div class="small text-muted">${registrarStatus}</div></td>
                <td><div class="small text-muted">${presidentStatus}</div></td>
                <td><div class="small text-muted">${getStatusBadge(graduation)}</div></td>
                <td>
                    <div class="bm_graduation_table-icons">
                        <i class="bi bi-printer table-icon-print graduation-print-btn" data-id="${graduation.id}" title="Print"></i>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        attachActionButtonListeners();
        setupCheckboxListeners();
    }

    // Get status badge HTML - COPIED FROM REGISTRAR
    function getStatusBadge(graduation) {
        const deanApproved = graduation.dean_status === 'approved';
        const businessApproved = graduation.business_status === 'approved';
        const registrarApproved = graduation.registrar_status === 'approved';
        const presidentApproved = graduation.president_status === 'approved';
        
        if (deanApproved && businessApproved && registrarApproved && presidentApproved) {
            return '<span class="badge bg-success">Completed</span>';
        } else {
            return '<span class="badge bg-warning">Pending</span>';
        }
    }

    // Get signatory status HTML - COPIED FROM REGISTRAR
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

    // Get business manager action buttons - ADAPTED FROM REGISTRAR
    function getBusinessManagerActionButtons(graduationId, businessStatus, businessTimestamp) {
        if (businessStatus && businessStatus !== 'pending') {
            if (businessStatus === 'approved') {
                return `<span class="text-success"><i class="bi bi-check-circle"></i> Approved</span><br><small>${businessTimestamp || ''}</small>`;
            } else if (businessStatus === 'disapproved') {
                return `
                    <span class="text-danger fw-bold"><i class="bi bi-x-circle"></i> Disapproved</span>
                    <button type="button" class="btn btn-warning btn-sm mt-1 graduation-edit-btn" data-id="${graduationId}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                `;
            }
        }
        
        return `
            <div class="d-flex flex-column gap-1">
                <button type="button" class="btn btn-success btn-sm business-manager-graduation-action-btn" data-action="Approved" data-id="${graduationId}">Approve</button>
                <button type="button" class="btn btn-danger btn-sm business-manager-graduation-action-btn" data-action="Disapproved" data-id="${graduationId}">Disapprove</button>
            </div>
        `;
    }

    // Attach action button listeners - COPIED FROM REGISTRAR
    function attachActionButtonListeners() {
        const buttons = document.querySelectorAll(".business-manager-graduation-action-btn");
        
        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                
                if (action === "Approved") {
                    showApproveSidebar(id);
                } else {
                    showDisapproveSidebar(id);
                }
            });
        });

        // Add edit button handlers
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('graduation-edit-btn')) {
                e.preventDefault();
                const graduationId = e.target.dataset.id;
                if (graduationId) {
                    editDisapprovedGraduation(graduationId);
                }
            }
            if (e.target.classList.contains('graduation-print-btn')) {
                e.preventDefault();
                const graduationId = e.target.dataset.id;
                if (graduationId) {
                    printForm(graduationId);
                }
            }
        });
    }

    // Setup checkbox functionality - COPIED FROM REGISTRAR
    function setupCheckboxListeners() {
        const selectAllCheckbox = document.getElementById('bm_graduation_select_all');
        const individualCheckboxes = document.querySelectorAll('.graduation-checkbox');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                individualCheckboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                });
                updateBulkActions();
            });
        }
        
        individualCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateBulkActions();
                updateSelectAllCheckbox();
            });
        });
    }

    // Update bulk actions display - COPIED FROM REGISTRAR
    function updateBulkActions() {
        const selectedCheckboxes = document.querySelectorAll('.graduation-checkbox:checked');
        const bulkActionsDiv = document.getElementById('bm_graduation_bulk_actions');
        const selectedCountSpan = document.getElementById('bm_graduation_selected_count');
        
        if (selectedCheckboxes.length > 0) {
            bulkActionsDiv.style.display = 'block';
            selectedCountSpan.textContent = `${selectedCheckboxes.length} selected`;
        } else {
            bulkActionsDiv.style.display = 'none';
        }
    }

    // Update select all checkbox state - COPIED FROM REGISTRAR
    function updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('bm_graduation_select_all');
        const individualCheckboxes = document.querySelectorAll('.graduation-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.graduation-checkbox:checked');
        
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

    // Edit disapproved graduation - COPIED FROM REGISTRAR
    function editDisapprovedGraduation(graduationId) {
        editStatus(graduationId);
    }

    // Show approval sidebar
    function showApproveSidebar(graduationId) {
        currentApproveId = graduationId;
        
        // Clear previous inputs
        document.getElementById('bm_graduation_otpinput').value = '';
        document.getElementById('bm_graduation_otpComment').value = '';
        document.getElementById('bm_graduation_otpError').style.display = 'none';
        
        // Close other sidebar and show approval
        closeDisapproveSidebar();
        document.getElementById('bm_graduation_otpSidebar').classList.add('show');
    }

    // Show disapproval sidebar
    function showDisapproveSidebar(graduationId) {
        currentDisapproveId = graduationId;
        
        // Reset disapproval form
        resetDisapprovalForm();
        
        // Close other sidebar and show disapproval
        closeApprovalSidebar();
        document.getElementById('bm_graduation_disapproveSidebar').classList.add('show');
        
        // Show PIN step initially
        document.getElementById('bm_graduation_disapprove_pin_step').style.display = 'block';
        document.getElementById('bm_graduation_disapprove_reason_step').style.display = 'none';
    }

    // Reset disapproval form
    function resetDisapprovalForm() {
        // Clear PIN step
        document.getElementById('bm_graduation_disapprove_pin_input').value = '';
        document.getElementById('bm_graduation_disapprove_pin_error').style.display = 'none';
        
        // Clear reason step
        document.querySelectorAll('#bm_graduation_disapproveSidebar input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        document.getElementById('bm_graduation_otherReasonInput').value = '';
        document.getElementById('bm_graduation_otherReasonContainer').style.display = 'none';
        document.getElementById('bm_graduation_disapproveComment').value = '';
        document.getElementById('bm_graduation_appointmentDate').value = '';
        document.getElementById('bm_graduation_disapproveError').style.display = 'none';
        document.getElementById('bm_graduation_appointmentError').style.display = 'none';
    }

    // Close approval sidebar
    function closeApprovalSidebar() {
        document.getElementById('bm_graduation_otpSidebar').classList.remove('show');
    }

    // Close disapproval sidebar  
    function closeDisapproveSidebar() {
        document.getElementById('bm_graduation_disapproveSidebar').classList.remove('show');
    }

    // Handle approval submission
    function submitApproval() {
        const pin = document.getElementById('bm_graduation_otpinput').value.trim();
        const comment = document.getElementById('bm_graduation_otpComment').value.trim();
        
        if (!pin) {
            showAlert('Please enter your PIN', 'warning');
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('bm_graduation_verifyOtpBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        // Determine if this is bulk or individual operation
        const isBulkOperation = currentActionBM === 'bulk_approve';
        const url = isBulkOperation ? '/business-manager/graduation/bulk-approve/' : '/business-manager/graduation/approve/';
        
        const requestData = isBulkOperation ? {
            graduation_ids: currentApproveId, // Array for bulk
            pin: pin,
            remarks: comment
        } : {
            graduation_id: currentApproveId, // Single ID for individual
            pin: pin,
            comment: comment
        };

        fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message || 'Graduation form approved successfully', 'success');
                closeApprovalSidebar();
                // Reset bulk operation state
                if (isBulkOperation) {
                    currentActionBM = null;
                    // Reset sidebar title
                    const approveTitle = document.getElementById('bm_graduation_approve_title');
                    if (approveTitle) {
                        approveTitle.textContent = 'APPROVAL PIN';
                    }
                }
                // Add delay to ensure database transaction is committed
                setTimeout(() => {
                    loadGraduationData(); // Reload data
                }, 1000);
            } else {
                document.getElementById('bm_graduation_otpError').style.display = 'block';
                document.getElementById('bm_graduation_otpError').textContent = data.error || 'Invalid PIN';
            }
        })
        .catch(error => {
            console.error('Error approving graduation:', error);
            showAlert('Error approving graduation form', 'danger');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }

    // Handle PIN verification for disapproval
    function verifyDisapprovalPin() {
        const pin = document.getElementById('bm_graduation_disapprove_pin_input').value.trim();
        
        if (!pin) {
            showAlert('Please enter your PIN', 'warning');
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
                document.getElementById('bm_graduation_disapprove_pin_step').style.display = 'none';
                document.getElementById('bm_graduation_disapprove_reason_step').style.display = 'block';
            } else {
                // PIN is invalid
                showAlert(data.error || 'Invalid PIN', 'error');
            }
        })
        .catch(error => {
            console.error('Error verifying PIN:', error);
            showAlert('Error verifying PIN. Please try again.', 'error');
        });
    }

    // Handle disapproval submission
    function submitDisapproval() {
        const pin = document.getElementById('bm_graduation_disapprove_pin_input').value.trim();
        let reasons = [];
        
        // Get selected reasons
        document.querySelectorAll('#bm_graduation_disapproveSidebar input[type="checkbox"]:checked').forEach(cb => {
            if (cb.value === 'Other') {
                const otherReason = document.getElementById('bm_graduation_otherReasonInput').value.trim();
                if (otherReason) {
                    reasons.push(otherReason);
                }
            } else {
                reasons.push(cb.value);
            }
        });

        const appointmentDate = document.getElementById('bm_graduation_appointmentDate').value;
        const comment = document.getElementById('bm_graduation_disapproveComment').value.trim();

        // Validate inputs
        document.getElementById('bm_graduation_disapproveError').style.display = 'none';
        document.getElementById('bm_graduation_appointmentError').style.display = 'none';

        if (reasons.length === 0) {
            document.getElementById('bm_graduation_disapproveError').style.display = 'block';
            return;
        }

        if (!appointmentDate) {
            document.getElementById('bm_graduation_appointmentError').style.display = 'block';
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('bm_graduation_submit_Appointment_Disapproval_Btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        // Determine if this is bulk or individual operation
        const isBulkOperation = currentActionBM === 'bulk_disapprove';
        const url = isBulkOperation ? '/business-manager/graduation/bulk-disapprove/' : '/business-manager/graduation/disapprove/';
        
        const remarksText = reasons.join(", ") + (comment ? " - " + comment : "") + (appointmentDate ? " (Appointment: " + appointmentDate + ")" : "");
        
        const requestData = isBulkOperation ? {
            graduation_ids: currentDisapproveIdBM, // Array for bulk
            pin: pin,
            remarks: remarksText,
            appointment_date: appointmentDate
        } : {
            graduation_id: currentDisapproveId, // Single ID for individual
            pin: pin,
            reasons: reasons,
            appointment_date: appointmentDate,
            comment: comment
        };

        fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message || 'Graduation form disapproved successfully', 'success');
                closeDisapproveSidebar();
                // Reset bulk operation state
                if (isBulkOperation) {
                    currentActionBM = null;
                    currentDisapproveIdBM = null;
                    // Reset sidebar title
                    const disapproveTitle = document.getElementById('bm_graduation_disapprove_title');
                    if (disapproveTitle) {
                        disapproveTitle.textContent = 'DISAPPROVE REASON';
                    }
                }
                // Add delay to ensure database transaction is committed
                setTimeout(() => {
                    loadGraduationData(); // Reload data
                }, 1000);
            } else {
                showAlert(data.error || 'Error disapproving graduation form', 'danger');
            }
        })
        .catch(error => {
            console.error('Error disapproving graduation:', error);
            showAlert('Error disapproving graduation form', 'danger');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }

    // Edit status functionality
    function editStatus(graduationId) {
        // Show approval sidebar for editing
        showApproveSidebar(graduationId);
        
        // Change the submit button to call edit status endpoint
        const verifyBtn = document.getElementById('bm_graduation_verifyOtpBtn');
        verifyBtn.textContent = 'UPDATE STATUS';
        verifyBtn.onclick = function() {
            submitStatusEdit(graduationId);
        };
    }

    // Submit status edit
    function submitStatusEdit(graduationId) {
        const pin = document.getElementById('bm_graduation_otpinput').value.trim();
        const comment = document.getElementById('bm_graduation_otpComment').value.trim();
        
        if (!pin) {
            showAlert('Please enter your PIN', 'warning');
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('bm_graduation_verifyOtpBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        fetch('/business-manager/graduation/edit-status/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                graduation_id: graduationId,
                pin: pin,
                comment: comment
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message || 'Graduation form status updated successfully', 'success');
                closeApprovalSidebar();
                loadGraduationData(); // Reload data
                
                // Reset button
                submitBtn.textContent = 'APPROVE';
                submitBtn.onclick = submitApproval;
            } else {
                document.getElementById('bm_graduation_otpError').style.display = 'block';
                document.getElementById('bm_graduation_otpError').textContent = data.error || 'Invalid PIN';
            }
        })
        .catch(error => {
            console.error('Error updating graduation status:', error);
            showAlert('Error updating graduation form status', 'danger');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }

    // Apply filters
    function applyFilters() {
        const courseFilter = document.getElementById('bm_graduation_filter_course').value;
        const yearFilter = document.getElementById('bm_graduation_filter_year').value;
        const sectionFilter = document.getElementById('bm_graduation_filter_section').value;
        const statusFilter = document.getElementById('bm_graduation_filter_status').value;
        const searchTerm = document.getElementById('bm_graduation_search_input').value.toLowerCase().trim();

        filteredData = graduationData.filter(item => {
            const matchesCourse = !courseFilter || courseFilter === 'Filter by Course' || item.course === courseFilter;
            const matchesYear = !yearFilter || yearFilter === 'Filter by Year' || item.year == yearFilter;
            const matchesSection = !sectionFilter || sectionFilter === 'Filter by Section' || item.section === sectionFilter;
            const matchesStatus = !statusFilter || statusFilter === 'Filter by Status' || item.overall_status === statusFilter;
            const matchesSearch = !searchTerm || 
                item.student_name.toLowerCase().includes(searchTerm) ||
                item.id_number.toLowerCase().includes(searchTerm) ||
                (item.grad_appno && item.grad_appno.toLowerCase().includes(searchTerm));

            return matchesCourse && matchesYear && matchesSection && matchesStatus && matchesSearch;
        });

        renderTable();
    }

    // Reset filters
    function resetFilters() {
        document.getElementById('bm_graduation_filter_course').selectedIndex = 0;
        document.getElementById('bm_graduation_filter_year').selectedIndex = 0;
        document.getElementById('bm_graduation_filter_section').selectedIndex = 0;
        document.getElementById('bm_graduation_filter_status').selectedIndex = 0;
        document.getElementById('bm_graduation_search_input').value = '';
        
        filteredData = [...graduationData];
        renderTable();
    }

    // Update selection count
    function updateSelectionCount() {
        const checkboxes = document.querySelectorAll('.graduation-checkbox:checked');
        const count = checkboxes.length;
        const countElement = document.getElementById('bm_graduation_selected_count');
        const bulkActions = document.getElementById('bm_graduation_bulk_actions');
        const selectAllCheckbox = document.getElementById('bm_graduation_select_all');

        if (countElement) {
            countElement.textContent = `${count} selected`;
        }

        if (bulkActions) {
            bulkActions.style.display = count > 0 ? 'block' : 'none';
        }

        // Update select all checkbox state
        if (selectAllCheckbox) {
            const allCheckboxes = document.querySelectorAll('.graduation-checkbox');
            if (count === 0) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            } else if (count === allCheckboxes.length) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            } else {
                selectAllCheckbox.indeterminate = true;
            }
        }
    }

    // Toggle select all
    function toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('bm_graduation_select_all');
        const checkboxes = document.querySelectorAll('.graduation-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        
        updateSelectionCount();
    }





    // Print individual form - COPIED FROM REGISTRAR
    function printForm(graduationId) {
        if (window.GraduationPrint) {
            window.GraduationPrint.printSingle(graduationId);
        }
    }

    // Print preview - COPIED FROM REGISTRAR
    function printPreview() {
        if (window.GraduationPrint) {
            window.GraduationPrint.printPreviewContent();
        }
    }

    // View PDF - Use consistent modal design
    function viewPDF(graduationId) {
        console.log('viewPDF called with ID:', graduationId);
        if (!graduationId) {
            showAlert('No graduation ID provided', 'warning');
            return;
        }

        const modal = new bootstrap.Modal(document.getElementById('pdfPreviewModal'));
        const loadingEl = document.getElementById('pdfPreviewLoading');
        const contentEl = document.getElementById('pdfPreviewContent');
        
        // Show loading
        loadingEl.style.display = 'flex';
        contentEl.style.display = 'none';
        contentEl.innerHTML = '';
        
        // Show modal
        modal.show();
        
        // Load form content
        fetch(`/business-manager/graduation/view/${graduationId}/`)
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

    // Bulk print - COPIED FROM REGISTRAR
    function bulkPrint() {
        if (window.GraduationPrint) {
            window.GraduationPrint.bulkPrint();
        }
    }

    // Initialize date display
    function initializeDateDisplay() {
        const dateSpan = document.getElementById('bm_graduation_dateToday');
        if (dateSpan) {
            const today = new Date();
            const formatted = today.toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            dateSpan.textContent = formatted;
        }
    }

    // Initialize the module
    function init() {
        initializeDateDisplay();
        loadGraduationData();
        
        // Set up event listeners immediately (not nested in DOMContentLoaded)
        setupEventListeners();
    }

    // Set up all event listeners
    function setupEventListeners() {
        // Filter change events
        document.getElementById('bm_graduation_filter_course')?.addEventListener('change', applyFilters);
        document.getElementById('bm_graduation_filter_year')?.addEventListener('change', applyFilters);
        document.getElementById('bm_graduation_filter_section')?.addEventListener('change', applyFilters);
        document.getElementById('bm_graduation_filter_status')?.addEventListener('change', applyFilters);
        
        // Search input event
        document.getElementById('bm_graduation_search_input')?.addEventListener('input', applyFilters);
        
        // Reset filters button
        document.getElementById('bm_graduation_reset_filters')?.addEventListener('click', resetFilters);
        
        // Select all checkbox
        document.getElementById('bm_graduation_select_all')?.addEventListener('change', toggleSelectAll);
        
        // Sidebar close buttons
        document.querySelector('.graduation-close-otp-btn')?.addEventListener('click', closeApprovalSidebar);
        document.querySelector('.graduation-close-disapprove-btn')?.addEventListener('click', closeDisapproveSidebar);
        
        // Approval sidebar submit
        document.getElementById('bm_graduation_verifyOtpBtn')?.addEventListener('click', submitApproval);
        
        // Disapproval PIN verification
        document.getElementById('bm_graduation_disapprove_pin_submit_btn')?.addEventListener('click', verifyDisapprovalPin);
        
        // Disapproval submission
        document.getElementById('bm_graduation_submit_Appointment_Disapproval_Btn')?.addEventListener('click', submitDisapproval);
        
        // Other reason toggle
        document.querySelector('.graduation-reason-other')?.addEventListener('change', function() {
            const container = document.getElementById('bm_graduation_otherReasonContainer');
            if (container) {
                container.style.display = this.checked ? 'block' : 'none';
            }
        });

        // Initialize GraduationPrint module - COPIED FROM REGISTRAR
        if (window.GraduationPrint) {
            window.GraduationPrint.initialize();
        }

    }

    // Bulk Operations - MATCHES REGISTRAR EXACTLY
    function bulkApproveGraduationBM() {
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
            const statusCell = document.querySelector(`tr input[value="${graduation.id}"]`).closest('tr').children[9]; // Business Manager column
            const statusText = statusCell.textContent.trim();
            
            if (statusText.includes('Approved')) {
                alreadyApproved.push(graduation.student_name);
            } else if (statusText.includes('Disapproved')) {
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
        currentActionBM = 'bulk_approve';
        currentApproveId = actionableIds; // Store array of IDs
        
        // Update sidebar title
        const approveTitle = document.getElementById('bm_graduation_approve_title');
        if (approveTitle) {
            approveTitle.textContent = `BULK APPROVAL PIN (${actionableIds.length} items)`;
        }
        
        resetApprovalSidebar();
        showApprovalSidebar();
    }

    function bulkDisapproveGraduationBM() {
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
            const statusCell = document.querySelector(`tr input[value="${graduation.id}"]`).closest('tr').children[9]; // Business Manager column
            const statusText = statusCell.textContent.trim();
            
            if (statusText.includes('Approved')) {
                alreadyApproved.push(graduation.student_name);
            } else if (statusText.includes('Disapproved')) {
                alreadyDisapproved.push(graduation.student_name);
            } else {
                actionableIds.push(graduation.id);
            }
        });

        // Show combined message if needed
        let message = '';
        if ((alreadyApproved.length > 0 || alreadyDisapproved.length > 0) && actionableIds.length > 0) {
            let skippedMsg = '';
            if (alreadyApproved.length > 0) {
                skippedMsg += `${alreadyApproved.length} approved graduation(s): ${alreadyApproved.join(', ')}`;
            }
            if (alreadyDisapproved.length > 0) {
                if (skippedMsg) skippedMsg += '; ';
                skippedMsg += `${alreadyDisapproved.length} already disapproved graduation(s): ${alreadyDisapproved.join(', ')}`;
            }
            message = `${actionableIds.length} graduation(s) will be disapproved. Skipped: ${skippedMsg}`;
            showAlert(message, 'info');
        } else if (alreadyApproved.length > 0 || alreadyDisapproved.length > 0) {
            let skippedMsg = '';
            if (alreadyApproved.length > 0) {
                skippedMsg = `${alreadyApproved.length} graduation(s) are already approved: ${alreadyApproved.join(', ')}`;
            }
            if (alreadyDisapproved.length > 0) {
                if (skippedMsg) skippedMsg += '; ';
                skippedMsg += `${alreadyDisapproved.length} graduation(s) are already disapproved: ${alreadyDisapproved.join(', ')}`;
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
        const disapproveTitle = document.getElementById('bm_graduation_disapprove_title');
        if (disapproveTitle) {
            disapproveTitle.textContent = `BULK DISAPPROVAL REASON (${actionableIds.length} items)`;
        }
        
        resetDisapprovalSidebar();
        showDisapproveSidebar();
    }

    function resetApprovalSidebar() {
        document.getElementById('bm_graduation_otpinput').value = '';
        document.getElementById('bm_graduation_otpComment').value = '';
        document.getElementById('bm_graduation_otpError').style.display = 'none';
        
        // Reset sidebar title if not bulk operation
        const approveTitle = document.getElementById('bm_graduation_approve_title');
        if (approveTitle && currentActionBM !== 'bulk_approve') {
            approveTitle.textContent = 'APPROVAL PIN';
        }
    }

    function resetDisapprovalSidebar() {
        document.getElementById('bm_graduation_disapprove_pin_step').style.display = 'block';
        document.getElementById('bm_graduation_disapprove_reason_step').style.display = 'none';
        
        document.getElementById('bm_graduation_disapprove_pin_input').value = '';
        document.getElementById('bm_graduation_disapprove_pin_error').style.display = 'none';
        
        document.querySelectorAll('#bm_graduation_disapproveSidebar input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        document.getElementById('bm_graduation_disapproveComment').value = '';
        document.getElementById('bm_graduation_appointmentDate').value = '';
        document.getElementById('bm_graduation_disapproveError').style.display = 'none';
        document.getElementById('bm_graduation_appointmentError').style.display = 'none';
        
        // Reset sidebar title if not bulk operation
        const disapproveTitle = document.getElementById('bm_graduation_disapprove_title');
        if (disapproveTitle && currentActionBM !== 'bulk_disapprove') {
            disapproveTitle.textContent = 'DISAPPROVE REASON';
        }
    }

    function showApprovalSidebar() {
        document.getElementById('bm_graduation_otpSidebar').classList.add('show');
    }

    function showDisapproveSidebar() {
        document.getElementById('bm_graduation_disapproveSidebar').classList.add('show');
    }

    // Public API
    return {
        init: init,
        setupEventListeners: setupEventListeners,
        loadGraduationData: loadGraduationData,
        applyFilters: applyFilters,
        resetFilters: resetFilters,
        updateSelectionCount: updateSelectionCount,
        toggleSelectAll: toggleSelectAll,
        editStatus: editStatus,
        printForm: printForm,
        printPreview: printPreview,
        viewPDF: viewPDF,
        bulkPrint: bulkPrint,
        submitApproval: submitApproval,
        submitDisapproval: submitDisapproval,
        verifyDisapprovalPin: verifyDisapprovalPin,
        closeApprovalSidebar: closeApprovalSidebar,
        closeDisapproveSidebar: closeDisapproveSidebar,
        bulkApproveGraduationBM: bulkApproveGraduationBM,
        bulkDisapproveGraduationBM: bulkDisapproveGraduationBM
    };
})();

// Global functions for template compatibility - COPIED FROM REGISTRAR PATTERN
function bulkPrintGraduation() {
    if (window.GraduationPrint) {
        window.GraduationPrint.bulkPrint();
    }
}

// Bulk functions for template compatibility
function bulkApproveGraduationBM() {
    BMGraduation.bulkApproveGraduationBM();
}

function bulkDisapproveGraduationBM() {
    BMGraduation.bulkDisapproveGraduationBM();
}

// Legacy function for backward compatibility
function printGraduation(graduationId) {
    if (window.GraduationPrint) {
        window.GraduationPrint.printSingle(graduationId);
    }
}


// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    BMGraduation.init();
});