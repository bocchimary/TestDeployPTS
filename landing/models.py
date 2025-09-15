from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager, Group, Permission
from django.utils import timezone
import uuid
from django.conf import settings

# --------------------
# CUSTOM USER MANAGER
# --------------------
class CustomUserManager(BaseUserManager):
    def create_user(self, username, email=None, password=None, full_name=None, user_type=None, contact_number=None, **extra_fields):
        if not username:
            raise ValueError('The Username must be set')
        email = self.normalize_email(email)
        user = self.model(
            username=username,
            email=email,
            full_name=full_name,
            user_type=user_type,
            contact_number=contact_number,
            **extra_fields
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, email, password, **extra_fields)

# --------------------
# CUSTOM USER MODEL
# --------------------
class User(AbstractBaseUser, PermissionsMixin):
    USER_TYPES = [
        ('student', 'Student'),
        ('alumni', 'Alumni'),
        ('signatory', 'Signatory'),
        ('admin', 'Admin'),
        ('business_manager', 'Business Manager'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPES)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_google_account = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    groups = models.ManyToManyField(
        Group,
        related_name='custom_user_groups',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups'
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name='custom_user_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions'
    )

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['full_name', 'user_type']

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.full_name} ({self.username})"

    def needs_profile_completion(self):
        """Check if user needs to complete their profile (especially for Google OAuth users)"""
        if not self.is_google_account:
            return False

        if self.user_type == 'student':
            try:
                profile = self.profile
                # Check if essential fields are missing - student_number must not start with GOOGLE_
                # and must have basic required fields filled
                return not all([
                    profile.student_number and not profile.student_number.startswith('GOOGLE_'),
                    profile.program and profile.program.strip() != 'To be set',
                    profile.year_level,
                    profile.address and profile.address.strip(),
                    profile.gender and profile.gender.strip(),
                    profile.birthdate
                ])
            except:
                return True

        elif self.user_type == 'alumni':
            try:
                profile = self.alumni_profile
                # Check if essential fields are missing - alumni_id must not start with GOOGLE_
                # and must have basic required fields filled
                return not all([
                    profile.alumni_id and not profile.alumni_id.startswith('GOOGLE_'),
                    profile.course_graduated and profile.course_graduated.strip() != 'To be set',
                    profile.year_graduated and profile.year_graduated.strip() != '2024',
                    profile.address and profile.address.strip(),
                    profile.gender and profile.gender.strip(),
                    profile.birthdate
                ])
            except:
                return True

        return False

    class Meta:
        db_table = 'users'


# --------------------
# STUDENT PROFILE
# --------------------
class StudentProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    student_number = models.CharField(max_length=50, unique=True)
    program = models.CharField(max_length=100)
    year_level = models.IntegerField()
    is_graduating = models.BooleanField(default=False)
    address = models.CharField(max_length=255, null=True, blank=True)
    gender = models.CharField(max_length=10, null=True, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    emergency_contact = models.CharField(max_length=255, null=True, blank=True)


    def __str__(self):
        return self.student_number
    
    @property
    def profile_picture_url(self):
        """Safely return profile picture URL or default image"""
        if self.profile_picture and hasattr(self.profile_picture, 'url'):
            try:
                # Check if the file actually exists
                import os
                from django.conf import settings
                file_path = os.path.join(settings.MEDIA_ROOT, str(self.profile_picture))
                if os.path.exists(file_path):
                    return self.profile_picture.url
                else:
                    # File doesn't exist, return default
                    return '/static/images/default-profile.png'
            except (ValueError, OSError, AttributeError):
                # Any error, return default
                return '/static/images/default-profile.png'
        return '/static/images/default-profile.png'

    class Meta:
        db_table = 'student_profiles'
    
class AlumniProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='alumni_profile')
    alumni_id = models.CharField(max_length=50, unique=True)
    course_graduated = models.CharField(max_length=100)
    year_graduated = models.CharField(max_length=4)
    address = models.CharField(max_length=255, null=True, blank=True)
    gender = models.CharField(max_length=10, null=True, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)

    def __str__(self):
        return f"{self.user.full_name} ({self.course_graduated} - {self.year_graduated})"
    
    @property
    def profile_picture_url(self):
        """Safely return profile picture URL or default image"""
        if self.profile_picture and hasattr(self.profile_picture, 'url'):
            try:
                # Check if the file actually exists
                import os
                from django.conf import settings
                file_path = os.path.join(settings.MEDIA_ROOT, str(self.profile_picture))
                if os.path.exists(file_path):
                    return self.profile_picture.url
                else:
                    # File doesn't exist, return default
                    return '/static/images/default-profile.png'
            except (ValueError, OSError, AttributeError):
                # Any error, return default
                return '/static/images/default-profile.png'
        return '/static/images/default-profile.png'

    class Meta:
        db_table = 'alumni_profiles'


