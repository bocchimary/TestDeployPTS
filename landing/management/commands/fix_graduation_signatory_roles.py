from django.core.management.base import BaseCommand
from django.db import transaction
from landing.models import GraduationSignatory, User


class Command(BaseCommand):
    help = 'Fix graduation signatory roles - update academic dean approvals from president to dean role'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making actual changes',
        )

    def handle(self, *args, **options):
        self.stdout.write('Investigating graduation signatory roles...\n')
        
        # Find all graduation signatory records with role='president' 
        # where the signatory user is actually an academic dean
        president_signatories = GraduationSignatory.objects.filter(
            role='president'
        ).select_related('signatory', 'signatory__signatory_profile')
        
        academic_dean_as_president = []
        actual_president_signatories = []
        
        for signatory in president_signatories:
            if (hasattr(signatory.signatory, 'signatory_profile') and 
                signatory.signatory.signatory_profile and
                signatory.signatory.signatory_profile.signatory_type == 'academic_dean'):
                academic_dean_as_president.append(signatory)
            elif (hasattr(signatory.signatory, 'signatory_profile') and 
                  signatory.signatory.signatory_profile and
                  signatory.signatory.signatory_profile.signatory_type == 'president'):
                actual_president_signatories.append(signatory)
        
        self.stdout.write(f"Found {len(academic_dean_as_president)} graduation approvals by academic deans stored with 'president' role")
        self.stdout.write(f"Found {len(actual_president_signatories)} graduation approvals by actual presidents stored with 'president' role")
        
        # Check existing dean records
        dean_signatories = GraduationSignatory.objects.filter(
            role='dean'
        ).select_related('signatory', 'signatory__signatory_profile')
        
        self.stdout.write(f"Found {len(dean_signatories)} graduation records with 'dean' role")
        
        if dean_signatories:
            self.stdout.write("\nExisting dean role records:")
            for signatory in dean_signatories[:5]:  # Show first 5 examples
                signatory_type = 'Unknown'
                if (hasattr(signatory.signatory, 'signatory_profile') and 
                    signatory.signatory.signatory_profile):
                    signatory_type = signatory.signatory.signatory_profile.signatory_type
                self.stdout.write(f"  - Graduation {signatory.graduation.id}, User: {signatory.signatory.full_name}, Status: {signatory.status}, Type: {signatory_type}")
        
        if academic_dean_as_president:
            self.stdout.write("\nAcademic dean approvals that need role correction:")
            for signatory in academic_dean_as_president[:5]:  # Show first 5 examples
                self.stdout.write(f"  - Graduation {signatory.graduation.id}, User: {signatory.signatory.full_name}, Status: {signatory.status}")
        
        if options['dry_run']:
            self.stdout.write(f"\n[DRY RUN] Would update {len(academic_dean_as_president)} records from role='president' to role='dean'")
        else:
            if academic_dean_as_president:
                with transaction.atomic():
                    updated_count = 0
                    for signatory in academic_dean_as_president:
                        # Check if there's already a dean record for this graduation
                        existing_dean = GraduationSignatory.objects.filter(
                            graduation=signatory.graduation,
                            role='dean'
                        ).first()
                        
                        if existing_dean:
                            self.stdout.write(f"  Warning: Graduation {signatory.graduation.id} already has a dean record. Skipping...")
                            continue
                        
                        # Update the role from president to dean
                        signatory.role = 'dean'
                        signatory.save()
                        updated_count += 1
                        
                    self.stdout.write(f"\nUpdated {updated_count} signatory records from 'president' to 'dean' role")
            else:
                self.stdout.write("\nNo academic dean records found with incorrect 'president' role")
        
        self.stdout.write('\nDone!')