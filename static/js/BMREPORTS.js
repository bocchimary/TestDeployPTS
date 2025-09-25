// Business Manager Reports JavaScript - Mirrors Signatory Reports exactly
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    initializeReportsPage();
    
    // Set current date
    const today = new Date();
    document.getElementById('bm_generate_report_dateToday').textContent = today.toLocaleDateString();
    
    // Load initial data
    loadReportsData();
    loadGeneratedReportsList();
    
    // Add event listeners
    setupEventListeners();
    setupSearchFunctionality();
});

function initializeReportsPage() {
    console.log('Initializing Business Manager Reports Page');
}

function setupEventListeners() {
    // Filter change events
    document.getElementById('bm_generate_report_fromDate').addEventListener('change', loadReportsData);
    document.getElementById('bm_generate_report_toDate').addEventListener('change', loadReportsData);
    document.getElementById('bm_generate_report_formStatus').addEventListener('change', loadReportsData);
    document.getElementById('bm_generate_report_periodType').addEventListener('change', loadReportsData);
    
    // Generate report button
    document.getElementById('bm_generate_report_generateButton').addEventListener('click', generateReport);
}

function loadReportsData() {
    const filters = getReportFilterParamsWithSearch();
    console.log("📤 Sending filters to report API:", filters);
    
    fetch(`/business-manager/reports/api/data/?${new URLSearchParams(filters)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateReportsTable(data.reports);
            } else {
                showError('Failed to load reports data');
            }
        })
        .catch(error => {
            console.error('Error loading reports data:', error);
            showError('Error loading reports data');
        });
}

function loadGeneratedReportsList() {
    fetch('/business-manager/reports/generated-list/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateGeneratedReportsList(data.reports);
            } else {
                console.error('Failed to load generated reports:', data.error);
            }
        })
        .catch(error => {
            console.error('Error loading generated reports:', error);
        });
}

function getReportFilterParams() {
    let formStatus = document.getElementById('bm_generate_report_formStatus').value;

    // Normalize form_status to match backend expectations
    if (formStatus === 'approved_forms') formStatus = 'approve';
    else if (formStatus === 'disapproved_forms') formStatus = 'disapprove';
    else if (formStatus === 'pending_forms') formStatus = 'view';

    return {
        from_date: document.getElementById('bm_generate_report_fromDate').value,
        to_date: document.getElementById('bm_generate_report_toDate').value,
        form_status: formStatus,
        period_type: document.getElementById('bm_generate_report_periodType').value
    };
}

function updateReportsTable(reports) {
    const tableBody = document.getElementById('bm_generate_report_tableBody');
    
    if (reports.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    No reports found for the selected filters
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = reports.map(report => `
        <tr>
            <td>${report.student_name}</td>
            <td>${report.course}</td>
            <td>${report.form_type}</td>
            <td>
                <span class="badge ${getActionBadgeClass(report.action_type)}">
                    ${report.action_type}
                </span>
            </td>
            <td>${report.business_manager}</td>
            <td>${report.date}</td>
            <td>${report.time}</td>
            <td>
                <span class="badge bg-info" title="IP Address">
                    ${report.ip_address}
                </span>
            </td>
        </tr>
    `).join('');
}

function updateGeneratedReportsList(reports) {
    const listGroup = document.getElementById('bm_generate_report_listGroup');
    
    if (reports.length === 0) {
        listGroup.innerHTML = `
            <li class="list-group-item text-center text-muted">
                <i class="bi bi-inbox fs-4 d-block mb-2"></i>
                No auto-generated reports available
            </li>
        `;
        return;
    }
    
    listGroup.innerHTML = reports.map(report => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <h6 class="mb-1">${report.report_type_display}</h6>
                <small class="text-muted">
                    ${report.period_type_display} • ${report.start_date} to ${report.end_date}
                </small>
                <br>
                <small class="text-muted">Generated: ${report.generated_at}</small>
            </div>
            <div class="btn-group" role="group">
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="downloadReport('${report.id}')">
                    <i class="bi bi-download"></i> Download
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="viewReport('${report.id}')">
                    <i class="bi bi-eye"></i> View
                </button>
            </div>
        </li>
    `).join('');
}

