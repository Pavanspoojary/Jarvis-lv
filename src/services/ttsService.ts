// ElevenLabs TTS service - streams audio from the jarvis-tts edge function

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jarvis-tts`;

let currentAudio: HTMLAudioElement | null = null;
let audioQueue: string[] = [];
let isPlaying = false;

export function cancelSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  audioQueue = [];
  isPlaying = false;
}

export async function speakWithElevenLabs(
  text: string,
  onStart: () => void,
  onEnd: () => void
): Promise<void> {
  cancelSpeech();

  try {
    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.warn("ElevenLabs TTS failed, falling back to browser TTS");
      speakWithBrowser(text, onStart, onEnd);
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onplay = onStart;
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onEnd();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onEnd();
    };

    await audio.play();
  } catch (err) {
    console.warn("TTS error, using browser fallback:", err);
    speakWithBrowser(text, onStart, onEnd);
  }
}

function speakWithBrowser(text: string, onStart: () => void, onEnd: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd();
    return;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const preferredVoice =
    voices.find((v) => v.name.includes("Daniel") && v.lang.startsWith("en")) ||
    voices.find((v) => v.name.includes("James") && v.lang.startsWith("en")) ||
    voices.find((v) => v.lang.startsWith("en-GB")) ||
    voices.find((v) => v.lang.startsWith("en"));
  if (preferredVoice) utterance.voice = preferredVoice;
  utterance.rate = 0.95;
  utterance.pitch = 0.85;
  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = () => onEnd();
  speechSynthesis.speak(utterance);
}
