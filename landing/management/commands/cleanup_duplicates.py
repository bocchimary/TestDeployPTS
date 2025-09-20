from django.core.management.base import BaseCommand
from django.db.models import Count
from landing.models import ClearanceSignatory

class Command(BaseCommand):
    help = 'Clean up duplicate ClearanceSignatory records'

    def handle(self, *args, **options):
        self.stdout.write('Starting cleanup of duplicate ClearanceSignatory records...')
        
        # Find clearance-signatory combinations that have duplicates
        duplicates = (ClearanceSignatory.objects
                     .values('clearance_id', 'signatory_id')
                     .annotate(count=Count('id'))
                     .filter(count__gt=1))
        
        total_deleted = 0
        for duplicate in duplicates:
            records = ClearanceSignatory.objects.filter(
                clearance_id=duplicate['clearance_id'],
                signatory_id=duplicate['signatory_id']
            ).order_by('-updated_at')  # Keep the most recent one (first)
            
            # Delete all but the first (most recent) record
            records_to_delete = records[1:]
            count = len(records_to_delete)
            
            if count > 0:
                for record in records_to_delete:
                    record.delete()
                
                total_deleted += count
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Cleaned up {count} duplicates for clearance {duplicate["clearance_id"]} and signatory {duplicate["signatory_id"]}'
                    )
                )
        
        if total_deleted > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully cleaned up {total_deleted} duplicate records')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('No duplicate records found - database is clean!')
            )