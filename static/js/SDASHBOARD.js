// Global variables
let currentClearanceData = [];
let currentEvents = [];

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  initializeDashboard();
  setupEventListeners();
  loadFilterOptions();
  
  // Load data immediately with better error handling
  loadClearanceData().catch(error => {
    console.error('Initial data load failed:', error);
    // Retry after a short delay
    setTimeout(() => {
      loadClearanceData().catch(error => {
        console.error('Retry data load failed:', error);
        showError('Failed to load dashboard data. Please refresh the page.');
      });
    }, 2000);
  });
  
  loadCalendarEvents().catch(error => {
    console.error('Calendar events load failed:', error);
  });
});

// Initialize dashboard
function initializeDashboard() {
  const dateSpan = document.getElementById("signatory_dashboard_dateToday");
  const today = new Date();
  const formatted = today.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  dateSpan.textContent = formatted;
}

// Setup event listeners
function setupEventListeners() {
  // Filter change events
  document.getElementById("signatory_dashboard_filter_purpose").addEventListener("change", loadClearanceData);
  document.getElementById("signatory_dashboard_filter_course").addEventListener("change", loadClearanceData);
  document.getElementById("signatory_dashboard_filter_year").addEventListener("change", loadClearanceData);
  document.getElementById("signatory_dashboard_filter_section").addEventListener("change", loadClearanceData);
  
  // Search input event
  const searchInput = document.getElementById("signatory_dashboard_search_input");
  let searchTimeout;
  searchInput.addEventListener("input", function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadClearanceData, 300); // Debounce search
  });
  
  // Reset filters button
  document.getElementById("signatory_dashboard_reset_filters").addEventListener("click", resetFilters);
  
  // Add manual refresh button functionality
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn btn-outline-primary btn-sm ms-2';
  refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Refresh';
  refreshBtn.addEventListener('click', function() {
    loadClearanceData();
    loadCalendarEvents();
  });
  
  // Insert the refresh button after the reset filters button
  const resetBtn = document.getElementById("signatory_dashboard_reset_filters");
  resetBtn.parentNode.insertBefore(refreshBtn, resetBtn.nextSibling);
  
  // Add event button
  document.getElementById("signatory_dashboard_add_event_btn").addEventListener("click", showAddEventModal);
  
  // Save event button
  document.getElementById("signatory_dashboard_save_event_btn").addEventListener("click", saveEvent);
  
  // All day event checkbox
  document.getElementById("is_all_day").addEventListener("change", function() {
    const timeInputs = document.querySelectorAll("#start_time, #end_time");
    timeInputs.forEach(input => {
      input.disabled = this.checked;
      if (this.checked) {
        input.value = "";
      }
    });
  });
}

// Load clearance data from API
function loadClearanceData() {
  return new Promise((resolve, reject) => {
    showLoading(true);
    
    // Get filter values
    const purpose = document.getElementById("signatory_dashboard_filter_purpose").value;
  const course = document.getElementById("signatory_dashboard_filter_course").value;
  const year = document.getElementById("signatory_dashboard_filter_year").value;
  const section = document.getElementById("signatory_dashboard_filter_section").value;
  const search = document.getElementById("signatory_dashboard_search_input").value;
  
  // Build query string
  const params = new URLSearchParams();
  if (purpose) params.append('purpose', purpose);
  if (course) params.append('course', course);
  if (year) params.append('year', year);
  if (section) params.append('section', section);
  if (search) params.append('search', search);
  
  console.log('Loading clearance data with params:', params.toString());
  
  // Make API request
  fetch(`/signatory/dashboard/api/data/?${params.toString()}`)
    .then(response => {
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Received data:', data);
      if (data.success) {
        currentClearanceData = data.data;
        updateClearanceTable(data.data);
        updateCountMessage(data.message, data.count);
        
        // Automatically mark all displayed clearances as seen
        if (data.data.length > 0) {
          markAllDisplayedAsSeen(data.data);
        }
        resolve(data);
      } else {
        console.error('API returned error:', data.error);
        const error = new Error(data.error || "Failed to load clearance data");
        showError(error.message);
        reject(error);
      }
    })
    .catch(error => {
      console.error("Error loading clearance data:", error);
      showError("Error loading clearance data. Please try the refresh button.");
      reject(error);
    })
    .finally(() => {
      showLoading(false);
    });
  });
}

