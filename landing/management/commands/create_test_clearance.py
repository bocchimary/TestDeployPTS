from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from landing.models import StudentProfile, ClearanceForm, ClearanceSignatory, SignatoryProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Create test clearance data for signatory testing'

    def handle(self, *args, **options):
        self.stdout.write('Creating test clearance data...')
        
        # Get or create test signatory
        signatory_user, created = User.objects.get_or_create(
            username='test_signatory@test.com',
            defaults={
                'email': 'test_signatory@test.com',
                'password': 'testpass123',
                'full_name': 'Test Signatory',
                'user_type': 'signatory'
            }
        )
        
        if created:
            signatory_user.set_password('testpass123')
            signatory_user.save()
            
            SignatoryProfile.objects.create(
                user=signatory_user,
                signatory_type='dorm_supervisor',
                pin_set=True,
                force_password_change=False
            )
        
        # Create test students
        students = []
        for i in range(3):
            student_user, created = User.objects.get_or_create(
                username=f'student{i+1}@test.com',
                defaults={
                    'email': f'student{i+1}@test.com',
                    'password': 'testpass123',
                    'full_name': f'Student {i+1}',
                    'user_type': 'student'
                }
            )
            
            if created:
                student_user.set_password('testpass123')
                student_user.save()
                
                StudentProfile.objects.create(
                    user=student_user,
                    student_number=f'PTS-00-{1000+i:04d}',
                    program=['BET-COET', 'AMTh'][i % 2],
                    year_level=(i % 3) + 1
                )
            
            students.append(student_user)
        
        # Create clearance forms
        for i, student in enumerate(students):
            clearance_form, created = ClearanceForm.objects.get_or_create(
                student=student,
                defaults={
                    'clearance_type': 'enrollment',
                    'semester': 'First Semester',
                    'academic_year': '2024-2025',
                    'section': ['A', 'B', 'C'][i % 3],
                    'status': 'pending'
                }
            )
            
            if created:
                # Create signatory record for this clearance
                ClearanceSignatory.objects.get_or_create(
                    clearance=clearance_form,
                    signatory=signatory_user,
                    defaults={
                        'status': 'pending',
                        'role': 'Dorm Supervisor',
                        'seen_by_signatory': False  # This makes them appear as "unseen" in dashboard
                    }
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created test clearance data:\n'
                f'- {len(students)} students\n'
                f'- {len(students)} clearance forms\n'
                f'- {len(students)} signatory records'
            )
        ) 