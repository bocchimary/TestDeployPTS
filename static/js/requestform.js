/**
 * Request Form JavaScript
 * Handles document request form functionality, validation, and submission
 */

console.log('📄 requestform.js loaded');

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 Request form initialized');
        
        // Initialize form handlers
        initializeOtherCredentialToggle();
        initializeFormValidation();
        initializeSubmissionHandlers();
    });
    
    function initializeOtherCredentialToggle() {
        const othersCheckbox = document.getElementById('request-student-others');
        const otherInput = document.getElementById('request-student-otherInput');
        
        if (othersCheckbox && otherInput) {
            othersCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    otherInput.disabled = false;
                    otherInput.focus();
                    otherInput.required = true;
                } else {
                    otherInput.disabled = true;
                    otherInput.value = '';
                    otherInput.required = false;
                }
            });
        }
    }
    
    function initializeFormValidation() {
        const form = document.getElementById('requestForm');
        if (!form) return;
        
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Always prevent default submission
        });
        
        // Real-time validation for purpose field
        const purposeField = document.getElementById('request-student-purpose');
        if (purposeField) {
            purposeField.addEventListener('blur', function() {
                validatePurpose(this);
            });
        }
    }
    
    function initializeSubmissionHandlers() {
        // These functions are called from the template buttons
        window.handleRequestSubmission = handleRequestSubmission;
        window.toggleOtherInput = toggleOtherInput;
    }
    
    window.toggleOtherInput = function() {
        const othersCheckbox = document.getElementById('request-student-others');
        const otherInput = document.getElementById('request-student-otherInput');
        
        if (othersCheckbox && otherInput) {
            if (othersCheckbox.checked) {
                otherInput.disabled = false;
                otherInput.focus();
                otherInput.required = true;
            } else {
                otherInput.disabled = true;
                otherInput.value = '';
                otherInput.required = false;
            }
        }
    };
    
    window.handleRequestSubmission = function(isDraft) {
        const form = document.getElementById('requestForm');
        if (!form) {
            console.error('Request form not found');
            return;
        }
        
        // Validate form before submission
        if (!validateForm(isDraft)) {
            return;
        }
        
        // Add draft flag to form data
        const draftInput = document.createElement('input');
        draftInput.type = 'hidden';
        draftInput.name = 'is_draft';
        draftInput.value = isDraft ? 'true' : 'false';
        form.appendChild(draftInput);
        
        // Show loading state
        const submitBtn = document.querySelector('.btn-submit-request');
        const draftBtn = document.querySelector('.btn:contains("Save as Draft")');
        
        if (!isDraft && submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-spinner-border me-1"></i>Submitting...';
        }
        if (isDraft && draftBtn) {
            draftBtn.disabled = true;
            draftBtn.innerHTML = '<i class="bi bi-spinner-border me-1"></i>Saving...';
        }
        
        // Create FormData and submit via fetch
        const formData = new FormData(form);
        
        fetch(form.action, {
            method: 'POST',
            headers: {
                'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('requestModal'));
                if (modal) modal.hide();
                
                // Show success message
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: isDraft ? 'Draft saved successfully' : 'Request submitted successfully',
                        showConfirmButton: false,
                        timer: 2000
                    });
                }
                
                // Reload page to show updated data
                setTimeout(() => window.location.reload(), 2100);
            } else {
                // Show error message
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Submission Failed',
                        text: data.message || 'An error occurred while processing your request'
                    });
                } else {
                    alert(data.message || 'An error occurred while processing your request');
                }
            }
        })
        .catch(error => {
            console.error('Error submitting request:', error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Unable to connect to the server. Please try again.'
                });
            } else {
                alert('Network error. Please try again.');
            }
        })
        .finally(() => {
            // Reset button states
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-send me-1"></i>Submit Request';
            }
            if (draftBtn) {
                draftBtn.disabled = false;
                draftBtn.innerHTML = '<i class="bi bi-save me-1"></i>Save as Draft';
            }
        });
    };
    
    function validateForm(isDraft) {
        let isValid = true;
        
        // Skip validation for drafts
        if (isDraft) return true;
        
        // Check if at least one credential is selected
        const credentialCheckboxes = document.querySelectorAll('input[name="request-student-credentials"]:checked');
        if (credentialCheckboxes.length === 0) {
            showAlert('Please select at least one credential to request', 'warning');
            return false;
        }
        
        // Check if "Others" is selected and input is filled
        const othersCheckbox = document.getElementById('request-student-others');
        const otherInput = document.getElementById('request-student-otherInput');
        if (othersCheckbox && othersCheckbox.checked && otherInput && !otherInput.value.trim()) {
            showAlert('Please specify what other credential you need', 'warning');
            otherInput.focus();
            return false;
        }
        
        // Validate purpose field
        const purposeField = document.getElementById('request-student-purpose');
        if (purposeField && !validatePurpose(purposeField)) {
            isValid = false;
        }
        
        return isValid;
    }
    
    function validatePurpose(field) {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            return false;
        } else {
            field.classList.remove('is-invalid');
            return true;
        }
    }
    
    function showAlert(message, type = 'info') {
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
})();