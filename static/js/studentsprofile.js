// Student Profile JavaScript - Registrar-style API approach
document.addEventListener('DOMContentLoaded', function() {
    console.log('👤 Student profile initialized');
    
    // Initialize profile functionality
    initializeProfile();
});

function initializeProfile() {
    // Profile picture upload functionality - registrar style
    const uploadBtn = document.getElementById('student_profile_upload_btn');
    const fileInput = document.getElementById('student_profile_file_input');
    const profileImage = document.getElementById('student_profile_image_preview');

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

                // Preview image immediately
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (profileImage) {
                        profileImage.src = e.target.result;
                    }
                };
                reader.readAsDataURL(file);

                // Upload immediately like registrar
                uploadProfilePicture(file);
            }
        });
    }

    // Password change form
    const passwordForm = document.getElementById('student_profile_password_form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const oldPassword = document.getElementById('student_profile_oldPassword');
            const newPassword = document.getElementById('student_profile_newPassword');
            const confirmPassword = document.getElementById('student_profile_confirmPassword');
            
            // Basic validation
            if (!oldPassword.value) {
                showNotification('Please enter your current password', 'warning');
                oldPassword.focus();
                return;
            }
            
            if (!newPassword.value) {
                showNotification('Please enter a new password', 'warning');
                newPassword.focus();
                return;
            }
            
            if (newPassword.value.length < 8) {
                showNotification('New password must be at least 8 characters long', 'warning');
                newPassword.focus();
                return;
            }
            
            if (newPassword.value !== confirmPassword.value) {
                showNotification('Passwords do not match', 'warning');
                confirmPassword.focus();
                return;
            }
            
            // Submit the form normally
            passwordForm.action = '/dashboard/?tab=profile';
            passwordForm.method = 'POST';
            
            // Add CSRF token if not present
            let csrfToken = passwordForm.querySelector('input[name="csrfmiddlewaretoken"]');
            if (!csrfToken) {
                csrfToken = document.createElement('input');
                csrfToken.type = 'hidden';
                csrfToken.name = 'csrfmiddlewaretoken';
                csrfToken.value = getCookie('csrftoken');
                passwordForm.appendChild(csrfToken);
            }
            
            passwordForm.submit();
        });
    }

    // Profile details form
    const detailsForm = document.getElementById('student_profile_details_form');
    if (detailsForm) {
        detailsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic validation
            const email = document.getElementById('student_profile_email');
            if (!email.value || !isValidEmail(email.value)) {
                showNotification('Please enter a valid email address', 'warning');
                email.focus();
                return;
            }
            
            // Submit the form normally
            detailsForm.action = '/dashboard/?tab=profile';
            detailsForm.method = 'POST';
            
            // Add CSRF token if not present
            let csrfToken = detailsForm.querySelector('input[name="csrfmiddlewaretoken"]');
            if (!csrfToken) {
                csrfToken = document.createElement('input');
                csrfToken.type = 'hidden';
                csrfToken.name = 'csrfmiddlewaretoken';
                csrfToken.value = getCookie('csrftoken');
                detailsForm.appendChild(csrfToken);
            }
            
            detailsForm.submit();
        });
    }

    // Reset button
    const resetBtn = document.getElementById('student_profile_reset_btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset all changes? This will reload the original data.')) {
                window.location.reload();
            }
        });
    }

    // Phone number formatting for contact number and emergency contact
    const contactInput = document.getElementById('student_profile_contactNumber');
    const emergencyInput = document.getElementById('student_profile_emergency_contact');
    
    if (contactInput) formatPhoneNumber(contactInput);
    if (emergencyInput) formatPhoneNumber(emergencyInput);
}


function uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('profile_picture', file);

    fetch('/students/profile/upload-picture/', {
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
            const profileImage = document.getElementById('student_profile_image_preview');
            if (profileImage) {
                profileImage.src = data.profile_picture_url + '?t=' + new Date().getTime();
            }
            // Also update header profile picture
            updateHeaderProfilePicture(data.profile_picture_url);
        } else {
            showNotification(data.error || 'Error uploading profile picture', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error while uploading image', 'error');
    });
}

function updateHeaderProfilePicture(profilePictureUrl) {
    // Update profile picture in header (students use registrar_dashboard_user-info class)
    const headerProfileImg = document.querySelector('.registrar_dashboard_user-info img');
    if (headerProfileImg) {
        headerProfileImg.src = profilePictureUrl + '?t=' + new Date().getTime();
    }
}

// Validation functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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


// Phone number formatting function
function formatPhoneNumber(input) {
    input.addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^\d]/g, '');
        
        if (value.length > 0 && !value.startsWith('63')) {
            if (value.startsWith('0')) {
                value = '63' + value.substring(1);
            } else if (value.startsWith('9')) {
                value = '63' + value;
            } else {
                value = '63' + value;
            }
        }
        
        if (value.length > 12) {
            value = value.substring(0, 12);
        }
        
        e.target.value = value.length > 0 ? '+' + value : '';
    });
    
    input.addEventListener('keydown', function(e) {
        if (e.target.selectionStart === 0 && e.target.selectionEnd === e.target.value.length) {
            return;
        }
        if (e.target.selectionStart < 3) {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
            }
        }
    });
}