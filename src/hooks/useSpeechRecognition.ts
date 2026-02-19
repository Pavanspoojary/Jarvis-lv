import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type JarvisStatus = "idle" | "listening" | "thinking" | "speaking" | "offline";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  messages: Message[];
  status: JarvisStatus;
  volume: number;
  sendTextMessage: (text: string) => void;
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
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef(generateSessionId());

  const updateVolume = useCallback(() => {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setVolume(avg / 255);
    }
    animFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  const speakResponse = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      // Try to find a good male English voice
      const preferredVoice =
        voices.find((v) => v.name.includes("Daniel") && v.lang.startsWith("en")) ||
        voices.find((v) => v.name.includes("James") && v.lang.startsWith("en")) ||
        voices.find((v) => v.lang.startsWith("en-GB") && v.name.toLowerCase().includes("male")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 0.95;
      utterance.pitch = 0.85;
      utterance.onstart = () => setStatus("speaking");
      utterance.onend = () => setStatus(isListening ? "listening" : "idle");
      utterance.onerror = () => setStatus(isListening ? "listening" : "idle");
      speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setStatus(isListening ? "listening" : "idle"), 1000);
    }
  }, [isListening]);

  const processUserMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStatus("thinking");

    try {
      const { data, error } = await supabase.functions.invoke("jarvis-chat", {
        body: { message: trimmed, sessionId: sessionIdRef.current },
      });

      if (error) throw error;

      const responseText = data?.response || "I apologize, I'm experiencing difficulties at the moment.";

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakResponse(responseText);
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
      speakResponse(fallback);
    }
  }, [speakResponse]);

  const sendTextMessage = useCallback((text: string) => {
    processUserMessage(text);
  }, [processUserMessage]);

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
      // Restart if still listening
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // already started
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setStatus("listening");
  }, [processUserMessage, updateVolume]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent restart
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
    // Pre-load voices
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
    };
  }, []);

  return { isListening, transcript, startListening, stopListening, messages, status, volume, sendTextMessage };
}
