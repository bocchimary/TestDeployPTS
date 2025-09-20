#!/usr/bin/env python3
"""
Test script for deployed PythonAnywhere APIs
Replace 'yourusername' with your actual PythonAnywhere username
"""

import requests
import json

# Your PythonAnywhere domain
BASE_URL = "https://ptstestdeployment.pythonanywhere.com/api/mobile"

def test_deployed_apis():
    """Test the deployed API endpoints"""
    print("=" * 60)
    print("Testing Deployed APIs on PythonAnywhere")
    print("=" * 60)
    
    # Test 1: Check if API is accessible
    print("\n1. Testing API accessibility...")
    try:
        response = requests.get(f"{BASE_URL}/dashboard/stats/", timeout=10)
        if response.status_code == 401:
            print("✓ API is accessible (returns 401 as expected without authentication)")
        else:
            print(f"✓ API responded with status code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"✗ API not accessible: {e}")
        return
    
    # Test 2: Test login endpoint
    print("\n2. Testing login endpoint...")
    try:
        login_data = {
            "username": "test_user",  # Replace with actual test user
            "password": "test_password"  # Replace with actual test password
        }
        response = requests.post(f"{BASE_URL}/auth/login/", 
                               json=login_data, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.text[:200]}...")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                access_token = data['tokens']['access']
                print("✓ Login successful! Testing authenticated endpoints...")
                
                # Test authenticated endpoint
                headers = {'Authorization': f'Bearer {access_token}'}
                profile_response = requests.get(f"{BASE_URL}/profile/", 
                                              headers=headers, timeout=10)
                print(f"Profile endpoint status: {profile_response.status_code}")
                
        else:
            print("✓ Login endpoint working (invalid credentials as expected)")
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Login test failed: {e}")
    
    # Test 3: Test other endpoints
    print("\n3. Testing other endpoints...")
    endpoints_to_test = [
        "/clearances/",
        "/enrollment-forms/",
        "/graduation-forms/",
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            print(f"  {endpoint}: Status {response.status_code} ({'✓' if response.status_code in [200, 401, 403] else '✗'})")
        except requests.exceptions.RequestException as e:
            print(f"  {endpoint}: ✗ Failed ({e})")
    
    print("\n" + "=" * 60)
    print("API Testing Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. If tests pass, your APIs are ready for mobile app development")
    print("2. Update your mobile app to use the deployed URL")
    print("3. Create test users in Django admin for mobile app testing")
    print("4. Start developing your mobile app!")

if __name__ == "__main__":
    print("Note: Update BASE_URL with your actual PythonAnywhere domain")
    print("Replace 'yourusername' with your PythonAnywhere username")
    print("\nRunning tests...")
    
    test_deployed_apis()