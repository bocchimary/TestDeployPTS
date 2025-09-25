from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from landing.models import ClearanceForm, ClearanceSignatory, SignatoryProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Assign all existing clearances to all signatory types'

    def handle(self, *args, **options):
        self.stdout.write('Assigning clearances to all signatory types...')
        
        # Get all signatories
        signatories = User.objects.filter(user_type='signatory')
        
        if not signatories.exists():
            self.stdout.write(self.style.WARNING('No signatories found in the database.'))
            return
        
        # Get all clearance forms
        clearances = ClearanceForm.objects.all()
        
        if not clearances.exists():
            self.stdout.write(self.style.WARNING('No clearance forms found in the database.'))
            return
        
        # Define all possible signatory types and their roles
        all_signatory_types = {
            'dorm_supervisor': 'Dorm Supervisor',
            'canteen_concessionaire': 'Canteen Concessionaire',
            'library_director': 'Director of Library & Info.',
            'scholarship_director': 'Director of Scholarship',
            'it_director': 'Information Technology',
            'student_affairs': 'Dean of Student Affairs',
            'cashier': 'Cashier',
            'business_manager': 'Business Manager',
            'registrar': 'Registrar',
            'academic_dean': 'Academic Dean'
        }
        
        created_count = 0
        
        # For each clearance, ensure ALL signatory types are assigned
        for clearance in clearances:
            for signatory_type, role in all_signatory_types.items():
                # Find or create a signatory of this type
                signatory = signatories.filter(signatory_profile__signatory_type=signatory_type).first()
                
                if signatory:
                    # Create or get the ClearanceSignatory record
                    clearance_signatory, created = ClearanceSignatory.objects.get_or_create(
                        clearance=clearance,
                        signatory=signatory,
                        defaults={
                            'status': 'pending',
                            'role': role,
                            'seen_by_signatory': False
                        }
                    )
                    
                    if created:
                        created_count += 1
                        self.stdout.write(f'Created assignment: {clearance.student.full_name} -> {signatory.full_name} ({role})')
                else:
                    self.stdout.write(f'Warning: No signatory found for type "{signatory_type}"')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully assigned clearances to signatories:\n'
                f'- {clearances.count()} clearance forms\n'
                f'- {signatories.count()} signatories\n'
                f'- {created_count} new assignments created'
            )
        ) 