// Update clearance table with data
function updateClearanceTable(data) {
  const tableBody = document.getElementById("signatory_dashboard_table_body");
  
  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          No new clearance forms found
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = data.map(item => `
    <tr>
      <td class="text-start">${item.student_name}</td>
      <td>${item.course}</td>
      <td>${item.year}</td>
      <td>${item.section}</td>
      <td>${item.student_number}</td>
      <td class="small text-muted">${item.date_submitted}</td>
      <td class="small text-muted">${item.purpose}</td>
      <td>
        <div class="d-flex flex-column align-items-center gap-1">
          <button type="button" class="btn btn-primary btn-sm signatory-dashboard-view-btn" 
                  data-id="${item.id}" data-clearance-id="${item.clearance_id}">
            View
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  // Add click event listeners to view buttons
  document.querySelectorAll('.signatory-dashboard-view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const clearanceSignatoryId = this.getAttribute('data-id');
      const clearanceId = this.getAttribute('data-clearance-id');
      
      // Load and display clearance details
      loadClearanceDetails(clearanceId);
    });
  });
}

// Mark all displayed clearances as seen (automatic when dashboard loads)
function markAllDisplayedAsSeen(clearanceData) {
  const clearanceSignatoryIds = clearanceData.map(item => item.id);
  
  if (clearanceSignatoryIds.length === 0) return;
  
  const formData = new FormData();
  formData.append('clearance_signatory_ids', JSON.stringify(clearanceSignatoryIds));
  
  fetch('/signatory/dashboard/mark-seen/', {
    method: 'POST',
    body: formData,
    headers: {
      'X-CSRFToken': getCSRFToken()
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log("All displayed clearances marked as seen");
    } else {
      console.error("Failed to mark clearances as seen:", data.error);
    }
  })
  .catch(error => {
    console.error("Error marking clearances as seen:", error);
  });
}

// Mark single clearance as seen (for individual operations)
function markClearanceAsSeen(clearanceSignatoryId, clearanceId) {
  const formData = new FormData();
  formData.append('clearance_signatory_id', clearanceSignatoryId);
  
  fetch('/signatory/dashboard/mark-seen/', {
    method: 'POST',
    body: formData,
    headers: {
      'X-CSRFToken': getCSRFToken()
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Remove the row from the table
      const row = document.querySelector(`[data-id="${clearanceSignatoryId}"]`).closest('tr');
      row.remove();
      
      // Update count without reloading all data
      updateCountAfterRemoval();
      
      // Show success message
      showSuccess("Clearance form marked as seen");
    } else {
      showError(data.error || "Failed to mark clearance as seen");
    }
  })
  .catch(error => {
    console.error("Error marking clearance as seen:", error);
    showError("Error marking clearance as seen");
  });
}

// Update count message
function updateCountMessage(message, count) {
  const countAlert = document.getElementById("signatory_dashboard_count_alert");
  const countMessage = document.getElementById("signatory_dashboard_count_message");
  
  if (count > 0) {
    countMessage.textContent = message;
    countAlert.style.display = "block";
  } else {
    countAlert.style.display = "none";
  }
}

// Update count after removing a row (without reloading all data)
function updateCountAfterRemoval() {
  const tableBody = document.getElementById("signatory_dashboard_table_body");
  const remainingRows = tableBody.querySelectorAll('tr:not([style*="display: none"])').length;
  
  // If there are still rows with data (not the "no data" message)
  if (remainingRows > 0 && !tableBody.querySelector('.text-center.text-muted')) {
    const count = remainingRows;
    const message = `There are ${count} new clearance form${count !== 1 ? 's' : ''} waiting for approval`;
    updateCountMessage(message, count);
  } else {
    // No more rows, hide the alert and show empty state
    updateCountMessage("", 0);
    
    // Show empty state if no rows remain
    if (tableBody.children.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted py-4">
            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
            No new clearance forms found
          </td>
        </tr>
      `;
    }
  }
}

