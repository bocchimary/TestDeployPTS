// Global variables (mirror signatory dashboard)
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
  const dateSpan = document.getElementById("bm_dashboard_dateToday");
  const today = new Date();
  const formatted = today.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  dateSpan.textContent = formatted;
}

// Setup event listeners
function setupEventListeners() {
  // Filter change events
  document.getElementById("bm_dashboard_filter_purpose").addEventListener("change", loadClearanceData);
  document.getElementById("bm_dashboard_filter_course").addEventListener("change", loadClearanceData);
  document.getElementById("bm_dashboard_filter_year").addEventListener("change", loadClearanceData);
  document.getElementById("bm_dashboard_filter_section").addEventListener("change", loadClearanceData);
  
  // Search input event
  const searchInput = document.getElementById("bm_dashboard_search_input");
  let searchTimeout;
  searchInput.addEventListener("input", function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadClearanceData, 300); // Debounce search
  });
  
  // Add manual refresh button functionality
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn btn-outline-primary btn-sm ms-2';
  refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Refresh';
  refreshBtn.addEventListener('click', function() {
    loadClearanceData();
    loadCalendarEvents();
  });
  
  // Insert the refresh button after the search input
  const searchDiv = document.querySelector('.bm_dashboard_search-bar');
  searchDiv.parentNode.insertBefore(refreshBtn, searchDiv.nextSibling);
  
  // Add event button
  document.getElementById("bm_dashboard_add_event_btn").addEventListener("click", showAddEventModal);
  
  // Save event button
  document.getElementById("bm_dashboard_save_event_btn").addEventListener("click", saveEvent);
  
  // All day event checkbox
  document.getElementById("bm_is_all_day").addEventListener("change", function() {
    const timeInputs = document.querySelectorAll("#bm_start_time, #bm_end_time");
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
    const purpose = document.getElementById("bm_dashboard_filter_purpose").value;
    const course = document.getElementById("bm_dashboard_filter_course").value;
    const year = document.getElementById("bm_dashboard_filter_year").value;
    const section = document.getElementById("bm_dashboard_filter_section").value;
    const search = document.getElementById("bm_dashboard_search_input").value;
    
    // Build query string
    const params = new URLSearchParams();
    if (purpose && purpose !== '' && purpose !== 'All Purposes') params.append('purpose', purpose);
    if (course && course !== '' && course !== 'All Courses') params.append('course', course);
    if (year && year !== '' && year !== 'All Years') params.append('year', year);
    if (section && section !== '' && section !== 'All Sections') params.append('section', section);
    if (search && search !== '') params.append('search', search);
    
    // Fetch data from API
    fetch(`/business-manager/dashboard/api/data/?${params.toString()}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Dashboard API response:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Update data and display
        currentClearanceData = data.data || [];
        displayClearanceData(currentClearanceData);
        showNewClearanceCount(data.count || 0);
        
        // Mark all displayed clearances as seen (IMPORTANT: mirrors signatory functionality)
        markAllDisplayedAsSeen(currentClearanceData);
        
        showLoading(false);
        resolve(data);
      })
      .catch(error => {
        console.error('Error loading clearance data:', error);
        showError('Failed to load clearance data. Please try again.');
        showLoading(false);
        reject(error);
      });
  });
}

// Mark all displayed clearances as seen (automatic when dashboard loads) - MIRROR SIGNATORY FUNCTIONALITY
function markAllDisplayedAsSeen(clearanceData) {
  const clearanceSignatoryIds = clearanceData.map(item => item.id);
  
  if (clearanceSignatoryIds.length === 0) return;
  
  const formData = new FormData();
  formData.append('clearance_signatory_ids', JSON.stringify(clearanceSignatoryIds));
  
  fetch('/business-manager/dashboard/mark-seen/', {
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

// Display clearance data in table
function displayClearanceData(data) {
  const tbody = document.getElementById('bm_dashboard_table_body') || 
                document.querySelector('.bm_dashboard_table tbody');
  
  if (!tbody) {
    console.error('Table body not found');
    return;
  }
  
  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          <p class="mb-0">No new clearance forms found</p>
          <small>New forms will appear here when students submit them</small>
        </td>
      </tr>`;
    return;
  }
  
  // Generate table rows
  const rows = data.map(clearance => `
    <tr>
      <td class="text-start">${clearance.student_name}</td>
      <td>${clearance.course}</td>
      <td>${clearance.year}</td>
      <td>${clearance.section}</td>
      <td>${clearance.student_number}</td>
      <td class="small text-muted">${clearance.date_submitted}</td>
      <td class="small text-muted">${clearance.purpose}</td>
      <td>
        <div class="d-flex flex-column align-items-center gap-1">
          <button type="button" class="btn btn-primary btn-sm bm-dashboard-view-btn" 
                  data-id="${clearance.id}" data-clearance-id="${clearance.clearance_id}">View</button>
        </div>
      </td>
    </tr>
  `).join('');
  
  tbody.innerHTML = rows;
  
  // Add event listeners to view buttons
  document.querySelectorAll('.bm-dashboard-view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const clearanceSignatoryId = this.getAttribute('data-id');
      const clearanceId = this.getAttribute('data-clearance-id');
      
      // Load and display clearance details
      loadClearanceDetails(clearanceId);
    });
  });
}

