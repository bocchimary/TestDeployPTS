from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from landing.models import (
    SignatoryActivityLog, GeneratedReport, ClearanceForm, 
    EnrollmentForm, GraduationForm, User
)
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
import os
from django.conf import settings


class Command(BaseCommand):
    help = 'Generate signatory-specific weekly reports'

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
                    self.style.ERROR('Invalid date format. Use YYYY-MM-DD')
                )
                return
        else:
            # Calculate last Monday (start of previous week)
            days_since_monday = now.weekday()
            start_date = (now - timedelta(days=days_since_monday + 7)).date()
        
        end_date = start_date + timedelta(days=6)  # Sunday
        
        self.stdout.write(f'Generating signatory reports for: {start_date} to {end_date}')
        
        # Generate individual reports for each signatory user
        from landing.models import User
        signatories = User.objects.filter(user_type='signatory')
        
        for signatory in signatories:
            self.stdout.write(f'Generating reports for {signatory.full_name}...')
            self._generate_individual_signatory_activity_report(start_date, end_date, signatory)
            self._generate_individual_signatory_performance_report(start_date, end_date, signatory)
        
        self.stdout.write(
            self.style.SUCCESS(f'Signatory weekly reports generated for {start_date} to {end_date}')
        )

    def _generate_individual_signatory_activity_report(self, start_date, end_date, signatory_user):
        """Generate individual signatory activity summary report"""
        try:
            # Get activities for this specific signatory only
            activities = SignatoryActivityLog.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
                signatory=signatory_user  # Only this specific signatory's activities
            ).order_by('created_at')
            
            # Calculate stats for this specific signatory
            personal_stats = {
                'approve': activities.filter(action_type='approve').count(),
                'disapprove': activities.filter(action_type='disapprove').count(),
                'forms_processed': len(set(activities.values_list('form_id', flat=True))),
                'signatory_type': getattr(signatory_user, 'signatory_profile', None) and getattr(signatory_user.signatory_profile, 'signatory_type', 'Unknown') or 'Unknown'
            }
            
            # Create stats dictionary for template (keeping same structure)
            signatory_stats = {
                signatory_user.full_name: personal_stats
            }
            
            context = {
                'report_title': f'Personal Activity Report - {signatory_user.full_name}',
                'period_start': start_date,
                'period_end': end_date,
                'signatory_stats': signatory_stats,
                'total_activities': activities.count(),
                'generated_at': timezone.now()
            }
            
            # Render HTML report
            html_content = render_to_string('reports/signatory_activity_report.html', context)
            
            # Save report
            filename = f'personal_activity_report_{signatory_user.id}_{start_date.strftime("%Y%m%d")}_{end_date.strftime("%Y%m%d")}.html'
            
            report = GeneratedReport.objects.create(
                report_type='manual_activity',
                period_start=start_date,
                period_end=end_date,
                generated_by=signatory_user,  # Assigned to this specific signatory
                notes=f'Personal Activity Report - {signatory_user.full_name} - Week {start_date}'
            )
            
            report.file.save(filename, ContentFile(html_content.encode('utf-8')))
            report.save()
            
            self.stdout.write(f'  * Personal activity report saved for {signatory_user.full_name}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating signatory activity report: {str(e)}')
            )

    def _generate_individual_signatory_performance_report(self, start_date, end_date, signatory_user):
        """Generate individual signatory performance metrics report"""
        try:
            # Get activities for this specific signatory only
            activities = SignatoryActivityLog.objects.filter(
                signatory=signatory_user,
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            )
            
            # Calculate metrics for this specific signatory
            total_actions = activities.count()
            approvals = activities.filter(action_type='approve').count()
            disapprovals = activities.filter(action_type='disapprove').count()
            
            # Forms by type
            clearance_actions = activities.filter(form_type='clearance').count()
            enrollment_actions = activities.filter(form_type='enrollment').count()
            graduation_actions = activities.filter(form_type='graduation').count()
            
            performance_data = [{
                'signatory_name': signatory_user.full_name,
                'signatory_type': getattr(signatory_user, 'signatory_profile', None) and getattr(signatory_user.signatory_profile, 'signatory_type', 'Unknown') or 'Unknown',
                'total_actions': total_actions,
                'approvals': approvals,
                'disapprovals': disapprovals,
                'approval_rate': round((approvals / total_actions * 100) if total_actions > 0 else 0, 1),
                'clearance_actions': clearance_actions,
                'enrollment_actions': enrollment_actions,
                'graduation_actions': graduation_actions
            }]
            
            context = {
                'report_title': f'Personal Performance Report - {signatory_user.full_name}',
                'period_start': start_date,
                'period_end': end_date,
                'performance_data': performance_data,
                'total_signatories': 1,  # Only this signatory
                'generated_at': timezone.now()
            }
            
            # Render HTML report
            html_content = render_to_string('reports/signatory_performance_report.html', context)
            
            # Save report
            filename = f'personal_performance_report_{signatory_user.id}_{start_date.strftime("%Y%m%d")}_{end_date.strftime("%Y%m%d")}.html'
            
            report = GeneratedReport.objects.create(
                report_type='manual_activity',
                period_start=start_date,
                period_end=end_date,
                generated_by=signatory_user,  # Assigned to this specific signatory
                notes=f'Personal Performance Report - {signatory_user.full_name} - Week {start_date}'
            )
            
            report.file.save(filename, ContentFile(html_content.encode('utf-8')))
            report.save()
            
            self.stdout.write(f'  * Personal performance report saved for {signatory_user.full_name}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating signatory performance report: {str(e)}')
            )