// Load and display clearance details in modal
function loadClearanceDetails(clearanceId) {
  // Show loading state
  showLoading(true);
  
  console.log('Loading clearance details for ID:', clearanceId);
  
  fetch(`/signatory/clearance/details/${clearanceId}/`)
    .then(response => {
      console.log('Clearance details response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Received clearance details:', data);
      if (data.success) {
        // Show the modal first (it will show loading spinner initially)
        const modal = new bootstrap.Modal(document.getElementById('viewClearanceModal'));
        modal.show();
        
        // Then populate it after modal is shown
        setTimeout(() => {
          populateClearanceModal(data.data);
        }, 200);
      } else {
        console.error('API returned error:', data.error);
        showError(data.error || 'Failed to load clearance details');
      }
    })
    .catch(error => {
      console.error('Error loading clearance details:', error);
      showError('Error loading clearance details. Please try again.');
    })
    .finally(() => {
      showLoading(false);
    });
}

// Populate the clearance modal with data
function populateClearanceModal(data) {
  console.log('populateClearanceModal called with data:', data);
  
  // Check if required elements exist
  const loadingEl = document.getElementById('vc_modal_loading');
  const contentEl = document.getElementById('vc_modal_content');
  const errorEl = document.getElementById('vc_modal_error');
  
  if (!loadingEl || !contentEl || !errorEl) {
    console.error('Modal elements not found:', {
      loading: !!loadingEl,
      content: !!contentEl,
      error: !!errorEl
    });
    return;
  }
  
  // Hide loading and error, prepare to show content
  loadingEl.style.display = 'none';
  errorEl.style.display = 'none';
  contentEl.style.display = 'block';
  
  try {
    // Populate basic information - check each element exists first
    const academicYearEl = document.getElementById('vc_academic_year');
    const semesterEl = document.getElementById('vc_semster');
    const fullNameEl = document.getElementById('vc_full_name');
    const yearLevelEl = document.getElementById('vc_year_level');
    const sectionEl = document.getElementById('vc_semester');
    const studentNumberEl = document.getElementById('vc_student_number');
    const programEl = document.getElementById('vc_program');
    const submittedAtEl = document.getElementById('vc_submitted_at');
    const purposeEl = document.getElementById('vc_purpose');
    
    if (academicYearEl) academicYearEl.textContent = data.academic_year || '-';
    if (semesterEl) semesterEl.textContent = data.semester || '-';
    if (fullNameEl) fullNameEl.textContent = data.student_name || '-';
    if (yearLevelEl) yearLevelEl.textContent = data.year_level || '-';
    if (sectionEl) sectionEl.textContent = data.section || '-';
    if (studentNumberEl) studentNumberEl.textContent = data.student_number || '-';
    if (programEl) programEl.textContent = data.course || '-';
    if (submittedAtEl) submittedAtEl.textContent = data.date_submitted || '-';
    if (purposeEl) purposeEl.textContent = data.purpose || '-';
    
    // Populate signatory status table
    const tbody = document.getElementById('vc_signatory_status');
    if (tbody) {
      if (data.signatory_statuses) {
        // Define signatory types and their display names
        const signatoryTypes = {
          'dorm_supervisor': 'Dorm Supervisor',
          'canteen_concessionaire': 'Canteen Concessionaire',
          'library_director': 'Director of Library & Info.',
          'scholarship_director': 'Director of Scholarship',
          'it_director': 'Information Technology',
          'student_affairs': 'Dean of Student Affairs',
          'cashier': 'Cashier',
          'business_manager': 'Business Manager',
          'registrar': 'Registrar',
          'academic_dean': 'Academic Dean'
        };
        
        const statusRows = Object.entries(signatoryTypes).map(([type, displayName]) => {
          const statusData = data.signatory_statuses[type];
          let status = 'pending';
          let timestamp = '-';
          let comment = '-';
          let statusClass = 'text-muted';
          
          if (statusData) {
            status = statusData.status || 'pending';
            timestamp = statusData.timestamp || '-';
            comment = statusData.comment || '-';
            
            if (status === 'approved') {
              statusClass = 'text-success';
            } else if (status === 'disapproved') {
              statusClass = 'text-danger';
            }
          }
          
          return `
            <tr>
              <td>${displayName}</td>
              <td><span class="${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
              <td class="small">${timestamp}</td>
              <td class="small">${comment}</td>
            </tr>
          `;
        }).join('');
        
        tbody.innerHTML = statusRows;
      } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No signatory data available</td></tr>';
      }
    } else {
      console.error('Signatory status table not found');
    }
    
    console.log('Modal content populated and should be visible');
    
  } catch (error) {
    console.error('Error populating modal:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    const errorMessageEl = document.getElementById('vc_modal_error_message');
    if (errorMessageEl) {
      errorMessageEl.textContent = 'Error loading clearance details: ' + error.message;
    }
  }
}

