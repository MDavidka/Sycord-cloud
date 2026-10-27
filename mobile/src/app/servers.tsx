import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useWorkspace } from "../lib/workspace";
import {
  Body,
  Button,
  ErrorNotice,
  IconButton,
  Screen,
} from "../components/ui";
export default function Servers() {
  const w = useWorkspace();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refreshServers = w.refreshServers;
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await refreshServers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [refreshServers]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the remote request and its loading state on screen entry.
    void refresh();
  }, [refresh]); // Fetch on entering this screen; the shared registry updates after mutations.
  return (
    <Screen
      title="Servers"
      back={() => router.back()}
      right={
        <IconButton
          name="plus"
          label="Add server"
          onPress={() => router.push("/add-server")}
        />
      }
    >
      <ErrorNotice message={error} retry={() => void refresh()} />
      {!w.servers.length && !busy && !error && (
        <Body muted>
          No servers connected. Add your SSH server or Instabox to get started.
        </Body>
      )}
      {w.servers.map((server) => (
        <Pressable
          key={server.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${server.name}`}
          onPress={() =>
            router.push({ pathname: "/server", params: { id: server.id } })
          }
          style={({ pressed }) => ({
            paddingVertical: 16,
            paddingHorizontal: 12,
            borderRadius: 16,
            backgroundColor: pressed ? w.colors.pressed : w.colors.surface,
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
          })}
        >
          <Feather name="server" size={22} color={w.colors.secondary} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{ color: w.colors.text, fontSize: 17, fontWeight: "500" }}
            >
              {server.name}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: w.colors.secondary, fontSize: 14 }}
            >
              {server.username}@{server.host}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={w.colors.muted} />
        </Pressable>
      ))}
      <Button
        label="Refresh servers"
        busy={busy}
        secondary
        onPress={() => void refresh()}
      />
    </Screen>
  );
}
