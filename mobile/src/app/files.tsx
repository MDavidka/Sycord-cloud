import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { FileEntry, request } from "../lib/api";
import { useWorkspace } from "../lib/workspace";
import { Body, Button, ErrorNotice, Field, Screen } from "../components/ui";
export default function Files() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useWorkspace();
  const [path, setPath] = useState(".");
  const [input, setInput] = useState(".");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [file, setFile] = useState<{
    path: string;
    content: string;
    truncated: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(
    async (next: string) => {
      const current = ++generation.current;
      setBusy(true);
      setError("");
      try {
        const data = await request<{ entries: FileEntry[]; path: string }>(
          `/api/servers/${encodeURIComponent(id)}/files?path=${encodeURIComponent(next)}`,
        );
        if (current !== generation.current) return;
        setEntries(data.entries);
        setPath(data.path);
        setInput(data.path);
        setFile(null);
      } catch (e) {
        if (current === generation.current) setError((e as Error).message);
      } finally {
        if (current === generation.current) setBusy(false);
      }
    },
    [id],
  );
  useEffect(() => {
    const tracker = generation;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load the remote directory on screen entry.
    void load(".");
    return () => {
      tracker.current++;
    };
  }, [load]);
  const open = async (entry: FileEntry) => {
    const next = path.replace(/\/$/, "") + "/" + entry.name;
    if (entry.type === "directory") {
      void load(next);
      return;
    }
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const result = await request<{
        path: string;
        content: string;
        truncated: boolean;
      }>(
        `/api/servers/${encodeURIComponent(id)}/file?path=${encodeURIComponent(next)}`,
      );
      if (current === generation.current) setFile(result);
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    } finally {
      if (current === generation.current) setBusy(false);
    }
  };
  return (
    <Screen title="Files" back={() => (file ? setFile(null) : router.back())}>
      <Field
        label="Directory path"
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={() => void load(input)}
      />
      <View style={{ gap: 8 }}>
        <Button
          label="Open directory"
          busy={busy}
          onPress={() => void load(input)}
          disabled={!input.trim()}
        />
        <Button
          label="Parent directory"
          secondary
          disabled={busy}
          onPress={() => void load(path + "/..")}
        />
      </View>
      <ErrorNotice message={error} />
      {file ? (
        <>
          <Body muted>{file.path}</Body>
          {file.truncated && <Body muted>Showing the first 128 KB.</Body>}
          <Text
            selectable
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              lineHeight: 21,
              color: colors.text,
            }}
          >
            {file.content || "(Empty file)"}
          </Text>
        </>
      ) : (
        <>
          {!entries.length && !busy && !error && (
            <Body muted>This directory is empty.</Body>
          )}
          {entries.map((entry) => (
            <Pressable
              key={entry.name}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void open(entry)}
              style={({ pressed }) => ({
                minHeight: 48,
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                backgroundColor: pressed ? colors.pressed : "transparent",
              })}
            >
              <Feather
                name={entry.type === "directory" ? "folder" : "file-text"}
                size={20}
                color={colors.secondary}
              />
              <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>
                {entry.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {entry.type === "file" ? `${entry.size} B` : ""}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}
