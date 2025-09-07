from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from landing.models import SignatoryProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix admin user signatory profile'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Fixing admin user signatory profile...'))
        
        # Get admin user
        try:
            admin_user = User.objects.get(username='admin')
            self.stdout.write(f'Found admin user: {admin_user.username}')
            
            # Check if signatory profile exists
            try:
                profile = admin_user.signatory_profile
                self.stdout.write(f'Admin already has profile: {profile.signatory_type}')
            except:
                # Create signatory profile for admin
                profile = SignatoryProfile.objects.create(
                    user=admin_user,
                    signatory_type='registrar',
                    pin='1234',
                    pin_set=True,
                    force_password_change=False
                )
                self.stdout.write(f'Created signatory profile for admin: {profile.signatory_type}')
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('Admin user not found'))
        
        self.stdout.write(self.style.SUCCESS('Admin profile fix complete!')) 