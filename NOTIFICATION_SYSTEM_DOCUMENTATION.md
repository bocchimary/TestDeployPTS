# Complete Notification System Documentation

## Overview
This document provides comprehensive information about all notification events in the Educational Institution Clearance System, including system notifications, email notifications, and browser notifications.

## All Notification Events

### 1. Form Submission Notifications
**Trigger**: When a student submits any form (clearance, enrollment, graduation)
**Recipients**: All relevant signatories for that form type
**Notification Types**:
- System notification: Updates pending count for signatories
- Email: Form submission alert (if enabled in preferences)
- Browser: Real-time notification to online signatories

**Function**: `NotificationService.notify_form_submission()`
**Location**: `landing/notification_service.py:310`

### 2. Form Approval Notifications
**Trigger**: When a signatory, business manager, or registrar approves a form
**Recipients**: Student who submitted the form
**Notification Types**:
- System notification: "Form Approved" with signatory details
- Email: Approval confirmation with next steps
- Browser: Instant approval notification

**Function**: `NotificationService.notify_form_approval()`  
**Location**: `landing/notification_service.py:387`

**Browser Enhancement**: Added in lines 421-427

### 3. Form Disapproval Notifications
**Trigger**: When a signatory, business manager, or registrar disapproves a form
**Recipients**: Student who submitted the form
**Notification Types**:
- System notification: "Form Disapproved" with reasons and settlement instructions
- Email: Disapproval details with deadline for resolution
- Browser: Urgent disapproval alert

**Functions**: 
- `NotificationService.notify_form_disapproval()` (line 439)
- `NotificationService.handle_form_disapproval()` (line 617)

**Browser Enhancement**: Added in lines 480-486 and 686-692

### 4. Clearance Completion Notifications
**Trigger**: When all signatories approve a clearance form
**Recipients**: Student who submitted the clearance
**Notification Types**:
- System notification: "Clearance Completed" congratulatory message
- Email: Completion certificate and next steps
- Browser: Success celebration notification

**Function**: `NotificationService.notify_clearance_completed()`
**Location**: `landing/notification_service.py:536`

### 5. Document Ready Notifications
**Trigger**: When requested documents are ready for release
**Recipients**: Student who requested the document
**Notification Types**:
- System notification: "Document Ready" with pickup instructions
- Email: Ready notification with office hours
- Browser: Pickup reminder notification

**Function**: `NotificationService.notify_document_ready()`
**Location**: `landing/notification_service.py:559`

### 6. Report Generation Notifications
**Trigger**: When weekly reports are automatically generated
**Recipients**: All signatories, business managers, and registrars
**Notification Types**:
- System notification: "New Report Generated" with download link
- Email: Report availability notification
- Browser: None (reports are scheduled)

**Function**: `NotificationService.notify_report_generated()`
**Location**: `landing/notification_service.py:583`

### 7. Pending Count Refresh Notifications
**Trigger**: After any form status change
**Recipients**: All relevant signatories
**Notification Types**:
- System notification: Updates pending form counts in real-time
- Email: None
- Browser: None (count updates are automatic)

**Function**: `NotificationService.refresh_all_pending_counts()`
**Location**: `landing/notification_service.py:276`

### 8. Automatic Disapproval Notification Recovery
**Trigger**: When Clearon
**Recipients**: Student affectanceSignatory model detects a disapproval without notificatied by the disapproval
**Notification Types**:
- System notification: Missed disapproval notification
- Email: Disapproval details
- Browser: Recovery alert

**Function**: `NotificationService.ensure_disapproval_notification()`
**Location**: `landing/notification_service.py:514` (fixed version)

## Browser Notification System

### Implementation
**Location**: `static/js/browser-notifications.js`
**API Endpoints**: 
- `/api/browser-notifications/` - Get pending browser notifications
- `/api/mark-browser-notification-shown/` - Mark notifications as read

### Features
- **Permission Management**: Automatic permission request on first use
- **Real-time Polling**: Checks for new notifications every 30 seconds
- **Smart Navigation**: Clicks navigate to relevant dashboard tabs
- **Auto-dismiss**: Notifications close automatically after 10 seconds
- **Interactive Actions**: View/Dismiss action buttons

