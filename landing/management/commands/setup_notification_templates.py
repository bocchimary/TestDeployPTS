"""
Management command to set up default notification templates
"""

from django.core.management.base import BaseCommand
from landing.models import NotificationTemplate


class Command(BaseCommand):
    help = 'Setup default notification templates'

    def handle(self, *args, **options):
        templates = [
            {
                'template_type': 'form_submitted',
                'email_subject': 'New {form_type} Form Submitted - Action Required',
                'email_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">New Form Submission</h2>
                    <p>Dear {user_name},</p>
                    <p>A new form has been submitted and requires your attention:</p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Student:</strong> {student_name}</p>
                        <p><strong>Form Type:</strong> {form_type}</p>
                        <p><strong>Submitted:</strong> {created_at}</p>
                    </div>
                    <p>Please log into your dashboard to review and approve this form.</p>
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This is an automated message from the Educational Institution Clearance System.
                    </p>
                </div>
                ''',
                'in_app_title': 'New {form_type} Form Submitted',
                'in_app_message': '{student_name} has submitted a new {form_type} form for your review.'
            },
            {
                'template_type': 'form_approved',
                'email_subject': 'Form Approved - {form_type}',
                'email_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #27ae60;">Form Approved ✓</h2>
                    <p>Dear {user_name},</p>
                    <p>Good news! Your form has been approved:</p>
                    <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #27ae60;">
                        <p><strong>Form Type:</strong> {form_type}</p>
                        <p><strong>Approved by:</strong> {signatory_name} ({signatory_role})</p>
                        <p><strong>Date:</strong> {created_at}</p>
                        {remarks}
                    </div>
                    <p>You can view the details in your student dashboard.</p>
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This is an automated message from the Educational Institution Clearance System.
                    </p>
                </div>
                ''',
                'in_app_title': '{form_type} Form Approved',
                'in_app_message': 'Your {form_type} form has been approved by {signatory_name}.'
            },
            {
                'template_type': 'form_disapproved',
                'email_subject': 'Action Required - Form Disapproved ({form_type})',
                'email_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #e74c3c;">Form Requires Attention ⚠️</h2>
                    <p>Dear {user_name},</p>
                    <p>Your form submission requires your attention and has been disapproved:</p>
                    <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #e74c3c;">
                        <p><strong>Form Type:</strong> {form_type}</p>
                        <p><strong>Reviewed by:</strong> {signatory_name} ({signatory_role})</p>
                        <p><strong>Reason:</strong> {disapproval_reason}</p>
                        <p><strong>Settlement Deadline:</strong> {action_deadline}</p>
                    </div>
                    <p><strong>What you need to do:</strong></p>
                    <p>Please resolve the issues mentioned above and resubmit your form before the deadline.</p>
                    <p>You have <strong>{settlement_days} days</strong> to address these concerns.</p>
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This is an automated message from the Educational Institution Clearance System.
                    </p>
                </div>
                ''',
                'in_app_title': '{form_type} Form Disapproved - Action Required',
                'in_app_message': 'Your {form_type} form has been disapproved. Please check the details and take action before {action_deadline}.'
            },
            {
                'template_type': 'document_ready',
                'email_subject': 'Document Ready for Collection - {document_type}',
                'email_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3498db;">Document Ready for Collection 📄</h2>
                    <p>Dear {user_name},</p>
                    <p>Your requested document is now ready for collection:</p>
                    <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #3498db;">
                        <p><strong>Document Type:</strong> {document_type}</p>
                        <p><strong>Status:</strong> Ready for Release</p>
                        <p><strong>Request Date:</strong> {request_date}</p>
                    </div>
                    <p><strong>Next Steps:</strong></p>
                    <p>Please visit the Registrar's Office during office hours to collect your document. Bring a valid ID for verification.</p>
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This is an automated message from the Educational Institution Clearance System.
                    </p>
                </div>
                ''',
                'in_app_title': 'Document Ready - {document_type}',
                'in_app_message': 'Your requested {document_type} is ready for collection at the Registrar\'s Office.'
            },
            {
                'template_type': 'clearance_completed',
                'email_subject': 'Clearance Completed - {form_type}',
                'email_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #27ae60;">Congratulations! Clearance Completed 🎉</h2>
                    <p>Dear {user_name},</p>
                    <p>Excellent news! Your clearance has been completed successfully:</p>
                    <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #27ae60;">
                        <p><strong>Clearance Type:</strong> {form_type}</p>
                        <p><strong>Completion Date:</strong> {completion_date}</p>
                        <p><strong>Status:</strong> All Signatories Approved ✓</p>
                    </div>
                    <p>All required signatories have approved your clearance. Your clearance is now complete and ready for processing.</p>
                    <p>You can download your clearance form from your student dashboard.</p>
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This is an automated message from the Educational Institution Clearance System.
                    </p>
                </div>
                ''',
                'in_app_title': 'Clearance Completed!',
                'in_app_message': 'Congratulations! All signatories have approved your {form_type} clearance.'
            },
            {
                'template_type': 'enrollment_completed',
                'email_subject': 'Enrollment Completed - All Approvals Received',
                'email_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #27ae60;">Congratulations! Enrollment Completed 🎉</h2>
                    <p>Dear {user_name},</p>
                    <p>Excellent news! Your enrollment form has been completed successfully:</p>
                    <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #27ae60;">
                        <p><strong>Form Type:</strong> Enrollment</p>
                        <p><strong>Completion Date:</strong> {completion_date}</p>
                        <p><strong>Status:</strong> All Required Signatories Approved ✓</p>
                    </div>
                    <p>All required signatories have approved your enrollment form. Your enrollment is now complete and ready for processing.</p>
                    <p>You can view and download your enrollment form from your student dashboard.</p>
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This is an automated message from the Educational Institution Clearance System.
                    </p>
                </div>
                ''',
                'in_app_title': 'Enrollment Completed!',
                'in_app_message': 'Congratulations! All required signatories have approved your enrollment form.'
            },
            {
                'template_type': 'graduation_completed',
                'email_subject': 'Graduation Completed - All Approvals Received',
                'email_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #27ae60;">Congratulations! Graduation Completed 🎉</h2>
                    <p>Dear {user_name},</p>
                    <p>Excellent news! Your graduation form has been completed successfully:</p>
                    <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #27ae60;">
                        <p><strong>Form Type:</strong> Graduation</p>
                        <p><strong>Completion Date:</strong> {completion_date}</p>
                        <p><strong>Status:</strong> All Required Signatories Approved ✓</p>
                    </div>
                    <p>All required signatories have approved your graduation form. Your graduation is now complete and ready for final processing.</p>
                    <p>You can view and download your graduation form from your student dashboard.</p>
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This is an automated message from the Educational Institution Clearance System.
                    </p>
                </div>
                ''',
                'in_app_title': 'Graduation Completed!',
                'in_app_message': 'Congratulations! All required signatories have approved your graduation form.'
            },
            {
                'template_type': 'daily_digest',
                'email_subject': 'Daily Digest - Pending Forms Summary',
                'email_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Daily Forms Summary</h2>
                    <p>Dear {user_name},</p>
                    <p>Here's your daily summary of pending forms requiring attention:</p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Date:</strong> {date}</p>
                        <p><strong>Your Role:</strong> {role}{signatory_type}</p>
                        <br>
                        <p><strong>Pending Forms:</strong></p>
                        <ul>
                            <li>Clearance Forms: {pending_clearances}</li>
                            <li>Enrollment Forms: {pending_enrollments}</li>
                            <li>Graduation Forms: {pending_graduations}</li>
                            <li>Document Requests: {pending_documents}</li>
                        </ul>
                        <p><strong>Total Pending:</strong> {total_pending}</p>
                    </div>
                    <p>Please log into your dashboard to review and process these forms.</p>
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This is an automated daily digest from the Educational Institution Clearance System.<br>
                        You can disable these emails in your notification preferences.
                    </p>
                </div>
                ''',
                'in_app_title': 'Daily Forms Summary',
                'in_app_message': 'You have {total_pending} pending forms requiring your attention.'
            },
            {
                'template_type': 'report_generated',
                'email_subject': 'New Report Available - {report_type}',
                'email_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #8e44ad;">New Report Generated 📊</h2>
                    <p>Dear {user_name},</p>
                    <p>A new report has been generated and is available for review:</p>
                    <div style="background: #f4f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #8e44ad;">
                        <p><strong>Report Type:</strong> {report_type}</p>
                        <p><strong>Period:</strong> {period_start} to {period_end}</p>
                        <p><strong>Generated:</strong> {created_at}</p>
                    </div>
                    <p>You can access this report from your dashboard under the Reports section.</p>
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This is an automated message from the Educational Institution Clearance System.
                    </p>
                </div>
                ''',
                'in_app_title': 'New Report Available',
                'in_app_message': 'A new {report_type} report has been generated for {period_start} to {period_end}.'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for template_data in templates:
            template, created = NotificationTemplate.objects.update_or_create(
                template_type=template_data['template_type'],
                defaults={
                    'email_subject': template_data['email_subject'],
                    'email_template': template_data['email_template'],
                    'in_app_title': template_data['in_app_title'],
                    'in_app_message': template_data['in_app_message'],
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created template: {template.get_template_type_display()}")
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f"Updated template: {template.get_template_type_display()}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"\nCompleted! Created: {created_count}, Updated: {updated_count} templates."
            )
        )