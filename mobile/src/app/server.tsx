import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { request, ServerStatus } from "../lib/api";
import { useWorkspace } from "../lib/workspace";
import { Body, Button, ErrorNotice, Screen } from "../components/ui";
export default function ServerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = useWorkspace();
  const server = w.servers.find((s) => s.id === id);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setStatus(
        await request<ServerStatus>(
          `/api/servers/${encodeURIComponent(id)}/status`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize this screen with remote server status.
    void refresh();
  }, [refresh]);
  const remove = () =>
    Alert.alert(
      "Remove server?",
      `Remove ${server?.name || "this server"} from Airshell? This does not delete the remote machine.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            void request(`/api/servers/${encodeURIComponent(id)}`, {
              method: "DELETE",
            })
              .then(() => w.refreshServers())
              .then(() => router.back())
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  return (
    <Screen title={server?.name || "Server"} back={() => router.back()}>
      {server && (
        <Body muted>
          {server.username}@{server.host}:{server.port}
        </Body>
      )}
      <Body>
        {status ? `Status: ${status.status}` : "Checking connection…"}
      </Body>
      {status?.metrics && (
        <>
          <Body>Load: {status.metrics.load1}</Body>
          <Body>Memory used: {status.metrics.memoryPercent}%</Body>
        </>
      )}
      <ErrorNotice message={error} />
      <Button
        label="Refresh status"
        busy={busy}
        secondary
        onPress={() => void refresh()}
      />
      <Button
        label="Open terminal"
        onPress={() => router.push({ pathname: "/terminal", params: { id } })}
      />
      <Button
        label="Browse files"
        secondary
        onPress={() => router.push({ pathname: "/files", params: { id } })}
      />
      <Button
        label="Remove server"
        disabled={busy}
        secondary
        onPress={remove}
      />
    </Screen>
  );
}