# --------------------
# SIGNATORY PROFILE
# --------------------
class SignatoryProfile(models.Model):
    SIGNATORY_TYPES = [
        ('dorm_supervisor', 'Dorm Supervisor'),
        ('canteen_concessionaire', 'Canteen Concessionaire'),
        ('library_director', 'Library Director'),
        ('scholarship_director', 'Scholarship Director'),
        ('it_director', 'IT Director'),
        ('student_affairs', 'Student Affairs'),
        ('cashier', 'Cashier'),
        ('business_manager', 'Business Manager'),
        ('registrar', 'Registrar'),
        ('academic_dean', 'Academic Dean'),
        ('president', 'President'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='signatory_profile')
    signatory_type = models.CharField(max_length=50, choices=SIGNATORY_TYPES)
    department = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    gender = models.CharField(max_length=10, null=True, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    pin = models.CharField(max_length=128, blank=True, null=True)  # Hashed PIN for security
    pin_set = models.BooleanField(default=False)  # Track if PIN has been set
    force_password_change = models.BooleanField(default=True)  # Force password change on first login

    def __str__(self):
        return f"{self.user.full_name} ({self.get_signatory_type_display()})"
    
    @property
    def profile_picture_url(self):
        """Safely return profile picture URL or default image"""
        if self.profile_picture and hasattr(self.profile_picture, 'url'):
            try:
                # Check if the file actually exists
                import os
                from django.conf import settings
                file_path = os.path.join(settings.MEDIA_ROOT, str(self.profile_picture))
                if os.path.exists(file_path):
                    return self.profile_picture.url
                else:
                    # File doesn't exist, return default
                    return '/static/images/default-profile.png'
            except (ValueError, OSError, AttributeError):
                # Any error, return default
                return '/static/images/default-profile.png'
        return '/static/images/default-profile.png'

    class Meta:
        db_table = 'signatory_profiles'


# --------------------
# REGISTRAR PROFILE
# --------------------
class RegistrarProfile(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='registrar_profile')
    position = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    # Security setup (mirror signatory)
    pin = models.CharField(max_length=128, blank=True, null=True)
    pin_set = models.BooleanField(default=False)
    force_password_change = models.BooleanField(default=True)
    bio = models.TextField(blank=True, null=True)
    office_location = models.CharField(max_length=100, blank=True, null=True)
    office_hours = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.full_name} - {self.position or 'Registrar'}"

    @property
    def profile_picture_url(self):
        """Safely return profile picture URL or default image"""
        if self.profile_picture and hasattr(self.profile_picture, 'url'):
            try:
                # Check if the file actually exists
                import os
                from django.conf import settings
                file_path = os.path.join(settings.MEDIA_ROOT, str(self.profile_picture))
                if os.path.exists(file_path):
                    return self.profile_picture.url
                else:
                    # File doesn't exist, return default
                    return '/static/images/default-profile.png'
            except (ValueError, OSError, AttributeError):
                # Any error, return default
                return '/static/images/default-profile.png'
        return '/static/images/default-profile.png'

    class Meta:
        db_table = 'registrar_profiles'


class BusinessManagerProfile(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='business_manager_profile')
    position = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    # Security setup (mirror signatory)
    pin = models.CharField(max_length=128, blank=True, null=True)
    pin_set = models.BooleanField(default=False)
    force_password_change = models.BooleanField(default=True)
    bio = models.TextField(blank=True, null=True)
    office_location = models.CharField(max_length=100, blank=True, null=True)
    office_hours = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.full_name} - {self.position or 'Business Manager'}"

    @property
    def profile_picture_url(self):
        """Safely return profile picture URL or default image"""
        if self.profile_picture and hasattr(self.profile_picture, 'url'):
            try:
                # Check if the file actually exists
                import os
                from django.conf import settings
                file_path = os.path.join(settings.MEDIA_ROOT, str(self.profile_picture))
                if os.path.exists(file_path):
                    return self.profile_picture.url
                else:
                    # File doesn't exist, return default
                    return '/static/images/default-profile.png'
            except (ValueError, OSError, AttributeError):
                # Any error, return default
                return '/static/images/default-profile.png'
        return '/static/images/default-profile.png'

    class Meta:
        db_table = 'business_manager_profiles'


