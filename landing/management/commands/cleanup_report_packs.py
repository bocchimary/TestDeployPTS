from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from landing.models import GeneratedReport


class Command(BaseCommand):
    help = 'Clean up old signatory report packs and optionally mark old reports as archived'

    def add_arguments(self, parser):
        parser.add_argument(
            '--retention-weeks',
            type=int,
            default=4,
            help='Keep packs for this many weeks (default: 4)',
        )
        parser.add_argument(
            '--archive-weeks',
            type=int,
            default=12,
            help='Archive reports older than this many weeks (default: 12)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without making changes',
        )
        parser.add_argument(
            '--packs-only',
            action='store_true',
            help='Only cleanup packs, not individual reports',
        )

    def handle(self, *args, **options):
        retention_weeks = options['retention_weeks']
        archive_weeks = options['archive_weeks']
        dry_run = options['dry_run']
        packs_only = options['packs_only']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Calculate cutoff dates
        pack_cutoff = timezone.now() - timedelta(weeks=retention_weeks)
        archive_cutoff = timezone.now() - timedelta(weeks=archive_weeks)
        
        # Clean up old packs
        pack_deleted_count = self.cleanup_old_packs(pack_cutoff, dry_run)
        
        # Archive old reports (if not packs-only)
        archive_count = 0
        if not packs_only:
            archive_count = self.archive_old_reports(archive_cutoff, dry_run)
        
        # Summary
        action = "Would delete" if dry_run else "Deleted"
        self.stdout.write(
            self.style.SUCCESS(
                f'{action} {pack_deleted_count} old pack files '
                f'(older than {retention_weeks} weeks)'
            )
        )
        
        if not packs_only:
            action = "Would archive" if dry_run else "Archived"
            self.stdout.write(
                self.style.SUCCESS(
                    f'{action} {archive_count} old report records '
                    f'(older than {archive_weeks} weeks)'
                )
            )

    def cleanup_old_packs(self, cutoff_date, dry_run):
        """Remove old signatory pack files and records"""
        old_packs = GeneratedReport.objects.filter(
            report_type__endswith='_pack',
            created_at__lt=cutoff_date
        )
        
        deleted_count = 0
        for pack in old_packs:
            if dry_run:
                self.stdout.write(f'Would delete pack: {pack.filename} ({pack.created_at})')
            else:
                # Delete the file first
                if pack.file:
                    try:
                        pack.file.delete(save=False)
                        self.stdout.write(f'Deleted file: {pack.filename}')
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'Could not delete file {pack.filename}: {e}')
                        )
                
                # Delete the database record
                pack.delete()
                self.stdout.write(f'Deleted pack record: {pack.filename}')
            
            deleted_count += 1
        
        return deleted_count

    def archive_old_reports(self, cutoff_date, dry_run):
        """Mark old reports as archived (add archive flag to notes)"""
        old_reports = GeneratedReport.objects.filter(
            created_at__lt=cutoff_date,
            notes__isnull=False
        ).exclude(
            notes__icontains='[ARCHIVED]'
        ).exclude(
            report_type__endswith='_pack'  # Don't archive packs, delete them
        )
        
        archive_count = 0
        for report in old_reports:
            if dry_run:
                self.stdout.write(f'Would archive report: {report.filename} ({report.created_at})')
            else:
                # Add archive marker to notes
                report.notes = f'[ARCHIVED] {report.notes or ""}'
                report.save()
                self.stdout.write(f'Archived report: {report.filename}')
            
            archive_count += 1
        
        return archive_count