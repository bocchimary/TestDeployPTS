// EnrollmentPrint namespace - prevents global conflicts
window.EnrollmentPrint = (function() {
    // Private variables
    let enrollmentData = [];
    let filteredData = [];
    let currentApproveId = null;
    let currentDisapproveId = null;
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
            showAlert('No enrollment forms selected for printing', 'warning');
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
        
        // Don't show modal - we'll load content invisibly
        const modal = new bootstrap.Modal(modalEl);
        
        // Update modal title based on count
        const title = idsArray.length === 1 ? 
            'Preview & Print Enrollment Form' : 
            `Preview & Print ${idsArray.length} Enrollment Forms`;
        const titleEl = document.getElementById('previewPrintModalLabel');
        if (titleEl) {
            titleEl.innerHTML = `<i class="bi bi-printer me-2"></i>${title}`;
        }
        
        // Fetch preview content with timeout
        const url = `/registrar/enrollment/preview-print/?ids=${idsArray.join(',')}`;
        
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
            
            // Hide loading spinner since content is loaded
            hidePreviewLoader();
            
            // Auto-trigger print after content loads
            setTimeout(function() {
                printPreviewContent();
            }, 500);
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
        
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(htmlContent);
        doc.close();
    }
    
    // Function to completely reset page state after printing
    function resetPageState() {
        // Force multiple reflows to reset CSS state
        document.body.offsetHeight;
        document.documentElement.offsetHeight;
        
        // Reset all potentially affected elements
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            // Remove any inline styles that might have been added
            if (el.style.border || el.style.borderColor || el.style.borderWidth || el.style.borderStyle) {
                el.style.border = '';
                el.style.borderColor = '';
                el.style.borderWidth = '';
                el.style.borderStyle = '';
            }
        });
        
        // Specifically reset enrollment table elements
        const tables = document.querySelectorAll('.registrar_enrollment_table, .registrar_enrollment_table *');
        tables.forEach(el => {
            el.style.cssText = '';
            el.removeAttribute('style');
        });
        
        // Force browser to recalculate styles
        window.getComputedStyle(document.body).getPropertyValue('border');
        
        // Trigger layout recalculation
        window.dispatchEvent(new Event('resize'));
        
        // Additional reset - refresh CSS by toggling a class
        document.body.classList.add('print-reset');
        setTimeout(() => {
            document.body.classList.remove('print-reset');
        }, 10);
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
            if (e.target.classList.contains('enrollment-print-btn')) {
                e.preventDefault();
                const enrollmentId = e.target.dataset.id;
                if (enrollmentId) {
                    printPreview([enrollmentId]);
                }
            }
        });
    }

    // Get selected enrollment IDs for bulk operations
    function getSelectedEnrollmentIds() {
        const selectedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');
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
        // Main print function - accepts array of enrollment IDs
        print: printPreview,
        
        // Bulk print function
        bulkPrint: function() {
            const selectedIds = getSelectedEnrollmentIds();
            if (selectedIds.length === 0) {
                showAlert('Please select at least one enrollment form to print', 'warning');
                return;
            }
            printPreview(selectedIds);
        },
        
        // Single print function
        printSingle: function(enrollmentId) {
            if (!enrollmentId) {
                showAlert('No enrollment ID provided', 'error');
                return;
            }
            printPreview([enrollmentId]);
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

// Initialize enrollment print functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.EnrollmentPrint) {
        window.EnrollmentPrint.initialize();
    }
});

// Expose functions globally for template compatibility (enrollment-specific)
if (typeof window.showPreviewLoader === 'undefined') {
    window.showPreviewLoader = function() {
        if (window.EnrollmentPrint) {
            window.EnrollmentPrint.showPreviewLoader();
        }
    };

    window.hidePreviewLoader = function() {
        if (window.EnrollmentPrint) {
            window.EnrollmentPrint.hidePreviewLoader();
        }
    };

    window.resetPreviewModal = function() {
        if (window.EnrollmentPrint) {
            window.EnrollmentPrint.resetPreviewModal();
        }
    };

    window.printPreviewContent = function() {
        if (window.EnrollmentPrint) {
            window.EnrollmentPrint.printPreviewContent();
        }
    };
}