# --------------------
# CLEARANCE FORM
# --------------------
class ClearanceForm(models.Model):
    CLEARANCE_TYPES = [
        ('enrollment', 'Enrollment'),
        ('graduation', 'Graduation'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clearance_forms')
    clearance_type = models.CharField(max_length=20, choices=CLEARANCE_TYPES)
    semester = models.CharField(max_length=50)
    academic_year = models.CharField(max_length=20, blank=True, null=True)
    section = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    finalized_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.student.full_name} - {self.clearance_type}"

    def get_signatory_status(self, signatory_type):
        """
        Get the status for a specific signatory type without creating individual records.
        This is a virtual approach that reduces database bloat.
        """
        # Check if there's an actual record for this signatory type
        signatory_record = self.clearancesignatory_set.filter(
            signatory__signatory_profile__signatory_type=signatory_type
        ).first()
        
        if signatory_record:
            return {
                'status': signatory_record.status,
                'timestamp': signatory_record.updated_at,
                'remarks': signatory_record.remarks,
                'ip_address': signatory_record.ip_address,
                'has_record': True
            }
        else:
            return {
                'status': 'pending',
                'timestamp': None,
                'remarks': None,
                'ip_address': None,
                'has_record': False
            }
    
    def get_all_signatory_statuses(self):
        """
        Get status for all signatory types efficiently.
        """
        signatory_types = [
            'dorm_supervisor', 'canteen_concessionaire', 'library_director',
            'scholarship_director', 'it_director', 'student_affairs',
            'cashier', 'business_manager', 'registrar', 'academic_dean'
        ]
        
        # Get all existing records for this clearance
        existing_records = self.clearancesignatory_set.select_related(
            'signatory__signatory_profile'
        ).all()
        
        # Create a lookup dictionary
        record_lookup = {}
        for record in existing_records:
            signatory_type = record.signatory.signatory_profile.signatory_type
            record_lookup[signatory_type] = record
        
        # Build status dictionary
        statuses = {}
        for signatory_type in signatory_types:
            if signatory_type in record_lookup:
                record = record_lookup[signatory_type]
                statuses[signatory_type] = {
                    'status': record.status,
                    'timestamp': record.updated_at,
                    'remarks': record.remarks,
                    'ip_address': record.ip_address,
                    'has_record': True
                }
            else:
                statuses[signatory_type] = {
                    'status': 'pending',
                    'timestamp': None,
                    'remarks': None,
                    'ip_address': None,
                    'has_record': False
                }
        
        return statuses

    class Meta:
        db_table = 'clearance_forms'
        ordering = ['-submitted_at']


# --------------------
# SIGNATORY APPROVAL
# --------------------
class ClearanceSignatory(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clearance = models.ForeignKey(ClearanceForm, on_delete=models.CASCADE, related_name='signatories')
    signatory = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_clearances')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    role = models.CharField(max_length=100, blank=True, null=True)  # ✅ add this line
    remarks = models.TextField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True)  # Alias for remarks for compatibility
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    seen_by_signatory = models.BooleanField(default=False)  # Track if signatory has seen this form
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.signatory.full_name} - {self.status}"
    
    def save(self, *args, **kwargs):
        """Override save to ensure disapproval notifications are sent"""
        # Check if this is a status change to disapproved
        is_new_disapproval = False
        if self.pk:
            # Existing record - check if status changed to disapproved
            try:
                old_instance = ClearanceSignatory.objects.get(pk=self.pk)
                if old_instance.status != 'disapproved' and self.status == 'disapproved':
                    is_new_disapproval = True
            except ClearanceSignatory.DoesNotExist:
                pass
        else:
            # New record - check if it's being created as disapproved
            if self.status == 'disapproved':
                is_new_disapproval = True
        
        # Save first
        super().save(*args, **kwargs)
        
        # Send notification if this is a new disapproval
        if is_new_disapproval:
            try:
                from .notification_service import NotificationService
                NotificationService.ensure_disapproval_notification(self)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error ensuring disapproval notification: {str(e)}")

    class Meta:
        db_table = 'clearance_signatories'
        indexes = [
            models.Index(fields=['clearance', 'signatory']),
            models.Index(fields=['status']),
            models.Index(fields=['signatory', 'status']),
            models.Index(fields=['seen_by_signatory']),
        ]
        # Prevent duplicate records for same clearance and signatory
        constraints = [
            models.UniqueConstraint(
                fields=['clearance', 'signatory'],
                name='unique_clearance_signatory'
            )
        ]


