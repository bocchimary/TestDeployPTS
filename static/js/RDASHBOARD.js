// Registrar Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Set current date
    const today = new Date();
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('registrar_dashboard_dateToday').textContent = today.toLocaleDateString('en-US', dateOptions);

    // Initialize charts
    initializeCharts();
    
    // Initialize sidebar
    initializeSidebar();
    
    // Initialize auto-refresh
    initializeAutoRefresh();
    
    // Initialize calendar functionality
    initializeCalendar();
});

let accomplishmentChart, visitorsChart, documentsChart; // Global chart instances
let refreshTimeout;

function showNoDataState(chartElement, message = 'No data available') {
    if (!chartElement) return;
    
    chartElement.innerHTML = `
        <div class="chart-no-data">
            <div class="chart-no-data-icon">📊</div>
            <div class="chart-no-data-text">${message}</div>
            <div class="chart-no-data-subtext">Data will appear here once you have records</div>
        </div>
    `;
}

function initializeCharts() {
    if (!window.dashboardData) {
        console.warn('Dashboard data not available');
        return;
    }

    try {
        // Get chart data with fallbacks for empty data
        const accomplishmentData = window.dashboardData.accomplishmentData?.series?.[0]?.data || [];
        const visitorsData = window.dashboardData.visitorsData?.series?.[0]?.data || [];
        const documentsData = window.dashboardData.documentsData?.series?.[0]?.data || [];
        
        // Always use real data from the database, even if it's zero
        const finalAccomplishmentData = accomplishmentData.length > 0 ? accomplishmentData : [0, 0, 0, 0, 0, 0, 0];
        const finalVisitorsData = visitorsData.length > 0 ? visitorsData : [0, 0, 0, 0, 0, 0, 0];
        const finalDocumentsData = documentsData.length > 0 ? documentsData : [0, 0, 0, 0, 0, 0, 0];
        
        // Check if we have any real data to show message
        const hasAnyData = finalAccomplishmentData.some(val => val > 0) || 
                          finalVisitorsData.some(val => val > 0) || 
                          finalDocumentsData.some(val => val > 0);
        
        if (!hasAnyData) {
            console.log('No activity data found - showing empty charts');
        }

        // Accomplishment Chart
        const accomplishmentOptions = {
            series: [{
                name: 'Accomplishment',
                data: finalAccomplishmentData
            }],
            chart: {
                type: 'area',
                height: 200,
                toolbar: { show: false },
                sparkline: { enabled: false },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                }
            },
            dataLabels: { enabled: false },
            stroke: { 
                curve: 'smooth', 
                width: 3,
                colors: ['#28a745']
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'light',
                    type: 'vertical',
                    shadeIntensity: 0.3,
                    opacityFrom: 0.7,
                    opacityTo: 0.2,
                    stops: [0, 100]
                }
            },
            colors: ['#28a745'],
            grid: {
                show: true,
                borderColor: '#e0e0e0',
                strokeDashArray: 3,
                position: 'back'
            },
            xaxis: {
                categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                labels: {
                    style: {
                        colors: '#6c757d',
                        fontSize: '11px'
                    }
                },
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#6c757d',
                        fontSize: '11px'
                    },
                    formatter: function(val) {
                        return Math.round(val);
                    }
                },
                min: 0
            },
            tooltip: {
                theme: 'light',
                x: { show: true },
                y: {
                    formatter: function(val) {
                        return val + ' tasks';
                    }
                }
            },
            markers: {
                size: 5,
                colors: ['#28a745'],
                strokeColors: '#ffffff',
                strokeWidth: 2,
                hover: {
                    size: 7
                }
            }
        };
        accomplishmentChart = new ApexCharts(document.querySelector("#registrar_dashboard_totalAccomplishmentChart"), accomplishmentOptions);
        accomplishmentChart.render();

        // Visitors Chart
        const visitorsOptions = {
            series: [{
                name: 'Visitors',
                data: finalVisitorsData
            }],
            chart: {
                type: 'bar',
                height: 200,
                toolbar: { show: false },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                }
            },
            plotOptions: {
                bar: {
                    borderRadius: 6,
                    horizontal: false,
                    columnWidth: '60%',
                    distributed: false,
                    dataLabels: {
                        position: 'top'
                    }
                }
            },
            dataLabels: { 
                enabled: false,
                style: {
                    fontSize: '11px',
                    colors: ['#304758']
                }
            },
            colors: ['#007bff'],
            grid: {
                show: true,
                borderColor: '#e0e0e0',
                strokeDashArray: 3,
                position: 'back'
            },
            xaxis: {
                categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                labels: {
                    style: {
                        colors: '#6c757d',
                        fontSize: '11px'
                    }
                },
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#6c757d',
                        fontSize: '11px'
                    },
                    formatter: function(val) {
                        return Math.round(val);
                    }
                },
                min: 0
            },
            tooltip: {
                theme: 'light',
                x: { show: true },
                y: {
                    formatter: function(val) {
                        return val + ' visitors';
                    }
                }
            }
        };
        visitorsChart = new ApexCharts(document.querySelector("#registrar_dashboard_visitorsChart"), visitorsOptions);
        visitorsChart.render();

        // Documents Chart
        const documentsOptions = {
            series: [{
                name: 'Documents Released',
                data: finalDocumentsData
            }],
            chart: {
                type: 'line',
                height: 200,
                toolbar: { show: false },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                }
            },
            stroke: { 
                curve: 'smooth', 
                width: 4,
                colors: ['#dc3545']
            },
            colors: ['#dc3545'],
            grid: {
                show: true,
                borderColor: '#e0e0e0',
                strokeDashArray: 3,
                position: 'back'
            },
            xaxis: {
                categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                labels: {
                    style: {
                        colors: '#6c757d',
                        fontSize: '11px'
                    }
                },
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#6c757d',
                        fontSize: '11px'
                    },
                    formatter: function(val) {
                        return Math.round(val);
                    }
                },
                min: 0
            },
            dataLabels: { enabled: false },
            tooltip: {
                theme: 'light',
                x: { show: true },
                y: {
                    formatter: function(val) {
                        return val + ' documents';
                    }
                }
            },
            markers: {
                size: 6,
                colors: ['#dc3545'],
                strokeColors: '#ffffff',
                strokeWidth: 2,
                hover: {
                    size: 8
                }
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'light',
                    type: 'vertical',
                    shadeIntensity: 0.1,
                    opacityFrom: 0.3,
                    opacityTo: 0.1,
                    stops: [0, 100]
                }
            }
        };
        documentsChart = new ApexCharts(document.querySelector("#registrar_dashboard_documentsReleasedChart"), documentsOptions);
        documentsChart.render();
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

