from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from django.db.models import Q
from django.utils import timezone

from .models import (
    User, ClearanceForm, ClearanceSignatory, EnrollmentForm, 
    GraduationForm, SignatoryProfile
)
from .serializers import (
    UserSerializer, UserProfileSerializer, ClearanceFormSerializer,
    ClearanceSignatorySerializer, EnrollmentFormSerializer, 
    GraduationFormSerializer, LoginSerializer
)


class LoginAPIView(APIView):
    """API endpoint for user login with JWT token generation"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = serializer.get_tokens(user)
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'user': UserProfileSerializer(user).data,
                'tokens': tokens
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user's profile information"""
    serializer = UserProfileSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update current user's profile"""
    user = request.user
    user_serializer = UserSerializer(user, data=request.data, partial=True)
    
    if user_serializer.is_valid():
        user_serializer.save()
        
        # Update related profile based on user type
        if user.user_type == 'student' and hasattr(user, 'profile'):
            from .serializers import StudentProfileSerializer
            profile_serializer = StudentProfileSerializer(
                user.profile, data=request.data, partial=True
            )
            if profile_serializer.is_valid():
                profile_serializer.save()
        
        elif user.user_type == 'alumni' and hasattr(user, 'alumni_profile'):
            from .serializers import AlumniProfileSerializer
            profile_serializer = AlumniProfileSerializer(
                user.alumni_profile, data=request.data, partial=True
            )
            if profile_serializer.is_valid():
                profile_serializer.save()
        
        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'user': UserProfileSerializer(user).data
        })
    
    return Response({
        'success': False,
        'errors': user_serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_clearances(request):
    """Get current user's clearance forms"""
    if request.user.user_type not in ['student', 'alumni']:
        return Response({
            'success': False,
            'message': 'Only students and alumni can view clearances'
        }, status=status.HTTP_403_FORBIDDEN)
    
    clearances = ClearanceForm.objects.filter(student=request.user).order_by('-submitted_at')
    serializer = ClearanceFormSerializer(clearances, many=True)
    
    return Response({
        'success': True,
        'clearances': serializer.data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_clearance(request):
    """Submit a new clearance form"""
    if request.user.user_type not in ['student', 'alumni']:
        return Response({
            'success': False,
            'message': 'Only students and alumni can submit clearances'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Add current user as the student
    data = request.data.copy()
    data['student'] = request.user.id
    
    serializer = ClearanceFormSerializer(data=data)
    if serializer.is_valid():
        clearance = serializer.save(student=request.user)
        
        # Create signatory records for all signatory types
        signatory_types = [
            'dorm_supervisor', 'canteen_concessionaire', 'library_director',
            'scholarship_director', 'it_director', 'student_affairs',
            'cashier', 'business_manager', 'registrar', 'academic_dean'
        ]
        
        for sig_type in signatory_types:
            ClearanceSignatory.objects.create(
                clearance=clearance,
                signatory_type=sig_type,
                status='pending'
            )
        
        return Response({
            'success': True,
            'message': 'Clearance submitted successfully',
            'clearance': ClearanceFormSerializer(clearance).data
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clearance_detail(request, clearance_id):
    """Get detailed view of a specific clearance"""
    try:
        clearance = ClearanceForm.objects.get(id=clearance_id)
        
        # Check if user has permission to view this clearance
        if request.user.user_type in ['student', 'alumni']:
            if clearance.student != request.user:
                return Response({
                    'success': False,
                    'message': 'You can only view your own clearances'
                }, status=status.HTTP_403_FORBIDDEN)
        
        elif request.user.user_type == 'signatory':
            # Signatories can view clearances they need to approve
            if not hasattr(request.user, 'signatory_profile'):
                return Response({
                    'success': False,
                    'message': 'Signatory profile not found'
                }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ClearanceFormSerializer(clearance)
        return Response({
            'success': True,
            'clearance': serializer.data
        })
        
    except ClearanceForm.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Clearance not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_clearance(request, clearance_id):
    """Approve/Disapprove a clearance (for signatories only)"""
    if request.user.user_type != 'signatory':
        return Response({
            'success': False,
            'message': 'Only signatories can approve clearances'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        clearance = ClearanceForm.objects.get(id=clearance_id)
        signatory_profile = request.user.signatory_profile
        
        # Find the signatory record for this clearance
        try:
            signatory_record = ClearanceSignatory.objects.get(
                clearance=clearance,
                signatory_type=signatory_profile.signatory_type
            )
        except ClearanceSignatory.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Signatory record not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate PIN if provided
        pin = request.data.get('pin')
        if pin and not signatory_profile.verify_pin(pin):
            return Response({
                'success': False,
                'message': 'Invalid PIN'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update signatory status
        action = request.data.get('action')  # 'approve' or 'disapprove'
        remarks = request.data.get('remarks', '')
        
        if action == 'approve':
            signatory_record.status = 'approved'
            signatory_record.approved_at = timezone.now()
        elif action == 'disapprove':
            signatory_record.status = 'disapproved'
            signatory_record.disapproved_at = timezone.now()
        else:
            return Response({
                'success': False,
                'message': 'Action must be "approve" or "disapprove"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        signatory_record.remarks = remarks
        signatory_record.action_ip = request.META.get('REMOTE_ADDR', '')
        signatory_record.save()
        
        # Update clearance status if needed
        clearance.update_status()
        
        return Response({
            'success': True,
            'message': f'Clearance {action}d successfully',
            'clearance': ClearanceFormSerializer(clearance).data
        })
        
    except ClearanceForm.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Clearance not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def signatory_dashboard(request):
    """Get dashboard data for signatories"""
    if request.user.user_type != 'signatory':
        return Response({
            'success': False,
            'message': 'Only signatories can access this endpoint'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        signatory_profile = request.user.signatory_profile
        signatory_type = signatory_profile.signatory_type
        
        # Get pending clearances for this signatory type
        pending_clearances = ClearanceSignatory.objects.filter(
            signatory_type=signatory_type,
            status='pending'
        ).select_related('clearance', 'clearance__student')
        
        # Get recent approvals/disapprovals
        recent_actions = ClearanceSignatory.objects.filter(
            signatory_type=signatory_type,
            status__in=['approved', 'disapproved']
        ).select_related('clearance', 'clearance__student').order_by('-approved_at', '-disapproved_at')[:10]
        
        # Statistics
        total_pending = pending_clearances.count()
        total_approved = ClearanceSignatory.objects.filter(
            signatory_type=signatory_type, status='approved'
        ).count()
        total_disapproved = ClearanceSignatory.objects.filter(
            signatory_type=signatory_type, status='disapproved'
        ).count()
        
        return Response({
            'success': True,
            'dashboard': {
                'signatory_type': signatory_type,
                'statistics': {
                    'pending': total_pending,
                    'approved': total_approved,
                    'disapproved': total_disapproved,
                },
                'pending_clearances': ClearanceSignatorySerializer(pending_clearances, many=True).data,
                'recent_actions': ClearanceSignatorySerializer(recent_actions, many=True).data,
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_enrollment_forms(request):
    """Get current user's enrollment forms"""
    if request.user.user_type not in ['student', 'alumni']:
        return Response({
            'success': False,
            'message': 'Only students and alumni can view enrollment forms'
        }, status=status.HTTP_403_FORBIDDEN)
    
    forms = EnrollmentForm.objects.filter(student=request.user).order_by('-submitted_at')
    serializer = EnrollmentFormSerializer(forms, many=True)
    
    return Response({
        'success': True,
        'enrollment_forms': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_graduation_forms(request):
    """Get current user's graduation forms"""
    if request.user.user_type not in ['student', 'alumni']:
        return Response({
            'success': False,
            'message': 'Only students and alumni can view graduation forms'
        }, status=status.HTTP_403_FORBIDDEN)
    
    forms = GraduationForm.objects.filter(student=request.user).order_by('-submitted_at')
    serializer = GraduationFormSerializer(forms, many=True)
    
    return Response({
        'success': True,
        'graduation_forms': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics for current user"""
    user = request.user
    stats = {}
    
    if user.user_type in ['student', 'alumni']:
        # Student/Alumni stats
        total_clearances = ClearanceForm.objects.filter(student=user).count()
        approved_clearances = ClearanceForm.objects.filter(student=user, status='approved').count()
        pending_clearances = ClearanceForm.objects.filter(student=user, status='pending').count()
        
        stats = {
            'total_clearances': total_clearances,
            'approved_clearances': approved_clearances,
            'pending_clearances': pending_clearances,
            'enrollment_forms': EnrollmentForm.objects.filter(student=user).count(),
            'graduation_forms': GraduationForm.objects.filter(student=user).count(),
        }
    
    elif user.user_type == 'signatory' and hasattr(user, 'signatory_profile'):
        # Signatory stats
        signatory_type = user.signatory_profile.signatory_type
        stats = {
            'pending_approvals': ClearanceSignatory.objects.filter(
                signatory_type=signatory_type, status='pending'
            ).count(),
            'total_approved': ClearanceSignatory.objects.filter(
                signatory_type=signatory_type, status='approved'
            ).count(),
            'total_disapproved': ClearanceSignatory.objects.filter(
                signatory_type=signatory_type, status='disapproved'
            ).count(),
        }
    
    return Response({
        'success': True,
        'stats': stats
    })