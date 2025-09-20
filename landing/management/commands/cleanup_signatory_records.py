from django.core.management.base import BaseCommand
from landing.models import ClearanceForm, ClearanceSignatory, User, SignatoryProfile
from django.contrib.auth import get_user_model
from django.db.models import Count

User = get_user_model()

class Command(BaseCommand):
    help = 'Thoroughly clean up and properly set up signatory records'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting thorough signatory records cleanup...'))
        
        # Step 1: Remove ALL existing signatory records
        self.stdout.write('\n1. Removing all existing signatory records...')
        total_existing = ClearanceSignatory.objects.count()
        ClearanceSignatory.objects.all().delete()
        self.stdout.write(f'  Removed {total_existing} existing records')
        
        # Step 2: Get all signatory types and users
        signatory_types = [
            'dorm_supervisor', 'canteen_concessionaire', 'library_director', 'scholarship_director',
            'it_director', 'student_affairs', 'cashier', 'business_manager', 'registrar', 'academic_dean'
        ]
        
        signatory_users = {}
        for signatory_type in signatory_types:
            user = User.objects.filter(
                user_type='signatory',
                signatory_profile__signatory_type=signatory_type
            ).first()
            if user:
                signatory_users[signatory_type] = user
                self.stdout.write(f'  Found signatory for {signatory_type}: {user.username}')
            else:
                self.stdout.write(f'  Warning: No signatory found for {signatory_type}')
        
        # Step 3: Create proper records for each clearance
        self.stdout.write('\n2. Creating proper signatory records...')
        clearance_forms = ClearanceForm.objects.all()
        records_created = 0
        
        for clearance in clearance_forms:
            self.stdout.write(f'  Processing clearance {clearance.id} for {clearance.student.full_name}')
            
            for signatory_type, signatory_user in signatory_users.items():
                role_name = {
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
                }.get(signatory_type, signatory_type.replace('_', ' ').title())
                
                ClearanceSignatory.objects.create(
                    clearance=clearance,
                    signatory=signatory_user,
                    status='pending',
                    role=role_name,
                    seen_by_signatory=False
                )
                records_created += 1
            
            self.stdout.write(f'    Created {len(signatory_users)} records for this clearance')
        
        # Step 4: Verify the setup
        self.stdout.write('\n3. Verifying setup...')
        
        # Check for duplicates
        duplicates = ClearanceSignatory.objects.values('clearance', 'signatory').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        if duplicates.exists():
            self.stdout.write(self.style.ERROR(f'  ❌ Found {duplicates.count()} duplicates'))
        else:
            self.stdout.write(self.style.SUCCESS('  ✅ No duplicates found'))
        
        # Check coverage
        for clearance in clearance_forms:
            signatory_count = ClearanceSignatory.objects.filter(clearance=clearance).count()
            expected_count = len(signatory_users)
            if signatory_count == expected_count:
                self.stdout.write(f'  ✅ Clearance {clearance.id}: {signatory_count}/{expected_count} records')
            else:
                self.stdout.write(self.style.WARNING(f'  ⚠️  Clearance {clearance.id}: {signatory_count}/{expected_count} records'))
        
        # Step 5: Update clearance statuses
        self.stdout.write('\n4. Updating clearance statuses...')
        status_updates = 0
        
        for clearance in clearance_forms:
            signatories = ClearanceSignatory.objects.filter(clearance=clearance)
            
            if signatories.exists():
                all_approved = all(s.status == 'approved' for s in signatories)
                any_disapproved = any(s.status == 'disapproved' for s in signatories)
                
                if all_approved and clearance.status != 'approved':
                    clearance.status = 'approved'
                    clearance.save()
                    status_updates += 1
                    self.stdout.write(f'  Updated clearance {clearance.id}: status -> approved')
                elif any_disapproved and clearance.status != 'pending':
                    clearance.status = 'pending'
                    clearance.save()
                    status_updates += 1
                    self.stdout.write(f'  Updated clearance {clearance.id}: status -> pending')
        
        self.stdout.write(self.style.SUCCESS('\nCleanup completed successfully!'))
        self.stdout.write(f'Summary:')
        self.stdout.write(f'  - Records removed: {total_existing}')
        self.stdout.write(f'  - Records created: {records_created}')
        self.stdout.write(f'  - Status updates: {status_updates}')
        self.stdout.write(f'  - Signatory types: {len(signatory_users)}')
        self.stdout.write(f'  - Clearance forms: {clearance_forms.count()}') 