from django.core.management.base import BaseCommand
from landing.models import ClearanceSignatory
from django.db.models import Count

class Command(BaseCommand):
    help = 'Clean up duplicate ClearanceSignatory records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting duplicate cleanup...'))
        
        # Find duplicates
        duplicates = (
            ClearanceSignatory.objects
            .values('clearance', 'signatory')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
        )
        
        if not duplicates:
            self.stdout.write(self.style.SUCCESS('No duplicates found!'))
            return
        
        self.stdout.write(f'Found {len(duplicates)} clearance-signatory combinations with duplicates')
        
        total_deleted = 0
        
        for duplicate in duplicates:
            clearance_id = duplicate['clearance']
            signatory_id = duplicate['signatory']
            count = duplicate['count']
            
            # Get all records for this combination
            records = ClearanceSignatory.objects.filter(
                clearance_id=clearance_id,
                signatory_id=signatory_id
            ).order_by('id')
            
            # Keep the first record, delete the rest
            records_to_delete = records[1:]
            
            self.stdout.write(f'Clearance {clearance_id}, Signatory {signatory_id}: {count} records, keeping 1, deleting {len(records_to_delete)}')
            
            if not options['dry_run']:
                for record in records_to_delete:
                    self.stdout.write(f'  Deleting record {record.id}')
                    record.delete()
                    total_deleted += 1
            else:
                self.stdout.write(f'  Would delete {len(records_to_delete)} records')
                total_deleted += len(records_to_delete)
        
        if options['dry_run']:
            self.stdout.write(self.style.WARNING(f'DRY RUN: Would delete {total_deleted} duplicate records'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Successfully deleted {total_deleted} duplicate records'))
        
        self.stdout.write(self.style.SUCCESS('Cleanup complete!')) 