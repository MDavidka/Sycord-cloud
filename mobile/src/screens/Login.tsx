import { useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { login, origin } from "../lib/api";
import { useWorkspace } from "../lib/workspace";
import { Body, Button, ErrorNotice, Field } from "../components/ui";
export default function Login() {
  const w = useWorkspace();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy || !password.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await login(password);
      setPassword("");
      w.setProfile(data.profile);
      w.setAuth("ready");
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: w.colors.background }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          maxWidth: 480,
          width: "100%",
          alignSelf: "center",
          gap: 24,
        }}
      >
        <Body>Airshell</Body>
        {w.auth === "loading" ? (
          <ActivityIndicator
            accessibilityLabel="Restoring session"
            color={w.colors.text}
          />
        ) : !origin ? (
          <Body>The workspace address is not configured.</Body>
        ) : w.auth === "error" ? (
          <>
            <ErrorNotice message={w.error} />
            <Button label="Reconnect" onPress={() => void w.restore()} />
          </>
        ) : (
          <>
            <Body>Sign in to your workspace</Body>
            <Field
              label="Terminal password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />
            <ErrorNotice message={error} />
            <Button
              label="Sign in"
              onPress={() => void submit()}
              busy={busy}
              disabled={!password.trim()}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
