(function () {
  "use strict";
  var state = document.getElementById("state");
  var terminalNode = document.getElementById("terminal");
  if (!state || !terminalNode) return;
  var socket = null;
  var term = null;
  var fit = null;
  var disposed = false;
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
    status("Connecting", false);
    socket = new WebSocket(protocol + "//" + location.host + "/ws");
    socket.addEventListener("open", function () {
      status("Connected", true);
      fit.fit();
      socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      if (runButton) runButton.disabled = false;
    });
    socket.addEventListener("message", function (event) {
      try {
        var message = JSON.parse(event.data);
        if (message.type === "output") term.write(message.data);
        else if (message.type === "error") {
          term.writeln("\r\n" + message.message);
          status("Terminal error", false);
        }
      } catch (error) {}
    });
    socket.addEventListener("close", function () {
      status("Disconnected · refresh to reconnect", false);\n      if (runButton) runButton.disabled = true;
      if (term && !disposed) term.writeln("\r\n\x1b[90m[Connection closed]\x1b[0m");
    });
    socket.addEventListener("error", function () { status("Connection error", false); });
    var commandForm = document.getElementById("terminalCommandForm");
    var commandInput = document.getElementById("terminalCommand");
    var runButton = document.getElementById("terminalRunButton");
    var commandHistory = [];
    var historyIndex = 0;
    if (commandForm && commandInput) {
      commandForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var command = commandInput.value;
        if (!command.trim() || !socket || socket.readyState !== WebSocket.OPEN) {
          if (!socket || socket.readyState !== WebSocket.OPEN) status("Waiting for connection", false);
          return;
        }
        socket.send(JSON.stringify({ type: "input", data: command + "\\r" }));
        commandHistory.push(command);
        historyIndex = commandHistory.length;
        commandInput.value = "";
        if (runButton) runButton.disabled = true;
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
      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
      if (term) term.dispose();
    });
  } catch (error) {
    status("UI error: " + String(error && error.message || error).slice(0, 100), false);
  }
})();