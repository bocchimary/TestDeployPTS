from django.core.management.base import BaseCommand
from landing.notification_service import NotificationService
from landing.models import EnrollmentForm
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()

class Command(BaseCommand):
    help = 'Test notification system'

    def handle(self, *args, **options):
        self.stdout.write('Testing notification system...')
        
        # Test 1: Check if we can create a basic notification
        try:
            admin_user = User.objects.filter(user_type='admin').first()
            if admin_user:
                NotificationService.create_notification(
                    user=admin_user,
                    notification_type='test_notification',
                    title='Test Notification',
                    message='This is a test notification',
                    form_type='enrollment',
                    priority='medium'
                )
                self.stdout.write(self.style.SUCCESS('SUCCESS: Basic notification creation works'))
            else:
                self.stdout.write(self.style.ERROR('ERROR: No admin user found'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'ERROR: Basic notification creation failed: {str(e)}'))
        
        # Test 2: Check form submission notification
        try:
            # Get the latest enrollment form
            enrollment_form = EnrollmentForm.objects.filter(status='pending').first()
            if enrollment_form:
                self.stdout.write(f'Found enrollment form: {enrollment_form.id}')
                NotificationService.notify_form_submission(enrollment_form, 'enrollment')
                self.stdout.write(self.style.SUCCESS('SUCCESS: Form submission notification works'))
            else:
                self.stdout.write(self.style.WARNING('WARNING: No pending enrollment form found'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'ERROR: Form submission notification failed: {str(e)}'))
        
        # Test 3: Check pending count for users
        try:
            admin_users = User.objects.filter(user_type='admin')
            business_managers = User.objects.filter(
                models.Q(user_type='business_manager') |
                (models.Q(user_type='signatory') & 
                 models.Q(signatory_profile__signatory_type='business_manager'))
            )
            
            for user in admin_users:
                NotificationService.update_pending_count_notification(
                    user=user,
                    form_type='enrollment', 
                    signatory_type='admin'
                )
                self.stdout.write(f'SUCCESS: Updated pending count for admin: {user.username}')
            
            for user in business_managers:
                NotificationService.update_pending_count_notification(
                    user=user,
                    form_type='enrollment', 
                    signatory_type='business_manager'
                )
                self.stdout.write(f'SUCCESS: Updated pending count for business manager: {user.username}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'ERROR: Pending count update failed: {str(e)}'))
        
        self.stdout.write('Test completed')