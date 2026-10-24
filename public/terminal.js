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
      theme: { background: "#101010", foreground: "#ededed", cursor: "#ededed", selectionBackground: "#444444" }
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
      term.focus();
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
      status("Disconnected · refresh to reconnect", false);
      if (term && !disposed) term.writeln("\r\n\x1b[90m[Connection closed]\x1b[0m");
    });
    socket.addEventListener("error", function () { status("Connection error", false); });
    term.onData(function (data) {
      if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "input", data: data }));
    });
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