from django.core.management.base import BaseCommand
from landing.models import ClearanceForm, ClearanceSignatory, User, SignatoryProfile
from django.contrib.auth import get_user_model
from django.db.models import Count

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix clearance signatory system and ensure proper workflow'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Fixing clearance signatory system...'))
        
        # Step 1: Clean up all duplicate records
        self.stdout.write('\n1. Cleaning up duplicate records...')
        duplicates = ClearanceSignatory.objects.values('clearance', 'signatory').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        total_removed = 0
        for duplicate in duplicates:
            clearance_id = duplicate['clearance']
            signatory_id = duplicate['signatory']
            count = duplicate['count']
            
            records = ClearanceSignatory.objects.filter(
                clearance_id=clearance_id,
                signatory_id=signatory_id
            ).order_by('id')
            
            # Keep the first record, delete the rest
            first_record = records.first()
            duplicates_to_delete = records.exclude(id=first_record.id)
            
            self.stdout.write(f'  Clearance {clearance_id}, Signatory {signatory_id}: {count} records')
            self.stdout.write(f'    Keeping record {first_record.id}, deleting {duplicates_to_delete.count()} duplicates')
            
            deleted_count = duplicates_to_delete.delete()[0]
            total_removed += deleted_count
        
        self.stdout.write(f'  Total duplicates removed: {total_removed}')
        
        # Step 2: Ensure all clearance forms have proper signatory records
        self.stdout.write('\n2. Setting up proper signatory records for all clearances...')
        
        # Get all signatory types
        signatory_types = [
            'dorm_supervisor', 'canteen_concessionaire', 'library_director', 'scholarship_director',
            'it_director', 'student_affairs', 'cashier', 'business_manager', 'registrar', 'academic_dean'
        ]
        
        # Get all clearance forms
        clearance_forms = ClearanceForm.objects.all()
        
        records_created = 0
        for clearance in clearance_forms:
            self.stdout.write(f'  Processing clearance {clearance.id} for student {clearance.student.full_name}')
            
            for signatory_type in signatory_types:
                # Find a signatory of this type
                signatory_user = User.objects.filter(
                    user_type='signatory',
                    signatory_profile__signatory_type=signatory_type
                ).first()
                
                if signatory_user:
                    # Check if record already exists
                    existing_record = ClearanceSignatory.objects.filter(
                        clearance=clearance,
                        signatory=signatory_user
                    ).first()
                    
                    if not existing_record:
                        # Create the missing record
                        role_name = {
                            'dorm_supervisor': 'Dorm Supervisor',
                            'canteen_concessionaire': 'Canteen Concessionaire',
                            'library_director': 'Director of Library & Info.',
                            'scholarship_director': 'Director of Scholarship',
                            'it_director': 'Information Technology',
                            'student_affairs': 'Dean of Student Affairs',
                            'cashier': 'Cashier',
                            'business_manager': 'Business Manager',
                            'registrar': 'Registrar',
                            'academic_dean': 'Academic Dean'
                        }.get(signatory_type, signatory_type.replace('_', ' ').title())
                        
                        ClearanceSignatory.objects.create(
                            clearance=clearance,
                            signatory=signatory_user,
                            status='pending',
                            role=role_name,
                            seen_by_signatory=False
                        )
                        records_created += 1
                        self.stdout.write(f'    Created record for {signatory_type}')
                    else:
                        # Update role if incorrect
                        correct_role = {
                            'dorm_supervisor': 'Dorm Supervisor',
                            'canteen_concessionaire': 'Canteen Concessionaire',
                            'library_director': 'Director of Library & Info.',
                            'scholarship_director': 'Director of Scholarship',
                            'it_director': 'Information Technology',
                            'student_affairs': 'Dean of Student Affairs',
                            'cashier': 'Cashier',
                            'business_manager': 'Business Manager',
                            'registrar': 'Registrar',
                            'academic_dean': 'Academic Dean'
                        }.get(signatory_type, signatory_type.replace('_', ' ').title())
                        
                        if existing_record.role != correct_role:
                            existing_record.role = correct_role
                            existing_record.save()
                            self.stdout.write(f'    Updated role for {signatory_type}: {existing_record.role} -> {correct_role}')
                else:
                    self.stdout.write(f'    Warning: No signatory found for type {signatory_type}')
        
        self.stdout.write(f'  Total records created: {records_created}')
        
        # Step 3: Fix clearance form statuses
        self.stdout.write('\n3. Fixing clearance form statuses...')
        status_fixes = 0
        
        for clearance in clearance_forms:
            signatories = ClearanceSignatory.objects.filter(clearance=clearance)
            
            if signatories.exists():
                # Check if all signatories approved
                all_approved = all(s.status == 'approved' for s in signatories)
                any_disapproved = any(s.status == 'disapproved' for s in signatories)
                
                if all_approved and clearance.status != 'approved':
                    clearance.status = 'approved'
                    clearance.save()
                    status_fixes += 1
                    self.stdout.write(f'  Fixed clearance {clearance.id}: status -> approved')
                elif any_disapproved and clearance.status != 'pending':
                    clearance.status = 'pending'
                    clearance.save()
                    status_fixes += 1
                    self.stdout.write(f'  Fixed clearance {clearance.id}: status -> pending')
        
        self.stdout.write(f'  Total status fixes: {status_fixes}')
        
        # Step 4: Verify system integrity
        self.stdout.write('\n4. Verifying system integrity...')
        
        # Check for remaining duplicates
        remaining_duplicates = ClearanceSignatory.objects.values('clearance', 'signatory').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        if remaining_duplicates.exists():
            self.stdout.write(self.style.ERROR(f'  ❌ Found {remaining_duplicates.count()} remaining duplicates'))
        else:
            self.stdout.write(self.style.SUCCESS('  ✅ No duplicate records found'))
        
        # Check clearance coverage
        clearance_forms = ClearanceForm.objects.all()
        for clearance in clearance_forms:
            signatory_count = ClearanceSignatory.objects.filter(clearance=clearance).count()
            if signatory_count != len(signatory_types):
                self.stdout.write(self.style.WARNING(f'  ⚠️  Clearance {clearance.id}: {signatory_count}/{len(signatory_types)} signatory records'))
            else:
                self.stdout.write(f'  ✅ Clearance {clearance.id}: {signatory_count}/{len(signatory_types)} signatory records')
        
        self.stdout.write(self.style.SUCCESS('\nClearance signatory system fix completed!'))
        self.stdout.write(f'Summary:')
        self.stdout.write(f'  - Duplicates removed: {total_removed}')
        self.stdout.write(f'  - Records created: {records_created}')
        self.stdout.write(f'  - Status fixes: {status_fixes}') 