from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from landing.models import (
    SignatoryActivityLog, GeneratedReport, ClearanceForm, 
    EnrollmentForm, User
)
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
import os
from django.conf import settings
import zipfile
import io


class Command(BaseCommand):
    help = 'Generate weekly aggregate reports every Monday (clearance, enrollment, graduation)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force generation even if not Monday',
        )
        parser.add_argument(
            '--week',
            type=str,
            help='Generate for specific week (YYYY-MM-DD format for Monday)',
        )

    def handle(self, *args, **options):
        # Get Philippine timezone
        ph_tz = pytz.timezone('Asia/Manila')
        now = datetime.now(ph_tz)
        
        # Check if today is Monday or force flag is used
        if now.weekday() != 0 and not options['force']:  # Monday is 0
            self.stdout.write(
                self.style.WARNING('Today is not Monday. Use --force to generate reports anyway.')
            )
            return
        
        # Calculate target week's date range
        if options['week']:
            try:
                start_date = datetime.strptime(options['week'], '%Y-%m-%d').date()
                if start_date.weekday() != 0:
                    self.stdout.write(
                        self.style.ERROR('Week date must be a Monday')
                    )
                    return
            except ValueError:
                self.stdout.write(
                    self.style.ERROR('Invalid week date format. Use YYYY-MM-DD')
                )
                return
        else:
            # Calculate last week's date range (Monday to Sunday)
            days_since_monday = now.weekday()
            start_date = now.date() - timedelta(days=days_since_monday + 7)  # Last Monday
        
        end_date = start_date + timedelta(days=6)  # Last Sunday
        
        self.stdout.write(f'Generating aggregate reports for period: {start_date} to {end_date}')
        
        # Generate exactly 4 aggregate reports: clearance, enrollment, graduation, document_release
        report_types = ['clearance', 'enrollment', 'graduation', 'document_release']
        
        for report_type in report_types:
            try:
                # Check if report already exists (idempotent)
                existing_report = GeneratedReport.objects.filter(
                    report_type=report_type,
                    period_start=start_date,
                    period_end=end_date,
                ).first()
                
                if existing_report and not options['force']:
                    self.stdout.write(
                        self.style.WARNING(
                            f'{report_type.title()} report already exists for this week. Use --force to regenerate.'
                        )
                    )
                    continue
                
                # Generate the aggregate report
                success = self.generate_aggregate_report(report_type, start_date, end_date)
                
                if success:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Generated {report_type.title()} aggregate report'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Failed to generate {report_type.title()} aggregate report'
                        )
                    )
                        
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error generating {report_type} report: {str(e)}'
                    )
                )
        
        # Also generate specialized reports for signatories, business manager, and registrar
        self.stdout.write('Generating specialized weekly reports...')
        
        try:
            from django.core.management import call_command
            
            # Generate signatory reports
            call_command('generate_signatory_weekly_reports', week=start_date.strftime('%Y-%m-%d'))
            self.stdout.write(self.style.SUCCESS('Signatory reports generated'))
            
            # Generate business manager reports  
            call_command('generate_business_manager_weekly_reports', week=start_date.strftime('%Y-%m-%d'))
            self.stdout.write(self.style.SUCCESS('Business Manager reports generated'))
            
            # Generate registrar reports
            call_command('generate_registrar_weekly_reports', week=start_date.strftime('%Y-%m-%d'))
            self.stdout.write(self.style.SUCCESS('Registrar reports generated'))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating specialized reports: {str(e)}')
            )
        
        # Send email notifications about report generation
        self.stdout.write('Sending weekly report email notifications...')
        
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            from landing.models import User
            
            # Send simple email notification to admins and signatories about report generation
            admin_users = User.objects.filter(
                user_type__in=['admin', 'business_manager', 'registrar', 'signatory']
            ).exclude(email__isnull=True).exclude(email__exact='')
            
            if admin_users.exists():
                period_str = f"{start_date} to {end_date}"
                subject = f"📊 Weekly Reports Generated - {period_str}"
                
                # Create professional HTML email template
                html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Reports Generated</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }}
        .email-container {{
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            color: #007bff;
            margin: 0;
            font-size: 24px;
        }}
        .period-badge {{
            background-color: #28a745;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            display: inline-block;
            margin: 15px 0;
        }}
        .reports-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 25px 0;
        }}
        .report-item {{
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }}
        .report-item h3 {{
            margin: 0 0 5px 0;
            color: #007bff;
            font-size: 14px;
        }}
        .report-item p {{
            margin: 0;
            font-size: 12px;
            color: #6c757d;
        }}
        .access-info {{
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }}
        .access-info h3 {{
            color: #0056b3;
            margin-top: 0;
        }}
        .footer {{
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 12px;
        }}
        .system-name {{
            font-weight: bold;
            color: #007bff;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>📊 Weekly Reports Generated</h1>
            <div class="period-badge">Period: {period_str}</div>
        </div>
        
        <p>Dear Team,</p>
        
        <p>Your weekly reports have been automatically generated and are now available for review. All reports have been processed successfully for the reporting period.</p>
        
        <div class="reports-grid">
            <div class="report-item">
                <h3>📋 Clearance Reports</h3>
                <p>Student clearance status and approvals</p>
            </div>
            <div class="report-item">
                <h3>📝 Enrollment Reports</h3>
                <p>New student enrollment tracking</p>
            </div>
            <div class="report-item">
                <h3>🎓 Graduation Reports</h3>
                <p>Graduation clearance processing</p>
            </div>
            <div class="report-item">
                <h3>📄 Document Release</h3>
                <p>Document processing and release logs</p>
            </div>
            <div class="report-item">
                <h3>👥 Signatory Performance</h3>
                <p>Individual signatory activity reports</p>
            </div>
            <div class="report-item">
                <h3>💼 Administrative Reports</h3>
                <p>Business and registrar management reports</p>
            </div>
        </div>
        
        <div class="access-info">
            <h3>🔗 Accessing Your Reports</h3>
            <p>You can access all generated reports through your system dashboard.</p>
            <p><strong>Note:</strong> Direct report links will be available after system deployment.</p>
        </div>
        
        <p>If you have any questions about these reports or need assistance accessing them, please contact your system administrator.</p>
        
        <div class="footer">
            <p>This is an automated notification from the<br>
            <span class="system-name">PTS College and Advanced Studies<br>Clearance Management System</span></p>
            <p>Generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        </div>
    </div>
</body>
</html>
                """
                
                # Plain text fallback
                text_message = f"""
Weekly Reports Generated - {period_str}

Dear Team,

Your weekly reports have been automatically generated and are now available for review.

Generated Reports:
• Clearance Reports - Student clearance status and approvals
• Enrollment Reports - New student enrollment tracking  
• Graduation Reports - Graduation clearance processing
• Document Release - Document processing and release logs
• Signatory Performance - Individual signatory activity reports
• Administrative Reports - Business and registrar management reports

You can access all generated reports through your system dashboard.
Note: Direct report links will be available after system deployment.

If you have any questions about these reports or need assistance accessing them, please contact your system administrator.

Best regards,
PTS College and Advanced Studies
Clearance Management System
Generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}
                """.strip()
                
                recipient_emails = [user.email for user in admin_users]
                
                from django.core.mail import EmailMultiAlternatives
                
                # Create email with both HTML and text versions
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=recipient_emails
                )
                email.attach_alternative(html_message, "text/html")
                email.send(fail_silently=False)
                
                self.stdout.write(self.style.SUCCESS(f'Weekly report email notifications sent to {len(recipient_emails)} recipients'))
            else:
                self.stdout.write(self.style.WARNING('No admin users found to send email notifications'))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error sending weekly report email notifications: {str(e)}')
            )
        
        self.stdout.write(
            self.style.SUCCESS('All weekly report generation and notifications completed!')
        )
    
    def generate_aggregate_report(self, report_type, start_date, end_date):
        """Generate an aggregate report for the given type and period"""
        try:
            # Get data based on report type
            if report_type == 'clearance':
                forms_data = self.get_clearance_data(start_date, end_date)
                template = 'pdf/aggregate-clearance-report.html'
            elif report_type == 'enrollment':
                forms_data = self.get_enrollment_data(start_date, end_date)
                template = 'pdf/aggregate-enrollment-report.html'
            elif report_type == 'graduation':
                # Use clearance forms with graduation type
                forms_data = self.get_graduation_data(start_date, end_date)
                template = 'pdf/aggregate-graduation-report.html'
            elif report_type == 'document_release':
                forms_data = self.get_document_release_data(start_date, end_date)
                template = 'pdf/aggregate-document-release-report.html'
            else:
                return False
            
            # Create context for template
            context = {
                'report_type': report_type,
                'period_start': start_date,
                'period_end': end_date,
                'forms_data': forms_data,
                'total_forms': len(forms_data),
                'generated_at': timezone.now(),
            }
            
            # Set status to generating first (if creating new record)
            report, created = GeneratedReport.objects.get_or_create(
                report_type=report_type,
                period_start=start_date,
                period_end=end_date,
                defaults={
                    'status': 'generating',
                    'notes': f'Weekly aggregate {report_type} report - generating...',
                }
            )
            
            if not created and report.status == 'completed':
                # Update existing record to generating status
                report.status = 'generating'
                report.notes = f'Weekly aggregate {report_type} report - regenerating...'
                report.save()
            
            try:
                # Render HTML content
                html_content = render_to_string(template, context)
                html_bytes = html_content.encode('utf-8')
                
                # Calculate checksum
                import hashlib
                checksum = hashlib.sha256(html_bytes).hexdigest()
                
                # Create filename
                filename = f"weekly_{report_type}_aggregate_{start_date}_{end_date}.html"
                
                # Save to database using FileField
                content_file = ContentFile(html_bytes, name=filename)
                
                # Update the report record with completed data
                report.file = content_file
                report.size_bytes = len(html_bytes)
                report.checksum = checksum
                report.status = 'completed'
                report.notes = f'Weekly aggregate {report_type} report - {len(forms_data)} forms'
                report.save()
                
                self.stdout.write(f'Saved {report_type} report: {filename} ({len(html_bytes)} bytes, checksum: {checksum[:8]}...)')
                
                return True
                
            except Exception as e:
                # Mark as failed
                report.status = 'failed'
                report.notes = f'Failed to generate {report_type} report: {str(e)}'
                report.save()
                raise e
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error in generate_aggregate_report: {str(e)}')
            )
            return False
    
    def get_clearance_data(self, start_date, end_date):
        """Get clearance forms data for the period"""
        return ClearanceForm.objects.filter(
            submitted_at__date__range=[start_date, end_date]
        ).select_related('student').order_by('-submitted_at')
    
    def get_enrollment_data(self, start_date, end_date):
        """Get enrollment forms data for the period"""
        return EnrollmentForm.objects.filter(
            created_at__date__range=[start_date, end_date]
        ).select_related('user').order_by('-created_at')
    
    def get_graduation_data(self, start_date, end_date):
        """Get graduation clearance forms data for the period"""
        return ClearanceForm.objects.filter(
            submitted_at__date__range=[start_date, end_date],
            clearance_type='graduation'
        ).select_related('student').order_by('-submitted_at')
    
    def get_document_release_data(self, start_date, end_date):
        """Get document release activities for the period"""
        # Get activities related to document release from audit logs
        from landing.models import AuditLog
        return AuditLog.objects.filter(
            timestamp__date__range=[start_date, end_date],
            action_type__icontains='release',
        ).select_related('user').order_by('-timestamp') 