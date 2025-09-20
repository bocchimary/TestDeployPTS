import os
import sys

# Add your project directory to sys.path
project_home = '/home/PTSTestDeployment/mysite'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Use your original settings.py (it will auto-detect PythonAnywhere)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()