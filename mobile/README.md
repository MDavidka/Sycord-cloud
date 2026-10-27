# Airshell for iOS and Android

This Expo app hosts the existing Airshell site in a native WebView. It keeps the current sign-in, server management, terminal and file browser flows, including the existing secure session cookies.

## Run in Expo Go

1. Copy `.env.example` to `.env.local`.
2. Set `EXPO_PUBLIC_WEB_URL` to the HTTPS address where Airshell is deployed.
3. From this directory, run `npm install` and `npx expo start`.
4. Scan the QR code with Expo Go on your phone.

The app needs a reachable HTTPS site URL. `localhost` on a phone points to the phone itself, not this development machine. For a local server, use an HTTPS tunnel or a host address reachable from the phone.

Expo Go includes the WebView module. For store builds, configure the EAS project and submit with the Expo account that owns the app identifier `com.airshell.mobile`.
