'use client';

import React from 'react';

// Muscle groups that can be highlighted
export type MuscleGroup = 
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'biceps'
  | 'forearms'
  | 'lats'
  | 'traps'
  | 'abs'
  | 'obliques'
  | 'lowerBack'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

// Exercise to muscle mapping
export const exerciseMuscles: Record<string, { primary: MuscleGroup[]; secondary: MuscleGroup[] }> = {
  'push-up': {
    primary: ['chest', 'triceps', 'shoulders'],
    secondary: ['abs', 'forearms'],
  },
  'pull-up': {
    primary: ['lats', 'biceps'],
    secondary: ['forearms', 'traps', 'shoulders', 'abs'],
  },
  'squat': {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'calves', 'abs', 'lowerBack'],
  },
  'plank': {
    primary: ['abs', 'obliques'],
    secondary: ['shoulders', 'glutes', 'quads'],
  },
  'handstand': {
    primary: ['shoulders', 'triceps', 'traps'],
    secondary: ['abs', 'forearms', 'chest'],
  },
};

interface MuscleMapProps {
  exercise?: string;
  highlightPrimary?: MuscleGroup[];
  highlightSecondary?: MuscleGroup[];
  size?: 'sm' | 'md' | 'lg';
  view?: 'front' | 'back';
  className?: string;
}