# --------------------
# DOCUMENT REQUEST
# --------------------
class DocumentRequest(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('released', 'Released'),
        ('blocked_due_to_balance', 'Blocked Due to Balance'),
    ]

    SEMESTER_CHOICES = [
        ('1', 'First Semester'),
        ('2', 'Second Semester'),
        ('0', 'None'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='document_requests')
    document_type = models.CharField(max_length=100)
    purpose = models.TextField(null=True, blank=True)  # Make it nullable
    preferred_release = models.DateField(null=True, blank=True)  # Make it optional
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_draft = models.BooleanField(default=True)
    semester = models.CharField(
        max_length=1,
        choices=SEMESTER_CHOICES,
        default='0',  # Default to 'None'
    )
    
    # Business Manager approval fields
    business_manager_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('disapproved', 'Disapproved')],
        default='pending'
    )
    business_manager_timestamp = models.DateTimeField(null=True, blank=True)
    business_manager_comment = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'document_requests'
        ordering = ['-created_at']


# --------------------
# FINAL FORMS (PRINTABLE)
# --------------------
class FinalForm(models.Model):
    FORM_TYPE_CHOICES = [
        ('enrollment', 'Enrollment'),
        ('graduation', 'Graduation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='final_forms')
    form_type = models.CharField(max_length=20, choices=FORM_TYPE_CHOICES)
    form_data = models.JSONField()
    is_submitted = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_final_forms')
    printed_by_admin = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.form_type} Form for {self.student.full_name}"

    class Meta:
        db_table = 'final_forms'


# --------------------
# FINANCIAL CLEARANCE
# --------------------
class FinancialClearance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    has_balance = models.BooleanField(default=False)
    checked_at = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - Balance: {'Yes' if self.has_balance else 'No'}"

    class Meta:
        db_table = 'financial_clearances'


# --------------------
# MESSAGES
# --------------------
class Conversation(models.Model):
    """Represents a conversation between two users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participant_1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_p1')
    participant_2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_p2')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Track who can start conversations (business rule enforcement)
    initiated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='initiated_conversations')
    
    class Meta:
        db_table = 'conversations'
        unique_together = [['participant_1', 'participant_2']]
        
    def __str__(self):
        return f"Conversation between {self.participant_1.full_name} and {self.participant_2.full_name}"
        
    def get_other_participant(self, user):
        """Get the other participant in the conversation"""
        return self.participant_2 if self.participant_1 == user else self.participant_1
        
    def get_last_message(self):
        """Get the last message in this conversation"""
        return self.messages.order_by('-sent_at').first()

class Message(models.Model):
    """Individual message in a conversation"""
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('file', 'File'),
        ('image', 'Image'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    content = models.TextField(blank=True, null=True)  # Text content
    file_attachment = models.FileField(upload_to='messages/files/', blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)  # Original filename
    file_size = models.BigIntegerField(blank=True, null=True)  # File size in bytes
    
    # Message status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(blank=True, null=True)
    
    # Related to forms (optional - for context)
    clearance = models.ForeignKey(ClearanceForm, on_delete=models.CASCADE, null=True, blank=True)
    enrollment = models.ForeignKey('EnrollmentForm', on_delete=models.CASCADE, null=True, blank=True)
    graduation = models.ForeignKey('GraduationForm', on_delete=models.CASCADE, null=True, blank=True)
    
    sent_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'messages'
        ordering = ['sent_at']
        
    def __str__(self):
        return f"Message from {self.sender.full_name} at {self.sent_at}"
        
    @property
    def file_size_formatted(self):
        """Return human-readable file size"""
        if not self.file_size:
            return None
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.file_size < 1024.0:
                return f"{self.file_size:.1f} {unit}"
            self.file_size /= 1024.0
        return f"{self.file_size:.1f} TB"
        
    def mark_as_read(self):
        """Mark message as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

class MessageRead(models.Model):
    """Track when users read messages (for group conversations in future)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_by')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'message_reads'
        unique_together = [['message', 'user']]


# --------------------
# NOTIFICATIONS
# --------------------
class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('form_submitted', 'Form Submitted'),
        ('form_approved', 'Form Approved'),
        ('form_disapproved', 'Form Disapproved'),
        ('document_ready', 'Document Ready for Release'),
        ('document_released', 'Document Released'),
        ('report_generated', 'Report Generated'),
        ('clearance_completed', 'Clearance Completed'),
        ('system_alert', 'System Alert'),
        ('deadline_reminder', 'Deadline Reminder'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    FORM_TYPES = [
        ('clearance', 'Clearance'),
        ('enrollment', 'Enrollment'),
        ('graduation', 'Graduation'),
        ('document_request', 'Document Request'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES, default='system_alert')
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Related form information
    form_type = models.CharField(max_length=20, choices=FORM_TYPES, null=True, blank=True)
    form_id = models.UUIDField(null=True, blank=True, help_text="ID of the related form")
    
    # Action information (for disapprovals)
    action_required = models.BooleanField(default=False)
    action_deadline = models.DateTimeField(null=True, blank=True)
    settlement_period = models.DurationField(null=True, blank=True, help_text="Time given to resolve issues")
    
    # Additional metadata
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    extra_data = models.JSONField(null=True, blank=True, help_text="Additional notification data")
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'notification_type']),
            models.Index(fields=['notification_type', 'created_at']),
            models.Index(fields=['email_sent', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.title}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class NotificationTemplate(models.Model):
    """Templates for different types of notifications"""
    TEMPLATE_TYPES = [
        ('form_submitted', 'Form Submitted'),
        ('form_approved', 'Form Approved'),
        ('form_disapproved', 'Form Disapproved'),
        ('document_ready', 'Document Ready'),
        ('document_released', 'Document Released'),
        ('clearance_completed', 'Clearance Completed'),
        ('enrollment_completed', 'Enrollment Completed'),
        ('graduation_completed', 'Graduation Completed'),
        ('daily_digest', 'Daily Digest'),
        ('report_generated', 'Report Generated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template_type = models.CharField(max_length=30, choices=TEMPLATE_TYPES, unique=True)
    email_subject = models.CharField(max_length=255)
    email_template = models.TextField(help_text="Email template with placeholders")
    in_app_title = models.CharField(max_length=255)
    in_app_message = models.TextField(help_text="In-app notification template")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_templates'
        
    def __str__(self):
        return f"Template: {self.get_template_type_display()}"


class EmailNotificationLog(models.Model):
    """Log all email notifications sent"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('bounced', 'Bounced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_logs')
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, null=True, blank=True)
    email_type = models.CharField(max_length=30)
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    content = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'email_notification_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'email_type']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"Email to {self.recipient_email} - {self.status}"