// Reset all filters
function resetFilters() {
  document.getElementById("signatory_dashboard_filter_purpose").value = "";
  document.getElementById("signatory_dashboard_filter_course").value = "";
  document.getElementById("signatory_dashboard_filter_year").value = "";
  document.getElementById("signatory_dashboard_filter_section").value = "";
  document.getElementById("signatory_dashboard_search_input").value = "";
  
  loadClearanceData();
}

// Load filter options from API
function loadFilterOptions() {
  fetch('/signatory/dashboard/filter-options/')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateFilterOptions(data.courses, data.years, data.sections);
      }
    })
    .catch(error => {
      console.error("Error loading filter options:", error);
    });
}

// Update filter dropdowns with dynamic options
function updateFilterOptions(courses, years, sections) {
  // Update course filter
  const courseSelect = document.getElementById("signatory_dashboard_filter_course");
  courseSelect.innerHTML = '<option value="" selected>All Courses</option>';
  courses.forEach(course => {
    courseSelect.innerHTML += `<option value="${course}">${course}</option>`;
  });
  
  // Update year filter
  const yearSelect = document.getElementById("signatory_dashboard_filter_year");
  yearSelect.innerHTML = '<option value="" selected>All Years</option>';
  years.forEach(year => {
    yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
  });
  
  // Update section filter
  const sectionSelect = document.getElementById("signatory_dashboard_filter_section");
  sectionSelect.innerHTML = '<option value="" selected>All Sections</option>';
  sections.forEach(section => {
    sectionSelect.innerHTML += `<option value="${section}">${section}</option>`;
  });
}

// Load calendar events
function loadCalendarEvents() {
  return new Promise((resolve, reject) => {
    fetch('/signatory/calendar/events/')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          currentEvents = data.events;
          updateEventsList(data.events);
          resolve(data);
        } else {
          console.error('Failed to load calendar events:', data.error);
          reject(new Error(data.error || 'Failed to load calendar events'));
        }
      })
      .catch(error => {
        console.error("Error loading calendar events:", error);
        reject(error);
      });
  });
}

