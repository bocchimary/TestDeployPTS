// Signatory Profile JavaScript (mirrors registrar behavior)

document.addEventListener('DOMContentLoaded', function() {
  // Set current date
  const today = new Date();
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateElement = document.getElementById('signatory_profile_dateToday');
  if (dateElement) {
    dateElement.textContent = today.toLocaleDateString('en-US', dateOptions);
  }

  // Initialize profile functionality
  initializeSignatoryProfile();
  loadSignatoryProfileData();
});

// Sidebar toggle functionality (kept simple; base SIGNATORY.js manages more)
function toggleSidebar() {
  const sidebar = document.getElementById('signatory_sidebar');
  const backdrop = document.getElementById('signatory_sidebar_sidebarBackdrop');
  const mainContent = document.querySelector('.signatory_profile_main-content');

  if (window.innerWidth <= 768) {
    if (sidebar.classList.contains('show')) {
      sidebar.classList.remove('show');
      backdrop.classList.remove('active');
    } else {
      sidebar.classList.add('show');
      backdrop.classList.add('active');
    }
  } else {
    sidebar.classList.toggle('collapsed');
    if (mainContent) {
      mainContent.classList.toggle('sidebar-collapsed', sidebar.classList.contains('collapsed'));
    }
  }
}

function initializeSignatoryProfile() {
  // Picture upload controls
  const uploadBtn = document.getElementById('signatory_profile_upload_btn');
  const fileInput = document.getElementById('signatory_profile_file_input');
  const profileImage = document.getElementById('signatory_profile_image');
  const profileOverlay = document.getElementById('signatory_profile_overlay');

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', function() {
      fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be less than 5MB', 'error');
        return;
      }

      // Preview
      const reader = new FileReader();
      reader.onload = function(ev) {
        if (profileImage) profileImage.src = ev.target.result;
      };
      reader.readAsDataURL(file);

      // Upload
      uploadSignatoryProfilePicture(file);
    });
  }

  if (profileOverlay) {
    const profileBox = document.querySelector('.profile-box');
    if (profileBox) {
      profileBox.addEventListener('mouseenter', function() { profileOverlay.style.opacity = '1'; });
      profileBox.addEventListener('mouseleave', function() { profileOverlay.style.opacity = '0'; });
    }
  }

  // Password change form
  const passwordForm = document.getElementById('signatory_profile_password_form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(e) {
      e.preventDefault();
      signatoryChangePassword();
    });
  }

  // PIN change form
  const pinForm = document.getElementById('signatory_profile_pin_form');
  if (pinForm) {
    pinForm.addEventListener('submit', function(e) {
      e.preventDefault();
      signatoryChangePin();
    });
  }

  // Details form
  const detailsForm = document.getElementById('signatory_profile_details_form');
  if (detailsForm) {
    detailsForm.addEventListener('submit', function(e) {
      e.preventDefault();
      saveSignatoryProfileDetails();
    });
  }

  const resetBtn = document.getElementById('signatory_profile_reset_btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      loadSignatoryProfileData();
      showNotification('Form reset to original values', 'info');
    });
  }
}

function loadSignatoryProfileData() {
  fetch('/signatory/profile/api/data/')
    .then(r => r.json())
    .then(data => {
      if (!data.success) return;
      const p = data.profile || {};
      const fields = {
        'signatory_profile_firstName': p.first_name || '',
        'signatory_profile_lastName': p.last_name || '',
        'signatory_profile_birthday': p.birthday || '',
        'signatory_profile_sex': p.sex || '',
        'signatory_profile_position': p.position_display || p.position || '',
        'signatory_profile_department': p.department || '',
        'signatory_profile_address': p.address || '',
        'signatory_profile_email': p.email || '',
        'signatory_profile_contactNumber': p.contact_number || ''
      };
      Object.keys(fields).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = fields[id];
      });

      const img = document.getElementById('signatory_profile_image');
      if (img && p.profile_picture_url) {
        img.src = p.profile_picture_url;
      }
    })
    .catch(() => {});
}

function uploadSignatoryProfilePicture(file) {
  const formData = new FormData();
  formData.append('profile_picture', file);

  fetch('/signatory/profile/upload-picture/', {
    method: 'POST',
    headers: { 'X-CSRFToken': getCookie('csrftoken') },
    body: formData
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        showNotification('Profile picture updated successfully!', 'success');
        const img = document.getElementById('signatory_profile_image');
        if (img) img.src = (data.profile_picture_url || img.src) + '?t=' + Date.now();
      } else {
        showNotification(data.error || 'Error uploading profile picture', 'error');
      }
    })
    .catch(() => showNotification('Network error while uploading image', 'error'));
}

