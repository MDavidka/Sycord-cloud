import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

const configuredUrl = process.env.EXPO_PUBLIC_WEB_URL?.trim();
const startUrl = configuredUrl ? configuredUrl.replace(/\/$/, '') + '/dashboard?ui=mobile-ergonomics-3' : '';

export default function HomeScreen() {
  const webView = useRef<WebViewType<object> | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const handleBack = useCallback(() => {
    if (!canGoBack) return false;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    webView.current?.goBack();
    return true;
  }, [canGoBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [handleBack]);

  const onNavigationStateChange = (state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
    setLoading(state.loading);
  };

  const shouldLoad = (url: string) => {
    if (!startUrl) return false;
    try {
      const destination = new URL(url);
      const appOrigin = new URL(startUrl).origin;
      if (destination.origin === appOrigin) return true;
      void Linking.openURL(url);
    } catch {
      return false;
    }
    return false;
  };

  if (!startUrl) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.setup}>
          <Text style={styles.brand}>Airshell</Text>
          <Text style={styles.title}>Connect your workspace</Text>
          <Text style={styles.body}>Set EXPO_PUBLIC_WEB_URL to your deployed Airshell address, then restart Expo.</Text>
          <Text style={styles.code}>EXPO_PUBLIC_WEB_URL=https://your-airshell-domain</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <WebView<object>
        ref={webView}
        source={{ uri: startUrl }}
        style={styles.webView}
        originWhitelist={['https://*', 'http://*']}
        onShouldStartLoadWithRequest={({ url }) => shouldLoad(url)}
        onOpenWindow={({ nativeEvent }) => { void Linking.openURL(nativeEvent.targetUrl); }}
        onNavigationStateChange={onNavigationStateChange}
        onLoadStart={() => { setLoading(true); setFailed(false); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setFailed(true); }}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.statusCode >= 500) setFailed(true);
        }}
        injectedJavaScriptBeforeContentLoaded={`document.addEventListener('click', function(e) { if (e.target instanceof Element && e.target.closest('button:not(:disabled), a, [role="button"]:not([aria-disabled="true"])')) window.ReactNativeWebView.postMessage('haptic'); }, true); true;`}
        onMessage={({ nativeEvent }) => { if (nativeEvent.data === 'haptic') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}); }}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        thirdPartyCookiesEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        pullToRefreshEnabled={false}
        renderLoading={() => <ActivityIndicator color="#f2f2f4" />}
        startInLoadingState
      />
      {loading && (
        <View pointerEvents="none" style={styles.loading}>
          <ActivityIndicator color="#d8d8db" />
        </View>
      )}
      {failed && (
        <View style={styles.error}>
          <Text style={styles.title}>Can’t reach Airshell</Text>
          <Text style={styles.body}>Check your connection and try again.</Text>
          <Pressable style={styles.retry} onPress={() => webView.current?.reload()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#121212' },
  webView: { flex: 1, backgroundColor: '#121212' },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121212' },
  setup: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  error: { ...StyleSheet.absoluteFill, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: '#121212' },
  brand: { marginBottom: 28, color: '#f5f5f6', fontSize: 20, fontWeight: '600' },
  title: { color: '#f5f5f6', fontSize: 22, fontWeight: '600' },
  body: { marginTop: 10, color: '#aaa9ae', fontSize: 15, lineHeight: 22 },
  code: { marginTop: 18, color: '#d7d7da', fontSize: 13 },
  retry: { marginTop: 24, minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#eeeef0' },
  retryText: { color: '#151516', fontSize: 15, fontWeight: '600' },
});
