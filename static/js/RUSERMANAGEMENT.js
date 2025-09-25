// Global variables
let currentUserId = null;
let allUsers = [];

// Initialize the page
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM Content Loaded");
    updateDate();
    loadUsers();

    // Add a small delay to ensure all elements are available
    setTimeout(() => {
        setupEventListeners();
        setupModalHandlers();
    }, 100);
});

// Update current date
function updateDate() {
    const dateSpan = document.getElementById("registrar_user_manager_dateToday");
    const today = new Date();
    const formatted = today.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    dateSpan.textContent = formatted;
}

// Setup event listeners
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // Filter change events
    const userTypeFilter = document.getElementById("registrar_user_manager_userType");
    const courseFilter = document.getElementById("registrar_user_manager_course");
    const yearFilter = document.getElementById("registrar_user_manager_year");
    const statusFilter = document.getElementById("registrar_user_manager_status");
    const searchInput = document.getElementById("registrar_user_manager_search_input");
    const resetFiltersBtn = document.getElementById("registrar_user_manager_resetFilters");
    const saveBtn = document.getElementById("registrar_user_manager_saveBtn");
    const userTypeSelect = document.getElementById("registrar_user_manager_userTypeSelect");
    const confirmDeleteBtn = document.getElementById("registrar_user_manager_confirmDeleteBtn");
    const backdrop = document.getElementById("registrar_user_manager_backdrop");

    console.log("Save button found:", saveBtn);
    console.log("Form found:", document.getElementById("registrar_user_manager_addUserForm"));

    if (userTypeFilter) userTypeFilter.addEventListener("change", loadUsers);
    if (courseFilter) courseFilter.addEventListener("change", loadUsers);
    if (yearFilter) yearFilter.addEventListener("change", loadUsers);
    if (statusFilter) statusFilter.addEventListener("change", loadUsers);

    // Search input with debounce
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener("input", function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(loadUsers, 300);
        });
    }

    // Reset filters button
    if (resetFiltersBtn) resetFiltersBtn.addEventListener("click", resetFilters);

    // Save user button - try direct binding first
    if (saveBtn) {
        console.log("Adding click event to save button");
        saveBtn.addEventListener("click", function (e) {
            console.log("Save button clicked");
            e.preventDefault();
            saveUser();
        });
    } else {
        console.error("Save button not found!");
    }

    // Event delegation as backup for save button
    document.addEventListener("click", function (e) {
        if (e.target && e.target.id === "registrar_user_manager_saveBtn") {
            console.log("Save button clicked via event delegation");
            e.preventDefault();
            saveUser();
        }
    });

    // User type change in modal
    if (userTypeSelect) userTypeSelect.addEventListener("change", toggleUserTypeFields);

    // Apply phone number formatting to contact number input
    const contactNumberInput = document.getElementById("registrar_user_manager_contactNumber");
    if (contactNumberInput) {
        formatPhoneNumberRegistrar(contactNumberInput);
    }

    // Confirm delete user button
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", confirmDeleteUser);

    // Close panel when clicking outside
    document.addEventListener("click", function (event) {
        const adminPanel = document.getElementById("registrar_user_manager_adminPanel");
        const studentPanel = document.getElementById("registrar_user_manager_studentPanel");

        // Check if either panel is visible
        if (adminPanel && studentPanel && (adminPanel.style.display === "block" || studentPanel.style.display === "block")) {
            // Check if click is outside the panel
            if (!adminPanel.contains(event.target) && !studentPanel.contains(event.target)) {
                // Check if click is not on a user row
                if (!event.target.closest('.user-row')) {
                    hideUser();
                }
            }
        }
    });

    // Close panel when pressing Escape key
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            hideUser();
        }
    });

    // Close panel when clicking on backdrop
    if (backdrop) {
        backdrop.addEventListener("click", function (event) {
            if (event.target === this) {
                hideUser();
            }
        });
    }
}

// Setup modal handlers
function setupModalHandlers() {
    const modal = document.getElementById("registrar_user_manager_addUserModal");
    if (modal) {
        modal.addEventListener("hidden.bs.modal", function () {
            resetModalForm();
        });
    }

    // Handle delete modal cleanup
    const deleteModal = document.getElementById("registrar_user_manager_deleteModal");
    if (deleteModal) {
        deleteModal.addEventListener("hidden.bs.modal", function () {
            // Reset delete button state
            const confirmBtn = document.getElementById("registrar_user_manager_confirmDeleteBtn");
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="bi bi-trash me-1"></i> Delete User';
                confirmBtn.disabled = false;
            }
        });
    }
}

