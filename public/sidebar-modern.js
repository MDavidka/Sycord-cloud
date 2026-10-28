/* Shared mobile-first drawer interactions. Existing home.js owns server actions and account state. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const drawer = $("sidebar");
  const toggle = $("sidebarSearchToggle");
  const search = $("sidebarSearch");
  const compose = $("sidebarCompose");
  const account = $("sidebarAccountToggle");
  const menuToggle = $("menuToggle");
  const serverList = $("sidebarServers");
  if (!drawer) return;

  function closeSearch({ focusToggle = false } = {}) {
    if (search && search.value) {
      search.value = "";
      search.dispatchEvent(new Event("input", { bubbles: true }));
    }
    drawer.classList.remove("search-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (search) search.blur();
    if (focusToggle) toggle?.focus();
  }

  toggle?.addEventListener("click", () => {
    const isOpen = drawer.classList.contains("search-open");
    if (isOpen) closeSearch({ focusToggle: true });
    else {
      drawer.classList.add("search-open");
      toggle.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => search?.focus());
    }
  });

  /* Search already filters navigation and server buttons in home.js.
     Hide each parent row as well so unmatched servers leave no empty space. */
  function syncServerRows() {
    serverList?.querySelectorAll(".sidebar-server-row").forEach((row) => {
      const entry = row.querySelector("[data-sidebar-search]");
      if (entry) row.hidden = entry.hidden;
    });
  }
  search?.addEventListener("input", syncServerRows);
  if (serverList) {
    new MutationObserver(syncServerRows).observe(serverList, { childList: true });
  }

  compose?.addEventListener("click", () => {
    const dashboardNew = $("newChatButton");
    if (menuToggle && drawer.classList.contains("open")) menuToggle.click();
    closeSearch();
    if (dashboardNew) dashboardNew.click();
    else window.location.assign("/dashboard");
  });

  account?.addEventListener("click", () => {
    const profileToggle = $("profileToggle") || $("homeProfileToggle");
    if (menuToggle && drawer.classList.contains("open")) menuToggle.click();
    closeSearch();
    profileToggle?.click();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (drawer.classList.contains("search-open") && document.activeElement === search) {
      event.preventDefault();
      closeSearch({ focusToggle: true });
    } else if (drawer.classList.contains("open")) {
      event.preventDefault();
      if (menuToggle) menuToggle.click();
      else {
        drawer.classList.remove("open");
        const backdrop = $("sidebarBackdrop");
        if (backdrop) backdrop.hidden = true;
      }
    }
  });
})();
