'use client';

import { useState, useCallback, useRef } from 'react';
import PoseCamera from '@/components/PoseCamera';
import FeedbackPanel from '@/components/FeedbackPanel';
import RepCounter from '@/components/RepCounter';
import { PoseLandmark, FormAnalysis } from '@/types/exercise';
import { analyzePushUpForm, PushUpRepCounter } from '@/lib/pushUpAnalyzer';
import { getElbowAngle } from '@/lib/poseDetection';

export default function PushUpPage() {
  const [isActive, setIsActive] = useState(false);
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [targetReps, setTargetReps] = useState<number>(10);
  
  const repCounterRef = useRef(new PushUpRepCounter());

  const handlePoseDetected = useCallback((landmarks: PoseLandmark[]) => {
    // Get elbow angles for smoothing and rep validation
    const leftElbow = getElbowAngle(landmarks, 'left');
    const rightElbow = getElbowAngle(landmarks, 'right');
    const avgElbow = leftElbow !== null && rightElbow !== null 
      ? (leftElbow + rightElbow) / 2 
      : leftElbow ?? rightElbow;
    
    // Get smoothed values from rep counter
    const smoothedElbow = repCounterRef.current.getSmoothedElbow(avgElbow);
    const elbowVelocity = repCounterRef.current.getElbowVelocity();

    // Analyze the push-up form with smoothed data
    const formAnalysis = analyzePushUpForm(landmarks, smoothedElbow, elbowVelocity ?? undefined);
    setAnalysis(formAnalysis);

    // Update rep count with elbow angle for validation
    const newRep = repCounterRef.current.update(formAnalysis.phase, avgElbow);
    if (newRep) {
      setRepCount(repCounterRef.current.getCount());
    }
  }, []);

  const handleStart = () => {
    repCounterRef.current.reset();
    setRepCount(0);
    setAnalysis(null);
    setIsActive(true);
  };

  const handleStop = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    repCounterRef.current.reset();
    setRepCount(0);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Push-up วิดพื้น</h1>
              <p className="text-gray-400 text-sm">วิเคราะห์ท่าแบบ Real-time</p>
            </div>
            <a 
              href="/"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← กลับหน้าหลัก
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Camera section */}
          <div className="md:col-span-2">
            <div className="bg-gray-800 rounded-lg p-4">
              {isActive ? (
                <PoseCamera
                  onPoseDetected={handlePoseDetected}
                  isActive={isActive}
                />
              ) : (
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🏋️</div>
                    <p className="text-gray-400 mb-4">พร้อมที่จะเริ่มหรือยัง?</p>
                    
                    {/* Target reps selector */}
                    <div className="mb-4">
                      <label className="text-gray-400 text-sm block mb-2">
                        เป้าหมาย:
                      </label>
                      <div className="flex items-center justify-center gap-2">
                        {[5, 10, 15, 20, 30].map((num) => (
                          <button
                            key={num}
                            onClick={() => setTargetReps(num)}
                            className={`px-3 py-1 rounded ${
                              targetReps === num
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleStart}
                      className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-lg transition-colors"
                    >
                      🎥 เริ่มออกกำลังกาย
                    </button>
                  </div>
                </div>
              )}

              {/* Controls */}
              {isActive && (
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={handleStop}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    ⏹️ หยุด
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  >
                    🔄 รีเซ็ต
                  </button>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">💡 เคล็ดลับ Push-up ที่ถูกต้อง</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• วางมือกว้างกว่าไหล่เล็กน้อย</li>
                <li>• รักษาลำตัวให้ตรงเป็นเส้นตรง ไม่ยกสะโพก ไม่ตกสะโพก</li>
                <li>• งอข้อศอกประมาณ 90 องศาตอนลง</li>
                <li>• ยืดแขนให้สุดตอนขึ้น</li>
                <li>• หายใจเข้าตอนลง หายใจออกตอนดันขึ้น</li>
              </ul>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            <RepCounter count={repCount} targetReps={targetReps} />
            <FeedbackPanel analysis={analysis} />
          </div>
        </div>
      </main>
    </div>
  );
}
