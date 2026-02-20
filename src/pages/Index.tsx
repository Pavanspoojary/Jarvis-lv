import { useState, useEffect, useCallback } from "react";
import { VoiceOrb } from "@/components/VoiceOrb";
import { StatusBar } from "@/components/StatusBar";
import { ChatPanel } from "@/components/ChatPanel";
import { VisionPanel } from "@/components/VisionPanel";
import { SystemInfo } from "@/components/SystemInfo";
import { TestingPanel } from "@/components/TestingPanel";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { speakWithElevenLabs } from "@/services/ttsService";
import type { FaceData } from "@/hooks/useVision";

const Index = () => {
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    messages,
    status,
    volume,
    sendTextMessage,
    clearHistory,
    latency,
  } = useSpeechRecognition();

  const [cameraActive, setCameraActive] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [, setTick] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [attentionScore, setAttentionScore] = useState(0);
  const [handGesture, setHandGesture] = useState<string | null>(null);
  const [showTests, setShowTests] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOrbClick = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && status !== "thinking") {
      sendTextMessage(textInput.trim());
      setTextInput("");
    }
  };

  const handleFaceData = useCallback((data: FaceData) => {
    setFaceDetected(data.detected);
    setAttentionScore(data.attentionScore);
  }, []);

  const handleHandGesture = useCallback((command: string | null) => {
    setHandGesture(command);
    // Gesture activation: raised hand toggles listening
    if (command === "activate" && !isListening) {
      startListening();
    }
  }, [isListening, startListening]);

  const handleTestVoice = useCallback(() => {
    speakWithElevenLabs(
      "All systems are operational, sir. Voice output test complete.",
      () => {},
      () => {}
    );
  }, []);

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
      <StatusBar
        status={status}
        cameraActive={cameraActive}
        faceDetected={faceDetected}
        handGesture={handGesture}
        latency={latency}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Chat */}
        <div className="w-80 p-3 flex flex-col gap-3">
          <div className="flex-1 min-h-0">
            <ChatPanel messages={messages} transcript={transcript} />
          </div>
          {/* Text input */}
          <form onSubmit={handleTextSubmit} className="glass-panel rounded-lg p-2 flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type a message..."
              disabled={status === "thinking"}
              className="flex-1 bg-transparent border-none outline-none text-sm font-body text-foreground placeholder:text-muted-foreground/50 px-2"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={!textInput.trim() || status === "thinking"}
              className="font-mono text-[10px] tracking-wider text-neon-blue hover:text-neon-cyan disabled:text-muted-foreground/30 transition-colors px-3 py-1.5 rounded border border-neon-blue/20 hover:border-neon-cyan/40 disabled:border-transparent"
            >
              SEND
            </button>
          </form>
          {/* Quick actions */}
          <div className="flex gap-2">
            <button
              onClick={clearHistory}
              className="font-mono text-[9px] tracking-wider text-muted-foreground/50 hover:text-destructive transition-colors"
            >
              CLEAR MEMORY
            </button>
            <button
              onClick={() => setShowTests(!showTests)}
              className="font-mono text-[9px] tracking-wider text-muted-foreground/50 hover:text-neon-blue transition-colors ml-auto"
            >
              {showTests ? "HIDE" : "SHOW"} DIAGNOSTICS
            </button>
          </div>
        </div>

        {/* Center - Voice Orb */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[500px] h-[500px] rounded-full border border-neon-blue/5" />
            <div className="absolute w-[400px] h-[400px] rounded-full border border-neon-blue/5" />
          </div>
          <VoiceOrb status={status} volume={volume} onClick={handleOrbClick} isListening={isListening} />
        </div>

        {/* Right panel */}
        <div className="w-72 p-3 flex flex-col gap-3 overflow-y-auto">
          <VisionPanel
            active={cameraActive}
            onToggle={() => setCameraActive(!cameraActive)}
            onFaceData={handleFaceData}
            onHandGesture={handleHandGesture}
          />
          <SystemInfo
            isListening={isListening}
            cameraActive={cameraActive}
            faceDetected={faceDetected}
            latency={latency}
            attentionScore={attentionScore}
          />
          {showTests && (
            <TestingPanel
              isListening={isListening}
              cameraActive={cameraActive}
              latency={latency}
              onTestMic={handleOrbClick}
              onTestCamera={() => setCameraActive(!cameraActive)}
              onTestVoice={handleTestVoice}
            />
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="glass-panel px-6 py-2 flex items-center justify-center gap-8">
        <span className="font-mono text-[10px] text-muted-foreground/40 tracking-[0.3em]">
          JARVIS v2.0 — PRODUCTION AI ASSISTANT
        </span>
        <div className="flex gap-4">
          {["AI", "TTS", "STT", "VISION", "TOOLS", "MEMORY"].map((mod) => (
            <span key={mod} className="font-mono text-[9px] text-jarvis-online/60 tracking-wider">
              {mod} ✓
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
