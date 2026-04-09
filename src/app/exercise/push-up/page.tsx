'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import PoseCamera, { PoseCameraRef } from '@/components/PoseCamera';
import { PoseLandmark, FormAnalysis } from '@/types/exercise';
import { analyzePushUpForm, PushUpRepCounter } from '@/lib/pushUpAnalyzer';
import { getElbowAngle } from '@/lib/poseDetection';

export default function PushUpPage() {
  const [isActive, setIsActive] = useState(false);
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [targetReps, setTargetReps] = useState<number>(10);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRepQuality, setLastRepQuality] = useState<'good' | 'partial' | 'none'>('none');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [finalRepCount, setFinalRepCount] = useState(0);
  
  const repCounterRef = useRef(new PushUpRepCounter());
  const containerRef = useRef<HTMLDivElement>(null);
  const poseCameraRef = useRef<PoseCameraRef>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for orientation changes
  useEffect(() => {
    const handleResize = () => {
      if (isActive && window.innerWidth > window.innerHeight) {
        setIsFullscreen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive]);

  // Workout duration timer
  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setWorkoutDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive]);

  const handlePoseDetected = useCallback((landmarks: PoseLandmark[]) => {
    const leftElbow = getElbowAngle(landmarks, 'left');
    const rightElbow = getElbowAngle(landmarks, 'right');
    const avgElbow = leftElbow !== null && rightElbow !== null 
      ? (leftElbow + rightElbow) / 2 
      : leftElbow ?? rightElbow;
    
    const smoothedElbow = repCounterRef.current.getSmoothedElbow(avgElbow);
    const elbowVelocity = repCounterRef.current.getElbowVelocity();

    const formAnalysis = analyzePushUpForm(landmarks, smoothedElbow, elbowVelocity ?? undefined);
    setAnalysis(formAnalysis);

    const newRep = repCounterRef.current.update(formAnalysis.phase, avgElbow);
    if (newRep) {
      setRepCount(repCounterRef.current.getCount());
      setLastRepQuality(repCounterRef.current.getLastRepQuality());
    }
  }, []);

  const handleRecordingComplete = useCallback((videoBlob: Blob) => {
    setRecordedVideo(videoBlob);
    setShowVideoModal(true);
  }, []);

  const handleStart = () => {
    repCounterRef.current.reset();
    setRepCount(0);
    setAnalysis(null);
    setLastRepQuality('none');
    setWorkoutDuration(0);
    setRecordedVideo(null);
    setIsActive(true);
    setIsRecording(true);
    
    // Start recording after a short delay to let camera initialize
    setTimeout(() => {
      poseCameraRef.current?.startRecording();
    }, 500);
  };

  const handleStop = () => {
    setFinalRepCount(repCount);
    
    // Stop recording first
    if (poseCameraRef.current?.isRecording) {
      poseCameraRef.current.stopRecording();
    }
    
    setIsActive(false);
    setIsFullscreen(false);
    setIsRecording(false);
  };

  const handleReset = () => {
    repCounterRef.current.reset();
    setRepCount(0);
    setAnalysis(null);
    setLastRepQuality('none');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownloadVideo = () => {
    if (recordedVideo) {
      const url = URL.createObjectURL(recordedVideo);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pushup-workout-${new Date().toISOString().slice(0, 10)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fullscreen workout mode
  if (isActive && isFullscreen) {
    return (
      <div ref={containerRef} className="fixed inset-0 bg-black z-50">
        {/* Camera fills entire screen */}
        <PoseCamera
          ref={poseCameraRef}
          onPoseDetected={handlePoseDetected}
          isActive={isActive}
          fullscreen={true}
          onRecordingComplete={handleRecordingComplete}
        />
        
        {/* Overlay UI */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top bar with controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto">
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm"
            >
              ✕ จบ
            </button>
            
            {/* Duration display */}
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
              {isRecording && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
              <span className="text-white font-mono text-lg">{formatDuration(workoutDuration)}</span>
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg backdrop-blur-sm"
            >
              ⛶ ย่อ
            </button>
          </div>

          {/* Large Rep Counter - center top */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-8 py-4 text-center">
              <div className="text-7xl font-bold text-white">
                {repCount}
                <span className="text-3xl text-gray-400">/{targetReps}</span>
              </div>
              {lastRepQuality === 'good' && repCount > 0 && (
                <div className="text-green-400 text-lg mt-1">🔥 Perfect!</div>
              )}
              {lastRepQuality === 'partial' && repCount > 0 && (
                <div className="text-yellow-400 text-lg mt-1">👍 Good</div>
              )}
            </div>
          </div>

          {/* Phase indicator - left side */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <PhaseIndicator phase={analysis?.phase || 'transition'} />
          </div>

          {/* Score & Feedback - right side */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 max-w-xs">
            <CompactFeedback analysis={analysis} />
          </div>

          {/* Progress bar - bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  repCount >= targetReps ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((repCount / targetReps) * 100, 100)}%` }}
              />
            </div>
            {repCount >= targetReps && (
              <div className="text-center text-green-400 text-2xl mt-2 animate-bounce">
                🎉 ครบเป้าหมายแล้ว!
              </div>
            )}
          </div>

          {/* Reset button - bottom left */}
          <div className="absolute bottom-12 left-4 pointer-events-auto">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg backdrop-blur-sm"
            >
              🔄 รีเซ็ต
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Video Download Modal */}
      {showVideoModal && recordedVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">🎉 Workout สำเร็จ!</h2>
            
            {/* Summary */}
            <div className="bg-gray-900 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-4xl font-bold text-green-400">{finalRepCount}</div>
                  <div className="text-gray-400 text-sm">ครั้ง</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-blue-400">{formatDuration(workoutDuration)}</div>
                  <div className="text-gray-400 text-sm">เวลา</div>
                </div>
              </div>
            </div>
            
            {/* Video Preview */}
            <div className="mb-4">
              <video
                src={URL.createObjectURL(recordedVideo)}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: '300px' }}
              />
            </div>
            
            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDownloadVideo}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                📥 ดาวน์โหลดวิดีโอ
              </button>
              <button
                onClick={() => setShowVideoModal(false)}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold"
              >
                ปิด
              </button>
            </div>
            
            <p className="text-gray-500 text-sm text-center mt-4">
              วิดีโอจะถูกบันทึกในรูปแบบ WebM
            </p>
          </div>
        </div>
      )}

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
                <div className="relative">
                  <PoseCamera
                    ref={poseCameraRef}
                    onPoseDetected={handlePoseDetected}
                    isActive={isActive}
                    onRecordingComplete={handleRecordingComplete}
                  />
                  
                  {/* Mini overlay feedback */}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                    {isRecording && (
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                    <span className="text-3xl font-bold">{repCount}</span>
                    <span className="text-gray-400">/{targetReps}</span>
                  </div>
                  
                  {/* Duration */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-white font-mono">{formatDuration(workoutDuration)}</span>
                  </div>
                  
                  <div className="absolute top-2 right-2">
                    <PhaseIndicator phase={analysis?.phase || 'transition'} small />
                  </div>
                  
                  {analysis && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <ScoreBar score={analysis.score} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🏋️</div>
                    <p className="text-gray-400 mb-4">พร้อมที่จะเริ่มหรือยัง?</p>
                    
                    {/* Recording notice */}
                    <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="text-red-300 text-sm">จะบันทึกวิดีโออัตโนมัติ</span>
                    </div>
                    
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
                    onClick={toggleFullscreen}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    ⛶ เต็มจอ (Landscape)
                  </button>
                  <button
                    onClick={handleStop}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    ⏹️ หยุด {isRecording && <span className="text-xs">(บันทึกวิดีโอ)</span>}
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
              <h3 className="text-lg font-semibold mb-2">💡 เคล็ดลับ</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <strong>ตั้งกล้องแนวนอน</strong> ให้เห็นตัวด้านข้าง</li>
                <li>• กด <strong>"เต็มจอ"</strong> เพื่อดู feedback ได้ง่ายขึ้น</li>
                <li>• <strong>วิดีโอจะถูกบันทึก</strong> เพื่อทบทวน form ภายหลัง</li>
                <li>• รักษาลำตัวให้ตรงเป็นเส้นตรง</li>
                <li>• งอข้อศอกประมาณ 90 องศาตอนลง</li>
              </ul>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            {/* Rep Counter Card */}
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <h3 className="text-gray-400 text-sm uppercase tracking-wide mb-2">
                จำนวนครั้ง
              </h3>
              <div className="relative">
                <span className={`text-6xl font-bold ${repCount >= targetReps ? 'text-green-400' : 'text-white'}`}>
                  {repCount}
                </span>
                <span className="text-2xl text-gray-500 ml-2">/ {targetReps}</span>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      repCount >= targetReps ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min((repCount / targetReps) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  {repCount >= targetReps ? '🎉 ครบแล้ว!' : `เหลืออีก ${targetReps - repCount} ครั้ง`}
                </p>
              </div>
            </div>

            {/* Feedback Panel */}
            <div className="bg-gray-800 rounded-lg p-4">
              {analysis ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getScoreEmoji(analysis.score)}</span>
                      <span className={`text-3xl font-bold ${getScoreColor(analysis.score)}`}>
                        {analysis.score}
                      </span>
                      <span className="text-gray-400 text-sm">/100</span>
                    </div>
                    <PhaseIndicator phase={analysis.phase} small />
                  </div>
                  
                  <div className="space-y-2">
                    {analysis.feedback.map((fb, i) => (
                      <div
                        key={i}
                        className={`px-3 py-2 rounded text-sm ${
                          fb.type === 'error' ? 'bg-red-900/50 text-red-300' :
                          fb.type === 'warning' ? 'bg-yellow-900/50 text-yellow-300' :
                          fb.type === 'success' ? 'bg-green-900/50 text-green-300' :
                          'bg-blue-900/50 text-blue-300'
                        }`}
                      >
                        {fb.type === 'error' && '❌ '}
                        {fb.type === 'warning' && '⚠️ '}
                        {fb.type === 'success' && '✅ '}
                        {fb.type === 'info' && 'ℹ️ '}
                        {fb.message}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-center py-4">
                  <p>รอตรวจจับท่าทาง...</p>
                  <p className="text-sm mt-2">ยืนให้กล้องเห็นร่างกายด้านข้าง</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper components
function PhaseIndicator({ phase, small = false }: { phase: string; small?: boolean }) {
  const config = {
    up: { icon: '⬆️', text: 'ขึ้น', color: 'bg-green-600' },
    down: { icon: '⬇️', text: 'ลง', color: 'bg-blue-600' },
    transition: { icon: '↔️', text: 'เปลี่ยน', color: 'bg-gray-600' },
  }[phase] || { icon: '↔️', text: 'รอ', color: 'bg-gray-600' };

  if (small) {
    return (
      <div className={`${config.color} backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-1`}>
        <span>{config.icon}</span>
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    );
  }

  return (
    <div className={`${config.color}/80 backdrop-blur-sm rounded-2xl px-6 py-4 text-center`}>
      <div className="text-4xl mb-1">{config.icon}</div>
      <div className="text-xl font-bold">{config.text}</div>
    </div>
  );
}

function CompactFeedback({ analysis }: { analysis: FormAnalysis | null }) {
  if (!analysis) return null;

  const mainFeedback = analysis.feedback.find(f => f.type === 'error') 
    || analysis.feedback.find(f => f.type === 'warning')
    || analysis.feedback[0];

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4">
      {/* Score */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-3xl">{getScoreEmoji(analysis.score)}</span>
        <span className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
          {analysis.score}
        </span>
      </div>
      
      {/* Main feedback message */}
      {mainFeedback && (
        <div className={`text-lg ${
          mainFeedback.type === 'error' ? 'text-red-400' :
          mainFeedback.type === 'warning' ? 'text-yellow-400' :
          'text-green-400'
        }`}>
          {mainFeedback.message}
        </div>
      )}
      
      {/* Status */}
      <div className={`mt-2 text-sm ${analysis.isCorrect ? 'text-green-400' : 'text-orange-400'}`}>
        {analysis.isCorrect ? '✅ ท่าถูกต้อง' : '⚡ ปรับปรุงได้'}
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-full p-1">
      <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            score >= 80 ? 'bg-green-500' :
            score >= 60 ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

function getScoreEmoji(score: number) {
  if (score >= 90) return '🔥';
  if (score >= 80) return '💪';
  if (score >= 60) return '👍';
  return '💡';
}
