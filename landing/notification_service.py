"""
Comprehensive Notification Service for Educational Institution Clearance System
Handles in-app notifications, email notifications, and daily digests
"""

import logging
from datetime import datetime, timedelta
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from django.db.models import Q, Count
from django.contrib.auth import get_user_model
from typing import List, Dict, Optional, Any

from .models import (
    Notification, NotificationTemplate, EmailNotificationLog, 
    NotificationPreference, ClearanceForm, EnrollmentForm, 
    GraduationForm, DocumentRequest, SignatoryProfile, User
)

logger = logging.getLogger(__name__)


class NotificationService:
    """Core notification service for managing all types of notifications"""
    
    @staticmethod
    def create_notification(
        user: User,
        notification_type: str,
        title: str,
        message: str,
        priority: str = 'medium',
        form_type: Optional[str] = None,
        form_id: Optional[str] = None,
        action_required: bool = False,
        action_deadline: Optional[datetime] = None,
        settlement_period: Optional[timedelta] = None,
        extra_data: Optional[Dict[str, Any]] = None,
        send_email: bool = True
    ) -> Notification:
        """Create a new notification and optionally send email"""
        
        # Create the notification
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            priority=priority,
            title=title,
            message=message,
            form_type=form_type,
            form_id=form_id,
            action_required=action_required,
            action_deadline=action_deadline,
            settlement_period=settlement_period,
            extra_data=extra_data or {}
        )
        
        # Send email notification if requested and user preferences allow
        if send_email:
            NotificationService.send_email_notification(notification)
        
        logger.info(f"Created notification {notification.id} for user {user.username}")
        return notification
    
    @staticmethod
    def send_email_notification(notification: Notification) -> bool:
        """Send email notification based on user preferences"""
        try:
            user = notification.user
            
            # Get user preferences (create default if doesn't exist)
            prefs, created = NotificationPreference.objects.get_or_create(
                user=user,
                defaults={'email_daily_digest': True}
            )
            
            # Check if user wants email for this notification type
            should_send_email = NotificationService._should_send_email(notification, prefs)
            
            if not should_send_email or not user.email:
                return False
            
            # Get email template
            template = NotificationService._get_email_template(notification.notification_type)
            if not template:
                logger.warning(f"No email template found for {notification.notification_type}")
                return False
            
            # Prepare context data
            context = NotificationService._prepare_email_context(notification)
            
            # Render email content
            subject = template.email_subject.format(**context)
            html_content = template.email_template.format(**context)
            
            # Create email log entry
            email_log = EmailNotificationLog.objects.create(
                user=user,
                notification=notification,
                email_type=notification.notification_type,
                recipient_email=user.email,
                subject=subject,
                content=html_content
            )
            
            # Send email
            email = EmailMultiAlternatives(
                subject=subject,
                body=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            
            # Update logs
            email_log.status = 'sent'
            email_log.sent_at = timezone.now()
            email_log.save()
            
            notification.email_sent = True
            notification.email_sent_at = timezone.now()
            notification.save()
            
            logger.info(f"Email sent successfully for notification {notification.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email for notification {notification.id}: {str(e)}")
            # Update email log with error
            if 'email_log' in locals():
                email_log.status = 'failed'
                email_log.error_message = str(e)
                email_log.attempts += 1
                email_log.save()
            return False
    
    @staticmethod
    def _should_send_email(notification: Notification, prefs: NotificationPreference) -> bool:
        """Check if email should be sent based on notification type and user preferences"""
        mapping = {
            'form_approved': prefs.email_on_form_approved,
            'form_disapproved': prefs.email_on_form_disapproved,
            'document_ready': prefs.email_on_document_ready,
            'document_released': prefs.email_on_document_ready,
            'clearance_completed': prefs.email_on_clearance_completed,
            'enrollment_completed': prefs.email_on_enrollment_completed,
            'graduation_completed': prefs.email_on_graduation_completed,
        }
        return mapping.get(notification.notification_type, True)
    
    @staticmethod
    def _get_email_template(notification_type: str) -> Optional[NotificationTemplate]:
        """Get email template for notification type"""
        try:
            return NotificationTemplate.objects.get(
                template_type=notification_type,
                is_active=True
            )
        except NotificationTemplate.DoesNotExist:
            return None
    
    @staticmethod
    def _prepare_email_context(notification: Notification) -> Dict[str, Any]:
        """Prepare context data for email template"""
        context = {
            'user_name': notification.user.full_name,
            'notification_title': notification.title,
            'notification_message': notification.message,
            'created_at': notification.created_at,
            'priority': notification.get_priority_display(),
            'action_required': notification.action_required,
            'form_type': notification.form_type.title() if notification.form_type else 'Form',
        }
        
        if notification.action_deadline:
            context['action_deadline'] = notification.action_deadline
        
        if notification.settlement_period:
            context['settlement_period'] = notification.settlement_period
        
        if notification.extra_data:
            context.update(notification.extra_data)
            
        return context
    
    @staticmethod
    def update_pending_count_notification(user: User, form_type: str, signatory_type: str = None):
        """Create or update a pending count notification for a user"""
        from .models import ClearanceSignatory, EnrollmentForm, GraduationForm, DocumentRequest
        
        try:
            # Calculate pending count based on form type and user role
            pending_count = 0
            
            if form_type == 'clearance':
                # For both signatories and admins, count pending clearances assigned to them
                pending_count = ClearanceSignatory.objects.filter(
                    signatory=user,
                    status='pending',
                    clearance__status='pending'
                ).count()
            
            elif form_type in ['enrollment', 'graduation']:
                # Count pending forms assigned to this specific user
                if form_type == 'enrollment':
                    from .models import EnrollmentSignatory
                    pending_count = EnrollmentSignatory.objects.filter(
                        signatory=user,
                        status='pending',
                        enrollment__status='pending'
                    ).count()
                else:
                    from .models import GraduationSignatory
                    pending_count = GraduationSignatory.objects.filter(
                        signatory=user,
                        status='pending',
                        graduation__status='pending'
                    ).count()
            
            elif form_type == 'document_request':
                # Count pending document requests for admin/registrar/business_manager users
                if user.user_type in ['admin', 'registrar', 'business_manager']:
                    pending_count = DocumentRequest.objects.filter(
                        status='pending'
                    ).count()
            
            # Only create/update notification if there are pending forms
            if pending_count > 0:
                notification_type = f'pending_{form_type}_count'
                
                # Handle different form types for better messaging
                if form_type == 'document_request':
                    title = "Pending Document Requests"
                    if pending_count == 1:
                        message = f"You have {pending_count} newly submitted document request that needs processing."
                    else:
                        message = f"You have {pending_count} newly submitted document requests that need processing."
                else:
                    title = f"Pending {form_type.title()} Forms"
                    if pending_count == 1:
                        message = f"You have {pending_count} pending {form_type} form that needs your attention."
                    else:
                        message = f"You have {pending_count} pending {form_type} forms that need your attention."
                
                # Check if a similar notification already exists
                from .models import Notification
                existing_notification = Notification.objects.filter(
                    user=user,
                    notification_type=notification_type,
                    is_read=False
                ).first()
                
                if existing_notification:
                    # Update existing notification
                    existing_notification.title = title
                    existing_notification.message = message
                    existing_notification.form_type = form_type  # Ensure form_type is set
                    existing_notification.updated_at = timezone.now()
                    existing_notification.extra_data = {
                        'pending_count': pending_count,
                        'form_type': form_type,
                        'signatory_type': signatory_type or 'admin'
                    }
                    existing_notification.save()
                else:
                    # Create new notification
                    NotificationService.create_notification(
                        user=user,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                        priority='medium',
                        form_type=form_type,  # Add this so navigation works
                        form_id=None,  # No specific form ID for count notifications
                        extra_data={
                            'pending_count': pending_count,
                            'form_type': form_type,
                            'signatory_type': signatory_type or 'admin'
                        },
                        send_email=False  # Don't send emails for count notifications
                    )
            else:
                # Remove any existing pending count notifications if count is 0
                from .models import Notification
                Notification.objects.filter(
                    user=user,
                    notification_type=f'pending_{form_type}_count',
                    is_read=False
                ).delete()
                
        except Exception as e:
            logger.error(f"Error updating pending count notification: {str(e)}")
    
    @staticmethod
    def refresh_all_pending_counts():
        """Refresh pending count notifications for all relevant users"""
        try:
            # Get all signatory users
            signatory_users = User.objects.filter(user_type='signatory').select_related('signatory_profile')
            
            for user in signatory_users:
                if hasattr(user, 'signatory_profile'):
                    signatory_type = user.signatory_profile.signatory_type
                    NotificationService.update_pending_count_notification(
                        user=user,
                        form_type='clearance',
                        signatory_type=signatory_type
                    )
            
            # Get all admin users
            admin_users = User.objects.filter(user_type='admin')
            for user in admin_users:
                NotificationService.update_pending_count_notification(
                    user=user,
                    form_type='clearance',
                    signatory_type='admin'
                )
                
            # Update for enrollment and graduation forms
            business_managers = User.objects.filter(user_type='business_manager')
            for user in business_managers:
                NotificationService.update_pending_count_notification(
                    user=user,
                    form_type='enrollment'
                )
                NotificationService.update_pending_count_notification(
                    user=user,
                    form_type='graduation'
                )
                
        except Exception as e:
            logger.error(f"Error refreshing all pending counts: {str(e)}")
    
    @staticmethod
    def notify_form_submission(form_instance, form_type: str):
        """Update pending form count notifications for relevant signatories"""
        try:
            if form_type == 'clearance':
                # Update notifications for all signatory types for clearance
                signatory_types = [
                    'dorm_supervisor', 'canteen_concessionaire', 'library_director',
                    'scholarship_director', 'it_director', 'student_affairs',
                    'cashier', 'business_manager', 'registrar', 'academic_dean'
                ]
                
                for signatory_type in signatory_types:
                    signatories = User.objects.filter(
                        user_type='signatory',
                        signatory_profile__signatory_type=signatory_type
                    )
                    
                    for signatory in signatories:
                        NotificationService.update_pending_count_notification(
                            user=signatory,
                            form_type=form_type,
                            signatory_type=signatory_type
                        )
                
                # Also update notifications for admin users (registrars/admin) for clearance forms
                admin_users = User.objects.filter(user_type='admin')
                for admin_user in admin_users:
                    NotificationService.update_pending_count_notification(
                        user=admin_user,
                        form_type=form_type,
                        signatory_type='admin'
                    )
            
            elif form_type in ['enrollment', 'graduation']:
                # Define required signatory types based on form type
                if form_type == 'enrollment':
                    required_signatory_types = ['academic_dean', 'business_manager', 'registrar']
                else:  # graduation
                    required_signatory_types = ['academic_dean', 'business_manager', 'registrar', 'president']
                
                # Update notifications for each required signatory type
                for signatory_type in required_signatory_types:
                    if signatory_type == 'registrar':
                        # For registrar, notify admin users
                        users = User.objects.filter(user_type='admin')
                        for user in users:
                            NotificationService.update_pending_count_notification(
                                user=user,
                                form_type=form_type,
                                signatory_type='admin'  # Admin users handle registrar role
                            )
                    else:
                        # For other signatory types, find users with that signatory profile
                        users = User.objects.filter(
                            user_type='signatory',
                            signatory_profile__signatory_type=signatory_type
                        )
                        for user in users:
                            NotificationService.update_pending_count_notification(
                                user=user,
                                form_type=form_type,
                                signatory_type=signatory_type
                            )
                
                # Also notify business_manager user type (not just signatory profile)
                business_manager_users = User.objects.filter(user_type='business_manager')
                for user in business_manager_users:
                    NotificationService.update_pending_count_notification(
                        user=user,
                        form_type=form_type,
                        signatory_type='business_manager'
                    )
            
            elif form_type == 'document_request':
                # Update pending count notifications for admin/registrar/business_manager users
                target_users = User.objects.filter(
                    user_type__in=['admin', 'registrar', 'business_manager']
                )
                
                for user in target_users:
                    NotificationService.update_pending_count_notification(
                        user=user,
                        form_type='document_request',
                        signatory_type='business_manager' if user.user_type == 'business_manager' else 'admin'
                    )
                    
        except Exception as e:
            logger.error(f"Error notifying form submission: {str(e)}")
    
    @staticmethod
    def notify_form_approval(form_instance, form_type: str, signatory_user: User, remarks: str = ""):
        """Notify student about form approval"""
        try:
            student = None
            if form_type == 'clearance':
                student = form_instance.student
            elif form_type in ['enrollment', 'graduation']:
                student = form_instance.user
            elif form_type == 'document_request':
                student = form_instance.requester
            
            if student:
                signatory_name = signatory_user.full_name
                # Get signatory role based on user type
                if signatory_user.user_type == 'registrar':
                    signatory_role = 'Registrar'
                elif signatory_user.user_type == 'business_manager':
                    signatory_role = 'Business Manager'
                elif hasattr(signatory_user, 'signatory_profile') and signatory_user.signatory_profile:
                    signatory_role = getattr(signatory_user.signatory_profile, 'get_signatory_type_display', lambda: 'Signatory')()
                else:
                    signatory_role = signatory_user.user_type.replace('_', ' ').title()
                
                message = f"Your {form_type} form has been approved by {signatory_name} ({signatory_role})."
                if remarks:
                    message += f"\n\nRemarks: {remarks}"
                
                NotificationService.create_notification(
                    user=student,
                    notification_type='form_approved',
                    title=f"{form_type.title()} Form Approved",
                    message=message,
                    priority='high',
                    form_type=form_type,
                    form_id=str(form_instance.id),
                    extra_data={
                        'signatory_name': signatory_name,
                        'signatory_role': signatory_role,
                        'remarks': remarks
                    }
                )
            
            # Refresh pending count notifications for all users
            try:
                NotificationService.refresh_all_pending_counts()
            except Exception as e:
                logger.error(f"Error refreshing pending counts after approval: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error notifying form approval: {str(e)}")
    
    @staticmethod
    def notify_form_disapproval(form_instance, form_type: str, signatory_user: User, remarks: str, settlement_days: int = 7):
        """Notify student about form disapproval with settlement period"""
        try:
            student = None
            if form_type == 'clearance':
                student = form_instance.student
            elif form_type in ['enrollment', 'graduation']:
                student = form_instance.user
            elif form_type == 'document_request':
                student = form_instance.requester
            
            if student:
                signatory_name = signatory_user.full_name
                # Get signatory role based on user type
                if signatory_user.user_type == 'registrar':
                    signatory_role = 'Registrar'
                elif signatory_user.user_type == 'business_manager':
                    signatory_role = 'Business Manager'
                elif hasattr(signatory_user, 'signatory_profile') and signatory_user.signatory_profile:
                    signatory_role = getattr(signatory_user.signatory_profile, 'get_signatory_type_display', lambda: 'Signatory')()
                else:
                    signatory_role = signatory_user.user_type.replace('_', ' ').title()
                
                settlement_deadline = timezone.now() + timedelta(days=settlement_days)
                settlement_period = timedelta(days=settlement_days)
                
                message = f"Your {form_type} form has been disapproved by {signatory_name} ({signatory_role})."
                message += f"\n\nReason: {remarks}"
                message += f"\n\nYou have {settlement_days} days to resolve this issue. Deadline: {settlement_deadline.strftime('%B %d, %Y at %I:%M %p')}"
                
                NotificationService.create_notification(
                    user=student,
                    notification_type='form_disapproved',
                    title=f"{form_type.title()} Form Disapproved",
                    message=message,
                    priority='urgent',
                    form_type=form_type,
                    form_id=str(form_instance.id),
                    action_required=True,
                    action_deadline=settlement_deadline,
                    settlement_period=settlement_period,
                    extra_data={
                        'signatory_name': signatory_name,
                        'signatory_role': signatory_role,
                        'disapproval_reason': remarks,
                        'settlement_days': settlement_days
                    }
                )
                
        except Exception as e:
            logger.error(f"Error notifying form disapproval: {str(e)}")
    
    @staticmethod
    def ensure_disapproval_notification(clearance_signatory_record):
        """Ensure disapproval notification is sent for any clearance signatory disapproval"""
        try:
            if clearance_signatory_record.status == 'disapproved':
                clearance = clearance_signatory_record.clearance
                student = clearance.student
                signatory = clearance_signatory_record.signatory
                
                # Check if notification already exists for this specific disapproval
                # Look for notifications that mention this signatory or role specifically
                existing_notification = Notification.objects.filter(
                    user=student,
                    notification_type='form_disapproved',
                    form_type='clearance',
                    form_id=str(clearance.id),
                    created_at__gte=clearance_signatory_record.updated_at - timedelta(minutes=10),
                    created_at__lte=clearance_signatory_record.updated_at + timedelta(minutes=10)
                ).filter(
                    # Check if message contains this signatory's name or role
                    Q(message__icontains=signatory.full_name) |
                    Q(message__icontains=clearance_signatory_record.role)
                ).exists()
                
                if not existing_notification:
                    logger.info(f"Creating missing disapproval notification for {student.username} from {signatory.full_name} ({clearance_signatory_record.role})")
                    NotificationService.notify_form_disapproval(
                        form_instance=clearance,
                        form_type='clearance',
                        signatory_user=signatory,
                        remarks=clearance_signatory_record.remarks or clearance_signatory_record.comment or f'{clearance_signatory_record.role} disapproval',
                        settlement_days=7
                    )
                else:
                    logger.info(f"Disapproval notification already exists for {student.username} from {signatory.full_name}")
                    
        except Exception as e:
            logger.error(f"Error ensuring disapproval notification: {str(e)}")
    
    @staticmethod
    def send_browser_notification(user: User, title: str, message: str, notification_type: str = 'info'):
        """Send browser notification to user if they're online"""
        try:
            # This will be handled by JavaScript on the frontend
            # We'll store the notification with a special flag for browser push
            NotificationService.create_notification(
                user=user,
                notification_type=f'{notification_type}_browser',
                title=title,
                message=message,
                priority='urgent',
                extra_data={
                    'browser_notification': True,
                    'icon': '/static/images/logo.png',
                    'timestamp': timezone.now().isoformat()
                }
            )
            logger.info(f"Browser notification queued for {user.username}: {title}")
        except Exception as e:
            logger.error(f"Error queueing browser notification: {str(e)}")
    
    @staticmethod
    def notify_clearance_completed(student: User, form_type: str, form_instance=None):
        """Notify student when all signatories have approved their clearance"""
        try:
            message = f"Congratulations! All signatories have approved your {form_type} clearance. "
            message += "Your clearance is now complete and ready for processing."
            
            NotificationService.create_notification(
                user=student,
                notification_type='clearance_completed',
                title=f"{form_type.title()} Clearance Completed",
                message=message,
                priority='high',
                form_type=form_type,
                form_id=str(form_instance.id) if form_instance else None,
                extra_data={
                    'completion_date': timezone.now().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Error notifying clearance completion: {str(e)}")
    
    @staticmethod
    def notify_enrollment_completed(student: User, form_instance=None):
        """Notify student when all signatories have approved their enrollment"""
        try:
            message = f"Congratulations! All required signatories have approved your enrollment form. "
            message += "Your enrollment is now complete and ready for processing."
            
            NotificationService.create_notification(
                user=student,
                notification_type='enrollment_completed',
                title="Enrollment Form Completed",
                message=message,
                priority='high',
                form_type='enrollment',
                form_id=str(form_instance.id) if form_instance else None,
                extra_data={
                    'completion_date': timezone.now().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Error notifying enrollment completion: {str(e)}")
    
    @staticmethod
    def notify_graduation_completed(student: User, form_instance=None):
        """Notify student when all signatories have approved their graduation"""
        try:
            message = f"Congratulations! All required signatories have approved your graduation form. "
            message += "Your graduation is now complete and ready for processing."
            
            NotificationService.create_notification(
                user=student,
                notification_type='graduation_completed',
                title="Graduation Form Completed",
                message=message,
                priority='high',
                form_type='graduation',
                form_id=str(form_instance.id) if form_instance else None,
                extra_data={
                    'completion_date': timezone.now().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Error notifying graduation completion: {str(e)}")
    
    @staticmethod
    def notify_admin_form_completed(form_type: str, student_name: str):
        """Update bulk completed forms notification instead of individual notifications"""
        try:
            # Get all admin and registrar users
            admin_users = User.objects.filter(user_type__in=['admin', 'registrar'])
            
            for admin_user in admin_users:
                # Update the bulk completed forms notification for this user
                NotificationService.update_bulk_completed_notification(
                    user=admin_user,
                    form_type=form_type,
                    student_name=student_name
                )
            
        except Exception as e:
            logger.error(f"Error notifying admin form completion: {str(e)}")
    
    @staticmethod
    def update_bulk_completed_notification(user: User, form_type: str, student_name: str):
        """Update bulk completed forms notification for admin users"""
        try:
            from datetime import timedelta
            from .models import Notification
            
            # Find the last bulk notification for this user to count only new completions
            notification_type = f'bulk_{form_type}_completed'
            last_notification = Notification.objects.filter(
                user=user,
                notification_type=notification_type
            ).order_by('-created_at').first()
            
            # If there's a previous notification, count forms completed since then
            # Otherwise, count forms completed in the last hour
            if last_notification:
                since_time = last_notification.created_at
            else:
                since_time = timezone.now() - timedelta(hours=1)
            
            # Get count of newly completed forms since last notification
            new_completed_count = 0
            
            if form_type == 'clearance':
                from .models import ClearanceForm
                new_completed_count = ClearanceForm.objects.filter(
                    status='completed',
                    updated_at__gte=since_time
                ).count()
            elif form_type == 'enrollment':
                from .models import EnrollmentForm
                new_completed_count = EnrollmentForm.objects.filter(
                    status='approved',
                    updated_at__gte=since_time
                ).count()
            elif form_type == 'graduation':
                from .models import GraduationForm
                new_completed_count = GraduationForm.objects.filter(
                    status='approved',
                    updated_at__gte=since_time
                ).count()
            
            if new_completed_count > 0:
                # Check if there's an existing unread bulk notification for this form type
                existing_notification = Notification.objects.filter(
                    user=user,
                    notification_type=notification_type,
                    is_read=False
                ).first()
                
                if existing_notification:
                    # Update the existing notification with the new count
                    current_count = existing_notification.extra_data.get('total_completed', 0)
                    updated_count = current_count + 1  # Add this new completion
                    
                    if updated_count == 1:
                        title = f"1 {form_type} form completed"
                        message = f"1 {form_type} form has been completed and got all required approvals."
                    else:
                        title = f"{updated_count} {form_type} forms completed"
                        message = f"{updated_count} {form_type} forms have been completed and got all required approvals."
                    
                    existing_notification.title = title
                    existing_notification.message = message
                    existing_notification.updated_at = timezone.now()
                    existing_notification.extra_data = {
                        'total_completed': updated_count,
                        'latest_student': student_name,
                        'form_type': form_type,  # Store form type for redirection
                        'last_updated': timezone.now().isoformat()
                    }
                    existing_notification.save()
                else:
                    # Create new bulk notification with proper form_type for redirection
                    title = f"1 {form_type} form completed"
                    message = f"1 {form_type} form has been completed and got all required approvals."
                    
                    NotificationService.create_notification(
                        user=user,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                        priority='medium',
                        form_type=form_type,  # Set form_type for proper redirection
                        extra_data={
                            'total_completed': 1,
                            'latest_student': student_name,
                            'form_type': form_type,  # Store form type for redirection
                            'created_at': timezone.now().isoformat()
                        },
                        send_email=False  # Don't send emails for bulk notifications
                    )
                    
        except Exception as e:
            logger.error(f"Error updating bulk completed notification: {str(e)}")
    
    @staticmethod
    def notify_document_ready(student: User, document_request):
        """Notify student when their requested document is ready for release"""
        try:
            message = f"Your requested document ({document_request.document_type}) is now ready for release. "
            message += "Please visit the registrar's office to collect your document."
            
            # Add release date if available
            if document_request.preferred_release:
                message += f"\n\nRelease Date: {document_request.preferred_release.strftime('%B %d, %Y')}"
            
            NotificationService.create_notification(
                user=student,
                notification_type='document_ready',
                title="Document Ready for Release",
                message=message,
                priority='high',
                form_type='document_request',
                form_id=str(document_request.id),
                extra_data={
                    'document_type': document_request.document_type,
                    'request_date': document_request.created_at.isoformat(),
                    'release_date': document_request.preferred_release.isoformat() if document_request.preferred_release else None
                }
            )
            
        except Exception as e:
            logger.error(f"Error notifying document ready: {str(e)}")
    
    @staticmethod
    def notify_report_generated(report_instance):
        """Notify relevant users about generated reports"""
        try:
            # Notify all signatories and admins about new reports
            target_users = User.objects.filter(
                user_type__in=['signatory', 'admin', 'business_manager']
            )
            
            for user in target_users:
                NotificationService.create_notification(
                    user=user,
                    notification_type='report_generated',
                    title="New Report Generated",
                    message=f"A new {report_instance.get_report_type_display()} report has been generated for the period {report_instance.period_start} to {report_instance.period_end}.",
                    extra_data={
                        'report_type': report_instance.report_type,
                        'report_id': str(report_instance.id),
                        'period_start': report_instance.period_start.isoformat() if report_instance.period_start else None,
                        'period_end': report_instance.period_end.isoformat() if report_instance.period_end else None,
                    },
                    send_email=False  # Don't send individual emails for reports
                )
                
        except Exception as e:
            logger.error(f"Error notifying report generation: {str(e)}")
    
    @staticmethod
    def notify_weekly_report_generated(report_type: str, period_start, period_end, report_url=None):
        """Send professional email notification when weekly reports are generated"""
        try:
            # Define target users based on report type
            if report_type == 'signatory':
                target_users = User.objects.filter(user_type='signatory')
                report_display = 'Signatory Weekly Report'
            elif report_type == 'business_manager':
                target_users = User.objects.filter(user_type__in=['business_manager', 'admin'])
                report_display = 'Business Manager Weekly Report'
            elif report_type == 'registrar':
                target_users = User.objects.filter(user_type__in=['admin', 'registrar'])
                report_display = 'Registrar Weekly Report'
            else:
                # Default to all administrative users
                target_users = User.objects.filter(user_type__in=['signatory', 'admin', 'business_manager', 'registrar'])
                report_display = 'Weekly Report'
            
            period_str = f"{period_start.strftime('%B %d')} - {period_end.strftime('%B %d, %Y')}"
            
            for user in target_users:
                # Create professional message
                message = f"Dear {user.full_name},\n\n"
                message += f"Your {report_display} for the week of {period_str} has been successfully generated.\n\n"
                message += "The report contains a comprehensive summary of activities and statistics for the specified period. "
                message += "You can access your report through the system dashboard under the Reports section.\n\n"
                if report_url:
                    message += f"Direct access link: {report_url}\n\n"
                message += "Please review the report and contact the system administrator if you have any questions.\n\n"
                message += "Best regards,\n"
                message += "Educational Institution Clearance System"
                
                NotificationService.create_notification(
                    user=user,
                    notification_type='weekly_report_generated',
                    title=f"{report_display} Ready - {period_str}",
                    message=message,
                    priority='medium',
                    extra_data={
                        'report_type': report_type,
                        'report_display': report_display,
                        'period_start': period_start.isoformat() if period_start else None,
                        'period_end': period_end.isoformat() if period_end else None,
                        'report_url': report_url
                    },
                    send_email=True  # Send email notification for weekly reports
                )
                
        except Exception as e:
            logger.error(f"Error sending weekly report notification: {str(e)}")
    
    def handle_form_disapproval(self, form, form_type, disapproval_reasons=None, settlement_instructions='', appointment_date=None):
        """Handle form disapproval notification to student"""
        try:
            # Get the student/user from the form - different models use different field names
            if hasattr(form, 'student'):
                student = form.student  # ClearanceForm uses 'student'
            else:
                student = form.user  # EnrollmentForm and GraduationForm use 'user'
            
            # Create notification
            reasons_text = ', '.join(disapproval_reasons) if disapproval_reasons else 'See remarks'
            settlement_period = 7  # Default 7 days
            
            # Calculate settlement period if appointment date provided
            if appointment_date:
                if isinstance(appointment_date, str):
                    appointment_dt = datetime.strptime(appointment_date, '%Y-%m-%d').date()
                else:
                    appointment_dt = appointment_date
                settlement_period = max(1, (appointment_dt - timezone.now().date()).days)
            
            title = f"{form_type.title()} Form Disapproved"
            
            # Build comprehensive message with all details
            message_parts = [f"Your {form_type} form has been disapproved."]
            
            if reasons_text and reasons_text != 'See remarks':
                message_parts.append(f"Reasons: {reasons_text}")
            
            if settlement_instructions:
                message_parts.append(f"Instructions: {settlement_instructions}")
            
            if appointment_date:
                if isinstance(appointment_date, str):
                    message_parts.append(f"Appointment scheduled: {appointment_date}")
                else:
                    message_parts.append(f"Appointment scheduled: {appointment_date.strftime('%Y-%m-%d')}")
            
            message_parts.append(f"You have {settlement_period} days to address these issues.")
            
            message = " ".join(message_parts)
            
            NotificationService.create_notification(
                user=student,
                notification_type='form_disapproved',
                title=title,
                message=message,
                form_type=form_type,
                form_id=str(form.id),
                priority='high',
                action_required=True,
                extra_data={
                    'disapproval_reasons': disapproval_reasons or [],
                    'settlement_instructions': settlement_instructions,
                    'settlement_period_days': settlement_period,
                    'appointment_date': appointment_date.isoformat() if appointment_date else None,
                    'signatory_name': 'System Administrator',
                    'signatory_role': 'Administrator'
                }
            )
            
            # Send browser notification for disapproval
            NotificationService.send_browser_notification(
                user=student,
                title=f"{form_type.title()} Disapproved",
                message=f"Your {form_type} was disapproved. Please review and resubmit.",
                notification_type='warning'
            )
            
            # Send email notification
            try:
                self._send_disapproval_email(student, form, form_type, disapproval_reasons, settlement_instructions, settlement_period, appointment_date)
            except Exception as e:
                logger.error(f"Error sending disapproval email: {str(e)}")
            
            # Refresh pending count notifications for all users
            try:
                NotificationService.refresh_all_pending_counts()
            except Exception as e:
                logger.error(f"Error refreshing pending counts after disapproval: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error handling form disapproval: {str(e)}")
    
    def _send_disapproval_email(self, student, form, form_type, reasons, instructions, settlement_days, appointment_date):
        """Send email notification for form disapproval"""
        subject = f"Action Required: {form_type.title()} Form Disapproved"
        
        context = {
            'student_name': student.full_name,
            'form_type': form_type,
            'form_id': form.id,
            'disapproval_reasons': reasons or [],
            'disapproval_reason': ', '.join(reasons) if reasons else 'See system notification for details',  # Single reason string
            'settlement_instructions': instructions,
            'settlement_period_days': settlement_days,
            'appointment_date': appointment_date,
            'deadline_date': (timezone.now() + timedelta(days=settlement_days)).date(),
            'site_url': getattr(settings, 'SITE_URL', 'http://localhost:8000'),
            'signatory_name': 'System Administrator',  # Default signatory name
            'signatory_role': 'Administrator'  # Default signatory role
        }
        
        # Send simple email notification
        try:
            email = EmailMultiAlternatives(
                subject=subject,
                body=f"""
Dear {student.full_name},

Your {form_type} form has been disapproved.

Reasons: {', '.join(reasons or ['See system notification for details'])}

Settlement Instructions: {instructions or 'Please address the issues mentioned and resubmit your form.'}

You have {settlement_days} days to address these issues.
{f'Appointment Date: {appointment_date}' if appointment_date else ''}

Please log in to your account to view detailed information and resubmit your form.

Best regards,
Educational Institution System
                """.strip(),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[student.email] if student.email else []
            )
            
            if student.email:
                email.send()
                logger.info(f"Disapproval email sent successfully to {student.email}")
            else:
                logger.warning(f"No email address found for student {student.username}")
                
        except Exception as email_error:
            logger.error(f"Failed to send disapproval email: {str(email_error)}")
    
    @staticmethod
    def send_daily_digest():
        """Send daily digest emails to signatories and admins"""
        try:
            # Get all users who should receive daily digests
            users_with_digest = User.objects.filter(
                user_type__in=['signatory', 'admin', 'business_manager'],
                notification_preferences__digest_frequency='daily',
                notification_preferences__email_daily_digest=True
            ).select_related('notification_preferences')
            
            for user in users_with_digest:
                digest_data = NotificationService._prepare_daily_digest_data(user)
                if digest_data['total_pending'] > 0:  # Only send if there are pending items
                    NotificationService._send_daily_digest_email(user, digest_data)
                    
        except Exception as e:
            logger.error(f"Error sending daily digests: {str(e)}")
    
    @staticmethod
    def _prepare_daily_digest_data(user: User) -> Dict[str, Any]:
        """Prepare data for daily digest email"""
        today = timezone.now().date()
        
        if user.user_type == 'signatory':
            # Get pending forms for this signatory type
            signatory_type = user.signatory_profile.signatory_type
            
            pending_clearances = ClearanceForm.objects.filter(
                status__in=['pending', 'in_progress']
            ).exclude(
                signatories__signatory__signatory_profile__signatory_type=signatory_type,
                signatories__status__in=['approved', 'disapproved']
            ).count()
            
            return {
                'user_name': user.full_name,
                'role': user.signatory_profile.get_signatory_type_display(),
                'signatory_type': f' ({user.signatory_profile.get_signatory_type_display()})',
                'pending_clearances': pending_clearances,
                'pending_enrollments': 0,
                'pending_graduations': 0,
                'pending_documents': 0,
                'total_pending': pending_clearances,
                'date': today
            }
            
        elif user.user_type in ['admin', 'business_manager']:
            # Get all pending forms for business manager/admin
            pending_enrollments = EnrollmentForm.objects.filter(status='pending').count()
            pending_graduations = GraduationForm.objects.filter(status='pending').count()
            pending_documents = DocumentRequest.objects.filter(status='pending').count()
            
            total_pending = pending_enrollments + pending_graduations + pending_documents
            
            return {
                'user_name': user.full_name,
                'role': 'Administrator' if user.user_type == 'admin' else 'Business Manager',
                'signatory_type': '',  # Empty for non-signatories
                'pending_clearances': 0,
                'pending_enrollments': pending_enrollments,
                'pending_graduations': pending_graduations,
                'pending_documents': pending_documents,
                'total_pending': total_pending,
                'date': today
            }
        
        return {'total_pending': 0}
    
    @staticmethod
    def _send_daily_digest_email(user: User, digest_data: Dict[str, Any]):
        """Send daily digest email to user"""
        try:
            template = NotificationService._get_email_template('daily_digest')
            if not template or not user.email:
                return False
            
            subject = template.email_subject.format(**digest_data)
            html_content = template.email_template.format(**digest_data)
            
            # Create email log
            email_log = EmailNotificationLog.objects.create(
                user=user,
                email_type='daily_digest',
                recipient_email=user.email,
                subject=subject,
                content=html_content
            )
            
            # Send email
            email = EmailMultiAlternatives(
                subject=subject,
                body=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            
            # Update log
            email_log.status = 'sent'
            email_log.sent_at = timezone.now()
            email_log.save()
            
            logger.info(f"Daily digest sent to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send daily digest to {user.email}: {str(e)}")
            return False


class NotificationUtils:
    """Utility functions for notifications"""
    
    @staticmethod
    def get_user_notifications(user: User, limit: int = 50, unread_only: bool = False) -> List[Notification]:
        """Get notifications for a user"""
        queryset = Notification.objects.filter(user=user)
        
        if unread_only:
            queryset = queryset.filter(is_read=False)
        
        return list(queryset.order_by('-created_at')[:limit])
    
    @staticmethod
    def get_unread_count(user: User) -> int:
        """Get count of unread notifications"""
        return Notification.objects.filter(user=user, is_read=False).count()
    
    @staticmethod
    def mark_as_read(notification_id: str, user: User) -> bool:
        """Mark a notification as read"""
        try:
            notification = Notification.objects.get(id=notification_id, user=user)
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False
    
    @staticmethod
    def mark_all_as_read(user: User) -> int:
        """Mark all notifications as read for a user"""
        return Notification.objects.filter(user=user, is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )