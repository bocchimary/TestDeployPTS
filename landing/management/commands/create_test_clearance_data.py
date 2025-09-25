from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from landing.models import StudentProfile, SignatoryProfile, ClearanceForm, ClearanceSignatory
import uuid

User = get_user_model()

class Command(BaseCommand):
    help = 'Create test clearance data for signatory testing'

    def handle(self, *args, **options):
        self.stdout.write('Creating test clearance data...')
        
        # Create test students
        students = []
        for i in range(5):
            student_user = User.objects.create_user(
                username=f'student{i+1}@test.com',
                email=f'student{i+1}@test.com',
                password='testpass123',
                full_name=f'Student {i+1}',
                user_type='student'
            )
            
            profile = StudentProfile.objects.create(
                user=student_user,
                student_number=f'PTS-00-{1000+i:04d}',
                program=['BET-COET', 'AMTh'][i % 2],
                year_level=(i % 3) + 1
            )
            students.append(student_user)
        
        # Create test signatories
        signatory_types = [
            'dorm_supervisor', 'canteen_concessionaire', 'library_director', 'scholarship_director',
            'it_director', 'student_affairs', 'cashier', 'business_manager', 'registrar', 'academic_dean'
        ]
        
        signatories = []
        for i, signatory_type in enumerate(signatory_types):
            signatory_user = User.objects.create_user(
                username=f'{signatory_type}@test.com',
                email=f'{signatory_type}@test.com',
                password='testpass123',
                full_name=f'{signatory_type.replace("_", " ").title()}',
                user_type='signatory'
            )
            
            profile = SignatoryProfile.objects.create(
                user=signatory_user,
                signatory_type=signatory_type,
                pin='12345678',
                pin_set=True,
                force_password_change=False
            )
            signatories.append(signatory_user)
        
        # Create clearance forms
        for i, student in enumerate(students):
            clearance_form = ClearanceForm.objects.create(
                student=student,
                clearance_type='enrollment',
                semester='First Semester',
                academic_year='2024-2025',
                section=['A', 'B', 'C'][i % 3],
                status='pending'
            )
            
            # Create signatory records for each clearance
            for signatory in signatories:
                signatory_profile = getattr(signatory, 'signatory_profile', None)
                if signatory_profile:
                    ClearanceSignatory.objects.create(
                        clearance=clearance_form,
                        signatory=signatory,
                        status='pending',
                        role=signatory_profile.get_signatory_type_display()
                    )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created test data:\n'
                f'- {len(students)} students\n'
                f'- {len(signatories)} signatories\n'
                f'- {len(students)} clearance forms\n'
                f'- {len(students) * len(signatories)} signatory records'
            )
        )
        
        self.stdout.write('\nTest signatory login credentials:')
        for signatory in signatories:
            profile = getattr(signatory, 'signatory_profile', None)
            if profile:
                self.stdout.write(f'- {profile.get_signatory_type_display()}: {signatory.username} / testpass123') 