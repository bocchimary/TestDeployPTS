function updateNotificationCount(count) {
    const badge = document.getElementById("registrar_sidebar_notification_count");
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline-block" : "none";
    }
  }

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

document.addEventListener("DOMContentLoaded", function () {
  const dateSpan = document.getElementById("registrar_generate_report_dateToday");
  const today = new Date();
  const formatted = today.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  dateSpan.textContent = formatted;

  // Load initial data and setup listeners
  registrarLoadReportsData();
  setupRegistrarReportListeners();
});

  window.addEventListener("resize", function () {
    const registrar_sidebar = document.getElementById("registrar_sidebar");
    const registrar_sidebar_backdrop = document.getElementById("registrar_sidebar_sidebarBackdrop");
    if (window.innerWidth > 768) {
      registrar_sidebar.classList.remove("show");
      registrar_sidebar_backdrop.classList.remove("active");
    }
  });


function registrar_generate_report_toggleGeneratedReportsPanel() {
    const panel = document.getElementById("registrar_generate_report_generatedPanel");
    panel.classList.toggle("show");
    
    // Load reports when panel is opened
    if (panel.classList.contains("show")) {
      loadGeneratedReportsList();
    }
  }

let allReports = []; // Store all reports for filtering

function loadGeneratedReportsList() {
  // Get filter parameters
  const reportTypeFilter = document.getElementById('reportsFilterType')?.value || '';
  const generationFilter = document.getElementById('reportsFilterGeneration')?.value || '';
  
  // Build query parameters
  const params = new URLSearchParams();
  if (reportTypeFilter) params.append('report_type', reportTypeFilter);
  if (generationFilter) params.append('generation_type', generationFilter);
  
  fetch(`/registrar/reports/api/list/?${params.toString()}`)
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        allReports = data.reports; // Store for client-side filtering if needed
        updateGeneratedReportsList(data.reports);
      } else {
        console.error('Failed to load reports:', data.error);
        updateGeneratedReportsList([]);
      }
    })
    .catch(error => {
      console.error('Error loading reports:', error);
      updateGeneratedReportsList([]);
    });
}

function filterReportsList() {
  // Reload with new filters
  loadGeneratedReportsList();
}

function updateGeneratedReportsList(reports) {
  const listGroup = document.getElementById('registrar_generate_report_listGroup');
  
  if (!reports || reports.length === 0) {
    listGroup.innerHTML = `
      <li class="list-group-item text-center text-muted">
        <i class="bi bi-inbox"></i><br>
        No reports found with current filters
      </li>`;
    return;
  }
  
  listGroup.innerHTML = reports.map(report => {
    const sizeKB = report.file_size ? Math.round(report.file_size / 1024) : 0;
    const sizeMB = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    
    // Enhanced type icons and badges
    const typeIcon = report.type === 'auto' ? 
      '<i class="bi bi-robot text-success"></i>' : 
      '<i class="bi bi-person text-primary"></i>';
    
    // Status badge
    let statusBadge = '';
    if (report.status === 'completed') {
      statusBadge = '<span class="badge bg-success ms-2">✓ Complete</span>';
    } else if (report.status === 'failed') {
      statusBadge = '<span class="badge bg-danger ms-2">✗ Failed</span>';
    } else if (report.status === 'processing') {
      statusBadge = '<span class="badge bg-warning ms-2">⏳ Processing</span>';
    }
    
    // Download/View buttons with proper handling for ZIP vs PDF files
    let actionButtons = '';
    if (report.exists && report.download_url) {
      if (report.filename.endsWith('.zip')) {
        // ZIP files: Direct download only
        actionButtons = `
          <button type="button" class="btn btn-sm btn-outline-success" 
                  onclick="downloadReportFile('${report.download_url}', '${report.filename}')" 
                  title="Download ZIP Pack">
            <i class="bi bi-download"></i> ZIP
          </button>`;
      } else if (report.filename.endsWith('.pdf')) {
        // PDF files: Both view and download
        actionButtons = `
          <button type="button" class="btn btn-sm btn-outline-primary me-1" 
                  onclick="viewReportFile('${report.download_url}')" 
                  title="View PDF Report">
            <i class="bi bi-eye"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-success" 
                  onclick="downloadReportFile('${report.download_url}', '${report.filename}')" 
                  title="Download PDF">
            <i class="bi bi-download"></i>
          </button>`;
      } else {
        // Legacy HTML files: View only (deprecated)
        actionButtons = `
          <button type="button" class="btn btn-sm btn-outline-primary" 
                  onclick="viewReportFile('${report.download_url}')" 
                  title="View Report">
            <i class="bi bi-eye"></i> View
          </button>`;
      }
    } else {
      // File is missing - show regenerate option
      const regenerateButton = getRegenerateButton(report);
      actionButtons = `
        <div class="text-center">
          <small class="text-danger d-block mb-1">Missing file</small>
          ${regenerateButton}
        </div>
      `;
    }
    
    // Format report type for display
    const reportTypeDisplay = report.report_type.includes('Pack') ? 
      `📦 ${report.report_type}` : 
      `📄 ${report.report_type}`;
    
    return `
      <li class="list-group-item">
        <div class="d-flex justify-content-between align-items-start">
          <div class="me-auto">
            <div class="fw-bold mb-1">
              ${typeIcon} ${reportTypeDisplay}${statusBadge}
            </div>
            <small class="text-muted d-block mb-2">
              <div class="row g-2">
                <div class="col-sm-6">
                  <strong>Generated:</strong> ${report.generated_at}<br>
                  <strong>By:</strong> ${report.generated_by}
                </div>
                <div class="col-sm-6">
                  <strong>Size:</strong> ${sizeMB}<br>
                  ${report.date_range !== 'N/A' ? `<strong>Period:</strong> ${report.date_range}` : ''}
                </div>
              </div>
              ${report.notes ? `<div class="mt-1"><em>${report.notes}</em></div>` : ''}
            </small>
          </div>
          <div class="text-end">
            ${actionButtons}
          </div>
        </div>
      </li>
    `;
  }).join('');
}