class NotificationPreference(models.Model):
    """User preferences for notifications"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Email preferences
    email_on_form_approved = models.BooleanField(default=True)
    email_on_form_disapproved = models.BooleanField(default=True)
    email_on_document_ready = models.BooleanField(default=True)
    email_on_clearance_completed = models.BooleanField(default=True)
    email_on_enrollment_completed = models.BooleanField(default=True)
    email_on_graduation_completed = models.BooleanField(default=True)
    email_daily_digest = models.BooleanField(default=True)
    
    # In-app notification preferences
    notify_form_submissions = models.BooleanField(default=True)
    notify_status_changes = models.BooleanField(default=True)
    notify_document_updates = models.BooleanField(default=True)
    notify_system_alerts = models.BooleanField(default=True)
    
    # Digest preferences (for signatories)
    digest_frequency = models.CharField(
        max_length=10,
        choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('never', 'Never')],
        default='daily'
    )
    digest_time = models.TimeField(default='18:00')  # Default to 6 PM
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_preferences'
        
    def __str__(self):
        return f"Preferences for {self.user.full_name}"


# --------------------
# GENERATED REPORTS
# --------------------
class GeneratedReport(models.Model):
    REPORT_TYPES = [
        ('clearance', 'Clearance'),
        ('enrollment', 'Enrollment'),
        ('graduation', 'Graduation'),
        ('document_release', 'Document Release'),
        ('clearance_pack', 'Clearance Pack'),
        ('enrollment_pack', 'Enrollment Pack'),  
        ('graduation_pack', 'Graduation Pack'),
        ('manual_activity', 'Activity Report'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('generating', 'Generating'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES, db_index=True)
    period_start = models.DateField(help_text="Start of reporting period", null=True, blank=True, db_index=True)
    period_end = models.DateField(help_text="End of reporting period", null=True, blank=True, db_index=True)
    file = models.FileField(upload_to='reports/', null=True, blank=True)
    size_bytes = models.PositiveIntegerField(default=0)
    checksum = models.CharField(max_length=64, blank=True, null=True, help_text="SHA-256 checksum of the file")
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='generated_reports')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed', db_index=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'generated_reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['report_type', 'created_at'], name='gr_type_created_idx'),
            models.Index(fields=['report_type', 'period_start', 'period_end'], name='gr_type_period_idx'),
            models.Index(fields=['generated_by', 'created_at'], name='gr_user_created_idx'),
            models.Index(fields=['status', 'created_at'], name='gr_status_created_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['report_type', 'period_start', 'period_end'],
                name='unique_report_per_period',
                condition=models.Q(period_start__isnull=False, period_end__isnull=False)
            ),
        ]
    
    def __str__(self):
        return f"{self.get_report_type_display()} - {self.period_start} to {self.period_end}"
    
    @property
    def filename(self):
        if self.file:
            return self.file.name.split('/')[-1]
        return None
    
    @property
    def file_exists(self):
        return bool(self.file and self.file.storage.exists(self.file.name))
    
    @property 
    def download_url(self):
        if self.file_exists:
            return self.file.url
        return None


# --------------------
# AUDIT LOGS
# --------------------
class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action_type = models.CharField(max_length=100)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']

# --------------------
# CALENDAR EVENTS
# --------------------
class CalendarEvent(models.Model):
    EVENT_TYPES = [
        ('holiday', 'Holiday'),
        ('event', 'Event'),
        ('meeting', 'Meeting'),
        ('deadline', 'Deadline'),
        ('reminder', 'Reminder'),
    ]
    
    EVENT_COLORS = [
        ('blue', 'Blue'),
        ('yellow', 'Yellow'),
        ('red', 'Red'),
        ('green', 'Green'),
        ('purple', 'Purple'),
        ('orange', 'Orange'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, default='event')
    color = models.CharField(max_length=20, choices=EVENT_COLORS, default='blue')
    start_date = models.DateField()
    start_time = models.TimeField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    is_all_day = models.BooleanField(default=False)
    is_holiday = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'calendar_events'
        ordering = ['start_date', 'start_time']

    def __str__(self):
        return f"{self.title} - {self.start_date}"

    @property
    def display_time(self):
        if self.is_all_day:
            return "All Day"
        elif self.start_time and self.end_time:
            return f"{self.start_time.strftime('%I:%M %p')} - {self.end_time.strftime('%I:%M %p')}"
        elif self.start_time:
            return self.start_time.strftime('%I:%M %p')
        else:
            return ""

class EnrollmentForm(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollment_forms')
    enrollment_date = models.DateField()
    academic_year = models.CharField(max_length=20)
    course = models.CharField(max_length=100)
    year = models.CharField(max_length=10)
    section = models.CharField(max_length=20, blank=True)  # Student's section (A, B, C, etc.)
    semester = models.CharField(max_length=50, blank=True)  # Semester enrolled (First Semester, Second Semester)
    subjects = models.JSONField(blank=True, null=True)  # Store subjects as JSON
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_draft = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Optionally, you can add a JSONField for extra data if you want to store snapshot info
    # extra_data = models.JSONField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.full_name} - {self.academic_year} - {self.course}"

    class Meta:
        db_table = 'enrollment_forms'
        ordering = ['-created_at']

class GraduationForm(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='graduation_forms')
    # Separate name fields
    first_name = models.CharField(max_length=100, blank=True, null=True)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    grad_date = models.DateField()
    grad_appno = models.CharField(max_length=50)
    place_of_birth = models.CharField(max_length=255)
    present_address = models.CharField(max_length=255, blank=True)
    permanent_address = models.CharField(max_length=255, blank=True)
    major = models.CharField(max_length=100, blank=True, null=True)
    thesis_title = models.CharField(max_length=255, blank=True, null=True)
    subjects = models.JSONField(blank=True, null=True)  # List of dicts: course_no, title, units, remarks
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    confirmed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.full_name} - {self.grad_appno}"

    class Meta:
        db_table = 'graduation_forms'
        ordering = ['-created_at']


# --------------------
# ENROLLMENT SIGNATORY
# --------------------
class EnrollmentSignatory(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(EnrollmentForm, on_delete=models.CASCADE, related_name='signatories')
    signatory = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    role = models.CharField(max_length=100, blank=True, null=True)  # dean, business_manager, registrar
    remarks = models.TextField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True)  # Alias for remarks for compatibility
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.signatory.full_name} - {self.status}"

    class Meta:
        db_table = 'enrollment_signatories'


# --------------------
# GRADUATION SIGNATORY
# --------------------
class GraduationSignatory(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    graduation = models.ForeignKey(GraduationForm, on_delete=models.CASCADE, related_name='signatories')
    signatory = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_graduations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    role = models.CharField(max_length=100, blank=True, null=True)  # business_manager, registrar
    remarks = models.TextField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True)  # Alias for remarks for compatibility
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.signatory.full_name} - {self.status}"

    class Meta:
        db_table = 'graduation_signatories'

# --------------------
# SIGNATORY ACTIVITY LOG
# --------------------
class SignatoryActivityLog(models.Model):
    ACTION_TYPES = [
        ('approve', 'Approve'),
        ('disapprove', 'Disapprove'),
        ('view', 'View'),
        ('print', 'Print'),
        ('delete', 'Delete'),
    ]
    
    FORM_TYPES = [
        ('clearance', 'Clearance'),
        ('enrollment', 'Enrollment'),
        ('graduation', 'Graduation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    signatory = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    form_type = models.CharField(max_length=20, choices=FORM_TYPES)
    form_id = models.UUIDField()  # ID of the form being acted upon
    student_name = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    location_data = models.JSONField(blank=True, null=True)  # Store location info if available
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.signatory.full_name} - {self.action_type} - {self.form_type}"

    class Meta:
        db_table = 'signatory_activity_logs'
        ordering = ['-created_at']


class BusinessManagerActivityLog(models.Model):
    ACTION_TYPES = [
        ('approve', 'Approve'),
        ('disapprove', 'Disapprove'),
        ('view', 'View'),
        ('print', 'Print'),
        ('delete', 'Delete'),
    ]
    
    FORM_TYPES = [
        ('clearance', 'Clearance'),
        ('enrollment', 'Enrollment'),
        ('graduation', 'Graduation'),
        ('credential', 'Credential Request'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_manager = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bm_activity_logs')
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    form_type = models.CharField(max_length=20, choices=FORM_TYPES)
    form_id = models.UUIDField()  # ID of the form being acted upon
    student_name = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    location_data = models.JSONField(blank=True, null=True)  # Store location info if available
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.business_manager.full_name} - {self.action_type} - {self.form_type}"

    class Meta:
        db_table = 'business_manager_activity_logs'
        ordering = ['-created_at']


# --------------------
# AUTO GENERATED REPORTS
# --------------------
class AutoGeneratedReport(models.Model):
    REPORT_TYPES = [
        ('approved_forms', 'Approved Forms'),
        ('pending_forms', 'Pending Forms'),
        ('disapproved_forms', 'Disapproved Forms'),
    ]
    
    PERIOD_TYPES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    period_type = models.CharField(max_length=20, choices=PERIOD_TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    file_path = models.CharField(max_length=500, blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='auto_generated_reports')

    def __str__(self):
        return f"{self.get_report_type_display()} - {self.get_period_type_display()} ({self.start_date} to {self.end_date})"

    class Meta:
        db_table = 'auto_generated_reports'
        ordering = ['-generated_at']

# Simple Automated Report Scheduler Model
class ReportScheduler(models.Model):
    task_name = models.CharField(max_length=100, unique=True)
    last_run_date = models.DateField(null=True, blank=True)
    last_run_time = models.DateTimeField(null=True, blank=True)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.task_name} - Last run: {self.last_run_date or 'Never'}"
        
    class Meta:
        db_table = 'report_scheduler'
        verbose_name = 'Report Scheduler'
        verbose_name_plural = 'Report Schedulers'

# --------------------
# OTP MODEL FOR SIGNUP VERIFICATION
# --------------------
class OTPVerification(models.Model):
    email = models.EmailField()
    otp_code = models.CharField(max_length=4)
    user_type = models.CharField(max_length=20, choices=User.USER_TYPES)
    signup_data = models.JSONField()  # Store signup form data temporarily
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def __str__(self):
        return f"OTP for {self.email} - {self.otp_code}"
    
    class Meta:
        db_table = 'otp_verification'
        ordering = ['-created_at']

# --------------------
# PASSWORD RESET MODEL
# --------------------
class PasswordResetToken(models.Model):
    email = models.EmailField()
    token = models.CharField(max_length=100, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def __str__(self):
        return f"Password reset for {self.email}"
    
    class Meta:
        db_table = 'password_reset_tokens'
        ordering = ['-created_at']


# --------------------
# ACADEMIC PROGRAM MODELS
# --------------------
class AcademicProgram(models.Model):
    """Academic programs available in the institution"""
    PROGRAM_TYPES = [
        ('undergraduate', 'Undergraduate'),
        ('graduate', 'Graduate'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)  # e.g., "ABTh", "BEED"
    name = models.CharField(max_length=200)  # Full program name
    program_type = models.CharField(max_length=20, choices=PROGRAM_TYPES)
    duration_years = models.IntegerField()  # Number of years to complete
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        db_table = 'academic_programs'
        ordering = ['program_type', 'code']


class AcademicYearLevel(models.Model):
    """Year levels within each program"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(AcademicProgram, on_delete=models.CASCADE, related_name='year_levels')
    year_number = models.IntegerField()  # 1, 2, 3, 4
    year_name = models.CharField(max_length=50)  # "1st-year", "2nd-year", etc.

    def __str__(self):
        return f"{self.program.code} - {self.year_name}"

    class Meta:
        db_table = 'academic_year_levels'
        unique_together = ['program', 'year_number']
        ordering = ['program', 'year_number']


