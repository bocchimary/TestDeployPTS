from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import (
    User, StudentProfile, AlumniProfile, SignatoryProfile,
    ClearanceForm, ClearanceSignatory, EnrollmentForm, GraduationForm
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'email', 'contact_number', 'user_type', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class StudentProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.ReadOnlyField()
    
    class Meta:
        model = StudentProfile
        fields = [
            'id', 'student_number', 'program', 'year_level', 'is_graduating',
            'address', 'gender', 'birthdate', 'profile_picture', 'profile_picture_url',
            'emergency_contact'
        ]
        read_only_fields = ['id']


class AlumniProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.ReadOnlyField()
    
    class Meta:
        model = AlumniProfile
        fields = [
            'id', 'alumni_id', 'course_graduated', 'year_graduated',
            'address', 'gender', 'birthdate', 'profile_picture', 'profile_picture_url'
        ]
        read_only_fields = ['id']


class SignatoryProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.ReadOnlyField()
    
    class Meta:
        model = SignatoryProfile
        fields = [
            'id', 'signatory_type', 'department', 'office_location',
            'profile_picture', 'profile_picture_url'
        ]
        read_only_fields = ['id']


class ClearanceSignatorySerializer(serializers.ModelSerializer):
    signatory_name = serializers.CharField(source='signatory.full_name', read_only=True)
    signatory_type_display = serializers.CharField(source='get_signatory_type_display', read_only=True)
    
    class Meta:
        model = ClearanceSignatory
        fields = [
            'id', 'signatory_type', 'signatory_type_display', 'signatory_name',
            'status', 'approved_at', 'disapproved_at', 'remarks', 'action_ip'
        ]
        read_only_fields = ['id', 'signatory_name', 'signatory_type_display']


class ClearanceFormSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_number = serializers.CharField(source='student.profile.student_number', read_only=True)
    signatories = ClearanceSignatorySerializer(many=True, read_only=True)
    
    # Status counts
    approved_count = serializers.SerializerMethodField()
    disapproved_count = serializers.SerializerMethodField()
    pending_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ClearanceForm
        fields = [
            'id', 'clearance_type', 'semester', 'academic_year', 'section',
            'status', 'submitted_at', 'finalized_at', 'student_name', 'student_number',
            'signatories', 'approved_count', 'disapproved_count', 'pending_count'
        ]
        read_only_fields = ['id', 'submitted_at', 'finalized_at', 'student_name', 'student_number']
    
    def get_approved_count(self, obj):
        return obj.signatories.filter(status='approved').count()
    
    def get_disapproved_count(self, obj):
        return obj.signatories.filter(status='disapproved').count()
    
    def get_pending_count(self, obj):
        return obj.signatories.filter(status='pending').count()


class EnrollmentFormSerializer(serializers.ModelSerializer):
    clearance = ClearanceFormSerializer(read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    
    class Meta:
        model = EnrollmentForm
        fields = [
            'id', 'student', 'student_name', 'enrollment_type', 'semester',
            'academic_year', 'program', 'year_level', 'subjects', 'total_units',
            'status', 'clearance', 'submitted_at'
        ]
        read_only_fields = ['id', 'submitted_at', 'student_name']


class GraduationFormSerializer(serializers.ModelSerializer):
    clearance = ClearanceFormSerializer(read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    
    class Meta:
        model = GraduationForm
        fields = [
            'id', 'student', 'student_name', 'program', 'expected_graduation_date',
            'cumulative_gpa', 'total_units_completed', 'thesis_title',
            'thesis_adviser', 'status', 'clearance', 'submitted_at'
        ]
        read_only_fields = ['id', 'submitted_at', 'student_name']


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if user.is_active:
                    data['user'] = user
                else:
                    raise serializers.ValidationError('User account is disabled.')
            else:
                raise serializers.ValidationError('Invalid username or password.')
        else:
            raise serializers.ValidationError('Username and password are required.')
        
        return data
    
    def get_tokens(self, user):
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }


class UserProfileSerializer(serializers.ModelSerializer):
    """Combined user and profile serializer"""
    profile = serializers.SerializerMethodField()
    profile_type = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'email', 'contact_number', 
            'user_type', 'is_active', 'created_at', 'profile', 'profile_type'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_profile(self, obj):
        if obj.user_type == 'student' and hasattr(obj, 'profile'):
            return StudentProfileSerializer(obj.profile).data
        elif obj.user_type == 'alumni' and hasattr(obj, 'alumni_profile'):
            return AlumniProfileSerializer(obj.alumni_profile).data
        elif obj.user_type == 'signatory' and hasattr(obj, 'signatory_profile'):
            return SignatoryProfileSerializer(obj.signatory_profile).data
        return None
    
    def get_profile_type(self, obj):
        return obj.user_type