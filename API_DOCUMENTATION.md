# Mobile API Documentation

## Overview
This Django REST Framework API provides endpoints for mobile app integration with the Educational Institution Clearance System.

## Base URL
```
http://your-domain.com/api/mobile/
```

## Authentication
The API uses JWT (JSON Web Tokens) for authentication. Include the access token in the Authorization header:
```
Authorization: Bearer your_access_token_here
```

## API Endpoints

### 🔐 Authentication

#### Login
- **URL**: `/auth/login/`
- **Method**: `POST`
- **Auth Required**: No
- **Data**:
  ```json
  {
    "username": "your_username",
    "password": "your_password"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "user": {
      "id": "user-uuid",
      "username": "username",
      "full_name": "Full Name",
      "user_type": "student",
      "profile": {...}
    },
    "tokens": {
      "access": "access_token",
      "refresh": "refresh_token"
    }
  }
  ```

#### Refresh Token
- **URL**: `/auth/refresh/`
- **Method**: `POST`
- **Auth Required**: No
- **Data**:
  ```json
  {
    "refresh": "refresh_token"
  }
  ```

### 👤 User Profile

#### Get User Profile
- **URL**: `/profile/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  ```json
  {
    "id": "user-uuid",
    "username": "username",
    "full_name": "Full Name",
    "email": "email@example.com",
    "user_type": "student",
    "profile": {
      "student_number": "2024-001",
      "program": "Computer Science",
      "year_level": 3,
      "profile_picture_url": "/media/profile_pics/image.jpg"
    }
  }
  ```

#### Update Profile
- **URL**: `/profile/update/`
- **Method**: `PUT` or `PATCH`
- **Auth Required**: Yes
- **Data**: User and profile fields to update

### 📊 Dashboard

#### Get Dashboard Statistics
- **URL**: `/dashboard/stats/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response** (for students):
  ```json
  {
    "success": true,
    "stats": {
      "total_clearances": 5,
      "approved_clearances": 2,
      "pending_clearances": 3,
      "enrollment_forms": 4,
      "graduation_forms": 1
    }
  }
  ```

### 📝 Clearance Forms

#### Get My Clearances
- **URL**: `/clearances/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  ```json
  {
    "success": true,
    "clearances": [
      {
        "id": "clearance-uuid",
        "clearance_type": "enrollment",
        "semester": "First Semester",
        "academic_year": "2024-2025",
        "status": "pending",
        "submitted_at": "2024-01-15T10:30:00Z",
        "approved_count": 3,
        "disapproved_count": 0,
        "pending_count": 7,
        "signatories": [...]
      }
    ]
  }
  ```

#### Submit New Clearance
- **URL**: `/clearances/submit/`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data**:
  ```json
  {
    "clearance_type": "enrollment",
    "semester": "First Semester",
    "academic_year": "2024-2025",
    "section": "CS-3A"
  }
  ```

#### Get Clearance Details
- **URL**: `/clearances/<clearance_id>/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Detailed clearance with all signatory statuses

### ✅ Signatory Actions (Signatory Users Only)

#### Approve/Disapprove Clearance
- **URL**: `/clearances/<clearance_id>/approve/`
- **Method**: `POST`
- **Auth Required**: Yes (Signatory only)
- **Data**:
  ```json
  {
    "action": "approve",  // or "disapprove"
    "remarks": "Optional remarks",
    "pin": "signatory_pin"
  }
  ```

#### Get Signatory Dashboard
- **URL**: `/signatory/dashboard/`
- **Method**: `GET`
- **Auth Required**: Yes (Signatory only)
- **Success Response**:
  ```json
  {
    "success": true,
    "dashboard": {
      "signatory_type": "library_director",
      "statistics": {
        "pending": 15,
        "approved": 120,
        "disapproved": 5
      },
      "pending_clearances": [...],
      "recent_actions": [...]
    }
  }
  ```

### 📚 Forms

#### Get Enrollment Forms
- **URL**: `/enrollment-forms/`
- **Method**: `GET`
- **Auth Required**: Yes

#### Get Graduation Forms
- **URL**: `/graduation-forms/`
- **Method**: `GET`
- **Auth Required**: Yes

## User Types and Permissions

### Student/Alumni
- Can view their own clearances, enrollment, and graduation forms
- Can submit new clearance forms
- Can update their profile

### Signatory
- Can view clearances assigned to their signatory type
- Can approve/disapprove clearances
- Can view signatory dashboard with statistics

### Admin/Business Manager
- Full access to all endpoints
- Can manage users and system data

## Error Responses

### Authentication Error (401)
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### Permission Error (403)
```json
{
  "success": false,
  "message": "Only students and alumni can view clearances"
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "message": "Clearance not found"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "errors": {
    "field_name": ["Error message"]
  }
}
```

## Testing the API

### Using curl
```bash
# Login
curl -X POST http://127.0.0.1:8000/api/mobile/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# Get profile (with token)
curl -X GET http://127.0.0.1:8000/api/mobile/profile/ \
  -H "Authorization: Bearer your_access_token"
```

### Using Python requests
```python
import requests

# Login
response = requests.post('http://127.0.0.1:8000/api/mobile/auth/login/', {
    'username': 'your_username',
    'password': 'your_password'
})
tokens = response.json()['tokens']

# Use token for subsequent requests
headers = {'Authorization': f"Bearer {tokens['access']}"}
profile = requests.get('http://127.0.0.1:8000/api/mobile/profile/', headers=headers)
```

## Next Steps for Mobile Development

1. **Choose Mobile Framework**:
   - React Native (JavaScript)
   - Flutter (Dart)
   - Native iOS/Android

2. **Implement Core Features**:
   - Authentication (login/logout)
   - Profile management
   - Clearance form submission and tracking
   - Real-time notifications

3. **Add Push Notifications**:
   - Integrate Firebase Cloud Messaging
   - Set up notification preferences
   - Real-time status updates

4. **Testing**:
   - Unit tests for API integration
   - User acceptance testing
   - Cross-platform compatibility

## API Rate Limiting (Future)
Consider implementing rate limiting for production:
- Login attempts: 5 per minute
- API calls: 100 per minute per user

## Versioning
Current API version: v1
Future versions will be available at `/api/mobile/v2/`