// Demo data note function removed - now showing real data only

function initializeAutoRefresh() {
    setInterval(refreshDashboardData, 300000); // 5 minutes
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            clearTimeout(refreshTimeout);
            refreshTimeout = setTimeout(refreshDashboardData, 1000);
        }
    });
}

function refreshDashboardData() {
    fetch('/registrar/dashboard/api/data/')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                console.error('Dashboard API Error:', data.error);
                // Don't update the UI if there's an error, just log it
                return;
            }
            updateDashboardStatistics(data.statistics);
            updateCharts(data.charts);
            updateUpcomingEvents(data.upcoming_events);
        })
        .catch(error => {
            console.error('Error refreshing dashboard data:', error);
            // Don't break the UI, just log the error
        });
}

function updateDashboardStatistics(statistics) {
    // Update summary cards
    document.querySelector('#registrar_dashboard_clearance_request_card h5').textContent = statistics.total_clearance_requests;
    document.querySelector('#registrar_dashboard_clearance_request_card small').textContent = `${statistics.pending_clearance_requests} pending`;
    
    document.querySelector('#registrar_dashboard_enrollment_request_card h5').textContent = statistics.total_enrollment_requests;
    document.querySelector('#registrar_dashboard_enrollment_request_card small').textContent = `${statistics.pending_enrollment_requests} pending`;
    
    document.querySelector('#registrar_dashboard_graduation_request_card h5').textContent = statistics.total_graduation_requests;
    document.querySelector('#registrar_dashboard_graduation_request_card small').textContent = `${statistics.pending_graduation_requests} pending`;
    
    document.querySelector('#registrar_dashboard_pending_signatures_card h5').textContent = statistics.pending_signatures_count;
    document.querySelector('#registrar_dashboard_pending_signatures_card small').textContent = `${statistics.new_signatures_today} since yesterday`;
    
    document.querySelector('#registrar_dashboard_disapproved_forms_card h5').textContent = statistics.disapproved_forms_count;
    document.querySelector('#registrar_dashboard_disapproved_forms_card small').textContent = `${statistics.recently_disapproved} recently`;
    
    document.querySelector('#registrar_dashboard_document_requests_card h5').textContent = statistics.total_document_requests;
    document.querySelector('#registrar_dashboard_document_requests_card small').textContent = `${statistics.pending_document_requests} pending`;
}

