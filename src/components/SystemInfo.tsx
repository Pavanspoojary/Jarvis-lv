import { motion } from "framer-motion";
import type { JarvisStatus } from "@/types/jarvis";

interface SystemInfoProps {
  isListening: boolean;
  cameraActive: boolean;
  faceDetected: boolean;
  latency: number | null;
  attentionScore: number;
}

export function SystemInfo({ isListening, cameraActive, faceDetected, latency, attentionScore }: SystemInfoProps) {
  const metrics = [
    { label: "CPU", value: `${12 + (isListening ? Math.floor(Math.random() * 8) : 0)}%`, current: 12 + (isListening ? Math.random() * 8 : 0) },
    { label: "MEM", value: "2.4GB", current: 34 },
    { label: "NET", value: latency ? `${latency}ms` : "—", current: latency ? Math.min(100, latency / 20) : 5 },
    { label: "GPU", value: `${cameraActive ? 45 + Math.floor(Math.random() * 10) : 12}%`, current: cameraActive ? 45 + Math.random() * 10 : 12 },
  ];

  const modules = [
    { label: "VOICE", active: isListening },
    { label: "VISION", active: cameraActive },
    { label: "TOOLS", active: true },
    { label: "MEMORY", active: true },
    { label: "TTS", active: true },
    { label: "SEARCH", active: true },
  ];

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue/50" />
        <h2 className="font-display text-xs tracking-[0.3em] text-muted-foreground">SYSTEM</h2>
      </div>

      <div className="space-y-3">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">{m.label}</span>
              <span className="font-mono text-[10px] text-neon-blue">{m.value}</span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-neon-blue/50 to-neon-cyan/50 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, m.current)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Attention meter */}
      {cameraActive && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex justify-between mb-1">
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider">ATTENTION</span>
            <span className="font-mono text-[10px] text-jarvis-tracking">{Math.round(attentionScore * 100)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-jarvis-tracking/50 to-jarvis-tracking rounded-full"
              animate={{ width: `${attentionScore * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border">
        <div className="grid grid-cols-3 gap-2">
          {modules.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`w-1 h-1 rounded-full ${s.active ? "bg-jarvis-online" : "bg-muted-foreground/30"}`} />
              <span className="font-mono text-[9px] text-muted-foreground tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