// Load users from API
function loadUsers() {
    const loadingDiv = document.getElementById("registrar_user_manager_loading");
    const tableBody = document.getElementById("registrar_user_manager_tableBody");

    // Show loading
    loadingDiv.style.display = "block";
    tableBody.innerHTML = "";

    // Build query parameters
    const params = new URLSearchParams();
    const userType = document.getElementById("registrar_user_manager_userType").value;
    const course = document.getElementById("registrar_user_manager_course").value;
    const year = document.getElementById("registrar_user_manager_year").value;
    const status = document.getElementById("registrar_user_manager_status").value;
    const search = document.getElementById("registrar_user_manager_search_input").value;

    // Only add parameters if they have actual values (not empty strings)
    if (userType && userType.trim() !== "") params.append("user_type", userType);
    if (course && course.trim() !== "") params.append("course", course);
    if (year && year.trim() !== "") params.append("year", year);
    if (status && status.trim() !== "") params.append("status", status);
    if (search && search.trim() !== "") params.append("search", search);

    // Fetch users
    fetch(`/registrar/user-management/api/data/?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }

            allUsers = data.users;
            displayUsers(data.users);
        })
        .catch(error => {
            console.error("Error loading users:", error);
            showAlert("Error loading users: " + error.message, "danger");
        })
        .finally(() => {
            loadingDiv.style.display = "none";
        });
}

// Display users in table
function displayUsers(users) {
    const tableBody = document.getElementById("registrar_user_manager_tableBody");

    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bi bi-people fs-1"></i>
                    <p class="mt-2">No users found</p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr class="user-row" onclick="showUserDetails('${user.id}')">
            <td>
                <div class="d-flex align-items-center">
                    <img src="${user.profile_picture}" alt="Profile" class="rounded-circle me-2" style="width: 32px; height: 32px; object-fit: cover;">
                    <div>
                        <div class="fw-semibold">${user.full_name}</div>
                        <small class="text-muted">${user.username}</small>
                    </div>
                </div>
            </td>
            <td class="align-items-center"
           >
  ${user.user_type === "Admin"
            ? '<span class="badge bg-danger">Admin</span>'
            : user.user_type === "Student"
                ? '<span class="badge bg-primary">Student</span>'
                : user.user_type === "Alumni"
                    ? '<span class="badge bg-success">Alumni</span>'
                    : user.user_type === "Signatory"
                        ? '<span class="badge bg-secondary text-white">Signatory</span>'
                        : `<span class="badge bg-secondary">${user.user_type}</span>`
        }
</td>
            <td>
                <span class="user-status ${user.status === 'Active' ? 'active-status' : 'inactive-status'}">
                    ${user.status}
                </span>
            </td>
            <td>${user.email || '-'}</td>
            <td><small class="text-muted">${user.created_at}</small></td>
            <td><small class="text-muted">${user.last_login}</small></td>
        </tr>
    `).join("");
}

// Show user details in side panel
function showUserDetails(userId) {
    currentUserId = userId;

    fetch(`/registrar/user-management/api/user/${userId}/`)
        .then(response => response.json())
        .then(user => {
            if (user.error) {
                throw new Error(user.error);
            }

            // Show backdrop
            document.getElementById("registrar_user_manager_backdrop").classList.add("active");

            // Hide both panels first
            document.getElementById("registrar_user_manager_adminPanel").style.display = "none";
            document.getElementById("registrar_user_manager_studentPanel").style.display = "none";

            // Determine which panel to show based on user type
            if (user.user_type === 'student' || user.user_type === 'alumni') {
                showStudentPanel(user);
            } else {
                showAdminPanel(user);
            }
        })
        .catch(error => {
            console.error("Error loading user details:", error);
            showAlert("Error loading user details: " + error.message, "danger");
        });
}

