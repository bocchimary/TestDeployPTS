from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from landing.models import (
    SignatoryActivityLog, GeneratedReport, ClearanceForm, 
    EnrollmentForm, GraduationForm, User, DocumentRequest
)
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
import os
from django.conf import settings
from django.db.models import Count, Q


class Command(BaseCommand):
    help = 'Generate registrar/admin-specific weekly reports'

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
        
        self.stdout.write(f'Generating registrar/admin reports for: {start_date} to {end_date}')
        
        # Generate system overview report
        self._generate_system_overview_report(start_date, end_date)
        
        # Generate document processing report
        self._generate_document_processing_report(start_date, end_date)
        
        # Generate institutional analytics report
        self._generate_institutional_analytics_report(start_date, end_date)
        
        self.stdout.write(
            self.style.SUCCESS(f'Registrar weekly reports generated for {start_date} to {end_date}')
        )

    def _generate_system_overview_report(self, start_date, end_date):
        """Generate comprehensive system overview report"""
        try:
            # Get all form activities for the week
            all_activities = SignatoryActivityLog.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            )
            
            # Calculate system-wide statistics
            system_stats = {
                'total_activities': all_activities.count(),
                'total_approvals': all_activities.filter(action_type='approve').count(),
                'total_disapprovals': all_activities.filter(action_type='disapprove').count(),
                'forms_by_type': {},
                'user_engagement': {},
                'processing_efficiency': {}
            }
            
            # Forms by type
            for form_type in ['clearance', 'enrollment', 'graduation']:
                form_activities = all_activities.filter(form_type=form_type)
                system_stats['forms_by_type'][form_type] = {
                    'total': form_activities.count(),
                    'approved': form_activities.filter(action_type='approve').count(),
                    'disapproved': form_activities.filter(action_type='disapprove').count()
                }
            
            # User type analysis
            for user_type in ['signatory', 'admin']:
                user_activities = all_activities.filter(signatory__user_type=user_type)
                system_stats['user_engagement'][user_type] = user_activities.count()
            
            # New form submissions during the week
            new_clearances = ClearanceForm.objects.filter(
                submitted_at__date__gte=start_date,
                submitted_at__date__lte=end_date
            ).count()
            
            new_enrollments = EnrollmentForm.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).count()
            
            new_graduations = GraduationForm.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).count()
            
            system_stats['new_submissions'] = {
                'clearance': new_clearances,
                'enrollment': new_enrollments, 
                'graduation': new_graduations,
                'total': new_clearances + new_enrollments + new_graduations
            }
            
            context = {
                'report_title': 'System Overview Report',
                'period_start': start_date,
                'period_end': end_date,
                'system_stats': system_stats,
                'recent_activities': all_activities.order_by('-created_at')[:30],
                'generated_at': timezone.now()
            }
            
            # Render HTML report
            html_content = render_to_string('reports/system_overview_report.html', context)
            
            # Save report
            filename = f'system_overview_report_{start_date.strftime("%Y%m%d")}_{end_date.strftime("%Y%m%d")}.html'
            
            report = GeneratedReport.objects.create(
                report_type='manual_activity',
                period_start=start_date,
                period_end=end_date,
                generated_by=None,
                notes=f'System Overview Report - Week {start_date}'
            )
            
            report.file.save(filename, ContentFile(html_content.encode('utf-8')))
            report.save()
            
            self.stdout.write(f'  * System overview report saved as {filename}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating system overview report: {str(e)}')
            )

    def _generate_document_processing_report(self, start_date, end_date):
        """Generate document processing and release report"""
        try:
            # Get document requests processed during the week
            document_requests = DocumentRequest.objects.filter(
                Q(created_at__date__gte=start_date, created_at__date__lte=end_date) |
                Q(updated_at__date__gte=start_date, updated_at__date__lte=end_date)
            )
            
            # Calculate document processing stats
            doc_stats = {
                'total_requests': document_requests.count(),
                'by_status': {},
                'by_document_type': {},
                'processing_times': [],
                'completion_rate': 0
            }
            
            # Group by status
            for status in ['pending', 'processing', 'ready', 'released']:
                doc_stats['by_status'][status] = document_requests.filter(status=status).count()
            
            # Group by document type (assuming document_type is a field)
            doc_types = document_requests.values('document_type').annotate(count=Count('id'))
            for doc_type in doc_types:
                doc_stats['by_document_type'][doc_type['document_type']] = doc_type['count']
            
            # Calculate completion rate
            completed = document_requests.filter(status__in=['ready', 'released']).count()
            doc_stats['completion_rate'] = round((completed / document_requests.count() * 100) if document_requests.count() > 0 else 0, 1)
            
            # Get clearance completion stats  
            completed_clearances = ClearanceForm.objects.filter(
                finalized_at__date__gte=start_date,
                finalized_at__date__lte=end_date,
                status='approved'
            )
            
            context = {
                'report_title': 'Document Processing Report',
                'period_start': start_date,
                'period_end': end_date,
                'doc_stats': doc_stats,
                'completed_clearances': completed_clearances.count(),
                'recent_documents': document_requests.order_by('-updated_at')[:20],
                'recent_completed_clearances': completed_clearances.order_by('-finalized_at')[:20],
                'generated_at': timezone.now()
            }
            
            # Render HTML report
            html_content = render_to_string('reports/document_processing_report.html', context)
            
            # Save report
            filename = f'document_processing_report_{start_date.strftime("%Y%m%d")}_{end_date.strftime("%Y%m%d")}.html'
            
            report = GeneratedReport.objects.create(
                report_type='manual_activity',
                period_start=start_date,
                period_end=end_date,
                generated_by=None,
                notes=f'Document Processing Report - Week {start_date}'
            )
            
            report.file.save(filename, ContentFile(html_content.encode('utf-8')))
            report.save()
            
            self.stdout.write(f'  * Document processing report saved as {filename}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating document processing report: {str(e)}')
            )

    def _generate_institutional_analytics_report(self, start_date, end_date):
        """Generate institutional analytics and trends report"""
        try:
            # Get all users and their activity patterns
            total_users = User.objects.count()
            active_users = User.objects.filter(
                Q(activity_logs__created_at__date__gte=start_date,
                  activity_logs__created_at__date__lte=end_date) |
                Q(clearance_forms__submitted_at__date__gte=start_date,
                  clearance_forms__submitted_at__date__lte=end_date) |
                Q(enrollment_forms__created_at__date__gte=start_date,
                  enrollment_forms__created_at__date__lte=end_date)
            ).distinct().count()
            
            # Calculate user engagement metrics
            engagement_stats = {
                'total_users': total_users,
                'active_users': active_users,
                'engagement_rate': round((active_users / total_users * 100) if total_users > 0 else 0, 1),
                'user_distribution': {},
                'form_trends': {},
                'bottlenecks': []
            }
            
            # User type distribution
            for user_type in ['student', 'alumni', 'signatory', 'admin']:
                count = User.objects.filter(user_type=user_type).count()
                engagement_stats['user_distribution'][user_type] = count
            
            # Identify bottlenecks (forms with high disapproval rates)
            high_disapproval_forms = ClearanceForm.objects.filter(
                submitted_at__date__gte=start_date,
                submitted_at__date__lte=end_date
            ).annotate(
                disapproval_count=Count('signatories', filter=Q(signatories__status='disapproved'))
            ).filter(disapproval_count__gte=2)  # Forms with 2+ disapprovals
            
            for form in high_disapproval_forms[:10]:  # Top 10 problematic forms
                engagement_stats['bottlenecks'].append({
                    'form_id': str(form.id),
                    'student': form.student.full_name,
                    'disapproval_count': form.disapproval_count,
                    'submitted_date': form.submitted_at.date()
                })
            
            # Weekly trends (compare with previous week)
            prev_week_start = start_date - timedelta(days=7)
            prev_week_end = start_date - timedelta(days=1)
            
            current_week_activities = SignatoryActivityLog.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).count()
            
            prev_week_activities = SignatoryActivityLog.objects.filter(
                created_at__date__gte=prev_week_start,
                created_at__date__lte=prev_week_end
            ).count()
            
            trend_change = ((current_week_activities - prev_week_activities) / prev_week_activities * 100) if prev_week_activities > 0 else 0
            
            engagement_stats['weekly_trend'] = {
                'current_week': current_week_activities,
                'previous_week': prev_week_activities,
                'change_percent': round(trend_change, 1)
            }
            
            context = {
                'report_title': 'Institutional Analytics Report',
                'period_start': start_date,
                'period_end': end_date,
                'engagement_stats': engagement_stats,
                'generated_at': timezone.now()
            }
            
            # Render HTML report
            html_content = render_to_string('reports/institutional_analytics_report.html', context)
            
            # Save report
            filename = f'institutional_analytics_report_{start_date.strftime("%Y%m%d")}_{end_date.strftime("%Y%m%d")}.html'
            
            report = GeneratedReport.objects.create(
                report_type='manual_activity',
                period_start=start_date,
                period_end=end_date,
                generated_by=None,
                notes=f'Institutional Analytics Report - Week {start_date}'
            )
            
            report.file.save(filename, ContentFile(html_content.encode('utf-8')))
            report.save()
            
            self.stdout.write(f'  * Institutional analytics report saved as {filename}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating institutional analytics report: {str(e)}')
            )