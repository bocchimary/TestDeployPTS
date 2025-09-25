from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from landing.models import SignatoryProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Create signatory accounts for all signatory types'

    def handle(self, *args, **options):
        self.stdout.write('Creating signatory accounts for all types...')
        
        # Define all signatory types and their details
        signatory_types = {
            'dorm_supervisor': {
                'name': 'Dorm Supervisor',
                'email': 'dorm.supervisor@pts.edu.ph',
                'password': 'dorm123'
            },
            'canteen_concessionaire': {
                'name': 'Canteen Concessionaire',
                'email': 'canteen@pts.edu.ph',
                'password': 'canteen123'
            },
            'library_director': {
                'name': 'Library Director',
                'email': 'library@pts.edu.ph',
                'password': 'library123'
            },
            'scholarship_director': {
                'name': 'Scholarship Director',
                'email': 'scholarship@pts.edu.ph',
                'password': 'scholarship123'
            },
            'it_director': {
                'name': 'IT Director',
                'email': 'it@pts.edu.ph',
                'password': 'it123'
            },
            'student_affairs': {
                'name': 'Dean of Student Affairs',
                'email': 'student.affairs@pts.edu.ph',
                'password': 'affairs123'
            },
            'cashier': {
                'name': 'Cashier',
                'email': 'cashier@pts.edu.ph',
                'password': 'cashier123'
            },
            'business_manager': {
                'name': 'Business Manager',
                'email': 'business@pts.edu.ph',
                'password': 'business123'
            },
            'registrar': {
                'name': 'Registrar',
                'email': 'registrar@pts.edu.ph',
                'password': 'registrar123'
            },
            'academic_dean': {
                'name': 'Academic Dean',
                'email': 'academic@pts.edu.ph',
                'password': 'academic123'
            }
        }
        
        created_count = 0
        
        for signatory_type, details in signatory_types.items():
            # Check if signatory already exists
            existing_user = User.objects.filter(email=details['email']).first()
            if existing_user:
                self.stdout.write(f'Signatory already exists: {details["name"]} ({signatory_type})')
                continue
            
            # Create new signatory user
            user = User.objects.create_user(
                username=details['email'],
                email=details['email'],
                password=details['password'],
                full_name=details['name'],
                user_type='signatory'
            )
            
            # Create signatory profile
            SignatoryProfile.objects.create(
                user=user,
                signatory_type=signatory_type,
                pin_set=False,  # They'll need to set up PIN on first login
                force_password_change=True  # They'll need to change password on first login
            )
            
            created_count += 1
            self.stdout.write(f'Created signatory: {details["name"]} ({signatory_type}) - Email: {details["email"]} - Password: {details["password"]}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} new signatory accounts.\n'
                f'Total signatories in database: {User.objects.filter(user_type="signatory").count()}'
            )
        ) 