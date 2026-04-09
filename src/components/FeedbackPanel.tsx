'use client';

import { FormAnalysis, FormFeedback } from '@/types/exercise';

interface FeedbackPanelProps {
  analysis: FormAnalysis | null;
}

export default function FeedbackPanel({ analysis }: FeedbackPanelProps) {
  if (!analysis) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-gray-400 text-center">
        <p>รอตรวจจับท่าทาง...</p>
        <p className="text-sm mt-2">ยืนให้กล้องเห็นร่างกายทั้งตัว</p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🔥';
    if (score >= 80) return '💪';
    if (score >= 60) return '👍';
    return '💡';
  };

  const getPhaseText = (phase: string) => {
    switch (phase) {
      case 'up': return '⬆️ ขึ้น';
      case 'down': return '⬇️ ลง';
      case 'hold': return '⏸️ ค้าง';
      default: return '↔️ เปลี่ยน';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* Score display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getScoreEmoji(analysis.score)}</span>
          <span className={`text-3xl font-bold ${getScoreColor(analysis.score)}`}>
            {analysis.score}
          </span>
          <span className="text-gray-400 text-sm">/100</span>
        </div>
        <div className="text-lg text-gray-300">
          {getPhaseText(analysis.phase)}
        </div>
      </div>

      {/* Feedback list */}
      <div className="space-y-2">
        {analysis.feedback.length === 0 ? (
          <p className="text-gray-400 text-center py-2">
            {analysis.isCorrect ? 'ทำได้ดี! 👏' : 'รอวิเคราะห์...'}
          </p>
        ) : (
          analysis.feedback.map((feedback, index) => (
            <FeedbackItem key={index} feedback={feedback} />
          ))
        )}
      </div>

      {/* Overall status */}
      <div className={`mt-4 p-2 rounded text-center ${
        analysis.isCorrect 
          ? 'bg-green-900/50 text-green-300' 
          : 'bg-orange-900/50 text-orange-300'
      }`}>
        {analysis.isCorrect ? '✅ ท่าถูกต้อง' : '⚡ ปรับปรุงได้'}
      </div>
    </div>
  );
}

function FeedbackItem({ feedback }: { feedback: FormFeedback }) {
  const getIcon = () => {
    switch (feedback.type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getStyle = () => {
    switch (feedback.type) {
      case 'success': return 'bg-green-900/30 border-green-600 text-green-300';
      case 'warning': return 'bg-yellow-900/30 border-yellow-600 text-yellow-300';
      case 'error': return 'bg-red-900/30 border-red-600 text-red-300';
      default: return 'bg-gray-700 border-gray-600 text-gray-300';
    }
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded border-l-4 ${getStyle()}`}>
      <span>{getIcon()}</span>
      <span className="flex-1">{feedback.message}</span>
      {feedback.bodyPart && (
        <span className="text-xs opacity-70">({feedback.bodyPart})</span>
      )}
    </div>
  );
}
