(function () {
  "use strict";
  function text(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }
  async function load() {
    try {
      var response = await fetch("/api/stats", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("Could not load access settings");
      var data = await response.json();
      var access = data.access || {};
      text("passwordGate", access.passwordProtected ? "Enabled" : "Not configured");
      text("passwordPill", access.passwordProtected ? "Protected" : "Check settings");
      text("rememberedSession", access.rememberedSession ? "Remembered" : "Session only");
      text("cookieProtection", access.secureCookie ? "Secure" : "Check settings");
      text("socketProtection", access.webSocketProtected ? "Authenticated" : "Check settings");
      text("accessNote", access.rememberedSession ? "Your session token survives app restarts. It is cleared when you sign out; changing the password or session secret invalidates remembered sessions." : "Session protection is configured, but persistence is not enabled.");
      text("accessSidebarStatus", access.passwordProtected ? "Protected" : "Needs configuration");
      var dot = document.getElementById("passwordDot");
      if (dot) dot.style.background = access.passwordProtected ? "#84d6a0" : "#e8c17b";
    } catch (error) {
      text("passwordGate", "Unavailable");
      text("passwordPill", "Unavailable");
      text("rememberedSession", "Unavailable");
      text("cookieProtection", "Unavailable");
      text("socketProtection", "Unavailable");
      text("accessNote", "Could not load current settings. Refresh this page to retry.");
      text("accessSidebarStatus", "Settings unavailable");
    }
  }
  load();
})();