from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from landing.models import (
    SignatoryActivityLog, GeneratedReport, ClearanceForm, 
    EnrollmentForm, User
)
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
import os
from django.conf import settings
import zipfile
import io


class Command(BaseCommand):
    help = 'Generate per-signatory report pack for a specific week and report type'

    def add_arguments(self, parser):
        parser.add_argument(
            '--week',
            type=str,
            required=True,
            help='Week start date (YYYY-MM-DD format for Monday)',
        )
        parser.add_argument(
            '--report-type',
            type=str,
            required=True,
            choices=['clearance', 'enrollment', 'graduation', 'document_release'],
            help='Type of report to generate pack for',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force regeneration even if pack already exists',
        )

    def handle(self, *args, **options):
        try:
            start_date = datetime.strptime(options['week'], '%Y-%m-%d').date()
            if start_date.weekday() != 0:
                self.stdout.write(
                    self.style.ERROR('Week date must be a Monday')
                )
                return
        except ValueError:
            self.stdout.write(
                self.style.ERROR('Invalid week date format. Use YYYY-MM-DD')
            )
            return

        end_date = start_date + timedelta(days=6)  # Sunday
        report_type = options['report_type']
        pack_type = f"{report_type}_pack"
        
        self.stdout.write(
            f'Generating {report_type} signatory pack for period: {start_date} to {end_date}'
        )
        
        # Check if pack already exists (caching)
        existing_pack = GeneratedReport.objects.filter(
            report_type=pack_type,
            period_start=start_date,
            period_end=end_date,
        ).first()
        
        if existing_pack and not options['force']:
            if existing_pack.file_exists:
                self.stdout.write(
                    self.style.WARNING(
                        f'Pack already exists and is cached. Use --force to regenerate.'
                    )
                )
                return
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Pack record exists but file missing. Regenerating...'
                    )
                )
        
        # Generate the pack
        success, pack_info = self.generate_signatory_pack(
            report_type, start_date, end_date, pack_type
        )
        
        if success:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Generated {report_type} signatory pack: {pack_info["total_files"]} files, '
                    f'{pack_info["file_size"]} bytes'
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(
                    f'Failed to generate {report_type} signatory pack'
                )
            )
    
    def generate_signatory_pack(self, report_type, start_date, end_date, pack_type):
        """Generate a ZIP pack containing individual signatory reports"""
        try:
            # Get all signatories
            signatories = User.objects.filter(user_type='signatory')
            
            # Create ZIP buffer
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                files_added = 0
                
                for signatory in signatories:
                    # Get signatory-specific data for the report type
                    signatory_data = self.get_signatory_data(
                        signatory, report_type, start_date, end_date
                    )
                    
                    # Generate individual signatory report HTML
                    context = {
                        'signatory': signatory,
                        'report_type': report_type,
                        'period_start': start_date,
                        'period_end': end_date,
                        'signatory_data': signatory_data,
                        'total_activities': len(signatory_data),
                        'generated_at': timezone.now(),
                    }
                    
                    # Render report using template
                    template = 'pdf/signatory-pack-report.html'
                    html_content = render_to_string(template, context)
                    
                    # Add to ZIP
                    filename = f"{signatory.full_name.replace(' ', '_')}_{report_type}_report_{start_date}_{end_date}.html"
                    zip_file.writestr(filename, html_content.encode('utf-8'))
                    files_added += 1
                
                # Add pack summary file
                summary_context = {
                    'report_type': report_type,
                    'period_start': start_date,
                    'period_end': end_date,
                    'total_signatories': len(signatories),
                    'total_files': files_added,
                    'generated_at': timezone.now(),
                }
                
                summary_html = render_to_string('pdf/pack-summary.html', summary_context)
                zip_file.writestr('PACK_SUMMARY.html', summary_html.encode('utf-8'))
                files_added += 1
            
            # Get ZIP content
            zip_content = zip_buffer.getvalue()
            zip_buffer.close()
            
            # Calculate checksum  
            import hashlib
            checksum = hashlib.sha256(zip_content).hexdigest()
            
            # Save to database
            filename = f"{report_type}_signatory_pack_{start_date}_{end_date}.zip"
            content_file = ContentFile(zip_content, name=filename)
            
            # Create or update pack record with proper status tracking
            pack, created = GeneratedReport.objects.update_or_create(
                report_type=pack_type,
                period_start=start_date,
                period_end=end_date,
                defaults={
                    'file': content_file,
                    'size_bytes': len(zip_content),
                    'checksum': checksum,
                    'status': 'completed',
                    'notes': f'Per-signatory {report_type} pack with {files_added} files',
                }
            )
            
            if not created:
                # Update existing record
                pack.file = content_file
                pack.size_bytes = len(zip_content) 
                pack.checksum = checksum
                pack.status = 'completed'
                pack.notes = f'Per-signatory {report_type} pack with {files_added} files (regenerated)'
                pack.save()
            
            return True, {
                'total_files': files_added,
                'file_size': len(zip_content),
                'pack_id': str(pack.id)
            }
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating signatory pack: {str(e)}')
            )
            return False, None
    
    def get_signatory_data(self, signatory, report_type, start_date, end_date):
        """Get signatory-specific activity data for the report type"""
        # Get signatory activity logs for the period
        activities = SignatoryActivityLog.objects.filter(
            signatory=signatory,
            created_at__date__range=[start_date, end_date]
        ).select_related('signatory')
        
        # Filter by report type if needed
        if report_type == 'clearance':
            # Get clearance-related activities
            activities = activities.filter(
                form_type__icontains='clearance'
            )
        elif report_type == 'enrollment':
            # Get enrollment-related activities
            activities = activities.filter(
                form_type__icontains='enrollment'
            )
        elif report_type == 'graduation':
            # Get graduation-related activities
            activities = activities.filter(
                form_type__icontains='graduation'
            )
        elif report_type == 'document_release':
            # Get document release-related activities
            activities = activities.filter(
                form_type__icontains='document'
            )
        
        return activities.order_by('-created_at')