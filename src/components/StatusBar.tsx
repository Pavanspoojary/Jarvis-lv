import { motion } from "framer-motion";
import type { JarvisStatus } from "@/types/jarvis";

interface StatusBarProps {
  status: JarvisStatus;
  cameraActive: boolean;
  faceDetected: boolean;
  handGesture: string | null;
  latency: number | null;
}

export function StatusBar({ status, cameraActive, faceDetected, handGesture, latency }: StatusBarProps) {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const statusLabel: Record<JarvisStatus, string> = {
    idle: "STANDBY",
    listening: "LISTENING",
    thinking: "PROCESSING",
    speaking: "RESPONDING",
    offline: "OFFLINE",
  };

  const statusColor: Record<JarvisStatus, string> = {
    idle: "bg-jarvis-online",
    listening: "bg-jarvis-listening",
    thinking: "bg-jarvis-warning",
    speaking: "bg-neon-cyan",
    offline: "bg-muted-foreground",
  };

  return (
    <div className="glass-panel px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <h1 className="font-display text-lg tracking-[0.4em] text-neon">JARVIS</h1>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <motion.div
            className={`w-2 h-2 rounded-full ${statusColor[status]}`}
            animate={{ opacity: status === "idle" ? [1, 0.3, 1] : 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="font-mono text-xs text-muted-foreground tracking-wider">{statusLabel[status]}</span>
        </div>
        {latency && (
          <>
            <div className="h-4 w-px bg-border" />
            <span className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">{latency}ms</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-6">
        {cameraActive && (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${faceDetected ? "bg-jarvis-tracking" : "bg-muted-foreground"}`} />
            <span className="font-mono text-xs text-muted-foreground">
              {faceDetected ? "TRACKING" : "NO TARGET"}
            </span>
          </div>
        )}
        {handGesture && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-jarvis-warning">✋ {handGesture.toUpperCase()}</span>
          </div>
        )}
        <div className="h-4 w-px bg-border" />
        <div className="font-mono text-xs text-muted-foreground">
          <span>{date}</span>
          <span className="mx-2 text-neon-blue/40">|</span>
          <span className="text-neon">{time}</span>
        </div>
      </div>
    </div>
  );
}
