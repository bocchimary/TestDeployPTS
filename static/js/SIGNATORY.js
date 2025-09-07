// Signatory Base JavaScript - Sidebar and Common Functionality

// Sidebar toggle functionality
function toggleSidebar() {
    const sidebar = document.getElementById('signatory_sidebar');
    const backdrop = document.getElementById('signatory_sidebar_sidebarBackdrop');
    const mainContent = document.querySelector('.signatory_dashboard_main-content, .signatory_clearance_main-content, .signatory_enrollment_main-content, .signatory_graduation_main-content, .signatory_profile_main-content, .signatory_messages_main-content, .signatory_reports_main-content');
    
    if (sidebar.classList.contains('collapsed')) {
        // Expand sidebar
        sidebar.classList.remove('collapsed');
        if (mainContent) {
            mainContent.classList.remove('sidebar-collapsed');
        }
        if (backdrop) {
            backdrop.classList.remove('show');
        }
    } else {
        // Collapse sidebar
        sidebar.classList.add('collapsed');
        if (mainContent) {
            mainContent.classList.add('sidebar-collapsed');
        }
        if (backdrop) {
            backdrop.classList.remove('show');
        }
    }
}

// Mobile sidebar functionality
function toggleMobileSidebar() {
    const sidebar = document.getElementById('signatory_sidebar');
    const backdrop = document.getElementById('signatory_sidebar_sidebarBackdrop');
    
    if (sidebar.classList.contains('show')) {
        // Hide sidebar
        sidebar.classList.remove('show');
        if (backdrop) {
            backdrop.classList.remove('show');
        }
    } else {
        // Show sidebar
        sidebar.classList.add('show');
        if (backdrop) {
            backdrop.classList.add('show');
        }
    }
}

// Set active navigation link
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.signatory_sidebar a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

// Update notification count
function updateNotificationCount() {
    // This function can be overridden by individual pages
    // to update the notification count based on pending requests
    const notificationCount = document.getElementById('signatory_sidebar_notification_count');
    if (notificationCount) {
        // Default to 0, can be updated by individual pages
        notificationCount.textContent = '0';
    }
}

// Initialize common functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check for first-time setup requirement
    checkFirstTimeSetup();
    
    // Set active navigation link
    setActiveNavLink();
    
    // Update notification count
    updateNotificationCount();
    
    // Add click event for mobile backdrop
    const backdrop = document.getElementById('signatory_sidebar_sidebarBackdrop');
    if (backdrop) {
        backdrop.addEventListener('click', toggleMobileSidebar);
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const sidebar = document.getElementById('signatory_sidebar');
        const backdrop = document.getElementById('signatory_sidebar_sidebarBackdrop');
        
        if (window.innerWidth > 768) {
            // Desktop view - hide mobile sidebar
            sidebar.classList.remove('show');
            if (backdrop) {
                backdrop.classList.remove('show');
            }
        }
    });
    
    // Add notification click handler
    const notification = document.getElementById('signatory_sidebar_notification');
    if (notification) {
        notification.addEventListener('click', function() {
            // This can be customized to show notifications or redirect to messages
            console.log('Notification clicked');
        });
    }
});

// First-time setup functionality
function checkFirstTimeSetup() {
    fetch('/signatory/check-setup-status/')
        .then(response => response.json())
        .then(data => {
            if (data.requires_setup) {
                showFirstTimeSetupModal();
            }
        })
        .catch(error => {
            console.error('Error checking setup status:', error);
        });
}

function showFirstTimeSetupModal() {
    const modal = new bootstrap.Modal(document.getElementById('signatory_first_time_setup_modal'));
    modal.show();
    
    // Disable all navigation and content
    disableAllNavigation();
    
    // Add event listener for setup submission
    document.getElementById('signatory_first_time_setup_submit').addEventListener('click', handleFirstTimeSetup);
    
    // Add password strength checker
    document.getElementById('signatory_new_password').addEventListener('input', updatePasswordStrength);
    
    // Add real-time validation
    document.getElementById('signatory_confirm_password').addEventListener('input', validatePasswordMatch);
    document.getElementById('signatory_pin_confirm').addEventListener('input', validatePinMatch);
    
    // Clear any previous alerts
    hideSetupAlert();
}

function disableAllNavigation() {
    // Disable sidebar links
    const sidebarLinks = document.querySelectorAll('.signatory_sidebar a');
    sidebarLinks.forEach(link => {
        link.style.pointerEvents = 'none';
        link.style.opacity = '0.5';
    });
    
    // Disable main content area
    const mainContent = document.querySelector('.signatory_dashboard_main-content, .signatory_clearance_main-content, .signatory_enrollment_main-content, .signatory_profile_main-content, .signatory_messages_main-content, .signatory_reports_main-content');
    if (mainContent) {
        mainContent.style.pointerEvents = 'none';
        mainContent.style.opacity = '0.5';
    }
}

function enableAllNavigation() {
    // Enable sidebar links
    const sidebarLinks = document.querySelectorAll('.signatory_sidebar a');
    sidebarLinks.forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.opacity = '1';
    });
    
    // Enable main content area
    const mainContent = document.querySelector('.signatory_dashboard_main-content, .signatory_clearance_main-content, .signatory_enrollment_main-content, .signatory_profile_main-content, .signatory_messages_main-content, .signatory_reports_main-content');
    if (mainContent) {
        mainContent.style.pointerEvents = 'auto';
        mainContent.style.opacity = '1';
    }
}

