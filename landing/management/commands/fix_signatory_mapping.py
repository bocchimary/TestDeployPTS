from django.core.management.base import BaseCommand
from landing.models import ClearanceSignatory, SignatoryProfile
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix signatory type mapping and role assignments in ClearanceSignatory records'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Fixing signatory type mapping...'))
        
        # Define the correct mapping between signatory types and role names
        signatory_type_to_role = {
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
        
        # Fix role assignments based on signatory profiles
        updated_count = 0
        for signatory_record in ClearanceSignatory.objects.all():
            try:
                signatory_profile = signatory_record.signatory.signatory_profile
                correct_role = signatory_type_to_role.get(signatory_profile.signatory_type)
                
                if correct_role and signatory_record.role != correct_role:
                    old_role = signatory_record.role
                    signatory_record.role = correct_role
                    signatory_record.save()
                    self.stdout.write(f'Updated role for record {signatory_record.id}: "{old_role}" -> "{correct_role}"')
                    updated_count += 1
                    
            except Exception as e:
                self.stdout.write(f'Error processing record {signatory_record.id}: {e}')
        
        # Create missing signatory profiles for admin users
        admin_users = User.objects.filter(user_type='admin')
        for admin_user in admin_users:
            try:
                profile = admin_user.signatory_profile
                self.stdout.write(f'Admin user {admin_user.username} already has profile: {profile.signatory_type}')
            except:
                # Create signatory profile for admin
                profile = SignatoryProfile.objects.create(
                    user=admin_user,
                    signatory_type='registrar',
                    pin='1234',
                    pin_set=True,
                    force_password_change=False
                )
                self.stdout.write(f'Created signatory profile for admin {admin_user.username}: {profile.signatory_type}')
        
        # Ensure all signatory users have profiles
        signatory_users = User.objects.filter(user_type='signatory')
        for signatory_user in signatory_users:
            try:
                profile = signatory_user.signatory_profile
                self.stdout.write(f'Signatory user {signatory_user.username} has profile: {profile.signatory_type}')
            except:
                self.stdout.write(f'Warning: Signatory user {signatory_user.username} has no profile')
        
        self.stdout.write(self.style.SUCCESS(f'Signatory mapping fix complete! Updated {updated_count} records')) 