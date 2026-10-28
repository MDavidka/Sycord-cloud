import Foundation

struct Profile: Codable {
    var displayName = "Airshell User"
    var email = ""
    var theme = "dark"
    var themeVersion: Int? = 3
    var avatarDataUrl = ""
    enum CodingKeys: String, CodingKey { case displayName, email, theme, themeVersion, avatarDataUrl }
    init() {}
    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        displayName = try values.decodeIfPresent(String.self, forKey: .displayName) ?? "Airshell User"
        email = try values.decodeIfPresent(String.self, forKey: .email) ?? ""
        theme = try values.decodeIfPresent(String.self, forKey: .theme) ?? "dark"
        themeVersion = try values.decodeIfPresent(Int.self, forKey: .themeVersion) ?? 3
        avatarDataUrl = try values.decodeIfPresent(String.self, forKey: .avatarDataUrl) ?? ""
    }
}

struct Server: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var host: String
    var port: Int
    var username: String
    var provider: String
    var authMethod: String?
    var connectionMode: String?
    var expiresAt: String?
    static func == (lhs: Server, rhs: Server) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    var supporterExpiryDate: Date? {
        guard connectionMode == "supporter", let expiresAt else { return nil }
        return ISO8601DateFormatter().date(from: expiresAt)
    }
}

struct ServerStatus: Codable {
    var status: String
    var metrics: Metrics?
    struct Metrics: Codable { var load1: Double; var memoryPercent: Double }
}

struct FileEntry: Codable, Identifiable {
    var name: String
    var type: String
    var size: Int
    var id: String { name }
}

struct ChatMessage: Codable, Identifiable {
    var id: String
    var role: String
    var content: String
    var state: String = "complete"
    var error: String? = nil
}

struct Conversation: Codable, Identifiable {
    var id = UUID().uuidString
    var title = "New chat"
    var messages: [ChatMessage] = []
    var draft = ""
}

struct ChatPacket: Decodable {
    var token: String?
    var status: String?
    var done: Bool?
    var error: String?
    var approval: Approval?
    struct Approval: Decodable { var id: String; var summary: String?; var tool: String? }
}

struct TerminalPacket: Decodable {
    var type: String
    var data: String?
    var message: String?
    var chunks: [TerminalChunk]?
    struct TerminalChunk: Decodable { var data: String; var seq: Int? }
}

struct SavedChats: Codable { var conversations: [Conversation]; var activeID: String }