// Keep the rest of the original functionality (non-print related)
let enrollmentData = [];
let filteredData = [];
let currentApproveId = null;
let currentDisapproveId = null;

// Initialize the page
function initializePage() {
    // Set today's date
    const dateSpan = document.getElementById("registrar_enrollment_dateToday");
    if (dateSpan) {
        const today = new Date();
        const formatted = today.toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        dateSpan.textContent = formatted;
    }

    // Load enrollment data
    loadEnrollmentData();
    
    // Set up event listeners
    setupEventListeners();
}

// Load enrollment data from API
async function loadEnrollmentData() {
    try {
        const response = await fetch('/registrar/enrollment/api/data/');
        const result = await response.json();
        
        if (response.ok) {
            enrollmentData = result.data;
            filteredData = [...enrollmentData];
            
            populateFilters();
            renderEnrollmentTable();
        } else {
            console.error('Error loading enrollment data:', result.error);
            showAlert('Error loading enrollment data', 'danger');
        }
    } catch (error) {
        console.error('Error loading enrollment data:', error);
        showAlert('Error loading enrollment data', 'danger');
    }
}

// Render the enrollment table
function renderEnrollmentTable() {
    const tbody = document.getElementById('registrar_enrollment_table_body');
    if (!tbody) {
        return;
    }
    
    tbody.innerHTML = '';

    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center text-muted py-4">
                    No enrollment forms found
                </td>
            </tr>
        `;
        return;
    }

    filteredData.forEach((enrollment, index) => {
        const row = document.createElement('tr');
        
        const deanStatus = getSignatoryStatus(enrollment.dean_status, enrollment.dean_timestamp);
        const businessStatus = getSignatoryStatus(enrollment.business_status, enrollment.business_timestamp);
        const registrarStatus = getRegistrarActionButtons(enrollment.id, enrollment.registrar_status, enrollment.registrar_timestamp);
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="enrollment-checkbox" value="${enrollment.id}" data-index="${index}">
            </td>
            <td class="text-start">${enrollment.student_name || 'N/A'}</td>
            <td>${enrollment.course || 'N/A'}</td>
            <td>${enrollment.year || 'N/A'}</td>
            <td>${enrollment.section || 'N/A'}</td>
            <td>${enrollment.id_number || 'N/A'}</td>
            <td><div class="small text-muted">${enrollment.date_submitted || 'N/A'}</div></td>
            <td>
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="previewEnrollmentPDF('${enrollment.id}')">
                    <i class="bi bi-file-pdf"></i> View Form
                </button>
            </td>
            <td><div class="small text-muted">${deanStatus}</div></td>
            <td><div class="small text-muted">${businessStatus}</div></td>
            <td><div class="small text-muted">${registrarStatus}</div></td>
            <td><div class="small text-muted">${getStatusBadge(enrollment)}</div></td>
            <td>
                <div class="registrar_enrollment_table-icons">
                    <i class="bi bi-printer table-icon-print enrollment-print-btn" data-id="${enrollment.id}" title="Print"></i>
                    <i class="bi bi-trash table-icon-delete enrollment-delete-btn" data-id="${enrollment.id}" title="Delete"></i>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    attachActionButtonListeners();
    setupCheckboxListeners();
}

// Get status badge HTML
function getStatusBadge(enrollment) {
    const deanApproved = enrollment.dean_status === 'approved';
    const businessApproved = enrollment.business_status === 'approved';
    const registrarApproved = enrollment.registrar_status === 'approved';
    
    if (deanApproved && businessApproved && registrarApproved) {
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
function getRegistrarActionButtons(enrollmentId, registrarStatus, registrarTimestamp) {
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
                    <button type="button" class="btn btn-warning btn-sm mt-1 enrollment-edit-btn" data-id="${enrollmentId}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                </div>
            `;
        }
    }
    
    return `
        <div class="d-flex flex-column gap-1">
            <button type="button" class="btn btn-success btn-sm registrar-enrollment-action-btn" data-action="Approved" data-id="${enrollmentId}">Approve</button>
            <button type="button" class="btn btn-danger btn-sm registrar-enrollment-action-btn" data-action="Disapproved" data-id="${enrollmentId}">Disapprove</button>
        </div>
    `;
}

