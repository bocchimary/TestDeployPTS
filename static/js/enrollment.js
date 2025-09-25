(function () {
  window.viewEnrollment = viewEnrollment;
  window.setDeleteEnrollmentId = setDeleteEnrollmentId;
  window.editEnrollment = editEnrollment;
  window.addEnrollmentSubjectRow = function() {
    const tbody = document.getElementById('enrollmentSubjectsTableBody');
    if (!tbody) {
      console.error('Could not find enrollmentSubjectsTableBody');
      return;
    }
    
    const tr = document.createElement('tr');
    // Ensure column order matches template: Code, Subject, Professor, Units
    tr.innerHTML = `
      <td><input type="text" name="subject_code[]" class="form-control" aria-label="Code"></td>
      <td><input type="text" name="subject_name[]" class="form-control" aria-label="Subject"></td>
      <td><input type="text" name="subject_professor[]" class="form-control" aria-label="Professor"></td>
      <td><input type="number" name="subject_units[]" class="form-control" aria-label="Units" min="0" step="1" inputmode="numeric" pattern="\\d*"></td>
    `;
    tbody.appendChild(tr);
    console.log('Added new enrollment subject row');
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Delete
    const delBtn = document.getElementById('confirmDeleteEnrollmentDraftBtn');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (!window._deleteEnrollmentId) return;
        fetch(`/enrollment/delete/${window._deleteEnrollmentId}/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCookie('csrftoken') },
        })
          .then(r => r.json())
          .then(res => {
            if (res.status === 'success') {
              bootstrap.Modal.getInstance(document.getElementById('deleteEnrollmentDraftModal')).hide();
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
          });
      });
    }

    // Submission
    const form = document.getElementById('enrollmentForm');
    if (form) {
      let isSubmitting = false; // Prevent double submission
      
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        
        // Prevent double submission
        if (isSubmitting) {
          return;
        }
        
        // Validate required fields before submission
        const requiredFields = [
          { id: 'enrollment-date', name: 'Date of Enrollment' },
          { id: 'enrollment-appno', name: 'Academic Year' },
          { id: 'enrollment-semester', name: 'Semester' },
          { id: 'enrollment-idnum', name: 'Student Number' },
          { id: 'enrollment-fullName', name: 'Full Name' },
          { id: 'enrollment-course', name: 'Course/Program' },
          { id: 'enrollment-year', name: 'Year Level' }
        ];
        
        const missingFields = [];
        requiredFields.forEach(field => {
          const element = document.getElementById(field.id);
          if (!element || !element.value || element.value.trim() === '') {
            missingFields.push(field.name);
          }
        });
        
        // Check if at least one subject is filled
        const subjectNames = document.querySelectorAll('input[name="subject_name[]"]');
        const hasValidSubject = Array.from(subjectNames).some(input => 
          input.value && input.value.trim() !== ''
        );
        
        if (!hasValidSubject) {
          missingFields.push('At least one subject');
        }
        
        if (missingFields.length > 0) {
          Swal.fire({
            icon: 'warning',
            title: 'Required Fields Missing',
            text: `Please fill in the following required fields: ${missingFields.join(', ')}`,
            confirmButtonText: 'OK'
          });
          return;
        }
        
        isSubmitting = true;
        
        // Disable submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';
        
        const data = new FormData(form);
        fetch(form.action, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCookie('csrftoken') },
          body: data
        })
          .then(r => r.json())
          .then(res => {
            if (res.status === 'success') {
              bootstrap.Modal.getInstance(document.getElementById('enrollmentModal')).hide();
              Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Form submitted',
                showConfirmButton: false,
                timer: 1500
              });
              setTimeout(() => {
                window.location.hash = '#enrollment';
                window.location.reload();
              }, 1600);
            } else {
              Swal.fire('Error', res.message || 'An error occurred', 'error');
              // Re-enable submit button on error
              isSubmitting = false;
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalText;
            }
          })
          .catch(error => {
            console.error('Submission error:', error);
            Swal.fire('Error', 'Network error occurred', 'error');
            // Re-enable submit button on error
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          });
      });
    }
  });

  function setDeleteEnrollmentId(id) {
    window._deleteEnrollmentId = id;
  }

  function viewEnrollment(id) {
    console.log("🚀 viewEnrollment called with ID:", id);

    // Close any existing modals first to prevent conflicts
    const existingModals = document.querySelectorAll('.modal.show');
    existingModals.forEach(modal => {
      const instance = bootstrap.Modal.getInstance(modal);
      if (instance) {
        instance.hide();
      }
    });
  
    fetch(`/enrollment/view/${id}/`)
      .then(r => r.json())
      .then(data => {
        console.log('📦 Enrollment data received:', data);
  
        try {
          const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value || '-';
          };
  
          setText('ve_enrollment_date', data.enrollment_date);
          setText('ve_academic_year', data.academic_year);
          setText('ve_semester', data.semester);  // Set semester field
          setText('ve_student_number', data.student_number);
          setText('ve_full_name', data.full_name);
          setText('ve_program', data.program);
          setText('ve_year_level', data.year_level);
          setText('ve_section2', data.section);  // Set section field
          setText('ve_birthdate', data.birthdate);
          setText('ve_contact_number', data.contact_number);
          setText('ve_email', data.email);
          setText('ve_address', data.address);

          // Populate subjects
          const subjectsTableBody = document.getElementById('viewEnrollmentSubjectsTableBody');
          if (subjectsTableBody && data.subjects) {
            subjectsTableBody.innerHTML = '';
            
            if (data.subjects.length > 0) {
              data.subjects.forEach(subject => {
                const row = document.createElement('tr');
                row.innerHTML = `
                  <td>${subject.code || '-'}</td>
                  <td>${subject.name || '-'}</td>
                  <td>${subject.professor || '-'}</td>
                  <td>${subject.units || '-'}</td>
                `;
                subjectsTableBody.appendChild(row);
              });
              
              // Calculate and display total units
              const totalUnits = data.subjects.reduce((sum, subject) => {
                const units = parseInt(subject.units) || 0;
                return sum + units;
              }, 0);
              const totalUnitsEl = document.getElementById('totalUnits');
              if (totalUnitsEl) {
                totalUnitsEl.textContent = totalUnits;
              }
            } else {
              const row = document.createElement('tr');
              row.innerHTML = '<td colspan="4" class="text-center text-muted">No subjects added</td>';
              subjectsTableBody.appendChild(row);
              
              // Set total units to 0 when no subjects
              const totalUnitsEl = document.getElementById('totalUnits');
              if (totalUnitsEl) {
                totalUnitsEl.textContent = '0';
              }
            }
          }

          // Update signatory statuses
          const updateSignatoryStatus = (role, displayName) => {
            const statusEl = document.getElementById(`ve_status_${role}`);
            const updatedEl = document.getElementById(`ve_${role}_updated`);
            
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
  
          const modalEl = document.getElementById('viewEnrollmentModal');
          if (modalEl) {
            document.body.appendChild(modalEl); // ✅ ensures visibility across tabs
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
            
            // Attach PDF handler using event delegation
            const enrollmentId = id;
            modalEl.addEventListener('click', function(e) {
              if (e.target.id === 'btnEnrollmentPrintPdf') {
                handleEnrollmentPrintPdf(enrollmentId);
              }
            });
          }
        } catch (err) {
          console.error("🔥 Error in enrollment modal rendering:", err);
          Swal.fire('Error', 'Something went wrong displaying the enrollment form.', 'error');
        }
      })
      .catch(err => {
        console.error("❌ Failed to load enrollment data:", err);
        Swal.fire('Error', 'Could not load enrollment form.', 'error');
      });
  }
  

  function editEnrollment(id) {
    console.log("🚀 editEnrollment called with ID:", id);

    // Fetch the enrollment data
    fetch(`/enrollment/view/${id}/`)
      .then(r => r.json())
      .then(data => {
        console.log('📦 Enrollment data received for editing:', data);
        
        // Populate form fields
        document.getElementById('enrollment-date').value = data.enrollment_date || '';
        document.getElementById('enrollment-appno').value = data.academic_year || '';
        document.getElementById('enrollment-semester').value = data.semester || '';
        document.getElementById('enrollment-idnum').value = data.student_number || '';
        document.getElementById('enrollment-fullName').value = data.full_name || '';
        document.getElementById('enrollment-birthdate').value = data.birthdate || '';
        document.getElementById('enrollment-contactnum').value = data.contact_number || '';
        document.getElementById('enrollment-email').value = data.email || '';
        document.getElementById('enrollment-presentadd').value = data.address || '';
        document.getElementById('enrollment-course').value = data.course || '';
        document.getElementById('enrollment-year').value = data.year || '';
        document.getElementById('enrollment-section').value = data.section || '';
        
        // Clear existing subject rows and populate with saved data
        const tbody = document.getElementById('enrollmentSubjectsTableBody');
        if (tbody && data.subjects) {
          tbody.innerHTML = ''; // Clear existing rows
          
          // Add rows for each subject
          data.subjects.forEach(subject => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td><input type="text" name="subject_code[]" class="form-control" value="${subject.code || ''}" aria-label="Code"></td>
              <td><input type="text" name="subject_name[]" class="form-control" value="${subject.name || ''}" aria-label="Subject"></td>
              <td><input type="text" name="subject_professor[]" class="form-control" value="${subject.professor || ''}" aria-label="Professor"></td>
              <td><input type="number" name="subject_units[]" class="form-control" value="${subject.units || ''}" aria-label="Units" min="0" step="1"></td>
            `;
            tbody.appendChild(row);
          });
          
          // Add empty rows if needed (minimum 5 rows)
          const currentRows = tbody.children.length;
          const minRows = 5;
          for (let i = currentRows; i < minRows; i++) {
            addEnrollmentSubjectRow();
          }
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('enrollmentModal'));
        modal.show();
      })
      .catch(error => {
        console.error('Error fetching enrollment data:', error);
        Swal.fire('Error', 'Failed to load enrollment data', 'error');
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
  
  // Print/Save PDF functionality for enrollment forms
  function handleEnrollmentPrintPdf(enrollmentId) {
    
    if (enrollmentId) {
      // Use the provided enrollment ID directly
      createEnrollmentPrintIframe(enrollmentId);
    } else {
      // Fetch current enrollment ID from the server
      fetch('/enrollment/view/current/')
        .then(response => response.json())
        .then(data => {
          if (data.enrollment_id) {
            createEnrollmentPrintIframe(data.enrollment_id);
          } else {
            Swal.fire('Error', 'No enrollment form found to print.', 'error');
          }
        })
        .catch(error => {
          console.error('Error fetching enrollment ID:', error);
          Swal.fire('Error', 'Failed to load enrollment form for printing.', 'error');
        });
    }
  }
  
  function createEnrollmentPrintIframe(enrollmentId) {
    // Create a hidden iframe with the enrollment form
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.src = `/student/enrollment/pdf/?ids=${enrollmentId}`;
    
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
      } catch (e) {
        console.error('Print iframe error:', e);
        document.body.removeChild(iframe);
      }
    };
    
    iframe.onerror = function() {
      Swal.fire('Error', 'Failed to load enrollment form for printing.', 'error');
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    };
  }
  
  // Expose functions to global scope
  window.handleEnrollmentPrintPdf = handleEnrollmentPrintPdf;
})();