function getRegenerateButton(report) {
  const reportId = report.id;
  const reportType = report.report_type;
  
  // Different regenerate strategies based on report type
  if (reportType.includes('Pack')) {
    // For packs, we need period info to regenerate
    if (report.date_range && report.date_range !== 'N/A') {
      const weekStart = report.date_range.split(' to ')[0];
      const packType = reportType.replace(' Pack', '').toLowerCase();
      return `
        <button type="button" class="btn btn-warning btn-sm" 
                onclick="regenerateSignatoryPack('${packType}', '${weekStart}', '${reportId}')"
                title="Regenerate missing pack">
          <i class="bi bi-arrow-clockwise"></i> Regenerate
        </button>
      `;
    }
  } else if (reportType === 'Manual Activity Report') {
    return `
      <button type="button" class="btn btn-warning btn-sm" 
              onclick="showRegenerateManualDialog('${reportId}')"
              title="Cannot auto-regenerate manual report - create new one">
        <i class="bi bi-plus-circle"></i> New Report
      </button>
    `;
  } else {
    // For weekly aggregate reports
    if (report.date_range && report.date_range !== 'N/A') {
      const weekStart = report.date_range.split(' to ')[0];
      return `
        <button type="button" class="btn btn-warning btn-sm" 
                onclick="regenerateWeeklyReport('${reportType.toLowerCase()}', '${weekStart}', '${reportId}')"
                title="Regenerate weekly report">
          <i class="bi bi-arrow-clockwise"></i> Regenerate
        </button>
      `;
    }
  }
  
  // Fallback for reports without enough info to regenerate
  return `
    <small class="text-muted">Cannot regenerate<br>
    <em>Missing period info</em></small>
  `;
}