// Set up event listeners
function setupEventListeners() {
    document.getElementById('registrar_enrollment_filter_course').addEventListener('change', applyFilters);
    document.getElementById('registrar_enrollment_filter_year').addEventListener('change', applyFilters);
    document.getElementById('registrar_enrollment_filter_section').addEventListener('change', applyFilters);
    document.getElementById('registrar_enrollment_filter_status').addEventListener('change', applyFilters);
    
    document.getElementById('registrar_enrollment_search_input').addEventListener('input', applyFilters);
    document.getElementById('registrar_enrollment_reset_filters').addEventListener('click', resetFilters);
    
    // Bulk delete button
    const bulkDeleteBtn = document.querySelector('.enrollment-bulk-delete-btn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', bulkDeleteEnrollment);
    }
    
    // Close button event listeners for sidebars
    const otpCloseBtn = document.querySelector('.enrollment-close-otp-btn');
    if (otpCloseBtn) {
        otpCloseBtn.addEventListener('click', function() {
            document.getElementById('registrar_enrollment_otpSidebar').classList.remove('show');
        });
    }
    
    const disapproveCloseBtn = document.querySelector('.enrollment-close-disapprove-btn');
    if (disapproveCloseBtn) {
        disapproveCloseBtn.addEventListener('click', function() {
            document.getElementById('registrar_enrollment_disapproveSidebar').classList.remove('show');
        });
    }
    
    setupOtpSidebarListeners();
    
    // Add delete button handlers
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('enrollment-delete-btn')) {
            e.preventDefault();
            const enrollmentId = e.target.dataset.id;
            if (enrollmentId) {
                deleteEnrollment(enrollmentId);
            }
        }
        if (e.target.classList.contains('enrollment-edit-btn')) {
            e.preventDefault();
            const enrollmentId = e.target.dataset.id;
            if (enrollmentId) {
                editDisapprovedEnrollment(enrollmentId);
            }
        }
    });
}

// Execute immediately or wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

// Populate filter dropdowns with actual data
function populateFilters() {
    const courses = [...new Set(enrollmentData.map(e => e.course).filter(Boolean))];
    const years = [...new Set(enrollmentData.map(e => e.year).filter(Boolean))];
    const sections = [...new Set(enrollmentData.map(e => e.section).filter(Boolean))];
    
    const courseSelect = document.getElementById('registrar_enrollment_filter_course');
    courseSelect.innerHTML = '<option selected disabled>Filter by Course</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseSelect.appendChild(option);
    });
    
    const yearSelect = document.getElementById('registrar_enrollment_filter_year');
    yearSelect.innerHTML = '<option selected disabled>Filter by Year</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    
    const sectionSelect = document.getElementById('registrar_enrollment_filter_section');
    sectionSelect.innerHTML = '<option selected disabled>Filter by Section</option>';
    sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = section;
        sectionSelect.appendChild(option);
    });
    
    const statusSelect = document.getElementById('registrar_enrollment_filter_status');
    statusSelect.innerHTML = '<option selected disabled>Filter by Status</option>';
    statusSelect.innerHTML += '<option value="pending">Pending</option>';
    statusSelect.innerHTML += '<option value="completed">Completed</option>';
}

