from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

class Command(BaseCommand):
    help = 'Clean up test users safely'

    def handle(self, *args, **options):
        User = get_user_model()
        
        # Users to keep
        keep_users = [
            'admin', 
            'john.doe@gmail.com', 
            'juliette.baccay@gmail.com', 
            'mary.valdez@gsfe.tupcavite.edu.ph', 
            'reynaldace.pilpil@gsfe.tupcavite.edu.ph'
        ]
        
        users_to_delete = User.objects.exclude(username__in=keep_users)
        
        self.stdout.write(f'Found {users_to_delete.count()} users to delete')
        
        deleted_count = 0
        failed_count = 0
        
        for user in users_to_delete:
            try:
                with transaction.atomic():
                    self.stdout.write(f'Deleting: {user.full_name} ({user.username})')
                    user.delete()
                    deleted_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed to delete {user.full_name}: {str(e)}'))
                failed_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {deleted_count} users'))
        if failed_count > 0:
            self.stdout.write(self.style.WARNING(f'Failed to delete {failed_count} users'))
        
        # Show remaining users
        remaining = User.objects.count()
        self.stdout.write(f'Remaining users: {remaining}')