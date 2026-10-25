(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const sidebar = $("sidebar");
  const backdrop = $("sidebarBackdrop");
  const menuToggle = $("menuToggle");
  const profileToggle = $("profileToggle");
  const profileMenu = $("profileMenu");
  const profileSheetBackdrop = $("profileSheetBackdrop");
  const addButton = $("addButton");
  const composerAdd = $("composerAdd");
  const addMenu = $("addMenu");
  const modelButton = $("modelButton");
  const modelMenu = $("modelMenu");
  const modelName = $("modelName");
  const promptInput = $("promptInput");
  const sendButton = document.querySelector(".composer-send");
  const fileInput = $("fileInput");
  const hint = $("composerHint");
  const composer = $("composer");
  const pageToolsMenu = $("pageToolsMenu");
  const pageToolsMenuButton = $("pageToolsMenuButton");
  const toolFeedback = $("toolFeedback");
  const cpuHistory = [];
  const memoryHistory = [];
  const serverDialog = $("addServerDialog");
  const serverForm = $("addServerForm");
  const serverFormError = $("serverFormError");
  const saveServerButton = $("saveServerButton");

  function setHidden(el, hidden) {
    if (el) el.hidden = hidden;
  }
  function closeProfileSheet() {
    setHidden(profileMenu, true);
    setHidden(profileSheetBackdrop, true);
    if (profileToggle) profileToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("profile-sheet-open");
  }
  function closeFloatingMenus(except) {
    [[profileMenu, profileToggle], [addMenu, addButton], [modelMenu, modelButton], [pageToolsMenu, pageToolsMenuButton]].forEach(([menu, trigger]) => {
      if (menu !== except) {
        if (menu === profileMenu) closeProfileSheet();
        else setHidden(menu, true);
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      }
    });
  }
  function openSidebar(open) {
    if (!sidebar || !backdrop) return;
    sidebar.classList.toggle("open", open);
    backdrop.hidden = !open;
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close sidebar" : "Open sidebar");
    }
  }
  if (menuToggle) menuToggle.addEventListener("click", () => openSidebar(!sidebar.classList.contains("open")));
  if ($("sidebarClose")) $("sidebarClose").addEventListener("click", () => openSidebar(false));
  if (backdrop) backdrop.addEventListener("click", () => openSidebar(false));
  document.querySelectorAll(".home-nav a").forEach((link) => link.addEventListener("click", () => openSidebar(false)));

  const serversNavToggle = $("serversNavToggle");
  const sidebarServers = $("sidebarServers");
  if (serversNavToggle && sidebarServers) {
    serversNavToggle.addEventListener("click", () => {
      const expanded = serversNavToggle.getAttribute("aria-expanded") !== "false";
      serversNavToggle.setAttribute("aria-expanded", String(!expanded));
      sidebarServers.hidden = expanded;
    });
  }
  const sidebarSearch = $("sidebarSearch");
  if (sidebarSearch) sidebarSearch.addEventListener("input", () => {
    const query = sidebarSearch.value.trim().toLowerCase();
    document.querySelectorAll("[data-sidebar-search]").forEach((item) => {
      const matched = !query || item.dataset.sidebarSearch.toLowerCase().includes(query);
      item.hidden = !matched;
    });
    document.querySelectorAll("[data-sidebar-section]").forEach((section) => {
      const visibleItem = Array.from(section.querySelectorAll("[data-sidebar-search]")).some((item) => !item.hidden);
      section.hidden = !visibleItem;
    });
    const mainNav = document.querySelector(".home-sidebar .home-nav");
    if (mainNav) mainNav.hidden = !Array.from(mainNav.querySelectorAll("[data-sidebar-search]")).some((item) => !item.hidden);
    if (sidebarServers && query) sidebarServers.hidden = false;
    if (serversNavToggle) serversNavToggle.setAttribute("aria-expanded", String(!sidebarServers?.hidden));
  });
  document.querySelectorAll("[data-sidebar-action]").forEach((item) => item.addEventListener("click", () => {
    const label = item.dataset.sidebarAction;
    openSidebar(false);
    showToolFeedback(label + " is a visual placeholder and is not connected yet.");
  }));

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  async function loadServers() {
    const list = $("sidebarServers");
    if (!list) return;
    try {
      const response = await fetch("/api/servers", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Please sign in again." : "Could not load servers.");
      const data = await response.json();
      const servers = Array.isArray(data.servers) ? data.servers : [];
      const selectedId = new URLSearchParams(location.search).get("server");
      list.innerHTML = servers.length ? servers.map((server) =>
        '<div class="sidebar-server-row" data-server-row="' + escapeHtml(server.id) + '">' +
        '<button class="sidebar-server-item' + (selectedId === server.id ? " current" : "") + '" type="button" data-server-open="' + escapeHtml(server.id) + '" data-sidebar-search="servers ' + escapeHtml(server.name) + ' ' + escapeHtml(server.host) + '">' +
        '<svg class="server-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6"/></svg>' +
        '<span class="sidebar-server-label"><span class="sidebar-server-name">' + escapeHtml(server.name) + '<span class="server-status-dot status-checking" data-server-status="' + escapeHtml(server.id) + '" role="status" aria-label="Checking server status" title="Checking connection"></span></span><span class="sidebar-server-host">' + escapeHtml(server.username) + '@' + escapeHtml(server.host) + '</span></span></button>' +
        '<button class="sidebar-server-remove" type="button" data-server-remove="' + escapeHtml(server.id) + '" aria-label="Remove ' + escapeHtml(server.name) + '" title="Remove server">×</button></div>'
      ).join("") : '<p class="servers-empty" id="serversEmpty">No servers added yet</p>';
      list.querySelectorAll("[data-server-open]").forEach((button) => button.addEventListener("click", () => {
        location.href = "/terminal?server=" + encodeURIComponent(button.dataset.serverOpen);
      }));
      updateServerStatuses(servers);
      list.querySelectorAll("[data-server-remove]").forEach((button) => button.addEventListener("click", async () => {
        const id = button.dataset.serverRemove;
        if (!window.confirm("Remove this saved server and its stored SSH key?")) return;
        button.disabled = true;
        try {
          const response = await fetch("/api/servers/" + encodeURIComponent(id), { method: "DELETE", credentials: "same-origin" });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Could not remove server.");
          await loadServers();
          if (new URLSearchParams(location.search).get("server") === id) location.href = "/terminal";
        } catch (error) { showToolFeedback(error.message || "Could not remove server."); button.disabled = false; }
      }));
      if (sidebarSearch && sidebarSearch.value.trim()) sidebarSearch.dispatchEvent(new Event("input"));
    } catch (error) {
      list.innerHTML = '<p class="servers-empty">' + escapeHtml(error.message || "Could not load servers") + '</p>';
    }
  }
  async function updateServerStatuses(servers) {
    const queue = Array.isArray(servers) ? servers.slice() : [];
    const checkNext = async () => {
      const server = queue.shift();
      if (!server) return;
      const dot = document.querySelector('[data-server-status="' + CSS.escape(server.id) + '"]');
      if (dot) {
        try {
          const response = await fetch("/api/servers/" + encodeURIComponent(server.id) + "/status", { credentials: "same-origin", cache: "no-store" });
          if (!response.ok) throw new Error("Status unavailable");
          const data = await response.json();
          const status = ["online", "offline", "unknown"].includes(data.status) ? data.status : "unknown";
          dot.className = "server-status-dot status-" + status;
          const label = status === "online" ? "Online" : status === "offline" ? "Offline" : "Status unavailable";
          dot.setAttribute("aria-label", label);
          dot.title = label;
        } catch (_) {
          dot.className = "server-status-dot status-unknown";
          dot.setAttribute("aria-label", "Status unavailable");
          dot.title = "Status unavailable";
        }
      }
      await checkNext();
    };
    await Promise.all(Array.from({ length: Math.min(3, queue.length) }, () => checkNext()));
  }
  window.setInterval(() => {
    const servers = Array.from(document.querySelectorAll("[data-server-status]")).map((dot) => ({ id: dot.dataset.serverStatus }));
    if (servers.length) updateServerStatuses(servers);
  }, 60000);
  function openServerDialog() {
    if (!serverDialog) return;
    if (serverFormError) { serverFormError.hidden = true; serverFormError.textContent = ""; }
    if (typeof serverDialog.showModal === "function") serverDialog.showModal();
    else serverDialog.setAttribute("open", "");
    const first = serverForm && serverForm.elements.namedItem("name");
    if (first) window.setTimeout(() => first.focus({ preventScroll: true }), 50);
  }
  function closeServerDialog() { if (serverDialog && serverDialog.open) serverDialog.close(); }
  if ($("addServerButton")) $("addServerButton").addEventListener("click", openServerDialog);
  if ($("closeServerDialog")) $("closeServerDialog").addEventListener("click", closeServerDialog);
  if ($("cancelServerDialog")) $("cancelServerDialog").addEventListener("click", closeServerDialog);
  if (serverDialog) serverDialog.addEventListener("click", (event) => { if (event.target === serverDialog) closeServerDialog(); });
    const providerSelect = $("serverProvider");
  const sshFields = $("sshFields");
  const instaboxFields = $("instaboxFields");
  function updateProviderFields() {
    const isInstabox = providerSelect && providerSelect.value === "instabox";
    if (sshFields) sshFields.hidden = isInstabox;
    if (instaboxFields) instaboxFields.hidden = !isInstabox;
    ["serverHost","serverPort","serverUsername","serverPrivateKey"].forEach((id) => {
      const field = $(id);
      if (field) field.required = !isInstabox;
    });
    const command = $("instaboxCommand");
    if (command) command.required = Boolean(isInstabox);
    if (saveServerButton) saveServerButton.textContent = isInstabox ? "Connect Instabox" : "Test and add server";
  }
  if (providerSelect) {
    providerSelect.addEventListener("change", updateProviderFields);
    updateProviderFields();
  }
  if (serverForm) serverForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (serverFormError) { serverFormError.hidden = true; serverFormError.textContent = ""; }
    const payload = Object.fromEntries(new FormData(serverForm).entries());
    payload.port = Number(payload.port || 22);
    if (saveServerButton) { saveServerButton.disabled = true; saveServerButton.textContent = payload.provider === "instabox" ? "Connecting…" : "Testing SSH…"; }
    try {
      const response = await fetch("/api/servers", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not add server.");
      serverForm.reset();
      const port = serverForm.elements.namedItem("port"); if (port) port.value = "22";
      if (providerSelect) providerSelect.value = "ssh";
      updateProviderFields();
      closeServerDialog();
      await loadServers();
      showToolFeedback(payload.provider === "instabox" ? "Instabox connected · server added" : "SSH connection verified · server added");
    } catch (error) {
      if (serverFormError) { serverFormError.textContent = error.message || "Could not add server."; serverFormError.hidden = false; }
    } finally {
      if (saveServerButton) { saveServerButton.disabled = false; updateProviderFields(); }
    }
  });
  loadServers();



  function showToolFeedback(message) {
    if (!toolFeedback) return;
    toolFeedback.textContent = message;
    toolFeedback.hidden = false;
    window.clearTimeout(showToolFeedback.timer);
    showToolFeedback.timer = window.setTimeout(() => { toolFeedback.hidden = true; }, 1800);
  }
  async function copyText(value, successMessage) {
    try {
      await navigator.clipboard.writeText(value);
      showToolFeedback(successMessage);
    } catch (_) {
      showToolFeedback("Copy is not available in this browser");
    }
  }
  const pageLinkButton = $("pageLinkButton");
  const pageDuplicateButton = $("pageDuplicateButton");
  const menuCopyPageLink = $("menuCopyPageLink");
  if (pageLinkButton) pageLinkButton.addEventListener("click", () => copyText(window.location.href, "Page link copied"));
  if (pageDuplicateButton) pageDuplicateButton.addEventListener("click", () => copyText(document.title + "\\n" + window.location.href, "Page details copied"));
  if (menuCopyPageLink) menuCopyPageLink.addEventListener("click", () => {
    closeFloatingMenus();
    copyText(window.location.href, "Page link copied");
  });
  if (pageToolsMenuButton && pageToolsMenu) pageToolsMenuButton.addEventListener("click", () => {
    const open = pageToolsMenu.hidden;
    closeFloatingMenus(pageToolsMenu);
    setHidden(pageToolsMenu, !open);
    pageToolsMenuButton.setAttribute("aria-expanded", String(open));
  });

  if (profileToggle && profileMenu) profileToggle.addEventListener("click", () => {
    const open = profileMenu.hidden;
    closeFloatingMenus(profileMenu);
    setHidden(profileMenu, !open);
    setHidden(profileSheetBackdrop, !open);
    document.body.classList.toggle("profile-sheet-open", open);
    profileToggle.setAttribute("aria-expanded", String(open));
  });
  if (profileSheetBackdrop) profileSheetBackdrop.addEventListener("click", closeProfileSheet);

  const profileName = document.querySelector(".profile-sheet-name");
  const profileEmail = document.querySelector(".profile-sheet-email");
  const profileAvatar = document.querySelector(".profile-sheet-avatar");
  const topAvatar = document.getElementById("profileToggle");
  const avatarInput = document.getElementById("profileAvatarInput");
  const avatarRemove = document.getElementById("profileAvatarRemove");
  let savedProfile = { displayName: "Airshell User", email: "", theme: "dark", avatarDataUrl: "" };
  function renderAvatar(element, avatarDataUrl, fallback) {
    if (!element) return;
    element.replaceChildren();
    if (avatarDataUrl) {
      const image = document.createElement("img");
      image.src = avatarDataUrl; image.alt = "Profile picture"; image.className = "profile-avatar-image";
      element.appendChild(image);
    } else element.textContent = (fallback || "A").trim().charAt(0).toUpperCase() || "A";
  }
  function applyProfile(profile) {
    savedProfile = { ...savedProfile, ...(profile || {}) };
    if (profileName) {
      profileName.replaceChildren(document.createTextNode(savedProfile.displayName || "Airshell User"));
      const plan = document.createElement("span"); plan.className = "profile-plan"; plan.textContent = "Pro";
      profileName.appendChild(document.createTextNode(" ")); profileName.appendChild(plan);
    }
    if (profileEmail) profileEmail.textContent = savedProfile.email || "No email set";
    renderAvatar(profileAvatar, savedProfile.avatarDataUrl, savedProfile.displayName);
    renderAvatar(topAvatar, savedProfile.avatarDataUrl, savedProfile.displayName);
    if (avatarRemove) avatarRemove.hidden = !savedProfile.avatarDataUrl;
    const systemLight = savedProfile.theme === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    document.body.classList.toggle("airshell-light-theme", savedProfile.theme === "light" || systemLight);
    document.querySelectorAll("[data-theme-choice]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.themeChoice === savedProfile.theme)));
  }
  async function saveProfile(patch) {
    const response = await fetch("/api/profile", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...savedProfile, ...patch }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not save profile.");
    applyProfile(data.profile); return data;
  }
  async function loadProfile() {
    try {
      const response = await fetch("/api/profile", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load profile.");
      applyProfile(data.profile);
    } catch (error) { showToolFeedback(error.message || "Could not load saved profile."); }
  }
  if (avatarInput && profileAvatar) {
    profileAvatar.addEventListener("click", () => avatarInput.click());
    profileAvatar.setAttribute("tabindex", "0");
    profileAvatar.setAttribute("aria-label", "Change profile picture");
    profileAvatar.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); avatarInput.click(); } });
    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 500 * 1024) {
        showToolFeedback("Choose a PNG, JPEG or WebP image under 500 KB."); avatarInput.value = ""; return;
      }
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Could not read image.")); reader.readAsDataURL(file);
        });
        await saveProfile({ avatarDataUrl: dataUrl }); showToolFeedback("Profile picture saved.");
      } catch (error) { showToolFeedback(error.message || "Could not save profile picture."); }
      finally { avatarInput.value = ""; }
    });
  }
  if (avatarRemove) avatarRemove.addEventListener("click", async event => {
    event.stopPropagation();
    try { await saveProfile({ avatarDataUrl: null }); showToolFeedback("Profile picture removed."); }
    catch (error) { showToolFeedback(error.message || "Could not remove profile picture."); }
  });
  document.querySelectorAll("[data-theme-choice]").forEach(button => button.addEventListener("click", async () => {
    try { await saveProfile({ theme: button.dataset.themeChoice }); showToolFeedback("Profile theme saved."); }
    catch (error) { showToolFeedback(error.message || "Could not save theme."); }
  }));
  document.querySelectorAll("[data-profile-action]").forEach(button => button.addEventListener("click", async () => {
    const action = button.dataset.profileAction; closeProfileSheet();
    if (action !== "profile") { showToolFeedback(action === "settings" ? "Settings are saved through your profile preferences." : "Billing is not connected yet."); return; }
    const displayName = window.prompt("Profile display name", savedProfile.displayName || "");
    if (displayName === null) return;
    const email = window.prompt("Profile email (optional)", savedProfile.email || "");
    if (email === null) return;
    try { await saveProfile({ displayName, email }); showToolFeedback("Profile saved."); }
    catch (error) { showToolFeedback(error.message || "Could not save profile."); }
  }));
  loadProfile();
  function toggleAddMenu() {
    const open = addMenu.hidden;
    closeFloatingMenus(addMenu);
    setHidden(addMenu, !open);
    addButton.setAttribute("aria-expanded", String(open));
  }
  if (addButton) addButton.addEventListener("click", toggleAddMenu);
  if (composerAdd) composerAdd.addEventListener("click", toggleAddMenu);
  if ($("attachAction") && fileInput) $("attachAction").addEventListener("click", () => fileInput.click());
  if (fileInput) fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) {
      hint.textContent = "Selected file: " + fileInput.files[0].name + " · file upload is not connected yet";
      closeFloatingMenus();
    }
  });
  if (modelButton) modelButton.addEventListener("click", () => {
    const open = modelMenu.hidden;
    closeFloatingMenus(modelMenu);
    setHidden(modelMenu, !open);
    modelButton.setAttribute("aria-expanded", String(open));
  });
  if (modelMenu) modelMenu.querySelectorAll("[data-model]").forEach((option) => {
    option.addEventListener("click", () => {
      modelName.textContent = option.dataset.model;
      modelMenu.querySelectorAll("[role=option]").forEach((item) => {
        const selected = item === option;
        item.setAttribute("aria-selected", String(selected));
        const badge = item.querySelector("span");
        if (badge) badge.remove();
        if (selected) {
          const label = document.createElement("span");
          label.textContent = "Selected";
          item.appendChild(label);
        }
      });
      closeFloatingMenus();
    });
  });

  if (promptInput && sendButton) {
    // iOS Safari zooms into focused inputs smaller than 16px; preserve viewport scale.\n
    const updateComposer = () => {
      sendButton.classList.toggle("ready", promptInput.value.trim().length > 0);
      promptInput.style.height = "auto";
      promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + "px";
    };
    promptInput.addEventListener("input", updateComposer);
    promptInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (promptInput.value.trim()) composer.requestSubmit();
      }
    });
    const chatHistory = [];
    const conversation = $("conversation");
    const appendInlineMarkdown = (parent, source) => {
      const pattern = /(\x60[^\x60]+\x60|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+)/g;
      let cursor = 0;
      let match;
      while ((match = pattern.exec(source))) {
        if (match.index > cursor) parent.appendChild(document.createTextNode(source.slice(cursor, match.index)));
        const token = match[0];
        let node;
        if (token.startsWith("\x60")) {
          node = document.createElement("code");
          node.textContent = token.slice(1, -1);
        } else if (token.startsWith("**") || token.startsWith("__")) {
          node = document.createElement("strong");
          node.textContent = token.slice(2, -2);
        } else if (token.startsWith("*") || token.startsWith("_")) {
          node = document.createElement("em");
          node.textContent = token.slice(1, -1);
        } else {
          const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
          node = document.createElement("a");
          if (linkMatch) {
            node.textContent = linkMatch[1];
            node.href = linkMatch[2];
          } else {
            const url = token.replace(/[.,!?;:]+$/, "");
            node.textContent = url;
            node.href = url;
          }
          node.target = "_blank";
          node.rel = "noopener noreferrer";
          node.className = "markdown-link";
        }
        parent.appendChild(node);
        cursor = pattern.lastIndex;
      }
      if (cursor < source.length) parent.appendChild(document.createTextNode(source.slice(cursor)));
    };
    const renderMarkdown = (container, source) => {
      container.replaceChildren();
      const lines = source.replace(/\r\n?/g, "\n").split("\n");
      let paragraph = [];
      let list = null;
      let codeBlock = null;
      const flushParagraph = () => {
        if (!paragraph.length) return;
        const p = document.createElement("p");
        appendInlineMarkdown(p, paragraph.join(" "));
        container.appendChild(p);
        paragraph = [];
      };
      const closeList = () => { list = null; };
      for (const line of lines) {
        if (/^\s*\x60{3}/.test(line)) {
          flushParagraph(); closeList();
          if (codeBlock) { container.appendChild(codeBlock); codeBlock = null; }
          else { codeBlock = document.createElement("pre"); codeBlock.appendChild(document.createElement("code")); }
          continue;
        }
        if (codeBlock) {
          codeBlock.firstChild.appendChild(document.createTextNode(line + "\n"));
          continue;
        }
        const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
        if (heading) {
          flushParagraph(); closeList();
          const h = document.createElement("h" + heading[1].length);
          appendInlineMarkdown(h, heading[2]);
          container.appendChild(h);
          continue;
        }
        const quote = line.match(/^\s*>\s?(.*)$/);
        if (quote) {
          flushParagraph(); closeList();
          const blockquote = document.createElement("blockquote");
          appendInlineMarkdown(blockquote, quote[1]);
          container.appendChild(blockquote);
          continue;
        }
        const item = line.match(/^\s*(?:(\d+)\.\s+|[-*+]\s+)(.+)$/);
        if (item) {
          flushParagraph();
          const ordered = Boolean(item[1]);
          if (!list || list.tagName.toLowerCase() !== (ordered ? "ol" : "ul")) {
            closeList();
            list = document.createElement(ordered ? "ol" : "ul");
            container.appendChild(list);
          }
          const li = document.createElement("li");
          appendInlineMarkdown(li, item[2]);
          list.appendChild(li);
          continue;
        }
        if (!line.trim()) { flushParagraph(); closeList(); continue; }
        closeList();
        paragraph.push(line.trim());
      }
      flushParagraph();
      if (codeBlock) container.appendChild(codeBlock);
    };
    const appendChatMessage = (role, content, extraClass = "") => {
      const node = document.createElement("div");
      node.className = "home-message " + (role === "user" ? "user" : "system") + (extraClass ? " " + extraClass : "");
      if (role === "assistant" && !extraClass.includes("loading")) renderMarkdown(node, content);
      else node.textContent = content;
      conversation.appendChild(node);
      conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
      return node;
    };

    composer.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = promptInput.value.trim();
      if (!text || sendButton.disabled) return;

      const dashboard = document.querySelector(".home-main.home-dashboard");
      if (dashboard) dashboard.classList.add("has-conversation");
      chatHistory.push({ role: "user", content: text });
      appendChatMessage("user", text);
      promptInput.value = "";
      updateComposer();

      sendButton.disabled = true;
      sendButton.classList.remove("send-bounce");
      void sendButton.offsetWidth;
      sendButton.classList.add("send-bounce");
      promptInput.disabled = true;

      const loading = appendChatMessage("assistant", "", "home-message-loading");
      const thinking = document.createElement("span");
      thinking.className = "ai-thinking-label";
      thinking.innerHTML = '<span class="ai-thinking-orb" aria-hidden="true"></span><span>Thinking<span class="ai-thinking-ellipsis" aria-hidden="true">...</span></span>';
      loading.appendChild(thinking);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
          body: JSON.stringify({ messages: chatHistory.slice(-20) })
        });
        if (!response.ok) {
          const responseText = await response.text();
          let data = {};
          try { data = responseText ? JSON.parse(responseText) : {}; } catch (_) { data = { error: responseText.trim().slice(0, 240) }; }
          const fallback = response.status === 503
            ? "Chat service returned HTTP 503. Check that the latest server deployment is running and N_API is configured."
            : "The AI request failed (HTTP " + response.status + ").";
          throw new Error(data.error || fallback);
        }
        if (!response.body || typeof response.body.getReader !== "function") throw new Error("Streaming is not supported by this browser response.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";
        let firstToken = false;
        let streamText = null;
        let streamCursor = null;
        const consumeEvent = (rawEvent) => {
          const dataLine = rawEvent.split(/\r?\n/).find(line => line.startsWith("data:"));
          if (!dataLine) return;
          let packet;
          try { packet = JSON.parse(dataLine.slice(5).trim()); } catch { return; }
          if (packet.error) throw new Error(packet.error);
          if (typeof packet.status === "string" && thinking) {
            const statusLabel = thinking.querySelector("span:last-child");
            if (statusLabel) statusLabel.textContent = packet.status;
          }
          if (packet.approval && packet.approval.id) {
            const approval = packet.approval;
            const accepted = window.confirm("Airshell wants to perform a server change.\n\n" + String(approval.summary || approval.tool || "Approve action").slice(0, 1800) + "\n\nContinue?");
            fetch("/api/chat/approve", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: approval.id, approved: accepted }) }).catch(function () {});
          }
          if (typeof packet.token === "string" && packet.token) {
            if (!firstToken) {
              firstToken = true;
              loading.classList.remove("home-message-loading");
              loading.classList.add("home-message-streaming");
              loading.replaceChildren();
              streamText = document.createElement("span");
              streamText.className = "ai-stream-text";
              streamCursor = document.createElement("span");
              streamCursor.className = "ai-stream-cursor";
              streamCursor.setAttribute("aria-hidden", "true");
              loading.append(streamText, streamCursor);
            }
            answer += packet.token;
            streamText.textContent = answer;
            conversation.scrollTo({ top: conversation.scrollHeight, behavior: "auto" });
          }
        };
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          buffer += decoder.decode(part.value, { stream: true });
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() || "";
          for (const eventText of events) consumeEvent(eventText);
        }
        buffer += decoder.decode();
        if (buffer.trim()) consumeEvent(buffer);
        if (!answer.trim()) throw new Error("The AI returned an empty response.");
        renderMarkdown(loading, answer.trim());
        loading.classList.remove("home-message-loading", "home-message-streaming");
        chatHistory.push({ role: "assistant", content: answer.trim() });
        if (chatHistory.length > 20) chatHistory.splice(0, chatHistory.length - 20);
        conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
      } catch (error) {
        loading.textContent = error && error.message ? error.message : "Could not get an AI response. Please try again.";
        loading.classList.remove("home-message-loading", "home-message-streaming");
        loading.classList.add("home-message-error");
      } finally {
        sendButton.disabled = false;
        promptInput.disabled = false;
        sendButton.classList.remove("send-bounce");
        updateComposer();
        promptInput.focus({ preventScroll: true });
      }
    });
    updateComposer();
  }

  function formatUptime(total) {
    const seconds = Math.max(0, Math.floor(total || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;
    if (hours) return hours + "h " + minutes + "m";
    if (minutes) return minutes + "m " + remaining + "s";
    return remaining + "s";
  }
  function formatBytes(value) {
    if (!Number.isFinite(value) || value < 0) return "—";
    if (value < 1024 * 1024) return Math.round(value / 1024) + " KB";
    return (value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0) + " MB";
  }
  function setRuntimeText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }
  function updateChart(lineId, fillId, values) {
    const line = $(lineId);
    const fill = $(fillId);
    if (!line || !fill || !values.length) return;
    const width = 300;
    const height = 64;
    const points = values.map((value, index) => {
      const x = values.length === 1 ? width : index * width / (values.length - 1);
      const y = height - 7 - (Math.max(0, Math.min(100, value)) / 100) * (height - 14);
      return x.toFixed(1) + " " + y.toFixed(1);
    }).join(" L");
    line.setAttribute("d", "M" + points);
    fill.setAttribute("d", "M" + points + " L" + width + " " + height + " L0 " + height + " Z");
  }
  async function updateRuntime() {
    try {
      const response = await fetch("/api/stats", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("Runtime unavailable");
      const data = await response.json();
      const uptime = formatUptime(data.uptimeSeconds);
      const memory = data.memory || {};
      const cpu = Math.max(0, Number(data.cpuPercent) || 0);
      const heapPercent = memory.heapTotalBytes > 0 ? (memory.heapUsedBytes / memory.heapTotalBytes) * 100 : 0;
      cpuHistory.push(cpu);
      memoryHistory.push(heapPercent);
      if (cpuHistory.length > 24) cpuHistory.shift();
      if (memoryHistory.length > 24) memoryHistory.shift();
      updateChart("cpuLinePath", "cpuFillPath", cpuHistory);
      updateChart("memoryLinePath", "memoryFillPath", memoryHistory);
      updateChart("watcherCpuLinePath", "watcherCpuFillPath", cpuHistory);
      updateChart("watcherMemoryLinePath", "watcherMemoryFillPath", memoryHistory);
      setRuntimeText("runtimeStatus", "• RUNNING");
      setRuntimeText("runtimeUptime", uptime);
      setRuntimeText("runtimeAddress", window.location.host || "Authenticated local runtime");
      setRuntimeText("runtimePlatform", data.platform || "Unknown platform");
      setRuntimeText("runtimeNode", data.nodeVersion || "Node.js");
      setRuntimeText("runtimeTerminals", String(data.activeTerminals ?? 0));
      setRuntimeText("cpuChartLabel", "CPU usage · " + cpu.toFixed(1) + "%");
      setRuntimeText("memoryChartLabel", "Heap usage · " + formatBytes(memory.heapUsedBytes) + " / " + formatBytes(memory.heapTotalBytes));
      setRuntimeText("watcherStatus", "Online");
      setRuntimeText("watcherUptime", uptime);
      setRuntimeText("watcherAddress", window.location.host || "Authenticated local runtime");
      setRuntimeText("watcherPlatform", data.platform || "Unknown platform");
      setRuntimeText("watcherNode", data.nodeVersion || "Node.js");
      setRuntimeText("watcherTerminals", String(data.activeTerminals ?? 0));
      setRuntimeText("watcherCpuValue", cpu.toFixed(1) + "%");
      setRuntimeText("watcherMemoryValue", heapPercent.toFixed(1) + "%");
      setRuntimeText("watcherCpuLabel", cpu.toFixed(1) + "% now");
      setRuntimeText("watcherMemoryLabel", formatBytes(memory.heapUsedBytes) + " used");
      if ($("sidebarUptime")) $("sidebarUptime").textContent = "Uptime · " + uptime;
    } catch (_) {
      if ($("runtimeUptime")) $("runtimeUptime").textContent = "Runtime status unavailable";
      setRuntimeText("runtimeStatus", "• UNAVAILABLE");
      setRuntimeText("runtimeAddress", "Runtime metrics unavailable");
      setRuntimeText("watcherStatus", "Unavailable");
      setRuntimeText("watcherUptime", "Unavailable");
      setRuntimeText("watcherAddress", "Runtime metrics unavailable");
      if ($("sidebarUptime")) $("sidebarUptime").textContent = "Waiting for connection";
    }
  }
  updateRuntime();
  window.setInterval(updateRuntime, 15000);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".home-profile-menu") && !event.target.closest("#profileToggle") && profileMenu) {
      closeProfileSheet();
    }
    if (!event.target.closest(".home-add-menu") && !event.target.closest("#addButton") && !event.target.closest("#composerAdd") && addMenu) {
      setHidden(addMenu, true);
      if (addButton) addButton.setAttribute("aria-expanded", "false");
    }
    if (!event.target.closest(".home-model-menu") && !event.target.closest("#modelButton") && modelMenu) {
      setHidden(modelMenu, true);
      if (modelButton) modelButton.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      openSidebar(false);
      closeFloatingMenus();
    }
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }

})();