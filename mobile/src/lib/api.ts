import { EventParser, Message, Packet, requestMessages } from "./protocol";
export const origin = (process.env.EXPO_PUBLIC_WEB_URL || "")
  .trim()
  .replace(/\/$/, "");
export type Profile = {
  displayName: string;
  email: string;
  theme: "dark" | "light" | "system";
  themeVersion?: number;
  avatarDataUrl: string;
};
export type Server = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  provider: string;
};
export type ServerStatus = {
  status: string;
  metrics: { load1: number; memoryPercent: number } | null;
};
export type FileEntry = {
  name: string;
  type: "file" | "directory";
  size: number;
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
let unauthorized: (() => void) | undefined;
export function onUnauthorized(callback?: () => void) {
  unauthorized = callback;
}
function errorMessage(text: string, status: number) {
  try {
    return JSON.parse(text).error || `Request failed (${status}).`;
  } catch {
    return status === 401
      ? "Your session expired. Sign in to continue."
      : `Request failed (${status}). Please try again.`;
  }
}
// XMLHttpRequest uses the platform cookie store, including HttpOnly cookies. No password or cookie is copied into JS storage.
export function request<T>(
  path: string,
  options: { method?: string; body?: unknown; form?: string } = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!origin)
      return reject(new Error("The workspace address is not configured."));
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || "GET", origin + path);
    xhr.withCredentials = true;
    xhr.timeout = 30000;
    xhr.setRequestHeader("Accept", "application/json");
    if (options.form !== undefined)
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    else if (options.body !== undefined)
      xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        if (xhr.status === 401 && path !== "/login") unauthorized?.();
        reject(
          new ApiError(errorMessage(xhr.responseText, xhr.status), xhr.status),
        );
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as T);
      } catch {
        if (path === "/login" || path === "/logout") resolve(undefined as T);
        else reject(new Error("The server returned an unexpected response."));
      }
    };
    xhr.onerror = () =>
      reject(
        new Error("Cannot reach Airshell. Check your connection and retry."),
      );
    xhr.ontimeout = () =>
      reject(new Error("The request timed out. Please try again."));
    xhr.send(
      options.form ??
        (options.body === undefined ? null : JSON.stringify(options.body)),
    );
  });
}
export async function login(password: string) {
  await request("/login", {
    method: "POST",
    form: "password=" + encodeURIComponent(password),
  });
  return request<{ profile: Profile }>("/api/profile");
}
export function streamChat(
  messages: Message[],
  consume: (packet: Packet) => void,
) {
  const body = requestMessages(messages);
  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    let offset = 0,
      done = false,
      settled = false;
    const fail = (error: Error) => {
      if (!settled) {
        settled = true;
        reject(error);
        xhr.abort();
      }
    };
    const parser = new EventParser((packet) => {
      if (packet.error) throw new Error(packet.error);
      if (packet.done) done = true;
      consume(packet);
    });
    const read = (final = false) => {
      if (settled || xhr.status !== 200) return;
      try {
        const text = xhr.responseText;
        parser.push(text.slice(offset), final);
        offset = text.length;
      } catch (error) {
        fail(
          error instanceof Error ? error : new Error("Invalid chat response."),
        );
      }
    };
    xhr.open("POST", origin + "/api/chat");
    xhr.withCredentials = true;
    xhr.timeout = 180000;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "text/event-stream");
    xhr.onprogress = () => read();
    xhr.onload = () => {
      if (settled) return;
      if (xhr.status !== 200) {
        if (xhr.status === 401) unauthorized?.();
        fail(
          new ApiError(errorMessage(xhr.responseText, xhr.status), xhr.status),
        );
        return;
      }
      read(true);
      if (!settled) {
        if (!done)
          fail(
            new Error("The response was interrupted. Your messages are saved."),
          );
        else {
          settled = true;
          resolve();
        }
      }
    };
    xhr.onerror = () =>
      fail(new Error("Connection lost. Your messages are saved."));
    xhr.ontimeout = () =>
      fail(new Error("The response timed out. Your messages are saved."));
    xhr.onabort = () => {
      if (!settled) {
        settled = true;
        reject(new Error("The response was interrupted."));
      }
    };
    xhr.send(JSON.stringify({ messages: body }));
  });
  return { promise, abort: () => xhr.abort() };
}
