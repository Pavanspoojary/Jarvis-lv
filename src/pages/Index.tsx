import { useState, useEffect } from "react";
import { VoiceOrb } from "@/components/VoiceOrb";
import { StatusBar } from "@/components/StatusBar";
import { ChatPanel } from "@/components/ChatPanel";
import { CameraTracker } from "@/components/CameraTracker";
import { SystemInfo } from "@/components/SystemInfo";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const Index = () => {
  const { isListening, transcript, startListening, stopListening, messages, status, volume } =
    useSpeechRecognition();
  const [cameraActive, setCameraActive] = useState(false);
  const [, setTick] = useState(0);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOrbClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--neon-blue) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon-blue) / 0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Top status bar */}
      <StatusBar status={status} cameraActive={cameraActive} faceDetected={false} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Chat */}
        <div className="w-80 p-3 flex flex-col gap-3">
          <div className="flex-1 min-h-0">
            <ChatPanel messages={messages} transcript={transcript} />
          </div>
        </div>

        {/* Center - Voice Orb */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Decorative hex grid background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[500px] h-[500px] rounded-full border border-neon-blue/5" />
            <div className="absolute w-[400px] h-[400px] rounded-full border border-neon-blue/5" />
          </div>

          <VoiceOrb
            status={status}
            volume={volume}
            onClick={handleOrbClick}
            isListening={isListening}
          />
        </div>

        {/* Right panel - Camera + System */}
        <div className="w-72 p-3 flex flex-col gap-3">
          <CameraTracker
            active={cameraActive}
            onToggle={() => setCameraActive(!cameraActive)}
          />
          <SystemInfo isListening={isListening} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="glass-panel px-6 py-2 flex items-center justify-center">
        <span className="font-mono text-[10px] text-muted-foreground/40 tracking-[0.3em]">
          JARVIS v1.0 — PERSONAL AI ASSISTANT — ALL SYSTEMS NOMINAL
        </span>
      </div>
    </div>
  );
};

export default Index;
