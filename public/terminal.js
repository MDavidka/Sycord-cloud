(function () {
  "use strict";
  var state = document.getElementById("state");
  var terminalNode = document.getElementById("terminal");
  if (!state || !terminalNode) return;
  var socket = null;
  var term = null;
  var fit = null;
  var disposed = false;
  var reconnectTimer = null;
  var reconnectAttempt = 0;
  var maxReconnectDelay = 15000;
  var lastOutputSeq = 0;
  var serverId = new URLSearchParams(location.search).get("server") || "";
  function status(message, connected) {
    state.textContent = message;
    var dot = document.getElementById("terminalDot");
    if (dot) dot.style.background = connected ? "#84d6a0" : "#888";
    // Only show a green header dot while the terminal session is actually active.
    var headerDot = document.getElementById("workspaceConnectionDot");
    var headerStatus = document.getElementById("workspaceConnectionLabel");
    if (headerDot) headerDot.classList.toggle("is-connected", Boolean(connected));
    if (headerStatus) {
      headerStatus.textContent = connected ? "Connected"
        : /reconnect|retry|lost/i.test(message) ? "Reconnecting"
        : /error|failed/i.test(message) ? "Error"
        : /ended/i.test(message) ? "Disconnected"
        : "Connecting";
    }
  }
  try {
    if (typeof Terminal === "undefined" || typeof FitAddon === "undefined") {
      status("Terminal libraries failed to load", false);
      return;
    }
    term = new Terminal({
      cursorBlink: true, convertEol: true, scrollback: 3000, fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      theme: { background: "#121212", foreground: "#d7d7da", cursor: "#e8e8eb", selectionBackground: "#343438", black: "#121212", brightBlack: "#77777e" }
    });
    fit = new FitAddon.FitAddon();
    term.loadAddon(fit);
    term.open(terminalNode);
    fit.fit();
    var protocol = location.protocol === "https:" ? "wss:" : "ws:";
    var commandForm = document.getElementById("terminalCommandForm");
    var commandInput = document.getElementById("terminalCommand");
    var runButton = document.getElementById("terminalRunButton");
    var commandHistory = [];
    var historyIndex = 0;
    var terminalTab = document.getElementById("terminalTab");
    var filesTab = document.getElementById("filesTab");
    var filesPanel = document.getElementById("serverFilesPanel");
    var settingsPanel = document.getElementById("serverSettingsPanel");
    var settingsButton = document.getElementById("terminalSettingsButton");
    var lastContentView = "terminal";
    var workspaceServerName = document.getElementById("workspaceServerName");
    var workspaceServerMeta = document.getElementById("workspaceServerMeta");
    var filesPathInput = document.getElementById("filesPath");
    var filesList = document.getElementById("filesList");
    var filesStatus = document.getElementById("filesStatus");
    var filesPreviewWrap = document.getElementById("filePreviewWrap");
    var filesPreview = document.getElementById("filePreview");
    var filesPreviewName = document.getElementById("filePreviewName");
    var currentRemotePath = ".";
    if (filesTab) filesTab.disabled = !serverId;

    function setWorkspaceTab(name) {
      var showSettings = name === "settings";
      var showFiles = !showSettings && name === "files" && Boolean(serverId);
      var showTerminal = !showSettings && !showFiles;
      var view = showSettings ? "settings" : showFiles ? "files" : "terminal";
      if (!showSettings) lastContentView = view;
      document.body.dataset.vmView = view;
      if (terminalTab) { terminalTab.classList.toggle("active", showTerminal); terminalTab.setAttribute("aria-selected", String(showTerminal)); }
      if (filesTab) { filesTab.classList.toggle("active", showFiles); filesTab.setAttribute("aria-selected", String(showFiles)); }
      if (settingsButton) { settingsButton.classList.toggle("active", showSettings); settingsButton.setAttribute("aria-pressed", String(showSettings)); }
      if (filesPanel) filesPanel.hidden = !showFiles;
      if (settingsPanel) settingsPanel.hidden = !showSettings;
      terminalNode.style.display = showTerminal ? "" : "none";
      var url = new URL(location.href);
      if (view === "terminal") url.searchParams.delete("view");
      else url.searchParams.set("view", view);
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
      window.dispatchEvent(new CustomEvent(showSettings ? "airshell:vm-settings-open" : "airshell:vm-settings-close", { detail: { serverId: serverId } }));
      if (showTerminal && fit && term) {
        window.requestAnimationFrame(function () {
          if (document.body.dataset.vmView !== "terminal") return;
          fit.fit();
          if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        });
      }
      if (showFiles && filesList && !filesList.dataset.loaded) loadRemoteFiles(currentRemotePath);
    }
    if (terminalTab) terminalTab.addEventListener("click", function () { setWorkspaceTab("terminal"); });
    if (filesTab) filesTab.addEventListener("click", function () { if (!filesTab.disabled) setWorkspaceTab("files"); });
    if (settingsButton) settingsButton.addEventListener("click", function () {
      setWorkspaceTab(document.body.dataset.vmView === "settings" ? lastContentView : "settings");
    });
    var initialView = new URLSearchParams(location.search).get("view");
    if (initialView === "settings") setWorkspaceTab("settings");
    else if (initialView === "files" && serverId) setWorkspaceTab("files");
    else document.body.dataset.vmView = "terminal";

    function formatBytes(bytes) {
      if (!Number.isFinite(bytes) || bytes < 0) return "";
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
    }
    function remoteChildPath(name) {
      if (currentRemotePath === ".") return name;
      if (currentRemotePath === "/") return "/" + name;
      return currentRemotePath.replace(/\/+$/, "") + "/" + name;
    }
    function parentRemotePath(value) {
      var clean = value.replace(/\/+$/, "");
      if (!clean || clean === "/") return "/";
      var index = clean.lastIndexOf("/");
      if (index < 0) return ".";
      if (index === 0) return "/";
      return clean.slice(0, index);
    }
    function renderRemoteEntries(entries) {
      if (!filesList) return;
      filesList.replaceChildren();
      filesList.dataset.loaded = "1";
      if (!entries.length) {
        var empty = document.createElement("div");
        empty.className = "server-files-empty";
        empty.textContent = "This directory is empty.";
        filesList.appendChild(empty);
        return;
      }
      entries.forEach(function (entry) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "server-file-row";
        button.setAttribute("role", "listitem");
        var icon = document.createElement("span");
        icon.className = "file-type-icon";
        icon.textContent = entry.type === "directory" ? "▰" : "▤";
        var name = document.createElement("span");
        name.className = "file-name";
        name.textContent = entry.name;
        var meta = document.createElement("span");
        meta.className = "file-meta";
        meta.textContent = entry.type === "directory" ? "Folder" : formatBytes(entry.size);
        button.append(icon, name, meta);
        button.addEventListener("click", function () {
          if (entry.type === "directory") loadRemoteFiles(remoteChildPath(entry.name));
          else loadRemoteFile(remoteChildPath(entry.name));
        });
        filesList.appendChild(button);
      });
    }
    async function loadRemoteFiles(pathValue) {
      if (!serverId || !filesList) return;
      currentRemotePath = pathValue || ".";
      if (filesPathInput) filesPathInput.value = currentRemotePath;
      if (filesStatus) filesStatus.textContent = "Loading directory…";
      if (filesList) { filesList.replaceChildren(); delete filesList.dataset.loaded; }
      if (filesPreviewWrap) filesPreviewWrap.hidden = true;
      try {
        var response = await fetch("/api/servers/" + encodeURIComponent(serverId) + "/files?path=" + encodeURIComponent(currentRemotePath), { credentials: "same-origin", cache: "no-store" });
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || "Could not load directory.");
        currentRemotePath = data.path || currentRemotePath;
        if (filesPathInput) filesPathInput.value = currentRemotePath;
        if (filesStatus) filesStatus.textContent = (data.entries || []).length + " items · " + currentRemotePath;
        renderRemoteEntries(Array.isArray(data.entries) ? data.entries : []);
      } catch (error) {
        if (filesStatus) filesStatus.textContent = error.message || "Could not load directory.";
        if (filesList) {
          filesList.replaceChildren();
          var retry = document.createElement("button");
          retry.type = "button"; retry.className = "server-file-row"; retry.textContent = "Retry directory listing";
          retry.addEventListener("click", function () { loadRemoteFiles(currentRemotePath); });
          filesList.appendChild(retry);
        }
      }
    }
    async function loadRemoteFile(filePath) {
      if (!serverId) return;
      if (filesStatus) filesStatus.textContent = "Opening file…";
      try {
        var response = await fetch("/api/servers/" + encodeURIComponent(serverId) + "/file?path=" + encodeURIComponent(filePath), { credentials: "same-origin", cache: "no-store" });
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || "Could not open file.");
        if (filesPreviewName) filesPreviewName.textContent = filePath + (data.truncated ? " · first 128 KB" : "");
        if (filesPreview) filesPreview.textContent = data.content || "";
        if (filesPreviewWrap) filesPreviewWrap.hidden = false;
        if (filesStatus) filesStatus.textContent = "Text preview · " + filePath;
      } catch (error) {
        if (filesStatus) filesStatus.textContent = error.message || "Could not open file.";
        if (filesPreviewWrap) filesPreviewWrap.hidden = true;
      }
    }
    var filesGo = document.getElementById("filesGo");
    var filesRefresh = document.getElementById("filesRefresh");
    var filesUp = document.getElementById("filesUp");
    var closeFilePreview = document.getElementById("closeFilePreview");
    if (filesGo) filesGo.addEventListener("click", function () { loadRemoteFiles(filesPathInput ? filesPathInput.value.trim() || "." : "."); });
    if (filesPathInput) filesPathInput.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); loadRemoteFiles(filesPathInput.value.trim() || "."); } });
    if (filesRefresh) filesRefresh.addEventListener("click", function () { loadRemoteFiles(currentRemotePath); });
    if (filesUp) filesUp.addEventListener("click", function () { loadRemoteFiles(parentRemotePath(currentRemotePath)); });
    if (closeFilePreview) closeFilePreview.addEventListener("click", function () { if (filesPreviewWrap) filesPreviewWrap.hidden = true; });

    async function loadWorkspaceIdentity() {
      if (!serverId) {
        if (workspaceServerName) workspaceServerName.textContent = "Local runtime";
        if (workspaceServerMeta) workspaceServerMeta.textContent = "Airshell host";
        return;
      }
      try {
        var response = await fetch("/api/servers", { credentials: "same-origin", cache: "no-store" });
        var data = await response.json().catch(function () { return {}; });
        var server = (data.servers || []).find(function (item) { return item.id === serverId; });
        if (!server) throw new Error("Saved server not found");
        if (workspaceServerName) workspaceServerName.textContent = server.name;
        if (workspaceServerMeta) {
          workspaceServerMeta.textContent = server.provider === "instabox" ? "Instabox" : "SSH";
          workspaceServerMeta.title = server.username + "@" + server.host + ":" + server.port;
        }
      } catch (_) {
        if (workspaceServerName) workspaceServerName.textContent = "Server unavailable";
        if (workspaceServerMeta) workspaceServerMeta.textContent = "Check Servers in the sidebar";
      }
    }
    loadWorkspaceIdentity();
    if (runButton) runButton.disabled = true;

    function connect() {
      if (disposed) return;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
      status(reconnectAttempt ? "Reconnecting…" : "Connecting", false);
      socket = new WebSocket(protocol + "//" + location.host + "/ws?since=" + lastOutputSeq + (serverId ? "&server=" + encodeURIComponent(serverId) : ""));
      var activeSocket = socket;
      activeSocket.addEventListener("message", function (event) {
        if (socket !== activeSocket || disposed) return;
        try {
          var message = JSON.parse(event.data);
          if (message.type === "session") {
            if (message.bufferReset) {
              term.clear();
              term.writeln("\x1b[90m[Reconnected. Earlier output was trimmed.]\x1b[0m\r\n");
            }
            if (message.resumed) status("Session resumed", true);
          } else if (message.type === "saved-log") {
            term.clear();
            (message.chunks || []).forEach(function (chunk) { if (chunk && typeof chunk.data === "string") term.write(chunk.data); });
            term.writeln("\r\n\x1b[90m[Restored saved terminal output]\x1b[0m");
          } else if (message.type === "output") {
            term.write(message.data);
            if (Number.isSafeInteger(message.seq)) lastOutputSeq = Math.max(lastOutputSeq, message.seq);
          } else if (message.type === "notice") {
            term.writeln("\r\n\x1b[90m[" + message.message + "]\x1b[0m");
          } else if (message.type === "session-ended") {
            term.writeln("\r\n\x1b[90m[Terminal process exited with code " + message.exitCode + ".]\x1b[0m");
            status("Session ended", false);
          } else if (message.type === "error") {
            term.writeln("\r\n" + message.message);
            status("Terminal error", false);
          }
        } catch (error) {}
      });
      activeSocket.addEventListener("open", function () {
        if (disposed || socket !== activeSocket) { activeSocket.close(); return; }
        reconnectAttempt = 0;
        status("Connected", true);
        if (document.body.dataset.vmView === "terminal") fit.fit();
        activeSocket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        if (runButton) runButton.disabled = false;
      });
      activeSocket.addEventListener("close", function () {
        if (socket !== activeSocket) return;
        if (runButton) runButton.disabled = true;
        if (disposed) return;
        status("Connection lost · reconnecting", false);
        term.writeln("\r\n\x1b[90m[Connection lost — reconnecting…]\x1b[0m");
        var delay = Math.min(1000 * Math.pow(2, reconnectAttempt), maxReconnectDelay);
        reconnectAttempt += 1;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, delay);
      });
      activeSocket.addEventListener("error", function () {
        if (socket === activeSocket) status("Connection error · retrying", false);
        try { activeSocket.close(); } catch (error) {}
      });
    }
    connect();
    function sendTerminalKey(data) {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        status("Waiting for connection", false);
        return;
      }
      socket.send(JSON.stringify({ type: "input", data: data }));
      if (commandInput) commandInput.focus({ preventScroll: true });
    }
    document.querySelectorAll("[data-terminal-key]").forEach(function (button) {
      button.addEventListener("click", function () {
        var encoded = button.getAttribute("data-terminal-key") || "";
        if (encoded === "enter") {
          var command = commandInput ? commandInput.value : "";
          if (command.trim()) {
            if (!socket || socket.readyState !== WebSocket.OPEN) { status("Waiting for connection", false); return; }
            socket.send(JSON.stringify({ type: "input", data: command + "\r" }));
            commandHistory.push(command);
            historyIndex = commandHistory.length;
            commandInput.value = "";
            if (runButton) runButton.classList.remove("ready");
          } else {
            sendTerminalKey("\r");
          }
          return;
        }
        var value = encoded.replace(/\\\\x([0-9a-f]{2})/gi, function (_, hex) {
          return String.fromCharCode(parseInt(hex, 16));
        });
        if (encoded === "\\\\t") value = "\t";
        if (encoded === "\\\\r") value = "\r";
        if (value) sendTerminalKey(value);
      });
    });
    if (commandForm && commandInput) {
      commandForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var command = commandInput.value;
        if (!command.trim() || !socket || socket.readyState !== WebSocket.OPEN) {
          if (!socket || socket.readyState !== WebSocket.OPEN) status("Waiting for connection", false);
          return;
        }
        socket.send(JSON.stringify({ type: "input", data: command + "\r" }));
        commandHistory.push(command);
        historyIndex = commandHistory.length;
        commandInput.value = "";
        if (runButton) runButton.classList.remove("ready");
      });
      commandInput.addEventListener("input", function () {
        if (runButton) runButton.classList.toggle("ready", commandInput.value.trim().length > 0);
      });
      commandInput.addEventListener("keydown", function (event) {
        if (event.key === "ArrowUp" && commandHistory.length) {
          event.preventDefault();
          historyIndex = Math.max(0, historyIndex - 1);
          commandInput.value = commandHistory[historyIndex] || "";
        } else if (event.key === "ArrowDown" && commandHistory.length) {
          event.preventDefault();
          historyIndex = Math.min(commandHistory.length, historyIndex + 1);
          commandInput.value = commandHistory[historyIndex] || "";
        }
      });
    }
    var clear = document.getElementById("clear");
    if (clear) clear.addEventListener("click", function () { term.clear(); term.focus(); });
    window.addEventListener("resize", function () {
      if (fit && term && document.body.dataset.vmView === "terminal") {
        fit.fit();
        if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    });
    window.addEventListener("beforeunload", function () {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
      if (term) term.dispose();
    });
  } catch (error) {
    status("UI error: " + String(error && error.message || error).slice(0, 100), false);
  }
})();
