import Foundation
import Combine

@MainActor
final class APIClient: ObservableObject {
    @Published var baseURL: URL? { didSet { UserDefaults.standard.set(baseURL?.absoluteString, forKey: "workspaceURL") } }
    @Published var profile = Profile()
    @Published var servers: [Server] = []
    @Published var authenticated = false
    @Published var lastError: String?
    static let shared = APIClient()

    init() {
        if let raw = UserDefaults.standard.string(forKey: "workspaceURL") { baseURL = URL(string: raw) }
        configureCookies()
    }

    private func configureCookies() {
        HTTPCookieStorage.shared.cookieAcceptPolicy = .always
        URLSession.shared.configuration.httpCookieStorage?.cookieAcceptPolicy = .always
    }

    func setWorkspace(_ value: String) throws {
        guard let url = URL(string: value.trimmingCharacters(in: .whitespacesAndNewlines)),
              let scheme = url.scheme?.lowercased(), ["https", "http"].contains(scheme), url.host != nil else {
            throw APIError.message("Enter a valid workspace URL, such as https://your-workspace.example.com")
        }
        var normalized = url
        while normalized.path.hasSuffix("/") && normalized.path.count > 1 {
            normalized.deleteLastPathComponent()
        }
        baseURL = normalized
    }

    func request<T: Decodable>(_ path: String, method: String = "GET", body: Data? = nil, contentType: String = "application/json") async throws -> T {
        guard let baseURL else { throw APIError.message("Set your workspace address in Settings to continue.") }
        var request = URLRequest(url: endpoint(path, baseURL: baseURL))
        request.httpMethod = method
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body { request.httpBody = body; request.setValue(contentType, forHTTPHeaderField: "Content-Type") }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.message("Unexpected server response.") }
        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 && path != "/login" { authenticated = false }
            let decoded = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            throw APIError.message(decoded?["error"] as? String ?? (http.statusCode == 401 ? "Your session expired. Sign in again." : "Request failed (\(http.statusCode))."))
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    func login(password: String) async throws {
        var form = URLComponents()
        form.queryItems = [URLQueryItem(name: "password", value: password)]
        guard let formBody = form.percentEncodedQuery?.data(using: .utf8) else {
            throw APIError.message("Could not prepare the sign-in request.")
        }
        guard let baseURL else { throw APIError.message("Workspace address is not configured.") }
        var loginRequest = URLRequest(url: endpoint("/login", baseURL: baseURL))
        loginRequest.httpMethod = "POST"
        loginRequest.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        loginRequest.httpBody = formBody
        let (_, response) = try await URLSession.shared.data(for: loginRequest)
        guard let http = response as? HTTPURLResponse, (200..<400).contains(http.statusCode),
              HTTPCookieStorage.shared.cookies(for: baseURL)?.contains(where: { $0.name == "terminal_auth" }) == true else {
            throw APIError.message("Incorrect password or sign-in failed.")
        }
        try await refreshProfile()
        authenticated = true
    }

    func restore() async {
        do { try await refreshProfile(); authenticated = true; lastError = nil }
        catch let error as APIError { authenticated = false; if case .message(let message) = error, !message.contains("401") { lastError = message } }
        catch { lastError = error.localizedDescription }
    }

    func refreshProfile() async throws {
        struct Result: Decodable { var profile: Profile }
        profile = try await request("/api/profile").profile
    }

    func refreshServers() async throws {
        struct Result: Decodable { var servers: [Server] }
        servers = try await request("/api/servers").servers
    }

    func logout() async throws {
        guard let baseURL else { throw APIError.message("Workspace address is not configured.") }
        var logoutRequest = URLRequest(url: endpoint("/logout", baseURL: baseURL)); logoutRequest.httpMethod = "POST"
        _ = try await URLSession.shared.data(for: logoutRequest)
        HTTPCookieStorage.shared.cookies(for: baseURL)?.filter { $0.name == "terminal_auth" || $0.name == "terminal_workspace" }.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
        authenticated = false; servers = []
    }

    func saveProfile(_ value: Profile) async throws {
        let data = try JSONEncoder().encode(value)
        struct Result: Decodable { var profile: Profile }
        profile = try await request("/api/profile", method: "PUT", body: data).profile
    }

    func streamChat(messages: [ChatMessage], onPacket: @escaping @MainActor (ChatPacket) -> Void) async throws {
        let filtered = messages.filter { !$0.content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.state != "failed" && $0.state != "pending" }.suffix(12)
        let records = filtered.map { ["role": $0.role, "content": $0.role == "assistant" ? String($0.content.trimmingCharacters(in: .whitespacesAndNewlines).prefix(3000)) : $0.content.trimmingCharacters(in: .whitespacesAndNewlines)] }
        guard records.last?["role"] == "user" else { throw APIError.message("A question is required.") }
        guard records.allSatisfy({ ($0["content"]?.count ?? 0) <= 3000 }) else { throw APIError.message("A message exceeds the 3,000-character limit.") }
        let payload = try JSONSerialization.data(withJSONObject: ["messages": records])
        guard let baseURL else { throw APIError.message("Workspace address is not configured.") }
        var request = URLRequest(url: endpoint("/api/chat", baseURL: baseURL)); request.httpMethod = "POST"; request.timeoutInterval = 180
        request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.setValue("text/event-stream", forHTTPHeaderField: "Accept"); request.httpBody = payload
        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw APIError.message("Chat request failed. Sign in again if your session expired.") }
        var frame = "", answerEnded = false
        for try await line in bytes.lines {
            if line.isEmpty {
                if let dataLine = frame.split(separator: "\n").first(where: { $0.hasPrefix("data:") }) {
                    let raw = dataLine.dropFirst(5).trimmingCharacters(in: .whitespaces)
                    if raw != "[DONE]", let data = raw.data(using: .utf8) {
                        let packet = try JSONDecoder().decode(ChatPacket.self, from: data)
                        if let error = packet.error { throw APIError.message(error) }
                        if packet.done == true { answerEnded = true }
                        await onPacket(packet)
                    }
                }
                frame = ""
            } else if line.hasPrefix("data:") { frame += line + "\n" }
        }
        if !frame.isEmpty, let dataLine = frame.split(separator: "\n").first, let data = dataLine.dropFirst(5).trimmingCharacters(in: .whitespaces).data(using: .utf8) {
            let packet = try JSONDecoder().decode(ChatPacket.self, from: data); if packet.done == true { answerEnded = true }; await onPacket(packet)
        }
        guard answerEnded else { throw APIError.message("The response was interrupted. Your messages are saved.") }
    }

    func websocketURL(serverID: String?) throws -> URL {
        guard let baseURL, var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else { throw APIError.message("Set a workspace address first.") }
        components.scheme = components.scheme == "https" ? "wss" : "ws"; components.path = "/ws"
        components.queryItems = serverID.map { [URLQueryItem(name: "server", value: $0)] } ?? []
        guard let url = components.url else { throw APIError.message("Invalid terminal URL.") }; return url
    }

    func terminalCookieHeader() -> String? {
        guard let baseURL else { return nil }
        return HTTPCookieStorage.shared.cookies(for: baseURL)?.map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
    }
}

private func endpoint(_ path: String, baseURL: URL) -> URL {
    URL(string: String(path.drop(while: { $0 == "/" })), relativeTo: baseURL.appendingPathComponent(""))!.absoluteURL
}

enum APIError: Error, LocalizedError { case message(String); var errorDescription: String? { if case .message(let text) = self { return text }; return nil } }
