'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { PoseLandmark } from '@/types/exercise';
import { POSE_LANDMARKS } from '@/lib/poseDetection';

interface PoseCameraProps {
  onPoseDetected: (landmarks: PoseLandmark[]) => void;
  isActive: boolean;
  fullscreen?: boolean;
  onRecordingComplete?: (videoBlob: Blob) => void;
}

export interface PoseCameraRef {
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
}

const PoseCamera = forwardRef<PoseCameraRef, PoseCameraProps>(
  ({ onPoseDetected, isActive, fullscreen = false, onRecordingComplete }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const [isRecording, setIsRecording] = useState(false);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Expose recording methods to parent
  useImperativeHandle(ref, () => ({
    startRecording: () => {
      if (canvasRef.current && !isRecording) {
        try {
          const stream = canvasRef.current.captureStream(30); // 30 FPS
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
          });
          
          recordedChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            onRecordingComplete?.(blob);
            setIsRecording(false);
          };
          
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.start(100); // Collect data every 100ms
          setIsRecording(true);
        } catch (err) {
          console.error('Failed to start recording:', err);
        }
      }
    },
    stopRecording: () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    },
    isRecording,
  }), [isRecording, onRecordingComplete]);

  // Update dimensions based on fullscreen and window size
  useEffect(() => {
    const updateDimensions = () => {
      if (fullscreen) {
        // Use window size for fullscreen, maintain 4:3 aspect ratio
        const windowRatio = window.innerWidth / window.innerHeight;
        const targetRatio = 4 / 3;
        
        let width, height;
        if (windowRatio > targetRatio) {
          // Window is wider, fit by height
          height = window.innerHeight;
          width = height * targetRatio;
        } else {
          // Window is taller, fit by width
          width = window.innerWidth;
          height = width / targetRatio;
        }
        
        setDimensions({ 
          width: Math.round(width), 
          height: Math.round(height) 
        });
      } else {
        setDimensions({ width: 640, height: 480 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [fullscreen]);

  const initializePose = useCallback(async () => {
    try {
      // Dynamic import for MediaPipe (client-side only)
      const { Pose } = await import('@mediapipe/pose');
      const { Camera } = await import('@mediapipe/camera_utils');
      const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');

      if (!videoRef.current || !canvasRef.current) return;

      const pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        },
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        
        if (!canvas || !ctx || !videoRef.current) return;

        // Clear canvas
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Draw pose landmarks if detected
        if (results.poseLandmarks) {
          // Convert to our format and notify parent
          const landmarks: PoseLandmark[] = results.poseLandmarks.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }));

          onPoseDetected(landmarks);

          // Adjust line width based on canvas size
          const lineWidth = fullscreen ? 4 : 2;
          const radius = fullscreen ? 6 : 3;

          // Draw skeleton
          drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: lineWidth,
          });

          drawLandmarks(ctx, results.poseLandmarks, {
            color: '#FF0000',
            lineWidth: 1,
            radius: radius,
          });
        }

        ctx.restore();
      });

      poseRef.current = pose;

      // Setup camera - request landscape orientation for better view
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && poseRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,  // Higher resolution for better detection
        height: 720,
        facingMode: 'environment', // Prefer back camera on mobile
      });

      cameraRef.current = camera;
      await camera.start();
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize pose detection:', err);
      setError('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง');
      setIsLoading(false);
    }
  }, [onPoseDetected, fullscreen]);

  useEffect(() => {
    if (isActive) {
      initializePose();
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, [isActive, initializePose]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg ${fullscreen ? 'h-screen' : 'h-96'}`}>
        <div className="text-center text-red-400">
          <p className="text-lg mb-2">⚠️ {error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              initializePose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${fullscreen ? 'w-screen h-screen flex items-center justify-center bg-black' : 'w-full max-w-2xl mx-auto'}`}
    >
      {isLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-900 ${fullscreen ? '' : 'rounded-lg'} z-10`}>
          <div className="text-center text-white">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>กำลังเปิดกล้อง...</p>
            <p className="text-sm text-gray-400 mt-2">📱 แนะนำ: หมุนมือถือเป็นแนวนอน</p>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="hidden"
        playsInline
      />
      
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className={`${fullscreen ? 'max-w-full max-h-full' : 'w-full h-auto rounded-lg shadow-lg'} transform scale-x-[-1]`}
        style={fullscreen ? { 
          width: dimensions.width, 
          height: dimensions.height,
          objectFit: 'contain'
        } : undefined}
      />
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/80 backdrop-blur-sm px-3 py-2 rounded-lg">
          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
          <span className="text-white text-sm font-medium">REC</span>
        </div>
      )}
    </div>
  );
});

PoseCamera.displayName = 'PoseCamera';

export default PoseCamera;

// Pose connections for drawing skeleton
const POSE_CONNECTIONS: [number, number][] = [
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
];
