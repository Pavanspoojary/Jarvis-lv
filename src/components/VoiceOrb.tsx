import { motion } from "framer-motion";
import type { JarvisStatus } from "@/hooks/useSpeechRecognition";

interface VoiceOrbProps {
  status: JarvisStatus;
  volume: number;
  onClick: () => void;
  isListening: boolean;
}

const statusColors: Record<JarvisStatus, string> = {
  idle: "from-neon-blue/20 to-neon-cyan/10",
  listening: "from-neon-blue/60 to-neon-cyan/40",
  thinking: "from-jarvis-warning/50 to-jarvis-warning/20",
  speaking: "from-neon-blue/70 to-neon-cyan/50",
  offline: "from-muted/30 to-muted/10",
};

export function VoiceOrb({ status, volume, onClick, isListening }: VoiceOrbProps) {
  const scale = 1 + volume * 0.3;
  const glowIntensity = status === "idle" ? 0.2 : 0.5 + volume * 0.5;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer rings */}
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full border border-neon-blue/10"
          style={{
            width: 200 + ring * 60,
            height: 200 + ring * 60,
          }}
          animate={{
            rotate: ring % 2 === 0 ? 360 : -360,
            scale: status === "listening" ? 1 + volume * 0.05 * ring : 1,
          }}
          transition={{
            rotate: { duration: 20 + ring * 10, repeat: Infinity, ease: "linear" },
            scale: { duration: 0.1 },
          }}
        >
          {/* Ring dot markers */}
          {Array.from({ length: 4 + ring * 2 }).map((_, i, arr) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-neon-blue/40"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${(360 / arr.length) * i}deg) translateY(-${(200 + ring * 60) / 2}px) translate(-50%, -50%)`,
              }}
            />
          ))}
        </motion.div>
      ))}

      {/* Glow background */}
      <motion.div
        className="absolute w-48 h-48 rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(var(--neon-blue) / ${glowIntensity}), transparent 70%)`,
          filter: `blur(${20 + volume * 20}px)`,
        }}
        animate={{ scale: scale * 1.5 }}
        transition={{ duration: 0.1 }}
      />

      {/* Main orb */}
      <motion.button
        onClick={onClick}
        className={`relative z-10 w-36 h-36 rounded-full bg-gradient-to-br ${statusColors[status]} border border-neon-blue/30 cursor-pointer flex items-center justify-center overflow-hidden`}
        animate={{
          scale,
          boxShadow: `0 0 ${30 + volume * 40}px hsl(var(--neon-blue) / ${glowIntensity}), inset 0 0 ${20 + volume * 20}px hsl(var(--neon-blue) / ${glowIntensity * 0.5})`,
        }}
        transition={{ duration: 0.1 }}
        whileHover={{ scale: scale * 1.05 }}
        whileTap={{ scale: scale * 0.95 }}
        style={{ animation: status === "idle" ? "orbFloat 4s ease-in-out infinite" : "none" }}
      >
        {/* Inner patterns */}
        <div className="absolute inset-2 rounded-full border border-neon-blue/20" />
        <div className="absolute inset-5 rounded-full border border-neon-blue/10" />

        {/* Center icon */}
        <div className="relative z-10">
          {status === "listening" ? (
            <div className="flex gap-1 items-end h-8">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-neon-cyan rounded-full"
                  animate={{ height: [8, 8 + volume * 24, 8] }}
                  transition={{
                    duration: 0.4,
                    repeat: Infinity,
                    delay: i * 0.08,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          ) : status === "thinking" ? (
            <motion.div
              className="w-6 h-6 border-2 border-jarvis-warning border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : status === "speaking" ? (
            <div className="flex gap-1.5 items-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-neon-cyan rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-neon-blue">
              <path
                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"
                fill="currentColor"
                opacity="0.4"
              />
              <path
                d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4m-4 0h8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      </motion.button>

      {/* Status label */}
      <motion.div
        className="absolute -bottom-12 font-display text-xs tracking-[0.3em] uppercase"
        animate={{
          color:
            status === "listening"
              ? "hsl(var(--neon-cyan))"
              : status === "thinking"
              ? "hsl(var(--warning-amber))"
              : "hsl(var(--muted-foreground))",
        }}
      >
        {isListening ? status : "TAP TO ACTIVATE"}
      </motion.div>
    </div>
  );
}
