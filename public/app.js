(function () {
  "use strict";
  var sidebar = document.getElementById("sidebar");
  var menuToggle = document.getElementById("menuToggle");
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function () {
      var open = sidebar.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", function (event) {
      if (window.innerWidth <= 760 && sidebar.classList.contains("open") &&
          !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
        sidebar.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
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
    try { return new Date(value).toLocaleString(); } catch (error) { return String(value || "—"); }
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
    text("startedSub", "Runtime process start time");
    text("passwordGate", data.access && data.access.passwordProtected ? "Enabled" : "Not configured");
    text("sessionLength", Math.round((data.access && data.access.sessionTtlSeconds || 3600) / 60) + " minutes");
    text("topStatus", "Online");
    text("sidebarStatus", "Runtime online");
    text("updatedAt", "Last updated " + clock(data.measuredAt) + " · refresh every 5 sec");
    meter("cpuMeter", cpu);
    meter("heapMeter", heapRatio);
    var healthPill = document.getElementById("healthPill");
    if (healthPill) healthPill.innerHTML = '<span class="status-dot"></span>' + (cpu > 85 || heapRatio > 90 ? "High process usage" : "Healthy process");
  }
  async function refresh() {
    try {
      var response = await fetch("/api/stats", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("Metrics unavailable");
      updateStats(await response.json());
    } catch (error) {
      text("topStatus", "Metrics unavailable");
      text("sidebarStatus", "Metrics unavailable");
      text("updatedAt", "Could not retrieve runtime metrics. Refresh after reconnecting.");
    }
  }
  refresh();
  window.setInterval(refresh, 5000);
})();