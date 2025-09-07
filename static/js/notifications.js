/**
 * Enhanced Notification System JavaScript
 * Handles notification display, counts, interactions, and preferences for all user types
 */

class NotificationManager {
    constructor() {
        // Legacy notification count elements (for backward compatibility)
        this.notificationCountElements = [
            'registrar_sidebar_notification_count',
            'registrar_dashboard_notification_count',
            'signatory_sidebar_notification_count', 
            'bm_sidebar_notification_count',
            // New notification elements
            'student_notification_badge',
            'admin_notification_badge',
            'signatory_notification_badge',
            'business_manager_notification_badge'
        ];
        
        // Enhanced notification system properties
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoading = false;
        this.filters = {
            type: '',
            priority: '',
            unread_only: false
        };
        this.notifications = [];
        this.preferences = {};
        
        this.init();
    }

    init() {
        this.loadNotificationCount();
        this.setupNotificationClickHandlers();
        this.setupEnhancedEvents();
        this.loadPreferences();
        
        // Auto-refresh notification count every 30 seconds
        setInterval(() => {
            this.loadNotificationCount();
        }, 30000);
    }
    
    setupEnhancedEvents() {
        // Wait for DOM to be fully loaded before setting up events
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEnhancedEvents());
        } else {
            this.bindEnhancedEvents();
        }
    }
    
    bindEnhancedEvents() {
        // Wait for jQuery to be available
        if (typeof $ === 'undefined') {
            console.warn('jQuery not loaded, retrying in 500ms...');
            setTimeout(() => this.bindEnhancedEvents(), 500);
            return;
        }
        
        console.log('jQuery available, binding enhanced notification events');
        
        // Modal events
        $('#notificationModal').on('shown.bs.modal', () => {
            this.loadNotifications(true);
            // Auto-mark all unread notifications as read when modal opens
            this.markAllAsReadOnModalOpen();
        });
        
        // Filter events
        $('#notificationTypeFilter').on('change', (e) => {
            this.filters.type = e.target.value;
            this.loadNotifications(true);
        });
        
        $('#notificationPriorityFilter').on('change', (e) => {
            this.filters.priority = e.target.value;
            this.loadNotifications(true);
        });
        
        $('#unreadOnlyFilter').on('change', (e) => {
            this.filters.unread_only = e.target.checked;
            this.loadNotifications(true);
        });
        
        // Action events
        $('#markAllReadBtn').on('click', () => this.markAllAsRead());
        $('#refreshNotificationsBtn').on('click', () => this.loadNotifications(true));
        $('#loadMoreNotifications').on('click', () => this.loadMoreNotifications());
        
        // Preferences events
        $('#savePreferencesBtn').on('click', () => this.savePreferences());
        
        // Document events for notification clicks
        $(document).on('click', '.notification-item', (e) => {
            // Don't handle clicks on dropdown buttons or their children
            if (!$(e.target).closest('.dropdown').length) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Notification item clicked');
                // Auto-mark as read immediately when clicked
                const notificationId = $(e.currentTarget).data('notification-id');
                this.markAsRead(notificationId);
                this.handleNotificationClick(e.currentTarget);
            }
        });
        
        $(document).on('click', '.mark-read-item', (e) => {
            e.preventDefault();
            const notificationId = $(e.target).closest('.notification-item').data('notification-id');
            this.markAsRead(notificationId);
        });
    }

    async loadNotificationCount() {
        try {
            const response = await fetch('/api/notifications/');
            const data = await response.json();
            this.updateNotificationCount(data.unread_count);
        } catch (error) {
            console.error('Error loading notification count:', error);
        }
    }

    updateNotificationCount(count) {
        this.notificationCountElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                if (count > 0) {
                    element.textContent = count > 99 ? '99+' : count;
                    element.style.display = 'block';
                } else {
                    element.style.display = 'none';
                }
            }
        });
    }

    async loadNotifications() {
        try {
            const response = await fetch('/api/notifications/');
            const data = await response.json();
            return data.notifications;
        } catch (error) {
            console.error('Error loading notifications:', error);
            return [];
        }
    }

    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (data.success) {
                this.loadNotificationCount(); // Refresh count
            }
            return data.success;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch('/api/notifications/mark-all-read/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (data.success) {
                this.loadNotificationCount(); // Refresh count
            }
            return data.success;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return false;
        }
    }

    async markAllAsReadOnModalOpen() {
        // Mark all unread notifications as read when modal is opened
        try {
            const response = await fetch('/api/notifications/mark-all-read/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (data.success) {
                // Update notification count to reflect the changes
                this.updateNotificationCount(0);
                // Update local notifications to mark them as read
                this.notifications.forEach(notification => {
                    notification.is_read = true;
                });
            }
        } catch (error) {
            console.error('Error auto-marking notifications as read on modal open:', error);
        }
    }

    setupNotificationClickHandlers() {
        // Setup click handlers for notification icons
        const notificationIcons = [
            'registrar_sidebar_notification',
            'registrar_dashboard_notification',
            'signatory_sidebar_notification',
            'bm_sidebar_notification'
        ];

        notificationIcons.forEach(iconId => {
            const icon = document.getElementById(iconId);
            if (icon) {
                icon.addEventListener('click', () => {
                    this.showNotificationDropdown(iconId);
                });
            }
        });
    }

    async showNotificationDropdown(iconId) {
        // Auto-mark all notifications as read when notification icon is clicked
        await this.markAllAsRead();
        // Open the notification modal
        openNotificationModal();
    }

    getCSRFToken() {
        // Get CSRF token from meta tag or cookie
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }
        
        // Fallback to cookie method
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return '';
    }

    // Utility method for creating notifications (can be called from other parts of the system)
    static async createNotification(userId, title, message) {
        // This would typically be called from the backend
        console.log('Notification created:', { userId, title, message });
    }
    
    // ============================================================================
    // ENHANCED NOTIFICATION METHODS
    // ============================================================================
    
    async loadNotifications(reset = false) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        if (reset) {
            this.currentPage = 1;
            this.hasMore = true;
            this.notifications = [];
        }
        
        this.showLoadingState();
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 20,
                unread_only: this.filters.unread_only,
                ...this.filters.type && { type: this.filters.type },
                ...this.filters.priority && { priority: this.filters.priority }
            });
            
            const response = await fetch(`/api/notifications/enhanced/?${params}`);
            const data = await response.json();
            
            if (data.success) {
                if (reset) {
                    this.notifications = data.notifications;
                } else {
                    this.notifications = [...this.notifications, ...data.notifications];
                }
                
                this.hasMore = data.has_more;
                this.renderNotifications();
                this.updateNotificationCount(data.unread_count);
                this.updateNotificationInfo(data.total_count, data.unread_count);
                
                $('#loadMoreNotifications').toggle(this.hasMore);
            } else {
                this.showErrorState();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadMoreNotifications() {
        if (this.hasMore && !this.isLoading) {
            this.currentPage++;
            await this.loadNotifications();
        }
    }
    
    renderNotifications() {
        const container = $('#notificationsContent');
        
        if (this.notifications.length === 0) {
            this.showEmptyState();
            return;
        }
        
        container.empty();
        
        this.notifications.forEach(notification => {
            const element = this.createNotificationElement(notification);
            container.append(element);
        });
        
        this.hideLoadingState();
        this.hideErrorState();
        this.hideEmptyState();
    }
    
    createNotificationElement(notification) {
        // Create notification element programmatically instead of relying on template
        const iconMap = {
            'form_submitted': 'bi-file-earmark',
            'form_approved': 'bi-check-circle-fill',
            'form_disapproved': 'bi-exclamation-triangle-fill',
            'document_ready': 'bi-file-arrow-down',
            'document_released': 'bi-check-square',
            'clearance_completed': 'bi-mortarboard',
            'report_generated': 'bi-bar-chart',
            'system_alert': 'bi-bell',
            'deadline_reminder': 'bi-clock'
        };
        
        const iconClass = iconMap[notification.notification_type] || 'bi-bell';
        
        // Priority badge styling
        let priorityBadgeClass = 'bg-secondary';
        switch (notification.priority) {
            case 'urgent':
                priorityBadgeClass = 'bg-danger';
                break;
            case 'high':
                priorityBadgeClass = 'bg-warning text-dark';
                break;
            case 'medium':
                priorityBadgeClass = 'bg-primary';
                break;
        }
        
        const priorityText = notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1);
        const readClass = notification.is_read ? '' : 'unread';
        const actionBadge = notification.action_required ? '<span class="badge bg-danger ms-2">Action Required</span>' : '';
        
        const element = $(`
            <div class="notification-item ${readClass} priority-${notification.priority} p-3 border-bottom" data-notification-id="${notification.id}">
                <div class="d-flex align-items-start">
                    <div class="notification-icon me-3">
                        <i class="bi ${iconClass} fs-4"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <h6 class="notification-title mb-1">${notification.title}</h6>
                            <small class="text-muted notification-time">${notification.time_ago || 'Just now'}</small>
                        </div>
                        <p class="notification-message mb-2 text-muted">${notification.message}</p>
                        <div class="d-flex align-items-center">
                            <span class="badge ${priorityBadgeClass} notification-priority">${priorityText}</span>
                            <span class="badge bg-info ms-2 notification-type">${this.formatNotificationType(notification.notification_type)}</span>
                            ${actionBadge}
                        </div>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item mark-read-item" href="#"><i class="bi bi-check me-2"></i>Mark as Read</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `);
        
        return element;
    }
    
    async loadPreferences() {
        try {
            const response = await fetch('/api/notifications/preferences/');
            const data = await response.json();
            
            if (data.success) {
                this.preferences = data.preferences;
                this.populatePreferencesForm();
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }
    
    async savePreferences() {
        const formData = new FormData($('#notificationPreferencesForm')[0]);
        const preferences = Object.fromEntries(formData.entries());
        
        // Convert checkboxes to booleans
        const checkboxFields = [
            'email_on_form_approved', 'email_on_form_disapproved',
            'email_on_document_ready', 'email_on_clearance_completed',
            'email_daily_digest', 'notify_form_submissions',
            'notify_status_changes', 'notify_document_updates',
            'notify_system_alerts'
        ];
        
        checkboxFields.forEach(field => {
            preferences[field] = preferences.hasOwnProperty(field);
        });
        
        try {
            const response = await fetch('/api/notifications/preferences/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(preferences)
            });
            
            const data = await response.json();
            if (data.success) {
                this.preferences = preferences;
                $('#notificationPreferencesModal').modal('hide');
                this.showToast('Success', 'Preferences updated successfully', 'success');
            } else {
                this.showToast('Error', data.error || 'Failed to update preferences', 'error');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.showToast('Error', 'Failed to update preferences', 'error');
        }
    }
    
    populatePreferencesForm() {
        if (typeof $ === 'undefined') {
            console.warn('jQuery not available for populating preferences form, retrying...');
            setTimeout(() => this.populatePreferencesForm(), 500);
            return;
        }
        
        Object.entries(this.preferences).forEach(([key, value]) => {
            const input = $(`[name="${key}"]`);
            if (input.length && input.attr('type') === 'checkbox') {
                input.prop('checked', value);
            } else if (input.length) {
                input.val(value);
            }
        });
    }
    
    handleNotificationClick(element) {
        console.log('Notification clicked:', element);
        const notificationId = $(element).data('notification-id');
        const notification = this.notifications.find(n => n.id === notificationId);
        
        console.log('Found notification:', notification);
        
        if (!notification) {
            console.warn('Notification not found with ID:', notificationId);
            return;
        }
        
        // Note: Notification is already marked as read in the click handler
        
        // Handle specific notification actions
        if (notification.notification_type && notification.notification_type.startsWith('bulk_')) {
            // Handle bulk notifications specifically
            // Use form_type from notification data first, then check various fallbacks
            let formType = notification.form_type || 
                          notification.extra_data?.form_type;
            
            // Handle legacy bulk notifications with completed_counts structure
            if (!formType && notification.extra_data?.completed_counts) {
                const counts = notification.extra_data.completed_counts;
                formType = Object.keys(counts)[0]; // Get first form type from counts
            }
            
            // Final fallback: parse notification_type
            if (!formType) {
                formType = notification.notification_type.replace('bulk_', '').replace('_completed', '');
            }
            console.log(`Bulk notification clicked for ${formType}`);
            this.navigateToFormTab(formType);
        } else if (notification.form_type) {
            if (notification.form_id) {
                // Specific form notification
                console.log(`Navigating to form: ${notification.form_type}, ID: ${notification.form_id}`);
                this.navigateToForm(notification.form_type, notification.form_id);
            } else {
                // Pending count notification - redirect to appropriate tab
                console.log(`Navigating to ${notification.form_type} tab/dashboard`);
                this.navigateToFormTab(notification.form_type);
            }
        } else {
            // Check if this is a browser notification (success_browser, etc.)
            if (notification.notification_type === 'success_browser' || 
                notification.extra_data?.browser_notification) {
                console.log('Browser notification clicked - just closing modal');
                // For browser notifications, just close the modal - no navigation needed
                $('#notificationModal').modal('hide');
                return;
            }
            
            console.log('No form_type found, redirecting to dashboard');
            console.log('Notification data:', {
                form_type: notification.form_type,
                form_id: notification.form_id,
                notification_type: notification.notification_type,
                notification
            });
            
            // Close modal first
            $('#notificationModal').modal('hide');
            
            // If no specific form, redirect to dashboard
            const userType = document.body.dataset.userType || 'student';
            if (userType === 'student') {
                window.location.href = '/dashboard/';
            }
        }
    }
    
    navigateToFormTab(formType) {
        const userType = document.body.dataset.userType || 'student';
        let url = '';
        
        console.log(`Navigating to ${formType} tab for ${userType}`);
        
        // Close modal first
        $('#notificationModal').modal('hide');
        
        switch (formType) {
            case 'clearance':
                if (userType === 'business_manager') {
                    url = `/business-manager/clearance/`;
                } else if (userType === 'signatory') {
                    url = `/signatory/clearance/`;
                } else if (userType === 'admin' || userType === 'registrar') {
                    url = `/registrar/clearance/`;
                } else {
                    // For students, just redirect to main dashboard - no tab-specific URLs
                    url = `/dashboard/`;
                }
                break;
            case 'enrollment':
                if (userType === 'business_manager') {
                    url = `/business-manager/enrollment/`;
                } else if (userType === 'signatory') {
                    url = `/signatory/enrollment/`;
                } else if (userType === 'admin' || userType === 'registrar') {
                    url = `/registrar/enrollment/`;
                } else {
                    // For students, just redirect to main dashboard - no tab-specific URLs  
                    url = `/dashboard/`;
                }
                break;
            case 'graduation':
                if (userType === 'business_manager') {
                    url = `/business-manager/graduation/`;
                } else if (userType === 'admin' || userType === 'registrar') {
                    url = `/registrar/graduation/`;
                } else if (userType === 'signatory') {
                    // Signatories don't handle graduation forms, redirect to dashboard
                    url = `/signatory/dashboard/`;
                } else {
                    // For students, just redirect to main dashboard - no tab-specific URLs
                    url = `/dashboard/`;
                }
                break;
            case 'document_request':
                if (userType === 'business_manager') {
                    url = `/business-manager/credential-request/`;
                } else if (userType === 'signatory') {
                    url = `/signatory/credential-request/`;
                } else if (userType === 'admin' || userType === 'registrar') {
                    url = `/registrar/document-release/`;
                } else {
                    url = `/dashboard/#request-tab`;
                }
                break;
            default:
                // Fallback to general dashboard
                if (userType === 'business_manager') {
                    url = `/business-manager/dashboard/`;
                } else if (userType === 'signatory') {
                    url = `/signatory/dashboard/`;
                } else if (userType === 'admin' || userType === 'registrar') {
                    url = `/registrar/dashboard/`;
                } else {
                    url = `/dashboard/`;
                }
                break;
        }
        
        if (url) {
            console.log(`Redirecting to: ${url}`);
            window.location.href = url;
        }
    }
    
    showClearanceModal(formId) {
        console.log('Showing clearance modal for form ID:', formId);
        
        // Close notification modal first and clean up all modals
        $('.modal').modal('hide');
        
        // Remove any existing modal backdrops
        $('.modal-backdrop').remove();
        
        // Remove modal-open class from body
        $('body').removeClass('modal-open');
        
        // Reset body style
        $('body').css('overflow', '');
        $('body').css('padding-right', '');
        
        // Wait for cleanup, then show clearance modal
        setTimeout(() => {
            // Check if viewClearance function exists and call it
            if (typeof window.viewClearance === 'function') {
                window.viewClearance(formId);
            } else {
                console.error('viewClearance function not found');
                // Fallback to navigation
                window.location.href = `/view-clearance/${formId}/`;
            }
        }, 500); // Increased delay to ensure proper cleanup
    }
    
    showEnrollmentModal(formId) {
        console.log('Showing enrollment modal for form ID:', formId);
        
        // Close notification modal first and clean up all modals
        $('.modal').modal('hide');
        
        // Remove any existing modal backdrops
        $('.modal-backdrop').remove();
        
        // Remove modal-open class from body
        $('body').removeClass('modal-open');
        
        // Reset body style
        $('body').css('overflow', '');
        $('body').css('padding-right', '');
        
        // Wait for cleanup, then show enrollment modal
        setTimeout(() => {
            // Check if viewEnrollment function exists and call it
            if (typeof window.viewEnrollment === 'function') {
                window.viewEnrollment(formId);
            } else {
                console.error('viewEnrollment function not found');
                // Fallback: go to enrollment section and scroll to table
                window.location.href = `/dashboard/#enrollment`;
            }
        }, 500);
    }
    
    showGraduationModal(formId) {
        console.log('Showing graduation modal for form ID:', formId);
        
        // Close notification modal first and clean up all modals
        $('.modal').modal('hide');
        
        // Remove any existing modal backdrops
        $('.modal-backdrop').remove();
        
        // Remove modal-open class from body
        $('body').removeClass('modal-open');
        
        // Reset body style
        $('body').css('overflow', '');
        $('body').css('padding-right', '');
        
        // Wait for cleanup, then show graduation modal
        setTimeout(() => {
            // Check if viewGraduation function exists and call it
            if (typeof window.viewGraduation === 'function') {
                window.viewGraduation(formId);
            } else {
                console.error('viewGraduation function not found');
                // Fallback: go to graduation section and scroll to table
                window.location.href = `/dashboard/#graduation`;
            }
        }, 500);
    }
    
    navigateToForm(formType, formId) {
        let url = '';
        const userType = document.body.dataset.userType || 'student';
        
        switch (formType) {
            case 'clearance':
                if (userType === 'business_manager') {
                    url = `/business-manager/clearance/`;
                } else if (userType === 'signatory') {
                    url = `/signatory/clearance/`;
                } else if (userType === 'admin' || userType === 'registrar') {
                    url = `/registrar/clearance/`;
                } else {
                    // For students, show the clearance modal instead of navigating
                    this.showClearanceModal(formId);
                    return; // Don't navigate, just show modal
                }
                break;
            case 'enrollment':
                if (userType === 'business_manager') {
                    url = `/business-manager/enrollment/`;
                } else if (userType === 'admin' || userType === 'registrar') {
                    url = `/registrar/enrollment/`;
                } else {
                    // For students, show the enrollment modal instead of navigating
                    this.showEnrollmentModal(formId);
                    return; // Don't navigate, just show modal
                }
                break;
            case 'graduation':
                if (userType === 'business_manager') {
                    url = `/business-manager/graduation/`;
                } else if (userType === 'admin' || userType === 'registrar') {
                    url = `/registrar/graduation/`;
                } else {
                    // For students, show the graduation modal instead of navigating
                    this.showGraduationModal(formId);
                    return; // Don't navigate, just show modal
                }
                break;
            case 'document_request':
                if (userType === 'business_manager') {
                    url = `/business-manager/credential-request/`;
                } else if (userType === 'admin' || userType === 'registrar') {
                    url = `/registrar/document-release/`;
                } else {
                    // For students, redirect to dashboard request tab instead of undesigned page
                    url = `/dashboard/#request-tab`;
                }
                break;
        }
        
        if (url) {
            console.log(`Generated URL: ${url} for form type: ${formType}, form ID: ${formId}`);
            
            // Close modal first
            $('#notificationModal').modal('hide');
            
            // For student clearance views, check if the clearance exists first
            if (url.includes('/view-clearance/')) {
                fetch(url, { method: 'HEAD' })
                    .then(response => {
                        if (response.ok) {
                            console.log('Clearance exists, navigating to:', url);
                            window.location.href = url;
                        } else {
                            // Clearance not found, redirect to dashboard
                            console.warn('Clearance not found, redirecting to dashboard');
                            window.location.href = '/dashboard/';
                        }
                    })
                    .catch(error => {
                        console.warn('Error checking clearance, redirecting to dashboard:', error);
                        window.location.href = '/dashboard/';
                    });
            } else {
                // For other URLs, navigate directly
                console.log('Navigating directly to:', url);
                window.location.href = url;
            }
        } else {
            console.warn('No URL generated for navigation');
            $('#notificationModal').modal('hide');
            window.location.href = '/dashboard/';
        }
    }
    
    updateNotificationInfo(total, unread) {
        $('#notificationsInfo').text(`Showing ${this.notifications.length} of ${total} notifications (${unread} unread)`);
    }
    
    formatNotificationType(type) {
        const typeMap = {
            'form_submitted': 'Form Submitted',
            'form_approved': 'Approved',
            'form_disapproved': 'Disapproved',
            'document_ready': 'Document Ready',
            'document_released': 'Document Released',
            'clearance_completed': 'Clearance Done',
            'report_generated': 'Report Generated',
            'system_alert': 'System Alert',
            'deadline_reminder': 'Deadline'
        };
        
        return typeMap[type] || type;
    }
    
    showLoadingState() {
        if (typeof $ !== 'undefined') {
            $('#notificationsLoading').removeClass('d-none');
            $('#notificationsEmpty').addClass('d-none');
            $('#notificationsError').addClass('d-none');
        }
    }
    
    hideLoadingState() {
        if (typeof $ !== 'undefined') {
            $('#notificationsLoading').addClass('d-none');
        }
    }
    
    showEmptyState() {
        if (typeof $ !== 'undefined') {
            $('#notificationsEmpty').removeClass('d-none');
            $('#notificationsLoading').addClass('d-none');
            $('#notificationsError').addClass('d-none');
        }
    }
    
    hideEmptyState() {
        if (typeof $ !== 'undefined') {
            $('#notificationsEmpty').addClass('d-none');
        }
    }
    
    showErrorState() {
        if (typeof $ !== 'undefined') {
            $('#notificationsError').removeClass('d-none');
            $('#notificationsLoading').addClass('d-none');
            $('#notificationsEmpty').addClass('d-none');
        }
    }
    
    hideErrorState() {
        if (typeof $ !== 'undefined') {
            $('#notificationsError').addClass('d-none');
        }
    }
    
    showToast(title, message, type = 'info') {
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';
        
        const toast = $(`
            <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                <strong>${title}:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
        
        $('body').append(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.alert('close');
        }, 5000);
    }
}

// Initialize notification manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
});

// Export for use in other scripts
window.NotificationManager = NotificationManager;

// Global functions for opening notification modal and refreshing notifications
function openNotificationModal() {
    // Ensure jQuery and modal exist
    if (typeof $ !== 'undefined' && $('#notificationModal').length > 0) {
        $('#notificationModal').modal('show');
    } else if (typeof bootstrap !== 'undefined') {
        // Fallback to vanilla Bootstrap 5
        const modalElement = document.getElementById('notificationModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    } else {
        console.error('Neither jQuery nor Bootstrap modal found');
    }
}

function refreshNotifications() {
    if (window.notificationManager) {
        window.notificationManager.loadNotifications(true);
    }
}

// Global function for onclick handlers
function loadNotifications() {
    if (window.notificationManager) {
        window.notificationManager.loadNotifications(true);
    } else {
        console.warn('NotificationManager not available');
    }
}