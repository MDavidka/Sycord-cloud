import Login from "../screens/Login";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WorkspaceProvider, useWorkspace } from "../lib/workspace";
function Navigation() {
  const { colors, isDark, auth } = useWorkspace();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {auth !== "ready" ? (
        <Login />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "none",
          }}
        />
      )}
    </>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WorkspaceProvider>
        <Navigation />
      </WorkspaceProvider>
    </SafeAreaProvider>
  );
}
