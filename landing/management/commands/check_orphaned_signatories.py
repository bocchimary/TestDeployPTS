from django.core.management.base import BaseCommand
from landing.models import EnrollmentSignatory, GraduationSignatory, EnrollmentForm, GraduationForm

class Command(BaseCommand):
    help = 'Check for and optionally clean up orphaned signatory records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Actually delete orphaned records (dry run by default)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Checking for orphaned signatory records...'))
        
        orphaned_count = 0
        
        # Check EnrollmentSignatory records
        enrollment_signatory_count = EnrollmentSignatory.objects.count()
        self.stdout.write(f'Total EnrollmentSignatory records: {enrollment_signatory_count}')
        
        orphaned_enrollment_signatories = []
        for signatory in EnrollmentSignatory.objects.all():
            if signatory.enrollment_id:
                try:
                    # Try to access the enrollment form
                    _ = signatory.enrollment
                except EnrollmentForm.DoesNotExist:
                    orphaned_enrollment_signatories.append(signatory)
                    orphaned_count += 1
        
        if orphaned_enrollment_signatories:
            self.stdout.write(self.style.WARNING(
                f'Found {len(orphaned_enrollment_signatories)} orphaned EnrollmentSignatory records'
            ))
            for orphan in orphaned_enrollment_signatories:
                self.stdout.write(f'  - EnrollmentSignatory ID: {orphan.id}, references non-existent enrollment: {orphan.enrollment_id}')
                if options['cleanup']:
                    orphan.delete()
                    self.stdout.write(self.style.SUCCESS(f'    DELETED'))
        else:
            self.stdout.write(self.style.SUCCESS('No orphaned EnrollmentSignatory records found'))
        
        # Check GraduationSignatory records
        graduation_signatory_count = GraduationSignatory.objects.count()
        self.stdout.write(f'Total GraduationSignatory records: {graduation_signatory_count}')
        
        orphaned_graduation_signatories = []
        for signatory in GraduationSignatory.objects.all():
            if signatory.graduation_id:
                try:
                    # Try to access the graduation form
                    _ = signatory.graduation
                except GraduationForm.DoesNotExist:
                    orphaned_graduation_signatories.append(signatory)
                    orphaned_count += 1
        
        if orphaned_graduation_signatories:
            self.stdout.write(self.style.WARNING(
                f'Found {len(orphaned_graduation_signatories)} orphaned GraduationSignatory records'
            ))
            for orphan in orphaned_graduation_signatories:
                self.stdout.write(f'  - GraduationSignatory ID: {orphan.id}, references non-existent graduation: {orphan.graduation_id}')
                if options['cleanup']:
                    orphan.delete()
                    self.stdout.write(self.style.SUCCESS(f'    DELETED'))
        else:
            self.stdout.write(self.style.SUCCESS('No orphaned GraduationSignatory records found'))
        
        # Additional verification - check reverse relationships
        enrollment_form_count = EnrollmentForm.objects.count()
        graduation_form_count = GraduationForm.objects.count()
        
        self.stdout.write(f'Total EnrollmentForm records: {enrollment_form_count}')
        self.stdout.write(f'Total GraduationForm records: {graduation_form_count}')
        
        # Verify that each form has the expected signatory records
        forms_without_signatories = 0
        
        for form in EnrollmentForm.objects.all():
            signatory_count = form.signatories.count()
            if signatory_count == 0:
                self.stdout.write(self.style.WARNING(f'EnrollmentForm {form.id} has no signatory records'))
                forms_without_signatories += 1
        
        for form in GraduationForm.objects.all():
            signatory_count = form.signatories.count()
            if signatory_count == 0:
                self.stdout.write(self.style.WARNING(f'GraduationForm {form.id} has no signatory records'))
                forms_without_signatories += 1
        
        # Summary
        if orphaned_count == 0:
            self.stdout.write(self.style.SUCCESS('PASS: No orphaned signatory records found - data integrity is good!'))
        else:
            if options['cleanup']:
                self.stdout.write(self.style.SUCCESS(f'CLEANED: {orphaned_count} orphaned signatory records'))
            else:
                self.stdout.write(self.style.WARNING(
                    f'FOUND: {orphaned_count} orphaned signatory records. Run with --cleanup to remove them.'
                ))
        
        if forms_without_signatories == 0:
            self.stdout.write(self.style.SUCCESS('PASS: All forms have signatory records'))
        else:
            self.stdout.write(self.style.WARNING(f'FOUND: {forms_without_signatories} forms without signatory records'))
        
        self.stdout.write(self.style.SUCCESS('Data integrity check complete!'))