// Load clearance details for the modal - MIRROR SIGNATORY FUNCTIONALITY
function loadClearanceDetails(clearanceId) {
  // Show loading state
  showModalLoading(true);
  
  console.log('Loading clearance details for ID:', clearanceId);
  
  fetch(`/business-manager/clearance/details/${clearanceId}/`)
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
        populateClearanceModal(data.data);
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('bm_viewClearanceModal'));
        modal.show();
      } else {
        console.error('API returned error:', data.error);
        showModalError(data.error || 'Failed to load clearance details');
      }
    })
    .catch(error => {
      console.error('Error loading clearance details:', error);
      showModalError('Error loading clearance details. Please try again.');
    })
    .finally(() => {
      showModalLoading(false);
    });
}

// Populate the clearance modal with data
function populateClearanceModal(data) {
  // Hide error and loading, show content
  document.getElementById('bm_clearance_modal_error').style.display = 'none';
  document.getElementById('bm_clearance_modal_loading').style.display = 'none';
  document.getElementById('bm_clearance_modal_content').style.display = 'block';
  
  // Populate student information
  document.getElementById('bm_modal_student_name').textContent = data.student_name || '-';
  document.getElementById('bm_modal_student_number').textContent = data.student_number || '-';
  document.getElementById('bm_modal_course').textContent = data.course || '-';
  document.getElementById('bm_modal_year_section').textContent = `${data.year || '-'} - ${data.section || '-'}`;
  
  // Populate clearance information
  document.getElementById('bm_modal_purpose').textContent = data.purpose || '-';
  document.getElementById('bm_modal_semester').textContent = data.semester || '-';
  document.getElementById('bm_modal_academic_year').textContent = data.academic_year || '-';
  document.getElementById('bm_modal_date_submitted').textContent = data.date_submitted || '-';
  
  // Populate signatory status
  const tbody = document.getElementById('bm_modal_signatory_status');
  if (data.signatory_statuses) {
    const statusRows = Object.entries(data.signatory_statuses).map(([type, status]) => {
      const statusClass = status.status === 'approved' ? 'text-success' : 
                         status.status === 'disapproved' ? 'text-danger' : 'text-muted';
      
      return `
        <tr>
          <td>${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
          <td><span class="${statusClass}">${status.status}</span></td>
          <td class="small">${status.timestamp || '-'}</td>
          <td class="small">${status.comment || '-'}</td>
        </tr>
      `;
    }).join('');
    
    tbody.innerHTML = statusRows;
  } else {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No signatory data available</td></tr>';
  }
}

// Show/hide modal loading
function showModalLoading(show) {
  document.getElementById('bm_clearance_modal_loading').style.display = show ? 'block' : 'none';
  document.getElementById('bm_clearance_modal_content').style.display = show ? 'none' : 'block';
  document.getElementById('bm_clearance_modal_error').style.display = 'none';
}

// Show modal error
function showModalError(message) {
  document.getElementById('bm_clearance_modal_loading').style.display = 'none';
  document.getElementById('bm_clearance_modal_content').style.display = 'none';
  document.getElementById('bm_clearance_modal_error').style.display = 'block';
  document.getElementById('bm_clearance_modal_error_message').textContent = message;
}

// Show new clearance count
function showNewClearanceCount(count) {
  const countAlert = document.getElementById('bm_dashboard_count_alert');
  const countMessage = document.getElementById('bm_dashboard_count_message');
  
  if (countAlert && countMessage) {
    if (count > 0) {
      countMessage.textContent = `There are ${count} new clearance form${count !== 1 ? 's' : ''} waiting for approval`;
      countAlert.style.display = 'block';
    } else {
      countAlert.style.display = 'none';
    }
  }
}

// Show/hide loading indicator
function showLoading(show) {
  const loading = document.getElementById('bm_dashboard_loading');
  if (loading) {
    loading.style.display = show ? 'block' : 'none';
  }
}

