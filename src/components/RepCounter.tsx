'use client';

interface RepCounterProps {
  count: number;
  targetReps?: number;
}

export default function RepCounter({ count, targetReps }: RepCounterProps) {
  const progress = targetReps ? (count / targetReps) * 100 : 0;
  const isComplete = targetReps ? count >= targetReps : false;

  return (
    <div className="bg-gray-800 rounded-lg p-6 text-center">
      <h3 className="text-gray-400 text-sm uppercase tracking-wide mb-2">
        จำนวนครั้ง
      </h3>
      
      <div className="relative">
        <span className={`text-6xl font-bold ${isComplete ? 'text-green-400' : 'text-white'}`}>
          {count}
        </span>
        {targetReps && (
          <span className="text-2xl text-gray-500 ml-2">
            / {targetReps}
          </span>
        )}
      </div>

      {targetReps && (
        <div className="mt-4">
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm mt-2">
            {isComplete ? '🎉 ครบแล้ว!' : `เหลืออีก ${targetReps - count} ครั้ง`}
          </p>
        </div>
      )}

      {count > 0 && !targetReps && (
        <p className="text-gray-400 text-sm mt-4">
          ทำต่อไป! 💪
        </p>
      )}
    </div>
  );
}