function updateCharts(charts) {
    if (accomplishmentChart) {
        accomplishmentChart.updateSeries(charts.accomplishment.series);
    }
    if (visitorsChart) {
        visitorsChart.updateSeries(charts.visitors.series);
    }
    if (documentsChart) {
        documentsChart.updateSeries(charts.documents.series);
    }
}

function updateUpcomingEvents(events) {
    const eventsContainer = document.querySelector('.registrar_dashboard_scrollable_events');
    if (!eventsContainer) return;
    
    if (events.length === 0) {
        eventsContainer.innerHTML = '<div class="text-muted small">No upcoming events</div>';
        return;
    }
    
    eventsContainer.innerHTML = events.map(event => `
        <div class="event-item event-${event.color}" data-date="${event.date}" data-is-holiday="${event.is_holiday}">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <small class="text-muted">${event.time}</small><br>
                    <strong>${event.title}</strong>
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="addEventToGoogleCalendar('${event.title}', '${event.date}', '${event.time}')" title="Add to Google Calendar">
                    <i class="bi bi-calendar-plus"></i>
                </button>
            </div>
        </div>
    `).join('');
}

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
        'location': 'School Registrar Office',
        'sf': 'true',
        'output': 'xml'
    });
    
    const googleCalendarUrl = `${baseUrl}?${params.toString()}`;
    
    // Open Google Calendar in new tab
    window.open(googleCalendarUrl, '_blank');
    
    showNotification('Opening Google Calendar to add event...', 'info');
}

function initializeCalendar() {
    // Add click handler for the calendar iframe to handle event creation
    const calendarContainer = document.querySelector('.calendar-container');
    if (calendarContainer) {
        // Add a button next to the calendar for adding events
        const addEventButton = document.createElement('button');
        addEventButton.className = 'btn btn-sm btn-primary mt-2';
        addEventButton.innerHTML = '<i class="bi bi-plus"></i> Add Event';
        addEventButton.type = 'button'; // Prevent form submission
        addEventButton.onclick = function(e) {
            e.preventDefault(); // Prevent any default action
            e.stopPropagation(); // Stop event bubbling
            showAddEventModal();
        };
        
        // Insert button after the iframe
        const iframe = document.getElementById('registrar_dashboard_calendar_iframe');
        if (iframe) {
            iframe.parentNode.insertBefore(addEventButton, iframe.nextSibling);
        }
    }
}

