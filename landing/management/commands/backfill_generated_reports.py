from django.core.management.base import BaseCommand
from django.conf import settings
from landing.models import GeneratedReport
import os
import hashlib
from datetime import datetime
import pytz


class Command(BaseCommand):
    help = 'Backfill legacy report files into GeneratedReport database records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force overwrite existing database records',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        self.stdout.write('Starting backfill of legacy report files...')
        
        # Define reports directory
        reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
        
        if not os.path.exists(reports_dir):
            self.stdout.write(
                self.style.WARNING(f'Reports directory does not exist: {reports_dir}')
            )
            return
        
        # Scan for files
        backfilled_count = 0
        skipped_count = 0
        error_count = 0
        
        for root, dirs, files in os.walk(reports_dir):
            for file in files:
                if not file.endswith(('.html', '.zip')):
                    continue
                    
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, settings.MEDIA_ROOT)
                
                try:
                    result = self.process_file(file_path, relative_path, dry_run, force)
                    if result == 'backfilled':
                        backfilled_count += 1
                    elif result == 'skipped':
                        skipped_count += 1
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'Error processing {file}: {str(e)}')
                    )
        
        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'Backfill complete: {backfilled_count} files processed, '
                f'{skipped_count} skipped, {error_count} errors'
            )
        )

    def process_file(self, file_path, relative_path, dry_run, force):
        """Process a single file for backfill"""
        filename = os.path.basename(file_path)
        
        # Determine report type from filename patterns
        report_type = self.determine_report_type(filename)
        if not report_type:
            self.stdout.write(f'Skipping unknown file type: {filename}')
            return 'skipped'
        
        # Check if record already exists
        existing = GeneratedReport.objects.filter(
            file=relative_path.replace('\\', '/')
        ).first()
        
        if existing and not force:
            self.stdout.write(f'Skipping existing record: {filename}')
            return 'skipped'
        
        # Get file stats
        file_size = os.path.getsize(file_path)
        file_mtime = datetime.fromtimestamp(
            os.path.getmtime(file_path), 
            tz=pytz.timezone('Asia/Manila')
        )
        
        # Calculate checksum
        checksum = self.calculate_checksum(file_path)
        
        # Determine period dates from filename if possible
        period_start, period_end = self.extract_period_from_filename(filename)
        
        # Determine if it's auto-generated (weekly reports) or manual
        generated_by = None
        if 'manual' in filename.lower() or 'registrar' in filename.lower():
            # Try to find admin/registrar user for manual reports
            from landing.models import User
            generated_by = User.objects.filter(user_type__in=['admin', 'registrar']).first()
        
        if dry_run:
            self.stdout.write(
                f'Would create: {report_type} - {filename} ({file_size} bytes, {checksum[:8]}...)'
            )
            return 'backfilled'
        
        # Create or update the record
        if existing:
            report = existing
            self.stdout.write(f'Updating existing record: {filename}')
        else:
            report = GeneratedReport()
            self.stdout.write(f'Creating new record: {filename}')
        
        report.report_type = report_type
        report.file = relative_path.replace('\\', '/')
        report.size_bytes = file_size
        report.checksum = checksum
        report.generated_by = generated_by
        report.created_at = file_mtime
        report.period_start = period_start
        report.period_end = period_end
        report.status = 'completed'
        report.notes = f'Backfilled from legacy file: {filename}'
        
        report.save()
        
        return 'backfilled'

    def determine_report_type(self, filename):
        """Determine report type from filename"""
        filename_lower = filename.lower()
        
        if 'clearance_pack' in filename_lower or 'clearance_signatory_pack' in filename_lower:
            return 'clearance_pack'
        elif 'enrollment_pack' in filename_lower or 'enrollment_signatory_pack' in filename_lower:
            return 'enrollment_pack'
        elif 'graduation_pack' in filename_lower or 'graduation_signatory_pack' in filename_lower:
            return 'graduation_pack'
        elif 'clearance' in filename_lower:
            return 'clearance'
        elif 'enrollment' in filename_lower:
            return 'enrollment'
        elif 'graduation' in filename_lower:
            return 'graduation'
        elif 'document_release' in filename_lower or 'released' in filename_lower:
            return 'document_release'
        elif 'manual' in filename_lower or 'registrar' in filename_lower:
            return 'manual_activity'
        
        return None

    def extract_period_from_filename(self, filename):
        """Try to extract period dates from filename"""
        import re
        
        # Look for date patterns like YYYY-MM-DD
        date_pattern = r'(\d{4})-(\d{2})-(\d{2})'
        dates = re.findall(date_pattern, filename)
        
        if len(dates) >= 2:
            try:
                start_date = datetime(int(dates[0][0]), int(dates[0][1]), int(dates[0][2])).date()
                end_date = datetime(int(dates[1][0]), int(dates[1][1]), int(dates[1][2])).date()
                return start_date, end_date
            except ValueError:
                pass
        elif len(dates) == 1:
            try:
                # Single date, assume it's the start of a week
                start_date = datetime(int(dates[0][0]), int(dates[0][1]), int(dates[0][2])).date()
                return start_date, None
            except ValueError:
                pass
        
        return None, None

    def calculate_checksum(self, file_path):
        """Calculate SHA-256 checksum of file"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()