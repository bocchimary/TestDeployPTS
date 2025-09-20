from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import logging
import pytz

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clean up old report packs older than specified weeks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--retention-weeks',
            type=int,
            default=4,
            help='Number of weeks to retain reports (default: 4)'
        )

    def handle(self, *args, **options):
        """
        Clean up old signatory packs - cron replacement for Celery task
        Run weekly on Sunday at 2:00 AM Philippines time via cron
        """
        try:
            from landing.models import GeneratedReport
            
            retention_weeks = options['retention_weeks']
            ph_tz = pytz.timezone('Asia/Manila')
            current_time = timezone.now().astimezone(ph_tz)
            cutoff_date = timezone.now() - timedelta(weeks=retention_weeks)
            
            self.stdout.write(
                self.style.SUCCESS(f'Starting cleanup of reports older than {retention_weeks} weeks at {current_time}')
            )
            
            # Find old pack reports
            old_packs = GeneratedReport.objects.filter(
                report_type__endswith='_pack',
                created_at__lt=cutoff_date
            )
            
            deleted_count = 0
            for pack in old_packs:
                if pack.file:
                    pack.file.delete(save=False)  # Delete file from storage
                pack.delete()  # Delete database record
                deleted_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(f'Cleaned up {deleted_count} old report packs older than {retention_weeks} weeks')
            )
            
            logger.info(f'Cleaned up {deleted_count} old report packs older than {retention_weeks} weeks via cron')
            
        except Exception as e:
            error_msg = f'Failed to cleanup old report packs: {str(e)}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg, exc_info=True)
            raise e
