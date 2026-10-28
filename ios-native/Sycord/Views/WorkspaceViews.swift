import SwiftUI
import PhotosUI
import UIKit

struct ServersView: View {
    @EnvironmentObject private var api: APIClient
    @State private var adding = false
    @State private var error: String?
    @State private var busy = false
    var body: some View {
        NavigationStack {
            List {
                if let error { Text(error).foregroundStyle(.red) }
                if api.servers.isEmpty { ContentUnavailableView("No servers connected", systemImage: "server.rack", description: Text("Add an SSH server or Instabox to get started.")) }
                ForEach(api.servers) { server in NavigationLink(value: server) { VStack(alignment: .leading, spacing: 5) { Text(server.name).font(.headline); Text("\(server.username)@\(server.host):\(server.port)").font(.subheadline).foregroundStyle(.secondary) } } }
            }
            .navigationTitle("Servers")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button { adding = true } label: { Image(systemName: "plus") } } }
            .navigationDestination(for: Server.self) { server in ServerDetailView(server: server) }
            .sheet(isPresented: $adding) { AddServerView() }
            .refreshable { await refresh() }
            .overlay { if busy { ProgressView() } }
            .task { await refresh() }
        }
    }
    private func refresh() async { busy = true; defer { busy = false }; do { try await api.refreshServers(); error = nil } catch { self.error = error.localizedDescription } }
}

struct AddServerView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    @State private var provider = "ssh"
    @State private var name = ""
    @State private var host = ""
    @State private var username = ""
    @State private var port = "22"
    @State private var privateKey = ""
    @State private var command = ""
    @State private var error: String?
    @State private var busy = false
    var body: some View {
        NavigationStack {
            Form {
                Picker("Provider", selection: $provider) { Text("SSH server").tag("ssh"); Text("Instabox").tag("instabox") }.pickerStyle(.segmented)
                Section("Connection") {
                    TextField("Server name", text: $name).textInputAutocapitalization(.words)
                    if provider == "instabox" { TextField("Instabox SSH command or token username", text: $command).textInputAutocapitalization(.never).autocorrectionDisabled() }
                    else {
                        TextField("Hostname or IP", text: $host).textInputAutocapitalization(.never).autocorrectionDisabled()
                        TextField("Username", text: $username).textInputAutocapitalization(.never).autocorrectionDisabled()
                        TextField("Port", text: $port).keyboardType(.numberPad)
                        SecureField("SSH private key", text: $privateKey, prompt: Text("Paste private key")).textInputAutocapitalization(.never).autocorrectionDisabled()
                    }
                }
                if let error { Text(error).foregroundStyle(.red) }
                Section { Text("The key is sent securely to your workspace and is never shown again.").font(.footnote).foregroundStyle(.secondary) }
            }
            .navigationTitle("Add server")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button(busy ? "Connecting…" : "Connect") { Task { await save() } }.disabled(busy || name.isEmpty) } }
        }
    }
    private func save() async {
        busy = true; error = nil; defer { busy = false }
        var payload: [String: String] = ["provider": provider, "name": name]
        if provider == "instabox" { payload["command"] = command }
        else { payload.merge(["host": host, "username": username, "port": port, "privateKey": privateKey]) { _, new in new } }
        do { let body = try JSONSerialization.data(withJSONObject: payload); let _: AddedServer = try await api.request("/api/servers", method: "POST", body: body); try await api.refreshServers(); dismiss() }
        catch { self.error = error.localizedDescription }
    }
    private struct AddedServer: Decodable { var server: Server }
}

struct ServerDetailView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let server: Server
    @State private var status: ServerStatus?
    @State private var error: String?
    @State private var terminal = false
    @State private var files = false
    @State private var confirmDelete = false
    @State private var busy = false
    var body: some View {
        List {
            Section("Connection") { LabeledContent("Host", value: "\(server.username)@\(server.host):\(server.port)"); LabeledContent("Status", value: status?.status.capitalized ?? "Checking…"); if let metrics = status?.metrics { LabeledContent("Load", value: String(format: "%.2f", metrics.load1)); LabeledContent("Memory used", value: "\(metrics.memoryPercent)%") } }
            if let error { Text(error).foregroundStyle(.red) }
            Section {
                Button { terminal = true } label: { Label("Open terminal", systemImage: "terminal") }
                Button { files = true } label: { Label("Browse files", systemImage: "folder") }
                Button("Refresh status") { Task { await refresh() } }
                Button("Remove server", role: .destructive) { confirmDelete = true }
            }
        }
        .navigationTitle(server.name).navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $terminal) { TerminalView(server: server) }
        .navigationDestination(isPresented: $files) { FilesView(server: server) }
        .confirmationDialog("Remove \(server.name)?", isPresented: $confirmDelete, titleVisibility: .visible) { Button("Remove server", role: .destructive) { Task { await remove() } } } message: { Text("This removes the saved connection, not the remote machine.") }
        .task { await refresh() }
    }
    private func refresh() async { busy = true; defer { busy = false }; do { status = try await api.request("/api/servers/\(server.id)/status"); error = nil } catch { self.error = error.localizedDescription } }
    private func remove() async { do { struct Result: Decodable { var deleted: Bool }; let _: Result = try await api.request("/api/servers/\(server.id)", method: "DELETE"); try await api.refreshServers(); dismiss() } catch { self.error = error.localizedDescription } }
}

