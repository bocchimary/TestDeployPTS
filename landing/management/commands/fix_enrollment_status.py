from django.core.management.base import BaseCommand
from landing.models import EnrollmentForm, EnrollmentSignatory

class Command(BaseCommand):
    help = 'Fix enrollment form status based on signatory approvals'

    def handle(self, *args, **options):
        enrollment_forms = EnrollmentForm.objects.all()
        
        for enrollment in enrollment_forms:
            print(f"\n=== ENROLLMENT {enrollment.id} ===")
            print(f"Student: {enrollment.user.full_name}")
            print(f"Current Status: {enrollment.status}")
            
            # Get all signatories for this enrollment
            signatories = EnrollmentSignatory.objects.filter(enrollment=enrollment)
            print(f"Total signatory records: {signatories.count()}")
            
            for sig in signatories:
                print(f"  - {sig.signatory.full_name} ({sig.role}): {sig.status}")
            
            # Check if all required signatories approved
            required_roles = ['business_manager', 'registrar', 'dean']
            signatory_roles = set(sig.role for sig in signatories)
            required_roles_set = set(required_roles)
            
            if (signatory_roles >= required_roles_set and 
                signatories.count() >= 3 and 
                all(s.status == 'approved' for s in signatories)):
                if enrollment.status != 'approved':
                    enrollment.status = 'approved'
                    enrollment.save()
                    print(f"UPDATED status to 'approved'")
                else:
                    print(f"Already approved")
            else:
                missing_roles = required_roles_set - signatory_roles
                if missing_roles:
                    print(f"Missing required roles: {list(missing_roles)}")
                    if enrollment.status == 'approved':
                        enrollment.status = 'pending'
                        enrollment.save()
                        print(f"REVERTED status to 'pending' (incomplete approvals)")
                else:
                    approved_count = signatories.filter(status='approved').count()
                    total_count = signatories.count()
                    print(f"Not all approved: {approved_count}/{total_count}")
        
        print("\n=== DONE ===")