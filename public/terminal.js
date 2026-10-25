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
  function status(message, connected) {
    state.textContent = message;
    var dot = document.getElementById("terminalDot");
    if (dot) dot.style.background = connected ? "#84d6a0" : "#888";
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
    if (runButton) runButton.disabled = true;

    function connect() {
      if (disposed) return;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
      status(reconnectAttempt ? "Reconnecting…" : "Connecting", false);
      socket = new WebSocket(protocol + "//" + location.host + "/ws");
      var activeSocket = socket;
      activeSocket.addEventListener("message", function (event) {
        if (socket !== activeSocket || disposed) return;
        try {
          var message = JSON.parse(event.data);
          if (message.type === "output") term.write(message.data);
          else if (message.type === "error") {
            term.writeln("\r\n" + message.message);
            status("Terminal error", false);
          }
        } catch (error) {}
      });
      activeSocket.addEventListener("open", function () {
        if (disposed || socket !== activeSocket) { activeSocket.close(); return; }
        reconnectAttempt = 0;
        status("Connected", true);
        fit.fit();
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
      if (fit && term) {
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