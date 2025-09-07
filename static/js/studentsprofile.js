/**
 * Student Profile JavaScript
 * Handles profile picture upload, password changes, and form validation
 */

console.log('👤 studentsprofile.js loaded');

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('👤 Student profile initialized');
        
        // Profile picture upload preview
        const uploadBtn = document.getElementById('student_profile_upload_btn');
        const imagePreview = document.getElementById('student_profile_image_preview');
        
        if (uploadBtn && imagePreview) {
            uploadBtn.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        imagePreview.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        // Password change form handling
        const changePasswordBtn = document.getElementById('student_profile_changePassword_btn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', function(e) {
                e.preventDefault();
                handlePasswordChange();
            });
        }
        
        // Form validation
        const profileForm = document.getElementById('student_profile_form');
        if (profileForm) {
            profileForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handleProfileSubmit();
            });
        }
    });
    
    function handlePasswordChange() {
        const oldPassword = document.getElementById('student_profile_oldPassword');
        const newPassword = document.getElementById('student_profile_newPassword');
        
        if (!oldPassword || !newPassword) {
            console.error('Password fields not found');
            return;
        }
        
        if (!oldPassword.value.trim()) {
            showAlert('Please enter your old password', 'warning');
            oldPassword.focus();
            return;
        }
        
        if (!newPassword.value.trim()) {
            showAlert('Please enter a new password', 'warning');
            newPassword.focus();
            return;
        }
        
        if (newPassword.value.length < 8) {
            showAlert('New password must be at least 8 characters long', 'warning');
            newPassword.focus();
            return;
        }
        
        // Submit the form
        const form = document.getElementById('student_profile_form');
        if (form) {
            form.submit();
        }
    }
    
    function handleProfileSubmit() {
        const form = document.getElementById('student_profile_form');
        if (!form) return;
        
        // Basic form validation
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });
        
        if (!isValid) {
            showAlert('Please fill in all required fields', 'warning');
            return;
        }
        
        // Submit the form
        form.submit();
    }
    
    function showAlert(message, type = 'info') {
        // Use SweetAlert if available, otherwise use regular alert
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: type === 'warning' ? 'warning' : type === 'error' ? 'error' : 'info',
                title: type === 'warning' ? 'Warning' : type === 'error' ? 'Error' : 'Info',
                text: message,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            alert(message);
        }
    }
    
    // Export functions for external use
    window.studentProfile = {
        handlePasswordChange,
        handleProfileSubmit
    };
})();