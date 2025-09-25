(function () {
  window.viewGraduation = viewGraduation;
  window.editGraduation = editGraduation;

  document.addEventListener('DOMContentLoaded', () => {
    // Submission
    const form = document.getElementById('graduationForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        
        // Check checkbox validation
        const checkbox = document.getElementById('gradCheckbox');
        if (checkbox && !checkbox.checked) {
          Swal.fire({
            icon: 'warning',
            title: 'Confirmation Required',
            text: 'Please confirm that you understand the graduation requirements by checking the checkbox.',
            confirmButtonText: 'OK'
          });
          checkbox.focus();
          return false;
        }
        
        const data = new FormData(form);
        fetch(form.action, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCookie('csrftoken') },
          body: data
        })
          .then(r => r.json())
          .then(res => {
            if (res.status === 'success') {
              bootstrap.Modal.getInstance(document.getElementById('graduationModal')).hide();
              Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Form submitted', showConfirmButton: false, timer: 1500 });
              setTimeout(() => window.location.reload(), 1600);
            } else {
              Swal.fire('Error', res.message || 'An error occurred', 'error');
            }
          });
      });
    }
  });

  window.addSubjectRow = function() {
    const tbody = document.getElementById('subjectsTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" name="subject_course_no[]" class="form-control" /></td>
      <td><input type="text" name="subject_title[]" class="form-control" /></td>
      <td><input type="text" name="subject_units[]" class="form-control" /></td>
      <td><input type="text" name="subject_remarks[]" class="form-control" /></td>
    `;
    tbody.appendChild(tr);
  };

  function viewGraduation(id) {
    console.log("🚀 viewGraduation called with ID:", id);

    // Close any existing modals first to prevent conflicts
    const existingModals = document.querySelectorAll('.modal.show');
    existingModals.forEach(modal => {
      const instance = bootstrap.Modal.getInstance(modal);
      if (instance) {
        instance.hide();
      }
    });
  
    fetch(`/graduation/view/${id}/`)
      .then(response => {
        console.log("📥 Status:", response.status);
        return response.json();  // Will throw if response is not valid JSON
      })
      .then(data => {
        console.log("📦 Graduation data received:", data);
  
        try {
          document.getElementById('vg_grad_date').textContent = data.grad_date || '-';
          document.getElementById('vg_grad_appno').textContent = data.grad_appno || '-';
          document.getElementById('vg_full_name').textContent = data.full_name || '-';
          document.getElementById('vg_gender').textContent = data.gender || '-';
          document.getElementById('vg_phone').textContent = data.phone || '-';
          document.getElementById('vg_email').textContent = data.email || '-';
          document.getElementById('vg_birthdate').textContent = data.birthdate || '-';
          document.getElementById('vg_place_of_birth').textContent = data.place_of_birth || '-';
          document.getElementById('vg_course').textContent = data.course || '-';
          document.getElementById('vg_major').textContent = data.major || '-';
          document.getElementById('vg_present_address').textContent = data.present_address || '-';
          document.getElementById('vg_permanent_address').textContent = data.permanent_address || '-';
  
          if (document.getElementById('vg_major_bottom')) {
            document.getElementById('vg_major_bottom').textContent = data.major || '-';
          }
          if (document.getElementById('vg_degree')) {
            document.getElementById('vg_degree').textContent = data.course || '-';
          }
          if (document.getElementById('vg_year')) {
            document.getElementById('vg_year').textContent = data.graduation_year || new Date().getFullYear();
          }
  
          document.getElementById('vg_thesis_title').textContent = data.thesis_title || '-';
          document.getElementById('vg_status').textContent = data.status || '-';
          document.getElementById('vg_created_at').textContent = data.created_at || '-';
          document.getElementById('vg_confirmation').checked = !!data.confirmation_checked;
  
          // Update signatory statuses
          const updateSignatoryStatus = (role, displayName) => {
            const statusEl = document.getElementById(`vg_status_${role}`);
            const updatedEl = document.getElementById(`vg_${role}_updated`);
            
            if (statusEl) {
              let status = 'pending';
              let updated = '';
              
              if (data.signatories && data.signatories[role]) {
                status = data.signatories[role].status;
                updated = data.signatories[role].updated_at;
              }
              
              statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
              statusEl.className = `badge me-2 ${status === 'approved' ? 'bg-success text-white' : 
                                                 status === 'disapproved' ? 'bg-danger text-white' : 
                                                 'bg-warning text-dark'}`;
              
              if (updatedEl) {
                updatedEl.textContent = updated;
              }
            }
          };

          updateSignatoryStatus('dean', 'Academic Dean');
          updateSignatoryStatus('business_manager', 'Business Manager'); 
          updateSignatoryStatus('registrar', 'Registrar');
          updateSignatoryStatus('president', 'President');
  
          // Fill subjects table
          const tbody = document.getElementById('vg_subjects_table_body');
          tbody.innerHTML = '';
          (data.subjects || []).forEach(subj => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${subj.course_no || ''}</td>
              <td>${subj.title || ''}</td>
              <td>${subj.units || ''}</td>
              <td>${subj.remarks || ''}</td>
            `;
            tbody.appendChild(tr);
          });
          const modalEl = document.getElementById('viewgraduationModal');
          if (modalEl) {
            document.body.appendChild(modalEl);  // <-- force move to body
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
            
            // Attach PDF handler using event delegation
            modalEl.addEventListener('click', function(e) {
              if (e.target.id === 'btnPrintPdf') {
                handlePrintPdf();
              }
            });
          }
  
        } catch (err) {
          console.error("🔥 Error in modal rendering:", err);
          Swal.fire('Error', 'Something went wrong displaying the graduation form.', 'error');
        }
      })
      .catch(err => {
        console.error("❌ Fetch or JSON error:", err);
        Swal.fire('Error', 'Failed to load graduation data.', 'error');
      });
  }
  

  function editGraduation(id) {
    fetch(`/graduation/view/${id}/`)
      .then(r => r.json())
      .then(data => {
        const setValue = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.value = value || '';
        };
        setValue('grad-date', data.grad_date);
        setValue('grad-appno', data.grad_appno);
        setValue('grad-fullname', data.full_name);
        setValue('grad-gender', data.gender);
        setValue('grad-phoneno', data.phone);
        setValue('grad-email', data.email);
        setValue('grad-birthdate', data.birthdate);
        setValue('grad-place-of-birth', data.place_of_birth);
        setValue('grad-present-address', data.present_address);
        setValue('grad-permanent-address', data.permanent_address);
        setValue('grad-course', data.course);
        setValue('grad-major', data.major);
        setValue('grad-thesis-title', data.thesis_title);

        // Fill subjects table for editing
        const tbody = document.getElementById('subjectsTableBody');
        tbody.innerHTML = '';
        (data.subjects || []).forEach(subj => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><input type="text" name="subject_course_no[]" class="form-control" value="${subj.course_no || ''}" /></td>
            <td><input type="text" name="subject_title[]" class="form-control" value="${subj.title || ''}" /></td>
            <td><input type="text" name="subject_units[]" class="form-control" value="${subj.units || ''}" /></td>
            <td><input type="text" name="subject_remarks[]" class="form-control" value="${subj.remarks || ''}" /></td>
          `;
          tbody.appendChild(tr);
        });

        new bootstrap.Modal(document.getElementById('graduationModal')).show();
      });
  }

  function getCookie(name) {
    let value = null;
    document.cookie.split(';').forEach(c => {
      const [k, v] = c.trim().split('=');
      if (k === name) value = decodeURIComponent(v);
    });
    return value;
  }

  function handlePrintPdf() {
    
    // Get the graduation ID from the modal data
    fetch('/graduation/view/current/')
      .then(response => response.json())
      .then(data => {
        if (data.graduation_id) {
          // Create a hidden iframe with the graduation form
          const iframe = document.createElement('iframe');
          iframe.style.position = 'absolute';
          iframe.style.left = '-9999px';
          iframe.style.width = '0px';
          iframe.style.height = '0px';
          iframe.src = `/student/graduation/pdf/?ids=${data.graduation_id}`;
          
          // Add to document
          document.body.appendChild(iframe);
          
          // Wait for iframe to load - then trigger print
          iframe.onload = function() {
            try {
              // Template auto-print is disabled for iframes, so we handle printing
              setTimeout(() => {
                iframe.contentWindow.print();
              }, 300);
              
              // Clean up - remove iframe after printing
              setTimeout(() => {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
              }, 2000);
            } catch (error) {
              console.error('Error with iframe:', error);
              // Clean up on error
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
              alert('Error loading form for printing');
            }
          };
          
          // Handle iframe load errors
          iframe.onerror = function() {
            console.error('Error loading graduation form in iframe');
            document.body.removeChild(iframe);
            alert('Error loading graduation form');
          };
          
        } else {
          alert('Could not find graduation form');
        }
      })
      .catch(error => {
        console.error('Error getting graduation ID:', error);
        alert('Error loading graduation form');
      });
  }
})();


