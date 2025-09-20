#!/usr/bin/env python3
"""
Simple API testing script for the mobile API endpoints
Run this script to test various API endpoints

Usage: python test_api.py
"""

import requests
import json

# Base URL for your API
BASE_URL = "http://127.0.0.1:8000/api/mobile"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
    
    def test_endpoint(self, method, endpoint, data=None, auth_required=True):
        """Test an API endpoint"""
        url = f"{BASE_URL}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        try:
            if method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            
            print(f"\n{method.upper()} {endpoint}")
            print(f"Status Code: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            
            return response
        
        except requests.exceptions.RequestException as e:
            print(f"Error: {e}")
            return None
        except json.JSONDecodeError:
            print(f"Response: {response.text}")
            return response
    
    def login(self, username, password):
        """Test login and get access token"""
        print("=" * 50)
        print("TESTING LOGIN")
        print("=" * 50)
        
        response = self.test_endpoint('POST', '/auth/login/', {
            'username': username,
            'password': password
        }, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success') and 'tokens' in data:
                self.access_token = data['tokens']['access']
                print(f"SUCCESS: Login successful! Token: {self.access_token[:20]}...")
                return True
        
        print("FAILED: Login failed")
        return False
    
    def test_protected_endpoints(self):
        """Test protected endpoints"""
        print("\n" + "=" * 50)
        print("TESTING PROTECTED ENDPOINTS")
        print("=" * 50)
        
        endpoints = [
            ('GET', '/profile/'),
            ('GET', '/dashboard/stats/'),
            ('GET', '/clearances/'),
            ('GET', '/enrollment-forms/'),
            ('GET', '/graduation-forms/'),
        ]
        
        for method, endpoint in endpoints:
            self.test_endpoint(method, endpoint)
    
    def test_signatory_endpoints(self):
        """Test signatory-specific endpoints"""
        print("\n" + "=" * 50)
        print("TESTING SIGNATORY ENDPOINTS")
        print("=" * 50)
        
        endpoints = [
            ('GET', '/signatory/dashboard/'),
        ]
        
        for method, endpoint in endpoints:
            self.test_endpoint(method, endpoint)
    
    def run_tests(self):
        """Run all tests"""
        print("Starting API Tests...")
        print("Note: Use actual credentials from your database")
        
        # Test without authentication first
        print("\n" + "=" * 50)
        print("TESTING WITHOUT AUTHENTICATION")
        print("=" * 50)
        self.test_endpoint('GET', '/dashboard/stats/', auth_required=False)
        
        # Test with invalid credentials
        self.login('invalid_user', 'invalid_password')
        
        # Test with real credentials (you'll need to replace these)
        print("\n" + "=" * 50)
        print("TO TEST WITH REAL USER:")
        print("Replace the credentials below with actual user credentials from your database")
        print("=" * 50)
        
        # Uncomment and modify with real credentials to test:
        # if self.login('your_real_username', 'your_real_password'):
        #     self.test_protected_endpoints()
        #     # Test signatory endpoints if user is signatory
        #     # self.test_signatory_endpoints()


if __name__ == "__main__":
    print("Mobile API Tester")
    print("=" * 50)
    print("Make sure Django server is running: python manage.py runserver")
    print("=" * 50)
    
    tester = APITester()
    tester.run_tests()
    
    print("\n" + "=" * 50)
    print("API SETUP COMPLETE!")
    print("=" * 50)
    print("Your APIs are available at:")
    print("- Login: POST /api/mobile/auth/login/")
    print("- Profile: GET /api/mobile/profile/")
    print("- Clearances: GET /api/mobile/clearances/")
    print("- Dashboard: GET /api/mobile/dashboard/stats/")
    print("- And more...")
    print("\nCheck landing/api_urls.py for full endpoint list")