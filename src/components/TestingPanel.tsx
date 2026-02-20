import { useState, useCallback } from "react";
import { motion } from "framer-motion";

interface TestingPanelProps {
  isListening: boolean;
  cameraActive: boolean;
  latency: number | null;
  onTestMic: () => void;
  onTestCamera: () => void;
  onTestVoice: () => void;
}

export function TestingPanel({ isListening, cameraActive, latency, onTestMic, onTestCamera, onTestVoice }: TestingPanelProps) {
  const [aiTestResult, setAiTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const testAiLatency = useCallback(async () => {
    setTesting(true);
    setAiTestResult(null);
    const start = performance.now();
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jarvis-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ message: "ping", sessionId: "test-latency" }),
      });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        setAiTestResult(`${elapsed}ms — OK`);
      } else {
        setAiTestResult(`${elapsed}ms — Error ${res.status}`);
      }
    } catch (err) {
      setAiTestResult("Failed — network error");
    } finally {
      setTesting(false);
    }
  }, []);

  const tests = [
    {
      label: "MICROPHONE",
      status: isListening ? "ACTIVE" : "READY",
      active: isListening,
      action: onTestMic,
      actionLabel: isListening ? "STOP" : "TEST",
    },
    {
      label: "CAMERA",
      status: cameraActive ? "ACTIVE" : "READY",
      active: cameraActive,
      action: onTestCamera,
      actionLabel: cameraActive ? "STOP" : "TEST",
    },
    {
      label: "VOICE OUTPUT",
      status: "READY",
      active: false,
      action: onTestVoice,
      actionLabel: "TEST",
    },
    {
      label: "AI LATENCY",
      status: aiTestResult || (latency ? `${latency}ms` : "—"),
      active: !!latency && latency < 2000,
      action: testAiLatency,
      actionLabel: testing ? "..." : "TEST",
    },
  ];

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-jarvis-warning/50" />
        <h2 className="font-display text-xs tracking-[0.3em] text-muted-foreground">DIAGNOSTICS</h2>
      </div>

      <div className="space-y-2">
        {tests.map((t) => (
          <div key={t.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${t.active ? "bg-jarvis-online" : "bg-muted-foreground/40"}`} />
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">{t.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[9px] tracking-wider ${t.active ? "text-jarvis-online" : "text-muted-foreground/60"}`}>
                {t.status}
              </span>
              <button
                onClick={t.action}
                className="font-mono text-[9px] tracking-wider text-neon-blue hover:text-neon-cyan transition-colors px-2 py-0.5 rounded border border-neon-blue/20 hover:border-neon-cyan/40"
              >
                {t.actionLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
