import SwiftUI
import Combine

@MainActor
final class TerminalModel: ObservableObject {
    @Published var output = "Connecting to terminal…\n"
    @Published var connected = false
    @Published var error: String?
    private var task: URLSessionWebSocketTask?
        private let api: APIClient
    private let serverID: String?
    init(api: APIClient, serverID: String?) { self.api = api; self.serverID = serverID }
    func connect() {
        do {
            let url = try api.websocketURL(serverID: serverID)
            var request = URLRequest(url: url)
            request.setValue(api.terminalCookieHeader(), forHTTPHeaderField: "Cookie")
            let socket = URLSession.shared.webSocketTask(with: request); task = socket; socket.resume()
            receive(); connected = true; output = ""
            send(["type": "resize", "cols": 100, "rows": 30])
        } catch { self.error = error.localizedDescription }
    }
    func disconnect() { task?.cancel(with: .goingAway, reason: nil); task = nil; connected = false }
    func sendInput(_ data: String) { send(["type": "input", "data": data]) }
    private func send(_ value: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: value), let text = String(data: data, encoding: .utf8) else { return }
        task?.send(.string(text)) { [weak self] error in if let error { Task { @MainActor in self?.error = error.localizedDescription } } }
    }
    private func receive() {
        task?.receive { [weak self] result in
            Task { @MainActor in
                guard let self else { return }
                switch result {
                case .failure(let error): self.connected = false; self.error = "Terminal connection lost: \(error.localizedDescription)"
                case .success(let message):
                    if case .string(let text) = message, let data = text.data(using: .utf8), let packet = try? JSONDecoder().decode(TerminalPacket.self, from: data) {
                        switch packet.type {
                        case "output": if let value = packet.data { self.output += value }
                        case "saved-log": self.output += packet.chunks?.map(\.data).joined() ?? ""
                        case "notice": self.output += "\n[\(packet.message ?? "Notice")]\n"
                        case "error": self.error = packet.message ?? "Terminal error"; self.connected = false
                        case "session-ended": self.output += "\n[Session ended]\n"; self.connected = false
                        default: break
                        }
                    }
                    self.receive()
                }
            }
        }
    }
}

struct TerminalView: View {
    let server: Server?
    @StateObject private var model: TerminalModel
    @State private var input = ""
    @FocusState private var focused: Bool
    init(server: Server?) { self.server = server; _model = StateObject(wrappedValue: TerminalModel(api: APIClient.shared, serverID: server?.id)) }
    var body: some View {
        VStack(spacing: 0) {
            HStack { Circle().fill(model.connected ? .green : .orange).frame(width: 8, height: 8); Text(model.connected ? "Connected" : "Disconnected").font(.caption).foregroundStyle(.secondary); Spacer(); Button("Reconnect") { model.disconnect(); model.connect() } }.padding(.horizontal).padding(.vertical, 8)
            ScrollViewReader { proxy in ScrollView { Text(model.output.isEmpty ? " " : model.output).font(.system(size: 13, design: .monospaced)).foregroundStyle(.primary).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading).id("end").padding(12) }.background(Color.black.opacity(0.94)).onChange(of: model.output) { _ in proxy.scrollTo("end", anchor: .bottom) } }
            if let error = model.error { Text(error).font(.footnote).foregroundStyle(.red).padding(.horizontal) }
            HStack(spacing: 8) {
                TextField("Type a command…", text: $input).font(.system(.body, design: .monospaced)).textInputAutocapitalization(.never).autocorrectionDisabled().focused($focused).submitLabel(.send).onSubmit { sendInput() }.padding(10).background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
                Button { sendInput() } label: { Image(systemName: "arrow.up.circle.fill").font(.system(size: 30)) }.disabled(input.isEmpty || !model.connected)
            }.padding()
        }
        .navigationTitle(server?.name ?? "Local terminal").navigationBarTitleDisplayMode(.inline)
        .background(Color(uiColor: .systemBackground))
        .onAppear { model.connect() }.onDisappear { model.disconnect() }
        .toolbar { ToolbarItemGroup(placement: .keyboard) { ForEach(["Tab", "Ctrl-C", "↑", "↓", "←", "→", "Esc"], id: \.self) { key in Button(key) { special(key) } }; Spacer(); Button("Hide") { focused = false } } }
    }
    private func sendInput() { guard !input.isEmpty else { return }; model.sendInput(input + "\r"); input = ""; focused = true }
    private func special(_ key: String) { let value: String; switch key { case "Tab": value = "\t"; case "Ctrl-C": value = "\u{03}"; case "↑": value = "\u{1B}[A"; case "↓": value = "\u{1B}[B"; case "→": value = "\u{1B}[C"; case "←": value = "\u{1B}[D"; default: value = "\u{1B}" }; model.sendInput(value) }
}
