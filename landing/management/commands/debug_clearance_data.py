from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from landing.models import ClearanceForm, ClearanceSignatory, SignatoryProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Debug and fix clearance data issues'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Fix data issues automatically',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting clearance data debug...'))
        
        # Check for clearance forms without signatory records
        clearance_forms = ClearanceForm.objects.all()
        self.stdout.write(f'Total clearance forms: {clearance_forms.count()}')
        
        for clearance in clearance_forms:
            signatory_records = ClearanceSignatory.objects.filter(clearance=clearance)
            self.stdout.write(f'Clearance {clearance.id}: {signatory_records.count()} signatory records')
            
            if options['fix'] and signatory_records.count() == 0:
                self.stdout.write(f'Creating signatory records for clearance {clearance.id}')
                self.create_signatory_records(clearance)
        
        # Check for signatories without profiles
        signatories = User.objects.filter(user_type='signatory')
        self.stdout.write(f'Total signatories: {signatories.count()}')
        
        for signatory in signatories:
            try:
                profile = signatory.signatory_profile
                self.stdout.write(f'Signatory {signatory.username}: has profile ({profile.signatory_type})')
            except SignatoryProfile.DoesNotExist:
                self.stdout.write(f'Signatory {signatory.username}: NO PROFILE')
                if options['fix']:
                    self.stdout.write(f'Creating profile for signatory {signatory.username}')
                    self.create_signatory_profile(signatory)
        
        self.stdout.write(self.style.SUCCESS('Debug complete!'))

    def create_signatory_records(self, clearance):
        """Create signatory records for a clearance if they don't exist"""
        from landing.models import ClearanceSignatory
        
        # Get all signatory types
        signatory_types = [
            'dorm_supervisor', 'canteen_concessionaire', 'library_director', 
            'scholarship_director', 'it_director', 'student_affairs', 
            'cashier', 'business_manager', 'registrar', 'academic_dean'
        ]
        
        for signatory_type in signatory_types:
            # Find a signatory of this type
            try:
                signatory_user = User.objects.filter(
                    user_type='signatory',
                    signatory_profile__signatory_type=signatory_type
                ).first()
                
                if signatory_user:
                    # Create the record if it doesn't exist
                    ClearanceSignatory.objects.get_or_create(
                        clearance=clearance,
                        signatory=signatory_user,
                        defaults={
                            'status': 'pending',
                            'seen_by_signatory': False
                        }
                    )
            except Exception as e:
                self.stdout.write(f'Error creating record for {signatory_type}: {e}')

    def create_signatory_profile(self, signatory):
        """Create a signatory profile for a user"""
        from landing.models import SignatoryProfile
        
        # Assign a default signatory type
        SignatoryProfile.objects.create(
            user=signatory,
            signatory_type='registrar',  # Default to registrar
            pin_set=False,
            force_password_change=True
        ) 