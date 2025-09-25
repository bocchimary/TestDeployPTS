from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from landing.models import SignatoryProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a test signatory user for testing'

    def handle(self, *args, **options):
        self.stdout.write('Creating test signatory user...')
        
        # Check if user already exists
        if User.objects.filter(username='test_signatory@test.com').exists():
            self.stdout.write(self.style.WARNING('Test signatory user already exists'))
            return
        
        # Create test signatory user
        signatory_user = User.objects.create_user(
            username='test_signatory@test.com',
            email='test_signatory@test.com',
            password='testpass123',
            full_name='Test Signatory',
            user_type='signatory'
        )
        
        # Create signatory profile with force setup
        signatory_profile = SignatoryProfile.objects.create(
            user=signatory_user,
            signatory_type='dorm_supervisor',
            pin_set=False,
            force_password_change=True
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created test signatory:\n'
                f'Username: test_signatory@test.com\n'
                f'Password: testpass123\n'
                f'Type: {signatory_profile.get_signatory_type_display()}\n'
                f'Setup Required: Yes'
            )
        ) 