import { motion } from "framer-motion";
import { useVision } from "@/hooks/useVision";
import { useEffect } from "react";
import type { FaceData, HandData } from "@/hooks/useVision";

interface VisionPanelProps {
  active: boolean;
  onToggle: () => void;
  onFaceData?: (data: FaceData) => void;
  onHandGesture?: (command: string | null) => void;
}

export function VisionPanel({ active, onToggle, onFaceData, onHandGesture }: VisionPanelProps) {
  const { videoRef, canvasRef, isActive, faceData, handData, startCamera, stopCamera } = useVision();

  useEffect(() => {
    if (active && !isActive) startCamera();
    else if (!active && isActive) stopCamera();
  }, [active, isActive, startCamera, stopCamera]);

  useEffect(() => {
    onFaceData?.(faceData);
  }, [faceData, onFaceData]);

  useEffect(() => {
    onHandGesture?.(handData.gestureCommand);
  }, [handData.gestureCommand, onHandGesture]);

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
            <video ref={videoRef} className="w-full h-full object-cover opacity-70" muted playsInline />
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
            {faceData.detected && faceData.boundingBox && (
              <motion.div
                className="absolute border-2 border-jarvis-tracking/70 rounded"
                style={{
                  left: `${faceData.boundingBox.x * 100}%`,
                  top: `${faceData.boundingBox.y * 100}%`,
                  width: `${faceData.boundingBox.width * 100}%`,
                  height: `${faceData.boundingBox.height * 100}%`,
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
                {/* Gaze indicator */}
                <div className="absolute -bottom-4 left-0 font-mono text-[8px] text-neon-cyan/70 tracking-wider">
                  GAZE: {faceData.gazeDirection.toUpperCase()}
                </div>
              </motion.div>
            )}

            {/* Hand gesture indicator */}
            {handData.detected && (
              <motion.div
                className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-jarvis-warning/20 border border-jarvis-warning/50"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="font-mono text-[9px] text-jarvis-warning tracking-wider">
                  ✋ GESTURE: {handData.gestureCommand?.toUpperCase() || "DETECTED"}
                </span>
              </motion.div>
            )}

            {/* Telemetry overlay */}
            <div className="absolute bottom-2 right-2 space-y-0.5">
              <div className="font-mono text-[8px] text-neon-blue/60">
                ATT: {Math.round(faceData.attentionScore * 100)}%
              </div>
              <div className="font-mono text-[8px] text-neon-blue/60">
                YAW: {faceData.headPose.yaw.toFixed(1)}°
              </div>
              <div className="font-mono text-[8px] text-neon-blue/60">
                PITCH: {faceData.headPose.pitch.toFixed(1)}°
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-mono text-[10px] text-muted-foreground/40 tracking-wider">CAMERA OFFLINE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