function regenerateSignatoryPack(packType, weekStart, reportId) {
  if (!confirm(`Regenerate ${packType} signatory pack for week ${weekStart}?`)) {
    return;
  }
  
  showPackGenerationFeedback(`Regenerating ${packType} pack for ${weekStart}...`, 'info');
  
  // Calculate week end date
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);
  const weekEnd = endDate.toISOString().split('T')[0];
  
  fetch('/registrar/reports/generate-pack/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({
      form_type: packType,
      from_date: weekStart,
      to_date: weekEnd
    })
  })
  .then(response => {
    if (response.ok && response.headers.get('content-type')?.includes('application/zip')) {
      // Successfully regenerated ZIP - just show success, don't auto-download
      showPackGenerationFeedback(`✅ ${packType} pack regenerated successfully!`, 'success');
      loadGeneratedReportsList(); // Refresh list to show updated entry
    } else if (response.status === 204) {
      showPackGenerationFeedback(`⚠️ No data found for ${packType} pack regeneration`, 'warning');
      loadGeneratedReportsList(); // Still refresh in case entry needs updating
    } else {
      return response.text().then(text => {
        let errorMsg = 'Regeneration failed';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch (e) {
          errorMsg = `${errorMsg} (${response.status})`;
        }
        showPackGenerationFeedback(`❌ Error regenerating pack: ${errorMsg}`, 'danger');
      });
    }
  })
  .catch(error => {
    console.error('Regeneration error:', error);
    showPackGenerationFeedback('❌ Network error during regeneration', 'danger');
  });
}

function regenerateWeeklyReport(reportType, weekStart, reportId) {
  if (!confirm(`Regenerate ${reportType} weekly report for ${weekStart}?`)) {
    return;
  }
  
  showPackGenerationFeedback(`Regenerating ${reportType} weekly report...`, 'info');
  
  // Call weekly reports endpoint (assuming it exists or needs to be created)
  fetch('/registrar/reports/regenerate-weekly/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({
      report_type: reportType,
      week_start: weekStart
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showPackGenerationFeedback(`✅ ${reportType} report regenerated!`, 'success');
      loadGeneratedReportsList();
    } else {
      showPackGenerationFeedback(`❌ Error: ${data.error}`, 'danger');
    }
  })
  .catch(error => {
    console.error('Regeneration error:', error);
    showPackGenerationFeedback('❌ Network error during regeneration', 'danger');
  });
}

function showRegenerateManualDialog(reportId) {
  alert('Manual reports cannot be automatically regenerated.\n\nUse the "Generate Report" button above to create a new manual report with your current filter settings.');
}

function generateSignatoryPack() {
  const packType = document.getElementById('packReportType').value;
  const weekStart = document.getElementById('packWeekStart').value;
  const generateBtn = document.getElementById('generatePackBtn');
  
  if (!packType || !weekStart) {
    showPackGenerationFeedback('Please select both report type and date range', 'warning');
    return;
  }
  
  // Get end date (one week after start date)
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);
  const weekEnd = endDate.toISOString().split('T')[0];
  
  // Disable all form controls during generation
  document.getElementById('packReportType').disabled = true;
  document.getElementById('packWeekStart').disabled = true;
  generateBtn.disabled = true;
  
  // Show enhanced loading state for ZIP generation
  generateBtn.innerHTML = `
    <div class="d-flex align-items-center">
      <span class="spinner-border spinner-border-sm me-2"></span>
      <span>Generating ZIP...</span>
    </div>
  `;
  
  showPackGenerationFeedback(`Generating ${packType} signatory pack (ZIP)...`, 'info');
  
  const startTime = Date.now();
  
  fetch('/registrar/reports/generate-pack/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({
      form_type: packType,
      from_date: weekStart,
      to_date: weekEnd
    })
  })
  .then(response => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/zip')) {
        // Handle ZIP response
        return response.blob().then(blob => {
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          
          // Generate ZIP filename
          const formattedDate = weekStart.replace(/-/g, '');
          let filename = `${packType}_pack_${formattedDate}.zip`;
          
          // Try to extract filename from content-disposition header
          const contentDisposition = response.headers.get('content-disposition');
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
          }
          
          a.download = filename;
          
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          showPackGenerationFeedback(`✅ ZIP pack generated and downloaded in ${elapsedTime}s!`, 'success');
          
          // Refresh the reports list after successful generation
          if (document.getElementById('registrar_generate_report_generatedPanel').classList.contains('show')) {
            loadGeneratedReportsList();
          }
          
          return { success: true };
        });
      } else if (response.status === 204) {
        // No content - empty pack
        showPackGenerationFeedback('⚠️ No signatory activities found for the selected period', 'warning');
        return { success: false, reason: 'no_content' };
      } else {
        // Unexpected content type
        return Promise.reject(new Error(`Unexpected response format: ${contentType}`));
      }
    } else {
      // Handle error responses
      if (response.status === 503) {
        return Promise.reject(new Error('Service temporarily unavailable. PDF engine may not be installed.'));
      } else {
        // Try to parse error message
        return response.text().then(text => {
          let errorMsg = `Generation failed (${response.status})`;
          try {
            const data = JSON.parse(text);
            errorMsg = data.error || errorMsg;
          } catch (e) {
            // Use status text if JSON parsing fails
            errorMsg = response.statusText || errorMsg;
          }
          return Promise.reject(new Error(errorMsg));
        });
      }
    }
  })
  .then(result => {
    if (result && result.success) {
      // Show success state briefly
      generateBtn.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="bi bi-check-circle-fill text-success me-2"></i>
          <span>Downloaded!</span>
        </div>
      `;
    } else if (result && result.reason === 'no_content') {
      // Show warning state for empty pack
      generateBtn.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>
          <span>No Data</span>
        </div>
      `;
    }
  })
  .catch(error => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error('Pack generation error:', error);
    showPackGenerationFeedback(`❌ Error after ${elapsedTime}s: ${error.message}`, 'danger');
  })
  .finally(() => {
    // Reset form controls and button state after delay
    setTimeout(() => {
      document.getElementById('packReportType').disabled = false;
      document.getElementById('packWeekStart').disabled = false;
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="bi bi-box-seam"></i> Generate Pack';
    }, 2000);
  });
}

