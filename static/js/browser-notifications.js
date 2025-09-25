/**
 * Browser Notification System
 * Handles browser push notifications for the clearance system
 */

class BrowserNotificationManager {
    constructor() {
        this.isSupported = 'Notification' in window;
        this.permission = this.isSupported ? Notification.permission : 'denied';
        this.lastChecked = 0;
        this.checkInterval = 30000; // Check every 30 seconds
        this.init();
    }

    async init() {
        if (!this.isSupported) {
            console.log('Browser notifications not supported');
            return;
        }

        // Request permission if not already granted
        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }

        // Start checking for new notifications
        if (this.permission === 'granted') {
            this.startNotificationPolling();
            console.log('Browser notifications initialized');
        }
    }

    async requestPermission() {
        if (!this.isSupported) return false;
        
        this.permission = await Notification.requestPermission();
        
        if (this.permission === 'granted') {
            this.startNotificationPolling();
            return true;
        }
        return false;
    }

    startNotificationPolling() {
        // Check immediately
        this.checkForBrowserNotifications();
        
        // Set up periodic checking
        setInterval(() => {
            this.checkForBrowserNotifications();
        }, this.checkInterval);
    }

    async checkForBrowserNotifications() {
        try {
            const response = await fetch('/api/browser-notifications/', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            
            if (data.success && data.notifications && data.notifications.length > 0) {
                data.notifications.forEach(notification => {
                    this.showBrowserNotification(notification);
                });
            }
        } catch (error) {
            console.error('Error checking for browser notifications:', error);
        }
    }

    showBrowserNotification(notificationData) {
        if (this.permission !== 'granted') return;

        const options = {
            body: notificationData.message,
            icon: notificationData.extra_data?.icon || '/static/images/logo.png',
            badge: '/static/images/logo-small.png',
            tag: notificationData.id,
            requireInteraction: false
        };

        const notification = new Notification(notificationData.title, options);

        // Handle notification clicks
        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            
            // Navigate based on notification type
            this.handleNotificationClick(notificationData);
            notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => {
            notification.close();
        }, 10000);

        // Mark as shown
        this.markNotificationAsShown(notificationData.id);
    }

    handleNotificationClick(notificationData) {
        const formType = notificationData.form_type;
        const formId = notificationData.form_id;
        
        // Redirect to appropriate page based on form type
        let redirectUrl = '/';
        
        if (formType === 'clearance') {
            redirectUrl = '/student/dashboard/#clearance';
        } else if (formType === 'enrollment') {
            redirectUrl = '/student/dashboard/#enrollment';
        } else if (formType === 'graduation') {
            redirectUrl = '/student/dashboard/#graduation';
        }
        
        // Navigate to the page
        if (window.location.pathname !== '/student/dashboard/') {
            window.location.href = redirectUrl;
        } else {
            // If already on dashboard, switch to the appropriate tab
            const tabName = formType || 'clearance';
            const tabButton = document.querySelector(`[data-bs-target="#${tabName}Tab"]`);
            if (tabButton) {
                tabButton.click();
            }
        }
    }

    async markNotificationAsShown(notificationId) {
        try {
            await fetch('/api/mark-browser-notification-shown/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    notification_id: notificationId
                })
            });
        } catch (error) {
            console.error('Error marking notification as shown:', error);
        }
    }

    getCSRFToken() {
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        return token ? token.value : '';
    }

    // Public method to show a test notification
    async showTestNotification() {
        if (this.permission !== 'granted') {
            const granted = await this.requestPermission();
            if (!granted) {
                alert('Please enable browser notifications to receive alerts');
                return;
            }
        }

        this.showBrowserNotification({
            id: 'test',
            title: 'Test Notification',
            message: 'Browser notifications are working correctly!',
            form_type: 'clearance',
            extra_data: {
                icon: '/static/images/logo.png'
            }
        });
    }
}

// Initialize browser notification manager
const browserNotifications = new BrowserNotificationManager();

// Make it globally available
window.browserNotifications = browserNotifications;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Browser notification system loaded');
});