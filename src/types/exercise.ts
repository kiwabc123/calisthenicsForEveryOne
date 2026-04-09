// Exercise types
export interface Exercise {
  id: string;
  name: string;
  nameLocal: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  muscleGroups: string[];
  description: string;
  checkpoints: ExerciseCheckpoints;
}

export interface ExerciseCheckpoints {
  [key: string]: [number, number]; // [min, max] angle range
}

// Push-up specific
export interface PushUpCheckpoints extends ExerciseCheckpoints {
  elbowAngleDown: [number, number];
  elbowAngleUp: [number, number];
  bodyAlignment: [number, number];
  hipAngle: [number, number];
}

// Workout tracking
export interface Workout {
  id: string;
  oderId: string;
  exercise: string;
  reps: number;
  formScore: number;
  duration: number;
  createdAt: Date;
  feedback: string[];
}

// Pose detection results
export interface PoseResult {
  landmarks: PoseLandmark[];
  timestamp: number;
}

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

// Form analysis
export interface FormAnalysis {
  isCorrect: boolean;
  score: number;
  feedback: FormFeedback[];
  phase: ExercisePhase;
}

export interface FormFeedback {
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  bodyPart?: string;
}

export type ExercisePhase = 'up' | 'down' | 'hold' | 'transition';

// Rep counting
export interface RepState {
  count: number;
  currentPhase: ExercisePhase;
  lastPhaseChange: number;
}

// User profile
export interface UserProfile {
  id: string;
  displayName: string;
  createdAt: Date;
  totalWorkouts: number;
  streak: number;
}
