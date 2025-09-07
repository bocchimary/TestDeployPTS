from django.core.management.base import BaseCommand
from landing.models import EnrollmentSignatory, EnrollmentForm
from django.db.models import Count

class Command(BaseCommand):
    help = 'Fix duplicate EnrollmentSignatory records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without actually doing it',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting enrollment signatory duplicate cleanup...'))
        
        # Find duplicates by enrollment and role combination
        duplicates = (
            EnrollmentSignatory.objects
            .values('enrollment', 'role')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
        )
        
        if not duplicates:
            self.stdout.write(self.style.SUCCESS('No duplicate enrollment signatory records found!'))
            return
        
        self.stdout.write(f'Found {len(duplicates)} enrollment-role combinations with duplicates')
        
        total_deleted = 0
        
        for duplicate in duplicates:
            enrollment_id = duplicate['enrollment']
            role = duplicate['role']
            count = duplicate['count']
            
            # Get all records for this combination
            records = EnrollmentSignatory.objects.filter(
                enrollment_id=enrollment_id,
                role=role
            ).order_by('-updated_at', 'id')  # Keep the most recently updated, then by ID
            
            # Keep the first record (most recently updated), delete the rest
            records_to_keep = records.first()
            records_to_delete = records[1:]
            
            self.stdout.write(f'Enrollment {enrollment_id}, Role {role}: {count} records')
            self.stdout.write(f'  Keeping: {records_to_keep.signatory.full_name} - Status: {records_to_keep.status}')
            
            for record in records_to_delete:
                self.stdout.write(f'  Would delete: {record.signatory.full_name} - Status: {record.status}')
                if not options['dry_run']:
                    record.delete()
                    total_deleted += 1
        
        if options['dry_run']:
            self.stdout.write(self.style.WARNING(f'DRY RUN: Would delete {len(list(duplicates)) * 2 - len(list(duplicates))} duplicate records'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Successfully deleted {total_deleted} duplicate records'))
        
        self.stdout.write(self.style.SUCCESS('Cleanup complete!'))