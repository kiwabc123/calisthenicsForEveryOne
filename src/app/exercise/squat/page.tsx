'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import PoseCamera, { PoseCameraRef } from '@/components/PoseCamera';
import { PoseLandmark, FormAnalysis } from '@/types/exercise';
import { analyzeSquatForm, SquatRepCounter, SquatVariation, getKneeAngle } from '@/lib/squatAnalyzer';
import { 
  unlockAudio, 
  feedbackRepComplete, 
  feedbackGoalReached, 
  feedbackBadForm,
  setSoundSettings
} from '@/lib/sounds';

// Variation descriptions
const VARIATIONS: { id: SquatVariation; label: string; emoji: string; description: string }[] = [
  { id: 'standard', label: 'ปกติ', emoji: '🦵', description: 'สควอทพื้นฐาน ขากว้างเท่าไหล่' },
  { id: 'sumo', label: 'Sumo', emoji: '🏋️', description: 'ขากว้าง ปลายเท้าชี้ออก' },
  { id: 'narrow', label: 'แคบ', emoji: '🎯', description: 'ขาชิดกัน เน้นหน้าขา' },
  { id: 'goblet', label: 'Goblet', emoji: '🏆', description: 'ถือน้ำหนักหน้าอก' },
];

export default function SquatPage() {
  const [isActive, setIsActive] = useState(false);
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [targetReps, setTargetReps] = useState<number>(15);
  const [variation, setVariation] = useState<SquatVariation>('standard');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRepQuality, setLastRepQuality] = useState<'good' | 'partial' | 'none'>('none');
  const [isRecording, setIsRecording] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [finalRepCount, setFinalRepCount] = useState(0);
  
  const repCounterRef = useRef(new SquatRepCounter());
  const poseCameraRef = useRef<PoseCameraRef>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const goalAnnouncedRef = useRef(false);

  // Unlock audio on mount
  useEffect(() => {
    unlockAudio();
  }, []);

  // Sync sound settings
  useEffect(() => {
    setSoundSettings({ enabled: soundEnabled, voiceEnabled: soundEnabled });
  }, [soundEnabled]);

  // Update variation in counter
  useEffect(() => {
    repCounterRef.current.setVariation(variation);
  }, [variation]);

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
    const leftKnee = getKneeAngle(landmarks, 'left');
    const rightKnee = getKneeAngle(landmarks, 'right');
    const avgKnee = leftKnee !== null && rightKnee !== null 
      ? (leftKnee + rightKnee) / 2 
      : leftKnee ?? rightKnee;
    
    const smoothedKnee = repCounterRef.current.getSmoothedKnee(avgKnee);
    const kneeVelocity = repCounterRef.current.getKneeVelocity();

    const formAnalysis = analyzeSquatForm(landmarks, smoothedKnee, kneeVelocity ?? undefined, variation);
    setAnalysis(formAnalysis);

    const newRep = repCounterRef.current.update(formAnalysis.phase, avgKnee);
    if (newRep) {
      const count = repCounterRef.current.getCount();
      const quality = repCounterRef.current.getLastRepQuality();
      setRepCount(count);
      setLastRepQuality(quality);
      
      // Sound feedback for rep
      feedbackRepComplete(quality);
      
      // Check if goal reached
      if (count >= targetReps && !goalAnnouncedRef.current) {
        goalAnnouncedRef.current = true;
        setTimeout(() => feedbackGoalReached(), 300);
      }
    }

    // Bad form feedback
    if (formAnalysis.phase === 'down' && formAnalysis.score < 60) {
      const messages = formAnalysis.feedback.map(f => f.message);
      if (messages.some((m: string) => m.includes('เข่า') && m.includes('ล้ำ'))) {
        feedbackBadForm('notLowEnough');
      } else if (messages.some((m: string) => m.includes('หลัง'))) {
        feedbackBadForm('backNotStraight');
      }
    }
  }, [variation, targetReps]);

  const handleRecordingComplete = useCallback((videoBlob: Blob) => {
    setRecordedVideo(videoBlob);
    setShowVideoModal(true);
  }, []);

  const handleStart = (startFullscreen = false) => {
    repCounterRef.current.reset();
    repCounterRef.current.setVariation(variation);
    setRepCount(0);
    setAnalysis(null);
    setLastRepQuality('none');
    setWorkoutDuration(0);
    setRecordedVideo(null);
    
    if (startFullscreen) {
      setIsFullscreen(true);
    }
    
    setIsActive(true);
    setIsRecording(true);
    
    setTimeout(() => {
      poseCameraRef.current?.startRecording();
    }, 500);
  };

  const handleStop = () => {
    setFinalRepCount(repCount);
    
    if (poseCameraRef.current?.isRecording) {
      poseCameraRef.current.stopRecording();
    } else {
      setShowVideoModal(true);
    }
    
    setIsActive(false);
    setIsFullscreen(false);
    setIsRecording(false);
  };

  const toggleFullscreen = () => {
    if (isRecording) {
      const confirmed = window.confirm(
        'การเปลี่ยนโหมดเต็มจออาจทำให้วิดีโอหยุดบันทึก ต้องการดำเนินการต่อหรือไม่?'
      );
      if (!confirmed) return;
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleReset = () => {
    repCounterRef.current.reset();
    setRepCount(0);
    setAnalysis(null);
    setLastRepQuality('none');
    // Reset timer
    setWorkoutDuration(0);
    startTimeRef.current = Date.now();
    // Reset goal announcement
    goalAnnouncedRef.current = false;
  };

  const handleDownloadVideo = () => {
    if (recordedVideo) {
      const url = URL.createObjectURL(recordedVideo);
      const a = document.createElement('a');
      a.href = url;
      a.download = `squat-workout-${new Date().toISOString().slice(0, 10)}.webm`;
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* PERSISTENT CAMERA */}
      {isActive && (
        <div 
          className={
            isFullscreen 
              ? 'fixed inset-0 z-40 bg-black' 
              : 'contents'
          }
        >
          <PoseCamera
            key="squat-camera"
            ref={poseCameraRef}
            onPoseDetected={handlePoseDetected}
            isActive={isActive}
            fullscreen={isFullscreen}
            onRecordingComplete={handleRecordingComplete}
          />
        </div>
      )}
      
      {/* Fullscreen Overlay UI */}
      {isActive && isFullscreen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Top bar with controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto">
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm"
            >
              ✕ จบ
            </button>
            
            {/* Variation + Duration display */}
            <div className="flex flex-col items-center gap-2">
              <span className="bg-orange-600/80 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm">
                {VARIATIONS.find(v => v.id === variation)?.emoji} {VARIATIONS.find(v => v.id === variation)?.label}
              </span>
              <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
                {isRecording && (
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
                <span className="text-white font-mono text-lg">{formatDuration(workoutDuration)}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-4 py-2 rounded-lg backdrop-blur-sm ${
                  soundEnabled 
                    ? 'bg-green-600/80 hover:bg-green-600' 
                    : 'bg-gray-800/80 hover:bg-gray-700'
                } text-white`}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg backdrop-blur-sm"
              >
                ⛶ ย่อ
              </button>
            </div>
          </div>

          {/* Large Rep Counter - center top */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-8 py-4 text-center">
              <div className="text-7xl font-bold text-white">
                {repCount}
                <span className="text-3xl text-gray-400">/{targetReps}</span>
              </div>
              {lastRepQuality === 'good' && repCount > 0 && (
                <div className="text-green-400 text-lg mt-1">🔥 Deep Squat!</div>
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
                  repCount >= targetReps ? 'bg-green-500' : 'bg-orange-500'
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
      )}

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">🎉 Workout สำเร็จ!</h2>
            
            {/* Variation badge */}
            <div className="flex justify-center mb-4">
              <span className="bg-orange-600/30 text-orange-300 px-3 py-1 rounded-full text-sm">
                {VARIATIONS.find(v => v.id === variation)?.emoji} {VARIATIONS.find(v => v.id === variation)?.label}
              </span>
            </div>
            
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
            {recordedVideo ? (
              <>
                <div className="mb-4">
                  <video
                    src={URL.createObjectURL(recordedVideo)}
                    controls
                    className="w-full rounded-lg"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
                
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
              </>
            ) : (
              <>
                <div className="mb-4 bg-gray-900/50 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-gray-400">ไม่มีวิดีโอ</p>
                </div>
                
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold"
                >
                  ตกลง
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🦵 Squat สควอท</h1>
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
                  {isFullscreen ? (
                    <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                      <p className="text-gray-400">กำลังแสดงแบบเต็มจอ...</p>
                    </div>
                  ) : (
                    <div className="aspect-video" />
                  )}
                  
                  {!isFullscreen && (
                    <>
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 z-10">
                        {isRecording && (
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                        <span className="text-3xl font-bold">{repCount}</span>
                        <span className="text-gray-400">/{targetReps}</span>
                      </div>
                      
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 z-10">
                        <span className="text-white font-mono">{formatDuration(workoutDuration)}</span>
                      </div>
                      
                      <div className="absolute top-2 right-2 z-10">
                        <PhaseIndicator phase={analysis?.phase || 'transition'} small />
                      </div>
                      
                      {analysis && (
                        <div className="absolute bottom-2 left-2 right-2 z-10">
                          <ScoreBar score={analysis.score} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🦵</div>
                    <p className="text-gray-400 mb-4">เลือกรูปแบบและจำนวนครั้ง</p>
                    
                    {/* Variation selector */}
                    <div className="mb-6">
                      <label className="text-gray-400 text-sm block mb-3">
                        รูปแบบ:
                      </label>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {VARIATIONS.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setVariation(v.id)}
                            className={`px-3 py-2 rounded-lg text-center transition-all ${
                              variation === v.id
                                ? 'bg-orange-600 text-white ring-2 ring-orange-400'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <div className="text-xl">{v.emoji}</div>
                            <div className="text-xs font-medium">{v.label}</div>
                          </button>
                        ))}
                      </div>
                      <p className="text-gray-500 text-xs mt-2">
                        {VARIATIONS.find(v => v.id === variation)?.description}
                      </p>
                    </div>
                    
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
                        {[10, 15, 20, 25, 30, 50].map((num) => (
                          <button
                            key={num}
                            onClick={() => setTargetReps(num)}
                            className={`px-3 py-1 rounded ${
                              targetReps === num
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleStart(true)}
                        className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white text-lg font-semibold rounded-lg transition-colors"
                      >
                        🎥 เริ่มแบบเต็มจอ (แนะนำ)
                      </button>
                      <button
                        onClick={() => handleStart(false)}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
                      >
                        เริ่มแบบปกติ
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Controls */}
              {isActive && !isFullscreen && (
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      soundEnabled 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-600 hover:bg-gray-500 text-white'
                    }`}
                    title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
                  >
                    {soundEnabled ? '🔊' : '🔇'}
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className={`px-6 py-2 rounded-lg transition-colors ${
                      isRecording 
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    }`}
                  >
                    ⛶ เต็มจอ {isRecording && '⚠️'}
                  </button>
                  <button
                    onClick={handleStop}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
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
              <h3 className="text-lg font-semibold mb-2">💡 เคล็ดลับ Squat</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <strong>ตั้งกล้องด้านข้าง</strong> ให้เห็นตัวทั้งตัว</li>
                <li>• ยืนขากว้างเท่าไหล่ ปลายเท้าชี้ออกเล็กน้อย</li>
                <li>• ย่อตัวลงได้ลึกพอ (ต้นขาขนานพื้นหรือต่ำกว่า)</li>
                <li>• รักษาหลังให้ตรง อย่าก้มมาก</li>
                <li>• เข่าไม่ควรล้มเข้าใน (Knee Cave)</li>
                <li>• ส้นเท้าติดพื้นตลอด</li>
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
                      repCount >= targetReps ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min((repCount / targetReps) * 100, 100)}%` }}
                  />
                </div>
              </div>
              {lastRepQuality !== 'none' && (
                <div className={`mt-2 text-sm ${
                  lastRepQuality === 'good' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {lastRepQuality === 'good' ? '🔥 Deep Squat!' : '👍 Good Rep'}
                </div>
              )}
            </div>

            {/* Form Analysis */}
            {analysis && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-gray-400 text-sm uppercase tracking-wide mb-3">
                  วิเคราะห์ Form
                </h3>
                
                {/* Score */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-4xl">
                    {analysis.score >= 80 ? '🔥' : analysis.score >= 60 ? '👍' : analysis.score >= 40 ? '😐' : '⚠️'}
                  </span>
                  <span className={`text-5xl font-bold ${
                    analysis.score >= 80 ? 'text-green-400' :
                    analysis.score >= 60 ? 'text-yellow-400' :
                    analysis.score >= 40 ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {analysis.score}
                  </span>
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  {analysis.feedback.map((fb, index) => (
                    <div
                      key={index}
                      className={`text-sm px-3 py-2 rounded ${
                        fb.type === 'error' ? 'bg-red-900/30 text-red-400' :
                        fb.type === 'warning' ? 'bg-yellow-900/30 text-yellow-400' :
                        fb.type === 'success' ? 'bg-green-900/30 text-green-400' :
                        'bg-blue-900/30 text-blue-400'
                      }`}
                    >
                      {fb.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duration */}
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <h3 className="text-gray-400 text-sm uppercase tracking-wide mb-2">
                เวลา
              </h3>
              <div className="text-3xl font-mono font-bold text-white">
                {formatDuration(workoutDuration)}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Phase indicator component
function PhaseIndicator({ phase, small = false }: { phase: string; small?: boolean }) {
  const getPhaseInfo = () => {
    switch (phase) {
      case 'down':
        return { label: 'ย่อตัว', color: 'bg-blue-500', emoji: '⬇️' };
      case 'up':
        return { label: 'ยืนขึ้น', color: 'bg-green-500', emoji: '⬆️' };
      default:
        return { label: 'เปลี่ยนท่า', color: 'bg-gray-500', emoji: '🔄' };
    }
  };

  const info = getPhaseInfo();
  
  if (small) {
    return (
      <div className={`${info.color} backdrop-blur-sm rounded-lg px-3 py-1`}>
        <span className="text-white text-sm font-medium">{info.emoji} {info.label}</span>
      </div>
    );
  }

  return (
    <div className={`${info.color}/80 backdrop-blur-sm rounded-xl px-6 py-3`}>
      <span className="text-white text-xl font-bold">{info.emoji} {info.label}</span>
    </div>
  );
}

// Score bar component
function ScoreBar({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-medium w-12">{score}</span>
        <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getColor()}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Compact feedback for fullscreen mode
function CompactFeedback({ analysis }: { analysis: FormAnalysis | null }) {
  if (!analysis) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 pointer-events-none">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-3xl">
          {analysis.score >= 80 ? '🔥' : analysis.score >= 60 ? '👍' : '😐'}
        </span>
        <span className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
          {analysis.score}
        </span>
      </div>
      
      {analysis.feedback.slice(0, 2).map((fb, i) => (
        <div key={i} className={`text-sm ${
          fb.type === 'error' ? 'text-red-400' :
          fb.type === 'warning' ? 'text-yellow-400' :
          fb.type === 'success' ? 'text-green-400' :
          'text-blue-400'
        }`}>
          {fb.message}
        </div>
      ))}
    </div>
  );
}
