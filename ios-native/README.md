# Sycord native iOS app (xtool)

SwiftUI app for the existing Sycord/Airshell Node.js backend. This project follows xtool's SwiftPM app layout so it can be built from Linux, Windows/WSL, or macOS after installing xtool and Apple's iOS SDK.

## App features

- Workspace URL setup and password sign-in with the backend's secure HTTP-only session cookies
- Native chat with streamed assistant responses, local conversation history, and approval prompts
- SSH/Instabox server management, connection status, remote file browser and text previews
- Profile, photo, and appearance settings
- Interactive WebSocket terminal with keyboard shortcuts

## Build on Linux with xtool

xtool needs the Swift 6.4 toolchain, usbmuxd for device access, and an iOS Swift SDK generated from Apple's Xcode `.xip`. Follow the [xtool Linux installation guide](https://xtool.sh/documentation/xtool/installation-linux/) to install Swift and xtool, authenticate with an Apple ID, and install the SDK. Apple credentials and the Xcode download are not included in this repository.

Then, from this directory:

```sh
xtool dev
```

Connect your iPhone over USB when xtool is ready to provision/install the app. The first run registers the device and creates development signing material. A simulator build is not provided by this Linux workflow; xtool deploys to a connected iPhone.

## Project layout

- `Package.swift` and `xtool.yml` define the SwiftPM iOS app.
- `Sources/Sycord/` is the xtool app source.
- `Sycord.xcodeproj/` is retained as an optional Xcode project for users with a Mac.

The app asks for the deployed workspace HTTPS address on first launch. It uses the existing `/login`, `/logout`, `/api/profile`, `/api/servers`, `/api/chat`, `/api/chat/approve`, server status/files routes, and `/ws` terminal endpoint.