struct FilesView: View {
    @EnvironmentObject private var api: APIClient
    let server: Server
    @State private var path = "."
    @State private var input = "."
    @State private var entries: [FileEntry] = []
    @State private var file: FilePreview?
    @State private var error: String?
    @State private var busy = false
    var body: some View {
        List {
            Section("Directory") { HStack { TextField("Path", text: $input).textInputAutocapitalization(.never).autocorrectionDisabled(); Button("Open") { Task { await load(input) } }.disabled(busy) }; Button("Parent directory") { Task { await load(path + "/..") } } }
            if let error { Text(error).foregroundStyle(.red) }
            if let file { Section(file.path) { if file.truncated { Text("Showing the first 128 KB.").font(.footnote).foregroundStyle(.secondary) }; Text(file.content.isEmpty ? "(Empty file)" : file.content).font(.system(.footnote, design: .monospaced)).textSelection(.enabled) } }
            else { Section(path) { ForEach(entries) { entry in Button { Task { await open(entry) } } label: { HStack { Image(systemName: entry.type == "directory" ? "folder" : "doc.text").foregroundStyle(.secondary); Text(entry.name).foregroundStyle(.primary); Spacer(); if entry.type == "file" { Text(ByteCountFormatter.string(fromByteCount: Int64(entry.size), countStyle: .file)).font(.caption).foregroundStyle(.secondary) } } } } } }
        }.navigationTitle("Files").navigationBarTitleDisplayMode(.inline).overlay { if busy { ProgressView() } }.task { await load(".") }
    }
    private func load(_ next: String) async {
        busy = true; error = nil; defer { busy = false }
        do { let result: Listing = try await api.request("/api/servers/\(server.id)/files?path=\(next.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ".")"); entries = result.entries; path = result.path; input = result.path; file = nil }
        catch { self.error = error.localizedDescription }
    }
    private func open(_ entry: FileEntry) async {
        if file != nil { file = nil; return }
        let next = path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/" + entry.name
        if entry.type == "directory" { await load(next); return }
        busy = true; error = nil; defer { busy = false }
        do { file = try await api.request("/api/servers/\(server.id)/file?path=\(next.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") }
        catch { self.error = error.localizedDescription }
    }
    private struct Listing: Decodable { var path: String; var entries: [FileEntry] }
}
private struct FilePreview: Decodable { var path: String; var content: String; var truncated: Bool }

struct AccountView: View {
    @EnvironmentObject private var api: APIClient
    @State private var profile = Profile()
    @State private var error: String?
    @State private var busy = false
    @State private var selectedPhoto: PhotosPickerItem?
    var body: some View {
        NavigationStack {
            Form {
                Section("Your profile") {
                    HStack { Spacer(); if let data = Data(base64Encoded: profile.avatarDataUrl.components(separatedBy: ",").last ?? ""), let image = UIImage(data: data) { Image(uiImage: image).resizable().scaledToFill().frame(width: 80, height: 80).clipShape(Circle()) } else { Image(systemName: "person.crop.circle.fill").font(.system(size: 68)).foregroundStyle(.secondary) }; Spacer() }
                    PhotosPicker("Change profile photo", selection: $selectedPhoto, matching: .images)
                    if !profile.avatarDataUrl.isEmpty { Button("Remove photo", role: .destructive) { profile.avatarDataUrl = "" } }
                    TextField("Display name", text: $profile.displayName).textInputAutocapitalization(.words)
                    TextField("Email", text: $profile.email).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                }
                Section("Appearance") { Picker("Theme", selection: $profile.theme) { Text("Dark").tag("dark"); Text("Light").tag("light"); Text("System").tag("system") } }
                if let error { Text(error).foregroundStyle(.red) }
                Section { Button(busy ? "Saving…" : "Save changes") { Task { await save() } }.disabled(busy); Button("Sign out", role: .destructive) { Task { try? await api.logout() } } }
                Section { Button("Change workspace") { api.baseURL = nil }.foregroundStyle(.secondary) }
            }
            .navigationTitle("Account")
            .onAppear { profile = api.profile }
            .onChange(of: selectedPhoto) { item in Task { await loadPhoto(item) } }
        }
    }
    private func loadPhoto(_ item: PhotosPickerItem?) async {
        guard let item, let data = try? await item.loadTransferable(type: Data.self), data.count <= 500_000 else { error = "Choose an image under 500 KB."; return }
        let mime = data.starts(with: [0x89,0x50,0x4e,0x47]) ? "image/png" : "image/jpeg"
        profile.avatarDataUrl = "data:\(mime);base64,\(data.base64EncodedString())"
    }
    private func save() async { busy = true; defer { busy = false }; do { try await api.saveProfile(profile); error = nil } catch { self.error = error.localizedDescription } }
}
