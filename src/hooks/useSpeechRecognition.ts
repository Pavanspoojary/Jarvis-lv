import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { speakWithElevenLabs, cancelSpeech } from "@/services/ttsService";
import type { JarvisStatus, Message } from "@/types/jarvis";

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  messages: Message[];
  status: JarvisStatus;
  volume: number;
  sendTextMessage: (text: string) => void;
  clearHistory: () => void;
  latency: number | null;
}

function generateSessionId(): string {
  const stored = sessionStorage.getItem("jarvis-session-id");
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem("jarvis-session-id", id);
  return id;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Good evening. I am JARVIS, your personal AI assistant. How may I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [status, setStatus] = useState<JarvisStatus>("idle");
  const [volume, setVolume] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef(generateSessionId());
  const isProcessingRef = useRef(false);

  const updateVolume = useCallback(() => {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setVolume(avg / 255);
    }
    animFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  const processUserMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessingRef.current) return;
    isProcessingRef.current = true;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStatus("thinking");
    cancelSpeech();

    const startTime = performance.now();

    try {
      const { data, error } = await supabase.functions.invoke("jarvis-chat", {
        body: { message: trimmed, sessionId: sessionIdRef.current },
      });

      const elapsed = Math.round(performance.now() - startTime);
      setLatency(elapsed);

      if (error) throw error;

      const responseText = data?.response || "I apologize, I'm experiencing difficulties at the moment.";

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      speakWithElevenLabs(
        responseText,
        () => setStatus("speaking"),
        () => setStatus(isListening ? "listening" : "idle")
      );
    } catch (err) {
      console.error("JARVIS chat error:", err);
      const fallback = "I apologize, sir. I seem to be experiencing a temporary disruption in my systems.";
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fallback,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakWithElevenLabs(
        fallback,
        () => setStatus("speaking"),
        () => setStatus(isListening ? "listening" : "idle")
      );
    } finally {
      isProcessingRef.current = false;
    }
  }, [isListening]);

  const sendTextMessage = useCallback((text: string) => {
    processUserMessage(text);
  }, [processUserMessage]);

  const clearHistory = useCallback(() => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Memory cleared. How may I assist you, sir?",
      timestamp: new Date(),
    }]);
    sessionStorage.removeItem("jarvis-session-id");
    sessionIdRef.current = generateSessionId();
  }, []);

  const startListening = useCallback(async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      updateVolume();
    } catch (e) {
      console.warn("Microphone access denied");
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      setTranscript(interimTranscript || finalTranscript);

      if (finalTranscript.trim()) {
        processUserMessage(finalTranscript.trim());
        setTranscript("");
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus("idle");
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) { /* already started */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setStatus("listening");
  }, [processUserMessage, updateVolume]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    analyserRef.current = null;
    setIsListening(false);
    setVolume(0);
    setStatus("idle");
    setTranscript("");
  }, []);

  useEffect(() => {
    speechSynthesis?.getVoices();
    const handleVoicesChanged = () => speechSynthesis?.getVoices();
    speechSynthesis?.addEventListener?.("voiceschanged", handleVoicesChanged);
    return () => {
      speechSynthesis?.removeEventListener?.("voiceschanged", handleVoicesChanged);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelSpeech();
    };
  }, []);

  return { isListening, transcript, startListening, stopListening, messages, status, volume, sendTextMessage, clearHistory, latency };
}

export type { JarvisStatus, Message };
