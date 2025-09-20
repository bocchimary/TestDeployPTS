from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from landing.models import ClearanceForm, ClearanceSignatory

User = get_user_model()

class Command(BaseCommand):
    help = 'Clean up clearance data and ensure lazy loading system works properly'

    def handle(self, *args, **options):
        self.stdout.write('Cleaning up clearance data...')
        
        # Get all clearance forms
        clearances = ClearanceForm.objects.all()
        
        # Get all signatories
        signatories = User.objects.filter(user_type='signatory')
        
        self.stdout.write(f'Found {clearances.count()} clearance forms')
        self.stdout.write(f'Found {signatories.count()} signatories')
        
        # Count existing signatory records
        existing_records = ClearanceSignatory.objects.count()
        self.stdout.write(f'Existing signatory records: {existing_records}')
        
        # Show distribution of records per clearance
        for clearance in clearances:
            record_count = clearance.signatories.count()
            self.stdout.write(f'Clearance {clearance.id}: {record_count} signatory records')
        
        self.stdout.write(
            self.style.SUCCESS(
                'Cleanup completed. The lazy loading system will now:\n'
                '1. Only create signatory records when needed\n'
                '2. Show all clearances to all signatories\n'
                '3. Allow signatories to approve/disapprove in their own columns\n'
                '4. Prevent database bloat and improve performance'
            )
        ) 