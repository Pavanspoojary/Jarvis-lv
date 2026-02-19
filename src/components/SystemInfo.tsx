import { motion } from "framer-motion";

interface SystemInfoProps {
  isListening: boolean;
}

const metrics = [
  { label: "CPU", value: "12%", max: 100, current: 12 },
  { label: "MEM", value: "2.4GB", max: 100, current: 34 },
  { label: "NET", value: "24ms", max: 100, current: 8 },
  { label: "GPU", value: "38%", max: 100, current: 38 },
];

export function SystemInfo({ isListening }: SystemInfoProps) {
  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue/50" />
        <h2 className="font-display text-xs tracking-[0.3em] text-muted-foreground">
          SYSTEM
        </h2>
      </div>

      <div className="space-y-3">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
                {m.label}
              </span>
              <span className="font-mono text-[10px] text-neon-blue">
                {m.value}
              </span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-neon-blue/50 to-neon-cyan/50 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${m.current + (isListening ? Math.random() * 10 : 0)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "VOICE", active: isListening },
            { label: "VISION", active: false },
            { label: "TOOLS", active: true },
            { label: "MEMORY", active: true },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`w-1 h-1 rounded-full ${s.active ? "bg-jarvis-online" : "bg-muted-foreground/30"}`} />
              <span className="font-mono text-[9px] text-muted-foreground tracking-wider">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
