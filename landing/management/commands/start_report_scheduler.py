from django.core.management.base import BaseCommand
import time
from datetime import datetime
import pytz
from django.core.management import call_command
import threading
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Start the automated weekly report scheduler'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--daemon',
            action='store_true',
            help='Run as daemon (keeps running in background)',
        )
        parser.add_argument(
            '--test',
            action='store_true',
            help='Test mode - runs every minute instead of weekly',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting weekly report scheduler...'))
        
        if options['test']:
            self.stdout.write(self.style.WARNING('Running in TEST MODE - will generate reports every minute!'))
        
        if options['daemon']:
            # Run in background thread
            scheduler_thread = threading.Thread(target=self.run_scheduler, args=(options,), daemon=True)
            scheduler_thread.start()
            self.stdout.write(self.style.SUCCESS('Scheduler started as daemon thread'))
            
            # Keep main thread alive
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                self.stdout.write(self.style.WARNING('Scheduler stopped'))
        else:
            self.run_scheduler(options)
    
    def run_scheduler(self, options):
        """Main scheduler loop"""
        ph_tz = pytz.timezone('Asia/Manila')
        last_run_date = None
        
        while True:
            try:
                now = datetime.now(ph_tz)
                current_date = now.date()
                
                # Test mode: run every minute
                if options['test']:
                    if last_run_date != current_date or (last_run_date is None):
                        self.stdout.write(f'TEST: Generating reports at {now.strftime("%Y-%m-%d %H:%M:%S %Z")}')
                        self.generate_reports(force=True)
                        last_run_date = current_date
                    time.sleep(60)  # Wait 1 minute
                    continue
                
                # Production mode: run on Monday at 6:00 AM PH time
                if (now.weekday() == 0 and  # Monday
                    now.hour == 6 and 
                    now.minute == 0 and
                    last_run_date != current_date):
                    
                    self.stdout.write(f'Generating weekly reports at {now.strftime("%Y-%m-%d %H:%M:%S %Z")}')
                    self.generate_reports(force=False)
                    last_run_date = current_date
                    
                    # Log successful execution
                    logger.info(f'Weekly reports generated successfully at {now}')
                
                # Check every minute
                time.sleep(60)
                
            except Exception as e:
                error_msg = f'Error in scheduler: {e}'
                self.stdout.write(self.style.ERROR(error_msg))
                logger.error(error_msg)
                time.sleep(300)  # Wait 5 minutes before retrying
    
    def generate_reports(self, force=False):
        """Generate reports using the management command"""
        try:
            if force:
                call_command('generate_weekly_reports', '--force')
            else:
                call_command('generate_weekly_reports')
            
            self.stdout.write(self.style.SUCCESS('Reports generated successfully'))
            return True
            
        except Exception as e:
            error_msg = f'Error generating reports: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg)
            return False