### Browser Notification Types
1. **Success Notifications** (Green): Form approvals, completions
2. **Warning Notifications** (Yellow): Form disapprovals, urgent actions needed
3. **Info Notifications** (Blue): General updates, document ready

### Usage
```javascript
// Test browser notifications
window.browserNotifications.showTestNotification();

// Check if browser notifications are supported
console.log(window.browserNotifications.isSupported);
```

## Email Notification System

### Email Types
1. **Form Submission Emails**: Sent to signatories when forms are submitted
2. **Approval Emails**: Sent to students when forms are approved
3. **Disapproval Emails**: Sent to students with settlement instructions
4. **Document Ready Emails**: Sent when documents are ready for pickup
5. **Report Generation Emails**: Sent when weekly reports are available

### Email Templates
**Location**: `templates/emails/`
- `form_approval_email.html`
- `form_disapproval_email.html`  
- `document_ready_email.html`
- `report_generation_email.html`

### Email Preferences
Users can control email notifications through `NotificationPreference` model:
- `email_on_form_approved`
- `email_on_form_disapproved`
- `email_on_document_ready`
- `email_on_clearance_completed`

## System Notification Features

### Notification Model Fields
- `title`: Brief notification title
- `message`: Detailed notification content
- `notification_type`: Category (form_approved, form_disapproved, etc.)
- `priority`: urgent, high, normal, low
- `is_read`: Read status
- `action_required`: Whether user action is needed
- `action_deadline`: Deadline for required actions
- `form_type`: Associated form type (clearance, enrollment, graduation)
- `form_id`: Associated form ID for navigation
- `extra_data`: JSON field for additional metadata

### Real-time Updates
- Automatic pending count updates
- Live notification badge updates
- Real-time status synchronization across browser tabs

## Notification API Endpoints

### Standard Notifications
- `GET /api/notifications/` - Get user notifications
- `GET /api/notifications/enhanced/` - Enhanced notifications with filtering
- `GET /api/notifications/stats/` - Notification statistics
- `POST /api/notifications/<id>/read/` - Mark notification as read
- `POST /api/notifications/mark-all-read/` - Mark all notifications as read

### Browser Notifications (New)
- `GET /api/browser-notifications/` - Get pending browser notifications
- `POST /api/mark-browser-notification-shown/` - Mark browser notification as shown

### Notification Preferences
- `GET/POST /api/notifications/preferences/` - Manage notification preferences

## Testing Browser Notifications

### Enable Browser Notifications
1. Visit any dashboard page
2. Browser will automatically request notification permission
3. Click "Allow" when prompted
4. Test with: `window.browserNotifications.showTestNotification()`

### Test Real Notifications
1. Log in as a student and submit a form
2. Log in as a signatory and approve/disapprove the form
3. Student should receive instant browser notification
4. Check notification appears in top-right corner
5. Click notification to navigate to relevant dashboard section

## Error Handling and Logging

### System Logs
All notification events are logged in Django logs with the following format:
- INFO: Successful notifications
- ERROR: Failed notifications with full traceback
- WARNING: Missing permissions or configuration issues

### Common Issues
1. **Email Failures**: SMTP configuration, user email validity
2. **Browser Permission**: User denied notification permission
3. **Database Errors**: Notification model constraint violations
4. **Template Errors**: Missing email templates

### Debugging
```python
# Enable debug logging for notifications
import logging
logging.getLogger('landing.notification_service').setLevel(logging.DEBUG)

# Test notification service directly
from landing.notification_service import NotificationService
NotificationService.send_browser_notification(user, "Test", "Test message", "info")
```

## Performance Considerations

### Notification Batching
- Multiple notifications are batched in single database transactions
- Email sending is queued to prevent blocking
- Browser notifications use efficient polling (30-second intervals)

### Database Optimization
- Proper indexing on notification queries
- Automatic cleanup of old notifications
- Efficient pending count calculations

### Memory Management
- Browser notification cleanup after display
- Automatic disposal of completed notification instances
- Periodic cleanup of notification event listeners

## Security Features

### Data Protection
- User notifications are isolated by user permissions
- Email content sanitized to prevent XSS
- Browser notification content filtered for sensitive data

### Access Control
- API endpoints require authentication
- Notification access limited to notification owner
- Admin notifications have elevated access controls

### Privacy
- Email addresses never exposed in browser notifications
- Sensitive form data redacted in notifications
- User preferences respected for all notification types