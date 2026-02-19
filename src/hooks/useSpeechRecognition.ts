import { useState, useCallback, useEffect, useRef } from "react";

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

  const updateVolume = useCallback(() => {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setVolume(avg / 255);
    }
    animFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  const processUserMessage = useCallback((text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStatus("thinking");

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I've processed your request. Is there anything else you need?",
        "Understood. I'll take care of that right away.",
        "Analyzing the data now. One moment please.",
        "I've found several relevant results for your query.",
        "All systems are operating within normal parameters.",
        "I've noted that down. Would you like me to set a reminder?",
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setStatus("speaking");

      // Simulate speaking with browser TTS
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(response);
        const voices = speechSynthesis.getVoices();
        const maleVoice = voices.find(
          (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("male")
        ) || voices.find((v) => v.lang.startsWith("en"));
        if (maleVoice) utterance.voice = maleVoice;
        utterance.rate = 0.95;
        utterance.pitch = 0.85;
        utterance.onend = () => setStatus("idle");
        speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setStatus("idle"), 2000);
      }
    }, 1500);
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
      if (isListening) recognition.start();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setStatus("listening");
  }, [isListening, processUserMessage, updateVolume]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
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
    return () => {
      recognitionRef.current?.stop();
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { isListening, transcript, startListening, stopListening, messages, status, volume };
}
