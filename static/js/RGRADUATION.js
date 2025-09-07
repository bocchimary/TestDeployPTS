// GraduationPrint namespace - prevents global conflicts
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

    // Unified print function that accepts array of IDs
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
        
        // Show modal
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
        // Update modal title based on count
        const title = idsArray.length === 1 ? 
            'Preview & Print Graduation Form' : 
            `Preview & Print ${idsArray.length} Graduation Forms`;
        const titleEl = document.getElementById('previewPrintModalLabel');
        if (titleEl) {
            titleEl.innerHTML = `<i class="bi bi-printer me-2"></i>${title}`;
        }
        
        // Fetch preview content with timeout
        const url = `/registrar/graduation/preview-print/?ids=${idsArray.join(',')}`;
        
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

    // Initialize event handlers
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

    // Cancel preview request on modal close
    function handleModalClose() {
        const modalEl = document.getElementById('previewPrintModal');
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', function() {
                if (currentPreviewController) {
                    currentPreviewController.abort();
                    currentPreviewController = null;
                }
                resetPreviewModal();
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

        // Initialize function to be called on page load
        initialize: function() {
            initializePrintHandlers();
            handleModalClose();
        }
    };
})();

// Initialize graduation print functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.GraduationPrint) {
        window.GraduationPrint.initialize();
    }
});

// Expose functions globally for template compatibility (graduation-specific)
if (typeof window.showPreviewLoader === 'undefined') {
    window.showPreviewLoader = function() {
        if (window.GraduationPrint) {
            window.GraduationPrint.showPreviewLoader();
        }
    };

    window.hidePreviewLoader = function() {
        if (window.GraduationPrint) {
            window.GraduationPrint.hidePreviewLoader();
        }
    };

    window.resetPreviewModal = function() {
        if (window.GraduationPrint) {
            window.GraduationPrint.resetPreviewModal();
        }
    };

    window.printPreviewContent = function() {
        if (window.GraduationPrint) {
            window.GraduationPrint.printPreviewContent();
        }
    };
}

// Keep the rest of the original functionality (non-print related)
let graduationData = [];
let filteredData = [];
let currentApproveId = null;
let currentDisapproveId = null;

// Initialize the page
function initializePage() {
    // Set today's date
    const dateSpan = document.getElementById("registrar_graduation_dateToday");
    if (dateSpan) {
        const today = new Date();
        const formatted = today.toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        dateSpan.textContent = formatted;
    }

    // Load graduation data
    loadGraduationData();

    // Set up event listeners
    setupEventListeners();
}

// Execute immediately or wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

// Load graduation data from API
async function loadGraduationData() {
    try {
        const response = await fetch('/registrar/graduation/api/data/');
        const result = await response.json();
        
        if (response.ok) {
            graduationData = result.data;
            filteredData = [...graduationData];
            
            populateFilters();
            renderGraduationTable();
        } else {
            console.error('Error loading graduation data:', result.error);
            showAlert('Error loading graduation data', 'danger');
        }
    } catch (error) {
        console.error('Error loading graduation data:', error);
        showAlert('Error loading graduation data', 'danger');
    }
}

// Render the graduation table
function renderGraduationTable() {
    const tbody = document.getElementById('registrar_graduation_table_body');
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
        const businessStatus = getSignatoryStatus(graduation.business_status, graduation.business_timestamp);
        const registrarStatus = getRegistrarActionButtons(graduation.id, graduation.registrar_status, graduation.registrar_timestamp);
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
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="previewGraduationPDF('${graduation.id}')">
                    <i class="bi bi-file-pdf"></i> View Form
                </button>
            </td>
            <td><div class="small text-muted">${deanStatus}</div></td>
            <td><div class="small text-muted">${businessStatus}</div></td>
            <td><div class="small text-muted">${registrarStatus}</div></td>
            <td><div class="small text-muted">${presidentStatus}</div></td>
            <td><div class="small text-muted">${getStatusBadge(graduation)}</div></td>
            <td>
                <div class="registrar_graduation_table-icons">
                    <i class="bi bi-printer table-icon-print graduation-print-btn" data-id="${graduation.id}" title="Print"></i>
                    <i class="bi bi-trash table-icon-delete graduation-delete-btn" data-id="${graduation.id}" title="Delete"></i>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    attachActionButtonListeners();
    setupCheckboxListeners();
}

