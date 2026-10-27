import { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { useWorkspace } from "../lib/workspace";
import { geometry, typography } from "../lib/theme";
export type IconName = ComponentProps<typeof Feather>["name"];
export function IconButton({
  name,
  label,
  onPress,
  disabled,
  filled = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  filled?: boolean;
}) {
  const { colors } = useWorkspace();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.icon,
        {
          backgroundColor: pressed
            ? colors.pressed
            : filled
              ? colors.surface
              : "transparent",
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Feather name={name} size={22} color={colors.icon} />
    </Pressable>
  );
}
export function Avatar({ onPress }: { onPress: () => void }) {
  const { profile, colors } = useWorkspace();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open account"
      onPress={onPress}
      style={({ pressed }) => [
        styles.icon,
        {
          borderRadius: 22,
          backgroundColor: pressed ? colors.pressed : colors.control,
        },
      ]}
    >
      {profile.avatarDataUrl ? (
        <Image
          source={{ uri: profile.avatarDataUrl }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
      ) : (
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}>
          {profile.displayName.trim().charAt(0).toUpperCase() || "A"}
        </Text>
      )}
    </Pressable>
  );
}
export function Header({
  title,
  left,
  right,
}: {
  title: string;
  left: ReactNode;
  right?: ReactNode;
}) {
  const { colors } = useWorkspace();
  return (
    <View style={styles.header}>
      <View style={{ width: 44 }}>{left}</View>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      <View style={{ width: 44 }}>{right}</View>
    </View>
  );
}
export function Screen({
  children,
  title,
  back,
  right,
  scroll = true,
}: {
  children: ReactNode;
  title: string;
  back: () => void;
  right?: ReactNode;
  scroll?: boolean;
}) {
  const { colors } = useWorkspace();
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[styles.column, { paddingHorizontal: width < 360 ? 16 : 20 }]}
        >
          <Header
            title={title}
            left={
              <IconButton name="chevron-left" label="Go back" onPress={back} />
            }
            right={right}
          />
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingVertical: 24,
                gap: 20,
                flexGrow: 1,
              }}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Body({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  const { colors } = useWorkspace();
  return (
    <Text
      selectable
      style={{
        fontSize: typography.body,
        lineHeight: typography.line,
        color: muted ? colors.secondary : colors.text,
      }}
    >
      {children}
    </Text>
  );
}
export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  const { colors } = useWorkspace();
  if (!message) return null;
  return (
    <View style={{ gap: 8, paddingVertical: 8 }}>
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}
      >
        {message}
      </Text>
      {retry && <Button label="Retry" onPress={retry} secondary />}
    </View>
  );
}
export function Button({
  label,
  onPress,
  disabled,
  busy,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
}) {
  const { colors } = useWorkspace();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed
          ? colors.pressed
          : secondary
            ? colors.surface
            : colors.text,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator
          color={secondary ? colors.text : colors.background}
        />
      ) : (
        <Text
          style={{
            color: secondary ? colors.text : colors.background,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  ...props
}: ComponentProps<typeof TextInput> & { label: string }) {
  const { colors } = useWorkspace();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.secondary, fontSize: 14 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          {
            minHeight: 48,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.surface,
            fontSize: 16,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export const styles = StyleSheet.create({
  column: {
    flex: 1,
    width: "100%",
    maxWidth: geometry.column,
    alignSelf: "center",
  },
  header: {
    minHeight: geometry.header,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
