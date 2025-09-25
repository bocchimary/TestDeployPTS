function updateNotificationCount(count) {
  const badge = document.getElementById("bm_sidebar_notification_count");
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

// toggleSidebar function is handled by main-bm.html template

document.addEventListener("DOMContentLoaded", function () {
  const dateSpan = document.getElementById("bm_messages_dateToday");
  const today = new Date();
  const formatted = today.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  dateSpan.textContent = formatted;
});

window.addEventListener("resize", function () {
  const bm_sidebar = document.getElementById("bm_sidebar");
  const bm_sidebar_backdrop = document.getElementById("bm_sidebar_sidebarBackdrop");
  if (window.innerWidth > 768) {
    bm_sidebar.classList.remove("show");
    bm_sidebar_backdrop.classList.remove("show");
  }
});




function toggleProfile() {
  const profile = document.getElementById("bm_messages_profile_sidebar");
  profile.classList.toggle("show");
}

function openChat() {
  document.getElementById("bm_messages_main_chat").classList.add("show");
  document.getElementById("bm_messages_profile_sidebar").classList.remove("show");
}

function closeChat() {
  document.getElementById("bm_messages_main_chat").classList.remove("show");
}