// Apply filters and search
function applyFilters() {
    const courseFilter = document.getElementById('registrar_enrollment_filter_course').value;
    const yearFilter = document.getElementById('registrar_enrollment_filter_year').value;
    const sectionFilter = document.getElementById('registrar_enrollment_filter_section').value;
    const statusFilter = document.getElementById('registrar_enrollment_filter_status').value;
    const searchTerm = document.getElementById('registrar_enrollment_search_input').value.toLowerCase();
    
    filteredData = enrollmentData.filter(enrollment => {
        const matchesCourse = !courseFilter || courseFilter === 'Filter by Course' || enrollment.course === courseFilter;
        const matchesYear = !yearFilter || yearFilter === 'Filter by Year' || enrollment.year === yearFilter;
        const matchesSection = !sectionFilter || sectionFilter === 'Filter by Section' || enrollment.section === sectionFilter;
        const isCompleted = enrollment.dean_status === 'approved' && 
                           enrollment.business_status === 'approved' && 
                           enrollment.registrar_status === 'approved';
        const enrollmentStatus = isCompleted ? 'completed' : 'pending';
        const matchesStatus = !statusFilter || statusFilter === 'Filter by Status' || enrollmentStatus === statusFilter.toLowerCase();
        const matchesSearch = !searchTerm || 
            enrollment.student_name.toLowerCase().includes(searchTerm) ||
            enrollment.course.toLowerCase().includes(searchTerm) ||
            enrollment.id_number.toLowerCase().includes(searchTerm);
        
        return matchesCourse && matchesYear && matchesSection && matchesStatus && matchesSearch;
    });
    
    renderEnrollmentTable();
}

// Reset all filters and search
function resetFilters() {
    document.getElementById('registrar_enrollment_filter_course').value = 'Filter by Course';
    document.getElementById('registrar_enrollment_filter_year').value = 'Filter by Year';
    document.getElementById('registrar_enrollment_filter_section').value = 'Filter by Section';
    document.getElementById('registrar_enrollment_filter_status').value = 'Filter by Status';
    
    document.getElementById('registrar_enrollment_search_input').value = '';
    
    filteredData = [...enrollmentData];
    renderEnrollmentTable();
}

