#!/bin/bash
# PythonAnywhere Deployment Script
# Run this script in PythonAnywhere Bash Console

echo "=========================================="
echo "PythonAnywhere Deployment Script"
echo "=========================================="

# Set your username here
USERNAME="PTSTestDeployment"  # Your PythonAnywhere username

echo "Setting up environment for user: $USERNAME"

# Navigate to project directory
cd /home/$USERNAME/mysite

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Using original settings.py (auto-detects PythonAnywhere)
# No need to set DJANGO_SETTINGS_MODULE

echo "Installing dependencies..."
pip install -r requirements_pythonanywhere.txt

echo "Running database migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Creating media directory..."
mkdir -p media/profile_pics

echo "Setting file permissions..."
chmod 755 media
chmod 755 media/profile_pics

echo "=========================================="
echo "Deployment completed!"
echo "=========================================="
echo "Next steps:"
echo "1. Go to Web tab in PythonAnywhere dashboard"
echo "2. Click 'Reload' button to restart your web app"
echo "3. Visit your site: https://$USERNAME.pythonanywhere.com"
echo "4. Test the API: https://$USERNAME.pythonanywhere.com/api/mobile/dashboard/stats/"
echo "=========================================="

# Optional: Create a superuser
read -p "Do you want to create a superuser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Creating superuser..."
    python manage.py createsuperuser
fi

echo "Deployment script finished!"