from django.core.management.base import BaseCommand
from landing.models import ClearanceSignatory
from django.contrib.auth import get_user_model
from django.db.models import Count

User = get_user_model()

class Command(BaseCommand):
    help = 'Clean up duplicate admin records in ClearanceSignatory'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting comprehensive duplicate cleanup...'))
        
        # Find all duplicate records by clearance and signatory
        duplicates = ClearanceSignatory.objects.values('clearance', 'signatory').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        total_duplicates_removed = 0
        
        for duplicate in duplicates:
            clearance_id = duplicate['clearance']
            signatory_id = duplicate['signatory']
            count = duplicate['count']
            
            # Get all records for this clearance-signatory combination
            records = ClearanceSignatory.objects.filter(
                clearance_id=clearance_id,
                signatory_id=signatory_id
            ).order_by('id')
            
            # Keep the first record (oldest), delete the rest
            first_record = records.first()
            duplicates_to_delete = records.exclude(id=first_record.id)
            
            self.stdout.write(f'Clearance {clearance_id}, Signatory {signatory_id}: {count} records found')
            self.stdout.write(f'  Keeping record {first_record.id}, deleting {duplicates_to_delete.count()} duplicates')
            
            # Delete duplicates
            deleted_count = duplicates_to_delete.delete()[0]
            total_duplicates_removed += deleted_count
        
        # Also clean up any orphaned records (clearance or signatory doesn't exist)
        orphaned_records = ClearanceSignatory.objects.filter(
            clearance__isnull=True
        ) | ClearanceSignatory.objects.filter(
            signatory__isnull=True
        )
        
        if orphaned_records.exists():
            orphaned_count = orphaned_records.count()
            self.stdout.write(f'Found {orphaned_count} orphaned records, deleting...')
            orphaned_records.delete()
            total_duplicates_removed += orphaned_count
        
        self.stdout.write(self.style.SUCCESS(f'Cleanup complete! Removed {total_duplicates_removed} duplicate/orphaned records'))
        
        # Verify cleanup
        remaining_duplicates = ClearanceSignatory.objects.values('clearance', 'signatory').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        if remaining_duplicates.exists():
            self.stdout.write(self.style.WARNING(f'Warning: {remaining_duplicates.count()} clearance-signatory combinations still have duplicates'))
        else:
            self.stdout.write(self.style.SUCCESS('All duplicates have been successfully removed!')) 