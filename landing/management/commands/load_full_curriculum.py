from django.core.management.base import BaseCommand
from django.db import transaction
from landing.models import AcademicProgram, AcademicYearLevel, AcademicSemester, AcademicSubject


class Command(BaseCommand):
    help = 'Load complete curriculum data with all subjects from enrollment.txt'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reload data (delete existing data first)',
        )

    def handle(self, *args, **options):
        self.stdout.write("Loading complete curriculum data from enrollment.txt...")

        # Complete curriculum data from enrollment.txt
        curriculum_data = {
            'BTh': {
                'name': 'Bachelor of Theology',
                'type': 'undergraduate',
                'years': 3,
                'description': 'Program in theological studies preparing students for ministry and scholarship.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "MCT01", "subject": "Introduction to Biblical Theology", "professor": "TBA", "units": 3},
                            {"code": "IDC01", "subject": "Research in Theology", "professor": "TBA", "units": 3},
                            {"code": "IDC02", "subject": "Hebrew Language 1", "professor": "TBA", "units": 3},
                            {"code": "MCB01", "subject": "Hermeneutics", "professor": "TBA", "units": 3},
                            {"code": "MCB02", "subject": "Old Testament Survey 1", "professor": "TBA", "units": 3},
                            {"code": "MCB04", "subject": "New Testament Survey 1", "professor": "TBA", "units": 3},
                            {"code": "IDC04", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "PHE03", "subject": "PATHFIT3: Sport Teams (Swimming)", "professor": "TBA", "units": 2},
                            {"code": "IDC18", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "MCT02", "subject": "Systematic Theology 1", "professor": "TBA", "units": 3},
                            {"code": "IDC03", "subject": "Greek Language 1", "professor": "TBA", "units": 3},
                            {"code": "MCB03", "subject": "Old Testament Survey 2", "professor": "TBA", "units": 3},
                            {"code": "MCB05", "subject": "New Testament Survey 2", "professor": "TBA", "units": 3},
                            {"code": "IDC05", "subject": "Church History 2", "professor": "TBA", "units": 3},
                            {"code": "IDC08", "subject": "Homiletics 1", "professor": "TBA", "units": 3},
                            {"code": "IDC10", "subject": "Reformed Worship & Church Polity", "professor": "TBA", "units": 3},
                            {"code": "PHE04", "subject": "PATHFIT4: Sport Teams (Outdoor Games: Volleyball/Basketball)", "professor": "TBA", "units": 2},
                            {"code": "IDC19", "subject": "Field Ministry Education 2", "professor": "TBA", "units": 1}
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "MCT03", "subject": "Systematic Theology 2", "professor": "TBA", "units": 3},
                            {"code": "IDC06", "subject": "Presbyterian History", "professor": "TBA", "units": 3},
                            {"code": "IDC09", "subject": "Homiletics 2", "professor": "TBA", "units": 3},
                            {"code": "MCR01", "subject": "Calvin Studies & Reformed Creeds", "professor": "TBA", "units": 3},
                            {"code": "MCR02", "subject": "Foundation of Christian Education", "professor": "TBA", "units": 3},
                            {"code": "IDC14", "subject": "Church Music", "professor": "TBA", "units": 3},
                            {"code": "MCR03", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "ELEC1", "subject": "Principles & Methods of Teaching", "professor": "TBA", "units": 3},
                            {"code": "IDC20", "subject": "Field Ministry Education 3", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "MCT04", "subject": "Systematic Theology 3", "professor": "TBA", "units": 3},
                            {"code": "IDC07", "subject": "Historical Theology", "professor": "TBA", "units": 3},
                            {"code": "IDC11", "subject": "Introduction to Biblical Counseling", "professor": "TBA", "units": 3},
                            {"code": "IDC12", "subject": "Church Leadership & Administration", "professor": "TBA", "units": 3},
                            {"code": "IDC13", "subject": "Pastoral Theology", "professor": "TBA", "units": 3},
                            {"code": "IDC15", "subject": "History & Theology of Missions", "professor": "TBA", "units": 3},
                            {"code": "ELEC2", "subject": "Christian Values Integration in the Various Discipline", "professor": "TBA", "units": 3},
                            {"code": "IDC21", "subject": "Field Ministry Education 4", "professor": "TBA", "units": 1}
                        ]
                    },
                    "3rd-year": {
                        "1st-sem": [
                            {"code": "MCT05", "subject": "Systematic Theology 4", "professor": "TBA", "units": 3},
                            {"code": "IDC16", "subject": "Apologetics", "professor": "TBA", "units": 3},
                            {"code": "RRC01", "subject": "Comparative Religions", "professor": "TBA", "units": 3},
                            {"code": "IDC17", "subject": "Contemporary Theology", "professor": "TBA", "units": 3},
                            {"code": "IDC22", "subject": "Field Ministry Education 5", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "MCP01", "subject": "Internship", "professor": "TBA", "units": 6}
                        ]
                    }
                }
            },
            'ABTh': {
                'name': 'Bachelor of Arts in Theology',
                'type': 'undergraduate',
                'years': 4,
                'description': 'A comprehensive program in theological studies and biblical education.',
                'curriculum': {
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
                        ],
                        "2nd-sem": [
                            {"code": "GED06", "subject": "Mathematics in the Modern World", "professor": "TBA", "units": 3},
                            {"code": "GED07", "subject": "Science, Technology and Society", "professor": "TBA", "units": 3},
                            {"code": "GED08", "subject": "Christian Ethics", "professor": "TBA", "units": 3},
                            {"code": "GED05", "subject": "Readings in Philippine History", "professor": "TBA", "units": 3},
                            {"code": "GEEL2", "subject": "Great Books", "professor": "TBA", "units": 3},
                            {"code": "GEEL3", "subject": "Religions, Religious Experience and Spirituality", "professor": "TBA", "units": 3},
                            {"code": "NST02", "subject": "National Service Training Program 2 (CWTS/LTS)", "professor": "TBA", "units": 3},
                            {"code": "PHE02", "subject": "PATHFIT2: Exercises-based Fitness Activities", "professor": "TBA", "units": 2},
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "MCT01", "subject": "Introduction to Biblical Theology", "professor": "TBA", "units": 3},
                            {"code": "IDC01", "subject": "Research in Theology", "professor": "TBA", "units": 3},
                            {"code": "IDC02", "subject": "Hebrew Language 1", "professor": "TBA", "units": 3},
                            {"code": "MCB01", "subject": "Hermeneutics", "professor": "TBA", "units": 3},
                            {"code": "MCB02", "subject": "Old Testament Survey 1", "professor": "TBA", "units": 3},
                            {"code": "MCB04", "subject": "New Testament Survey 1", "professor": "TBA", "units": 3},
                            {"code": "IDC04", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "PHE03", "subject": "PATHFIT3: Sport Teams (Swimming)", "professor": "TBA", "units": 2},
                            {"code": "IDC18", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1},
                        ],
                        "2nd-sem": [
                            {"code": "MCT02", "subject": "Systematic Theology 1", "professor": "TBA", "units": 3},
                            {"code": "IDC03", "subject": "Greek Language 1", "professor": "TBA", "units": 3},
                            {"code": "MCB03", "subject": "Old Testament Survey 2", "professor": "TBA", "units": 3},
                            {"code": "MCB05", "subject": "New Testament Survey 2", "professor": "TBA", "units": 3},
                            {"code": "IDC05", "subject": "Church History 2", "professor": "TBA", "units": 3},
                            {"code": "IDC08", "subject": "Homiletics 1", "professor": "TBA", "units": 3},
                            {"code": "IDC10", "subject": "Reformed Worship & Church Polity", "professor": "TBA", "units": 3},
                            {"code": "PHE04", "subject": "PATHFIT4: Sport Teams (Outdoor Games: Volleyball/Basketball)", "professor": "TBA", "units": 2},
                            {"code": "IDC19", "subject": "Field Ministry Education 2", "professor": "TBA", "units": 1},
                        ]
                    },
                    "3rd-year": {
                        "1st-sem": [
                            {"code": "MCT03", "subject": "Systematic Theology 2", "professor": "TBA", "units": 3},
                            {"code": "IDC06", "subject": "Presbyterian History", "professor": "TBA", "units": 3},
                            {"code": "IDC09", "subject": "Homiletics 2", "professor": "TBA", "units": 3},
                            {"code": "MCR01", "subject": "Calvin Studies & Reformed Creeds", "professor": "TBA", "units": 3},
                            {"code": "MCR02", "subject": "Foundation of Christian Education", "professor": "TBA", "units": 3},
                            {"code": "IDC14", "subject": "Church Music", "professor": "TBA", "units": 3},
                            {"code": "MCR03", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "ELEC1", "subject": "Principles & Methods of Teaching", "professor": "TBA", "units": 3},
                            {"code": "IDC20", "subject": "Field Ministry Education 3", "professor": "TBA", "units": 1},
                        ],
                        "2nd-sem": [
                            {"code": "MCT04", "subject": "Systematic Theology 3", "professor": "TBA", "units": 3},
                            {"code": "IDC07", "subject": "Historical Theology", "professor": "TBA", "units": 3},
                            {"code": "IDC11", "subject": "Introduction to Biblical Counseling", "professor": "TBA", "units": 3},
                            {"code": "IDC12", "subject": "Church Leadership & Administration", "professor": "TBA", "units": 3},
                            {"code": "IDC13", "subject": "Pastoral Theology", "professor": "TBA", "units": 3},
                            {"code": "IDC15", "subject": "History & Theology of Missions", "professor": "TBA", "units": 3},
                            {"code": "ELEC2", "subject": "Christian Values Integration in the Various Discipline", "professor": "TBA", "units": 3},
                            {"code": "IDC21", "subject": "Field Ministry Education 4", "professor": "TBA", "units": 1},
                        ]
                    },
                    "4th-year": {
                        "1st-sem": [
                            {"code": "MCT05", "subject": "Systematic Theology 4", "professor": "TBA", "units": 3},
                            {"code": "IDC16", "subject": "Apologetics", "professor": "TBA", "units": 3},
                            {"code": "RRC01", "subject": "Comparative Religions", "professor": "TBA", "units": 3},
                            {"code": "IDC17", "subject": "Contemporary Theology", "professor": "TBA", "units": 3},
                            {"code": "IDC22", "subject": "Field Ministry Education 5", "professor": "TBA", "units": 1},
                        ],
                        "2nd-sem": [
                            {"code": "MCP01", "subject": "Internship", "professor": "TBA", "units": 6}
                        ]
                    }
                }
            },
            
            'BEED': {
                'name': 'Bachelor of Elementary Education',
                'type': 'undergraduate',
                'years': 4,
                'description': 'A program designed to prepare educators for elementary education.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "GED01", "subject": "Art Appreciation", "professor": "TBA", "units": 3},
                            {"code": "GED02", "subject": "Understanding the Self", "professor": "TBA", "units": 3},
                            {"code": "GED03", "subject": "The Contemporary World", "professor": "TBA", "units": 3},
                            {"code": "GED04", "subject": "Purposive Communication", "professor": "TBA", "units": 3},
                            {"code": "PED01", "subject": "The Child & Adolescent Learners and Learning Principles", "professor": "TBA", "units": 3},
                            {"code": "PED03", "subject": "The Teacher and the Community, School Culture, and Organization Leadership", "professor": "TBA", "units": 3},
                            {"code": "PED05", "subject": "Facilitating Learner-Centered Teaching", "professor": "TBA", "units": 3},
                            {"code": "NST01", "subject": "NSTP1-CWTS/LTS", "professor": "TBA", "units": 3},
                            {"code": "PHE01", "subject": "PATHFIT 1: Movement Competency Training", "professor": "TBA", "units": 2},
                        ],
                        "2nd-sem": [
                            {"code": "GED05", "subject": "Readings in Philippine History", "professor": "TBA", "units": 3},
                            {"code": "GED06", "subject": "Mathematics in the Modern World", "professor": "TBA", "units": 3},
                            {"code": "GED07", "subject": "Science, Technology and Society", "professor": "TBA", "units": 3},
                            {"code": "GED08", "subject": "Ethics", "professor": "TBA", "units": 3},
                            {"code": "PED02", "subject": "The Teaching Profession", "professor": "TBA", "units": 3},
                            {"code": "PED04", "subject": "Foundation of Special and Inclusive Education", "professor": "TBA", "units": 3},
                            {"code": "PED08", "subject": "Technology for Teaching and Learning 1", "professor": "TBA", "units": 3},
                            {"code": "NST02", "subject": "NSTP2-CWTS/LTS", "professor": "TBA", "units": 3},
                            {"code": "PHE02", "subject": "PATHFIT 2: Exercises-based Fitness Activities", "professor": "TBA", "units": 2},
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "PED06", "subject": "Assessment in Learning 1", "professor": "TBA", "units": 3},
                            {"code": "GED09", "subject": "Life and Works of Rizal", "professor": "TBA", "units": 3},
                            {"code": "GEEL1", "subject": "Living in IT Era", "professor": "TBA", "units": 3},
                            {"code": "PED10", "subject": "Building and Enhancing New Literacies Across the Curriculum", "professor": "TBA", "units": 3},
                            {"code": "EED01", "subject": "Good Manners and Right Conduct", "professor": "TBA", "units": 3},
                            {"code": "GEEL3", "subject": "Religions, Religious Experiences and Spirituality", "professor": "TBA", "units": 3},
                            {"code": "EED07", "subject": "Teaching Social Studies in the Elementary Grades I (Philippine History & Government)", "professor": "TBA", "units": 3},
                            {"code": "MCED20", "subject": "Philosophy of Christian Education", "professor": "TBA", "units": 3},
                            {"code": "PHE03", "subject": "PATHFIT 3: Team Sports (Swimming)", "professor": "TBA", "units": 2}
                        ],
                        "2nd-sem": [
                            {"code": "PED07", "subject": "Assessment in Learning 2", "professor": "TBA", "units": 3},
                            {"code": "PED09", "subject": "The Teacher and the School Curriculum", "professor": "TBA", "units": 3},
                            {"code": "GEEL2", "subject": "Great Books", "professor": "TBA", "units": 3},
                            {"code": "ICCS4", "subject": "Calvin Studies & Reformed Creeds", "professor": "TBA", "units": 3},
                            {"code": "EED03", "subject": "Content and Pedagogy for the Mother-Tongue", "professor": "TBA", "units": 3},
                            {"code": "EED08", "subject": "Teaching Social Studies in the Elementary Grades II (Culture and Geography)", "professor": "TBA", "units": 3},
                            {"code": "EED20", "subject": "Technology for Teaching and Learning in Elementary Grade", "professor": "TBA", "units": 3},
                            {"code": "PHE04", "subject": "PATHFIT 4: Team Sports (Outdoor Activities: Volleyball/Basketball)", "professor": "TBA", "units": 2},
                        ]
                    },
                    "3rd-year": {
                        "1st-sem": [
                            {"code": "ICED1", "subject": "Evangelism and Discipleship", "professor": "TBA", "units": 3},
                            {"code": "EED09", "subject": "Pagtuturo ng Filipino sa Elementarya I (Struktura at Gamit ng Wikang Filipino)", "professor": "TBA", "units": 3},
                            {"code": "EED05", "subject": "Teaching Science in the Elementary Grades (Biology and Chemistry)", "professor": "TBA", "units": 3},
                            {"code": "EED11", "subject": "Teaching Math in the Primary Grades", "professor": "TBA", "units": 3},
                            {"code": "EED16", "subject": "Teaching Arts in the Elementary Grades", "professor": "TBA", "units": 3},
                            {"code": "EED17", "subject": "Teaching English in Elementary Grades I (Language Arts)", "professor": "TBA", "units": 3},
                            {"code": "EED21", "subject": "Teaching Physical Education and Health in Elementary Grades", "professor": "TBA", "units": 3},
                            {"code": "EED13", "subject": "Edukasyong Pantahanan at Pangkabuhayan", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "EED19", "subject": "Research in Education", "professor": "TBA", "units": 3},
                            {"code": "EED10", "subject": "Pagtuturo ng Filipino sa Elementarya II (Panitikan Filipino)", "professor": "TBA", "units": 3},
                            {"code": "EED06", "subject": "Teaching Science in the Elementary Grades (Physics, Earth and Space Science)", "professor": "TBA", "units": 3},
                            {"code": "EED12", "subject": "Teaching Math in the Intermediate Grades", "professor": "TBA", "units": 3},
                            {"code": "EED15", "subject": "Teaching Music in the Elementary Grades", "professor": "TBA", "units": 3},
                            {"code": "EED04", "subject": "Teaching Multi-grade Classes", "professor": "TBA", "units": 3},
                            {"code": "EED18", "subject": "Teaching English in Elementary Grades II Through Literature", "professor": "TBA", "units": 3},
                            {"code": "EED14", "subject": "Edukasyong Pantahanan at Pangkabuhayan with Entrepreneurship", "professor": "TBA", "units": 3}
                        ]
                    },
                    "4th-year": {
                        "1st-sem": [
                            {"code": "PED11", "subject": "Field Study 1", "professor": "TBA", "units": 3},
                            {"code": "PED12", "subject": "Field Study 2", "professor": "TBA", "units": 3},
                        ],
                        "2nd-sem": [
                            {"code": "PED13", "subject": "Teaching Internship", "professor": "TBA", "units": 6}
                        ]
                    }
                }
            },

            'BSCEd': {
                'name': 'Bachelor of Science in Christian Education',
                'type': 'undergraduate',
                'years': 4,
                'description': 'A program combining education principles with Christian values.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "GED01", "subject": "Art Appreciation", "professor": "TBA", "units": 3},
                            {"code": "GED02", "subject": "Understanding the Self", "professor": "TBA", "units": 3},
                            {"code": "GED03", "subject": "The Contemporary World", "professor": "TBA", "units": 3},
                            {"code": "GED04", "subject": "Purposive Communication", "professor": "TBA", "units": 3},
                            {"code": "PED01", "subject": "The Child & Adolescent Learners and Learning Principles", "professor": "TBA", "units": 3},
                            {"code": "PED03", "subject": "The Teacher and the Community, School Culture, and Organization Leadership", "professor": "TBA", "units": 3},
                            {"code": "PED05", "subject": "Facilitating Learner-Centered Teaching", "professor": "TBA", "units": 3},
                            {"code": "NST01", "subject": "NSTP1-CWTS/LTS", "professor": "TBA", "units": 3},
                            {"code": "PHE01", "subject": "PATHFIT 1: Movement Competency Training", "professor": "TBA", "units": 2}
                        ],
                        "2nd-sem": [
                            {"code": "GED05", "subject": "Readings in Philippine History", "professor": "TBA", "units": 3},
                            {"code": "GED06", "subject": "Mathematics in the Modern World", "professor": "TBA", "units": 3},
                            {"code": "GED07", "subject": "Science, Technology and Society", "professor": "TBA", "units": 3},
                            {"code": "GED08", "subject": "Ethics", "professor": "TBA", "units": 3},
                            {"code": "PED02", "subject": "The Teaching Profession", "professor": "TBA", "units": 3},
                            {"code": "PED04", "subject": "Foundation of Special and Inclusive Education", "professor": "TBA", "units": 3},
                            {"code": "PED08", "subject": "Technology for Teaching and Learning 1", "professor": "TBA", "units": 3},
                            {"code": "NST02", "subject": "NSTP2-CWTS/LTS", "professor": "TBA", "units": 3},
                            {"code": "PHE02", "subject": "PATHFIT 2: Exercises-based Fitness Activities", "professor": "TBA", "units": 2}
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "PED06", "subject": "Assessment in Learning 1", "professor": "TBA", "units": 3},
                            {"code": "GED09", "subject": "Life and Works of Rizal", "professor": "TBA", "units": 3},
                            {"code": "GGEL1", "subject": "Living in IT Era", "professor": "TBA", "units": 3},
                            {"code": "PED10", "subject": "Building and Enhancing New Literacies Across the Curriculum", "professor": "TBA", "units": 3},
                            {"code": "VED15", "subject": "Moral Issues and Concerns in Contemporary Living", "professor": "TBA", "units": 3},
                            {"code": "GEEL3", "subject": "Religions, Religious Experiences and Spirituality", "professor": "TBA", "units": 3},
                            {"code": "MCED20", "subject": "Philosophy of Christian Education", "professor": "TBA", "units": 3},
                            {"code": "VED14", "subject": "Values Education Through Community Service", "professor": "TBA", "units": 3},
                            {"code": "PHE03", "subject": "PATHFIT 3: Team Sports (Swimming)", "professor": "TBA", "units": 2}
                        ],
                        "2nd-sem": [
                            {"code": "PED07", "subject": "Assessment in Learning 2", "professor": "TBA", "units": 3},
                            {"code": "PED09", "subject": "The Teacher and the School Curriculum", "professor": "TBA", "units": 3},
                            {"code": "GEEL2", "subject": "Great Books", "professor": "TBA", "units": 3},
                            {"code": "ICCS4", "subject": "Calvin Studies & Reformed Creeds", "professor": "TBA", "units": 3},
                            {"code": "CED06", "subject": "Psycho-spiritual Development", "professor": "TBA", "units": 3},
                            {"code": "EED21", "subject": "Technology for Teaching and Learning 2", "professor": "TBA", "units": 3},
                            {"code": "VED1", "subject": "Foundation of Values Education", "professor": "TBA", "units": 3},
                            {"code": "VED20", "subject": "Filipino Values System", "professor": "TBA", "units": 3},
                            {"code": "PHE04", "subject": "PATHFIT 4: Team Sports (Outdoor Activities: Volleyball/Basketball)", "professor": "TBA", "units": 2}
                        ]
                    },
                    "3rd-year": {
                        "1st-sem": [
                            {"code": "ICED1", "subject": "Evangelism and Discipleship", "professor": "TBA", "units": 3},
                            {"code": "VED13", "subject": "Values Integration and Various Discipline", "professor": "TBA", "units": 3},
                            {"code": "CED16", "subject": "Introduction to Guidance Counseling", "professor": "TBA", "units": 3},
                            {"code": "VED18", "subject": "Development of Values Education Instructional Materials and Assessment", "professor": "TBA", "units": 3},
                            {"code": "VED11", "subject": "Facilitation: Theory and Practice", "professor": "TBA", "units": 3},
                            {"code": "VED10", "subject": "Information Technology and Human Development", "professor": "TBA", "units": 3},
                            {"code": "VED17", "subject": "Research in Christian Education I", "professor": "TBA", "units": 3},
                            {"code": "VED2", "subject": "Philosophical and Ethical Foundation of Values Education", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "VED07", "subject": "Contemporary Family", "professor": "TBA", "units": 3},
                            {"code": "VED08", "subject": "Transformative Education", "professor": "TBA", "units": 3},
                            {"code": "VED09", "subject": "Career Development and Work Values", "professor": "TBA", "units": 3},
                            {"code": "VED12", "subject": "Teaching Approaches and Strategies in Values Education", "professor": "TBA", "units": 3},
                            {"code": "VED19", "subject": "Research in Christian Education II", "professor": "TBA", "units": 3},
                            {"code": "VED03", "subject": "Philippine Culture and Values System", "professor": "TBA", "units": 3},
                            {"code": "VED04", "subject": "Psychological Theories of Values Development", "professor": "TBA", "units": 3},
                            {"code": "VED05", "subject": "Dynamics of Intra and Interpersonal Relations", "professor": "TBA", "units": 3}
                        ]
                    },
                    "4th-year": {
                        "1st-sem": [
                            {"code": "PED11", "subject": "Field Study 1", "professor": "TBA", "units": 3},
                            {"code": "PED12", "subject": "Field Study 2", "professor": "TBA", "units": 3},
                        ],
                        "2nd-sem": [
                            {"code": "PED13", "subject": "Teaching Internship", "professor": "TBA", "units": 6}
                        ]
                    }
                }
            },

            'MDivBS': {
                'name': 'Master of Divinity in Biblical Studies',
                'type': 'graduate',
                'years': 3,
                'description': 'Advanced theological education focused on biblical scholarship.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "RES01", "subject": "Research Methodology & Writing", "professor": "TBA", "units": 3},
                            {"code": "HER01", "subject": "Hermeneutics", "professor": "TBA", "units": 3},
                            {"code": "THEO01", "subject": "Biblical Theology", "professor": "TBA", "units": 3},
                            {"code": "CED01", "subject": "Christian Education", "professor": "TBA", "units": 3},
                            {"code": "OT01", "subject": "Pentateuch", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "THEO02", "subject": "Theology 1", "professor": "TBA", "units": 3},
                            {"code": "CHI01", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "CON01", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "SOE01", "subject": "Social Ethics", "professor": "TBA", "units": 3},
                            {"code": "NT01", "subject": "Gospel & Acts", "professor": "TBA", "units": 3},
                            {"code": "GFME1", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1},
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "THEO02", "subject": "Theology 1", "professor": "TBA", "units": 3},
                            {"code": "CHI01", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "CON01", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "SOE01", "subject": "Social Ethics", "professor": "TBA", "units": 3},
                            {"code": "NT01", "subject": "Gospel & Acts", "professor": "TBA", "units": 3},
                            {"code": "GFME1", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "THEO04", "subject": "Theology 3", "professor": "TBA", "units": 3},
                            {"code": "KCC01", "subject": "Kingdom, Covenant & Canon of the Bible", "professor": "TBA", "units": 3},
                            {"code": "NT02", "subject": "Paul's Theology and Epistles", "professor": "TBA", "units": 3},
                            {"code": "NT03", "subject": "General Epistles and Revelation", "professor": "TBA", "units": 3},
                            {"code": "EBS01", "subject": "Exegetical Book Study", "professor": "TBA", "units": 3},
                            {"code": "GFME3", "subject": "Field Ministry Education 3", "professor": "TBA", "units": 1},
                        ]
                    },
                    "3rd-year": {
                        "1st-sem": [
                            {"code": "CTP01", "subject": "Christian Thought and Philosophy", "professor": "TBA", "units": 3},
                            {"code": "EPR01", "subject": "Homiletics & Expository Preaching", "professor": "TBA", "units": 3},
                            {"code": "RES02", "subject": "Statistics in Research", "professor": "TBA", "units": 3},
                            {"code": "CPR01", "subject": "Church Polity & Reformed Worship", "professor": "TBA", "units": 3},
                            {"code": "THEO05", "subject": "Pastoral Theology", "professor": "TBA", "units": 3},
                            {"code": "GFME4", "subject": "Field Ministry Education 4", "professor": "TBA", "units": 1},
                        ],
                        "2nd-sem": [
                            {"code": "ELEC3", "subject": "Elective (Independent Study)", "professor": "TBA", "units": 3},
                            {"code": "THESIS", "subject": "Thesis or Internship (Full-time Pastorate or Church Planting)", "professor": "TBA", "units": 6}
                        ]
                    }
                }
            },

            'MDivPS': {
                'name': 'Master of Divinity in Pastoral Studies',
                'type': 'graduate',
                'years': 3,
                'description': 'Advanced theological education focused on pastoral ministry.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "RES01", "subject": "Research Methodology & Writing", "professor": "TBA", "units": 3},
                            {"code": "HER01", "subject": "Hermeneutics", "professor": "TBA", "units": 3},
                            {"code": "THEO01", "subject": "Biblical Theology", "professor": "TBA", "units": 3},
                            {"code": "CED01", "subject": "Christian Education", "professor": "TBA", "units": 3},
                            {"code": "ELEC1", "subject": "OT Elective", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "THEO02", "subject": "Theology 1", "professor": "TBA", "units": 3},
                            {"code": "CHI01", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "CON01", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "SOE01", "subject": "Social Ethics", "professor": "TBA", "units": 3},
                            {"code": "ELEC2", "subject": "NT Elective: Gospel and Acts", "professor": "TBA", "units": 3},
                            {"code": "GFME1", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1}
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "THEO03", "subject": "Theology 2", "professor": "TBA", "units": 3},
                            {"code": "CHI02", "subject": "Church History 2", "professor": "TBA", "units": 3},
                            {"code": "MEV01", "subject": "Mission and Evangelism", "professor": "TBA", "units": 3},
                            {"code": "CML01", "subject": "Church Management and Leadership", "professor": "TBA", "units": 3},
                            {"code": "CRE01", "subject": "Comparative Religion", "professor": "TBA", "units": 3},
                            {"code": "GFME2", "subject": "Field Ministry Education 2", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "THEO04", "subject": "Theology 3", "professor": "TBA", "units": 3},
                            {"code": "KCC01", "subject": "Kingdom, Covenant & Canon of the Bible", "professor": "TBA", "units": 3},
                            {"code": "CPC01", "subject": "Foundation & Strategies of Church Planting & Church Growth", "professor": "TBA", "units": 3},
                            {"code": "CLM01", "subject": "21st Century Leadership & Ministry", "professor": "TBA", "units": 3},
                            {"code": "CCO01", "subject": "Christian Ethics and Counseling", "professor": "TBA", "units": 3},
                            {"code": "GFME3", "subject": "Field Ministry Education 3", "professor": "TBA", "units": 1}
                        ]
                    },
                    "3rd-year": {
                        "1st-sem": [
                            {"code": "CTP01", "subject": "Christian Thought and Philosophy", "professor": "TBA", "units": 3},
                            {"code": "EPR01", "subject": "Homiletics & Expository Preaching", "professor": "TBA", "units": 3},
                            {"code": "RES02", "subject": "Statistics in Research", "professor": "TBA", "units": 3},
                            {"code": "CPR01", "subject": "Church Polity & Reformed Worship", "professor": "TBA", "units": 3},
                            {"code": "THEO05", "subject": "Pastoral Theology", "professor": "TBA", "units": 3},
                            {"code": "GFME4", "subject": "Field Ministry Education 4", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "ELEC3", "subject": "Elective (Independent Study)", "professor": "TBA", "units": 3},
                            {"code": "THESIS", "subject": "Thesis or Internship (full-time Pastorate or Church Planting)", "professor": "TBA", "units": 6}
                        ]
                    }
                }
            },

            'MDivCE': {
                'name': 'Master of Divinity in Christian Education',
                'type': 'graduate',
                'years': 3,
                'description': 'Advanced theological education focused on Christian education.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "RM01", "subject": "Research Methods", "professor": "TBA", "units": 3},
                            {"code": "MHER01", "subject": "Hermeneutics", "professor": "TBA", "units": 3},
                            {"code": "BTM01", "subject": "Biblical Theology", "professor": "TBA", "units": 3},
                            {"code": "UM01", "subject": "Introduction to Christian Education", "professor": "TBA", "units": 3},
                            {"code": "CED06", "subject": "Curriculum Development", "professor": "TBA", "units": 3},
                            {"code": "OT01", "subject": "OT Elective: Pentateuch", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "THEO02", "subject": "Theology 1", "professor": "TBA", "units": 3},
                            {"code": "CHI01", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "CON01", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "SOE01", "subject": "Social Ethics", "professor": "TBA", "units": 3},
                            {"code": "ELEC2", "subject": "NT Elective: Gospel and Acts", "professor": "TBA", "units": 3},
                            {"code": "GFME1", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1}
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "THEO03", "subject": "Theology 2", "professor": "TBA", "units": 3},
                            {"code": "CHI02", "subject": "Church History 2", "professor": "TBA", "units": 3},
                            {"code": "CED07", "subject": "CE of Children, Youth & Adult", "professor": "TBA", "units": 3},
                            {"code": "CED08", "subject": "College Teaching", "professor": "TBA", "units": 3},
                            {"code": "CED05", "subject": "Principles & Methods of Teaching", "professor": "TBA", "units": 3},
                            {"code": "FME02", "subject": "Field Ministry Education 2", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "THEO04", "subject": "Theology 3", "professor": "TBA", "units": 3},
                            {"code": "CLM01", "subject": "21st Century Leadership & Ministry", "professor": "TBA", "units": 3},
                            {"code": "CCO01", "subject": "Christian Counseling", "professor": "TBA", "units": 3},
                            {"code": "GRK01", "subject": "Greek 1", "professor": "TBA", "units": 3},
                            {"code": "HRBW01", "subject": "Hebrew 1", "professor": "TBA", "units": 3},
                            {"code": "GFME3", "subject": "Field Ministry Education 3", "professor": "TBA", "units": 1}
                        ]
                    },
                    "3rd-year": {
                        "1st-sem": [
                            {"code": "CTP01", "subject": "Christian Thought and Philosophy", "professor": "TBA", "units": 3},
                            {"code": "EP01", "subject": "Expository Preaching", "professor": "TBA", "units": 3},
                            {"code": "FCE01", "subject": "Foundation of Christian Education", "professor": "TBA", "units": 3},
                            {"code": "CPR01", "subject": "Church Polity & Reformed Worship", "professor": "TBA", "units": 3},
                            {"code": "RES02", "subject": "Statistics in Research", "professor": "TBA", "units": 3},
                            {"code": "GFME4", "subject": "Field Ministry Education 4", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "THESIS", "subject": "Thesis or Internship (full-time Pastorate or Church Planting)", "professor": "TBA", "units": 6}
                        ]
                    }
                }
            },
            
            'MABE': {
                'name': 'Master of Arts in Biblical Exposition',
                'type': 'graduate',
                'years': 4,
                'description': 'Graduate program emphasizing biblical exegesis and exposition.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "EBS05", "subject": "Foundation of Exegesis", "professor": "TBA", "units": 3},
                            {"code": "GFME10", "subject": "Ministry Clinic I", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "EPR05", "subject": "Foundation of Exposition", "professor": "TBA", "units": 3},
                            {"code": "GFME11", "subject": "Ministry Clinic II", "professor": "TBA", "units": 2}
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "EBS10", "subject": "Exegetical Method I", "professor": "TBA", "units": 3},
                            {"code": "EPR10", "subject": "Exposition of Epistolary Genre", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "EBS20", "subject": "Exegetical Method II", "professor": "TBA", "units": 3},
                            {"code": "EPR20", "subject": "Exposition of Narrative Genre", "professor": "TBA", "units": 3}
                        ]
                    },
                    "3rd-year": {
                        "1st-sem": [
                            {"code": "EBS30", "subject": "Exegesis of Philippians 1-2", "professor": "TBA", "units": 3},
                            {"code": "EPR30", "subject": "Exposition of Poetic Genre", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "EBS40", "subject": "Exegesis of Philippians 3-4", "professor": "TBA", "units": 3},
                            {"code": "EPR40", "subject": "Exposition of Prophetic Genre", "professor": "TBA", "units": 3}
                        ]
                    },
                    "4th-year": {
                        "1st-sem": [
                            {"code": "EPR50", "subject": "Methodology Sequential Exposition", "professor": "TBA", "units": 3},
                            {"code": "GFME15", "subject": "Ministry Internship I", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "EPR60", "subject": "Sequential Exposition of Philippians", "professor": "TBA", "units": 3},
                            {"code": "GFME16", "subject": "Ministry Internship II", "professor": "TBA", "units": 3}
                        ]
                    }
                }
            },

            'MACE': {
                'name': 'Master of Arts in Christian Education',
                'type': 'graduate',
                'years': 2,
                'description': 'Graduate program focused on Christian education leadership and pedagogy.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "RES01", "subject": "Research & Methodology in Writing", "professor": "TBA", "units": 3},
                            {"code": "HER01", "subject": "Hermeneutics", "professor": "TBA", "units": 3},
                            {"code": "THEO01", "subject": "Biblical Theology", "professor": "TBA", "units": 3},
                            {"code": "CED03", "subject": "Intro Christian Education", "professor": "TBA", "units": 3},
                            {"code": "ELEC1", "subject": "OT Elective", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "THEO02", "subject": "Theology 1", "professor": "TBA", "units": 3},
                            {"code": "CHI01", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "CON01", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "SOE01", "subject": "Social Ethics", "professor": "TBA", "units": 3},
                            {"code": "ELEC2", "subject": "NT Elective", "professor": "TBA", "units": 3},
                            {"code": "GFME1", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1}
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "THEO03", "subject": "Theology 2", "professor": "TBA", "units": 3},
                            {"code": "CHI02", "subject": "Church History 2", "professor": "TBA", "units": 3},
                            {"code": "CED04", "subject": "Foundation of Christian Education", "professor": "TBA", "units": 3},
                            {"code": "CED05", "subject": "Principles and Methods of Teaching", "professor": "TBA", "units": 3},
                            {"code": "CED06", "subject": "Curriculum Development", "professor": "TBA", "units": 3},
                            {"code": "GFME2", "subject": "Field Ministry Education 2", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "THEO04", "subject": "Theology 3", "professor": "TBA", "units": 3},
                            {"code": "CED07", "subject": "CE of Children, Youth & Adult", "professor": "TBA", "units": 3},
                            {"code": "CED08", "subject": "College Teaching", "professor": "TBA", "units": 3},
                            {"code": "CLM01", "subject": "21st Century Leadership & Ministry", "professor": "TBA", "units": 3},
                            {"code": "CCO01", "subject": "Christian Counseling", "professor": "TBA", "units": 3},
                            {"code": "GFME3", "subject": "Field Ministry Education 3", "professor": "TBA", "units": 1}
                        ]
                    }
                }
            },
            'MAM': {
                'name': 'Master of Arts in Ministry',
                'type': 'graduate',
                'years': 2,
                'description': 'Graduate program centered on ministry practice and leadership.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "RES01", "subject": "Research & Methodology in Writing", "professor": "TBA", "units": 3},
                            {"code": "HER01", "subject": "Hermeneutics", "professor": "TBA", "units": 3},
                            {"code": "THEO01", "subject": "Biblical Theology", "professor": "TBA", "units": 3},
                            {"code": "CED01", "subject": "Christian Education", "professor": "TBA", "units": 3},
                            {"code": "ELEC1", "subject": "OT Elective", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "THEO02", "subject": "Theology 1", "professor": "TBA", "units": 3},
                            {"code": "CHI01", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "CON01", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "SOE01", "subject": "Social Ethics", "professor": "TBA", "units": 3},
                            {"code": "ELEC2", "subject": "NT Elective", "professor": "TBA", "units": 3},
                            {"code": "GFME1", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1}
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "THEO03", "subject": "Theology 2", "professor": "TBA", "units": 3},
                            {"code": "CHI02", "subject": "Church History 2", "professor": "TBA", "units": 3},
                            {"code": "MEV01", "subject": "Mission and Evangelism", "professor": "TBA", "units": 3},
                            {"code": "CML01", "subject": "Church Management & Leadership", "professor": "TBA", "units": 3},
                            {"code": "CRE01", "subject": "Comparative Religion", "professor": "TBA", "units": 3},
                            {"code": "GFME2", "subject": "Field Ministry Education 2", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "THEO04", "subject": "Theology 3", "professor": "TBA", "units": 3},
                            {"code": "KCC01", "subject": "Kingdom, Covenant & Canon of the Bible", "professor": "TBA", "units": 3},
                            {"code": "CPC01", "subject": "Church Planting & Church Growth", "professor": "TBA", "units": 3},
                            {"code": "CLM01", "subject": "21st Century Leadership", "professor": "TBA", "units": 3},
                            {"code": "CCO01", "subject": "Christian Counseling", "professor": "TBA", "units": 3},
                            {"code": "GFME3", "subject": "Field Ministry Education 3", "professor": "TBA", "units": 1}
                        ]
                    }
                }
            },
            'MAICS': {
                'name': 'Master of Arts in Intercultural Studies',
                'type': 'graduate',
                'years': 2,
                'description': 'Graduate program focusing on missions and intercultural ministry.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "RES01", "subject": "Research & Methodology in Writing", "professor": "TBA", "units": 3},
                            {"code": "HER01", "subject": "Hermeneutics", "professor": "TBA", "units": 3},
                            {"code": "THEO01", "subject": "Biblical Theology", "professor": "TBA", "units": 3},
                            {"code": "CED02", "subject": "Christian Education (Cross-Cultural)", "professor": "TBA", "units": 3},
                            {"code": "ELEC1", "subject": "OT Elective", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "THEO02", "subject": "Theology 1", "professor": "TBA", "units": 3},
                            {"code": "CHI01", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "CON01", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "SOE01", "subject": "Social Ethics", "professor": "TBA", "units": 3},
                            {"code": "ELEC2", "subject": "NT Elective", "professor": "TBA", "units": 3},
                            {"code": "GFME1", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1}
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "THEO03", "subject": "Theology 2", "professor": "TBA", "units": 3},
                            {"code": "STM01", "subject": "Short Term Mission", "professor": "TBA", "units": 3},
                            {"code": "CIM01", "subject": "Contemporary Issues in Mission", "professor": "TBA", "units": 3},
                            {"code": "CRE01", "subject": "Comparative Religion", "professor": "TBA", "units": 3},
                            {"code": "MEV01", "subject": "Mission and Evangelism", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "THEO04", "subject": "Theology 3", "professor": "TBA", "units": 3},
                            {"code": "CAM01", "subject": "Cultural Anthropology and Mission", "professor": "TBA", "units": 3},
                            {"code": "ICO01", "subject": "Intercultural Communications", "professor": "TBA", "units": 3},
                            {"code": "CLM01", "subject": "21st Century Leadership & Ministry", "professor": "TBA", "units": 3},
                            {"code": "CPC01", "subject": "Church Planting & Church Growth", "professor": "TBA", "units": 3}
                        ]
                    }
                }
            },
            'MABS': {
                'name': 'Master of Arts in Biblical Studies',
                'type': 'graduate',
                'years': 3,
                'description': 'Graduate program in biblical studies and ministry.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "RES01", "subject": "Research Methodology & Writing", "professor": "TBA", "units": 3},
                            {"code": "HER01", "subject": "Hermeneutics", "professor": "TBA", "units": 3},
                            {"code": "THEO01", "subject": "Biblical Theology", "professor": "TBA", "units": 3},
                            {"code": "CED01", "subject": "Christian Education", "professor": "TBA", "units": 3},
                            {"code": "ELEC1", "subject": "OT Elective", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "THEO02", "subject": "Theology 1", "professor": "TBA", "units": 3},
                            {"code": "CHI01", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "CON01", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "SOE01", "subject": "Social Ethics", "professor": "TBA", "units": 3},
                            {"code": "ELEC2", "subject": "NT Elective: Gospel and Acts", "professor": "TBA", "units": 3},
                            {"code": "GFME1", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1}
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "THEO03", "subject": "Theology 2", "professor": "TBA", "units": 3},
                            {"code": "CHI02", "subject": "Church History 2", "professor": "TBA", "units": 3},
                            {"code": "MEV01", "subject": "Mission and Evangelism", "professor": "TBA", "units": 3},
                            {"code": "CML01", "subject": "Church Management and Leadership", "professor": "TBA", "units": 3},
                            {"code": "CRE01", "subject": "Comparative Religion", "professor": "TBA", "units": 3},
                            {"code": "GFME2", "subject": "Field Ministry Education 2", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "THEO04", "subject": "Theology 3", "professor": "TBA", "units": 3},
                            {"code": "KCC01", "subject": "Kingdom, Covenant & Canon of the Bible", "professor": "TBA", "units": 3},
                            {"code": "CPC01", "subject": "Foundation & Strategies of Church Planting & Church Growth", "professor": "TBA", "units": 3},
                            {"code": "CLM01", "subject": "21st Century Leadership & Ministry", "professor": "TBA", "units": 3},
                            {"code": "CCO01", "subject": "Christian Ethics and Counseling", "professor": "TBA", "units": 3},
                            {"code": "GFME3", "subject": "Field Ministry Education 3", "professor": "TBA", "units": 1}
                        ]
                    },
                    "3rd-year": {
                        "1st-sem": [
                            {"code": "CTP01", "subject": "Christian Thought and Philosophy", "professor": "TBA", "units": 3},
                            {"code": "EPR01", "subject": "Homiletics & Expository Preaching", "professor": "TBA", "units": 3},
                            {"code": "RES02", "subject": "Statistics in Research", "professor": "TBA", "units": 3},
                            {"code": "CPR01", "subject": "Church Polity & Reformed Worship", "professor": "TBA", "units": 3},
                            {"code": "THEO05", "subject": "Pastoral Theology", "professor": "TBA", "units": 3},
                            {"code": "GFME4", "subject": "Field Ministry Education 4", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "ELEC3", "subject": "Elective (Independent Study)", "professor": "TBA", "units": 3},
                            {"code": "", "subject": "Thesis or Internship (full-time Pastorate or Church Planting)", "professor": "TBA", "units": 6}
                        ]
                    }
                }
            },
            'MABC': {
                'name': 'Master of Arts in Biblical Counseling',
                'type': 'graduate',
                'years': 3,
                'description': 'Graduate program focusing on counseling grounded in biblical principles.',
                'curriculum': {
                    "1st-year": {
                        "1st-sem": [
                            {"code": "RES01", "subject": "Research Methodology & Writing", "professor": "TBA", "units": 3},
                            {"code": "HER01", "subject": "Hermeneutics", "professor": "TBA", "units": 3},
                            {"code": "THEO01", "subject": "Biblical Theology", "professor": "TBA", "units": 3},
                            {"code": "CED01", "subject": "Christian Education", "professor": "TBA", "units": 3},
                            {"code": "ELEC1", "subject": "OT Elective", "professor": "TBA", "units": 3}
                        ],
                        "2nd-sem": [
                            {"code": "THEO02", "subject": "Theology 1", "professor": "TBA", "units": 3},
                            {"code": "CHI01", "subject": "Church History 1", "professor": "TBA", "units": 3},
                            {"code": "CON01", "subject": "Contextualization", "professor": "TBA", "units": 3},
                            {"code": "SOE01", "subject": "Social Ethics", "professor": "TBA", "units": 3},
                            {"code": "ELEC2", "subject": "NT Elective: Gospel and Acts", "professor": "TBA", "units": 3},
                            {"code": "GFME1", "subject": "Field Ministry Education 1", "professor": "TBA", "units": 1}
                        ]
                    },
                    "2nd-year": {
                        "1st-sem": [
                            {"code": "THEO03", "subject": "Theology 2", "professor": "TBA", "units": 3},
                            {"code": "CHI02", "subject": "Church History 2", "professor": "TBA", "units": 3},
                            {"code": "MEV01", "subject": "Mission and Evangelism", "professor": "TBA", "units": 3},
                            {"code": "CML01", "subject": "Church Management and Leadership", "professor": "TBA", "units": 3},
                            {"code": "CRE01", "subject": "Comparative Religion", "professor": "TBA", "units": 3},
                            {"code": "GFME2", "subject": "Field Ministry Education 2", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "THEO04", "subject": "Theology 3", "professor": "TBA", "units": 3},
                            {"code": "KCC01", "subject": "Kingdom, Covenant & Canon of the Bible", "professor": "TBA", "units": 3},
                            {"code": "CPC01", "subject": "Foundation & Strategies of Church Planting & Church Growth", "professor": "TBA", "units": 3},
                            {"code": "CLM01", "subject": "21st Century Leadership & Ministry", "professor": "TBA", "units": 3},
                            {"code": "CCO01", "subject": "Christian Ethics and Counseling", "professor": "TBA", "units": 3},
                            {"code": "GFME3", "subject": "Field Ministry Education 3", "professor": "TBA", "units": 1}
                        ]
                    },
                    "3rd-year": {
                        "1st-sem": [
                            {"code": "CTP01", "subject": "Christian Thought and Philosophy", "professor": "TBA", "units": 3},
                            {"code": "EPR01", "subject": "Homiletics & Expository Preaching", "professor": "TBA", "units": 3},
                            {"code": "RES02", "subject": "Statistics in Research", "professor": "TBA", "units": 3},
                            {"code": "CPR01", "subject": "Church Polity & Reformed Worship", "professor": "TBA", "units": 3},
                            {"code": "THEO05", "subject": "Pastoral Theology", "professor": "TBA", "units": 3},
                            {"code": "GFME4", "subject": "Field Ministry Education 4", "professor": "TBA", "units": 1}
                        ],
                        "2nd-sem": [
                            {"code": "ELEC3", "subject": "Elective (Independent Study)", "professor": "TBA", "units": 3},
                            {"code": "", "subject": "Thesis or Internship (full-time Pastorate or Church Planting)", "professor": "TBA", "units": 6}
                        ]
                    }
                }
            }
            };
            
    

        if options['force']:
            self.stdout.write("Clearing existing curriculum data...")
            with transaction.atomic():
                AcademicSubject.objects.all().delete()
                AcademicSemester.objects.all().delete()
                AcademicYearLevel.objects.all().delete()
                AcademicProgram.objects.all().delete()

        # Load the complete curriculum data
        with transaction.atomic():
            programs_created = 0
            subjects_created = 0

            for program_code, program_info in curriculum_data.items():
                # Create program
                program, created = AcademicProgram.objects.get_or_create(
                    code=program_code,
                    defaults={
                        'name': program_info['name'],
                        'program_type': program_info['type'],
                        'duration_years': program_info['years'],
                        'description': program_info['description'],
                    }
                )
                if created:
                    programs_created += 1
                    self.stdout.write(f"  Created program: {program.code} - {program.name}")

                # Create year levels, semesters, and subjects
                for year_key, year_data in program_info['curriculum'].items():
                    year_number = int(year_key.split('-')[0][0])  # Extract year number
                    year_level, _ = AcademicYearLevel.objects.get_or_create(
                        program=program,
                        year_number=year_number,
                        defaults={'year_name': year_key}
                    )

                    for sem_key, subjects in year_data.items():
                        sem_number = int(sem_key.split('-')[0][0])  # Extract semester number
                        semester, _ = AcademicSemester.objects.get_or_create(
                            year_level=year_level,
                            semester_number=sem_number,
                            defaults={'semester_name': sem_key}
                        )

                        # Create subjects
                        for order, subject_data in enumerate(subjects):
                            if subject_data['code']:  # Skip subjects with empty codes
                                subject, created = AcademicSubject.objects.get_or_create(
                                    semester=semester,
                                    code=subject_data['code'],
                                    defaults={
                                        'name': subject_data['subject'],
                                        'professor': subject_data['professor'],
                                        'units': subject_data['units'],
                                        'order': order
                                    }
                                )
                                if created:
                                    subjects_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully loaded complete curriculum data:\n"
                f"  Programs created: {programs_created}\n"
                f"  Subjects created: {subjects_created}"
            )
        )

        # Display final summary
        self.stdout.write("\nFinal Summary:")
        for program in AcademicProgram.objects.all().order_by('program_type', 'code'):
            total_subjects = AcademicSubject.objects.filter(semester__year_level__program=program).count()
            self.stdout.write(f"  {program.code}: {program.name} - {total_subjects} subjects")
