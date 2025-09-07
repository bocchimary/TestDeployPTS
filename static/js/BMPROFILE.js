// Business Manager Profile JavaScript - Mirrors Registrar Profile Exactly
document.addEventListener('DOMContentLoaded', function() {
    // Set current date
    const today = new Date();
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateElement = document.getElementById('bm_profile_dateToday');
    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString('en-US', dateOptions);
    }

    // Initialize profile functionality
    initializeProfile();
    
    // Load initial profile data
    loadProfileData();
});

// Sidebar toggle functionality
function toggleSidebar() {
    const sidebar = document.getElementById('bm_sidebar');
    const backdrop = document.getElementById('bm_sidebar_sidebarBackdrop');
    const mainContent = document.querySelector('.bm_profile_main-content');
    
    if (window.innerWidth <= 768) {
        // Mobile behavior
        if (sidebar.classList.contains('show')) {
            sidebar.classList.remove('show');
            backdrop.classList.remove('active');
        } else {
            sidebar.classList.add('show');
            backdrop.classList.add('active');
        }
    } else {
        // Desktop behavior
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            mainContent.classList.add('sidebar-collapsed');
        } else {
            mainContent.classList.remove('sidebar-collapsed');
        }
    }
}

function initializeProfile() {
    // Profile picture upload functionality
    const uploadBtn = document.getElementById('bm_profile_upload_btn');
    const fileInput = document.getElementById('bm_profile_file_input');
    const profileImage = document.getElementById('bm_profile_image');
    const profileOverlay = document.getElementById('bm_profile_overlay');

    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    showNotification('Please select a valid image file', 'error');
                    return;
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('Image size should be less than 5MB', 'error');
                    return;
                }

                // Preview image
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (profileImage) {
                        profileImage.src = e.target.result;
                    }
                };
                reader.readAsDataURL(file);

                // Upload to server
                uploadProfilePicture(file);
            }
        });
    }

    // Profile overlay hover effect
    if (profileOverlay) {
        const profileBox = document.querySelector('.profile-box');
        if (profileBox) {
            profileBox.addEventListener('mouseenter', function() {
                profileOverlay.style.opacity = '1';
            });
            
            profileBox.addEventListener('mouseleave', function() {
                profileOverlay.style.opacity = '0';
            });
        }
    }

    // Password change form
    const passwordForm = document.getElementById('bm_profile_password_form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changePassword();
        });
    }

    // PIN change form
    const pinForm = document.getElementById('bm_profile_pin_form');
    if (pinForm) {
        pinForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changePin();
        });
    }

    // Profile details form
    const detailsForm = document.getElementById('bm_profile_details_form');
    if (detailsForm) {
        detailsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProfileDetails();
        });
    }

    // Reset button
    const resetBtn = document.getElementById('bm_profile_reset_btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            resetForm();
        });
    }

    // Real-time validation for password fields
    const newPassword = document.getElementById('bm_profile_newPassword');
    const confirmPassword = document.getElementById('bm_profile_confirmPassword');

    if (newPassword && confirmPassword) {
        confirmPassword.addEventListener('input', function() {
            validatePasswordMatch();
        });
    }
}

function loadProfileData() {
    // Load profile data from server
    fetch('/business-manager/profile/api/data/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateFormFields(data.profile);
            } else {
                console.error('Error loading profile data:', data.error);
            }
        })
        .catch(error => {
            console.error('Error loading profile data:', error);
        });
}

function populateFormFields(profile) {
    // Populate form fields with profile data
    const fields = {
        'bm_profile_firstName': profile.first_name || '',
        'bm_profile_lastName': profile.last_name || '',
        'bm_profile_position': profile.position || '',
        'bm_profile_department': profile.department || '',
        'bm_profile_address': profile.address || '',
        'bm_profile_email': profile.email || '',
        'bm_profile_contactNumber': profile.contact_number || ''
    };

    Object.keys(fields).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = fields[fieldId];
        }
    });

    // Update profile image
    const profileImage = document.getElementById('bm_profile_image');
    if (profileImage && profile.profile_picture_url) {
        profileImage.src = profile.profile_picture_url;
    }
}

function uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('profile_picture', file);

    fetch('/business-manager/profile/upload-picture/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Profile picture updated successfully!', 'success');
            // Update image source to prevent caching issues
            const profileImage = document.getElementById('bm_profile_image');
            if (profileImage) {
                profileImage.src = data.profile_picture_url + '?t=' + new Date().getTime();
            }
        } else {
            showNotification(data.error || 'Error uploading profile picture', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error while uploading image', 'error');
    });
}

function changePassword() {
    const oldPassword = document.getElementById('bm_profile_oldPassword').value;
    const newPassword = document.getElementById('bm_profile_newPassword').value;
    const confirmPassword = document.getElementById('bm_profile_confirmPassword').value;

    // Clear previous errors
    clearPasswordErrors();

    // Validate inputs
    if (!oldPassword) {
        showFieldError('bm_profile_oldPassword', 'Current password is required');
        return;
    }

    if (!newPassword) {
        showFieldError('bm_profile_newPassword', 'New password is required');
        return;
    }

    if (newPassword.length < 8) {
        showFieldError('bm_profile_newPassword', 'Password must be at least 8 characters long');
        return;
    }

    if (newPassword !== confirmPassword) {
        showFieldError('bm_profile_confirmPassword', 'Passwords do not match');
        return;
    }

    // Submit password change
    fetch('/business-manager/profile/change-password/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Password changed successfully!', 'success');
            // Clear form
            const passwordForm = document.getElementById('bm_profile_password_form');
            if (passwordForm) {
                passwordForm.reset();
            }
        } else {
            showNotification(data.error || 'Error changing password', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error', 'error');
    });
}

