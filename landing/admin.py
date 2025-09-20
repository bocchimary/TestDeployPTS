from django.contrib import admin
from .models import AuditLog, CalendarEvent

# Register your models here.

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action_type', 'timestamp')
    list_filter = ('action_type', 'timestamp')
    search_fields = ('user__full_name', 'action_type', 'description')
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)

@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'event_type', 'start_date', 'start_time', 'color', 'is_holiday', 'created_by')
    list_filter = ('event_type', 'color', 'is_holiday', 'start_date', 'created_by')
    search_fields = ('title', 'description', 'created_by__full_name')
    date_hierarchy = 'start_date'
    ordering = ('start_date', 'start_time')
    
    fieldsets = (
        ('Event Details', {
            'fields': ('title', 'description', 'event_type', 'color')
        }),
        ('Date & Time', {
            'fields': ('start_date', 'start_time', 'end_date', 'end_time', 'is_all_day')
        }),
        ('Settings', {
            'fields': ('is_holiday', 'created_by')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by for new objects
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