export default function MuscleMap({
  exercise,
  highlightPrimary = [],
  highlightSecondary = [],
  size = 'md',
  view = 'front',
  className = '',
}: MuscleMapProps) {
  // Get muscles from exercise if provided
  const muscles = exercise ? exerciseMuscles[exercise] : null;
  const primary = muscles?.primary || highlightPrimary;
  const secondary = muscles?.secondary || highlightSecondary;

  const sizeClass = {
    sm: 'w-16 h-24',
    md: 'w-24 h-36',
    lg: 'w-32 h-48',
  }[size];

  const getMuscleColor = (muscle: MuscleGroup) => {
    if (primary.includes(muscle)) return '#ef4444'; // red-500 primary
    if (secondary.includes(muscle)) return '#f97316'; // orange-500 secondary
    return '#374151'; // gray-700 default
  };

  const getMuscleOpacity = (muscle: MuscleGroup) => {
    if (primary.includes(muscle)) return 1;
    if (secondary.includes(muscle)) return 0.7;
    return 0.3;
  };

  if (view === 'front') {
    return (
      <svg
        viewBox="0 0 100 150"
        className={`${sizeClass} ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Head */}
        <ellipse cx="50" cy="15" rx="12" ry="14" fill="#6b7280" opacity="0.5" />
        
        {/* Neck */}
        <rect x="45" y="28" width="10" height="8" fill="#6b7280" opacity="0.4" />
        
        {/* Traps */}
        <path
          d="M35 36 Q50 32 65 36 L60 42 Q50 38 40 42 Z"
          fill={getMuscleColor('traps')}
          opacity={getMuscleOpacity('traps')}
        />
        
        {/* Shoulders (Deltoids) */}
        <ellipse cx="28" cy="42" rx="8" ry="6" 
          fill={getMuscleColor('shoulders')} 
          opacity={getMuscleOpacity('shoulders')} 
        />
        <ellipse cx="72" cy="42" rx="8" ry="6" 
          fill={getMuscleColor('shoulders')} 
          opacity={getMuscleOpacity('shoulders')} 
        />
        
        {/* Chest */}
        <path
          d="M35 42 Q50 40 65 42 Q68 52 65 58 Q50 62 35 58 Q32 52 35 42"
          fill={getMuscleColor('chest')}
          opacity={getMuscleOpacity('chest')}
        />
        
        {/* Biceps */}
        <ellipse cx="22" cy="55" rx="5" ry="10"
          fill={getMuscleColor('biceps')}
          opacity={getMuscleOpacity('biceps')}
          transform="rotate(-10 22 55)"
        />
        <ellipse cx="78" cy="55" rx="5" ry="10"
          fill={getMuscleColor('biceps')}
          opacity={getMuscleOpacity('biceps')}
          transform="rotate(10 78 55)"
        />
        
        {/* Triceps (visible from front slightly) */}
        <ellipse cx="18" cy="58" rx="3" ry="8"
          fill={getMuscleColor('triceps')}
          opacity={getMuscleOpacity('triceps') * 0.5}
          transform="rotate(-15 18 58)"
        />
        <ellipse cx="82" cy="58" rx="3" ry="8"
          fill={getMuscleColor('triceps')}
          opacity={getMuscleOpacity('triceps') * 0.5}
          transform="rotate(15 82 58)"
        />
        
        {/* Forearms */}
        <ellipse cx="18" cy="75" rx="4" ry="12"
          fill={getMuscleColor('forearms')}
          opacity={getMuscleOpacity('forearms')}
          transform="rotate(-5 18 75)"
        />
        <ellipse cx="82" cy="75" rx="4" ry="12"
          fill={getMuscleColor('forearms')}
          opacity={getMuscleOpacity('forearms')}
          transform="rotate(5 82 75)"
        />
        
        {/* Abs (6-pack) */}
        <rect x="42" y="60" width="7" height="6" rx="1"
          fill={getMuscleColor('abs')}
          opacity={getMuscleOpacity('abs')}
        />
        <rect x="51" y="60" width="7" height="6" rx="1"
          fill={getMuscleColor('abs')}
          opacity={getMuscleOpacity('abs')}
        />
        <rect x="42" y="68" width="7" height="6" rx="1"
          fill={getMuscleColor('abs')}
          opacity={getMuscleOpacity('abs')}
        />
        <rect x="51" y="68" width="7" height="6" rx="1"
          fill={getMuscleColor('abs')}
          opacity={getMuscleOpacity('abs')}
        />
        <rect x="42" y="76" width="7" height="6" rx="1"
          fill={getMuscleColor('abs')}
          opacity={getMuscleOpacity('abs')}
        />
        <rect x="51" y="76" width="7" height="6" rx="1"
          fill={getMuscleColor('abs')}
          opacity={getMuscleOpacity('abs')}
        />
        
        {/* Obliques */}
        <path
          d="M35 60 Q38 70 36 82 L40 82 Q42 70 40 60 Z"
          fill={getMuscleColor('obliques')}
          opacity={getMuscleOpacity('obliques')}
        />
        <path
          d="M65 60 Q62 70 64 82 L60 82 Q58 70 60 60 Z"
          fill={getMuscleColor('obliques')}
          opacity={getMuscleOpacity('obliques')}
        />
        
        {/* Quads */}
        <path
          d="M38 88 Q35 105 38 125 L48 125 Q50 105 48 88 Z"
          fill={getMuscleColor('quads')}
          opacity={getMuscleOpacity('quads')}
        />
        <path
          d="M62 88 Q65 105 62 125 L52 125 Q50 105 52 88 Z"
          fill={getMuscleColor('quads')}
          opacity={getMuscleOpacity('quads')}
        />
        
        {/* Calves (front view - tibialis) */}
        <ellipse cx="42" cy="138" rx="4" ry="10"
          fill={getMuscleColor('calves')}
          opacity={getMuscleOpacity('calves') * 0.6}
        />
        <ellipse cx="58" cy="138" rx="4" ry="10"
          fill={getMuscleColor('calves')}
          opacity={getMuscleOpacity('calves') * 0.6}
        />
        
        {/* Hands */}
        <ellipse cx="16" cy="92" rx="3" ry="4" fill="#6b7280" opacity="0.4" />
        <ellipse cx="84" cy="92" rx="3" ry="4" fill="#6b7280" opacity="0.4" />
        
        {/* Feet */}
        <ellipse cx="42" cy="148" rx="5" ry="2" fill="#6b7280" opacity="0.4" />
        <ellipse cx="58" cy="148" rx="5" ry="2" fill="#6b7280" opacity="0.4" />
      </svg>
    );
  }

  // Back view
  return (
    <svg
      viewBox="0 0 100 150"
      className={`${sizeClass} ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head */}
      <ellipse cx="50" cy="15" rx="12" ry="14" fill="#6b7280" opacity="0.5" />
      
      {/* Neck */}
      <rect x="45" y="28" width="10" height="8" fill="#6b7280" opacity="0.4" />
      
      {/* Traps */}
      <path
        d="M35 36 Q50 30 65 36 L62 50 Q50 46 38 50 Z"
        fill={getMuscleColor('traps')}
        opacity={getMuscleOpacity('traps')}
      />
      
      {/* Shoulders (Rear Delts) */}
      <ellipse cx="28" cy="42" rx="8" ry="6" 
        fill={getMuscleColor('shoulders')} 
        opacity={getMuscleOpacity('shoulders')} 
      />
      <ellipse cx="72" cy="42" rx="8" ry="6" 
        fill={getMuscleColor('shoulders')} 
        opacity={getMuscleOpacity('shoulders')} 
      />
      
      {/* Lats */}
      <path
        d="M35 48 Q32 60 35 75 Q45 78 50 78 Q55 78 65 75 Q68 60 65 48 Q50 52 35 48"
        fill={getMuscleColor('lats')}
        opacity={getMuscleOpacity('lats')}
      />
      
      {/* Triceps */}
      <ellipse cx="20" cy="55" rx="5" ry="12"
        fill={getMuscleColor('triceps')}
        opacity={getMuscleOpacity('triceps')}
        transform="rotate(-8 20 55)"
      />
      <ellipse cx="80" cy="55" rx="5" ry="12"
        fill={getMuscleColor('triceps')}
        opacity={getMuscleOpacity('triceps')}
        transform="rotate(8 80 55)"
      />
      
      {/* Forearms */}
      <ellipse cx="18" cy="75" rx="4" ry="12"
        fill={getMuscleColor('forearms')}
        opacity={getMuscleOpacity('forearms')}
        transform="rotate(-5 18 75)"
      />
      <ellipse cx="82" cy="75" rx="4" ry="12"
        fill={getMuscleColor('forearms')}
        opacity={getMuscleOpacity('forearms')}
        transform="rotate(5 82 75)"
      />
      
      {/* Lower Back (Erector Spinae) */}
      <path
        d="M45 65 L48 82 L50 82 L52 82 L55 65 Q50 63 45 65"
        fill={getMuscleColor('lowerBack')}
        opacity={getMuscleOpacity('lowerBack')}
      />
      
      {/* Glutes */}
      <ellipse cx="42" cy="90" rx="8" ry="8"
        fill={getMuscleColor('glutes')}
        opacity={getMuscleOpacity('glutes')}
      />
      <ellipse cx="58" cy="90" rx="8" ry="8"
        fill={getMuscleColor('glutes')}
        opacity={getMuscleOpacity('glutes')}
      />
      
      {/* Hamstrings */}
      <path
        d="M35 98 Q34 112 38 125 L48 125 Q50 112 48 98 Z"
        fill={getMuscleColor('hamstrings')}
        opacity={getMuscleOpacity('hamstrings')}
      />
      <path
        d="M65 98 Q66 112 62 125 L52 125 Q50 112 52 98 Z"
        fill={getMuscleColor('hamstrings')}
        opacity={getMuscleOpacity('hamstrings')}
      />
      
      {/* Calves */}
      <ellipse cx="40" cy="135" rx="5" ry="10"
        fill={getMuscleColor('calves')}
        opacity={getMuscleOpacity('calves')}
      />
      <ellipse cx="60" cy="135" rx="5" ry="10"
        fill={getMuscleColor('calves')}
        opacity={getMuscleOpacity('calves')}
      />
      
      {/* Hands */}
      <ellipse cx="16" cy="92" rx="3" ry="4" fill="#6b7280" opacity="0.4" />
      <ellipse cx="84" cy="92" rx="3" ry="4" fill="#6b7280" opacity="0.4" />
      
      {/* Feet */}
      <ellipse cx="40" cy="148" rx="5" ry="2" fill="#6b7280" opacity="0.4" />
      <ellipse cx="60" cy="148" rx="5" ry="2" fill="#6b7280" opacity="0.4" />
    </svg>
  );
}

// Compact version showing both views
export function MuscleMapDual({
  exercise,
  size = 'sm',
  className = '',
}: {
  exercise: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div className={`flex gap-1 ${className}`}>
      <MuscleMap exercise={exercise} view="front" size={size} />
      <MuscleMap exercise={exercise} view="back" size={size} />
    </div>
  );
}

// Legend component
export function MuscleLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-4 text-xs ${className}`}>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-red-500" />
        <span>Primary</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-orange-500 opacity-70" />
        <span>Secondary</span>
      </div>
    </div>
  );
}