// Get status badge HTML
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

// Get signatory status HTML
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

// Get registrar action buttons
function getRegistrarActionButtons(graduationId, registrarStatus, registrarTimestamp) {
    if (registrarStatus && registrarStatus !== 'pending') {
        if (registrarStatus === 'approved') {
            return `
                <div class="d-flex flex-column align-items-center gap-1">
                    <span class="text-success fw-bold"><i class="bi bi-check-circle"></i> Approved</span>
                    <small class="text-muted">${registrarTimestamp || ''}</small>
                </div>
            `;
        } else if (registrarStatus === 'disapproved') {
            return `
                <div class="d-flex flex-column align-items-center gap-1">
                    <span class="text-danger fw-bold"><i class="bi bi-x-circle"></i> Disapproved</span>
                    <small class="text-muted">${registrarTimestamp || ''}</small>
                    <button type="button" class="btn btn-warning btn-sm mt-1 graduation-edit-btn" data-id="${graduationId}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                </div>
            `;
        }
    }
    
    return `
        <div class="d-flex flex-column gap-1">
            <button type="button" class="btn btn-success btn-sm registrar-graduation-action-btn" data-action="Approved" data-id="${graduationId}">Approve</button>
            <button type="button" class="btn btn-danger btn-sm registrar-graduation-action-btn" data-action="Disapproved" data-id="${graduationId}">Disapprove</button>
        </div>
    `;
}

// Set up event listeners
function setupEventListeners() {
    document.getElementById('registrar_graduation_filter_course').addEventListener('change', applyFilters);
    document.getElementById('registrar_graduation_filter_year').addEventListener('change', applyFilters);
    document.getElementById('registrar_graduation_filter_section').addEventListener('change', applyFilters);
    document.getElementById('registrar_graduation_filter_status').addEventListener('change', applyFilters);
    
    document.getElementById('registrar_graduation_search_input').addEventListener('input', applyFilters);
    document.getElementById('registrar_graduation_reset_filters').addEventListener('click', resetFilters);
    
    // Bulk delete button
    const bulkDeleteBtn = document.querySelector('.graduation-bulk-delete-btn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', bulkDeleteGraduation);
    }
    
    // Close button event listeners for sidebars
    const otpCloseBtn = document.querySelector('.graduation-close-otp-btn');
    if (otpCloseBtn) {
        otpCloseBtn.addEventListener('click', function() {
            document.getElementById('registrar_graduation_otpSidebar').classList.remove('show');
        });
    }
    
    const disapproveCloseBtn = document.querySelector('.graduation-close-disapprove-btn');
    if (disapproveCloseBtn) {
        disapproveCloseBtn.addEventListener('click', function() {
            document.getElementById('registrar_graduation_disapproveSidebar').classList.remove('show');
        });
    }
    
    setupOtpSidebarListeners();
    
    // Add delete and edit button handlers
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('graduation-delete-btn')) {
            e.preventDefault();
            const graduationId = e.target.dataset.id;
            if (graduationId) {
                deleteGraduation(graduationId);
            }
        }
        if (e.target.classList.contains('graduation-edit-btn')) {
            e.preventDefault();
            const graduationId = e.target.dataset.id;
            if (graduationId) {
                editDisapprovedGraduation(graduationId);
            }
        }
    });
}

// Populate filter dropdowns with actual data
function populateFilters() {
    const courses = [...new Set(graduationData.map(g => g.course).filter(Boolean))];
    const years = [...new Set(graduationData.map(g => g.year).filter(Boolean))];
    const sections = [...new Set(graduationData.map(g => g.section).filter(Boolean))];
    
    const courseSelect = document.getElementById('registrar_graduation_filter_course');
    courseSelect.innerHTML = '<option selected disabled>Filter by Course</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseSelect.appendChild(option);
    });
    
    const yearSelect = document.getElementById('registrar_graduation_filter_year');
    yearSelect.innerHTML = '<option selected disabled>Filter by Year</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    
    const sectionSelect = document.getElementById('registrar_graduation_filter_section');
    sectionSelect.innerHTML = '<option selected disabled>Filter by Section</option>';
    sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = section;
        sectionSelect.appendChild(option);
    });
    
    const statusSelect = document.getElementById('registrar_graduation_filter_status');
    statusSelect.innerHTML = '<option selected disabled>Filter by Status</option>';
    statusSelect.innerHTML += '<option value="pending">Pending</option>';
    statusSelect.innerHTML += '<option value="completed">Completed</option>';
}

