export type Role = "user" | "assistant";
export type Message = {
  id: string;
  role: Role;
  content: string;
  state?: "pending" | "complete" | "failed";
  error?: string;
};
export type Packet = {
  token?: string;
  status?: string;
  done?: boolean;
  error?: string;
  approval?: { id: string; summary?: string; tool?: string };
};
/** Consumes complete SSE frames; leaves split frames buffered until the next chunk. */
export class EventParser {
  private buffer = "";
  constructor(private consume: (packet: Packet) => void) {}
  push(chunk: string, final = false) {
    this.buffer += chunk;
    const frames = this.buffer.split(/\r?\n\r?\n/);
    this.buffer = frames.pop() || "";
    if (final && this.buffer.trim()) {
      frames.push(this.buffer);
      this.buffer = "";
    }
    for (const frame of frames) {
      const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data || data === "[DONE]") continue;
      this.consume(JSON.parse(data) as Packet);
    }
  }
}
export function requestMessages(messages: Message[]) {
  const result = messages
    .filter(
      (m) => m.content.trim() && m.state !== "failed" && m.state !== "pending",
    )
    .slice(-12)
    .map(({ role, content }) => ({
      role,
      content:
        role === "assistant" ? content.trim().slice(0, 3000) : content.trim(),
    }));
  if (!result.length || result.at(-1)?.role !== "user")
    throw new Error("A question is required.");
  if (result.some((m) => m.content.length > 3000))
    throw new Error(
      "A message exceeds the server’s 3,000-character limit. Start a new chat to continue.",
    );
  return result;
}
