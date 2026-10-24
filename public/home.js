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
  });
  document.querySelectorAll("[data-sidebar-action]").forEach((item) => item.addEventListener("click", () => {
    const label = item.dataset.sidebarAction;
    openSidebar(false);
    showToolFeedback(label + " is a visual placeholder and is not connected yet.");
  }));



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

      const loading = appendChatMessage("assistant", "Thinking", "home-message-loading");
      const dots = document.createElement("span");
      dots.className = "thinking-dots";
      dots.setAttribute("aria-hidden", "true");
      dots.textContent = " …";
      loading.appendChild(dots);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ messages: chatHistory.slice(-20) })
        });
        const responseText = await response.text();
        let data = {};
        try { data = responseText ? JSON.parse(responseText) : {}; } catch (_) {
          data = { error: responseText.trim().slice(0, 240) };
        }
        if (!response.ok) {
          const fallback = response.status === 503
            ? "Chat service returned HTTP 503. Check that the latest server deployment is running and N_API is configured."
            : "The AI request failed (HTTP " + response.status + ").";
          throw new Error(data.error || fallback);
        }
        const answer = typeof data.answer === "string" ? data.answer.trim() : "";
        if (!answer) throw new Error("The AI returned an empty response.");
        renderMarkdown(loading, answer);
        loading.classList.remove("home-message-loading");
        chatHistory.push({ role: "assistant", content: answer });
        if (chatHistory.length > 20) chatHistory.splice(0, chatHistory.length - 20);
        conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
      } catch (error) {
        loading.textContent = error && error.message ? error.message : "Could not get an AI response. Please try again.";
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

  // Account menu theme controls.
  const themeButtons = document.querySelectorAll("[data-theme-choice]");
  const systemThemeQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  const applyThemeChoice = (choice, persist = true) => {
    const effectiveChoice = choice === "system" ? (systemThemeQuery && systemThemeQuery.matches ? "light" : "dark") : choice;
    document.documentElement.dataset.theme = choice;
    themeButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.themeChoice === choice)));
    document.documentElement.style.colorScheme = effectiveChoice;
    document.body.classList.toggle("airshell-light-theme", effectiveChoice === "light");
    if (persist) {
      try { window.localStorage.setItem("airshell-theme-choice", choice); } catch (_) {}
    }
  };
  themeButtons.forEach((button) => button.addEventListener("click", () => applyThemeChoice(button.dataset.themeChoice)));
  try {
    const savedTheme = window.localStorage.getItem("airshell-theme-choice");
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) applyThemeChoice(savedTheme);
  } catch (_) {}
  if (systemThemeQuery) systemThemeQuery.addEventListener("change", () => {
    let savedTheme = "dark";
    try { savedTheme = window.localStorage.getItem("airshell-theme-choice") || "dark"; } catch (_) {}
    if (savedTheme === "system") applyThemeChoice("system", false);
  });
  document.querySelectorAll("[data-profile-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.profileAction;
    if (action === "profile") showToolFeedback("Profile details are not available yet");
    if (action === "settings") showToolFeedback("Settings are not available yet");
    if (action === "billing") showToolFeedback("Billing is not available yet");
    closeProfileSheet();
  }));
})();