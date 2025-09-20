from django.core.management.base import BaseCommand
from django.utils import timezone
import logging
import pytz

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Send daily digest emails to signatories, admins, and business managers'

    def handle(self, *args, **options):
        """
        Send daily digest emails - cron replacement for Celery task
        Run daily at 6:00 PM Philippines time via cron
        """
        try:
            from landing.notification_service import NotificationService
            
            ph_tz = pytz.timezone('Asia/Manila')
            current_time = timezone.now().astimezone(ph_tz)
            
            self.stdout.write(
                self.style.SUCCESS(f'Starting daily digest email task at {current_time}')
            )
            
            # Send daily digest emails
            NotificationService.send_daily_digest()
            
            self.stdout.write(
                self.style.SUCCESS('Daily digest emails sent successfully')
            )
            
            logger.info('Daily digest emails sent successfully via cron')
            
        except Exception as e:
            error_msg = f'Failed to send daily digest emails: {str(e)}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg, exc_info=True)
            raise e
