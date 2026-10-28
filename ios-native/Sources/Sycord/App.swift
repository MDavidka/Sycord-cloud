import SwiftUI
import UIKit

@main
struct SycordApp: App {
    @StateObject private var api = APIClient.shared
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(api).preferredColorScheme(api.profile.theme == "light" ? .light : api.profile.theme == "dark" ? .dark : nil)
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var api: APIClient
    var body: some View {
        Group {
            if api.baseURL == nil { WorkspaceSetupView() }
            else if api.authenticated { HomeView() }
            else { LoginView() }
        }
        .task { if api.baseURL != nil { await api.restore() } }
        .tint(Color(red: 0.56, green: 0.68, blue: 1.0))
    }
}

struct WorkspaceSetupView: View {
    @EnvironmentObject private var api: APIClient
    @State private var url = ""
    @State private var error: String?
    var body: some View {
        Form {
            Section {
                Label("Sycord", systemImage: "terminal.fill").font(.largeTitle.bold())
                Text("Connect to your private workspace to manage servers, files, and terminals.").foregroundStyle(.secondary)
            }
            Section("Workspace") {
                TextField("https://workspace.example.com", text: $url).textInputAutocapitalization(.never).keyboardType(.URL).autocorrectionDisabled()
                if let error { Text(error).foregroundStyle(.red) }
                Button("Continue") {
                    do { try api.setWorkspace(url); error = nil }
                    catch { self.error = error.localizedDescription }
                }.disabled(url.isEmpty)
            }
            Section { Text("Use the HTTPS address where your Sycord server is deployed.").font(.footnote).foregroundStyle(.secondary) }
        }.scrollContentBackground(.hidden).background(Color(uiColor: .systemGroupedBackground))
    }
}

struct LoginView: View {
    @EnvironmentObject private var api: APIClient
    @State private var password = ""
    @State private var error: String?
    @State private var busy = false
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "terminal.fill").font(.system(size: 44)).foregroundStyle(.tint)
            VStack(spacing: 8) { Text("Welcome to Sycord").font(.largeTitle.bold()); Text("Sign in to your workspace").foregroundStyle(.secondary) }
            SecureField("Terminal password", text: $password).textContentType(.password).textInputAutocapitalization(.never).padding().background(.quaternary, in: RoundedRectangle(cornerRadius: 14))
            if let error { Text(error).font(.callout).foregroundStyle(.red).frame(maxWidth: .infinity, alignment: .leading) }
            Button { Task { await signIn() } } label: { Group { if busy { ProgressView().tint(.black) } else { Text("Sign in") } }.frame(maxWidth: .infinity).padding().background(Color.primary, in: Capsule()).foregroundStyle(Color(uiColor: .systemBackground)).fontWeight(.semibold) }.disabled(password.isEmpty || busy)
            Button("Change workspace") { api.baseURL = nil }
            if let status = api.lastError { Text(status).font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center) }
            Spacer()
        }.padding(24).frame(maxWidth: 520).frame(maxWidth: .infinity).background(Color(uiColor: .systemBackground))
    }
    private func signIn() async {
        busy = true; error = nil
        do { try await api.login(password: password); password = "" }
        catch { self.error = error.localizedDescription }
        busy = false
    }
}

struct HomeView: View {
    @EnvironmentObject private var api: APIClient
    @State private var tab = 0
    var body: some View {
        TabView(selection: $tab) {
            ChatView().tabItem { Label("Chat", systemImage: "bubble.left.and.bubble.right") }.tag(0)
            ServersView().tabItem { Label("Servers", systemImage: "server.rack") }.tag(1)
            AccountView().tabItem { Label("Account", systemImage: "person.crop.circle") }.tag(2)
        }
        .task { try? await api.refreshServers() }
    }
}