// Update events list
function updateEventsList(events) {
  const eventsList = document.getElementById("signatory_dashboard_events_list");
  
  if (events.length === 0) {
    eventsList.innerHTML = `
      <div class="text-center text-muted py-3">
        <i class="bi bi-calendar-x fs-4 d-block mb-2"></i>
        No upcoming events
      </div>
    `;
    return;
  }
  
  // Sort events by start date
  const sortedEvents = events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  
  // Get next 5 events
  const upcomingEvents = sortedEvents.slice(0, 5);
  
  eventsList.innerHTML = upcomingEvents.map(event => `
    <div class="event-item event-${event.color}">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <small class="text-muted">${event.display_time}</small><br>
          <strong>${event.title}</strong>
        </div>
        <button class="btn btn-sm btn-outline-primary" onclick="addEventToGoogleCalendar('${event.title}', '${event.start_date}', '${event.start_time || ''}')" title="Add to Google Calendar">
          <i class="bi bi-calendar-plus"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// Show add event modal
function showAddEventModal() {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("start_date").value = today;
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById("signatory_dashboard_add_event_modal"));
  modal.show();
}

// Save event
function saveEvent() {
  const form = document.getElementById("signatory_dashboard_add_event_form");
  const formData = new FormData(form);
  
  // Add all day event flag
  formData.append('is_all_day', document.getElementById("is_all_day").checked);
  
  // Validate required fields
  if (!formData.get('title') || !formData.get('start_date')) {
    showError("Title and start date are required");
    return;
  }
  
  fetch('/signatory/calendar/events/add/', {
    method: 'POST',
    body: formData,
    headers: {
      'X-CSRFToken': getCSRFToken()
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById("signatory_dashboard_add_event_modal"));
      modal.hide();
      
      // Reset form
      form.reset();
      
      // Reload events
      loadCalendarEvents();
      
      // Show success message
      showSuccess("Event added successfully");
    } else {
      showError(data.error || "Failed to add event");
    }
  })
  .catch(error => {
    console.error("Error adding event:", error);
    showError("Error adding event");
  });
}

// Add event to Google Calendar
function addEventToGoogleCalendar(title, date, time) {
  // Format date for Google Calendar (YYYYMMDD format)
  const formatDateForGoogle = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };
  
  // Format time for Google Calendar (HHMMSS format)
  const formatTimeForGoogle = (timeStr) => {
    if (!timeStr) return '000000';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}${minutes}00`;
  };
  
  // Create Google Calendar URL
  const baseUrl = "https://calendar.google.com/calendar/render";
  
  // Format dates for Google Calendar
  const startDate = formatDateForGoogle(date);
  const startTime = formatTimeForGoogle(time);
  const endTime = formatTimeForGoogle(time);
  
  // Create the dates parameter in Google Calendar format
  const datesParam = time ? 
    `${startDate}T${startTime}/${startDate}T${endTime}` : 
    `${startDate}/${startDate}`;
  
  const params = new URLSearchParams({
    'action': 'TEMPLATE',
    'text': title,
    'dates': datesParam,
    'details': `Event: ${title}`,
    'location': 'School Signatory Office',
    'sf': 'true',
    'output': 'xml'
  });
  
  const googleCalendarUrl = `${baseUrl}?${params.toString()}`;
  
  // Open Google Calendar in new tab
  window.open(googleCalendarUrl, '_blank');
  
  showSuccess('Opening Google Calendar to add event...');
}

// Show loading spinner
function showLoading(show) {
  const loading = document.getElementById("signatory_dashboard_loading");
  const table = document.querySelector(".signatory_dashboard_table-fixed-container");
  
  if (show) {
    loading.style.display = "block";
    table.style.display = "none";
  } else {
    loading.style.display = "none";
    table.style.display = "block";
  }
}

// Show success message
function showSuccess(message) {
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
  
  console.log("Success:", message);
}

// Show error message
function showError(message) {
  // Create a temporary error alert
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
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
  
  console.error("Error:", message);
}

// Get CSRF token
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

// Sidebar functionality
function updateNotificationCount(count) {
  const badge = document.getElementById("signatory_sidebar_notification_count");
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

function toggleSidebar() {
  const signatory_sidebar = document.getElementById("signatory_sidebar");
  const signatory_sidebar_backdrop = document.getElementById("signatory_sidebar_sidebarBackdrop");

  if (window.innerWidth <= 768) {
    signatory_sidebar.classList.remove("collapsed");
    signatory_sidebar.classList.toggle("show");
    signatory_sidebar_backdrop.classList.toggle("active");
  } else {
    signatory_sidebar.classList.toggle("collapsed");
  }
}

// Window resize handler
window.addEventListener("resize", function () {
  const signatory_sidebar = document.getElementById("signatory_sidebar");
  const signatory_sidebar_backdrop = document.getElementById("signatory_sidebar_sidebarBackdrop");
  if (window.innerWidth > 768) {
    signatory_sidebar.classList.remove("show");
    signatory_sidebar_backdrop.classList.remove("active");
  }
});