function getActionBadgeClass(actionType) {
    const key = (actionType || '').toLowerCase();
    switch (key) {
        case 'approve':
            return 'bg-success';
        case 'disapprove':
            return 'bg-danger';
        case 'print':
            return 'bg-info';
        case 'delete':
            return 'bg-warning text-dark';
        case 'view':
            return 'bg-secondary';
        default:
            return 'bg-secondary';
    }
}

function generateReport() {
    const reportType = document.getElementById('bm_generate_report_formStatus').value || '';
    const periodType = document.getElementById('bm_generate_report_periodType').value || '';
    const fromDate = document.getElementById('bm_generate_report_fromDate').value;
    const toDate = document.getElementById('bm_generate_report_toDate').value;

    const formData = new FormData();
    formData.append('report_type', reportType);
    formData.append('period_type', periodType);
    formData.append('from_date', fromDate);
    formData.append('to_date', toDate);

    fetch('/business-manager/reports/generate-manual-report/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('Report generated successfully!');
            loadGeneratedReportsList();
        } else {
            showError(data.error || 'Failed to generate report');
        }
    })
    .catch(error => {
        console.error('Error generating report:', error);
        showError('Error generating report');
    });
}

function downloadReport(reportId) {
    window.open(`/business-manager/reports/download-report/${reportId}/`, '_blank');
}

function viewReport(reportId) {
    window.open(`/business-manager/reports/download-report/${reportId}/`, '_blank');
}

function bm_generate_report_toggleGeneratedReportsPanel() {
    const panel = document.getElementById('bm_generate_report_generatedPanel');
    const isVisible = panel.style.right === '0px' || panel.style.right === '0';
    
    if (isVisible) {
        panel.style.right = '-400px';
    } else {
        panel.style.right = '0';
        // Reload the list when opening
        loadGeneratedReportsList();
    }
}

// Utility functions
function showSuccess(message) {
    // You can implement a toast notification system here
    alert(message);
}

function showError(message) {
    // You can implement a toast notification system here
    alert('Error: ' + message);
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

// Auto-generated reports functionality
function bm_generate_report_generateReport() {
    generateReport();
}

// Legacy functions for compatibility
function updateNotificationCount(count) {
    const badge = document.getElementById("bm_sidebar_notification_count");
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? "inline-block" : "none";
    }
}

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

window.addEventListener("resize", function () {
    const bm_sidebar = document.getElementById("bm_sidebar");
    const bm_sidebar_backdrop = document.getElementById("bm_sidebar_sidebarBackdrop");
    if (window.innerWidth > 768) {
        bm_sidebar.classList.remove("show");
        bm_sidebar_backdrop.classList.remove("active");
    }
});

// Clear filters function
function bm_clearFilters() {
    document.getElementById('bm_generate_report_fromDate').value = '';
    document.getElementById('bm_generate_report_toDate').value = '';
    document.getElementById('bm_generate_report_formStatus').selectedIndex = 0;
    document.getElementById('bm_generate_report_periodType').selectedIndex = 0;
    
    const searchText = document.getElementById('bm_reports_searchText');
    if (searchText) {
        searchText.value = '';
    }
    
    // Reload data with cleared filters
    loadReportsData();
}

// Export to CSV function
function bm_exportToCSV() {
    const filters = getReportFilterParams();
    
    // Create export URL with filters
    const url = `/business-manager/reports/export/csv/?${new URLSearchParams(filters)}`;
    window.open(url, '_blank');
}

// Add search functionality
function setupSearchFunctionality() {
    const searchInput = document.getElementById('bm_reports_searchText');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Debounce search to avoid too many requests
            clearTimeout(window.bm_searchTimeout);
            window.bm_searchTimeout = setTimeout(() => {
                loadReportsData();
            }, 500);
        });
    }
}

// Update the search functionality in loadReportsData
function getReportFilterParamsWithSearch() {
    const baseParams = getReportFilterParams();
    const searchText = document.getElementById('bm_reports_searchText');
    
    if (searchText && searchText.value.trim()) {
        baseParams.search = searchText.value.trim();
    }
    
    return baseParams;
}

// Make functions globally available
window.bm_generate_report_toggleGeneratedReportsPanel = bm_generate_report_toggleGeneratedReportsPanel;
window.bm_generate_report_generateReport = bm_generate_report_generateReport;
window.bm_clearFilters = bm_clearFilters;
window.bm_exportToCSV = bm_exportToCSV;