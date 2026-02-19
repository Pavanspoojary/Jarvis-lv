import { motion } from "framer-motion";
import { useCamera } from "@/hooks/useCamera";
import { useEffect } from "react";

interface CameraTrackerProps {
  active: boolean;
  onToggle: () => void;
}

export function CameraTracker({ active, onToggle }: CameraTrackerProps) {
  const { videoRef, canvasRef, isActive, faceDetected, faceBox, startCamera, stopCamera } =
    useCamera();

  useEffect(() => {
    if (active && !isActive) {
      startCamera();
    } else if (!active && isActive) {
      stopCamera();
    }
  }, [active, isActive, startCamera, stopCamera]);

  return (
    <div className="glass-panel rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-jarvis-tracking" : "bg-muted-foreground"}`} />
          <h2 className="font-display text-xs tracking-[0.3em] text-muted-foreground">
            VISUAL FEED
          </h2>
        </div>
        <button
          onClick={onToggle}
          className="font-mono text-[10px] tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-neon-blue/30"
        >
          {isActive ? "DISABLE" : "ENABLE"}
        </button>
      </div>

      <div className="relative aspect-[4/3] bg-jarvis-panel">
        {isActive ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover opacity-70"
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan overlay */}
            <div className="absolute inset-0 scan-line pointer-events-none" />

            {/* Corner markers */}
            {["top-left", "top-right", "bottom-left", "bottom-right"].map((pos) => (
              <div
                key={pos}
                className={`absolute w-4 h-4 border-neon-blue/50 ${
                  pos.includes("top") ? "top-2" : "bottom-2"
                } ${pos.includes("left") ? "left-2" : "right-2"} ${
                  pos.includes("top") ? "border-t" : "border-b"
                } ${pos.includes("left") ? "border-l" : "border-r"}`}
              />
            ))}

            {/* Face tracking box */}
            {faceDetected && faceBox && (
              <motion.div
                className="absolute border-2 border-jarvis-tracking/70 rounded"
                style={{
                  left: `${faceBox.x * 100}%`,
                  top: `${faceBox.y * 100}%`,
                  width: `${faceBox.width * 100}%`,
                  height: `${faceBox.height * 100}%`,
                }}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  boxShadow: "0 0 15px hsl(var(--tracking-green) / 0.3)",
                }}
                transition={{ duration: 0.2 }}
              >
                <div className="absolute -top-5 left-0 font-mono text-[9px] text-jarvis-tracking tracking-wider">
                  TARGET LOCKED
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="font-mono text-[10px] text-muted-foreground/40 tracking-wider">
                CAMERA OFFLINE
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
