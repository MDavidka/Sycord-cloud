import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Markdown from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Feather from "@expo/vector-icons/Feather";
import { useWorkspace } from "../lib/workspace";
import { Message, requestMessages } from "../lib/protocol";
import { request, streamChat } from "../lib/api";
import {
  Avatar,
  ErrorNotice,
  Header,
  IconButton,
  styles,
} from "../components/ui";
import Drawer from "../components/Drawer";
const haptic = () =>
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
export default function Home() {
  const w = useWorkspace();
  const { colors, conversation } = w;
  const { width, fontScale } = useWindowDimensions();
  const [drawer, setDrawer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [inputHeight, setInputHeight] = useState(24);
  const updateInputHeight = (value: string) => {
    const available = Math.max(
      120,
      width - (width < 360 ? 32 : 40) - 20 - 6 - 44 - 8,
    );
    let lines = 0;
    for (const paragraph of value.split("\n")) {
      let lineWidth = 0;
      let paragraphLines = 1;
      for (const character of paragraph) {
        const wide = /[\u2E80-\u9FFF\uF900-\uFAFF]/.test(character);
        const glyphWidth =
          (wide
            ? 1
            : /[MW@#%]/.test(character)
              ? 0.85
              : /[il.,'!|]/.test(character)
                ? 0.32
                : 0.53) *
          16 *
          fontScale;
        if (lineWidth + glyphWidth > available && lineWidth > 0) {
          paragraphLines++;
          lineWidth = 0;
        }
        lineWidth += glyphWidth;
      }
      lines += paragraphLines;
    }
    setInputHeight(Math.max(24, Math.min(144, lines * 24 * fontScale)));
  };
  const [awayId, setAwayId] = useState<string | null>(null);
  const away = awayId === conversation.id;
  const setAway = (value: boolean) => setAwayId(value ? conversation.id : null);
  const list = useRef<FlatList<Message>>(null);
  const following = useRef(true);
  const lock = useRef(false);
  const abort = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.();
    };
  }, []);
  useEffect(() => {
    following.current = true;
  }, [conversation.id]);
  const update = w.updateConversation;
  const send = async (retry = false) => {
    if (lock.current) return;
    const text = conversation.draft.trim();
    if (!retry && !text) return;
    const base = retry
      ? conversation.messages.slice(
          0,
          conversation.messages.findLastIndex((m) => m.role === "user") + 1,
        )
      : [
          ...conversation.messages,
          {
            id: `u-${Date.now()}`,
            role: "user" as const,
            content: text,
            state: "complete" as const,
          },
        ];
    try {
      requestMessages(base);
    } catch (e) {
      setNotice((e as Error).message);
      return;
    }
    lock.current = true;
    setBusy(true);
    setNotice("");
    setStatus("Thinking…");
    following.current = true;
    setAway(false);
    haptic();
    const id = conversation.id;
    const replyId = `a-${Date.now()}`;
    const question = base.at(-1)?.content || text;
    update(id, (c) => ({
      ...c,
      title: c.messages.length ? c.title : question.slice(0, 64),
      draft: retry && c.draft !== question ? c.draft : "",
      messages: [
        ...base,
        { id: replyId, role: "assistant", content: "", state: "pending" },
      ],
    }));
    let answer = "";
    try {
      const stream = streamChat(base, (packet) => {
        if (packet.status && mounted.current) setStatus(packet.status);
        if (packet.token) {
          answer += packet.token;
          update(id, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === replyId ? { ...m, content: answer } : m,
            ),
          }));
        }
        if (packet.approval) {
          const approval = packet.approval;
          Alert.alert(
            "Approve server change",
            approval.summary || approval.tool || "Allow this action?",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () =>
                  void request("/api/chat/approve", {
                    method: "POST",
                    body: { id: approval.id, approved: false },
                  }).catch((e) => setNotice(e.message)),
              },
              {
                text: "Approve",
                onPress: () =>
                  void request("/api/chat/approve", {
                    method: "POST",
                    body: { id: approval.id, approved: true },
                  }).catch((e) => setNotice(e.message)),
              },
            ],
            { cancelable: false },
          );
        }
      });
      abort.current = stream.abort;
      await stream.promise;
      if (!answer.trim())
        throw new Error("The server returned an empty response.");
      update(id, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === replyId ? { ...m, state: "complete" } : m,
        ),
      }));
      haptic();
    } catch (e) {
      const error =
        e instanceof Error ? e.message : "Message could not be sent.";
      update(id, (c) => ({
        ...c,
        draft: c.draft || question,
        messages: c.messages.map((m) =>
          m.id === replyId ? { ...m, state: "failed", error } : m,
        ),
      }));
    } finally {
      lock.current = false;
      abort.current = null;
      if (mounted.current) {
        setBusy(false);
        setStatus("");
      }
    }
  };
  const copy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setNotice("Copied");
    } catch {
      setNotice("Could not copy this response.");
    }
  };
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[styles.column, { paddingHorizontal: width < 360 ? 16 : 20 }]}
        >
          <Header
            title="Airshell"
            left={
              <IconButton
                name="sidebar"
                label="Open sidebar"
                filled
                onPress={() => {
                  haptic();
                  setDrawer(true);
                }}
              />
            }
            right={<Avatar onPress={() => router.push("/account")} />}
          />
          <FlatList
            ref={list}
            key={conversation.id}
            style={{ flex: 1 }}
            data={conversation.messages}
            keyExtractor={(m) => m.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{
              paddingTop: 16,
              paddingBottom: 24,
              gap: 20,
            }}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } =
                e.nativeEvent;
              following.current =
                contentSize.height -
                  contentOffset.y -
                  layoutMeasurement.height <
                100;
              setAway(!following.current);
            }}
            scrollEventThrottle={100}
            onContentSizeChange={() => {
              if (following.current)
                list.current?.scrollToEnd({ animated: false });
            }}
            renderItem={({ item, index }) => (
              <View
                style={
                  item.role === "user"
                    ? {
                        alignSelf: "flex-end",
                        maxWidth: "80%",
                        backgroundColor: colors.control,
                        paddingHorizontal: 16,
                        paddingVertical: 11,
                        borderRadius: 22,
                      }
                    : { alignSelf: "stretch", gap: 8 }
                }
              >
                {item.role === "user" ? (
                  <Text
                    selectable
                    style={{ color: colors.text, fontSize: 17, lineHeight: 25 }}
                  >
                    {item.content}
                  </Text>
                ) : (
                  <>
                    {item.content ? (
                      <Markdown
                        style={{
                          body: {
                            color: colors.text,
                            fontSize: 17,
                            lineHeight: 25,
                          },
                          paragraph: { marginTop: 0, marginBottom: 12 },
                          code_inline: {
                            backgroundColor: colors.control,
                            color: colors.text,
                          },
                          fence: {
                            backgroundColor: colors.surface,
                            color: colors.text,
                            borderColor: colors.border,
                          },
                          code_block: {
                            backgroundColor: colors.surface,
                            color: colors.text,
                          },
                          link: { color: colors.accent },
                          blockquote: {
                            backgroundColor: colors.surface,
                            borderColor: colors.focus,
                          },
                          heading1: { fontSize: 24, lineHeight: 31 },
                          heading2: { fontSize: 21, lineHeight: 28 },
                        }}
                        onLinkPress={(url) => {
                          if (/^https?:\/\//i.test(url))
                            void Linking.openURL(url).catch(() =>
                              setNotice("Could not open this link."),
                            );
                          return false;
                        }}
                      >
                        {item.content}
                      </Markdown>
                    ) : item.state === "pending" ? (
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <ActivityIndicator color={colors.muted} />
                        <Text
                          accessibilityLiveRegion="polite"
                          style={{ color: colors.secondary, fontSize: 16 }}
                        >
                          {status}
                        </Text>
                      </View>
                    ) : null}
                    {item.state === "failed" && (
                      <ErrorNotice
                        message={item.error || "Response interrupted."}
                        retry={
                          !busy && index === conversation.messages.length - 1
                            ? () => void send(true)
                            : undefined
                        }
                      />
                    )}
                    {item.state === "complete" && (
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <IconButton
                          name="copy"
                          label="Copy response"
                          onPress={() => void copy(item.content)}
                        />
                        {index === conversation.messages.length - 1 && (
                          <IconButton
                            name="refresh-cw"
                            label="Regenerate response"
                            disabled={busy}
                            onPress={() => void send(true)}
                          />
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}
          />
          {away && (
            <View style={{ alignSelf: "center" }}>
              <IconButton
                name="arrow-down"
                label="Go to latest message"
                filled
                onPress={() => {
                  following.current = true;
                  setAway(false);
                  list.current?.scrollToEnd({ animated: false });
                }}
              />
            </View>
          )}
          {(notice || w.storageError) && (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: colors.secondary,
                fontSize: 14,
                paddingVertical: 8,
              }}
            >
              {notice || w.storageError}
            </Text>
          )}
          <View style={{ paddingBottom: 8, paddingTop: 8 }}>
            <View
              style={{
                minHeight: 60,
                flexDirection: "row",
                alignItems: "flex-end",
                paddingLeft: 20,
                paddingRight: 6,
                paddingVertical: 6,
                gap: 8,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: inputHeight > 32 ? 24 : 30,
                backgroundColor: colors.composer,
              }}
            >
              <TextInput
                accessibilityLabel="Your message"
                value={conversation.draft}
                onChangeText={(draft) => {
                  setNotice("");
                  updateInputHeight(draft);
                  update(conversation.id, (c) => ({ ...c, draft }));
                }}
                placeholder="Ask about this page"
                placeholderTextColor={colors.muted}
                multiline
                scrollEnabled={inputHeight >= 144}
                maxLength={3000}
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 32,
                  height: Math.max(32, Math.min(132, inputHeight)),
                  maxHeight: 132,
                  fontSize: 16 * fontScale,
                  lineHeight: 24 * fontScale,
                  color: colors.text,
                  paddingTop: 4,
                  paddingBottom: 4,
                  textAlignVertical: "center",
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  busy ? "Waiting for response" : "Send message"
                }
                accessibilityState={{
                  disabled: busy || !conversation.draft.trim(),
                  busy,
                }}
                disabled={busy || !conversation.draft.trim() || !w.hydrated}
                onPress={() => void send()}
                style={{
                  width: 44,
                  height: 46,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor:
                      conversation.draft.trim() && !busy
                        ? colors.text
                        : colors.control,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.secondary} />
                  ) : (
                    <Feather
                      name="arrow-up"
                      size={20}
                      color={
                        conversation.draft.trim()
                          ? colors.background
                          : colors.muted
                      }
                    />
                  )}
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Drawer visible={drawer} close={() => setDrawer(false)} busy={busy} />
    </SafeAreaView>
  );
}
