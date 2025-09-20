console.log('📋 clearance.js loaded');

(function () {
  window.handleClearanceSubmission = handleClearanceSubmission;

  document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 Clearance tab initialized');
  });

  function handleClearanceSubmission(isDraft) {
    const form = document.getElementById('clearanceForm');
    if (!form) return;

    const formData = new FormData(form);
    formData.append('submit', isDraft ? 'false' : 'true');

    fetch('/submit-clearance/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
      },
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Close the modal
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('clearanceModal'));
          if (modalInstance) modalInstance.hide();

          // Toast and reload like request.js
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: isDraft ? 'Draft saved' : 'Form submitted',
            showConfirmButton: false,
            timer: 1500
          });

          setTimeout(() => window.location.reload(), 1600);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Submission Failed',
            text: data.message,
          });
        }
      })
      .catch(err => {
        console.error('❌ Error submitting clearance:', err);
        Swal.fire('Network Error', 'Unable to connect to the server.', 'error');
      });
  }
})();


function confirmClearanceSubmit() {
  const form = document.getElementById('clearanceForm');

  if (!form.checkValidity()) {
    Swal.fire('Incomplete Form', 'Please fill out all required fields before submitting.', 'warning');
    return;
  }

  Swal.fire({
    title: 'Submit Clearance?',
    text: 'Are you sure you want to submit this form?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, submit it',
    cancelButtonText: 'Cancel'
  }).then(result => {
    if (result.isConfirmed) {
      handleClearanceSubmission(false);
    }
  });
}

window.viewClearance = function (id) {
  console.log('viewClearance called with ID:', id);

  // Simple modal cleanup to prevent conflicts (like enrollment.js)
  const existingModals = document.querySelectorAll('.modal.show');
  existingModals.forEach(modal => {
    const instance = bootstrap.Modal.getInstance(modal);
    if (instance) {
      instance.hide();
    }
  });

  // Load data and show modal directly
  loadClearanceData(id);
};

function loadClearanceData(id) {
  // Reset modal state before loading
  const loadingDiv = document.getElementById('vc_modal_loading');
  const contentDiv = document.getElementById('vc_modal_content');
  const errorDiv = document.getElementById('vc_modal_error');
  
  if (loadingDiv) loadingDiv.style.display = 'block';
  if (contentDiv) contentDiv.style.display = 'none';
  if (errorDiv) errorDiv.style.display = 'none';

  fetch(`/get-clearance-data/${id}/`)
    .then(r => {
      console.log('📥 Response status:', r.status);
      if (!r.ok) {
        throw new Error(`HTTP error! status: ${r.status}`);
      }
      return r.json();
    })
    .then(data => {
      console.log('📦 Clearance data received:', data);

      if (data.error) {
        showClearanceError(data.error);
        return;
      }

      try {
        const setText = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value || '-';
        };
       
        
        // Hide loading spinner and show content
        const loadingDiv = document.getElementById('vc_modal_loading');
        const contentDiv = document.getElementById('vc_modal_content');
        console.log('Switching from loading to content...');
        
        if (loadingDiv) {
          loadingDiv.style.display = 'none';
          console.log('Loading div hidden');
        }
        if (contentDiv) {
          contentDiv.style.display = 'block';
          console.log('Content div shown');
        }

        setText('vc_full_name', data.full_name);
        setText('vc_academic_year', data.academic_year);
        setText('vc_student_number', data.student_number);
        setText('vc_year_level', data.year_level);
        setText('vc_program', data.program);
        setText('vc_semester', data.semester);
        setText('vc_purpose', data.purpose);
        setText('vc_submitted_at', data.submitted_at);

        // Populate signatory status table
        const signatoryMapping = {
          'academic_dean': 'Academic Dean',
          'business_manager': 'Business Manager',
          'cashier': 'Cashier',
          'canteen_concessionaire': 'Canteen Concessionaire',
          'student_affairs': 'Dean of Student Affairs',
          'library_director': 'Director of Library & Information',
          'scholarship_director': 'Director of Scholarship',
          'dorm_supervisor': 'Dorm Supervisor',
          'it_director': 'Information Technology',
          'registrar': 'Registrar'
        };

        const signatoryTableBody = document.getElementById('vc_signatory_status');
        if (signatoryTableBody) {
          signatoryTableBody.innerHTML = '';
          
          Object.keys(signatoryMapping).forEach(key => {
            const label = data[`${key}_label`] || 'Pending';
            const badgeClass = data[`${key}_class`] || 'bg-warning text-dark';
            const date = data[`${key}_date`] || '-';
            const comment = data[`${key}_comment`] || '-';
            const signatoryName = signatoryMapping[key];
            
            // Debug logging for business manager
            if (key === 'business_manager') {
              console.log(`🔍 Business Manager data:`, {
                label, badgeClass, date, comment,
                raw_date: data[`${key}_date`],
                raw_comment: data[`${key}_comment`]
              });
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${signatoryName}</td>
              <td><span class="badge ${badgeClass}">${label}</span></td>
              <td>${date}</td>
              <td>${comment}</td>
            `;
            signatoryTableBody.appendChild(row);
          });
        }

        // Show modal after data is successfully loaded - match enrollment.js pattern
        const modalEl = document.getElementById('viewClearanceModal');
        if (modalEl) {
          console.log('🎯 Attempting to show modal...');
          
          // Move modal to body to ensure visibility (like enrollment.js)
          document.body.appendChild(modalEl);
          console.log('📎 Moved modal to body');
          
          // Create new Bootstrap modal instance directly (like enrollment.js)
          new bootstrap.Modal(modalEl).show();
          
          console.log('✅ Modal shown using Bootstrap Modal');
        }

      } catch (err) {
        console.error("🔥 Error in clearance modal rendering:", err);
        showClearanceError('Something went wrong displaying the clearance form.');
      }
    })
    .catch(err => {
      console.error('❌ Failed to load clearance data:', err);
      console.error('❌ Error details:', err.message);
      showClearanceError(`Could not load clearance data: ${err.message}`);
    });
}

function showClearanceError(message) {
  const loadingDiv = document.getElementById('vc_modal_loading');
  const contentDiv = document.getElementById('vc_modal_content');
  const errorDiv = document.getElementById('vc_modal_error');
  const errorMessageEl = document.getElementById('vc_modal_error_message');
  
  if (loadingDiv) loadingDiv.style.display = 'none';
  if (contentDiv) contentDiv.style.display = 'none';
  if (errorDiv) errorDiv.style.display = 'block';
  if (errorMessageEl) errorMessageEl.textContent = message;
}
function openClearanceModal() {
  const modal = new bootstrap.Modal(document.getElementById('clearanceModal'));
  modal.show();
}


const clearanceBtn = document.getElementById('clearanceButton');

if (clearanceBtn) {
  clearanceBtn.addEventListener('click', () => {
    const canSubmit = clearanceBtn.dataset.canSubmit === 'true';

    if (canSubmit) {
      openClearanceModal();
    } else {
      Swal.fire({
        title: 'Not Allowed',
        text: 'You still have an ongoing clearance. Please complete it first.',
        icon: 'warning'
      });
    }
  });
}
