(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const sidebar = $("sidebar");
  const backdrop = $("sidebarBackdrop");
  const menuToggle = $("menuToggle");
  const profileToggle = $("profileToggle");
  const profileMenu = $("profileMenu");
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
  function closeFloatingMenus(except) {
    [[profileMenu, profileToggle], [addMenu, addButton], [modelMenu, modelButton], [pageToolsMenu, pageToolsMenuButton]].forEach(([menu, trigger]) => {
      if (menu !== except) {
        setHidden(menu, true);
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

  if (profileToggle) profileToggle.addEventListener("click", () => {
    const open = profileMenu.hidden;
    closeFloatingMenus(profileMenu);
    setHidden(profileMenu, !open);
    profileToggle.setAttribute("aria-expanded", String(open));
  });
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
    composer.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = promptInput.value.trim();
      if (!text) return;
      const conversation = $("conversation");
      const bubble = document.createElement("div");
      bubble.className = "home-message user";
      bubble.textContent = text;
      conversation.appendChild(bubble);
      conversation.scrollTop = conversation.scrollHeight;
      promptInput.value = "";
      updateComposer();
      hint.textContent = "Chat responses are not connected yet. Open Terminal to use Antigravity CLI.";
      const status = document.createElement("div");
      status.className = "home-message system";
      status.textContent = "Airshell chat is not connected to an AI model yet. Your message has not been sent to a model.";
      conversation.appendChild(status);
      conversation.scrollTop = conversation.scrollHeight;
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
      setHidden(profileMenu, true);
      if (profileToggle) profileToggle.setAttribute("aria-expanded", "false");
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