function changePin() {
    const currentPin = document.getElementById('bm_profile_currentPin').value;
    const newPin = document.getElementById('bm_profile_newPin').value;
    const confirmPin = document.getElementById('bm_profile_confirmPin').value;

    // Clear previous errors
    clearFieldError('bm_profile_currentPin');
    clearFieldError('bm_profile_newPin');
    clearFieldError('bm_profile_confirmPin');

    // Validate inputs
    if (!currentPin) {
        showFieldError('bm_profile_currentPin', 'Current PIN is required');
        return;
    }

    if (!newPin) {
        showFieldError('bm_profile_newPin', 'New PIN is required');
        return;
    }

    if (newPin.length < 6) {
        showFieldError('bm_profile_newPin', 'PIN must be at least 6 characters long');
        return;
    }

    if (newPin !== confirmPin) {
        showFieldError('bm_profile_confirmPin', 'PINs do not match');
        return;
    }

    // Submit PIN change
    const formData = new FormData();
    formData.append('currentPin', currentPin);
    formData.append('newPin', newPin);
    formData.append('confirmPin', confirmPin);

    fetch('/business-manager/change-pin/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('PIN changed successfully!', 'success');
            // Clear form
            const pinForm = document.getElementById('bm_profile_pin_form');
            if (pinForm) {
                pinForm.reset();
            }
            // Close the modal and remove backdrop
            const modalElement = document.getElementById('businessManagerPinModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
                // Force remove backdrop after modal is hidden
                modalElement.addEventListener('hidden.bs.modal', function() {
                    document.body.classList.remove('modal-open');
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) backdrop.remove();
                }, { once: true });
            }
        } else {
            showNotification(data.error || 'Error changing PIN', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error', 'error');
    });
}

function saveProfileDetails() {
    // Get form data
    const form = document.getElementById('bm_profile_details_form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Clear previous errors
    clearFormErrors();

    // Validate required fields
    let hasErrors = false;

    if (!data.firstName || !data.firstName.trim()) {
        showFieldError('bm_profile_firstName', 'First name is required');
        hasErrors = true;
    }

    if (!data.lastName || !data.lastName.trim()) {
        showFieldError('bm_profile_lastName', 'Last name is required');
        hasErrors = true;
    }

    if (!data.email || !data.email.trim()) {
        showFieldError('bm_profile_email', 'Email is required');
        hasErrors = true;
    } else if (!isValidEmail(data.email)) {
        showFieldError('bm_profile_email', 'Please enter a valid email address');
        hasErrors = true;
    }

    if (hasErrors) {
        return;
    }

    // Submit profile update
    fetch('/business-manager/profile/update/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Profile updated successfully!', 'success');
            // Reload profile data to show updated information
            loadProfileData();
        } else {
            showNotification(data.error || 'Error updating profile', 'error');
            // Show field-specific errors if any
            if (data.field_errors) {
                Object.keys(data.field_errors).forEach(field => {
                    showFieldError(field, data.field_errors[field]);
                });
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error', 'error');
    });
}

function resetForm() {
    if (confirm('Are you sure you want to reset all changes? This will reload the original data.')) {
        loadProfileData();
        showNotification('Form reset to original values', 'info');
    }
}

// Validation functions
function validatePasswordMatch() {
    const newPassword = document.getElementById('bm_profile_newPassword').value;
    const confirmPassword = document.getElementById('bm_profile_confirmPassword').value;
    
    if (confirmPassword && newPassword !== confirmPassword) {
        showFieldError('bm_profile_confirmPassword', 'Passwords do not match');
    } else {
        clearFieldError('bm_profile_confirmPassword');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Error handling functions
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + '_error');
    
    if (field && errorDiv) {
        field.classList.add('is-invalid');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + '_error');
    
    if (field && errorDiv) {
        field.classList.remove('is-invalid');
        errorDiv.style.display = 'none';
    }
}

function clearFormErrors() {
    const errorElements = document.querySelectorAll('.invalid-feedback');
    const invalidFields = document.querySelectorAll('.is-invalid');
    
    errorElements.forEach(element => {
        element.style.display = 'none';
    });
    
    invalidFields.forEach(field => {
        field.classList.remove('is-invalid');
    });
}

function clearPasswordErrors() {
    const passwordFields = [
        'bm_profile_oldPassword',
        'bm_profile_newPassword',
        'bm_profile_confirmPassword'
    ];
    
    passwordFields.forEach(fieldId => {
        clearFieldError(fieldId);
    });
}

// Utility functions
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Update notification count function (for sidebar)
function updateNotificationCount(count) {
    const badge = document.getElementById("bm_sidebar_notification_count");
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? "inline-block" : "none";
    }
}

// Window resize handler
window.addEventListener("resize", function () {
    const bm_sidebar = document.getElementById("bm_sidebar");
    const bm_sidebar_backdrop = document.getElementById("bm_sidebar_sidebarBackdrop");
    if (window.innerWidth > 768) {
        bm_sidebar.classList.remove("show");
        bm_sidebar_backdrop.classList.remove("active");
    }
});