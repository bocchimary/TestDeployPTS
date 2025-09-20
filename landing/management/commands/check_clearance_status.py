from django.core.management.base import BaseCommand
from landing.models import ClearanceForm, ClearanceSignatory
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Check the current status of clearance data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Checking clearance data status...'))
        
        # Check clearance forms
        clearance_forms = ClearanceForm.objects.all()
        self.stdout.write(f'Total clearance forms: {clearance_forms.count()}')
        
        for clearance in clearance_forms:
            self.stdout.write(f'\nClearance {clearance.id}: {clearance.student.full_name}')
            self.stdout.write(f'  Status: {clearance.status}')
            self.stdout.write(f'  Submitted: {clearance.submitted_at}')
            
            # Check signatory records
            signatory_records = ClearanceSignatory.objects.filter(clearance=clearance)
            self.stdout.write(f'  Signatory records: {signatory_records.count()}')
            
            for record in signatory_records:
                try:
                    signatory_type = record.signatory.signatory_profile.signatory_type
                except:
                    signatory_type = "NO PROFILE"
                
                self.stdout.write(f'    - {record.signatory.username} ({signatory_type}): {record.status}')
        
        # Check signatories
        signatories = User.objects.filter(user_type='signatory')
        self.stdout.write(f'\nTotal signatories: {signatories.count()}')
        
        for signatory in signatories:
            try:
                profile = signatory.signatory_profile
                self.stdout.write(f'  {signatory.username}: {profile.signatory_type}')
            except:
                self.stdout.write(f'  {signatory.username}: NO PROFILE')
        
        self.stdout.write(self.style.SUCCESS('\nStatus check complete!')) 