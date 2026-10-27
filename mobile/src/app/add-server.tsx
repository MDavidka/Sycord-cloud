import { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { request } from "../lib/api";
import { useWorkspace } from "../lib/workspace";
import { Button, ErrorNotice, Field, Screen } from "../components/ui";
export default function AddServer() {
  const w = useWorkspace();
  const [form, setForm] = useState({
    provider: "ssh",
    name: "",
    host: "",
    username: "",
    port: "22",
    privateKey: "",
    command: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const change = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await request("/api/servers", { method: "POST", body: form });
      setForm((current) => ({ ...current, privateKey: "", command: "" }));
      await w.refreshServers();
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen title="Add server" back={() => router.back()}>
      <View style={{ gap: 8 }}>
        {["ssh", "instabox"].map((provider) => (
          <Button
            key={provider}
            label={provider === "ssh" ? "SSH server" : "Instabox"}
            secondary={form.provider !== provider}
            onPress={() => change("provider")(provider)}
            disabled={busy}
          />
        ))}
      </View>
      <Field
        label="Server name"
        value={form.name}
        onChangeText={change("name")}
        maxLength={48}
      />
      {form.provider === "instabox" ? (
        <Field
          label="Instabox SSH command"
          value={form.command}
          onChangeText={change("command")}
          autoCapitalize="none"
          autoCorrect={false}
        />
      ) : (
        <>
          <Field
            label="Hostname or IP"
            value={form.host}
            onChangeText={change("host")}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Username"
            value={form.username}
            onChangeText={change("username")}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Port"
            value={form.port}
            onChangeText={change("port")}
            keyboardType="number-pad"
          />
          <Field
            label="SSH private key"
            value={form.privateKey}
            onChangeText={change("privateKey")}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={{ minHeight: 144, textAlignVertical: "top" }}
          />
        </>
      )}
      <ErrorNotice message={error} />
      <Button
        label="Connect server"
        busy={busy}
        disabled={
          !form.name.trim() ||
          (form.provider === "instabox"
            ? !form.command.trim()
            : !form.host.trim() ||
              !form.username.trim() ||
              !form.privateKey.trim())
        }
        onPress={() => void save()}
      />
    </Screen>
  );
}
