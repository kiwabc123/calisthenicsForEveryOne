'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import PoseCamera, { PoseCameraRef } from '@/components/PoseCamera';
import { PoseLandmark, FormAnalysis } from '@/types/exercise';
import { analyzePlankForm, PlankTracker, PlankVariation } from '@/lib/plankAnalyzer';
import MuscleMap, { MuscleLegend } from '@/components/MuscleMap';

// Variation descriptions
const VARIATIONS: { id: PlankVariation; label: string; emoji: string; description: string }[] = [
  { id: 'high', label: 'High Plank', emoji: '🙌', description: 'แขนตรง แพลงค์พื้นฐาน' },
  { id: 'low', label: 'Low Plank', emoji: '💪', description: 'งอข้อศอก เน้น Core มากขึ้น' },
  { id: 'side', label: 'Side Plank', emoji: '🔄', description: 'แพลงค์ด้านข้าง เน้นเฉียง' },
];

export default function PlankPage() {
  const [isActive, setIsActive] = useState(false);
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [targetTime, setTargetTime] = useState<number>(30);
  const [variation, setVariation] = useState<PlankVariation>('high');
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultReason, setResultReason] = useState<'failed' | 'timeout' | 'success' | 'manual' | null>(null);
  const [bestTime, setBestTime] = useState(0);
  
  const trackerRef = useRef(new PlankTracker());
  const poseCameraRef = useRef<PoseCameraRef>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update timer display
  useEffect(() => {
    if (isActive) {
      timerIntervalRef.current = setInterval(() => {
        setCurrentTime(trackerRef.current.getCurrentHoldTime());
      }, 100);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isActive]);

  const handlePoseDetected = useCallback((landmarks: PoseLandmark[]) => {
    const formAnalysis = analyzePlankForm(landmarks, trackerRef.current.getVariation());
    setAnalysis(formAnalysis);

    // Check if should stop
    const { shouldStop, reason } = trackerRef.current.update(formAnalysis);
    if (shouldStop) {
      handleStop(reason || 'failed');
    }
  }, []);

  const handleRecordingComplete = useCallback((videoBlob: Blob) => {
    setRecordedVideo(videoBlob);
  }, []);

  const handleStart = (startFullscreen = true) => {
    trackerRef.current.setTargetTime(targetTime);
    trackerRef.current.setVariation(variation);
    trackerRef.current.reset();
    setCurrentTime(0);
    setAnalysis(null);
    setRecordedVideo(null);
    setResultReason(null);
    
    if (startFullscreen) {
      setIsFullscreen(true);
    }
    
    setIsActive(true);
    setIsRecording(true);
    
    // Start recording
    setTimeout(() => {
      poseCameraRef.current?.startRecording();
    }, 500);
  };

  const handleStop = (reason: 'failed' | 'timeout' | 'success' | 'manual' = 'manual') => {
    const finalTime = trackerRef.current.getCurrentHoldTime();
    setBestTime(trackerRef.current.getBestHoldTime());
    setCurrentTime(finalTime);
    setResultReason(reason);
    
    // Stop recording
    if (poseCameraRef.current?.isRecording) {
      poseCameraRef.current.stopRecording();
    }
    
    setIsActive(false);
    setIsFullscreen(false);
    setIsRecording(false);
    setShowResultModal(true);
  };

  const handleReset = () => {
    trackerRef.current.reset();
    setCurrentTime(0);
    setAnalysis(null);
  };

  const handleDownloadVideo = () => {
    if (recordedVideo) {
      const url = URL.createObjectURL(recordedVideo);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plank-${new Date().toISOString().slice(0, 10)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
    }
    return `${secs}.${tenths}`;
  };

  const getResultMessage = () => {
    switch (resultReason) {
      case 'success':
        return { emoji: '🎉', title: 'ยอดเยี่ยม!', subtitle: 'ครบเวลาที่ตั้งไว้!' };
      case 'failed':
        return { emoji: '💪', title: 'Form ตก', subtitle: 'ลองใหม่อีกครั้ง!' };
      case 'manual':
        return { emoji: '⏹️', title: 'หยุดแล้ว', subtitle: 'บันทึกผลเรียบร้อย' };
      default:
        return { emoji: '🧘', title: 'Workout จบ', subtitle: '' };
    }
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return '🔥';
    if (score >= 60) return '👍';
    if (score >= 40) return '😐';
    return '⚠️';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* PERSISTENT CAMERA */}
      {isActive && (
        <div className={isFullscreen ? 'fixed inset-0 z-40 bg-black' : 'contents'}>
          <PoseCamera
            key="plank-camera"
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
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto">
            <button
              onClick={() => handleStop('manual')}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm"
            >
              ✕ จบ
            </button>
            
            {/* Variation + Recording indicator */}
            <div className="flex flex-col items-center gap-2">
              <span className="bg-teal-600/80 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm">
                {VARIATIONS.find(v => v.id === variation)?.emoji} {VARIATIONS.find(v => v.id === variation)?.label}
              </span>
              {isRecording && (
                <div className="bg-red-600/80 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-300 rounded-full animate-pulse" />
                  <span className="text-white text-sm">REC</span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg backdrop-blur-sm"
            >
              ⛶ ย่อ
            </button>
          </div>

          {/* Large Timer - center */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-12 py-6 text-center">
              <div className="text-8xl font-mono font-bold text-white">
                {formatTime(currentTime)}
              </div>
              <div className="text-2xl text-gray-400 mt-2">
                เป้าหมาย: {formatTime(targetTime * 1000)}
              </div>
              
              {/* Progress bar */}
              <div className="mt-4 bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    currentTime >= targetTime * 1000 ? 'bg-green-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${Math.min((currentTime / (targetTime * 1000)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Form Score - bottom right */}
          <div className="absolute right-4 bottom-20 max-w-xs">
            {analysis && (
              <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{getScoreEmoji(analysis.score)}</span>
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
            )}
          </div>

          {/* Phase indicator - bottom center */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <PhaseIndicator phase={analysis?.phase || 'not-detected'} />
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl max-w-lg w-full p-6">
            <div className="text-center mb-4">
              <div className="text-6xl mb-2">{getResultMessage().emoji}</div>
              <h2 className="text-2xl font-bold">{getResultMessage().title}</h2>
              <p className="text-gray-400">{getResultMessage().subtitle}</p>
            </div>
            
            {/* Variation badge */}
            <div className="flex justify-center mb-4">
              <span className="bg-teal-600/30 text-teal-300 px-3 py-1 rounded-full text-sm">
                {VARIATIONS.find(v => v.id === variation)?.emoji} {VARIATIONS.find(v => v.id === variation)?.label}
              </span>
            </div>
            
            {/* Stats */}
            <div className="bg-gray-900 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-4xl font-mono font-bold text-green-400">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-gray-400 text-sm">เวลาที่ทำได้</div>
                </div>
                <div>
                  <div className="text-4xl font-mono font-bold text-blue-400">
                    {formatTime(targetTime * 1000)}
                  </div>
                  <div className="text-gray-400 text-sm">เป้าหมาย</div>
                </div>
              </div>
              
              {bestTime > 0 && (
                <div className="mt-4 text-center border-t border-gray-700 pt-4">
                  <div className="text-2xl font-mono text-yellow-400">
                    🏆 Best: {formatTime(bestTime)}
                  </div>
                </div>
              )}
            </div>
            
            {/* Video Preview */}
            {recordedVideo && (
              <div className="mb-4">
                <video
                  src={URL.createObjectURL(recordedVideo)}
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: '200px' }}
                />
              </div>
            )}
            
            {/* Actions */}
            <div className="flex flex-col gap-3">
              {recordedVideo && (
                <button
                  onClick={handleDownloadVideo}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                >
                  📥 ดาวน์โหลดวิดีโอ
                </button>
              )}
              <button
                onClick={() => {
                  setShowResultModal(false);
                  handleStart(true);
                }}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
              >
                🔄 ลองอีกครั้ง
              </button>
              <button
                onClick={() => setShowResultModal(false)}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🧘 Plank</h1>
              <p className="text-gray-400 text-sm">ฝึกแพลงค์ - หยุดอัตโนมัติเมื่อ Form ตก</p>
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
              {isActive && !isFullscreen ? (
                <div className="relative">
                  <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">กำลังแสดง...</p>
                  </div>
                  
                  {/* Mini overlay */}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                    <span className="text-3xl font-mono font-bold">{formatTime(currentTime)}</span>
                  </div>
                  
                  {analysis && (
                    <div className="absolute top-2 right-2">
                      <PhaseIndicator phase={analysis.phase} small />
                    </div>
                  )}
                </div>
              ) : !isActive ? (
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    {/* Muscle Map */}
                    <div className="flex justify-center gap-2 mb-4">
                      <MuscleMap exercise="plank" view="front" size="md" />
                      <MuscleMap exercise="plank" view="back" size="md" />
                    </div>
                    <MuscleLegend className="justify-center text-gray-400 mb-4" />
                    
                    <p className="text-gray-400 mb-4">เลือกรูปแบบและเวลาที่ต้องการฝึก</p>
                    
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
                            className={`px-4 py-3 rounded-lg text-center transition-all ${
                              variation === v.id
                                ? 'bg-teal-600 text-white ring-2 ring-teal-400'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <div className="text-2xl mb-1">{v.emoji}</div>
                            <div className="font-medium">{v.label}</div>
                            <div className="text-xs text-gray-400">{v.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Time selector */}
                    <div className="mb-6">
                      <label className="text-gray-400 text-sm block mb-3">
                        เป้าหมาย:
                      </label>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {[15, 30, 45, 60, 90, 120].map((time) => (
                          <button
                            key={time}
                            onClick={() => setTargetTime(time)}
                            className={`px-4 py-2 rounded-lg text-lg ${
                              targetTime === time
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {time < 60 ? `${time}s` : `${time / 60}m`}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Warning */}
                    <div className="mb-4 bg-yellow-900/30 border border-yellow-700 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                      <span className="text-yellow-300 text-sm">
                        ⚠️ จะหยุดอัตโนมัติเมื่อ Form ตก
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleStart(true)}
                        className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white text-lg font-semibold rounded-lg transition-colors"
                      >
                        🎥 เริ่มฝึก (เต็มจอ)
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
              ) : null}

              {/* Controls */}
              {isActive && !isFullscreen && (
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                  >
                    ⛶ เต็มจอ
                  </button>
                  <button
                    onClick={() => handleStop('manual')}
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
              <h3 className="text-lg font-semibold mb-2">💡 เคล็ดลับท่า Plank</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <strong>High Plank:</strong> แขนตรง มืออยู่ใต้ไหล่</li>
                <li>• <strong>Low Plank:</strong> งอข้อศอก 90 องศา แขนขนานกับพื้น</li>
                <li>• <strong>รักษาลำตัวตรง</strong> ไม่ยกก้นสูง ไม่ให้สะโพกตก</li>
                <li>• เกร็งหน้าท้องตลอดเวลา</li>
                <li>• ตั้งกล้องให้เห็นตัวด้านข้าง</li>
              </ul>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            {/* Timer Card */}
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <h3 className="text-gray-400 text-sm uppercase tracking-wide mb-2">
                เวลา
              </h3>
              <div className="relative">
                <span className={`text-5xl font-mono font-bold ${currentTime >= targetTime * 1000 ? 'text-green-400' : 'text-white'}`}>
                  {formatTime(currentTime)}
                </span>
              </div>
              <div className="text-gray-500 mt-2">
                เป้าหมาย: {formatTime(targetTime * 1000)}
              </div>
              
              {/* Progress */}
              <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      currentTime >= targetTime * 1000 ? 'bg-green-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min((currentTime / (targetTime * 1000)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Form Analysis */}
            {analysis && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-gray-400 text-sm uppercase tracking-wide mb-3">
                  วิเคราะห์ Form
                </h3>
                
                {/* Score */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-4xl">{getScoreEmoji(analysis.score)}</span>
                  <span className={`text-5xl font-bold ${getScoreColor(analysis.score)}`}>
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

            {/* Best Time */}
            {bestTime > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <h3 className="text-gray-400 text-sm uppercase tracking-wide mb-2">
                  🏆 Personal Best
                </h3>
                <div className="text-3xl font-mono font-bold text-yellow-400">
                  {formatTime(bestTime)}
                </div>
              </div>
            )}
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
      case 'holding':
        return { label: 'Holding', color: 'bg-green-500', emoji: '✓' };
      case 'falling':
        return { label: 'Form ตก!', color: 'bg-red-500', emoji: '⚠️' };
      default:
        return { label: 'รอท่า', color: 'bg-gray-500', emoji: '⏳' };
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
