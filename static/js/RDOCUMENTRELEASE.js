// Global variables
let documentReleaseData = [];
let filteredData = [];

// Initialize the page
document.addEventListener("DOMContentLoaded", function () {
    // Set today's date
    const dateSpan = document.getElementById("registrar_docu_release_dateToday");
    if (dateSpan) {
        const today = new Date();
        const formatted = today.toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        dateSpan.textContent = formatted;
    }

    // Load document release data
    loadDocumentReleaseData();

    // Set up event listeners
    setupEventListeners();
});

// Load document release data from API
async function loadDocumentReleaseData() {
    try {
        const response = await fetch('/registrar/document-release/api/data/');
        const result = await response.json();
        
        if (response.ok) {
            documentReleaseData = result.data;
            filteredData = [...documentReleaseData];
            
            // Populate filter dropdowns with actual data
            populateFilters();
            
            renderDocumentReleaseTable();
        } else {
            console.error('Error loading document release data:', result.error);
            showAlert('Error loading document release data', 'danger');
        }
    } catch (error) {
        console.error('Error loading document release data:', error);
        showAlert('Error loading document release data', 'danger');
    }
}

// Render the document release table
function renderDocumentReleaseTable() {
    const tbody = document.getElementById('registrar_docu_release_table_body');
    if (!tbody) {
        return;
    }
    
    tbody.innerHTML = '';

    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center text-muted py-4">
                    No document release requests found
                </td>
            </tr>
        `;
        return;
    }

    filteredData.forEach((documentRequest, index) => {
        const row = document.createElement('tr');
        
        // Get student profile data
        const studentProfile = documentRequest.requester.profile || {};
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="document-release-checkbox" value="${documentRequest.id}" data-index="${index}">
            </td>
            <td class="text-start">${documentRequest.requester.full_name || 'N/A'}</td>
            <td>${studentProfile.program || 'N/A'}</td>
            <td>${studentProfile.year_level || 'N/A'}</td>
            <td>${documentRequest.requester.section || 'N/A'}</td>
            <td>${studentProfile.student_number || 'N/A'}</td>
            <td><div class="small text-muted">${formatDate(documentRequest.created_at) || 'N/A'}</div></td>
            <td>${documentRequest.document_type || 'N/A'}</td>
            <td>${documentRequest.purpose || 'N/A'}</td>
            <td>${renderBusinessManagerStatus(documentRequest)}</td>
            <td><div class="small text-muted">${getStatusBadge(documentRequest.status)}</div></td>
            <td><div class="small text-muted">${documentRequest.preferred_release ? formatDate(documentRequest.preferred_release) : 'Not set'}</div></td>
            <td>${getReleaseDateSelector(documentRequest)}</td>
            <td>
                <div class="registrar_docu_release_table-icons">
                    <button type="button" class="btn btn-warning btn-sm" onclick="updateStatus('${documentRequest.id}', 'processing')" ${documentRequest.status === 'processing' ? 'disabled' : ''}>
                        <i class="bi bi-clock me-1"></i>Processing
                    </button>
                    <button type="button" class="btn btn-info btn-sm" onclick="updateStatus('${documentRequest.id}', 'ready')" ${documentRequest.status === 'ready' ? 'disabled' : ''}>
                        <i class="bi bi-check-circle me-1"></i>Ready
                    </button>
                    <button type="button" class="btn btn-success btn-sm" onclick="updateStatus('${documentRequest.id}', 'released')" ${documentRequest.status === 'released' ? 'disabled' : ''}>
                        <i class="bi bi-box-arrow-right me-1"></i>Released
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Set up checkbox listeners for bulk actions
    setupCheckboxListeners();
}

// Get student section from enrollment form
function getStudentSection(student) {
    // Get section from the student data structure
    return student.section || 'N/A';
}

// Render Business Manager status column
function renderBusinessManagerStatus(documentRequest) {
    const bmStatus = documentRequest.business_manager_status || 'pending';
    const timestamp = documentRequest.business_manager_timestamp || '';
    
    if (bmStatus === 'approved') {
        return `<div class="text-success small">
            <i class="bi bi-check-circle"></i> Approved
            ${timestamp ? `<br><small class="text-muted">${timestamp}</small>` : ''}
        </div>`;
    } else if (bmStatus === 'disapproved') {
        return `<div class="text-danger small">
            <i class="bi bi-x-circle"></i> Disapproved
            ${timestamp ? `<br><small class="text-muted">${timestamp}</small>` : ''}
        </div>`;
    } else {
        return `<div class="text-muted small">
            <i class="bi bi-clock"></i> Pending
        </div>`;
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Get status badge HTML
function getStatusBadge(status) {
    switch(status) {
        case 'pending':
            return '<span class="badge bg-warning">Pending</span>';
        case 'processing':
            return '<span class="badge bg-info">Processing</span>';
        case 'ready':
            return '<span class="badge bg-primary">Ready</span>';
        case 'released':
            return '<span class="badge bg-success">Released</span>';
        case 'blocked_due_to_balance':
            return '<span class="badge bg-danger">Blocked</span>';
        default:
            return '<span class="badge bg-secondary">Unknown</span>';
    }
}

// Get release date selector or display
function getReleaseDateSelector(documentRequest) {
    if (documentRequest.preferred_release) {
        return `
            <div class="d-flex flex-column gap-1">
                <div class="release-date-display">${formatDate(documentRequest.preferred_release)}</div>
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="editReleaseDate('${documentRequest.id}')">
                    <i class="bi bi-pencil me-1"></i>Edit Date
                </button>
            </div>
        `;
    } else {
        return `
            <div class="d-flex flex-column gap-1">
                <input type="date" class="form-control form-control-sm" id="release_date_${documentRequest.id}">
                <button type="button" class="btn btn-primary btn-sm" onclick="submitReleaseDate('${documentRequest.id}')">
                    <i class="bi bi-check-circle me-1"></i>Submit Date
                </button>
            </div>
        `;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Filter event listeners
    document.getElementById('registrar_docu_release_filter_course').addEventListener('change', applyFilters);
    document.getElementById('registrar_docu_release_filter_year').addEventListener('change', applyFilters);
    document.getElementById('registrar_docu_release_filter_section').addEventListener('change', applyFilters);
    document.getElementById('registrar_docu_release_filter_status').addEventListener('change', applyFilters);
    
    // Search event listeners
    document.getElementById('registrar_docu_release_search_input').addEventListener('input', applyFilters);
    
    // Reset filters button
    document.getElementById('registrar_docu_release_reset_filters').addEventListener('click', resetFilters);
}

// Populate filter dropdowns with actual data
function populateFilters() {
    const courses = [...new Set(documentReleaseData.map(d => d.requester.profile?.program).filter(Boolean))];
    const years = [...new Set(documentReleaseData.map(d => d.requester.profile?.year_level).filter(Boolean))];
    const sections = [...new Set(documentReleaseData.map(d => d.requester.section).filter(Boolean))];
    
    // Populate course filter
    const courseSelect = document.getElementById('registrar_docu_release_filter_course');
    courseSelect.innerHTML = '<option selected disabled>Filter by Course</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseSelect.appendChild(option);
    });
    
    // Populate year filter
    const yearSelect = document.getElementById('registrar_docu_release_filter_year');
    yearSelect.innerHTML = '<option selected disabled>Filter by Year</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    
    // Populate section filter
    const sectionSelect = document.getElementById('registrar_docu_release_filter_section');
    sectionSelect.innerHTML = '<option selected disabled>Filter by Section</option>';
    sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = section;
        sectionSelect.appendChild(option);
    });
}

// Apply filters and search
function applyFilters() {
    const courseFilter = document.getElementById('registrar_docu_release_filter_course').value;
    const yearFilter = document.getElementById('registrar_docu_release_filter_year').value;
    const sectionFilter = document.getElementById('registrar_docu_release_filter_section').value;
    const statusFilter = document.getElementById('registrar_docu_release_filter_status').value;
    const searchTerm = document.getElementById('registrar_docu_release_search_input').value.toLowerCase();
    
    filteredData = documentReleaseData.filter(documentRequest => {
        const studentProfile = documentRequest.requester.profile || {};
        const matchesCourse = !courseFilter || courseFilter === 'Filter by Course' || studentProfile.program === courseFilter;
        const matchesYear = !yearFilter || yearFilter === 'Filter by Year' || studentProfile.year_level === yearFilter;
        const matchesSection = !sectionFilter || sectionFilter === 'Filter by Section' || getStudentSection(documentRequest.requester) === sectionFilter;
        const matchesStatus = !statusFilter || statusFilter === 'Filter by Status' || documentRequest.status === statusFilter;
        const matchesSearch = !searchTerm || 
            documentRequest.requester.full_name.toLowerCase().includes(searchTerm) ||
            studentProfile.program.toLowerCase().includes(searchTerm) ||
            studentProfile.student_number.toLowerCase().includes(searchTerm);
        
        return matchesCourse && matchesYear && matchesSection && matchesStatus && matchesSearch;
    });
    
    renderDocumentReleaseTable();
}

// Reset all filters and search
function resetFilters() {
    // Reset all filter dropdowns
    document.getElementById('registrar_docu_release_filter_course').value = 'Filter by Course';
    document.getElementById('registrar_docu_release_filter_year').value = 'Filter by Year';
    document.getElementById('registrar_docu_release_filter_section').value = 'Filter by Section';
    document.getElementById('registrar_docu_release_filter_status').value = 'Filter by Status';
    
    // Clear search input
    document.getElementById('registrar_docu_release_search_input').value = '';
    
    // Reset filtered data to show all data
    filteredData = [...documentReleaseData];
    
    // Re-render table
    renderDocumentReleaseTable();
}

// Submit release date function
async function submitReleaseDate(documentRequestId) {
    const releaseDateInput = document.getElementById(`release_date_${documentRequestId}`);
    const releaseDate = releaseDateInput.value;
    
    if (!releaseDate) {
        showAlert('Please select a release date', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/registrar/document-release/submit-date/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                document_request_id: documentRequestId,
                release_date: releaseDate
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Release date submitted successfully', 'success');
            loadDocumentReleaseData(); // Reload data
        } else {
            showAlert(result.error || 'Error submitting release date', 'danger');
        }
    } catch (error) {
        console.error('Error submitting release date:', error);
        showAlert('Error submitting release date', 'danger');
    }
}

// Edit release date function
function editReleaseDate(documentRequestId) {
    const cell = document.querySelector(`[onclick="editReleaseDate('${documentRequestId}')"]`).closest('td');
    const currentDate = document.querySelector(`[onclick="editReleaseDate('${documentRequestId}')"]`).closest('.d-flex').querySelector('.release-date-display').textContent;
    
    // Convert display date back to input format (YYYY-MM-DD)
    const dateParts = currentDate.split('/');
    const formattedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
    
    cell.innerHTML = `
        <div class="d-flex flex-column gap-1">
            <input type="date" class="form-control form-control-sm" id="edit_release_date_${documentRequestId}" value="${formattedDate}">
            <button type="button" class="btn btn-primary btn-sm" onclick="updateReleaseDate('${documentRequestId}')">
                <i class="bi bi-check-circle me-1"></i>Update Date
            </button>
        </div>
    `;
}

// Update release date function
async function updateReleaseDate(documentRequestId) {
    const releaseDateInput = document.getElementById(`edit_release_date_${documentRequestId}`);
    const releaseDate = releaseDateInput.value;
    
    if (!releaseDate) {
        showAlert('Please select a release date', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/registrar/document-release/update-date/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                document_request_id: documentRequestId,
                release_date: releaseDate
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Release date updated successfully', 'success');
            loadDocumentReleaseData(); // Reload data
        } else {
            showAlert(result.error || 'Error updating release date', 'danger');
        }
    } catch (error) {
        console.error('Error updating release date:', error);
        showAlert('Error updating release date', 'danger');
    }
}

// Update document status function
async function updateStatus(documentRequestId, newStatus) {
    try {
        const response = await fetch('/registrar/document-release/update-status/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                document_request_id: documentRequestId,
                status: newStatus
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(`Document status updated to ${newStatus}`, 'success');
            loadDocumentReleaseData(); // Reload data
        } else {
            showAlert(result.error || 'Error updating status', 'danger');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showAlert('Error updating status', 'danger');
    }
}

// Delete document release with modal
function deleteDocumentRelease(documentRequestId) {
    showDeleteModal([documentRequestId], false);
}

// Show delete modal
function showDeleteModal(documentRequestIds, isBulk) {
    // Remove existing modal if any
    const existingModal = document.getElementById('deleteModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal HTML
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
                            Are you sure you want to delete ${isBulk ? documentRequestIds.length + ' document request(s)' : 'this document request'}?
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
                        <button type="button" class="btn btn-danger" onclick="confirmDelete('${documentRequestIds.join(',')}', ${isBulk})">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();

    // Clean up modal when hidden
    document.getElementById('deleteModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Confirm delete action
function confirmDelete(documentRequestIdsString, isBulk) {
    const documentRequestIds = documentRequestIdsString.split(',');
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    modal.hide();

    if (isBulk) {
        bulkDeleteDocumentRelease(documentRequestIds);
    } else {
        performDeleteDocumentRelease(documentRequestIds[0]);
    }
}

// Bulk delete document release
async function bulkDeleteDocumentRelease(documentRequestIds) {
    try {
        const response = await fetch('/registrar/document-release/bulk-delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                document_request_ids: documentRequestIds
            })
        });

        const result = await response.json();

        if (response.ok) {
            showAlert(`Successfully deleted ${documentRequestIds.length} document request(s)`, 'success');
            loadDocumentReleaseData(); // Reload data
        } else {
            showAlert(result.error || 'Error deleting document requests', 'danger');
        }
    } catch (error) {
        console.error('Error bulk deleting document requests:', error);
        showAlert('Error deleting document requests', 'danger');
    }
}

// Perform single delete
async function performDeleteDocumentRelease(documentRequestId) {
    try {
        const response = await fetch(`/registrar/document-release/delete/${documentRequestId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('Document request deleted successfully', 'success');
            loadDocumentReleaseData(); // Reload data
        } else {
            showAlert(result.error || 'Error deleting document request', 'danger');
        }
    } catch (error) {
        console.error('Error deleting document request:', error);
        showAlert('Error deleting document request', 'danger');
    }
}

// Checkbox functionality for bulk actions
function setupCheckboxListeners() {
    const selectAllCheckbox = document.getElementById('registrar_docu_release_select_all');
    const individualCheckboxes = document.querySelectorAll('.document-release-checkbox');
    
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
    const selectedCheckboxes = document.querySelectorAll('.document-release-checkbox:checked');
    const bulkActionsDiv = document.getElementById('registrar_docu_release_bulk_actions');
    const selectedCountSpan = document.getElementById('registrar_docu_release_selected_count');
    
    if (selectedCheckboxes.length > 0) {
        bulkActionsDiv.style.display = 'block';
        selectedCountSpan.textContent = `${selectedCheckboxes.length} selected`;
    } else {
        bulkActionsDiv.style.display = 'none';
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('registrar_docu_release_select_all');
    const individualCheckboxes = document.querySelectorAll('.document-release-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.document-release-checkbox:checked');
    
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

// Update the existing bulkDeleteDocumentRelease function to work with checkboxes
function bulkDeleteDocumentRelease() {
    const selectedCheckboxes = document.querySelectorAll('.document-release-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one document request to delete', 'warning');
        return;
    }
    
    const documentRequestIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    showDeleteModal(documentRequestIds, true);
}

// Utility functions
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
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

 