// Apply filters and search
function applyFilters() {
    const courseFilter = document.getElementById('registrar_graduation_filter_course').value;
    const yearFilter = document.getElementById('registrar_graduation_filter_year').value;
    const sectionFilter = document.getElementById('registrar_graduation_filter_section').value;
    const statusFilter = document.getElementById('registrar_graduation_filter_status').value;
    const searchTerm = document.getElementById('registrar_graduation_search_input').value.toLowerCase();
    
    filteredData = graduationData.filter(graduation => {
        const matchesCourse = !courseFilter || courseFilter === 'Filter by Course' || graduation.course === courseFilter;
        const matchesYear = !yearFilter || yearFilter === 'Filter by Year' || graduation.year === yearFilter;
        const matchesSection = !sectionFilter || sectionFilter === 'Filter by Section' || graduation.section === sectionFilter;
        const isCompleted = graduation.dean_status === 'approved' && 
                           graduation.business_status === 'approved' && 
                           graduation.registrar_status === 'approved';
        const graduationStatus = isCompleted ? 'completed' : 'pending';
        const matchesStatus = !statusFilter || statusFilter === 'Filter by Status' || graduationStatus === statusFilter.toLowerCase();
        const matchesSearch = !searchTerm || 
            graduation.student_name.toLowerCase().includes(searchTerm) ||
            graduation.course.toLowerCase().includes(searchTerm) ||
            graduation.id_number.toLowerCase().includes(searchTerm) ||
            (graduation.grad_appno && graduation.grad_appno.toLowerCase().includes(searchTerm));
        
        return matchesCourse && matchesYear && matchesSection && matchesStatus && matchesSearch;
    });
    
    renderGraduationTable();
}

// Reset all filters and search
function resetFilters() {
    document.getElementById('registrar_graduation_filter_course').value = 'Filter by Course';
    document.getElementById('registrar_graduation_filter_year').value = 'Filter by Year';
    document.getElementById('registrar_graduation_filter_section').value = 'Filter by Section';
    document.getElementById('registrar_graduation_filter_status').value = 'Filter by Status';
    
    document.getElementById('registrar_graduation_search_input').value = '';
    
    filteredData = [...graduationData];
    renderGraduationTable();
}

// Attach action button listeners
function attachActionButtonListeners() {
    const buttons = document.querySelectorAll(".registrar-graduation-action-btn");
    
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            
            if (action === "Approved") {
                showApprovalSidebar(id);
            } else {
                showDisapprovalSidebar(id);
            }
        });
    });
}

// Show approval sidebar
function showApprovalSidebar(graduationId) {
    // Close any open sidebars first
    closeAllSidebars();
    
    currentApproveId = graduationId;
    clearOtpInput();
    document.getElementById("registrar_graduation_otpError").style.display = "none";
    document.getElementById("registrar_graduation_otpSidebar").classList.add("show");
}

// Show disapproval sidebar
function showDisapprovalSidebar(graduationId) {
    // Close any open sidebars first
    closeAllSidebars();
    
    currentDisapproveId = graduationId;
    clearDisapproveChecks();
    
    document.getElementById("registrar_graduation_disapprove_pin_input").value = "";
    document.getElementById("registrar_graduation_disapprove_pin_error").style.display = "none";
    document.getElementById("registrar_graduation_disapprove_pin_step").style.display = "block";
    document.getElementById("registrar_graduation_disapprove_reason_step").style.display = "none";
    
    document.getElementById("registrar_graduation_disapproveError").style.display = "none";
    document.getElementById("registrar_graduation_appointmentError").style.display = "none";
    
    document.getElementById("registrar_graduation_disapproveSidebar").classList.add("show");
}

