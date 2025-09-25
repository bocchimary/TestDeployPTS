#!/usr/bin/env python3
"""
Test script for email notification system
"""

import os
import sys
import django

# Add project directory to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.contrib.auth import get_user_model
from landing.notification_service import NotificationService
from landing.models import NotificationTemplate, NotificationPreference
from django.core.mail import send_mail
from django.conf import settings

User = get_user_model()

def test_email_backend():
    """Test if Django email backend is working"""
    print("=" * 60)
    print("TESTING EMAIL BACKEND")
    print("=" * 60)
    
    print(f"Email Backend: {settings.EMAIL_BACKEND}")
    print(f"Default From Email: {settings.DEFAULT_FROM_EMAIL}")
    
    try:
        from django.core.mail import send_mail
        send_mail(
            'Test Email',
            'This is a test email from the clearance system.',
            settings.DEFAULT_FROM_EMAIL,
            ['test@example.com'],
            fail_silently=False,
        )
        print("Email sent successfully using Django's mail system")
        return True
    except Exception as e:
        print(f"Failed to send test email: {str(e)}")
        return False

def check_notification_templates():
    """Check if notification email templates exist"""
    print("\n" + "=" * 60)
    print("CHECKING NOTIFICATION TEMPLATES")
    print("=" * 60)
    
    templates = NotificationTemplate.objects.filter(is_active=True)
    
    if templates.exists():
        print(f"Found {templates.count()} active notification templates:")
        for template in templates:
            print(f"  - {template.template_type}: {template.get_template_type_display()}")
    else:
        print("No notification templates found")
        print("Creating default templates...")
        create_default_templates()

def create_default_templates():
    """Create basic email templates for testing"""
    templates_data = [
        {
            'template_type': 'form_approved',
            'email_subject': 'Form Approved - {form_type}',
            'email_template': '''
Dear {user_name},

Your {form_type} form has been approved.

{notification_message}

Best regards,
Educational Institution System
            '''
        },
        {
            'template_type': 'form_disapproved',
            'email_subject': 'Action Required - {form_type} Form Disapproved',
            'email_template': '''
Dear {user_name},

Your {form_type} form has been disapproved.

{notification_message}

Please log in to your account for more details.

Best regards,
Educational Institution System
            '''
        },
        {
            'template_type': 'document_ready',
            'email_subject': 'Document Ready for Collection',
            'email_template': '''
Dear {user_name},

{notification_message}

Please visit the registrar's office to collect your document.

Best regards,
Educational Institution System
            '''
        }
    ]
    
    for template_data in templates_data:
        template, created = NotificationTemplate.objects.get_or_create(
            template_type=template_data['template_type'],
            defaults=template_data
        )
        if created:
            print(f"Created template: {template.get_template_type_display()}")
        else:
            print(f"Template already exists: {template.get_template_type_display()}")

def test_notification_creation():
    """Test notification creation and email sending"""
    print("\n" + "=" * 60)
    print("TESTING NOTIFICATION CREATION")
    print("=" * 60)
    
    # Find a test user (preferably a student)
    test_user = User.objects.filter(user_type='student').first()
    
    if not test_user:
        print("No student users found for testing")
        return False
        
    print(f"Using test user: {test_user.username} ({test_user.email or 'No email'})")
    
    # Create notification preference if doesn't exist
    prefs, created = NotificationPreference.objects.get_or_create(
        user=test_user,
        defaults={
            'email_on_form_approved': True,
            'email_on_form_disapproved': True,
            'email_on_document_ready': True,
            'email_on_clearance_completed': True,
            'email_daily_digest': True
        }
    )
    
    if created:
        print("Created notification preferences for test user")
    else:
        print("Using existing notification preferences")
    
    # Test creating a notification
    try:
        notification = NotificationService.create_notification(
            user=test_user,
            notification_type='form_approved',
            title='Test Notification',
            message='This is a test notification to verify the email system is working.',
            form_type='clearance',
            send_email=True
        )
        
        print(f"Created notification: {notification.id}")
        print(f"  - Email sent: {notification.email_sent}")
        print(f"  - Email sent at: {notification.email_sent_at}")
        
        return True
        
    except Exception as e:
        print(f"Failed to create notification: {str(e)}")
        return False

def check_email_events():
    """Document the events that trigger email notifications"""
    print("\n" + "=" * 60)
    print("EMAIL NOTIFICATION TRIGGER EVENTS")
    print("=" * 60)
    
    events = [
        "Form Submission Events:",
        "  - Clearance form submitted (notifies all 10 signatory types)",
        "  - Enrollment form submitted (notifies business manager & registrar)",
        "  - Graduation form submitted (notifies business manager & registrar)",
        "  - Document request submitted (notifies business manager & registrar)",
        "",
        "Approval Events:",
        "  - Individual signatory approves clearance (notifies student)",
        "  - All signatories approve clearance (notifies student - clearance complete)",
        "  - Business manager/registrar approves enrollment/graduation (notifies student)",
        "",
        "Disapproval Events:",
        "  - Signatory disapproves clearance (notifies student with settlement period)",
        "  - Business manager disapproves enrollment/graduation (notifies student)",
        "",
        "Document Events:",
        "  - Document ready for release (notifies student)",
        "  - Document released (notifies student)",
        "",
        "System Events:",
        "  - Weekly reports generated (notifies signatories & admins)",
        "  - Daily digest emails (configurable per user)",
        "",
        "User Preference Settings:",
        "  - Users can enable/disable emails for each event type",
        "  - Daily digest frequency can be configured",
        "  - Email preferences stored in NotificationPreference model"
    ]
    
    for event in events:
        print(event)

def main():
    """Main test function"""
    print("AUTOMATED EMAIL NOTIFICATION SYSTEM TEST")
    print("=" * 60)
    
    # Test email backend
    email_works = test_email_backend()
    
    # Check templates
    check_notification_templates()
    
    # Test notification creation
    if email_works:
        test_notification_creation()
    
    # Document trigger events
    check_email_events()
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Email Backend: {'Working' if email_works else 'Failed'}")
    print(f"Email Mode: Console output (development)")
    print(f"Templates: {'Available' if NotificationTemplate.objects.exists() else 'Missing'}")
    print("For production: Configure SMTP settings in settings.py")

if __name__ == '__main__':
    main()