// Show admin panel
function showAdminPanel(user) {
    const panel = document.getElementById("registrar_user_manager_adminPanel");
    panel.style.display = "block";
    panel.classList.add("open");

    // Update panel content

    document.getElementById("registrar_user_manager_adminImg").src = user.profile_picture;
    document.getElementById("registrar_user_manager_adminName").textContent = user.full_name;
    document.getElementById("registrar_user_manager_adminEmail").textContent = user.email || '-';
    document.getElementById("registrar_user_manager_adminGender").textContent = user.gender || '-';
    document.getElementById("registrar_user_manager_adminAddress").textContent = user.address || '-';
   
    // Get the status span
    const statusSpan = document.getElementById("registrar_user_manager_adminStatus");
    statusSpan.textContent = user.status || '-';
    statusSpan.className = `user-status ${user.status === 'active' ? 'active-status' : 'inactive-status'}`;
    

    document.getElementById("registrar_user_manager_adminRole").textContent = user.user_type_display;
    document.getElementById("registrar_user_manager_adminUsername").textContent = user.username;
    document.getElementById("registrar_user_manager_adminLastLogin").textContent = user.last_login;
    document.getElementById("registrar_user_manager_adminPhone").textContent = user.contact_number || '-';
    document.getElementById("registrar_user_manager_adminCreated").textContent = user.created_at;
    document.getElementById("registrar_user_manager_adminNotes").textContent = user.notes || '-';
}

// Show student panel
function showStudentPanel(user) {
    const panel = document.getElementById("registrar_user_manager_studentPanel");
    panel.style.display = "block";
    panel.classList.add("open");

    // Update panel content
    registrar_user_manager_studentRole
    document.getElementById("registrar_user_manager_studentImg").src = user.profile_picture;
    document.getElementById("registrar_user_manager_studentName").textContent = user.full_name;

    document.getElementById("registrar_user_manager_studentStatus").textContent = user.status;
    document.getElementById("registrar_user_manager_studentStatus").className = `user-status ${user.status === 'Active' ? 'active-status' : 'inactive-status'}`;

    const roleElement = document.getElementById("registrar_user_manager_studentRole");
    roleElement.textContent = user.user_type_display || '-';

    // Set class based on role
    if (user.user_type_display && user.user_type_display.toLowerCase() === 'student') {
        roleElement.className = 'text-primary';
    } else if (user.user_type_display && user.user_type_display.toLowerCase() === 'alumni') {
        roleElement.className = 'text-success';
    } else {
        roleElement.className = 'text-muted';
    }


    document.getElementById("registrar_user_manager_studentCourse").textContent = user.course || '-';
    const yearSpan = document.getElementById("registrar_user_manager_studentYear");
    const yearLabel = yearSpan.previousElementSibling;

    // Set label based on role
    if (user.user_type_display && user.user_type_display.toLowerCase() === "alumni") {
        yearLabel.textContent = "Year Graduated:";
    } else {
        yearLabel.textContent = "Year:";
    }

    // Set the actual year value
    yearSpan.textContent = user.year || '-';
    document.getElementById("registrar_user_manager_studentLastLogin").textContent = user.last_login;
    document.getElementById("registrar_user_manager_studentPhone").textContent = user.contact_number || '-';
    document.getElementById("registrar_user_manager_studentEmailDetail").textContent = user.email || '-';
    document.getElementById("registrar_user_manager_studentAddress").textContent = user.address || '-';
    document.getElementById("registrar_user_manager_studentGender").textContent = user.gender || '-';
    document.getElementById("registrar_user_manager_studentBirthdate").textContent = user.birthdate || '-';
    document.getElementById("registrar_user_manager_studentCreated").textContent = user.created_at;
    document.getElementById("registrar_user_manager_studentNotes").textContent = user.notes || '-';
}

// Hide user panels
function hideUser() {
    const adminPanel = document.getElementById("registrar_user_manager_adminPanel");
    const studentPanel = document.getElementById("registrar_user_manager_studentPanel");
    const backdrop = document.getElementById("registrar_user_manager_backdrop");

    // Hide panels
    adminPanel.style.display = "none";
    studentPanel.style.display = "none";
    adminPanel.classList.remove("open");
    studentPanel.classList.remove("open");

    // Hide backdrop
    backdrop.classList.remove("active");

    currentUserId = null;
}

