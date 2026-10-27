import { useRef, useState } from "react";
import { Linking, View } from "react-native";
import { WebView } from "react-native-webview";
import { origin } from "../lib/api";
import { useWorkspace } from "../lib/workspace";
import { ErrorNotice } from "./ui";
const prepare = `(function(){var style=document.createElement('style');style.textContent='.home-topbar,.home-sidebar,.home-backdrop,.server-workspace-bar{display:none!important}.terminal-main{top:0!important;left:0!important;margin:0!important;padding-top:0!important}';document.head.appendChild(style);window.dispatchEvent(new Event('resize'));})();true;`;
export default function TerminalCanvas({ id }: { id?: string }) {
  const w = useWorkspace();
  const ref = useRef<WebView<object>>(null);
  const [error, setError] = useState("");
  return (
    <View style={{ flex: 1 }}>
      <ErrorNotice
        message={error}
        retry={() => {
          setError("");
          ref.current?.reload();
        }}
      />
      <WebView<object>
        ref={ref}
        source={{
          uri:
            origin +
            "/terminal" +
            (id ? "?server=" + encodeURIComponent(id) : ""),
        }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled={false}
        injectedJavaScript={prepare}
        style={{ flex: 1, backgroundColor: w.colors.background }}
        onShouldStartLoadWithRequest={({ url }) => {
          try {
            const target = new URL(url);
            if (target.origin !== new URL(origin).origin) {
              if (/^https?:$/.test(target.protocol)) void Linking.openURL(url);
              return false;
            }
            if (target.pathname === "/login" || target.pathname === "/") {
              w.setAuth("signedOut");
              return false;
            }
            return target.pathname === "/terminal";
          } catch {
            return false;
          }
        }}
        onError={() => setError("Terminal connection failed. Please retry.")}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.statusCode === 401) w.setAuth("signedOut");
          else if (nativeEvent.statusCode >= 400)
            setError("The terminal could not be loaded.");
        }}
      />
    </View>
  );
}
