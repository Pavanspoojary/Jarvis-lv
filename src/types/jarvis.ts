export type JarvisStatus = "idle" | "listening" | "thinking" | "speaking" | "offline";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