function signatoryChangePassword() {
  const oldPassword = document.getElementById('signatory_profile_oldPassword').value;
  const newPassword = document.getElementById('signatory_profile_newPassword').value;
  const confirmPassword = document.getElementById('signatory_profile_confirmPassword').value;

  clearFieldError('signatory_profile_oldPassword');
  clearFieldError('signatory_profile_newPassword');
  clearFieldError('signatory_profile_confirmPassword');

  if (!oldPassword) return showFieldError('signatory_profile_oldPassword', 'Current password is required');
  if (!newPassword) return showFieldError('signatory_profile_newPassword', 'New password is required');
  if (newPassword.length < 8) return showFieldError('signatory_profile_newPassword', 'Password must be at least 8 characters long');
  if (newPassword !== confirmPassword) return showFieldError('signatory_profile_confirmPassword', 'Passwords do not match');

  fetch('/signatory/profile/change-password/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        showNotification('Password changed successfully!', 'success');
        const form = document.getElementById('signatory_profile_password_form');
        if (form) form.reset();
      } else {
        showNotification(data.error || 'Error changing password', 'error');
      }
    })
    .catch(() => showNotification('Network error', 'error'));
}

function signatoryChangePin() {
  const currentPin = document.getElementById('signatory_profile_currentPin').value;
  const newPin = document.getElementById('signatory_profile_newPin').value;
  const confirmPin = document.getElementById('signatory_profile_confirmPin').value;

  clearFieldError('signatory_profile_currentPin');
  clearFieldError('signatory_profile_newPin');
  clearFieldError('signatory_profile_confirmPin');

  if (!currentPin) return showFieldError('signatory_profile_currentPin', 'Current PIN is required');
  if (!newPin) return showFieldError('signatory_profile_newPin', 'New PIN is required');
  if (newPin.length < 6) return showFieldError('signatory_profile_newPin', 'PIN must be at least 6 characters long');
  if (newPin !== confirmPin) return showFieldError('signatory_profile_confirmPin', 'PINs do not match');

  const formData = new FormData();
  formData.append('currentPin', currentPin);
  formData.append('newPin', newPin);
  formData.append('confirmPin', confirmPin);

  fetch('/signatory/change-pin/', {
    method: 'POST',
    headers: { 'X-CSRFToken': getCookie('csrftoken') },
    body: formData
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        showNotification('PIN changed successfully!', 'success');
        const form = document.getElementById('signatory_profile_pin_form');
        if (form) form.reset();
        // Close the modal and remove backdrop
        const modalElement = document.getElementById('signatoryPinModal');
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
    .catch(() => showNotification('Network error', 'error'));
}

function saveSignatoryProfileDetails() {
  const form = document.getElementById('signatory_profile_details_form');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  clearFormErrors();

  let hasErrors = false;
  if (!data.firstName || !data.firstName.trim()) {
    showFieldError('signatory_profile_firstName', 'First name is required');
    hasErrors = true;
  }
  if (!data.lastName || !data.lastName.trim()) {
    showFieldError('signatory_profile_lastName', 'Last name is required');
    hasErrors = true;
  }
  if (!data.email || !data.email.trim()) {
    showFieldError('signatory_profile_email', 'Email is required');
    hasErrors = true;
  } else if (!isValidEmail(data.email)) {
    showFieldError('signatory_profile_email', 'Please enter a valid email address');
    hasErrors = true;
  }

  if (hasErrors) return;

  fetch('/signatory/profile/update/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    body: JSON.stringify(data)
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        showNotification('Profile updated successfully!', 'success');
        loadSignatoryProfileData();
      } else {
        showNotification(data.error || 'Error updating profile', 'error');
        if (data.field_errors) {
          Object.keys(data.field_errors).forEach(field => {
            // field keys from backend are DOM ids in our implementation
            showFieldError(field, data.field_errors[field]);
          });
        }
      }
    })
    .catch(() => showNotification('Network error', 'error'));
}

// Helpers
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorDiv = document.getElementById(fieldId + '_error');
  if (field) field.classList.add('is-invalid');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorDiv = document.getElementById(fieldId + '_error');
  if (field) field.classList.remove('is-invalid');
  if (errorDiv) errorDiv.style.display = 'none';
}

function clearFormErrors() {
  document.querySelectorAll('.invalid-feedback').forEach(el => (el.style.display = 'none'));
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible fade show position-fixed`;
  notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(notification);
  setTimeout(() => { if (notification.parentNode) notification.remove(); }, 5000);
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

function updateNotificationCount(count) {
  const badge = document.getElementById('signatory_sidebar_notification_count');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-block' : 'none';
}

window.addEventListener('resize', function () {
  const sidebar = document.getElementById('signatory_sidebar');
  const backdrop = document.getElementById('signatory_sidebar_sidebarBackdrop');
  if (window.innerWidth > 768) {
    sidebar.classList.remove('show');
    backdrop.classList.remove('active');
  }
});