// Attach action button listeners
function attachActionButtonListeners() {
    const buttons = document.querySelectorAll(".registrar-enrollment-action-btn");
    
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
function showApprovalSidebar(enrollmentId) {
    // Close any open sidebars first
    closeAllSidebars();
    
    currentApproveId = enrollmentId;
    clearOtpInput();
    document.getElementById("registrar_enrollment_otpError").style.display = "none";
    document.getElementById("registrar_enrollment_otpSidebar").classList.add("show");
}

// Show disapproval sidebar
function showDisapprovalSidebar(enrollmentId) {
    // Close any open sidebars first
    closeAllSidebars();
    
    currentDisapproveId = enrollmentId;
    clearDisapproveChecks();
    
    document.getElementById("registrar_enrollment_disapprove_pin_input").value = "";
    document.getElementById("registrar_enrollment_disapprove_pin_error").style.display = "none";
    document.getElementById("registrar_enrollment_disapprove_pin_step").style.display = "block";
    document.getElementById("registrar_enrollment_disapprove_reason_step").style.display = "none";
    
    document.getElementById("registrar_enrollment_disapproveError").style.display = "none";
    document.getElementById("registrar_enrollment_appointmentError").style.display = "none";
    
    document.getElementById("registrar_enrollment_disapproveSidebar").classList.add("show");
}

// Setup OTP sidebar listeners
function setupOtpSidebarListeners() {
    const approveBtn = document.getElementById("registrar_enrollment_verifyOtpBtn");
    approveBtn.addEventListener("click", async () => {
        const input = document.getElementById("registrar_enrollment_otpinput");
        const code = input.value.trim();
        const comment = document.getElementById("registrar_enrollment_otpComment").value.trim();
        
        // Show loading state
        const submitBtn = document.getElementById('registrar_enrollment_verifyOtpBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        try {
            const response = await fetch('/registrar/enrollment/approve/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    enrollment_id: currentApproveId,
                    pin: code,
                    comment: comment
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showAlert('Enrollment approved successfully', 'success');
                closeOtpSidebar();
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadEnrollmentData();
                }, 1000);
            } else {
                showAlert(result.error || 'Error approving enrollment', 'danger');
            }
        } catch (error) {
            console.error('Error approving enrollment:', error);
            showAlert('Error approving enrollment', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
    
    document.getElementById("registrar_enrollment_disapprove_pin_submit_btn").addEventListener("click", () => {
        const pinInput = document.getElementById("registrar_enrollment_disapprove_pin_input").value.trim();
        
        document.getElementById("registrar_enrollment_disapprove_pin_error").style.display = "none";
        
        document.getElementById("registrar_enrollment_disapprove_pin_step").style.display = "none";
        document.getElementById("registrar_enrollment_disapprove_reason_step").style.display = "flex";
    });
    
    document.getElementById("registrar_enrollment_submit_Appointment_Disapproval_Btn").addEventListener("click", async () => {
        let checkedReasons = Array.from(document.querySelectorAll('#registrar_enrollment_disapproveSidebar input[type="checkbox"]:checked')).map(cb => cb.value);
        const appointmentDate = document.getElementById("registrar_enrollment_appointmentDate").value;
        const comment = document.getElementById("registrar_enrollment_disapproveComment").value.trim();
        const pinInput = document.getElementById("registrar_enrollment_disapprove_pin_input").value.trim();
        
        const otherReasonChecked = document.getElementById("registrar_enrollment_reasonOther").checked;
        const otherReasonInput = document.getElementById("registrar_enrollment_otherReasonInput").value.trim();
        
        if (otherReasonChecked && otherReasonInput !== "") {
            checkedReasons = checkedReasons.filter(r => r !== "Other");
            checkedReasons.push(otherReasonInput);
        }
        
        document.getElementById("registrar_enrollment_disapproveError").style.display = "none";
        document.getElementById("registrar_enrollment_appointmentError").style.display = "none";
        
        if (checkedReasons.length === 0) {
            document.getElementById("registrar_enrollment_disapproveError").style.display = "block";
            return;
        }
        
        if (!appointmentDate) {
            document.getElementById("registrar_enrollment_appointmentError").style.display = "block";
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('registrar_enrollment_submit_Appointment_Disapproval_Btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        try {
            let response;
            // Check if this is bulk or individual action
            if (currentAction === 'bulk_disapprove') {
                // Bulk disapprove
                response = await fetch('/registrar/enrollment/bulk-disapprove/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        enrollment_ids: window.bulkEnrollmentIds,
                        pin: pinInput,
                        reason: checkedReasons.join(', '),
                        appointment_date: appointmentDate,
                        comment: comment
                    })
                });
            } else {
                // Individual disapprove
                response = await fetch('/registrar/enrollment/disapprove/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        enrollment_id: currentDisapproveId,
                        pin: pinInput,
                        reasons: checkedReasons,
                        appointment_date: appointmentDate,
                        comment: comment
                    })
                });
            }
            
            const result = await response.json();
            
            if (response.ok) {
                showAlert('Enrollment disapproved successfully', 'success');
                closeDisapproveSidebar();
                // Add small delay to ensure database transaction is committed
                setTimeout(() => {
                    loadEnrollmentData();
                }, 1000);
            } else {
                showAlert(result.error || 'Error disapproving enrollment', 'danger');
            }
        } catch (error) {
            console.error('Error disapproving enrollment:', error);
            showAlert('Error disapproving enrollment', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
    
    document.getElementById("registrar_enrollment_reasonOther").addEventListener("change", toggleOtherReasonInput);
}

// Delete enrollment with modal
function deleteEnrollment(enrollmentId) {
    showDeleteModal([enrollmentId], false);
}

// Show delete modal
function showDeleteModal(enrollmentIds, isBulk) {
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
                            Are you sure you want to delete ${isBulk ? enrollmentIds.length + ' enrollment(s)' : 'this enrollment'}?
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
                        <button type="button" class="btn btn-danger delete-confirm-btn" data-ids="${enrollmentIds.join(',')}" data-bulk="${isBulk}">
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
        const enrollmentIdsString = this.dataset.ids;
        const isBulk = this.dataset.bulk === 'true';
        const enrollmentIds = enrollmentIdsString.split(',');
        
        modal.hide();
        if (isBulk) {
            performBulkDeleteEnrollment(enrollmentIds);
        } else {
            performDeleteEnrollment(enrollmentIds[0]);
        }
    });

    document.getElementById('deleteModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Perform bulk delete
async function performBulkDeleteEnrollment(enrollmentIds) {
    try {
        const response = await fetch('/registrar/enrollment/bulk-delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                enrollment_ids: enrollmentIds
            })
        });

        const result = await response.json();

        if (response.ok) {
            showAlert(`Successfully deleted ${enrollmentIds.length} enrollment(s)`, 'success');
            // Add small delay to ensure database transaction is committed
            setTimeout(() => {
                loadEnrollmentData();
            }, 1000);
        } else {
            showAlert(result.error || 'Error deleting enrollments', 'danger');
        }
    } catch (error) {
        console.error('Error bulk deleting enrollments:', error);
        showAlert('Error deleting enrollments', 'danger');
    }
}

