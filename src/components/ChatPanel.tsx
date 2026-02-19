import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  transcript: string;
}

export function ChatPanel({ messages, transcript }: ChatPanelProps) {
  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden rounded-lg">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue glow-pulse" />
        <h2 className="font-display text-xs tracking-[0.3em] text-muted-foreground">
          CONVERSATION LOG
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <span className="font-mono text-[10px] text-muted-foreground mb-1 tracking-wider">
                {msg.role === "user" ? "USER" : "JARVIS"}{" "}
                {msg.timestamp.toLocaleTimeString("en-US", { hour12: false })}
              </span>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted/50 text-foreground border border-neon-blue/10"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {transcript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-end"
          >
            <span className="font-mono text-[10px] text-neon-cyan mb-1 tracking-wider">
              TRANSCRIBING...
            </span>
            <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-secondary/50 text-secondary-foreground border border-neon-cyan/20 italic">
              {transcript}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
