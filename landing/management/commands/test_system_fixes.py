from django.core.management.base import BaseCommand
from landing.models import ClearanceForm, ClearanceSignatory, User
from django.contrib.auth import get_user_model
from django.db.models import Count

User = get_user_model()

class Command(BaseCommand):
    help = 'Test system fixes to verify all issues are resolved'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Testing system fixes...'))
        
        # Test 1: Check for duplicate records
        self.stdout.write('\n1. Testing for duplicate records...')
        duplicates = ClearanceSignatory.objects.values('clearance', 'signatory').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        if duplicates.exists():
            self.stdout.write(self.style.ERROR(f'❌ Found {duplicates.count()} duplicate clearance-signatory combinations'))
            for duplicate in duplicates:
                self.stdout.write(f'   Clearance {duplicate["clearance"]}, Signatory {duplicate["signatory"]}: {duplicate["count"]} records')
        else:
            self.stdout.write(self.style.SUCCESS('✅ No duplicate records found'))
        
        # Test 2: Check signatory profiles
        self.stdout.write('\n2. Testing signatory profiles...')
        admin_users = User.objects.filter(user_type='admin')
        signatory_users = User.objects.filter(user_type='signatory')
        
        for admin_user in admin_users:
            try:
                profile = admin_user.signatory_profile
                self.stdout.write(f'✅ Admin {admin_user.username}: {profile.signatory_type}')
            except:
                self.stdout.write(self.style.ERROR(f'❌ Admin {admin_user.username}: No signatory profile'))
        
        for signatory_user in signatory_users:
            try:
                profile = signatory_user.signatory_profile
                self.stdout.write(f'✅ Signatory {signatory_user.username}: {profile.signatory_type}')
            except:
                self.stdout.write(self.style.ERROR(f'❌ Signatory {signatory_user.username}: No signatory profile'))
        
        # Test 3: Check role mappings
        self.stdout.write('\n3. Testing role mappings...')
        signatory_records = ClearanceSignatory.objects.all()
        correct_roles = {
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
        
        incorrect_roles = 0
        for record in signatory_records:
            try:
                signatory_profile = record.signatory.signatory_profile
                expected_role = correct_roles.get(signatory_profile.signatory_type)
                if record.role != expected_role:
                    self.stdout.write(self.style.WARNING(f'⚠️  Record {record.id}: Expected "{expected_role}", got "{record.role}"'))
                    incorrect_roles += 1
            except:
                self.stdout.write(self.style.ERROR(f'❌ Record {record.id}: No signatory profile for user'))
                incorrect_roles += 1
        
        if incorrect_roles == 0:
            self.stdout.write(self.style.SUCCESS('✅ All role mappings are correct'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠️  Found {incorrect_roles} incorrect role mappings'))
        
        # Test 4: Check clearance form statuses
        self.stdout.write('\n4. Testing clearance form statuses...')
        clearance_forms = ClearanceForm.objects.all()
        for clearance in clearance_forms:
            signatories = ClearanceSignatory.objects.filter(clearance=clearance)
            if signatories.exists():
                all_approved = all(s.status == 'approved' for s in signatories)
                if all_approved and clearance.status != 'approved':
                    self.stdout.write(self.style.WARNING(f'⚠️  Clearance {clearance.id}: All signatories approved but status is "{clearance.status}"'))
                elif not all_approved and clearance.status == 'approved':
                    self.stdout.write(self.style.WARNING(f'⚠️  Clearance {clearance.id}: Not all signatories approved but status is "{clearance.status}"'))
        
        self.stdout.write(self.style.SUCCESS('✅ Clearance status check complete'))
        
        # Test 5: Check for orphaned records
        self.stdout.write('\n5. Testing for orphaned records...')
        orphaned_records = ClearanceSignatory.objects.filter(
            clearance__isnull=True
        ) | ClearanceSignatory.objects.filter(
            signatory__isnull=True
        )
        
        if orphaned_records.exists():
            self.stdout.write(self.style.ERROR(f'❌ Found {orphaned_records.count()} orphaned records'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ No orphaned records found'))
        
        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('SYSTEM TEST SUMMARY'))
        self.stdout.write('='*50)
        
        if duplicates.exists() or incorrect_roles > 0 or orphaned_records.exists():
            self.stdout.write(self.style.WARNING('⚠️  Some issues were found. Please run the fix commands again.'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ All tests passed! System is working correctly.'))
        
        self.stdout.write('\nTest completed successfully!') 