function handleFirstTimeSetup() {
    const currentPassword = document.getElementById('signatory_current_password').value;
    const newPassword = document.getElementById('signatory_new_password').value;
    const confirmPassword = document.getElementById('signatory_confirm_password').value;
    const pin = document.getElementById('signatory_pin_input').value;
    const confirmPin = document.getElementById('signatory_pin_confirm').value;
    
    // Clear previous alerts
    hideSetupAlert();
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword || !pin || !confirmPin) {
        showSetupAlert('All fields are required', 'danger');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showSetupAlert('New passwords do not match', 'danger');
        return;
    }
    
    if (pin !== confirmPin) {
        showSetupAlert('PINs do not match', 'danger');
        return;
    }
    
    if (newPassword.length < 8) {
        showSetupAlert('Password must be at least 8 characters', 'danger');
        return;
    }
    
    if (pin.length < 6) {
        showSetupAlert('PIN must be at least 6 characters', 'danger');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('signatory_first_time_setup_submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Setting up...';
    submitBtn.disabled = true;
    
    // Submit setup
    const formData = new FormData();
    formData.append('current_password', currentPassword);
    formData.append('new_password', newPassword);
    formData.append('confirm_password', confirmPassword);
    formData.append('pin', pin);
    formData.append('confirm_pin', confirmPin);
    
    // Set PIN first (this won't log out the user)
    fetch('/signatory/set-pin/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to set PIN');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Then change password (this will log out the user, but that's expected)
            return fetch('/signatory/change-password/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });
        } else {
            throw new Error(data.error || 'Failed to set PIN');
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to change password');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showSetupAlert('Setup completed successfully! You will be redirected to login.', 'success');
            setTimeout(() => {
                window.location.href = '/log-in/';
            }, 2000);
        } else {
            throw new Error(data.error || 'Failed to change password');
        }
    })
    .catch(error => {
        console.error('Setup error:', error);
        showSetupAlert('Error: ' + error.message, 'danger');
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function showSetupAlert(message, type) {
    const alertContainer = document.getElementById('signatory_setup_alert_container');
    const alert = document.getElementById('signatory_setup_alert');
    const alertIcon = document.getElementById('signatory_setup_alert_icon');
    const alertMessage = document.getElementById('signatory_setup_alert_message');
    
    // Set alert type and content
    alert.className = `alert alert-${type}`;
    alertIcon.className = `bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`;
    alertMessage.textContent = message;
    
    // Show alert
    alertContainer.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            hideSetupAlert();
        }, 5000);
    }
    
    // Scroll to alert
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideSetupAlert() {
    document.getElementById('signatory_setup_alert_container').style.display = 'none';
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'bi bi-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'bi bi-eye';
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];
    
    if (password.length >= 8) strength += 1;
    else feedback.push('At least 8 characters');
    
    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push('Lowercase letter');
    
    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push('Uppercase letter');
    
    if (/[0-9]/.test(password)) strength += 1;
    else feedback.push('Number');
    
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    else feedback.push('Special character');
    
    return { strength, feedback };
}

function updatePasswordStrength() {
    const password = document.getElementById('signatory_new_password').value;
    const indicator = document.getElementById('password_strength_indicator');
    const strengthText = document.getElementById('password_strength_text');
    const strengthBar = document.getElementById('password_strength_bar');
    
    if (password.length === 0) {
        indicator.style.display = 'none';
        return;
    }
    
    const { strength, feedback } = checkPasswordStrength(password);
    const percentage = (strength / 5) * 100;
    
    let strengthLabel = 'Weak';
    let barColor = 'bg-danger';
    
    if (strength >= 4) {
        strengthLabel = 'Strong';
        barColor = 'bg-success';
    } else if (strength >= 3) {
        strengthLabel = 'Good';
        barColor = 'bg-warning';
    } else if (strength >= 2) {
        strengthLabel = 'Fair';
        barColor = 'bg-info';
    }
    
    strengthText.textContent = strengthLabel;
    strengthBar.className = `progress-bar ${barColor}`;
    strengthBar.style.width = percentage + '%';
    indicator.style.display = 'block';
}

function validatePasswordMatch() {
    const password = document.getElementById('signatory_new_password').value;
    const confirmPassword = document.getElementById('signatory_confirm_password').value;
    const confirmInput = document.getElementById('signatory_confirm_password');
    
    if (confirmPassword.length > 0) {
        if (password === confirmPassword) {
            confirmInput.classList.remove('is-invalid');
            confirmInput.classList.add('is-valid');
        } else {
            confirmInput.classList.remove('is-valid');
            confirmInput.classList.add('is-invalid');
        }
    } else {
        confirmInput.classList.remove('is-valid', 'is-invalid');
    }
}

function validatePinMatch() {
    const pin = document.getElementById('signatory_pin_input').value;
    const confirmPin = document.getElementById('signatory_pin_confirm').value;
    const confirmInput = document.getElementById('signatory_pin_confirm');
    
    if (confirmPin.length > 0) {
        if (pin === confirmPin) {
            confirmInput.classList.remove('is-invalid');
            confirmInput.classList.add('is-valid');
        } else {
            confirmInput.classList.remove('is-valid');
            confirmInput.classList.add('is-invalid');
        }
    } else {
        confirmInput.classList.remove('is-valid', 'is-invalid');
    }
}

function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

// Export functions for use in other scripts
window.signatoryCommon = {
    toggleSidebar,
    toggleMobileSidebar,
    setActiveNavLink,
    updateNotificationCount
}; 