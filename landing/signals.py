# landing/signals.py
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth import get_user_model

@receiver(post_migrate)
def create_admin_user(sender, **kwargs):
    User = get_user_model()
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser(
            username='admin',
            password='admin123',  # change this in production!
            email='admin@example.com',
            full_name='System Administrator',
            user_type='admin'
        )
        print("✅ Admin user created")
    else:
        print("ℹ️ Admin user already exists")