// Setup OTP sidebar listeners
function setupOtpSidebarListeners() {
    const approveBtn = document.getElementById("registrar_graduation_verifyOtpBtn");
    approveBtn.addEventListener("click", async () => {
        const input = document.getElementById("registrar_graduation_otpinput");
        const code = input.value.trim();
        const comment = document.getElementById("registrar_graduation_otpComment").value.trim();
        
        // Show loading state
        const submitBtn = document.getElementById('registrar_graduation_verifyOtpBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        try {
            const response = await fetch('/registrar/graduation/approve/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    graduation_id: currentApproveId,
                    pin: code,
                    comment: comment
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showAlert('Graduation approved successfully', 'success');
                closeOtpSidebar();
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadGraduationData();
                }, 1000);
            } else {
                showAlert(result.error || 'Error approving graduation', 'danger');
            }
        } catch (error) {
            console.error('Error approving graduation:', error);
            showAlert('Error approving graduation', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
    
    document.getElementById("registrar_graduation_disapprove_pin_submit_btn").addEventListener("click", () => {
        const pinInput = document.getElementById("registrar_graduation_disapprove_pin_input").value.trim();
        
        document.getElementById("registrar_graduation_disapprove_pin_error").style.display = "none";
        
        document.getElementById("registrar_graduation_disapprove_pin_step").style.display = "none";
        document.getElementById("registrar_graduation_disapprove_reason_step").style.display = "flex";
    });
    
    document.getElementById("registrar_graduation_submit_Appointment_Disapproval_Btn").addEventListener("click", async () => {
        let checkedReasons = Array.from(document.querySelectorAll('#registrar_graduation_disapproveSidebar input[type="checkbox"]:checked')).map(cb => cb.value);
        const appointmentDate = document.getElementById("registrar_graduation_appointmentDate").value;
        const comment = document.getElementById("registrar_graduation_disapproveComment").value.trim();
        const pinInput = document.getElementById("registrar_graduation_disapprove_pin_input").value.trim();
        
        const otherReasonChecked = document.getElementById("registrar_graduation_reasonOther").checked;
        const otherReasonInput = document.getElementById("registrar_graduation_otherReasonInput").value.trim();
        
        if (otherReasonChecked && otherReasonInput !== "") {
            checkedReasons = checkedReasons.filter(r => r !== "Other");
            checkedReasons.push(otherReasonInput);
        }
        
        document.getElementById("registrar_graduation_disapproveError").style.display = "none";
        document.getElementById("registrar_graduation_appointmentError").style.display = "none";
        
        if (checkedReasons.length === 0) {
            document.getElementById("registrar_graduation_disapproveError").style.display = "block";
            return;
        }
        
        if (!appointmentDate) {
            document.getElementById("registrar_graduation_appointmentError").style.display = "block";
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('registrar_graduation_submit_Appointment_Disapproval_Btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        try {
            let response;
            // Check if this is bulk or individual action
            if (currentAction === 'bulk_disapprove') {
                // Bulk disapprove
                response = await fetch('/registrar/graduation/bulk-disapprove/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        graduation_ids: window.bulkGraduationIds,
                        pin: pinInput,
                        reason: checkedReasons.join(', '),
                        appointment_date: appointmentDate,
                        comment: comment
                    })
                });
            } else {
                // Individual disapprove
                response = await fetch('/registrar/graduation/disapprove/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        graduation_id: currentDisapproveId,
                        pin: pinInput,
                        reasons: checkedReasons,
                        appointment_date: appointmentDate,
                        comment: comment
                    })
                });
            }
            
            const result = await response.json();
            
            if (response.ok) {
                showAlert('Graduation disapproved successfully', 'success');
                closeDisapproveSidebar();
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadGraduationData();
                }, 1000);
            } else {
                showAlert(result.error || 'Error disapproving graduation', 'danger');
            }
        } catch (error) {
            console.error('Error disapproving graduation:', error);
            showAlert('Error disapproving graduation', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
    
    document.getElementById("registrar_graduation_reasonOther").addEventListener("change", toggleOtherReasonInput);
}

// Delete graduation with modal
function deleteGraduation(graduationId) {
    showDeleteModal([graduationId], false);
}

// Show delete modal
function showDeleteModal(graduationIds, isBulk) {
    const existingModal = document.getElementById('deleteModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="deleteModalLabel">
                            <i class="bi bi-exclamation-triangle text-warning me-2"></i>
                            Confirm Delete
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-0">
                            Are you sure you want to delete ${isBulk ? graduationIds.length + ' graduation(s)' : 'this graduation'}?
                        </p>
                        <div class="alert alert-warning mt-3" role="alert">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            This action cannot be undone.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i> Cancel
                        </button>
                        <button type="button" class="btn btn-danger delete-confirm-btn" data-ids="${graduationIds.join(',')}" data-bulk="${isBulk}">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();

    // Add click handler for confirm button
    document.querySelector('.delete-confirm-btn').addEventListener('click', function() {
        const graduationIdsString = this.dataset.ids;
        const isBulk = this.dataset.bulk === 'true';
        const graduationIds = graduationIdsString.split(',');
        
        modal.hide();
        if (isBulk) {
            performBulkDeleteGraduation(graduationIds);
        } else {
            performDeleteGraduation(graduationIds[0]);
        }
    });

    document.getElementById('deleteModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Perform bulk delete
async function performBulkDeleteGraduation(graduationIds) {
    try {
        const response = await fetch('/registrar/graduation/bulk-delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                graduation_ids: graduationIds
            })
        });

        const result = await response.json();

        if (response.ok) {
            showAlert(`Successfully deleted ${graduationIds.length} graduation(s)`, 'success');
            // Add small delay to ensure database transaction is committed
            setTimeout(() => {
                loadGraduationData();
            }, 1000);
        } else {
            showAlert(result.error || 'Error deleting graduations', 'danger');
        }
    } catch (error) {
        console.error('Error bulk deleting graduations:', error);
        showAlert('Error deleting graduations', 'danger');
    }
}

// Perform single delete
async function performDeleteGraduation(graduationId) {
    try {
        const response = await fetch(`/registrar/graduation/delete/${graduationId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('Graduation deleted successfully', 'success');
            // Add small delay to ensure database transaction is committed
            setTimeout(() => {
                loadGraduationData();
            }, 1000);
        } else {
            showAlert(result.error || 'Error deleting graduation', 'danger');
        }
    } catch (error) {
        console.error('Error deleting graduation:', error);
        showAlert('Error deleting graduation', 'danger');
    }
}

// Utility functions
function closeOtpSidebar() {
    document.getElementById("registrar_graduation_otpSidebar").classList.remove("show");
}

function closeDisapproveSidebar() {
    document.getElementById("registrar_graduation_disapproveSidebar").classList.remove("show");
}

function closeAllSidebars() {
    // Close OTP sidebar
    const otpSidebar = document.getElementById("registrar_graduation_otpSidebar");
    if (otpSidebar) {
        otpSidebar.classList.remove("show");
    }
    
    // Close disapprove sidebar
    const disapproveSidebar = document.getElementById("registrar_graduation_disapproveSidebar");
    if (disapproveSidebar) {
        disapproveSidebar.classList.remove("show");
    }
    
    // Reset global variables
    currentApproveId = null;
    currentDisapproveId = null;
}

function clearOtpInput() {
    document.getElementById("registrar_graduation_otpComment").value = "";
    const input = document.getElementById("registrar_graduation_otpinput");
    input.value = "";
    input.focus();
}

function clearDisapproveChecks() {
    document.getElementById("registrar_graduation_disapproveComment").value = "";
    document.querySelectorAll('#registrar_graduation_disapproveSidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById("registrar_graduation_appointmentDate").value = "";
    document.getElementById("registrar_graduation_appointmentError").style.display = "none";
    document.getElementById("registrar_graduation_disapproveError").style.display = "none";
    document.getElementById("registrar_graduation_otherReasonInput").value = "";
    document.getElementById("registrar_graduation_otherReasonContainer").style.display = "none";
}

function editDisapprovedGraduation(graduationId) {
    showApprovalSidebar(graduationId);
}

function toggleOtherReasonInput() {
    const otherCheckbox = document.getElementById("registrar_graduation_reasonOther");
    const otherInputContainer = document.getElementById("registrar_graduation_otherReasonContainer");
    otherInputContainer.style.display = otherCheckbox.checked ? "block" : "none";
}

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

// Checkbox functionality for bulk actions
function setupCheckboxListeners() {
    const selectAllCheckbox = document.getElementById('registrar_graduation_select_all');
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

function updateBulkActions() {
    const selectedCheckboxes = document.querySelectorAll('.graduation-checkbox:checked');
    const bulkActionsDiv = document.getElementById('registrar_graduation_bulk_actions');
    const selectedCountSpan = document.getElementById('registrar_graduation_selected_count');
    
    if (selectedCheckboxes.length > 0) {
        bulkActionsDiv.style.display = 'block';
        selectedCountSpan.textContent = `${selectedCheckboxes.length} selected`;
    } else {
        bulkActionsDiv.style.display = 'none';
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('registrar_graduation_select_all');
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

// Bulk print and delete functions for button handlers
function bulkPrintGraduation() {
    if (window.GraduationPrint) {
        window.GraduationPrint.bulkPrint();
    }
}

function bulkDeleteGraduation() {
    const selectedCheckboxes = document.querySelectorAll('.graduation-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one graduation form to delete', 'warning');
        return;
    }
    
    const graduationIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    showDeleteModal(graduationIds, true);
}

// Legacy functions for backward compatibility
function printGraduation(graduationId) {
    if (window.GraduationPrint) {
        window.GraduationPrint.printSingle(graduationId);
    }
}

// PDF Preview function - EXACT COPY FROM BUSINESS MANAGER
function previewGraduationPDF(graduationId) {
    console.log('previewGraduationPDF called with ID:', graduationId);
    if (!graduationId) {
        showAlert('No graduation ID provided', 'warning');
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('graduationFormModal'));
    const loadingEl = document.getElementById('pdfPreviewLoading');
    const contentEl = document.getElementById('pdfPreviewContent');
    const modalElement = document.getElementById('graduationFormModal');
    
    console.log('Modal elements found:', {
        modal: !!modal,
        loadingEl: !!loadingEl,
        contentEl: !!contentEl,
        modalElement: !!modalElement
    });
    
    if (!loadingEl || !contentEl) {
        console.error('Modal loading or content elements not found');
        showAlert('Modal configuration error', 'error');
        return;
    }
    
    // Add modal close handler to clean up any CSS interference
    const handleModalHidden = function() {
        // Clear content to prevent CSS bleeding
        if (contentEl) contentEl.innerHTML = '';
        if (loadingEl) loadingEl.innerHTML = '';
        // Hide print button
        const printBtn = document.getElementById('printGraduationBtn');
        if (printBtn) {
            printBtn.style.display = 'none';
            printBtn.onclick = null;
        }
        // Remove any dynamically added styles that might affect the main page
        const dynamicStyles = document.querySelectorAll('style[data-modal-injected]');
        dynamicStyles.forEach(style => style.remove());
        // Restore document body overflow if needed
        document.body.style.overflow = '';
        modalElement.removeEventListener('hidden.bs.modal', handleModalHidden);
    };
    modalElement.addEventListener('hidden.bs.modal', handleModalHidden);
    
    // Show loading
    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';
    contentEl.innerHTML = '';
    
    // Show modal
    modal.show();
    
    // Load form content
    fetch(`/registrar/graduation/preview-print/?ids=${graduationId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from server');
            }
            
            // Handle full HTML document by rendering in iframe for proper display
            if (html.includes('<!DOCTYPE html>') || html.includes('<html>')) {
                // Create iframe to properly render the full HTML document
                const iframe = document.createElement('iframe');
                iframe.style.width = '100%';
                iframe.style.height = '70vh'; // Use viewport height instead of fixed height
                iframe.style.border = 'none';
                iframe.style.overflow = 'auto'; // Let iframe handle its own scrolling
                
                // Remove print button from HTML content before setting to iframe
                const cleanHtml = html.replace(/<button[^>]*class="print-button"[^>]*>.*?<\/button>/gi, '');
                iframe.srcdoc = cleanHtml;
                
                contentEl.innerHTML = '';
                contentEl.appendChild(iframe);
                
                // Show print button in modal footer
                const printBtn = document.getElementById('printGraduationBtn');
                if (printBtn) {
                    printBtn.style.display = 'inline-block';
                    printBtn.onclick = () => {
                        // Print the iframe content
                        iframe.contentWindow.print();
                    };
                }
            } else {
                // Show content normally for HTML snippets
                contentEl.innerHTML = `<div class="pdf-modal-content">${html}</div>`;
                
                // Apply styles to HTML snippet content
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
            }
            
            contentEl.style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading form:', error);
            contentEl.innerHTML = `<div class="alert alert-danger m-3">Failed to load form preview. Please try again.</div>`;
            contentEl.style.display = 'block';
        })
        .finally(() => {
            // Always hide loading
            if (loadingEl) {
                loadingEl.style.display = 'none';
                loadingEl.innerHTML = '';
            }
        });
}

// ============= BULK OPERATIONS =============

// Global variables for bulk operations
let currentAction = null;
let bulkGraduationIds = [];

// Bulk Approve Functionality
function bulkApproveGraduation() {
    const selectedCheckboxes = document.querySelectorAll('.graduation-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one graduation form to approve', 'warning');
        return;
    }
    
    // Filter out forms that are already approved or disapproved
    const actionableIds = [];
    const alreadyApproved = [];
    const alreadyDisapproved = [];
    
    selectedCheckboxes.forEach(checkbox => {
        const graduationId = checkbox.value;
        const index = checkbox.getAttribute('data-index');
        
        // Get graduation data from the current filtered dataset
        if (index !== null && filteredData && filteredData[index]) {
            const graduation = filteredData[index];
            if (graduation.registrar_status === 'approved') {
                alreadyApproved.push(graduation.student_name || graduationId);
            } else if (graduation.registrar_status === 'disapproved') {
                // Cannot approve disapproved forms
                alreadyDisapproved.push(graduation.student_name || graduationId);
            } else {
                actionableIds.push(graduationId);
            }
        } else {
            // If we can't determine status, include it to be safe
            actionableIds.push(graduationId);
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
        showAlert(message, 'warning');
        return;
    }
    
    // Show info about processed forms if any, but continue with actionable ones
    if (messages.length > 0) {
        showAlert(`${messages.join('. ')}. Proceeding with ${actionableIds.length} form(s) that need approval.`, 'info');
    }
    
    showBulkApproveSidebar(actionableIds);
}

// Bulk Disapprove Functionality  
function bulkDisapproveGraduation() {
    const selectedCheckboxes = document.querySelectorAll('.graduation-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one graduation form to disapprove', 'warning');
        return;
    }
    
    // Filter out forms that are already disapproved or approved
    const actionableIds = [];
    const alreadyDisapproved = [];
    const alreadyApproved = [];
    
    selectedCheckboxes.forEach(checkbox => {
        const graduationId = checkbox.value;
        const index = checkbox.getAttribute('data-index');
        
        // Get graduation data from the current filtered dataset
        if (index !== null && filteredData && filteredData[index]) {
            const graduation = filteredData[index];
            if (graduation.registrar_status === 'disapproved') {
                alreadyDisapproved.push(graduation.student_name || graduationId);
            } else if (graduation.registrar_status === 'approved') {
                // Already approved forms cannot be disapproved
                alreadyApproved.push(graduation.student_name || graduationId);
            } else {
                actionableIds.push(graduationId);
            }
        } else {
            // If we can't determine status, include it to be safe
            actionableIds.push(graduationId);
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
        showAlert(message, 'warning');
        return;
    }
    
    // Show single comprehensive message if some forms were filtered out
    if (messages.length > 0) {
        const combinedMessage = `${messages.join('. ')}. Proceeding with ${actionableIds.length} form(s) that can be disapproved.`;
        showAlert(combinedMessage, 'info');
    }
    
    showBulkDisapproveSidebar(actionableIds);
}

// Show Bulk Approve Sidebar
function showBulkApproveSidebar(graduationIds) {
    // Close any open sidebars first
    closeAllSidebars();
    
    // Store graduation IDs and set bulk mode
    window.bulkGraduationIds = graduationIds;
    currentAction = 'bulk_approve';
    
    // Update sidebar title
    document.getElementById('registrar_graduation_approve_title').textContent = `BULK APPROVE (${graduationIds.length} items)`;
    
    const sidebar = document.getElementById('registrar_graduation_otpSidebar');
    sidebar.classList.add('show');
    
    // Clear previous inputs
    document.getElementById('registrar_graduation_otpinput').value = '';
    document.getElementById('registrar_graduation_otpComment').value = '';
    document.getElementById('registrar_graduation_otpError').style.display = 'none';
}

// Show Bulk Disapprove Sidebar
function showBulkDisapproveSidebar(graduationIds) {
    // Close any open sidebars first
    closeAllSidebars();
    
    // Store graduation IDs and set bulk mode
    window.bulkGraduationIds = graduationIds;
    currentAction = 'bulk_disapprove';
    
    // Update sidebar title
    document.getElementById('registrar_graduation_disapprove_title').textContent = `BULK DISAPPROVE (${graduationIds.length} items)`;
    
    const sidebar = document.getElementById('registrar_graduation_disapproveSidebar');
    sidebar.classList.add('show');
    
    // Reset to step 1
    document.getElementById('registrar_graduation_disapprove_pin_step').style.display = 'block';
    document.getElementById('registrar_graduation_disapprove_reason_step').style.display = 'none';
    
    // Clear previous inputs
    document.getElementById('registrar_graduation_disapprove_pin_input').value = '';
    document.getElementById('registrar_graduation_disapprove_pin_error').style.display = 'none';
    
    // Clear checkboxes and reasons
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('registrar_graduation_otherReasonInput').value = '';
    document.getElementById('registrar_graduation_otherReasonContainer').style.display = 'none';
}

// Update existing approval event listener to handle bulk operations
function updateApprovalHandler() {
    const approveBtn = document.getElementById('registrar_graduation_verifyOtpBtn');
    if (approveBtn) {
        // Remove existing event listeners by cloning
        const newApproveBtn = approveBtn.cloneNode(true);
        approveBtn.parentNode.replaceChild(newApproveBtn, approveBtn);
        
        newApproveBtn.addEventListener('click', function() {
            const pin = document.getElementById('registrar_graduation_otpinput').value;
            const comment = document.getElementById('registrar_graduation_otpComment').value || '';
            
            if (!pin) {
                document.getElementById('registrar_graduation_otpError').textContent = 'Please enter PIN';
                document.getElementById('registrar_graduation_otpError').style.display = 'block';
                return;
            }
            
            // Show loading state
            const originalText = newApproveBtn.textContent;
            newApproveBtn.disabled = true;
            newApproveBtn.textContent = 'Processing...';
            
            // Check if this is bulk or individual action
            if (currentAction === 'bulk_approve') {
                // Bulk approve
                fetch('/registrar/graduation/bulk-approve/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        graduation_ids: window.bulkGraduationIds,
                        pin: pin,
                        comment: comment
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        closeAllSidebars();
                        showAlert(data.message || 'Bulk approve completed successfully', 'success');
                        
                        // Clear selections
                        document.querySelectorAll('.graduation-checkbox:checked').forEach(cb => cb.checked = false);
                        updateBulkActions();
                        
                        // Reload data immediately
                        console.log('Reloading data after bulk approval...');
                        loadGraduationData();
                    } else {
                        document.getElementById('registrar_graduation_otpError').textContent = data.error || 'Failed to approve graduations';
                        document.getElementById('registrar_graduation_otpError').style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('registrar_graduation_otpError').textContent = 'Network error';
                    document.getElementById('registrar_graduation_otpError').style.display = 'block';
                })
                .finally(() => {
                    // Restore button state for bulk approval
                    newApproveBtn.disabled = false;
                    newApproveBtn.textContent = originalText;
                });
            } else {
                // Individual approve (existing functionality)
                fetch('/registrar/graduation/approve/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        graduation_id: currentApproveId,
                        pin: pin,
                        comment: comment
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        closeAllSidebars();
                        showAlert('Graduation approved successfully!', 'success');
                        
                        // Reload data immediately
                        console.log('Reloading data after individual approval...');
                        loadGraduationData();
                    } else {
                        document.getElementById('registrar_graduation_otpError').textContent = data.error || 'Error approving graduation';
                        document.getElementById('registrar_graduation_otpError').style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('registrar_graduation_otpError').textContent = 'Network error';
                    document.getElementById('registrar_graduation_otpError').style.display = 'block';
                })
                .finally(() => {
                    // Restore button state for individual approval
                    newApproveBtn.disabled = false;
                    newApproveBtn.textContent = originalText;
                });
            }
        });
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', function() {
    updateApprovalHandler();
});