struct ChatView: View {
    @EnvironmentObject private var api: APIClient
    @AppStorage("sycord.chats") private var savedChats = ""
    @State private var conversations: [Conversation] = [Conversation()]
    @State private var activeID = ""
    @State private var busy = false
    @State private var status = ""
    @State private var notice: String?
    private var index: Int { conversations.firstIndex(where: { $0.id == activeID }) ?? 0 }
    private var messages: [ChatMessage] { conversations.isEmpty ? [] : conversations[index].messages }
    private var draftBinding: Binding<String> { Binding(get: { conversations.isEmpty ? "" : conversations[index].draft }, set: { update { $0.draft = $0 } }) }
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if !conversations.isEmpty {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(alignment: .leading, spacing: 18) {
                                ForEach(messages) { message in
                                    messageView(message).id(message.id)
                                }
                                if !status.isEmpty { HStack(spacing: 10) { ProgressView(); Text(status).foregroundStyle(.secondary) }.padding(.vertical, 6) }
                            }.padding()
                        }.onChange(of: messages.count) { _ in if let id = messages.last?.id { withAnimation { proxy.scrollTo(id, anchor: .bottom) } } }
                    }
                } else {
                    VStack(spacing: 8) {
                        Image(systemName: "bubble.left").font(.largeTitle).foregroundStyle(.secondary)
                        Text("No conversation").foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                if let notice { Text(notice).font(.footnote).foregroundStyle(.secondary).padding(.horizontal) }
                HStack(alignment: .bottom, spacing: 10) {
                    TextField("Ask about your servers…", text: draftBinding, axis: .vertical).lineLimit(1...5).padding(12).background(.quaternary, in: RoundedRectangle(cornerRadius: 20))
                    Button { Task { await send() } } label: {
                        Group {
                            if busy { ProgressView() }
                            else { Image(systemName: "arrow.up").fontWeight(.bold) }
                        }
                        .frame(width: 42, height: 42)
                        .background(Color.primary, in: Circle())
                        .foregroundStyle(Color(uiColor: .systemBackground))
                    }
                    .disabled(busy || draftBinding.wrappedValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }.padding(.horizontal).padding(.vertical, 8)
            }
            .navigationTitle("Sycord")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Menu { ForEach(conversations) { item in Button(item.title) { activeID = item.id } } } label: { Image(systemName: "sidebar.left") } }
                ToolbarItem(placement: .navigationBarTrailing) { Button { let c = Conversation(); conversations.append(c); activeID = c.id; persist() } label: { Image(systemName: "square.and.pencil") } }
            }
            .onAppear { restoreChats() }
        }
    }
    @ViewBuilder private func messageView(_ message: ChatMessage) -> some View {
        if message.role == "user" { Text(message.content).padding(.horizontal, 15).padding(.vertical, 11).background(.quaternary, in: RoundedRectangle(cornerRadius: 20)).frame(maxWidth: .infinity, alignment: .trailing) }
        else { VStack(alignment: .leading, spacing: 8) { Text(LocalizedStringKey(message.content)).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading); if let error = message.error { Text(error).foregroundStyle(.red); if !busy { Button("Retry") { Task { await retry() } } } } }.frame(maxWidth: .infinity, alignment: .leading) }
    }
    private func update(_ change: (inout Conversation) -> Void) { guard conversations.indices.contains(index) else { return }; change(&conversations[index]); persist() }
    private func persist() { guard let data = try? JSONEncoder().encode(SavedChats(conversations: conversations, activeID: activeID)) else { return }; savedChats = data.base64EncodedString() }
    private func restoreChats() { guard let data = Data(base64Encoded: savedChats), let saved = try? JSONDecoder().decode(SavedChats.self, from: data), !saved.conversations.isEmpty else { if activeID.isEmpty { activeID = conversations[0].id }; return }; conversations = saved.conversations; activeID = saved.activeID }
    private func send(retry: Bool = false) async {
        guard !busy, !conversations.isEmpty else { return }
        let question = conversations[index].draft.trimmingCharacters(in: .whitespacesAndNewlines)
        var base = conversations[index].messages
        if retry { if let last = base.lastIndex(where: { $0.role == "user" }) { base = Array(base.prefix(last + 1)) } }
        else { guard !question.isEmpty else { return }; base.append(ChatMessage(id: UUID().uuidString, role: "user", content: question)) }
        if base.last?.role != "user" { notice = "A question is required."; return }
        let reply = ChatMessage(id: UUID().uuidString, role: "assistant", content: "", state: "pending")
        busy = true; status = "Thinking…"; notice = nil
        update { c in c.title = c.messages.isEmpty ? String((base.last?.content ?? "New chat").prefix(64)) : c.title; c.draft = ""; c.messages = base + [reply] }
        do {
            try await api.streamChat(messages: base) { packet in
                if let value = packet.status { status = value }
                if let token = packet.token { update { c in if let i = c.messages.firstIndex(where: { $0.id == reply.id }) { c.messages[i].content += token } } }
                if let approval = packet.approval { Task { await approve(approval) } }
            }
            update { c in if let i = c.messages.firstIndex(where: { $0.id == reply.id }) { c.messages[i].state = "complete" } }
        } catch {
            update { c in if let i = c.messages.firstIndex(where: { $0.id == reply.id }) { c.messages[i].state = "failed"; c.messages[i].error = error.localizedDescription }; if c.draft.isEmpty { c.draft = base.last?.content ?? "" } }
        }
        busy = false; status = ""
    }
    private func retry() async { await send(retry: true) }
    private func approve(_ approval: ChatPacket.Approval) async {
        let title = approval.summary ?? approval.tool ?? "Allow this action?"
        let decision = await withCheckedContinuation { continuation in
            ApprovalPrompt.present(title: title) { continuation.resume(returning: $0) }
        }
        struct Body: Encodable { var id: String; var approved: Bool }
        struct Result: Decodable { var approved: Bool }
        do { let _ : Result = try await api.request("/api/chat/approve", method: "POST", body: JSONEncoder().encode(Body(id: approval.id, approved: decision))) }
        catch { notice = error.localizedDescription }
    }
}

@MainActor enum ApprovalPrompt {
    static func present(title: String, completion: @escaping (Bool) -> Void) {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene, let root = scene.windows.first?.rootViewController else { completion(false); return }
        let alert = UIAlertController(title: "Approve server change", message: title, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completion(false) })
        alert.addAction(UIAlertAction(title: "Approve", style: .default) { _ in completion(true) })
        root.present(alert, animated: true)
    }
}
