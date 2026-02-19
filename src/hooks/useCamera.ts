import { useState, useRef, useCallback, useEffect } from "react";

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  faceDetected: boolean;
  faceBox: FaceBox | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceBox, setFaceBox] = useState<FaceBox | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);

  // Simple motion-based "face detection" using canvas pixel analysis
  const prevFrameRef = useRef<ImageData | null>(null);

  const detectMotion = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animRef.current = requestAnimationFrame(detectMotion);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (prevFrameRef.current) {
      const prev = prevFrameRef.current.data;
      const curr = currentFrame.data;
      let motionPixels = 0;
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

      for (let i = 0; i < curr.length; i += 16) {
        const diff = Math.abs(curr[i] - prev[i]) + Math.abs(curr[i + 1] - prev[i + 1]) + Math.abs(curr[i + 2] - prev[i + 2]);
        if (diff > 60) {
          motionPixels++;
          const pixelIndex = i / 4;
          const x = pixelIndex % canvas.width;
          const y = Math.floor(pixelIndex / canvas.width);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      const hasMotion = motionPixels > 50;
      setFaceDetected(hasMotion);

      if (hasMotion && maxX > minX && maxY > minY) {
        // Center the box and make it face-like proportions
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const w = Math.min((maxX - minX) * 1.2, canvas.width * 0.5);
        const h = w * 1.3;
        setFaceBox({
          x: (cx - w / 2) / canvas.width,
          y: Math.max(0, (cy - h / 2) / canvas.height),
          width: w / canvas.width,
          height: h / canvas.height,
        });
      }
    }

    prevFrameRef.current = currentFrame;
    animRef.current = requestAnimationFrame(detectMotion);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
      detectMotion();
    } catch (e) {
      console.warn("Camera access denied");
    }
  }, [detectMotion]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(animRef.current);
    setIsActive(false);
    setFaceDetected(false);
    setFaceBox(null);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return { videoRef, canvasRef, isActive, faceDetected, faceBox, startCamera, stopCamera };
}
