// static/js/request.js
console.log('🚀 request.js loaded');

(function () {
  // ──────────────────────────────────────────────────────────
  // Global functions (accessible from inline HTML)
  // ──────────────────────────────────────────────────────────
  window.checkAndToggle = checkAndToggle;
  window.openRequestForm = openRequestForm;
  window.confirmEdit = confirmEdit;
  window.handleRequestSubmission = handleRequestSubmission;
  window.setDeleteId = setDeleteId;
  window.toggleOtherInput = toggleOtherInput;

  // ──────────────────────────────────────────────────────────
  // DOM Ready
  // ──────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    console.log('⏱ DOMContentLoaded — initializing request tab');
  
    // Ensure this function exists or define it
    checkAndToggle();
  
    document.querySelectorAll('a[href="#request"]').forEach(tab =>
      tab.addEventListener('click', checkAndToggle)
    );
  
    const delBtn = document.getElementById('confirmDeleteDraftBtn');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        console.log('Delete button clicked!');
        if (!window._deleteId) return;
  
        fetch(`/delete-request/${window._deleteId}/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCookie('csrftoken') },
        })
          .then(r => r.json())
          .then(res => {
            if (res.status === 'success' || res.request_id) {
              // Hide the modal after successful delete
              bootstrap.Modal.getInstance(document.getElementById('deleteDraftModalUnique')).hide();
              Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Deleted',
                showConfirmButton: false,
                timer: 1500
              });
              setTimeout(() => window.location.reload(), 1600);
            } else {
              Swal.fire('Error', res.message || 'Delete failed', 'error');
            }
          })
          .catch(err => {
            console.error('Delete request failed:', err);
            Swal.fire('Error', 'Network or server error', 'error');
          });
      }); // ✅ this line was missing in your original code
    }
  });
  
  // ──────────────────────────────────────────────────────────
  function checkAndToggle() {
    fetch('/check-request-history/')
      .then(r => r.json())
      .then(data => {
        var requestFormSection = document.getElementById('requestFormSection');
        if (requestFormSection) {
          requestFormSection.style.display =
            data.has_requests ? 'none' : 'block';
        }
        var requestHistorySection = document.getElementById('requestHistorySection');
        if (requestHistorySection) {
          requestHistorySection.classList.toggle('d-none', !data.has_requests);
        }
      })
      .catch(console.error);
  }

  function handleRequestSubmission(isDraft) {
    const form = document.getElementById('requestForm');
    if (!form) {
      console.error('❌ #requestForm not found in DOM');
      return;
    }
    const endpoint = form.getAttribute('action');
    const data = new FormData(form);
    data.append('is_draft', isDraft);

    fetch(endpoint, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCookie('csrftoken') },
      body: data
    })
      .then(r => r.json())
      .then(payload => {
        const success = payload.status === 'success' || payload.request_id;
        if (success) {
          bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();

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
          Swal.fire('Error', payload.message || 'An error occurred', 'error');
        }
      })
      .catch(err => {
        console.error(err);
        Swal.fire('Error', 'Network or server error', 'error');
      });
  }

  function confirmEdit(id) {
    Swal.fire({
      title: 'Edit this draft?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, edit'
    }).then(result => {
      if (result.isConfirmed) {
        openRequestForm(id, true);
      }
    });
  }

  function openRequestForm(id, isDraft) {
    console.log('🛎 openRequestForm called', { id, isDraft });

    const modalEl = document.getElementById('requestModal');
    if (!modalEl) {
      console.error('❌ #requestModal not found in DOM');
      return;
    }

    const form = document.getElementById('requestForm');
    if (!form) {
      console.error('❌ #requestForm not found in DOM');
      return;
    }

    form.reset();

    // Set request ID for editing
    const requestIdField = document.getElementById('request_id');
    if (requestIdField) {
      requestIdField.value = id || '';
    }

    // Enable/disable fields utility
    const toggleFields = (enabled) => {
      document.querySelectorAll('#requestForm input, #requestForm select, #requestForm textarea')
        .forEach(el => el.disabled = !enabled);
    };

    if (id) {
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        // Restore checkboxes
        const types = (row.dataset.documentType || '').split(',');
        document.querySelectorAll('input[name="request-student-credentials"]')
          .forEach(cb => {
            cb.checked = types.includes(cb.value)
              || (cb.value === 'Others' && types.some(t => t.startsWith('Others:')));
          });

        // Restore “Others” input
        const otherVal = types.find(t => t.startsWith('Others:')) || '';
        const otherInp = document.getElementById('request-student-otherInput');
        if (otherInp) {
          otherInp.disabled = !otherVal;
          otherInp.value = otherVal.replace('Others: ', '');
        }

        // Restore purpose & date
        const purposeField = document.getElementById('request-student-purpose');
        if (purposeField) purposeField.value = row.dataset.purpose || '';

        const releaseField = document.getElementById('preferred-release');
        if (releaseField) releaseField.value = row.dataset.preferredRelease || '';

        // Enable or disable fields
        toggleFields(isDraft);
      } else {
        console.error(`❌ Table row for id=${id} not found`);
      }
    } else {
      // New form → enable everything
      toggleFields(true);
    }

    // Finally show modal
    new bootstrap.Modal(modalEl).show();
  }


  let deleteModalInstance = null;

  function setDeleteId(id) {
    console.log('setDeleteId called with', id);
    window._deleteId = id;
    if (!deleteModalInstance) {
      deleteModalInstance = new bootstrap.Modal(document.getElementById('deleteDraftModalUnique'));
    }
    deleteModalInstance.show();
  }

  function getCookie(name) {
    let value = null;
    document.cookie.split(';').forEach(c => {
      const [k, v] = c.trim().split('=');
      if (k === name) value = decodeURIComponent(v);
    });
    return value;
  }

  function toggleOtherInput() {
    const chk = document.getElementById('request-student-others');
    const inp = document.getElementById('request-student-otherInput');
    if (chk && inp) {
      inp.disabled = !chk.checked;
      if (!chk.checked) inp.value = '';
    }
  }
})();

// ───────────────────────────────────────────────────────────────
// 🧩 Make viewRequest globally accessible outside IIFE
// ───────────────────────────────────────────────────────────────
window.viewRequest = function (id) {
  console.log('viewRequest called with ID:', id);
  
  // Simple modal cleanup to prevent conflicts (like enrollment.js)
  const existingModals = document.querySelectorAll('.modal.show');
  existingModals.forEach(modal => {
    const instance = bootstrap.Modal.getInstance(modal);
    if (instance) {
      instance.hide();
    }
  });

  // Fetch and show modal directly
  fetch(`/get-request-data/${id}/`)
      .then(r => r.json())
      .then(data => {
        console.log('📦 Request data received:', data);

      try {
        // Fill text spans
        const setText = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value || '-';
        };
        const setValue = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.value = value || '';
        };

        setText('view_first_name', data.first_name);
        setText('view_middle_name', data.middle_name);
        setText('view_last_name', data.last_name);
        setText('view_suffix', data.suffix);
        setText('view_birthdate', data.birthdate);
        setText('view_course', data.course);
        setText('view_address', data.address);
        setText('view_contact', data.contact);

        setValue('view_purpose', data.purpose);
        setValue('view_semester', data.semester);

        // Checkboxes
        document.querySelectorAll('#viewrequestForm input[type="checkbox"]').forEach(cb => {
          cb.checked = data.document_type.includes(cb.value)
            || (cb.value === 'Others' && data.document_type.find(v => v.startsWith('Others:')));
        });

        const others = data.document_type.find(v => v.startsWith('Others:'));
        const otherInput = document.getElementById('otherInput');
        if (otherInput) otherInput.value = others ? others.replace('Others:', '').trim() : '';

        // Show modal only after data is loaded - match enrollment.js pattern
        const modalEl = document.getElementById('viewRequestModal');
        if (modalEl) {
          console.log('🎯 Attempting to show request modal...');
          
          // Move modal to body to ensure visibility (like enrollment.js)
          document.body.appendChild(modalEl);
          console.log('📎 Moved modal to body');
          
          // Create new Bootstrap modal instance directly (like enrollment.js)
          new bootstrap.Modal(modalEl).show();
          
          console.log('✅ Request modal shown using Bootstrap Modal');
        }
      } catch (err) {
        console.error("🔥 Error in request modal rendering:", err);
        Swal.fire('Error', 'Something went wrong displaying the request form.', 'error');
      }
    })
    .catch(err => {
      console.error("❌ Failed to load request data:", err);
      Swal.fire('Error', 'Failed to load request data.', 'error');
    });
};



window.populateViewRequestModal = function(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  var view_first_name = document.querySelector('.view-first-name');
  if (view_first_name) view_first_name.textContent   = row.dataset.firstName || '';
  var view_middle_name = document.querySelector('.view-middle-name');
  if (view_middle_name) view_middle_name.textContent  = row.dataset.middleName || '';
  var view_last_name = document.querySelector('.view-last-name');
  if (view_last_name) view_last_name.textContent    = row.dataset.lastName || '';
  var view_suffix = document.querySelector('.view-suffix');
  if (view_suffix) view_suffix.textContent       = row.dataset.suffix || '';
  var view_course = document.querySelector('.view-course');
  if (view_course) view_course.textContent       = row.dataset.course || '';
  var view_birthdate = document.querySelector('.view-birthdate');
  if (view_birthdate) view_birthdate.textContent    = row.dataset.birthdate || '';
  var view_address = document.querySelector('.view-address');
  if (view_address) view_address.textContent      = row.dataset.address || '';
  var view_contact_number = document.querySelector('.view-contact-number');
  if (view_contact_number) view_contact_number.textContent = row.dataset.contact || '';

  var purpose = document.getElementById('purpose');
  if (purpose) purpose.value = row.dataset.purpose || '';
  var request_student_semester = document.getElementById('request-student-semester');
  if (request_student_semester) request_student_semester.value = data.semester || '0';


  const creds = (row.dataset.documentType || '').split(',');
  ['diploma', 'transcript', 'dismissal', 'cor', 'certification', 'others'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = creds.includes(el.value) || (id === 'others' && creds.some(c => c.startsWith('Others:')));
  });

  const othersInput = document.getElementById('otherInput');
  if (othersInput) {
    const othersValue = creds.find(c => c.startsWith('Others:'));
    othersInput.value = othersValue ? othersValue.replace('Others: ', '') : '';
  }
};

const checkboxes = document.querySelectorAll('input[name="request-student-credentials"]');
const otherInput = document.getElementById('request-student-otherInput');

checkboxes.forEach(checkbox => {
  checkbox.addEventListener('change', () => {
    // Uncheck all other checkboxes
    checkboxes.forEach(box => {
      if (box !== checkbox) box.checked = false;
    });

    // Enable/disable the "Others" input
    otherInput.disabled = !document.getElementById('request-student-others').checked;
  });
});

// Also enable/disable Others input on page load if needed
otherInput.disabled = !document.getElementById('request-student-others').checked;