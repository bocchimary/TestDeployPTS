from django.core.management.base import BaseCommand
from landing.models import StudentProfile, AlumniProfile
import os
from django.conf import settings

class Command(BaseCommand):
    help = 'Fix profile pictures that have missing files'

    def handle(self, *args, **options):
        self.stdout.write('Checking for profile picture issues...')
        
        # Fix StudentProfile instances
        student_profiles = StudentProfile.objects.all()
        fixed_count = 0
        
        for profile in student_profiles:
            if profile.profile_picture:
                # Check if the file actually exists
                file_path = os.path.join(settings.MEDIA_ROOT, str(profile.profile_picture))
                if not os.path.exists(file_path):
                    self.stdout.write(f'Fixing missing profile picture for student: {profile.user.full_name}')
                    profile.profile_picture = None
                    profile.save()
                    fixed_count += 1
        
        # Fix AlumniProfile instances
        alumni_profiles = AlumniProfile.objects.all()
        
        for profile in alumni_profiles:
            if profile.profile_picture:
                # Check if the file actually exists
                file_path = os.path.join(settings.MEDIA_ROOT, str(profile.profile_picture))
                if not os.path.exists(file_path):
                    self.stdout.write(f'Fixing missing profile picture for alumni: {profile.user.full_name}')
                    profile.profile_picture = None
                    profile.save()
                    fixed_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully fixed {fixed_count} profile picture(s)')
        ) 