from django.core.management.base import BaseCommand
from landing.models import GraduationForm, GraduationSignatory

class Command(BaseCommand):
    help = 'Fix graduation form status based on signatory approvals'

    def handle(self, *args, **options):
        graduation_forms = GraduationForm.objects.all()
        
        for graduation in graduation_forms:
            print(f"\n=== GRADUATION {graduation.id} ===")
            print(f"Student: {graduation.user.full_name}")
            print(f"Current Status: {graduation.status}")
            
            # Get all signatories for this graduation
            signatories = GraduationSignatory.objects.filter(graduation=graduation)
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
                if graduation.status != 'approved':
                    graduation.status = 'approved'
                    graduation.save()
                    print(f"UPDATED status to 'approved'")
                else:
                    print(f"Already approved")
            else:
                missing_roles = required_roles_set - signatory_roles
                if missing_roles:
                    print(f"Missing required roles: {list(missing_roles)}")
                    if graduation.status == 'approved':
                        graduation.status = 'pending'
                        graduation.save()
                        print(f"REVERTED status to 'pending' (incomplete approvals)")
                else:
                    approved_count = signatories.filter(status='approved').count()
                    total_count = signatories.count()
                    print(f"Not all approved: {approved_count}/{total_count}")
        
        print("\n=== DONE ===")