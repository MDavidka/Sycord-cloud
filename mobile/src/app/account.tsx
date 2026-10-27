import { useState } from "react";
import { Image, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useWorkspace } from "../lib/workspace";
import { Body, Button, ErrorNotice, Field, Screen } from "../components/ui";
export default function Account() {
  const w = useWorkspace();
  const [form, setForm] = useState(w.profile);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  };
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const data = `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64 || ""}`;
    if (
      !asset.base64 ||
      data.length > 700000 ||
      !/^data:image\/(png|jpeg|webp);/.test(data)
    )
      throw new Error("Choose a PNG, JPEG or WebP image under 500 KB.");
    setForm({ ...form, avatarDataUrl: data });
  };
  return (
    <Screen title="Account" back={() => router.back()}>
      <Body>Your profile</Body>
      {form.avatarDataUrl ? (
        <Image
          source={{ uri: form.avatarDataUrl }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            alignSelf: "center",
          }}
        />
      ) : null}
      <View style={{ gap: 8 }}>
        <Button
          label="Change profile photo"
          onPress={() => void act(pick)}
          secondary
          disabled={busy}
        />
        {!!form.avatarDataUrl && (
          <Button
            label="Remove photo"
            onPress={() => setForm({ ...form, avatarDataUrl: "" })}
            secondary
            disabled={busy}
          />
        )}
      </View>
      <Field
        label="Display name"
        value={form.displayName}
        onChangeText={(displayName) => setForm({ ...form, displayName })}
        maxLength={80}
      />
      <Field
        label="Email"
        value={form.email}
        onChangeText={(email) => setForm({ ...form, email })}
        autoCapitalize="none"
        keyboardType="email-address"
        maxLength={160}
      />
      <Body>Appearance</Body>
      <View style={{ gap: 8 }}>
        {(["dark", "light", "system"] as const).map((theme) => (
          <Button
            key={theme}
            label={`${theme.charAt(0).toUpperCase() + theme.slice(1)}${form.theme === theme ? " · Selected" : ""}`}
            secondary={form.theme !== theme}
            onPress={() => setForm({ ...form, theme })}
          />
        ))}
      </View>
      <ErrorNotice message={error} />
      <Button
        label="Save changes"
        busy={busy}
        onPress={() =>
          void act(async () => {
            await w.saveProfile(form);
            router.back();
          })
        }
      />
      <Button
        label="Sign out"
        disabled={busy}
        secondary
        onPress={() =>
          void act(async () => {
            await w.signOut();
            router.replace("/");
          })
        }
      />
    </Screen>
  );
}