class AcademicSemester(models.Model):
    """Semesters within each year level"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    year_level = models.ForeignKey(AcademicYearLevel, on_delete=models.CASCADE, related_name='semesters')
    semester_number = models.IntegerField()  # 1, 2
    semester_name = models.CharField(max_length=50)  # "1st-sem", "2nd-sem"

    def __str__(self):
        return f"{self.year_level.program.code} - {self.year_level.year_name} - {self.semester_name}"

    class Meta:
        db_table = 'academic_semesters'
        unique_together = ['year_level', 'semester_number']
        ordering = ['year_level', 'semester_number']


class AcademicSubject(models.Model):
    """Subjects within each semester"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester = models.ForeignKey(AcademicSemester, on_delete=models.CASCADE, related_name='subjects')
    code = models.CharField(max_length=20)  # Subject code like "GED01"
    name = models.CharField(max_length=200)  # Subject name
    professor = models.CharField(max_length=100, default="TBA")  # Professor name
    units = models.IntegerField()  # Credit units
    order = models.IntegerField(default=0)  # Order within semester

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        db_table = 'academic_subjects'
        ordering = ['semester', 'order', 'code']


class PendingUser(models.Model):
    """Stores pending user accounts awaiting registrar approval"""
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('declined', 'Declined'),
    ]
    
    USER_TYPE_CHOICES = [
        ('student', 'Student'),
        ('alumni', 'Alumni'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    contact_number = models.CharField(max_length=20, null=True, blank=True)
    
    # Store signup data as JSON for later user creation
    signup_data = models.JSONField()
    
    # Approval workflow fields
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(default=timezone.now)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='approved_pending_users'
    )
    
    # Optional decline reason
    decline_reason = models.TextField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.full_name} ({self.email}) - {self.approval_status}"
    
    class Meta:
        db_table = 'pending_users'
        ordering = ['-submitted_at']