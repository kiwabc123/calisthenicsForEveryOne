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
      // Step 1: Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser ไม่รองรับการเข้าถึงกล้อง (getUserMedia)');
      }
      
      // Step 2: Test camera access directly first
      console.log('Testing camera access...');
      let testStream: MediaStream | null = null;
      try {
        testStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });
        console.log('Camera access granted!', testStream.getVideoTracks());
        // Stop the test stream, MediaPipe will create its own
        testStream.getTracks().forEach(track => track.stop());
      } catch (cameraTestErr: any) {
        console.error('Camera test failed:', cameraTestErr);
        throw cameraTestErr; // Re-throw to trigger specific error handling
      }
      
      // Step 3: Dynamic import for MediaPipe (client-side only)
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
        
        // Mirror the canvas horizontally for selfie view
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        
        // Draw video frame (now mirrored)
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Draw pose landmarks if detected
        if (results.poseLandmarks) {
          // Mirror the landmarks to match the mirrored video
          const mirroredLandmarks = results.poseLandmarks.map((lm: any) => ({
            ...lm,
            x: 1 - lm.x, // Mirror x coordinate (0-1 range)
          }));
          
          // Convert to our format and notify parent (use original for calculations)
          const landmarks: PoseLandmark[] = results.poseLandmarks.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }));

          onPoseDetected(landmarks);

          // Adjust line width based on canvas size
          const lineWidth = fullscreen ? 3 : 2;
          const radius = fullscreen ? 5 : 3;

          // Draw skeleton with mirrored landmarks
          drawConnectors(ctx, mirroredLandmarks, POSE_CONNECTIONS, {
            color: 'rgba(0, 255, 128, 0.8)',
            lineWidth: lineWidth,
          });

          drawLandmarks(ctx, mirroredLandmarks, {
            color: 'rgba(255, 100, 100, 0.9)',
            fillColor: 'rgba(255, 200, 200, 0.8)',
            lineWidth: 1,
            radius: radius,
          });
        }

        ctx.restore();
      });

      poseRef.current = pose;

      // Setup camera with fallback
      let camera: any = null;
      
      // Try different camera configurations
      const cameraConfigs: Array<{ facingMode?: 'user' | 'environment' }> = [
        { facingMode: 'user' },           // Front camera (most reliable)
        { facingMode: 'environment' },    // Back camera
        { facingMode: undefined },        // Default
      ];
      
      for (const config of cameraConfigs) {
        try {
          camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && poseRef.current) {
                await poseRef.current.send({ image: videoRef.current });
              }
            },
            width: 1280,
            height: 720,
            facingMode: config.facingMode,
          });
          
          await camera.start();
          console.log('Camera started with config:', config);
          break; // Success, exit loop
        } catch (cameraErr) {
          console.warn('Camera config failed:', config, cameraErr);
          if (camera) {
            try { camera.stop(); } catch {}
          }
          camera = null;
        }
      }
      
      if (!camera) {
        throw new Error('All camera configurations failed');
      }

      cameraRef.current = camera;
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to initialize pose detection:', err);
      console.error('Error name:', err?.name);
      console.error('Error message:', err?.message);
      
      // More specific error messages
      let errorMessage = 'ไม่สามารถเปิดกล้องได้ ';
      if (err instanceof Error || err?.name) {
        const errorName = err?.name || '';
        const errorMsg = err?.message || '';
        
        if (errorName === 'NotAllowedError' || errorMsg.includes('Permission denied')) {
          errorMessage += 'กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่า Browser';
        } else if (errorName === 'NotFoundError' || errorMsg.includes('Requested device not found')) {
          errorMessage += 'ไม่พบกล้องในอุปกรณ์นี้';
        } else if (errorName === 'NotReadableError' || errorMsg.includes('Could not start video source')) {
          errorMessage += 'กล้องถูกใช้งานอยู่โดยแอปอื่น';
        } else if (errorName === 'OverconstrainedError') {
          errorMessage += 'กล้องไม่รองรับการตั้งค่าที่ต้องการ';
        } else if (errorName === 'AbortError') {
          errorMessage += 'การเข้าถึงกล้องถูกยกเลิก';
        } else if (errorName === 'SecurityError') {
          errorMessage += 'ไม่อนุญาตให้เข้าถึงกล้อง (ต้องใช้ HTTPS หรือ localhost)';
        } else if (errorMsg.includes('getUserMedia')) {
          errorMessage += 'Browser ไม่รองรับการเข้าถึงกล้อง';
        } else {
          errorMessage += `(${errorName || errorMsg || 'Unknown error'}) กรุณาลองใหม่อีกครั้ง`;
        }
      } else {
        errorMessage += 'กรุณาอนุญาตการเข้าถึงกล้อง';
      }
      
      setError(errorMessage);
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
        <div className="text-center text-red-400 p-6 max-w-md">
          <div className="text-4xl mb-4">📷</div>
          <p className="text-lg mb-4">⚠️ {error}</p>
          
          <div className="text-left text-gray-400 text-sm mb-4 bg-gray-800 rounded-lg p-4">
            <p className="font-semibold text-gray-300 mb-2">วิธีแก้ไข:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>ตรวจสอบว่าอนุญาตกล้องแล้วใน Browser</li>
              <li>กดไอคอน 🔒 ที่ URL bar แล้วเปิดกล้อง</li>
              <li>ลอง refresh หน้าเว็บ</li>
              <li>ปิดแอปอื่นที่ใช้กล้องอยู่</li>
            </ul>
          </div>
          
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              initializePose();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            🔄 ลองอีกครั้ง
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
        className={`${fullscreen ? 'max-w-full max-h-full' : 'w-full h-auto rounded-lg shadow-lg'}`}
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
