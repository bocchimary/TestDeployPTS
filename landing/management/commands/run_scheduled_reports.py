from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import datetime, time
import pytz
from landing.models import ReportScheduler
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Check and run scheduled weekly reports - Perfect for college deployment!'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force run reports regardless of schedule',
        )
        parser.add_argument(
            '--setup',
            action='store_true', 
            help='Set up the weekly report schedule',
        )

    def handle(self, *args, **options):
        if options['setup']:
            self.setup_schedule()
            return
            
        if options['force']:
            self.stdout.write('Force running all reports...')
            self.run_all_reports()
            return
            
        # Check if it's time to run scheduled reports
        self.check_and_run_scheduled_reports()

    def setup_schedule(self):
        """Set up the weekly report schedule"""
        scheduler, created = ReportScheduler.objects.get_or_create(
            task_name='weekly_reports',
            defaults={
                'is_enabled': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('* Weekly report schedule created!'))
        else:
            self.stdout.write(self.style.SUCCESS('* Weekly report schedule already exists'))
            
        self.stdout.write(f'* Will run every Monday at {getattr(settings, "AUTO_REPORTS_TIME", "08:00")} {getattr(settings, "AUTO_REPORTS_TIMEZONE", "Asia/Manila")}')

    def check_and_run_scheduled_reports(self):
        """Check if it's time to run the weekly reports"""
        try:
            # Get settings
            report_time_str = getattr(settings, 'AUTO_REPORTS_TIME', '08:00')
            report_timezone = getattr(settings, 'AUTO_REPORTS_TIMEZONE', 'Asia/Manila') 
            report_day = getattr(settings, 'AUTO_REPORTS_DAY', 0)  # 0=Monday
            
            # Get current time in specified timezone
            tz = pytz.timezone(report_timezone)
            now = datetime.now(tz)
            current_date = now.date()
            current_time = now.time()
            
            # Parse target time
            target_hour, target_minute = map(int, report_time_str.split(':'))
            target_time = time(target_hour, target_minute)
            
            # Get or create scheduler record
            scheduler, created = ReportScheduler.objects.get_or_create(
                task_name='weekly_reports',
                defaults={'is_enabled': True}
            )
            
            if not scheduler.is_enabled:
                self.stdout.write('Weekly reports are disabled')
                return
                
            # Check if it's the right day and time
            is_right_day = now.weekday() == report_day
            is_right_time = current_time >= target_time
            not_run_today = scheduler.last_run_date != current_date
            
            if is_right_day and is_right_time and not_run_today:
                self.stdout.write(self.style.SUCCESS(f'Time to run weekly reports! ({now.strftime("%Y-%m-%d %H:%M %Z")})'))
                
                # Run the reports
                success = self.run_all_reports()
                
                if success:
                    # Update scheduler record
                    scheduler.last_run_date = current_date
                    scheduler.last_run_time = now
                    scheduler.save()
                    
                    self.stdout.write(self.style.SUCCESS('* All weekly reports completed successfully!'))
                else:
                    self.stdout.write(self.style.ERROR('* Some reports failed - check logs'))
            else:
                # Show status for debugging
                self.stdout.write(f'Status check ({now.strftime("%Y-%m-%d %H:%M %Z")}):')
                self.stdout.write(f'  Right day (Monday): {is_right_day} (current: {now.strftime("%A")})')
                self.stdout.write(f'  Right time (>={target_time}): {is_right_time} (current: {current_time})')
                self.stdout.write(f'  Not run today: {not_run_today} (last run: {scheduler.last_run_date})')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error checking schedule: {str(e)}'))

    def run_all_reports(self):
        """Run all three types of weekly reports"""
        success_count = 0
        total_reports = 3
        
        reports = [
            ('generate_signatory_weekly_reports', 'Signatory Reports'),
            ('generate_business_manager_weekly_reports', 'Business Manager Reports'),
            ('generate_registrar_weekly_reports', 'Registrar Reports'),
        ]
        
        for command_name, report_name in reports:
            try:
                self.stdout.write(f'Generating {report_name}...')
                call_command(command_name, '--force', stdout=self.stdout)
                success_count += 1
                self.stdout.write(self.style.SUCCESS(f'* {report_name} completed'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'* {report_name} failed: {str(e)}'))
                
        return success_count == total_reports