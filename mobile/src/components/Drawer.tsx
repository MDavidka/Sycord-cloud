import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Header, IconButton, IconName } from "./ui";
import Feather from "@expo/vector-icons/Feather";
import { useWorkspace } from "../lib/workspace";
export default function Drawer({
  visible,
  close,
  busy,
}: {
  visible: boolean;
  close: () => void;
  busy: boolean;
}) {
  const w = useWorkspace();
  const row = (
    label: string,
    icon: IconName,
    action: () => void,
    disabled = false,
  ) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        close();
        action();
      }}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: pressed ? w.colors.pressed : "transparent",
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Feather name={icon} size={20} color={w.colors.secondary} />
      <Text
        numberOfLines={2}
        style={{ color: w.colors.text, fontSize: 16, flex: 1 }}
      >
        {label}
      </Text>
    </Pressable>
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          backgroundColor: w.colors.scrim,
        }}
      >
        <SafeAreaView
          accessibilityViewIsModal
          style={{
            width: "86%",
            maxWidth: 360,
            backgroundColor: w.colors.elevated,
            paddingHorizontal: 16,
          }}
        >
          <Header
            title="Airshell"
            left={<IconButton name="x" label="Close sidebar" onPress={close} />}
          />
          <ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 4 }}>
            {row("New chat", "edit", w.newChat, busy)}
            {row("Servers", "server", () => router.push("/servers"))}
            {row("Terminal", "terminal", () => router.push("/terminal"))}
            {row("Account", "user", () => router.push("/account"))}
            <Text
              style={{
                color: w.colors.muted,
                fontSize: 14,
                marginTop: 24,
                marginBottom: 8,
                paddingHorizontal: 12,
              }}
            >
              Chats on this device
            </Text>
            {w.conversations
              .filter((c) => c.messages.length || c.draft)
              .slice()
              .reverse()
              .map((c) =>
                row(c.title, "message-square", () => w.setActiveId(c.id), busy),
              )}
            {!w.conversations.some((c) => c.messages.length || c.draft) && (
              <Text style={{ color: w.colors.muted, padding: 12 }}>
                No recent conversations
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
        <Pressable
          accessibilityLabel="Dismiss sidebar"
          accessibilityRole="button"
          onPress={close}
          style={{ flex: 1 }}
        />
      </View>
    </Modal>
  );
}
