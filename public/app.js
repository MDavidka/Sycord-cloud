(function () {
  "use strict";
  var sidebar = document.getElementById("sidebar");
  var menuToggle = document.getElementById("menuToggle");
  function closeNav() {
    if (sidebar) sidebar.classList.remove("open");
    document.body.classList.remove("nav-open");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    }
  }
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function () {
      var open = sidebar.classList.toggle("open");
      document.body.classList.toggle("nav-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });
    document.addEventListener("click", function (event) {
      if (window.innerWidth <= 960 && sidebar.classList.contains("open") &&
          !sidebar.contains(event.target) && !menuToggle.contains(event.target)) closeNav();
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeNav(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 960) closeNav(); });
  }

  var cpuValue = document.getElementById("cpuValue");
  if (!cpuValue) return;
  function text(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }
  function bytes(value) {
    if (!Number.isFinite(value) || value < 0) return "—";
    if (value < 1024 * 1024) return Math.round(value / 1024) + " KB";
    return (value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0) + " MB";
  }
  function duration(value) {
    var seconds = Math.max(0, Math.floor(value || 0));
    var days = Math.floor(seconds / 86400);
    var hours = Math.floor((seconds % 86400) / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    if (days) return days + "d " + hours + "h";
    if (hours) return hours + "h " + minutes + "m";
    return minutes + "m " + (seconds % 60) + "s";
  }
  function clock(value) {
    try { return new Date(value).toLocaleString(); } catch (error) { return "—"; }
  }
  function meter(id, value) {
    var node = document.getElementById(id);
    if (node) node.style.width = Math.max(0, Math.min(100, value || 0)) + "%";
  }
  function updateStats(data) {
    var cpu = Math.max(0, Number(data.cpuPercent) || 0);
    var memory = data.memory || {};
    var heapRatio = memory.heapTotalBytes > 0 ? (memory.heapUsedBytes / memory.heapTotalBytes) * 100 : 0;
    text("cpuValue", cpu.toFixed(1) + "%");
    text("cpuInline", cpu.toFixed(1) + "%");
    text("rssValue", bytes(memory.rssBytes));
    text("uptimeValue", duration(data.uptimeSeconds));
    text("activeValue", String(data.activeTerminals));
    text("heapInline", bytes(memory.heapUsedBytes));
    text("heapTotalValue", bytes(memory.heapTotalBytes));
    text("externalValue", bytes(memory.externalBytes));
    text("nodeValue", data.nodeVersion || "—");
    text("platformValue", data.platform || "—");
    text("pidValue", String(data.pid || "—"));
    text("startedValue", clock(data.startedAt));
    text("topStatus", "Online");
    text("sidebarStatus", "Runtime online");
    text("sidebarSub", "Metrics updated every 5 seconds.");
    text("updatedAt", "Updated " + clock(data.measuredAt));
    text("accessSummary", data.access && data.access.rememberedSession ? "Saved browser session · sign out when finished on a shared device." : "Password-protected terminal.");
    var dot = document.getElementById("topDot");
    if (dot) dot.style.background = "#84d6a0";
    var sideDot = document.getElementById("sidebarDot");
    if (sideDot) sideDot.style.background = "#84d6a0";
    meter("cpuMeter", cpu);
    meter("heapMeter", heapRatio);
  }
  async function refresh() {
    try {
      var response = await fetch("/api/stats", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("Metrics unavailable");
      updateStats(await response.json());
    } catch (error) {
      text("topStatus", "Metrics unavailable");
      text("sidebarStatus", "Metrics unavailable");
      text("sidebarSub", "Reconnect to refresh.");
      text("updatedAt", "Metrics unavailable · retrying");
    }
  }
  refresh();
  window.setInterval(refresh, 5000);
})();