# Simple PythonAnywhere Deployment Guide

## What's Different Now?
✅ **Your original `settings.py` works for both local AND production**
✅ **Automatically detects when running on PythonAnywhere**
✅ **No extra production files cluttering your project**
✅ **All your email, OAuth, and features work exactly the same**

## Your Clean Project Structure
```
mysite/
├── mysite/settings.py          # Your ONLY settings file (auto-detects environment)
├── requirements_pythonanywhere.txt  # Clean dependencies for deployment
├── wsgi_simple.py             # Simple WSGI file for PythonAnywhere
├── deploy_to_pythonanywhere.sh # Auto deployment script
└── (all your other files unchanged)
```

## How It Works
Your `settings.py` now automatically detects PythonAnywhere:

**Locally (your computer):**
- DEBUG = True
- Uses your local MySQL database
- All your current settings

**On PythonAnywhere:**
- DEBUG = False (secure)
- Uses PythonAnywhere MySQL database
- Same email, OAuth, all features work

## Deployment Steps

### 1. Upload Your Project
**Go to PythonAnywhere "Files" tab:**
1. Navigate to `/home/PTSTestDeployment/`
2. Create folder: `mysite`
3. Upload your entire project folder

### 2. Create Database
**Go to "Databases" tab:**
1. Create MySQL database: `PTSTestDeployment$pts_rc`
2. Set a password (remember it!)
3. Update your `settings.py` line 164 with your password

### 3. Create Web App
**Go to "Web" tab:**
1. "Add a new web app"
2. Choose "Manual configuration"
3. Select "Python 3.10"

### 4. Configure WSGI
**In "Web" tab, click WSGI configuration file:**
Copy the content from your `wsgi_simple.py` file

### 5. Set Virtual Environment
**In "Web" tab:**
- Virtualenv: `/home/PTSTestDeployment/mysite/venv`

### 6. Configure Static Files
**In "Web" tab, Static files section:**
- URL: `/static/` → Directory: `/home/PTSTestDeployment/mysite/staticfiles`
- URL: `/media/` → Directory: `/home/PTSTestDeployment/mysite/media`

### 7. Deploy (Run in PythonAnywhere Bash Console)
```bash
cd /home/PTSTestDeployment/mysite
bash deploy_to_pythonanywhere.sh
```

### 8. Update Database Password
Edit `settings.py` line 164:
```python
'PASSWORD': 'your_actual_database_password',
```

### 9. Reload Web App
Click "Reload" button in Web tab

## Your Site URLs
- **Website:** https://ptstestdeployment.pythonanywhere.com
- **API:** https://ptstestdeployment.pythonanywhere.com/api/mobile/
- **Admin:** https://ptstestdeployment.pythonanywhere.com/admin/

## What Features Work?
✅ **Everything exactly like locally:**
- Email system (Gmail SMTP)
- Google OAuth login
- All user types and dashboards
- Clearance forms system
- File uploads and PDFs
- Mobile APIs
- Automated reports
- Everything!

The only difference: running on PythonAnywhere servers instead of your computer!