// Delete user
function deleteUser() {
    if (!currentUserId) {
        showAlert("No user selected", "warning");
        return;
    }

    // Get current user data to display in modal
    const currentUser = allUsers.find(user => user.id === currentUserId);
    if (!currentUser) {
        showAlert("User data not found", "error");
        return;
    }

    // Update modal content with user information
    document.getElementById("registrar_user_manager_deleteUserName").textContent = currentUser.full_name;
    document.getElementById("registrar_user_manager_deleteUserRole").textContent = currentUser.user_type;
    document.getElementById("registrar_user_manager_deleteUserEmail").textContent = currentUser.email || 'No email';

    // Show the delete confirmation modal
    const deleteModal = new bootstrap.Modal(document.getElementById("registrar_user_manager_deleteModal"));
    deleteModal.show();
}

// Confirm delete user (called when user clicks confirm in modal)
function confirmDeleteUser() {
    if (!currentUserId) {
        showAlert("No user selected", "warning");
        return;
    }

    // Show loading state
    const confirmBtn = document.getElementById("registrar_user_manager_confirmDeleteBtn");
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Deleting...';
    confirmBtn.disabled = true;

    fetch(`/registrar/user-management/api/delete/${currentUserId}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }

            // Hide the modal
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById("registrar_user_manager_deleteModal"));
            deleteModal.hide();

            showAlert("User deleted successfully", "success");
            hideUser();
            loadUsers(); // Reload the user list
        })
        .catch(error => {
            console.error("Error deleting user:", error);
            showAlert("Error deleting user: " + error.message, "danger");
        })
        .finally(() => {
            // Reset button state
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        });
}

// Reset filters
function resetFilters() {
    document.getElementById("registrar_user_manager_userType").value = "";
    document.getElementById("registrar_user_manager_course").value = "";
    document.getElementById("registrar_user_manager_year").value = "";
    document.getElementById("registrar_user_manager_status").value = "";
    document.getElementById("registrar_user_manager_search_input").value = "";
    loadUsers();
}

// Toggle user type fields in modal
function toggleUserTypeFields() {
    const userTypeSelect = document.getElementById("registrar_user_manager_userTypeSelect");
    const studentFields = document.getElementById("registrar_user_manager_studentFields");
    const alumniFields = document.getElementById("registrar_user_manager_alumniFields");
    const signatoryFields = document.getElementById("registrar_user_manager_signatoryFields");

    if (!userTypeSelect) return;

    const userType = userTypeSelect.value;

    // Hide all fields first
    if (studentFields) studentFields.style.display = "none";
    if (alumniFields) alumniFields.style.display = "none";
    if (signatoryFields) signatoryFields.style.display = "none";

    // Show relevant fields
    if (userType === 'student' && studentFields) {
        studentFields.style.display = "block";
    } else if (userType === 'alumni' && alumniFields) {
        alumniFields.style.display = "block";
    } else if (userType === 'signatory' && signatoryFields) {
        signatoryFields.style.display = "block";
    }
}

// Phone number formatting for registrar add user form (same as signup)
function formatPhoneNumberRegistrar(input) {
    input.addEventListener('input', function (e) {
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

    input.addEventListener('keydown', function (e) {
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

// Save user
function saveUser() {
    console.log("saveUser function called");

    // Prevent double submission
    const saveBtn = document.getElementById("registrar_user_manager_saveBtn");
    if (saveBtn && saveBtn.disabled) {
        console.log("Save button already disabled, preventing double submission");
        return;
    }

    const form = document.getElementById("registrar_user_manager_addUserForm");
    console.log("Form element:", form);

    if (!form) {
        console.error("Add user form not found");
        console.log("Available elements with 'form' in ID:");
        const allElements = document.querySelectorAll('[id*="form"]');
        allElements.forEach(el => console.log(el.id));
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Disable the save button to prevent double submission
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Creating...';
    }

    // Collect form data
    const formData = {
        username: document.getElementById("registrar_user_manager_username")?.value || '',
        full_name: `${document.getElementById("registrar_user_manager_firstName")?.value || ''} ${document.getElementById("registrar_user_manager_middleName")?.value || ''} ${document.getElementById("registrar_user_manager_lastName")?.value || ''} ${document.getElementById("registrar_user_manager_suffix")?.value || ''}`.trim(),
        user_type: document.getElementById("registrar_user_manager_userTypeSelect")?.value || '',
        email: document.getElementById("registrar_user_manager_username")?.value || '', // Use same value as username
        is_active: document.getElementById("registrar_user_manager_isActive")?.value === "true",
        contact_number: document.getElementById("registrar_user_manager_contactNumber")?.value || '',
        address: document.getElementById("registrar_user_manager_address")?.value || '',
        gender: document.getElementById("registrar_user_manager_gender")?.value || '',
        birthdate: document.getElementById("registrar_user_manager_birthDate")?.value || null
    };

    // Clean up email field - if username is empty, don't send email
    if (!formData.email || formData.email.trim() === '') {
        formData.email = '';
    }

    // Add user type specific data
    const userType = formData.user_type;
    if (userType === 'student') {
        formData.student_number = document.getElementById("registrar_user_manager_studentNumber")?.value || '';
        formData.program = document.getElementById("registrar_user_manager_program")?.value || '';
        formData.year_level = parseInt(document.getElementById("registrar_user_manager_yearLevel")?.value || '1');
        formData.is_graduating = document.getElementById("registrar_user_manager_isGraduating")?.checked || false;
    } else if (userType === 'alumni') {
        formData.alumni_id = document.getElementById("registrar_user_manager_alumniId")?.value || '';
        formData.course_graduated = document.getElementById("registrar_user_manager_courseGraduated")?.value || '';
        formData.year_graduated = document.getElementById("registrar_user_manager_yearGraduated")?.value || '';
    } else if (userType === 'signatory') {
        formData.signatory_type = document.getElementById("registrar_user_manager_signatoryType")?.value || '';
        formData.department = document.getElementById("registrar_user_manager_signatoryDepartment")?.value || '';
        formData.notes = document.getElementById("registrar_user_manager_signatoryNotes")?.value || '';
    }

    console.log("Form data:", formData);

    // Send request
    fetch('/registrar/user-management/api/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(formData)
    })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            console.log('Response ok:', response.ok);

            // Always try to get the response data, even for error status codes
            return response.json().then(data => {
                return { status: response.status, ok: response.ok, data: data };
            });
        })
        .then(result => {
            console.log('Response data:', result.data);
            console.log('Response data type:', typeof result.data);
            console.log('Response data keys:', Object.keys(result.data));
            console.log('Response data.error:', result.data.error);

            // Check if it's an error response
            if (!result.ok) {
                const errorMessage = result.data.error || `HTTP error! status: ${result.status}`;
                console.log('Throwing error because response is not ok:', errorMessage);
                throw new Error(errorMessage);
            }

            if (result.data.error) {
                console.log('Throwing error because data.error exists:', result.data.error);
                throw new Error(result.data.error);
            }

            console.log('No error found, proceeding with success handling');

            // Reset the save button
            const saveBtn = document.getElementById("registrar_user_manager_saveBtn");
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Save User';
            }

            // Close the add user modal first
            const modal = bootstrap.Modal.getInstance(document.getElementById("registrar_user_manager_addUserModal"));
            if (modal) {
                modal.hide();
            }

            // Clean up any remaining backdrop from the add user modal
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                document.body.classList.remove('modal-open');
                document.body.style.paddingRight = '';
            }, 300);

            // Show success message or password modal
            if (result.data.generated_password) {
                // Show password in a modal
                showPasswordModal(result.data.full_name, result.data.username, result.data.generated_password);
            } else {
                showAlert("User created successfully", "success");
            }

            // Reload users
            loadUsers();
        })
        .catch(error => {
            console.error("Error creating user:", error);
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            console.error("Form data that was sent:", formData);

            // Reset the save button
            const saveBtn = document.getElementById("registrar_user_manager_saveBtn");
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Save User';
            }

            // Close the add user modal and clean up backdrop
            const modal = bootstrap.Modal.getInstance(document.getElementById("registrar_user_manager_addUserModal"));
            if (modal) {
                modal.hide();
            }

            // Clean up any remaining backdrop
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                document.body.classList.remove('modal-open');
                document.body.style.paddingRight = '';
            }, 300);

            // Check if this is a validation error (400 status) vs system error
            if (error.message.includes('already exists') ||
                error.message.includes('already being used') ||
                error.message.includes('already taken') ||
                error.message.includes('Username already exists') ||
                error.message.includes('Email already exists')) {
                // This is a validation error - show as warning, not error
                showAlert(error.message, "warning");
            } else {
                // This is a system error - show as error
                showAlert("Error creating user: " + error.message, "danger");
            }
        });
}

// Reset modal form
function resetModalForm() {
    const form = document.getElementById("registrar_user_manager_addUserForm");
    if (form) {
        form.reset();
    }

    // Reset the save button
    const saveBtn = document.getElementById("registrar_user_manager_saveBtn");
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Save User';
    }

    // Hide all dynamic fields
    const studentFields = document.getElementById("registrar_user_manager_studentFields");
    const alumniFields = document.getElementById("registrar_user_manager_alumniFields");
    const signatoryFields = document.getElementById("registrar_user_manager_signatoryFields");

    if (studentFields) studentFields.style.display = "none";
    if (alumniFields) alumniFields.style.display = "none";
    if (signatoryFields) signatoryFields.style.display = "none";
}

// Show alert message
function showAlert(message, type) {
    // Create alert element
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;";
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Add to page
    document.body.appendChild(alertDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Get CSRF token from cookies
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

// Sidebar functionality
function updateNotificationCount(count) {
    const badge = document.getElementById("registrar_sidebar_notification_count");
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? "inline-block" : "none";
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById("registrar_sidebar");
    const backdrop = document.getElementById("registrar_sidebar_sidebarBackdrop");

    if (window.innerWidth <= 768) {
        registrar_sidebar.classList.remove("collapsed");
        registrar_sidebar.classList.toggle("show");
        registrar_sidebar_backdrop.classList.toggle("active");
    } else {
        registrar_sidebar.classList.toggle("collapsed");
    }
}

// Window resize handler
window.addEventListener("resize", function () {
    const sidebar = document.getElementById("registrar_sidebar");
    const backdrop = document.getElementById("registrar_sidebar_sidebarBackdrop");
    if (window.innerWidth > 768) {
        sidebar.classList.remove("show");
        backdrop.classList.remove("active");
    }
});

// Show password modal for generated passwords
function showPasswordModal(fullName, username, password) {
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="passwordModal" tabindex="-1" aria-labelledby="passwordModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title" id="passwordModalLabel">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            User Created Successfully
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-3">
                            <i class="bi bi-person-check-fill text-success" style="font-size: 3rem;"></i>
                        </div>
                        <h6 class="text-center mb-3">User account has been created successfully!</h6>
                        
                        <div class="alert alert-info" role="alert">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>Important:</strong> Please save the login credentials below. The password will not be shown again.
                        </div>
                        
                        <div class="user-credentials p-3 bg-light rounded">
                            <div class="row mb-2">
                                <div class="col-4"><strong>Full Name:</strong></div>
                                <div class="col-8">${fullName}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-4"><strong>Username:</strong></div>
                                <div class="col-8">${username}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-4"><strong>Password:</strong></div>
                                <div class="col-8">
                                    <div class="input-group">
                                        <input type="text" class="form-control" value="${password}" id="generatedPassword" readonly>
                                        <button class="btn btn-outline-secondary" type="button" onclick="copyPassword()">
                                            <i class="bi bi-clipboard"></i> Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="alert alert-warning" role="alert">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            <strong>Security Note:</strong> Please provide these credentials to the user securely. 
                            They should change their password upon first login.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-success" data-bs-dismiss="modal">
                            <i class="bi bi-check-circle me-1"></i> Got it!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('passwordModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('passwordModal'));
    modal.show();

    // Remove modal from DOM when hidden and clean up backdrop
    document.getElementById('passwordModal').addEventListener('hidden.bs.modal', function () {
        // Remove the modal element
        this.remove();

        // Clean up any remaining backdrop elements
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());

        // Remove modal-open class from body
        document.body.classList.remove('modal-open');

        // Reset body padding if needed
        document.body.style.paddingRight = '';
    });
}

// Copy password to clipboard
function copyPassword() {
    const passwordInput = document.getElementById('generatedPassword');
    passwordInput.select();
    passwordInput.setSelectionRange(0, 99999); // For mobile devices

    try {
        document.execCommand('copy');
        showAlert('Password copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for modern browsers
        navigator.clipboard.writeText(passwordInput.value).then(function () {
            showAlert('Password copied to clipboard!', 'success');
        }).catch(function () {
            showAlert('Failed to copy password', 'warning');
        });
    }
}