// Enhanced feedback system for pack generation
function showPackGenerationFeedback(message, type = 'info') {
  // Remove existing feedback
  const existingFeedback = document.querySelector('#packGenerationFeedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }
  
  // Create feedback element
  const feedback = document.createElement('div');
  feedback.id = 'packGenerationFeedback';
  feedback.className = `alert alert-${type} alert-dismissible fade show mt-2`;
  feedback.style.fontSize = '0.875rem';
  feedback.innerHTML = `
    <small>${message}</small>
    <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="alert"></button>
  `;
  
  // Insert after the pack generation card
  const packCard = document.querySelector('.generated-report-panel .card.mb-3');
  if (packCard) {
    packCard.insertAdjacentElement('afterend', feedback);
    
    // Auto-dismiss non-error messages after 5 seconds
    if (type !== 'danger') {
      setTimeout(() => {
        if (feedback && feedback.parentNode) {
          feedback.remove();
        }
      }, 5000);
    }
  }
}

// Helper function to get CSRF token with enhanced error handling
function getCookie(name) {
  try {
    // Try meta tag first (most reliable for CSRF)
    if (name === 'csrftoken') {
      const metaToken = document.querySelector('meta[name=csrf-token]');
      if (metaToken && metaToken.getAttribute('content')) {
        return metaToken.getAttribute('content');
      }
    }
    
    // Try form token as fallback
    const formToken = document.querySelector('[name=csrfmiddlewaretoken]');
    if (name === 'csrftoken' && formToken && formToken.value) {
      return formToken.value;
    }
    
    // Fallback to cookie parsing
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          const cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          if (cookieValue) {
            return cookieValue;
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error getting cookie '${name}':`, error);
  }
  
  // Log missing CSRF token warning
  if (name === 'csrftoken') {
    console.warn('CSRF token not found. This may cause authentication issues.');
  }
  
  return null;
}
  
  
function registrar_generate_report_generateReport() {
  // Manual report generation can re-use filters
  registrarGenerateReport();
}

function setupRegistrarReportListeners() {
  const fromEl = document.getElementById('registrar_generate_report_fromDate');
  const toEl = document.getElementById('registrar_generate_report_toDate');
  const statusEl = document.getElementById('registrar_generate_report_formStatus');
  const periodEl = document.getElementById('registrar_generate_report_periodType');
  const roleEl = document.getElementById('registrar_reports_roleFilter');
  const actionEl = document.getElementById('registrar_reports_actionFilter');
  const formTypeEl = document.getElementById('registrar_reports_formTypeFilter');
  const searchEl = document.getElementById('registrar_reports_searchText');
  
  // Immediate reload for non-form-type filters
  [fromEl, toEl, statusEl, periodEl, roleEl, actionEl].forEach(el => 
    el && el.addEventListener('change', () => registrarLoadReportsData(true))
  );
  
  // Debounced reload for form type filter (250ms)
  if (formTypeEl) {
    let formTypeTimeout;
    formTypeEl.addEventListener('change', () => {
      clearTimeout(formTypeTimeout);
      formTypeTimeout = setTimeout(() => registrarLoadReportsData(true), 250);
    });
  }
  
  // Add search with debouncing (250ms)
  if (searchEl) {
    let searchTimeout;
    searchEl.addEventListener('keyup', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => registrarLoadReportsData(true), 250);
    });
  }
}

// Global pagination state
let currentPage = 1;
let totalPages = 1;

function getRegistrarReportFilters() {
  let formStatus = (document.getElementById('registrar_generate_report_formStatus').value || '').toLowerCase();
  // Normalize keywords to match backend
  if (formStatus.includes('approved')) formStatus = 'approve';
  else if (formStatus.includes('declined') || formStatus.includes('disapproved')) formStatus = 'disapprove';
  else if (formStatus.includes('pending')) formStatus = 'view';

  return {
    from_date: document.getElementById('registrar_generate_report_fromDate').value,
    to_date: document.getElementById('registrar_generate_report_toDate').value,
    form_status: formStatus,
    period_type: (document.getElementById('registrar_generate_report_periodType').value || '').toLowerCase(),
    role: document.getElementById('registrar_reports_roleFilter')?.value || '',
    action_type: document.getElementById('registrar_reports_actionFilter')?.value || '',
    form_type: document.getElementById('registrar_reports_formTypeFilter')?.value || '',
    q: document.getElementById('registrar_reports_searchText')?.value || '',
    page: currentPage
  };
}

function registrarLoadReportsData(resetPage = false) {
  if (resetPage) {
    currentPage = 1;
  }
  
  const filters = getRegistrarReportFilters();
  
  // Check if form type is selected - if so, use forms API instead of activity logs
  const formType = filters.form_type;
  const useFormsAPI = formType && formType !== '' && formType !== 'all';
  
  // Show loading state with appropriate message
  const tableBody = document.getElementById('registrar_generate_report_tableBody');
  if (tableBody) {
    const loadingMessage = useFormsAPI ? 'Loading forms...' : 'Loading activities...';
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <div class="spinner-border spinner-border-sm me-2" role="status"></div>
          ${loadingMessage}
        </td>
      </tr>`;
  }
  
  // Choose API endpoint based on whether form type is selected
  let apiUrl, apiParams;
  
  if (useFormsAPI) {
    // Use new forms list API
    apiUrl = '/registrar/reports/forms/api/list/';
    apiParams = {
      form_type: formType === 'document_release' ? 'doc_release' : formType,
      page: currentPage,
      per_page: 20
    };
  } else {
    // Use existing activity logs API
    apiUrl = '/registrar/reports/api/data/';
    apiParams = filters;
  }
  
  fetch(`${apiUrl}?${new URLSearchParams(apiParams)}`)
    .then(response => {
      // Parse response as text first to handle any format issues
      return response.text().then(text => {
        if (!response.ok) {
          let errorMsg = `Request failed (${response.status})`;
          try {
            const errorData = JSON.parse(text);
            errorMsg = errorData.error || errorMsg;
          } catch (e) {
            console.warn('Failed to parse error response as JSON:', text);
          }
          throw new Error(errorMsg);
        }
        
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse successful response as JSON:', text);
          throw new Error('Invalid JSON response');
        }
      });
    })
    .then(data => {
      if (data.success) {
        const items = Array.isArray(data.items) ? data.items : [];
        
        // Update table based on which API was used
        if (useFormsAPI) {
          registrarUpdateFormsTable(items);
        } else {
          registrarUpdateReportsTable(items);
        }
        
        // Update pagination with defensive defaults
        updatePaginationControls({
          current_page: data.page || 1,
          total_pages: data.pages || 1,
          total_items: data.count || 0
        });
      } else {
        throw new Error(data.error || 'Request was not successful');
      }
    })
    .catch(error => {
      console.error('Error loading reports data:', error);
      showErrorState(error.message);
    });
}

function registrarUpdateFormsTable(forms) {
  const tbody = document.getElementById('registrar_generate_report_tableBody');
  if (!Array.isArray(forms) || forms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No forms found</td></tr>`;
    return;
  }

  // Table columns: Student | Course | Requested Form | Status | Signatory | IP Address | Date | Time
  tbody.innerHTML = forms.map(form => {
    const statusBadge = `<span class="badge ${getFormStatusBadge(form.status)}">${form.status}</span>`;
    
    // Format date and time
    const dateObj = new Date(form.date);
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString();
    
    return `
      <tr>
        <td>${form.requester || ''}</td>
        <td>-</td>
        <td>
          <div class="d-flex justify-content-between align-items-center">
            <span>${form.title || ''}</span>
            <div class="btn-group btn-group-sm">
              <button type="button" class="btn btn-outline-primary btn-sm" 
                      onclick="viewFormDetails('${form.form_type}', '${form.id}')" 
                      title="View Form">
                <i class="bi bi-eye"></i>
              </button>
              <button type="button" class="btn btn-outline-success btn-sm" 
                      onclick="downloadFormPDF('${form.form_type}', '${form.id}')" 
                      title="Download PDF">
                <i class="bi bi-download"></i>
              </button>
            </div>
          </div>
        </td>
        <td>${statusBadge}</td>
        <td>-</td>
        <td>-</td>
        <td>${dateStr}</td>
        <td>${timeStr}</td>
      </tr>
    `;
  }).join('');
}

function getFormStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case 'approved': return 'bg-success';
    case 'pending': return 'bg-warning text-dark';
    case 'disapproved': 
    case 'rejected': return 'bg-danger';
    case 'processing': return 'bg-info text-dark';
    default: return 'bg-secondary';
  }
}

function viewFormDetails(formType, formId) {
  // For now, just fetch form info and show in alert (could be enhanced to modal)
  fetch(`/registrar/forms/${formType}/${formId}/view/`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const form = data.form;
        let info = `Form Type: ${form.type}\n`;
        info += `ID: ${form.id}\n`;
        info += `Requester: ${form.student || form.requester}\n`;
        info += `Status: ${form.status}\n`;
        if (form.clearance_type) info += `Clearance Type: ${form.clearance_type}\n`;
        if (form.course) info += `Course: ${form.course}\n`;
        if (form.year) info += `Year: ${form.year}\n`;
        alert(info);
      } else {
        alert('Error loading form details: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error viewing form:', error);
      alert('Error loading form details');
    });
}

function downloadFormPDF(formType, formId) {
  // Directly navigate to download URL - browser will handle the PDF download
  window.location.href = `/registrar/forms/${formType}/${formId}/download/`;
}

function showErrorState(message = 'No data found') {
  const tbody = document.getElementById('registrar_generate_report_tableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <i class="bi bi-exclamation-triangle fs-1 d-block mb-2 text-warning"></i>
          <div class="mb-2">${message}</div>
          <button class="btn btn-sm btn-outline-primary" onclick="registrarLoadReportsData(true)">
            <i class="bi bi-arrow-clockwise"></i> Retry
          </button>
        </td>
      </tr>`;
  }
  
  // Reset pagination/totals to 0
  updatePaginationControls({
    current_page: 1,
    total_pages: 1,
    total_items: 0
  });
}

function registrarUpdateReportsTable(rows) {
  const tbody = document.getElementById('registrar_generate_report_tableBody');
  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No activities found</td></tr>`;
    return;
  }

  // Registrar table has 8 columns: Student | Course | Requested Form | Status | Signatory | IP Address | Date | Time
  // Map unified feed to these columns.
  tbody.innerHTML = rows.map(item => {
    const statusBadge = `<span class="badge ${registrarGetActionBadge(item.activity)}">${item.activity}</span>`;
    
    // Extract data from API response
    let studentName = item.student_name || '';
    let course = item.student_course || '';
    let requestedForm = '';
    
    // Build requested form display (action + form type, without redundant student name)
    if (item.source === 'activity_log') {
      // For signatory activities: "Approve Clearance" or "View Enrollment"
      const action = item.activity || item.action_type || '';
      const formType = item.form_type_display || item.entity_type || '';
      requestedForm = `${action} ${formType}`.trim();
    } else if (item.source === 'audit_log') {
      // For system activities: use description
      requestedForm = item.details || item.metadata?.description || '';
    } else if (item.source === 'document_request') {
      // For document requests: show document type and action
      const action = item.metadata?.action_display || item.activity || '';
      const docType = item.metadata?.document_type || '';
      requestedForm = `${action} ${docType}`.trim();
    } else {
      // Fallback
      requestedForm = item.details || '';
    }
    
    return `
      <tr>
        <td class="text-start">${studentName}</td>
        <td class="text-start">${course}</td>
        <td class="text-start text-wrap" style="max-width: 200px;">${requestedForm}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-start">${item.actor || ''}</td>
        <td class="text-center">${item.ip_address || ''}</td>
        <td class="text-center">${item.date}</td>
        <td class="text-center">${item.time}</td>
      </tr>`;
  }).join('');
}

function registrarGetActionBadge(activity) {
  const key = (activity || '').toLowerCase();
  switch (key) {
    case 'approve': 
    case 'approved':
    case 'released': return 'bg-success';
    case 'disapprove': 
    case 'blocked':
    case 'blocked_due_to_balance': return 'bg-danger';
    case 'print': return 'bg-info';
    case 'delete': return 'bg-warning text-dark';
    case 'view': return 'bg-secondary';
    case 'submitted':
    case 'pending': return 'bg-warning';
    case 'processing': return 'bg-info';
    case 'created':
    case 'draft': return 'bg-light text-dark';
    default: return 'bg-secondary';
  }
}

function registrarGenerateReport() {
  // Get current filter values to include in the report
  const filters = getRegistrarReportFilters();
  delete filters.page; // Don't need pagination for report generation
  
  // Show loading state
  const generateBtn = document.getElementById('registrar_generate_report_generateButton');
  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div>Generating...';
  }
  
  // Create FormData for POST request
  const formData = new FormData();
  Object.keys(filters).forEach(key => {
    if (filters[key]) {
      formData.append(key, filters[key]);
    }
  });
  
  // Add CSRF token
  formData.append('csrfmiddlewaretoken', getCsrfToken());
  
  fetch('/registrar/reports/generate/', {
    method: 'POST',
    body: formData,
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => {
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/pdf')) {
        // Handle PDF response - trigger download
        return response.blob().then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          
          // Get filename from Content-Disposition header or generate one
          const contentDisposition = response.headers.get('content-disposition');
          let filename = 'manual_report.pdf';
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
          }
          
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          showNotification('Report generated and downloaded successfully!', 'success');
          
          // Refresh the reports list
          if (document.getElementById('registrar_generate_report_generatedPanel').classList.contains('show')) {
            loadGeneratedReportsList();
          }
          
          return { success: true };
        });
      } else {
        // Try to parse as JSON for error messages
        return response.text().then(text => {
          try {
            const data = JSON.parse(text);
            throw new Error(data.error || 'Unknown error');
          } catch (e) {
            throw new Error(`Unexpected response format: ${text}`);
          }
        });
      }
    } else {
      // Handle error responses
      return response.text().then(text => {
        try {
          const data = JSON.parse(text);
          throw new Error(data.error || `Request failed (${response.status})`);
        } catch (e) {
          throw new Error(`Request failed (${response.status}): ${response.statusText}`);
        }
      });
    }
  })
  .catch(error => {
    console.error('Error generating report:', error);
    showNotification(`Error generating report: ${error.message}`, 'error');
  })
  .finally(() => {
    // Reset button state
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = 'Generate Report';
    }
  });
}

// Helper function to get CSRF token
function getCsrfToken() {
  return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
         document.querySelector('meta[name=csrf-token]')?.getAttribute('content') ||
         CSRF_TOKEN || '';
}

// Helper function for notifications
function showNotification(message, type = 'info') {
  // Try to use existing notification system if available
  if (typeof showAlert === 'function') {
    showAlert(message, type);
  } else {
    // Fallback to simple alert
    alert(message);
  }
}

function exportToCSV() {
  const filters = getRegistrarReportFilters();
  // Remove pagination for CSV export (get all data)
  delete filters.page;
  
  const url = `/registrar/reports/export/csv/?${new URLSearchParams(filters)}`;
  window.open(url, '_blank');
}

function updatePaginationControls(pagination) {
  if (!pagination) return;
  
  currentPage = pagination.current_page;
  totalPages = pagination.total_pages;
  
  const paginationContainer = document.getElementById('registrar_reports_pagination');
  if (!paginationContainer) return;
  
  let paginationHTML = '';
  
  if (totalPages > 1) {
    paginationHTML = '<nav aria-label="Reports pagination"><ul class="pagination justify-content-center">';
    
    // Previous button
    paginationHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">`;
    paginationHTML += `<a class="page-link" href="#" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'tabindex="-1"' : ''}>Previous</a>`;
    paginationHTML += '</li>';
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}">`;
      paginationHTML += `<a class="page-link" href="#" onclick="changePage(${i})">${i}</a>`;
      paginationHTML += '</li>';
    }
    
    // Next button
    paginationHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">`;
    paginationHTML += `<a class="page-link" href="#" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'tabindex="-1"' : ''}>Next</a>`;
    paginationHTML += '</li>';
    
    paginationHTML += '</ul></nav>';
    
    // Add page info
    paginationHTML += `<div class="text-center text-muted mt-2 small">`;
    paginationHTML += `Page ${currentPage} of ${totalPages} (${pagination.total_items} total items)`;
    paginationHTML += '</div>';
  }
  
  paginationContainer.innerHTML = paginationHTML;
}

