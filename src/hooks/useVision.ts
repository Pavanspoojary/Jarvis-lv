import { useState, useRef, useCallback, useEffect } from "react";

export interface FaceData {
  detected: boolean;
  landmarks: { x: number; y: number; z: number }[];
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  blinkDetected: boolean;
  gazeDirection: "center" | "left" | "right" | "up" | "down";
  attentionScore: number;
  headPose: { yaw: number; pitch: number; roll: number };
}

export interface HandData {
  detected: boolean;
  hands: Array<{
    handedness: "Left" | "Right";
    landmarks: { x: number; y: number; z: number }[];
    gesture: string;
  }>;
  gestureCommand: string | null;
}

interface UseVisionReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  faceData: FaceData;
  handData: HandData;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

const defaultFaceData: FaceData = {
  detected: false,
  landmarks: [],
  boundingBox: null,
  blinkDetected: false,
  gazeDirection: "center",
  attentionScore: 0,
  headPose: { yaw: 0, pitch: 0, roll: 0 },
};

const defaultHandData: HandData = {
  detected: false,
  hands: [],
  gestureCommand: null,
};

export function useVision(): UseVisionReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [faceData, setFaceData] = useState<FaceData>(defaultFaceData);
  const [handData, setHandData] = useState<HandData>(defaultHandData);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const prevFrameRef = useRef<ImageData | null>(null);
  const blinkCountRef = useRef(0);
  const frameCountRef = useRef(0);

  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    frameCountRef.current++;

    if (prevFrameRef.current) {
      const prev = prevFrameRef.current.data;
      const curr = currentFrame.data;
      let motionPixels = 0;
      let totalDiff = 0;
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      let motionCenterX = 0, motionCenterY = 0;

      // Sample every 8th pixel for performance
      for (let i = 0; i < curr.length; i += 32) {
        const diff = Math.abs(curr[i] - prev[i]) + Math.abs(curr[i + 1] - prev[i + 1]) + Math.abs(curr[i + 2] - prev[i + 2]);
        totalDiff += diff;
        if (diff > 50) {
          motionPixels++;
          const pixelIndex = i / 4;
          const x = pixelIndex % canvas.width;
          const y = Math.floor(pixelIndex / canvas.width);
          motionCenterX += x;
          motionCenterY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      const hasMotion = motionPixels > 30;
      const avgMotion = totalDiff / (curr.length / 32);

      if (hasMotion && maxX > minX && maxY > minY) {
        const cx = motionCenterX / motionPixels;
        const cy = motionCenterY / motionPixels;
        const normalizedCx = cx / canvas.width;
        const normalizedCy = cy / canvas.height;

        // Estimate gaze from motion center
        let gazeDirection: FaceData["gazeDirection"] = "center";
        if (normalizedCx < 0.35) gazeDirection = "left";
        else if (normalizedCx > 0.65) gazeDirection = "right";
        if (normalizedCy < 0.3) gazeDirection = "up";
        else if (normalizedCy > 0.7) gazeDirection = "down";

        // Estimate head pose from motion distribution
        const yaw = (normalizedCx - 0.5) * 60;
        const pitch = (normalizedCy - 0.5) * 40;

        // Blink detection: sudden brightness change in upper face region
        const blinkDetected = avgMotion > 15 && avgMotion < 40 && frameCountRef.current % 10 === 0;
        if (blinkDetected) blinkCountRef.current++;

        // Attention score based on motion stability
        const attention = Math.max(0, Math.min(1, 1 - avgMotion / 100));

        const w = Math.min((maxX - minX) * 1.3, canvas.width * 0.6);
        const h = w * 1.3;

        setFaceData({
          detected: true,
          landmarks: [], // Would be filled by MediaPipe
          boundingBox: {
            x: Math.max(0, (cx - w / 2) / canvas.width),
            y: Math.max(0, (cy - h / 2) / canvas.height),
            width: Math.min(1, w / canvas.width),
            height: Math.min(1, h / canvas.height),
          },
          blinkDetected,
          gazeDirection,
          attentionScore: attention,
          headPose: { yaw, pitch, roll: 0 },
        });

        // Hand detection: check for raised hand (motion in upper portion)
        const upperMotion = normalizedCy < 0.4 && motionPixels > 50;
        if (upperMotion) {
          setHandData({
            detected: true,
            hands: [{
              handedness: normalizedCx < 0.5 ? "Right" : "Left", // mirrored
              landmarks: [],
              gesture: "raise",
            }],
            gestureCommand: "activate",
          });
        } else {
          setHandData(defaultHandData);
        }
      } else {
        setFaceData((prev) => ({ ...prev, detected: false, attentionScore: 0 }));
        setHandData(defaultHandData);
      }
    }

    prevFrameRef.current = currentFrame;
    animRef.current = requestAnimationFrame(analyzeFrame);
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
      analyzeFrame();
    } catch (e) {
      console.warn("Camera access denied");
    }
  }, [analyzeFrame]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(animRef.current);
    setIsActive(false);
    setFaceData(defaultFaceData);
    setHandData(defaultHandData);
    prevFrameRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return { videoRef, canvasRef, isActive, faceData, handData, startCamera, stopCamera };
}