// Perform single delete
async function performDeleteEnrollment(enrollmentId) {
    try {
        const response = await fetch(`/registrar/enrollment/delete/${enrollmentId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('Enrollment deleted successfully', 'success');
            // Add small delay to ensure database transaction is committed
            setTimeout(() => {
                loadEnrollmentData();
            }, 1000);
        } else {
            showAlert(result.error || 'Error deleting enrollment', 'danger');
        }
    } catch (error) {
        console.error('Error deleting enrollment:', error);
        showAlert('Error deleting enrollment', 'danger');
    }
}

// Utility functions
function closeOtpSidebar() {
    document.getElementById("registrar_enrollment_otpSidebar").classList.remove("show");
}

function closeDisapproveSidebar() {
    document.getElementById("registrar_enrollment_disapproveSidebar").classList.remove("show");
}

function closeAllSidebars() {
    // Close OTP sidebar
    const otpSidebar = document.getElementById("registrar_enrollment_otpSidebar");
    if (otpSidebar) {
        otpSidebar.classList.remove("show");
    }
    
    // Close disapprove sidebar
    const disapproveSidebar = document.getElementById("registrar_enrollment_disapproveSidebar");
    if (disapproveSidebar) {
        disapproveSidebar.classList.remove("show");
    }
    
    // Reset global variables
    currentApproveId = null;
    currentDisapproveId = null;
}

function clearOtpInput() {
    document.getElementById("registrar_enrollment_otpComment").value = "";
    const input = document.getElementById("registrar_enrollment_otpinput");
    input.value = "";
    input.focus();
}

function clearDisapproveChecks() {
    document.getElementById("registrar_enrollment_disapproveComment").value = "";
    document.querySelectorAll('#registrar_enrollment_disapproveSidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById("registrar_enrollment_appointmentDate").value = "";
    document.getElementById("registrar_enrollment_appointmentError").style.display = "none";
    document.getElementById("registrar_enrollment_disapproveError").style.display = "none";
    document.getElementById("registrar_enrollment_otherReasonInput").value = "";
    document.getElementById("registrar_enrollment_otherReasonContainer").style.display = "none";
}

function editDisapprovedEnrollment(enrollmentId) {
    showApprovalSidebar(enrollmentId);
}

function toggleOtherReasonInput() {
    const otherCheckbox = document.getElementById("registrar_enrollment_reasonOther");
    const otherInputContainer = document.getElementById("registrar_enrollment_otherReasonContainer");
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
    const selectAllCheckbox = document.getElementById('registrar_enrollment_select_all');
    const individualCheckboxes = document.querySelectorAll('.enrollment-checkbox');
    
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
    const selectedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');
    const bulkActionsDiv = document.getElementById('registrar_enrollment_bulk_actions');
    const selectedCountSpan = document.getElementById('registrar_enrollment_selected_count');
    
    if (selectedCheckboxes.length > 0) {
        bulkActionsDiv.style.display = 'block';
        selectedCountSpan.textContent = `${selectedCheckboxes.length} selected`;
    } else {
        bulkActionsDiv.style.display = 'none';
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('registrar_enrollment_select_all');
    const individualCheckboxes = document.querySelectorAll('.enrollment-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');
    
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
function bulkPrintEnrollment() {
    if (window.EnrollmentPrint) {
        window.EnrollmentPrint.bulkPrint();
    }
}

function bulkDeleteEnrollment() {
    const selectedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one enrollment form to delete', 'warning');
        return;
    }
    
    const enrollmentIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    showDeleteModal(enrollmentIds, true);
}

// Legacy functions for backward compatibility
function printEnrollment(enrollmentId) {
    if (window.EnrollmentPrint) {
        window.EnrollmentPrint.printSingle(enrollmentId);
    }
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
    
    // Show loading
    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';
    contentEl.innerHTML = '';
    
    // Add modal close handler to clean up any CSS interference
    const handleModalHidden = function() {
        // Clear content to prevent CSS bleeding
        if (contentEl) contentEl.innerHTML = '';
        // Remove any dynamically added styles that might affect the main page
        const dynamicStyles = document.querySelectorAll('style[data-modal-injected]');
        dynamicStyles.forEach(style => style.remove());
        modalElement.removeEventListener('hidden.bs.modal', handleModalHidden);
    };
    modalElement.addEventListener('hidden.bs.modal', handleModalHidden);
    
    // Show modal
    modal.show();
    
    // Load form content
    fetch(`/registrar/enrollment/print/${enrollmentId}/`)
        .then(response => response.text())
        .then(html => {
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from server');
            }
            
            // Show content
            contentEl.innerHTML = `<div class="pdf-modal-content">${html}</div>`;
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

// ============= BULK OPERATIONS =============

// Global variables for bulk operations
let currentAction = null;
let bulkEnrollmentIds = [];

// Bulk Approve Functionality
function bulkApproveEnrollment() {
    const selectedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one enrollment form to approve', 'warning');
        return;
    }
    
    // Filter out forms that are already approved or disapproved
    const actionableIds = [];
    const alreadyApproved = [];
    const alreadyDisapproved = [];
    
    selectedCheckboxes.forEach(checkbox => {
        const enrollmentId = checkbox.value;
        const index = checkbox.getAttribute('data-index');
        
        // Get enrollment data from the current filtered dataset
        if (index !== null && filteredData && filteredData[index]) {
            const enrollment = filteredData[index];
            if (enrollment.registrar_status === 'approved') {
                alreadyApproved.push(enrollment.student_name || enrollmentId);
            } else if (enrollment.registrar_status === 'disapproved') {
                // Cannot approve disapproved forms
                alreadyDisapproved.push(enrollment.student_name || enrollmentId);
            } else {
                actionableIds.push(enrollmentId);
            }
        } else {
            // If we can't determine status, include it to be safe
            actionableIds.push(enrollmentId);
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
function bulkDisapproveEnrollment() {
    const selectedCheckboxes = document.querySelectorAll('.enrollment-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one enrollment form to disapprove', 'warning');
        return;
    }
    
    // Filter out forms that are already disapproved or approved
    const actionableIds = [];
    const alreadyDisapproved = [];
    const alreadyApproved = [];
    
    selectedCheckboxes.forEach(checkbox => {
        const enrollmentId = checkbox.value;
        const index = checkbox.getAttribute('data-index');
        
        // Get enrollment data from the current filtered dataset
        if (index !== null && filteredData && filteredData[index]) {
            const enrollment = filteredData[index];
            if (enrollment.registrar_status === 'disapproved') {
                alreadyDisapproved.push(enrollment.student_name || enrollmentId);
            } else if (enrollment.registrar_status === 'approved') {
                // Already approved forms cannot be disapproved
                alreadyApproved.push(enrollment.student_name || enrollmentId);
            } else {
                actionableIds.push(enrollmentId);
            }
        } else {
            // If we can't determine status, include it to be safe
            actionableIds.push(enrollmentId);
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
function showBulkApproveSidebar(enrollmentIds) {
    // Close any open sidebars first
    closeAllSidebars();
    
    // Store enrollment IDs and set bulk mode
    window.bulkEnrollmentIds = enrollmentIds;
    currentAction = 'bulk_approve';
    
    // Update sidebar title
    document.getElementById('registrar_enrollment_approve_title').textContent = `BULK APPROVE (${enrollmentIds.length} items)`;
    
    const sidebar = document.getElementById('registrar_enrollment_otpSidebar');
    sidebar.classList.add('show');
    
    // Clear previous inputs
    document.getElementById('registrar_enrollment_otpinput').value = '';
    document.getElementById('registrar_enrollment_otpComment').value = '';
    document.getElementById('registrar_enrollment_otpError').style.display = 'none';
}

// Show Bulk Disapprove Sidebar
function showBulkDisapproveSidebar(enrollmentIds) {
    // Close any open sidebars first
    closeAllSidebars();
    
    // Store enrollment IDs and set bulk mode
    window.bulkEnrollmentIds = enrollmentIds;
    currentAction = 'bulk_disapprove';
    
    // Update sidebar title
    document.getElementById('registrar_enrollment_disapprove_title').textContent = `BULK DISAPPROVE (${enrollmentIds.length} items)`;
    
    const sidebar = document.getElementById('registrar_enrollment_disapproveSidebar');
    sidebar.classList.add('show');
    
    // Reset to step 1
    document.getElementById('registrar_enrollment_disapprove_pin_step').style.display = 'block';
    document.getElementById('registrar_enrollment_disapprove_reason_step').style.display = 'none';
    
    // Clear previous inputs
    document.getElementById('registrar_enrollment_disapprove_pin_input').value = '';
    document.getElementById('registrar_enrollment_disapprove_pin_error').style.display = 'none';
    
    // Clear checkboxes and reasons
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('registrar_enrollment_otherReasonInput').value = '';
    document.getElementById('registrar_enrollment_otherReasonContainer').style.display = 'none';
}

// Update existing approval event listener to handle bulk operations
function updateApprovalHandler() {
    const approveBtn = document.getElementById('registrar_enrollment_verifyOtpBtn');
    if (approveBtn) {
        // Remove existing event listeners by cloning
        const newApproveBtn = approveBtn.cloneNode(true);
        approveBtn.parentNode.replaceChild(newApproveBtn, approveBtn);
        
        newApproveBtn.addEventListener('click', function() {
            const pin = document.getElementById('registrar_enrollment_otpinput').value;
            const comment = document.getElementById('registrar_enrollment_otpComment').value || '';
            
            if (!pin) {
                document.getElementById('registrar_enrollment_otpError').textContent = 'Please enter PIN';
                document.getElementById('registrar_enrollment_otpError').style.display = 'block';
                return;
            }
            
            // Show loading state
            const originalText = newApproveBtn.textContent;
            newApproveBtn.disabled = true;
            newApproveBtn.textContent = 'Processing...';
            
            // Check if this is bulk or individual action
            if (currentAction === 'bulk_approve') {
                // Bulk approve
                fetch('/registrar/enrollment/bulk-approve/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        enrollment_ids: window.bulkEnrollmentIds,
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
                        document.querySelectorAll('.enrollment-checkbox:checked').forEach(cb => cb.checked = false);
                        updateBulkActions();
                        
                        // Reload data immediately
                        console.log('Reloading data after bulk approval...');
                        loadEnrollmentData();
                    } else {
                        document.getElementById('registrar_enrollment_otpError').textContent = data.error || 'Failed to approve enrollments';
                        document.getElementById('registrar_enrollment_otpError').style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('registrar_enrollment_otpError').textContent = 'Network error';
                    document.getElementById('registrar_enrollment_otpError').style.display = 'block';
                })
                .finally(() => {
                    // Restore button state for bulk approval
                    newApproveBtn.disabled = false;
                    newApproveBtn.textContent = originalText;
                });
            } else {
                // Individual approve (existing functionality)
                fetch('/registrar/enrollment/approve/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        enrollment_id: currentApproveId,
                        pin: pin,
                        comment: comment
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        closeAllSidebars();
                        showAlert('Enrollment approved successfully!', 'success');
                        
                        // Reload data immediately
                        console.log('Reloading data after individual approval...');
                        loadEnrollmentData();
                    } else {
                        document.getElementById('registrar_enrollment_otpError').textContent = data.error || 'Error approving enrollment';
                        document.getElementById('registrar_enrollment_otpError').style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('registrar_enrollment_otpError').textContent = 'Network error';
                    document.getElementById('registrar_enrollment_otpError').style.display = 'block';
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