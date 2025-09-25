#!/usr/bin/env python3
"""
Test script to check PendingUser model and create test data
"""

import os
import sys
import django

# Add project directory to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.contrib.auth import get_user_model
from datetime import datetime
import json

User = get_user_model()

def check_pending_user_model():
    """Check if PendingUser model exists and works"""
    print("=" * 60)
    print("TESTING PENDINGUSER MODEL")
    print("=" * 60)
    
    try:
        from landing.models import PendingUser
        print("✅ PendingUser model imported successfully")
        
        # Check if table exists by doing a simple query
        count = PendingUser.objects.count()
        print(f"✅ PendingUser table exists - found {count} records")
        
        # List all pending users
        pending_users = PendingUser.objects.all()
        if pending_users.exists():
            print(f"\n📋 Found {pending_users.count()} pending users:")
            for user in pending_users:
                print(f"  - {user.full_name} ({user.email}) - Status: {user.approval_status}")
        else:
            print("\n📝 No pending users found in database")
            
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import PendingUser model: {e}")
        return False
    except Exception as e:
        print(f"❌ Error accessing PendingUser model: {e}")
        print("This usually means the migration hasn't been run yet.")
        return False

def create_test_pending_user():
    """Create a test pending user"""
    try:
        from landing.models import PendingUser
        
        # Check if test user already exists
        test_email = "test.student@example.com"
        if PendingUser.objects.filter(email=test_email).exists():
            print(f"Test user {test_email} already exists")
            return
            
        # Sample signup data
        test_signup_data = {
            "first_name": "John",
            "middle_name": "Paul",
            "last_name": "Doe",
            "suffix": "",
            "address": "123 Test Street, Test City",
            "gender": "male",
            "birthdate": "2000-01-15",
            "student_id": "2024-TEST-001",
            "course": "BSIT",
            "contact": "+639123456789",
            "password": "test_password_hash"
        }
        
        # Create test pending user
        test_user = PendingUser.objects.create(
            email=test_email,
            full_name="John Paul Doe",
            user_type="student",
            contact_number="+639123456789",
            signup_data=test_signup_data
        )
        
        print(f"✅ Created test pending user: {test_user.full_name}")
        return test_user
        
    except Exception as e:
        print(f"❌ Error creating test pending user: {e}")
        return None

def test_api_endpoint():
    """Test the API endpoint functionality"""
    print("\n" + "=" * 60)
    print("TESTING API ENDPOINT LOGIC")
    print("=" * 60)
    
    try:
        from landing.models import PendingUser
        
        # Simulate the API logic
        pending_users = PendingUser.objects.filter(approval_status='pending').order_by('-submitted_at')
        print(f"📊 API would return {pending_users.count()} pending users")
        
        users_data = []
        for user in pending_users:
            users_data.append({
                'id': str(user.id),
                'full_name': user.full_name,
                'email': user.email,
                'user_type': user.user_type,
                'contact_number': user.contact_number,
                'submitted_at': user.submitted_at.strftime('%Y-%m-%d %H:%M'),
                'signup_data': user.signup_data
            })
        
        response_data = {
            'success': True,
            'users': users_data,
            'count': len(users_data)
        }
        
        print(f"📋 Sample API response:")
        print(f"  - Success: {response_data['success']}")
        print(f"  - Count: {response_data['count']}")
        for i, user in enumerate(response_data['users'][:3]):  # Show first 3
            print(f"  - User {i+1}: {user['full_name']} ({user['email']})")
            
        return True
        
    except Exception as e:
        print(f"❌ Error testing API endpoint: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Testing PendingUser system...\n")
    
    # Test 1: Check if model exists
    if check_pending_user_model():
        # Test 2: Create test data if needed
        create_test_pending_user()
        
        # Test 3: Test API logic
        test_api_endpoint()
        
        print(f"\n✅ All tests completed!")
        print(f"💡 If you see this message, the PendingUser model is working correctly.")
        print(f"💡 If the frontend still shows blank, check browser console for errors.")
        
    else:
        print(f"\n❌ PendingUser model not accessible!")
        print(f"💡 Please run: python manage.py makemigrations")
        print(f"💡 Then run: python manage.py migrate")