function showAddEventModal() {
    // Remove any existing modal first
    const existingModal = document.getElementById('addEventModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal for adding events
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'addEventModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'addEventModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="addEventModalLabel">Add Calendar Event</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="addEventForm">
                        <div class="mb-3">
                            <label class="form-label">Event Title</label>
                            <input type="text" class="form-control" name="title" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" name="description" rows="3"></textarea>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">Start Date</label>
                                    <input type="date" class="form-control" name="start_date" required>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">Start Time</label>
                                    <input type="time" class="form-control" name="start_time">
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">End Date</label>
                                    <input type="date" class="form-control" name="end_date">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">End Time</label>
                                    <input type="time" class="form-control" name="end_time">
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">Event Type</label>
                                    <select class="form-control" name="event_type">
                                        <option value="event">Event</option>
                                        <option value="meeting">Meeting</option>
                                        <option value="deadline">Deadline</option>
                                        <option value="reminder">Reminder</option>
                                        <option value="holiday">Holiday</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">Color</label>
                                    <select class="form-control" name="color">
                                        <option value="blue">Blue</option>
                                        <option value="yellow">Yellow</option>
                                        <option value="red">Red</option>
                                        <option value="green">Green</option>
                                        <option value="purple">Purple</option>
                                        <option value="orange">Orange</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" name="is_all_day" id="isAllDay">
                                <label class="form-check-label" for="isAllDay">All Day Event</label>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" name="is_holiday" id="isHoliday">
                                <label class="form-check-label" for="isHoliday">Holiday</label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveEvent()">Save Event</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    modal.querySelector('input[name="start_date"]').value = today;
    
    // Show modal using Bootstrap
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Clean up modal when hidden
    modal.addEventListener('hidden.bs.modal', function() {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    });
    
    // Prevent form submission on enter key
    const form = modal.querySelector('#addEventForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveEvent();
    });
}

function saveEvent() {
    const form = document.getElementById('addEventForm');
    if (!form) {
        console.error('Form not found');
        return;
    }
    
    const formData = new FormData(form);
    
    const eventData = {
        title: formData.get('title'),
        description: formData.get('description'),
        start_date: formData.get('start_date'),
        start_time: formData.get('start_time'),
        end_date: formData.get('end_date'),
        end_time: formData.get('end_time'),
        event_type: formData.get('event_type'),
        color: formData.get('color'),
        is_all_day: formData.get('is_all_day') === 'on',
        is_holiday: formData.get('is_holiday') === 'on'
    };
    
    // Show loading state
    const saveButton = document.querySelector('#addEventModal .btn-primary');
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;
    
    fetch('/registrar/calendar/events/add/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(eventData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close the add event modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEventModal'));
            if (modal) {
                modal.hide();
            }
            
            // Show success message with Google Calendar link
            showGoogleCalendarModal(data.google_calendar_url, data.message);
            
            // Refresh dashboard data to show new event
            setTimeout(() => {
                refreshDashboardData();
            }, 500);
            
        } else {
            showNotification('Error adding event: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error adding event: ' + error.message, 'error');
    })
    .finally(() => {
        // Restore button state
        saveButton.textContent = originalText;
        saveButton.disabled = false;
    });
}

function showGoogleCalendarModal(googleCalendarUrl, message) {
    // Remove any existing modal first
    const existingModal = document.getElementById('googleCalendarModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal for Google Calendar integration
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'googleCalendarModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'googleCalendarModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="googleCalendarModalLabel">
                        <i class="bi bi-calendar-check text-success"></i> Event Added Successfully!
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle"></i> ${message}
                    </div>
                    <p class="mb-3">Would you like to add this event to your Google Calendar?</p>
                    <div class="d-grid gap-2">
                        <a href="${googleCalendarUrl}" target="_blank" class="btn btn-primary">
                            <i class="bi bi-calendar-plus"></i> Add to Google Calendar
                        </a>
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal using Bootstrap
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Clean up modal when hidden
    modal.addEventListener('hidden.bs.modal', function() {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    });
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
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

// Add click handlers for summary cards to navigate to relevant pages
document.addEventListener('click', function(e) {
    if (e.target.closest('.summary-card')) {
        const card = e.target.closest('.summary-card');
        const cardId = card.parentElement.id;
        
        let url = '';
        switch(cardId) {
            case 'registrar_dashboard_clearance_request_card':
                url = '/registrar/clearance/';
                break;
            case 'registrar_dashboard_enrollment_request_card':
                url = '/registrar/enrollment/';
                break;
            case 'registrar_dashboard_graduation_request_card':
                url = '/registrar/graduation/';
                break;
            case 'registrar_dashboard_document_requests_card':
                url = '/registrar/document-release/';
                break;
        }
        
        if (url) {
            window.location.href = url;
        }
    }
});

// Utility functions
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getStatusColor(status) {
    switch(status) {
        case 'approved': return 'success';
        case 'pending': return 'warning';
        case 'rejected':
        case 'disapproved': return 'danger';
        default: return 'secondary';
    }
}