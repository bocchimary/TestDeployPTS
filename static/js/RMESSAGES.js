function updateNotificationCount(count) {
  const badge = document.getElementById("registrar_sidebar_notification_count");
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

// toggleSidebar function is handled by main-registrar.html template

document.addEventListener("DOMContentLoaded", function () {
  const dateSpan = document.getElementById("registrar_messages_dateToday");
  const today = new Date();
  const formatted = today.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  dateSpan.textContent = formatted;
});

window.addEventListener("resize", function () {
  const registrar_sidebar = document.getElementById("registrar_sidebar");
  const registrar_sidebar_backdrop = document.getElementById("registrar_sidebar_sidebarBackdrop");
  if (window.innerWidth > 768) {
    registrar_sidebar.classList.remove("show");
    registrar_sidebar_backdrop.classList.remove("show");
  }
});



function toggleProfile() {
  const profile = document.getElementById("registrar_messages_profile_sidebar");
  profile.classList.toggle("show");
}

function openChat() {
  document.getElementById("registrar_messages_main_chat").classList.add("show");
  document.getElementById("registrar_messages_profile_sidebar").classList.remove("show");
}

function closeChat() {
  document.getElementById("registrar_messages_main_chat").classList.remove("show");
}