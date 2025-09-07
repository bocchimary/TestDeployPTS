from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'One-time setup for automated weekly reports'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Setting up automated weekly reports for your institution...'))
        
        # Set up the schedule
        call_command('run_scheduled_reports', '--setup', stdout=self.stdout)
        
        self.stdout.write(self.style.SUCCESS('\n=== SETUP COMPLETE ==='))
        self.stdout.write('Automated weekly reports are now configured!')
        self.stdout.write('\n=== NEXT STEPS FOR DEPLOYMENT ===')
        self.stdout.write('1. Add this to your server\'s crontab (runs every hour):')
        self.stdout.write('   0 * * * * cd /path/to/your/project && python manage.py run_scheduled_reports')
        self.stdout.write('\n2. OR create a systemd timer (recommended for production)')
        self.stdout.write('\n3. OR call this URL hourly: /run-reports/ (if you add it to urls.py)')
        self.stdout.write('\n=== MANUAL TESTING ===')
        self.stdout.write('Test commands:')
        self.stdout.write('  python manage.py run_scheduled_reports --force  # Run reports now')
        self.stdout.write('  python manage.py run_scheduled_reports          # Check schedule')
        self.stdout.write('\nReports will auto-generate every Monday at 8:00 AM Philippines time!')
        self.stdout.write(self.style.SUCCESS('\n* Setup completed successfully! *'))