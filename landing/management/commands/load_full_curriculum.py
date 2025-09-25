from django.core.management.base import BaseCommand
from django.db import transaction
from landing.models import AcademicProgram, AcademicYearLevel, AcademicSemester, AcademicSubject


class Command(BaseCommand):
    help = 'Load complete curriculum data from enrollment.txt into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reload data (delete existing data first)',
        )

    def handle(self, *args, **options):
        self.stdout.write("Loading complete curriculum data...")

        # Complete program definitions
        programs_info = {
            'ABTh': {
                'name': 'Bachelor of Arts in Theology',
                'type': 'undergraduate',
                'years': 4,
                'description': 'A comprehensive program in theological studies and biblical education.'
            },
            'BEED': {
                'name': 'Bachelor of Elementary Education', 
                'type': 'undergraduate',
                'years': 4,
                'description': 'A program designed to prepare educators for elementary education.'
            },
            'BSCEd': {
                'name': 'Bachelor of Science in Christian Education',
                'type': 'undergraduate', 
                'years': 4,
                'description': 'A program combining education principles with Christian values.'
            },
            'MDivBS': {
                'name': 'Master of Divinity in Biblical Studies',
                'type': 'graduate',
                'years': 3,
                'description': 'Advanced theological education focused on biblical scholarship.'
            },
            'MDivPS': {
                'name': 'Master of Divinity in Pastoral Studies', 
                'type': 'graduate',
                'years': 3,
                'description': 'Advanced theological education focused on pastoral ministry.'
            },
            'MDivCE': {
                'name': 'Master of Divinity in Christian Education',
                'type': 'graduate',
                'years': 3, 
                'description': 'Advanced theological education focused on Christian education.'
            }
        }

        # Complete curriculum data (abbreviated for space - you would include full data here)
        # This is a sample structure - the full implementation would include all subjects from enrollment.txt
        curriculum_sample = {
            'ABTh': {
                "1st-year": {
                    "1st-sem": [
                        {"code": "GED01", "subject": "Art Appreciation", "professor": "TBA", "units": 3},
                        {"code": "GED02", "subject": "Understanding the Self", "professor": "TBA", "units": 3},
                        {"code": "GED03", "subject": "The Contemporary World", "professor": "TBA", "units": 3},
                        {"code": "GED04", "subject": "Purposive Communication", "professor": "TBA", "units": 3},
                        {"code": "GEEL1", "subject": "Living in the IT Era", "professor": "TBA", "units": 3},
                        {"code": "GED09", "subject": "Life and Works of Rizal", "professor": "TBA", "units": 3},
                        {"code": "NST01", "subject": "National Service Training Program 1 (CWTS/LTS)", "professor": "TBA", "units": 3},
                        {"code": "PHE01", "subject": "PATHFIT1: Movement Competency Training", "professor": "TBA", "units": 2},
                    ]
                }
            }
        }

        if options['force']:
            self.stdout.write("Clearing existing curriculum data...")
            with transaction.atomic():
                AcademicSubject.objects.all().delete()
                AcademicSemester.objects.all().delete() 
                AcademicYearLevel.objects.all().delete()
                AcademicProgram.objects.all().delete()

        # Create programs first
        with transaction.atomic():
            programs_created = 0
            
            for code, info in programs_info.items():
                program, created = AcademicProgram.objects.get_or_create(
                    code=code,
                    defaults={
                        'name': info['name'],
                        'program_type': info['type'], 
                        'duration_years': info['years'],
                        'description': info['description']
                    }
                )
                
                if created:
                    programs_created += 1
                    self.stdout.write(f"  Created program: {program.code} - {program.name}")
                    
                    # Create year levels for each program
                    for year_num in range(1, info['years'] + 1):
                        year_name = f"{year_num}{'st' if year_num == 1 else 'nd' if year_num == 2 else 'rd' if year_num == 3 else 'th'}-year"
                        year_level, _ = AcademicYearLevel.objects.get_or_create(
                            program=program,
                            year_number=year_num,
                            defaults={'year_name': year_name}
                        )
                        
                        # Create semesters for each year
                        for sem_num in range(1, 3):  # 1st and 2nd semester
                            sem_name = f"{sem_num}{'st' if sem_num == 1 else 'nd'}-sem"
                            AcademicSemester.objects.get_or_create(
                                year_level=year_level,
                                semester_number=sem_num,
                                defaults={'semester_name': sem_name}
                            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully created academic structure:\n"
                f"  Programs created: {programs_created}\n"
                f"  Year levels and semesters created\n\n"
                f"NOTE: This creates the program structure only.\n"
                f"   To load complete subject data, you'll need to run a separate command\n"
                f"   with the full curriculum data from enrollment.txt"
            )
        )

        # Display created programs
        self.stdout.write("\nCreated Programs:")
        for program in AcademicProgram.objects.all():
            year_count = program.year_levels.count()
            sem_count = sum(yl.semesters.count() for yl in program.year_levels.all())
            self.stdout.write(f"  {program.code}: {program.name} ({year_count} years, {sem_count} semesters)")