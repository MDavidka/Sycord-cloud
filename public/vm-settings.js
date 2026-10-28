(function () {
  "use strict";
  const panel = document.getElementById("serverSettingsPanel");
  if (!panel) return;
  const serverId = new URLSearchParams(location.search).get("server") || "";
  let server = null;
  let lastDetails = null;
  let reading = false;
  let refreshTimer = null;
  let feedbackTimer = null;
  const $ = id => document.getElementById(id);

  // All SVG sources are local, fixed icon paths. Data from a remote VM is only
  // ever placed in the page using textContent.
  const icons = {
    server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.9 9a7 7 0 0 1 12.3-1.8L20 12M4 12l1.8 4.8A7 7 0 0 0 18.1 15"/>',
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    cloud: '<path d="M20 16.6A4.6 4.6 0 0 0 18 8a6.5 6.5 0 0 0-12.5 2A4.5 4.5 0 0 0 7.5 19H19"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    network: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    pencil: '<path d="M12 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8"/><path d="M17.5 4.5a2.12 2.12 0 0 1 3 3L12 16l-4 1 1-4 8.5-8.5Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>'
  };
  function icon(name, extra) {
    return '<svg class="vm-icon' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';
  }
  function fieldRows(rows) {
    return '<dl class="vm-data-rows">' + rows.map(function (entry) {
      return '<div><dt>' + entry[0] + '</dt><dd' + (entry[2] ? ' class="vm-mono"' : '') +
        ' data-vm-field="' + entry[1] + '">—</dd></div>';
    }).join("") + '</dl>';
  }
  function settingRow(title, desc, iconName, content) {
    return '<details><summary>' + icon(iconName) +
      '<span class="vm-row-copy"><strong>' + title + '</strong><small>' + desc + '</small></span>' +
      icon('chevron', 'vm-chevron') + '</summary><div class="vm-expand-content">' + content + '</div></details>';
  }
  function metric(label, name) {
    return '<div class="vm-stat"><span class="vm-stat-label">' + label + '</span>' +
      '<strong class="vm-stat-value" id="vmMetric' + name + '">—</strong>' +
      '<span class="vm-stat-hint" id="vmMetricHint' + name + '">Not loaded</span>' +
      '<div class="vm-stat-track"><div class="vm-stat-fill" id="vmMetricFill' + name + '"></div></div></div>';
  }
  const systemRows = fieldRows([
    ['Hostname','hostname',true],['Operating system','operatingSystem'],
    ['Kernel','kernel',true],['Architecture','architecture'],
    ['CPU model','cpuModel'],['CPU cores','cpuCores'],['Timezone','timezone'],
    ['Uptime','uptime']
  ]);
  const providerRows = fieldRows([
    ['Hosting provider','providerName'],['Connection provider','connectionProvider'],
    ['Region','providerRegion'],['Plan','providerPlan']
  ]);
  const accessRows = fieldRows([
    ['Connection type','accessMode'],['Access status','supportStatus'],
    ['Expires','supportExpiry'],['Remaining','supportRemaining']
  ]);
  const connectionRows = fieldRows([
    ['Host / IP','host',true],['SSH port','port',true],['Username','username',true],
    ['Authentication','authentication'],['Date added','addedAt']
  ]);
  const preferences = '<label for="vmRefreshInterval">Metrics refresh interval</label>' +
    '<select class="vm-refresh-select" id="vmRefreshInterval">' +
    '<option value="5000">5 seconds</option><option value="15000" selected>15 seconds</option>' +
    '<option value="30000">30 seconds</option><option value="60000">60 seconds</option>' +
    '<option value="0">Manual only</option></select>' +
    '<p class="vm-note">Stored on this device. System diagnostics are read-only.</p>';
  panel.innerHTML = [
    '<div class="vm-settings-content">',
      '<div class="vm-settings-heading"><div><h1>Server settings</h1><p>Manage your machine and connections.</p></div>',
        '<button class="vm-icon-button" id="vmRefresh" type="button" aria-label="Refresh server information" title="Refresh server information">' + icon('refresh') + '</button></div>',
      '<p class="vm-feedback" id="vmFeedback" role="status" hidden></p>',
      '<div id="vmEmpty" class="vm-empty" hidden><p>Choose a saved server to view its settings and performance.</p>',
        '<button class="vm-soft-button" id="vmChooseServer" type="button">' + icon('server') + 'Choose server</button></div>',
      '<div id="vmSettingsBody">',
        '<nav class="vm-subnav" aria-label="Settings sections">',
          '<button type="button" data-vm-settings-section="overview" aria-current="page">Overview</button>',
          '<button type="button" data-vm-settings-section="system">System</button>',
          '<button type="button" data-vm-settings-section="access">Access</button>',
        '</nav>',
        '<div class="vm-settings-view" data-vm-settings-panel="overview">',
          '<h2 class="vm-label">PERFORMANCE</h2>',
          '<div class="vm-stats">' + metric('CPU','Cpu') + metric('Memory','Memory') + metric('Disk','Disk') + '</div>',
          '<div class="vm-secondary-stats">',
            '<span>Uptime <strong data-vm-field="uptime">—</strong></span>',
            '<span>Load <strong data-vm-field="load">—</strong></span>',
            '<span>Network ↓ <strong data-vm-field="networkRx">—</strong> ↑ <strong data-vm-field="networkTx">—</strong></span>',
          '</div>',
          '<p class="vm-updated" id="vmCheckedAt">Waiting for diagnostics</p>',
          '<div class="vm-divider"></div>',
          '<h2 class="vm-label">GENERAL</h2>',
          '<div class="vm-list">',
            settingRow('System information','OS, CPU, architecture, uptime','monitor',systemRows),
            settingRow('Provider','Hosting, region, instance details','cloud',
              providerRows + '<div class="vm-inline-actions"><button class="vm-text-button" id="vmEditProvider" type="button">Edit provider details</button></div>'),
            settingRow('Support access','Temporary connections and expiry','shield',accessRows),
            settingRow('Connection','SSH, authentication, port','network',connectionRows +
              '<div class="vm-inline-actions"><button class="vm-text-button" id="vmCopyHost" type="button">Copy SSH address</button></div>'),
            settingRow('Preferences','Monitoring and refresh settings','sliders',preferences),
          '</div>',
        '</div>',
        '<div class="vm-settings-view" data-vm-settings-panel="system" hidden>',
          '<h2 class="vm-section-heading">System information</h2>',
          '<p class="vm-section-help">Information reported by the connected Linux machine. Values may be unavailable on restricted hosts.</p>',
          systemRows,
          '<div class="vm-divider"></div><h2 class="vm-label">PERFORMANCE</h2>',
          fieldRows([
            ['CPU usage','cpuPercent'],['RAM usage','memoryBytes'],['Disk usage','diskBytes'],
            ['Load average','load'],['Network received','networkRx'],['Network sent','networkTx']
          ]),
        '</div>',
        '<div class="vm-settings-view" data-vm-settings-panel="access" hidden>',
          '<h2 class="vm-section-heading">Support access</h2>',
          '<p class="vm-section-help" id="vmSupportDescription">Support connections are managed separately from standard SSH servers.</p>',
          accessRows,
          '<div class="vm-inline-actions">',
            '<button class="vm-soft-button" id="vmConnectSupporter" type="button">' + icon('shield') + 'Connect Supporter VM</button>',
            '<button class="vm-soft-button vm-danger" id="vmRevokeSupport" type="button" hidden>Remove supporter connection</button>',
          '</div>',
          '<p class="vm-note" style="margin-top:15px">Removing a saved connection does not change the VM account password or SSH configuration.</p>',
        '</div>',
        '<div class="vm-footer-actions">',
          '<button class="vm-text-button" type="button" id="vmRename">' + icon('pencil') + ' Rename server</button>',
          '<button class="vm-text-button vm-danger" type="button" id="vmRemove">Disconnect server</button>',
        '</div>',
      '</div>',
    '</div>',
    '<dialog class="vm-dialog" id="vmProviderDialog" aria-labelledby="vmProviderDialogTitle">',
      '<form id="vmProviderForm"><h2 id="vmProviderDialogTitle">Provider information</h2>',
      '<p>Add the provider details you know. Airshell will not guess which company owns the server.</p>',
      '<label>Hosting provider<input id="vmProviderName" maxlength="80" placeholder="Optional" autocomplete="off"></label>',
      '<label>Region<input id="vmProviderRegion" maxlength="80" placeholder="Optional" autocomplete="off"></label>',
      '<label>Instance / plan<input id="vmProviderPlan" maxlength="80" placeholder="Optional" autocomplete="off"></label>',
      '<p class="vm-dialog-error" id="vmProviderError" role="alert" hidden></p>',
      '<div class="vm-dialog-actions"><button type="button" data-close-vm-dialog>Cancel</button><button type="submit">Save</button></div></form></dialog>',
    '<dialog class="vm-dialog" id="vmRenameDialog" aria-labelledby="vmRenameDialogTitle">',
      '<form id="vmRenameForm"><h2 id="vmRenameDialogTitle">Rename server</h2><p>Change the name shown in your Airshell workspace.</p>',
      '<label>Server name<input id="vmRenameInput" maxlength="48" required autocomplete="off"></label>',
      '<p class="vm-dialog-error" id="vmRenameError" role="alert" hidden></p>',
      '<div class="vm-dialog-actions"><button type="button" data-close-vm-dialog>Cancel</button><button type="submit">Save</button></div></form></dialog>',
    '<dialog class="vm-dialog" id="vmRemoveDialog" aria-labelledby="vmRemoveDialogTitle">',
      '<form id="vmRemoveForm"><h2 id="vmRemoveDialogTitle">Disconnect server?</h2>',
      '<p>Airshell will delete the saved connection and credentials. It will not delete the VM, change the remote SSH account, or reset its password.</p>',
      '<p class="vm-dialog-error" id="vmRemoveError" role="alert" hidden></p>',
      '<div class="vm-dialog-actions"><button type="button" data-close-vm-dialog>Cancel</button><button type="submit" class="vm-danger-button">Disconnect</button></div></form></dialog>'
  ].join("");

  function putField(field, value) {
    panel.querySelectorAll('[data-vm-field="' + field + '"]').forEach(function (node) {
      node.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
    });
  }
  function friendlyDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString([], { year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit" }) : "—";
  }
  function amount(value) {
    if (!Number.isFinite(value) || value < 0) return "—";
    if (value < 1024) return Math.round(value) + " B";
    const units = ["KiB","MiB","GiB","TiB"];
    let n = value, index = -1;
    do { n /= 1024; index += 1; } while (n >= 1024 && index < units.length - 1);
    return n.toFixed(n >= 10 ? 1 : 2).replace(/\.0+$/, "") + " " + units[index];
  }
  function uptime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "—";
    const minutes = Math.floor(seconds / 60);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor(minutes % 1440 / 60);
    const mins = minutes % 60;
    return days ? days + "d " + hours + "h" : hours ? hours + "h " + mins + "m" : mins + "m";
  }
  function pct(used, total) {
    return Number.isFinite(used) && Number.isFinite(total) && total > 0 ? Math.round(Math.min(100, Math.max(0, used / total * 100))) : null;
  }
  function progress(name, percentage, hint) {
    const value = $("vmMetric" + name), note = $("vmMetricHint" + name), bar = $("vmMetricFill" + name);
    if (value) value.textContent = percentage === null || percentage === undefined ? "—" : percentage + "%";
    if (note) note.textContent = hint || "Not available";
    if (bar) bar.style.width = Number.isFinite(percentage) ? Math.min(100,Math.max(0,percentage)) + "%" : "0";
  }
  function feedback(text) {
    const node = $("vmFeedback");
    if (!node) return;
    clearTimeout(feedbackTimer);
    node.textContent = text;
    node.hidden = false;
    feedbackTimer = setTimeout(function () { node.hidden = true; }, 5500);
  }
  function status(text, state) {
    if ($("vmStatusText")) $("vmStatusText").textContent = text;
    if ($("vmLiveStatus")) $("vmLiveStatus").dataset.status = state || "checking";
  }
  function renderServer() {
    if (!server) return;
    if ($("vmServerName")) $("vmServerName").textContent = server.name || "Saved server";
    if ($("vmServerSubtitle")) $("vmServerSubtitle").textContent = (server.provider === "instabox" ? "Instabox" : "SSH") + " · " +
      (server.connectionMode === "supporter" ? "Supporter VM" : "Linux server");
    putField("host", server.host);
    putField("port", server.port);
    putField("username", server.username);
    putField("addedAt", friendlyDate(server.addedAt));
    putField("authentication", server.provider === "instabox" ? "Instabox token" : server.authMethod === "password" ? "SSH password" : "SSH key");
    putField("connectionProvider", server.provider === "instabox" ? "Instabox" : "SSH");
    // Instabox uses a private connection token; a synthetic public username is not a usable SSH address.
    $("vmCopyHost").hidden = server.provider === "instabox";
    const info = server.providerInfo || {};
    putField("providerName", info.name || "Not identified");
    putField("providerRegion", info.region || "Not set");
    putField("providerPlan", info.plan || "Not set");
    const supporter = server.connectionMode === "supporter";
    const expiry = supporter ? new Date(server.expiresAt || "") : null;
    const expiresAt = supporter && Number.isFinite(expiry.getTime()) ? expiry.getTime() : null;
    const remaining = expiresAt === null ? null : Math.max(0, expiresAt - Date.now());
    putField("accessMode", supporter ? "Temporary supporter" : "Standard");
    putField("supportStatus", supporter ? remaining > 0 ? "Active" : "Expired" : "Not enabled");
    putField("supportExpiry", supporter ? friendlyDate(server.expiresAt) : "—");
    putField("supportRemaining", remaining === null ? "—" : remaining <= 0 ? "Expired" :
      Math.ceil(remaining / 86400000) + (Math.ceil(remaining / 86400000) === 1 ? " day" : " days"));
    $("vmSupportDescription").textContent = supporter ?
      "This is a time-limited Supporter VM connection. The saved credential is removed when access expires. Removing it here does not disable the remote account." :
      "This is a standard server connection. Connecting a Supporter VM creates a separate temporary connection using its SSH password.";
    $("vmConnectSupporter").hidden = supporter;
    $("vmRevokeSupport").hidden = !supporter;
    const name = $("workspaceServerName");
    if (name) name.textContent = server.name || "Saved server";
  }
  function renderDetails(data) {
    if (!data) return;
    const p = data.performance || {}, sys = data.system || {};
    const cpu = Number.isFinite(p.cpuPercent) ? p.cpuPercent : null;
    const mem = Number.isFinite(p.memoryPercent) ? p.memoryPercent : pct(p.memoryUsedBytes,p.memoryTotalBytes);
    const disk = Number.isFinite(p.diskPercent) ? p.diskPercent : pct(p.diskUsedBytes,p.diskTotalBytes);
    progress("Cpu",cpu,cpu === null ? "Sampling…" : "of total CPU");
    progress("Memory",mem,Number.isFinite(p.memoryTotalBytes) ? amount(p.memoryUsedBytes) + " / " + amount(p.memoryTotalBytes) : "Not available");
    progress("Disk",disk,Number.isFinite(p.diskTotalBytes) ? amount(p.diskUsedBytes) + " / " + amount(p.diskTotalBytes) : "Not available");
    putField("cpuPercent",cpu === null ? "Sampling…" : cpu + "%");
    putField("memoryBytes",Number.isFinite(p.memoryTotalBytes) ? amount(p.memoryUsedBytes) + " / " + amount(p.memoryTotalBytes) : "—");
    putField("diskBytes",Number.isFinite(p.diskTotalBytes) ? amount(p.diskUsedBytes) + " / " + amount(p.diskTotalBytes) : "—");
    putField("uptime",uptime(p.uptimeSeconds));
    const loads = [p.load1,p.load5,p.load15];
    putField("load",loads.every(Number.isFinite) ? loads.map(function (n) { return n.toFixed(2); }).join(" / ") : "—");
    putField("networkRx",Number.isFinite(p.networkRxBytesPerSec) ? amount(p.networkRxBytesPerSec) + "/s" : "—");
    putField("networkTx",Number.isFinite(p.networkTxBytesPerSec) ? amount(p.networkTxBytesPerSec) + "/s" : "—");
    ["hostname","operatingSystem","kernel","architecture","cpuModel","cpuCores","timezone"].forEach(function (key) {
      putField(key, sys[key]);
    });
    $("vmCheckedAt").textContent = "Last updated " + friendlyDate(data.checkedAt) +
      (cpu === null ? " · Calculating CPU usage from the next sample" : "");
  }
  async function request(url, options) {
    const response = await fetch(url, Object.assign({ credentials:"same-origin", cache:"no-store" },options||{}));
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      const error = new Error(data.error || "Request failed. Please try again.");
      error.data = data;
      throw error;
    }
    return data;
  }
  async function loadServer() {
    if (!serverId) return;
    try {
      const data = await request("/api/servers");
      server = (data.servers || []).find(function (item) { return item.id === serverId; }) || null;
      if (!server) { status("Unavailable","offline"); feedback("This server is no longer saved in your workspace."); }
      else renderServer();
    } catch (error) { feedback(error.message); }
  }
  async function loadDetails() {
    if (!serverId || reading) return;
    reading = true;
    const refresh = $("vmRefresh");
    if (refresh) refresh.disabled = true;
    try {
      const data = await request("/api/servers/" + encodeURIComponent(serverId) + "/details");
      if (data.server) { server = data.server; renderServer(); }
      lastDetails = data;
      renderDetails(data);
      status("Online","online");
    } catch (error) {
      if (error.data && error.data.server) { server = error.data.server; renderServer(); }
      status("Unreachable","offline");
      $("vmCheckedAt").textContent = lastDetails ?
        "Connection unavailable · Last successful reading " + friendlyDate(lastDetails.checkedAt) :
        "System diagnostics unavailable";
      feedback(error.message);
    } finally {
      reading = false;
      if (refresh) refresh.disabled = false;
    }
  }
  const validIntervals = [0,5000,15000,30000,60000];
  function intervalPreference() {
    let interval = 15000;
    try { interval = Number(localStorage.getItem("airshell-vm-refresh:" + serverId) || 15000); } catch (_) {}
    return validIntervals.includes(interval) ? interval : 15000;
  }
  function stopPolling() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
  }
  function startPolling() {
    stopPolling();
    if (!serverId || document.hidden || document.body.dataset.vmView !== "settings") return;
    if (!server) void loadServer();
    void loadDetails();
    const every = intervalPreference();
    $("vmRefreshInterval").value = String(every);
    if (every > 0) refreshTimer = setInterval(function () { void loadDetails(); },every);
  }
  function chooseSection(name) {
    panel.querySelectorAll("[data-vm-settings-section]").forEach(function (btn) {
      const selected = btn.dataset.vmSettingsSection === name;
      if (selected) btn.setAttribute("aria-current","page");
      else btn.removeAttribute("aria-current");
    });
    panel.querySelectorAll("[data-vm-settings-panel]").forEach(function (view) {
      view.hidden = view.dataset.vmSettingsPanel !== name;
    });
  }
  panel.querySelectorAll("[data-vm-settings-section]").forEach(function (button) {
    button.addEventListener("click",function () { chooseSection(button.dataset.vmSettingsSection); });
  });
  $("vmRefresh").addEventListener("click",function () { if (!serverId) feedback("Choose a server first."); else void loadDetails(); });
  $("vmRefreshInterval").value = String(intervalPreference());
  $("vmRefreshInterval").addEventListener("change",function () {
    const value = Number(this.value);
    if (!validIntervals.includes(value)) return;
    try { localStorage.setItem("airshell-vm-refresh:" + serverId,String(value)); } catch (_) {}
    startPolling();
  });
  $("vmChooseServer").addEventListener("click",function () { $("terminalServerPicker")?.click(); });
  $("vmConnectSupporter").addEventListener("click",function () {
    const mode = $("serverConnectionMode");
    if (!mode || !$("addServerButton")) return feedback("Open Servers in the sidebar to connect a Supporter VM.");
    mode.value = "supporter";
    mode.dispatchEvent(new Event("change",{bubbles:true}));
    $("addServerButton").click();
  });
  $("vmCopyHost").addEventListener("click",async function () {
    if (!server) return;
    const address = server.username + "@" + server.host + ":" + server.port;
    try { await navigator.clipboard.writeText(address); feedback("SSH address copied."); }
    catch (_) { feedback("Clipboard access is unavailable in this browser."); }
  });
  panel.querySelectorAll("[data-close-vm-dialog]").forEach(function (button) {
    button.addEventListener("click",function () { button.closest("dialog").close(); });
  });
  function dialogError(id,message) { const el = $(id); el.textContent = message || ""; el.hidden = !message; }
  $("vmEditProvider").addEventListener("click",function () {
    if (!server) return;
    const info = server.providerInfo || {};
    $("vmProviderName").value = info.name || "";
    $("vmProviderRegion").value = info.region || "";
    $("vmProviderPlan").value = info.plan || "";
    dialogError("vmProviderError","");
    $("vmProviderDialog").showModal();
  });
  $("vmProviderForm").addEventListener("submit",async function (event) {
    event.preventDefault();
    if (!server) return;
    const submit = this.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const data = await request("/api/servers/" + encodeURIComponent(serverId),{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({providerInfo:{name:$("vmProviderName").value,region:$("vmProviderRegion").value,plan:$("vmProviderPlan").value}})
      });
      server = data.server; renderServer(); $("vmProviderDialog").close(); feedback("Provider details saved.");
    } catch (error) { dialogError("vmProviderError",error.message); }
    finally { submit.disabled = false; }
  });
  $("vmRename").addEventListener("click",function () {
    if (!server) return;
    $("vmRenameInput").value = server.name || "";
    dialogError("vmRenameError","");
    $("vmRenameDialog").showModal();
  });
  $("vmRenameForm").addEventListener("submit",async function (event) {
    event.preventDefault();
    if (!server) return;
    const submit = this.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const data = await request("/api/servers/" + encodeURIComponent(serverId),{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:$("vmRenameInput").value})
      });
      server = data.server; renderServer(); $("vmRenameDialog").close(); feedback("Server renamed.");
    } catch (error) { dialogError("vmRenameError",error.message); }
    finally { submit.disabled = false; }
  });
  function confirmRemoval() {
    if (!server) return;
    dialogError("vmRemoveError","");
    $("vmRemoveDialog").showModal();
  }
  $("vmRemove").addEventListener("click",confirmRemoval);
  $("vmRevokeSupport").addEventListener("click",confirmRemoval);
  $("vmRemoveForm").addEventListener("submit",async function (event) {
    event.preventDefault();
    if (!server) return;
    const submit = this.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await request("/api/servers/" + encodeURIComponent(serverId),{method:"DELETE"});
      location.assign("/dashboard");
    } catch (error) { dialogError("vmRemoveError",error.message); submit.disabled = false; }
  });

  if (!serverId) {
    $("vmEmpty").hidden = false;
    $("vmSettingsBody").hidden = true;
    status("Local runtime","checking");
    $("vmRefresh").disabled = true;
  }
  window.addEventListener("airshell:vm-settings-open",startPolling);
  window.addEventListener("airshell:vm-settings-close",stopPolling);
  document.addEventListener("visibilitychange",function () {
    if (document.hidden) stopPolling();
    else if (document.body.dataset.vmView === "settings") startPolling();
  });
  window.addEventListener("beforeunload",stopPolling);
  if (document.body.dataset.vmView === "settings") startPolling();
})();