function changePage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  
  currentPage = page;
  registrarLoadReportsData();
}

function clearFilters() {
  document.getElementById('registrar_generate_report_fromDate').value = '';
  document.getElementById('registrar_generate_report_toDate').value = '';
  document.getElementById('registrar_generate_report_formStatus').selectedIndex = 0;
  document.getElementById('registrar_generate_report_periodType').selectedIndex = 0;
  
  const roleFilter = document.getElementById('registrar_reports_roleFilter');
  const actionFilter = document.getElementById('registrar_reports_actionFilter');
  const formTypeFilter = document.getElementById('registrar_reports_formTypeFilter');
  const searchText = document.getElementById('registrar_reports_searchText');
  
  if (roleFilter) roleFilter.selectedIndex = 0;
  if (actionFilter) actionFilter.selectedIndex = 0;
  if (formTypeFilter) formTypeFilter.selectedIndex = 0;
  if (searchText) searchText.value = '';
  
  registrarLoadReportsData(true);
}

// Helper functions for handling report file downloads and views
function downloadReportFile(downloadUrl, filename) {
  // Validate inputs
  if (!downloadUrl || !filename) {
    showPackGenerationFeedback('❌ Invalid download parameters', 'danger');
    console.error('downloadReportFile called with invalid parameters:', { downloadUrl, filename });
    return;
  }
  
  try {
    // Create a temporary link for downloading
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadUrl;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Show feedback
    const fileType = filename.split('.').pop().toUpperCase();
    showPackGenerationFeedback(`✅ ${fileType} file downloaded: ${filename}`, 'success');
    
    // Log successful download
    console.log(`Report file download initiated: ${filename}`);
  } catch (error) {
    console.error('Error during file download:', error);
    showPackGenerationFeedback('❌ Download failed. Please try again.', 'danger');
  }
}

function viewReportFile(viewUrl) {
  // Validate URL
  if (!viewUrl) {
    showPackGenerationFeedback('❌ Invalid view URL', 'danger');
    console.error('viewReportFile called with invalid URL:', viewUrl);
    return;
  }
  
  try {
    // Open PDF in new tab for viewing
    const newWindow = window.open(viewUrl, '_blank', 'noopener,noreferrer');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Fallback if popup blocked
      showPackGenerationFeedback('⚠️ Popup blocked. Please allow popups to view reports.', 'warning');
      console.warn('Popup blocked for report view, attempting fallback');
      
      // Ask user to allow popups before redirecting
      const userConfirm = confirm('Popup was blocked. Click OK to open the report in this tab instead.');
      if (userConfirm) {
        window.location.href = viewUrl;
      }
    } else {
      showPackGenerationFeedback('📄 Report opened in new tab', 'info');
      console.log(`Report view opened: ${viewUrl}`);
    }
  } catch (error) {
    console.error('Error opening report view:', error);
    showPackGenerationFeedback('❌ Failed to open report. Please try again.', 'danger');
  }
}