// Show error message
function showError(message) {
  console.error(message);
  alert(message); // Simple alert for now
}

// Load filter options
function loadFilterOptions() {
  // Load course, year, section options dynamically from API
  fetch('/business-manager/clearance/api/filter-options/')
    .then(response => response.json())
    .then(data => {
      if (data.courses) {
        updateSelectOptions(document.getElementById('bm_dashboard_filter_course'), data.courses, 'All Courses');
      }
      if (data.years) {
        updateSelectOptions(document.getElementById('bm_dashboard_filter_year'), data.years, 'All Years');  
      }
      if (data.sections) {
        updateSelectOptions(document.getElementById('bm_dashboard_filter_section'), data.sections, 'All Sections');
      }
    })
    .catch(error => {
      console.error('Error loading filter options:', error);
    });
}

// Update select options
function updateSelectOptions(selectElement, options, defaultText) {
  const currentValue = selectElement.value;
  selectElement.innerHTML = `<option value="">${defaultText}</option>`;
  
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

// Calendar Events functionality - MIRROR SIGNATORY FUNCTIONALITY
function loadCalendarEvents() {
  return new Promise((resolve, reject) => {
    fetch('/business-manager/calendar/api/events/')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          currentEvents = data.events || [];
          displayCalendarEvents(currentEvents);
          resolve(data);
        } else {
          console.error('Failed to load calendar events:', data.error);
          reject(new Error(data.error));
        }
      })
      .catch(error => {
        console.error('Error loading calendar events:', error);
        // Load default events if API fails
        loadDefaultEvents();
        reject(error);
      });
  });
}

// Display calendar events
function displayCalendarEvents(events) {
  const eventsList = document.getElementById('bm_dashboard_events_list');
  
  if (!events || events.length === 0) {
    eventsList.innerHTML = '<div class="text-muted small">No upcoming events</div>';
    return;
  }
  
  const eventHTML = events.map(event => {
    const eventClass = `event-${event.color || 'blue'}`;
    return `
      <div class="event-item ${eventClass}" onclick="addToGoogleCalendar('${event.title}', '${event.date}', '${event.time}')">
        <small class="text-muted">${event.time || 'All day'}</small><br>
        <strong>${event.title}</strong>
        ${event.description ? `<small class="d-block text-muted">${event.description}</small>` : ''}
      </div>
    `;
  }).join('');
  
  eventsList.innerHTML = eventHTML;
}

// Load default events if API fails
function loadDefaultEvents() {
  const defaultEvents = [
    {
      time: '09:00 AM - 10:00 AM',
      title: 'Meeting Discussion',
      color: 'blue',
      date: new Date().toISOString().split('T')[0]
    },
    {
      time: '02:00 PM - 04:00 PM', 
      title: 'Review Session',
      color: 'green',
      date: new Date().toISOString().split('T')[0]
    }
  ];
  
  displayCalendarEvents(defaultEvents);
}

// Show add event modal
function showAddEventModal() {
  const modal = new bootstrap.Modal(document.getElementById('bm_dashboard_add_event_modal'));
  // Set default date to today
  document.getElementById('bm_start_date').value = new Date().toISOString().split('T')[0];
  modal.show();
}

// Save event
function saveEvent() {
  const form = document.getElementById('bm_dashboard_add_event_form');
  const formData = new FormData(form);
  
  // Validate required fields
  const title = formData.get('title');
  const startDate = formData.get('start_date');
  
  if (!title || !startDate) {
    alert('Please fill in all required fields.');
    return;
  }
  
  fetch('/business-manager/calendar/api/add-event/', {
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
      bootstrap.Modal.getInstance(document.getElementById('bm_dashboard_add_event_modal')).hide();
      
      // Reset form
      form.reset();
      
      // Show success message with Google Calendar link
      if (data.google_calendar_url) {
        const addToGoogle = confirm(data.message + '\n\nWould you like to add it to Google Calendar?');
        if (addToGoogle) {
          window.open(data.google_calendar_url, '_blank');
        }
      } else {
        alert(data.message);
      }
      
      // Reload events
      loadCalendarEvents();
    } else {
      alert('Error: ' + (data.error || 'Failed to save event'));
    }
  })
  .catch(error => {
    console.error('Error saving event:', error);
    alert('Error saving event. Please try again.');
  });
}

// Add to Google Calendar
function addToGoogleCalendar(title, date, time) {
  const baseUrl = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: date.replace(/-/g, '') + '/' + date.replace(/-/g, ''),
    details: 'Added from Business Manager Dashboard'
  });
  
  window.open(`${baseUrl}?${params.toString()}`, '_blank');
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

// Sidebar functionality
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