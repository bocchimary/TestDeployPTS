function updateNotificationCount(count) {
  const badge = document.getElementById("signatory_sidebar_notification_count");
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

// toggleSidebar function is handled by main-signatory.html template

document.addEventListener("DOMContentLoaded", function () {
  const dateSpan = document.getElementById("signatory_messages_dateToday");
  const today = new Date();
  const formatted = today.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  dateSpan.textContent = formatted;
});

window.addEventListener("resize", function () {
  const signatory_sidebar = document.getElementById("signatory_sidebar");
  const signatory_sidebar_backdrop = document.getElementById("signatory_sidebar_sidebarBackdrop");
  if (window.innerWidth > 768) {
    signatory_sidebar.classList.remove("show");
    signatory_sidebar_backdrop.classList.remove("show");
  }
});



function toggleProfile() {
  const profile = document.getElementById("signatory_messages_profile_sidebar");
  profile.classList.toggle("show");
}

function openChat() {
  document.getElementById("signatory_messages_main_chat").classList.add("show");
  document.getElementById("signatory_messages_profile_sidebar").classList.remove("show");
}

function closeChat() {
  document.getElementById("signatory_messages_main_chat").classList.remove("show");
}