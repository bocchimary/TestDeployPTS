// Tab navigation with transitions
function handleNavigation() {
    const currentTab = window.location.hash.slice(1) || 'dashboard';
    
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const currentSection = document.getElementById(currentTab);
    if (currentSection) {
        currentSection.classList.add('active');
    }
}

// Profile toggle with transitions
function toggleEditProfile() {
    const displayMode = document.getElementById('studentProfileDisplay');
    const editMode = document.getElementById('studentProfileEdit');
    
    if (displayMode && editMode) {
        if (editMode.style.display === 'block') {
            // Switch to display mode
            editMode.classList.add('profile-fade-out');
            setTimeout(() => {
                editMode.style.display = 'none';
                displayMode.style.display = 'block';
                displayMode.classList.remove('profile-fade-out');
            }, 300);
        } else {
            // Switch to edit mode
            displayMode.classList.add('profile-fade-out');
            setTimeout(() => {
                displayMode.style.display = 'none';
                editMode.style.display = 'block';
                editMode.classList.remove('profile-fade-out');
            }, 300);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    handleNavigation();
    window.addEventListener('hashchange', handleNavigation);
    
    // Set initial profile states
    const displayMode = document.getElementById('studentProfileDisplay');
    const editMode = document.getElementById('studentProfileEdit');
    
    if (displayMode && editMode) {
        displayMode.style.display = 'block';
        displayMode.classList.remove('profile-fade-out');
        editMode.style.display = 'none';
        editMode.classList.remove('profile-fade-out');
    }
    
});