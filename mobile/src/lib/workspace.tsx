import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { AppState, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ApiError,
  onUnauthorized,
  origin,
  Profile,
  request,
  Server,
} from "./api";
import { dark, light } from "./theme";
import { Message } from "./protocol";
export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  draft: string;
};
export const makeConversation = (): Conversation => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: "New chat",
  messages: [],
  draft: "",
});
const defaultProfile: Profile = {
  displayName: "Airshell User",
  email: "",
  avatarDataUrl: "",
  theme: "dark",
};
const storageKey = `airshell:native:v1:${origin}`;
function useWorkspaceState() {
  const system = useColorScheme();
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [auth, setAuth] = useState<"loading" | "signedOut" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [servers, setServers] = useState<Server[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([
    makeConversation(),
  ]);
  const [activeId, setActiveId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const conversationsRef = useRef(conversations);
  const activeIdRef = useRef(activeId);
  const writeQueue = useRef(Promise.resolve());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    conversationsRef.current = conversations;
    activeIdRef.current = activeId;
  }, [conversations, activeId]);
  const restore = useCallback(async () => {
    setAuth("loading");
    setError("");
    try {
      const data = await request<{ profile: Profile }>("/api/profile");
      setProfile(data.profile);
      setAuth("ready");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setAuth("signedOut");
      else {
        setError(e instanceof Error ? e.message : "Cannot connect.");
        setAuth("error");
      }
    }
  }, []);
  useEffect(() => {
    onUnauthorized(() => setAuth("signedOut"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the external cookie session at startup.
    void restore();
    return () => onUnauthorized();
  }, [restore]);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!active || !raw) return;
        const data = JSON.parse(raw) as {
          conversations: Conversation[];
          activeId: string;
        };
        if (
          !Array.isArray(data.conversations) ||
          !data.conversations.every(
            (c) =>
              typeof c.id === "string" &&
              typeof c.draft === "string" &&
              Array.isArray(c.messages) &&
              c.messages.every(
                (m) =>
                  typeof m.content === "string" &&
                  ["user", "assistant"].includes(m.role),
              ),
          )
        )
          throw new Error("Invalid saved history");
        if (data.conversations.length) {
          setConversations(
            data.conversations.map((c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.state === "pending"
                  ? {
                      ...m,
                      state: "failed",
                      error: "Response interrupted. Retry when ready.",
                    }
                  : m,
              ),
            })),
          );
          setActiveId(data.activeId);
        }
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Saved chats could not be loaded. Existing storage has not been overwritten.",
          );
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydrated || storageError) return;
    const flush = () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      writeQueue.current = writeQueue.current
        .then(() =>
          AsyncStorage.setItem(
            storageKey,
            JSON.stringify({
              conversations: conversationsRef.current,
              activeId: activeIdRef.current,
            }),
          ),
        )
        .catch(() =>
          setStorageError(
            "Chats could not be saved on this device. Keep the app open to retain this session.",
          ),
        );
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") flush();
    });
    return () => subscription.remove();
  }, [hydrated, storageError]);
  useEffect(() => {
    if (!hydrated || storageError) return;
    const timer = setTimeout(() => {
      writeQueue.current = writeQueue.current
        .then(() =>
          AsyncStorage.setItem(
            storageKey,
            JSON.stringify({ conversations, activeId }),
          ),
        )
        .catch(() =>
          setStorageError(
            "Chats could not be saved on this device. Keep the app open to retain this session.",
          ),
        );
    }, 200);
    flushTimer.current = timer;
    return () => {
      clearTimeout(timer);
      if (flushTimer.current === timer) flushTimer.current = null;
    };
  }, [conversations, activeId, hydrated, storageError]);
  const refreshServers = useCallback(async () => {
    const data = await request<{ servers: Server[] }>("/api/servers");
    setServers(data.servers);
  }, []);
  const conversation =
    conversations.find((c) => c.id === activeId) || conversations[0];
  const updateConversation = useCallback(
    (id: string, change: (c: Conversation) => Conversation) =>
      setConversations((all) => all.map((c) => (c.id === id ? change(c) : c))),
    [],
  );
  const newChat = () => {
    const next = makeConversation();
    setConversations((all) => [...all, next]);
    setActiveId(next.id);
  };
  const saveProfile = async (next: Profile) => {
    const data = await request<{ profile: Profile }>("/api/profile", {
      method: "PUT",
      body: next,
    });
    setProfile(data.profile);
  };
  const signOut = async () => {
    await request("/logout", { method: "POST" });
    setServers([]);
    setAuth("signedOut");
  };
  const isDark =
    profile.theme === "dark" ||
    (profile.theme === "system" && system !== "light");
  return {
    profile,
    setProfile,
    auth,
    setAuth,
    error,
    restore,
    servers,
    refreshServers,
    conversations,
    conversation,
    activeId,
    setActiveId,
    updateConversation,
    newChat,
    saveProfile,
    signOut,
    hydrated,
    storageError,
    colors: isDark ? dark : light,
    isDark,
  };
}
type Workspace = ReturnType<typeof useWorkspaceState>;
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspaceState();
  return <Context.Provider value={workspace}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("Workspace provider missing");
  return context;
}
