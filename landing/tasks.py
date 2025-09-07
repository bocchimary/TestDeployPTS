from celery import shared_task
from django.core.management import call_command
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def generate_weekly_reports_task(self):
    """
    Master task to coordinate all weekly report generation every Monday at 08:00 Asia/Manila
    Triggers separate reports for signatory, business manager, and registrar modules
    """
    try:
        # Calculate previous week's Monday-Sunday
        ph_tz = pytz.timezone('Asia/Manila')
        now = datetime.now(ph_tz)
        
        # Get last Monday (start of previous week)
        days_since_monday = now.weekday()
        last_monday = (now - timedelta(days=days_since_monday + 7)).date()
        last_sunday = last_monday + timedelta(days=6)
        
        logger.info(f'Starting coordinated weekly report generation for period: {last_monday} to {last_sunday}')
        
        # Run all report generation tasks simultaneously
        results = []
        
        # Generate signatory reports
        signatory_result = generate_signatory_weekly_report.delay(last_monday.strftime('%Y-%m-%d'))
        results.append(('signatory', signatory_result.id))
        
        # Generate business manager reports  
        business_manager_result = generate_business_manager_weekly_report.delay(last_monday.strftime('%Y-%m-%d'))
        results.append(('business_manager', business_manager_result.id))
        
        # Generate registrar/admin reports
        registrar_result = generate_registrar_weekly_report.delay(last_monday.strftime('%Y-%m-%d'))
        results.append(('registrar', registrar_result.id))
        
        # Log success
        logger.info(f'All weekly report tasks scheduled successfully for {last_monday} to {last_sunday}')
        
        return {
            'status': 'success',
            'message': f'All weekly report tasks scheduled for {last_monday} to {last_sunday}',
            'period_start': last_monday.isoformat(),
            'period_end': last_sunday.isoformat(),
            'scheduled_tasks': results,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f'Failed to coordinate weekly reports: {str(e)}', exc_info=True)
        
        # Re-raise exception so Celery marks task as failed
        raise self.retry(exc=e, countdown=300, max_retries=3)  # Retry after 5 minutes, max 3 times

@shared_task(bind=True)
def generate_signatory_weekly_report(self, week_start_date):
    """Generate signatory-specific weekly reports"""
    try:
        from django.core.management import call_command
        
        logger.info(f'Generating signatory weekly reports for week: {week_start_date}')
        
        # Call management command for signatory reports
        call_command(
            'generate_signatory_weekly_reports',
            week=week_start_date,
            stdout=None
        )
        
        # Send email notification about report generation
        try:
            from datetime import datetime
            from landing.notification_service import NotificationService
            
            week_start = datetime.strptime(week_start_date, '%Y-%m-%d').date()
            week_end = week_start + timedelta(days=6)
            
            NotificationService.notify_weekly_report_generated(
                report_type='signatory',
                period_start=week_start,
                period_end=week_end,
                report_url='/signatory/reports/'
            )
            logger.info('Signatory weekly report email notifications sent')
        except Exception as e:
            logger.error(f'Failed to send signatory report email notifications: {str(e)}')
        
        return {
            'status': 'success',
            'module': 'signatory',
            'week': week_start_date,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f'Failed to generate signatory weekly reports: {str(e)}', exc_info=True)
        raise self.retry(exc=e, countdown=180, max_retries=2)

@shared_task(bind=True)
def generate_business_manager_weekly_report(self, week_start_date):
    """Generate business manager-specific weekly reports"""
    try:
        from django.core.management import call_command
        
        logger.info(f'Generating business manager weekly reports for week: {week_start_date}')
        
        # Call management command for business manager reports
        call_command(
            'generate_business_manager_weekly_reports', 
            week=week_start_date,
            stdout=None
        )
        
        # Send email notification about report generation
        try:
            from datetime import datetime
            from landing.notification_service import NotificationService
            
            week_start = datetime.strptime(week_start_date, '%Y-%m-%d').date()
            week_end = week_start + timedelta(days=6)
            
            NotificationService.notify_weekly_report_generated(
                report_type='business_manager',
                period_start=week_start,
                period_end=week_end,
                report_url='/business-manager/reports/'
            )
            logger.info('Business manager weekly report email notifications sent')
        except Exception as e:
            logger.error(f'Failed to send business manager report email notifications: {str(e)}')
        
        return {
            'status': 'success', 
            'module': 'business_manager',
            'week': week_start_date,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f'Failed to generate business manager weekly reports: {str(e)}', exc_info=True)
        raise self.retry(exc=e, countdown=180, max_retries=2)

@shared_task(bind=True)
def generate_registrar_weekly_report(self, week_start_date):
    """Generate registrar/admin-specific weekly reports"""
    try:
        from django.core.management import call_command
        
        logger.info(f'Generating registrar weekly reports for week: {week_start_date}')
        
        # Call management command for registrar reports
        call_command(
            'generate_registrar_weekly_reports',
            week=week_start_date, 
            stdout=None
        )
        
        # Send email notification about report generation
        try:
            from datetime import datetime
            from landing.notification_service import NotificationService
            
            week_start = datetime.strptime(week_start_date, '%Y-%m-%d').date()
            week_end = week_start + timedelta(days=6)
            
            NotificationService.notify_weekly_report_generated(
                report_type='registrar',
                period_start=week_start,
                period_end=week_end,
                report_url='/registrar/reports/'
            )
            logger.info('Registrar weekly report email notifications sent')
        except Exception as e:
            logger.error(f'Failed to send registrar report email notifications: {str(e)}')
        
        return {
            'status': 'success',
            'module': 'registrar',
            'week': week_start_date,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f'Failed to generate registrar weekly reports: {str(e)}', exc_info=True)
        raise self.retry(exc=e, countdown=180, max_retries=2)

@shared_task(bind=True)
def send_daily_digest_task(self):
    """
    Send daily digest emails to signatories, admins, and business managers
    Runs daily in the evening to provide summary of pending items
    """
    try:
        from landing.notification_service import NotificationService
        
        logger.info('Starting daily digest email task')
        
        # Send daily digest emails
        NotificationService.send_daily_digest()
        
        logger.info('Daily digest emails sent successfully')
        
        return {
            'status': 'success',
            'message': 'Daily digest emails sent successfully',
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f'Failed to send daily digest emails: {str(e)}', exc_info=True)
        
        # Re-raise exception so Celery marks task as failed
        raise self.retry(exc=e, countdown=300, max_retries=2)  # Retry after 5 minutes, max 2 times

@shared_task
def cleanup_old_report_packs(retention_weeks=4):
    """
    Clean up old signatory packs older than retention_weeks
    """
    try:
        from landing.models import GeneratedReport
        
        cutoff_date = timezone.now() - timedelta(weeks=retention_weeks)
        
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
        
        logger.info(f'Cleaned up {deleted_count} old report packs older than {retention_weeks} weeks')
        
        return {
            'status': 'success',
            'deleted_count': deleted_count,
            'retention_weeks': retention_weeks
        }
        
    except Exception as e:
        logger.error(f'Failed to cleanup old report packs: {str(e)}', exc_info=True)
        raise e