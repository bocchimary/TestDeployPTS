from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import api_views

urlpatterns = [
    # Authentication
    path('auth/login/', api_views.LoginAPIView.as_view(), name='api_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='api_token_refresh'),
    
    # User Profile
    path('profile/', api_views.user_profile, name='api_user_profile'),
    path('profile/update/', api_views.update_profile, name='api_update_profile'),
    
    # Dashboard Stats
    path('dashboard/stats/', api_views.dashboard_stats, name='api_dashboard_stats'),
    
    # Clearance Forms
    path('clearances/', api_views.my_clearances, name='api_my_clearances'),
    path('clearances/submit/', api_views.submit_clearance, name='api_submit_clearance'),
    path('clearances/<uuid:clearance_id>/', api_views.clearance_detail, name='api_clearance_detail'),
    
    # Signatory Actions
    path('clearances/<uuid:clearance_id>/approve/', api_views.approve_clearance, name='api_approve_clearance'),
    path('signatory/dashboard/', api_views.signatory_dashboard, name='api_signatory_dashboard'),
    
    # Enrollment & Graduation Forms
    path('enrollment-forms/', api_views.my_enrollment_forms, name='api_my_enrollment_forms'),
    path('graduation-forms/', api_views.my_graduation_forms, name='api_my_graduation_forms'),
]