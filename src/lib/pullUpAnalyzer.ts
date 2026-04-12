import { PoseLandmark, FormAnalysis, FormFeedback, ExercisePhase, RepState } from '@/types/exercise';
import { calculateAngle, getLandmark, POSE_LANDMARKS } from './poseDetection';

// Pull-up variation types
export type PullUpVariation = 'standard' | 'chinup' | 'wide' | 'neutral';

// Pull-up form thresholds
const THRESHOLDS = {
  // Elbow angle when down (extended/hanging)
  ELBOW_DOWN_MIN: 150,
  ELBOW_DOWN_MAX: 180,
  // Elbow angle when up (pulled up)
  ELBOW_UP_MIN: 40,
  ELBOW_UP_MAX: 90,
  // Body alignment (should be relatively straight, minimal swing)
  BODY_ALIGNMENT_MIN: 160,
  BODY_ALIGNMENT_MAX: 180,
  // Minimum visibility for key landmarks
  MIN_VISIBILITY: 0.4,
};

// Phase detection with hysteresis
const PHASE_THRESHOLDS = {
  UP_ENTER: 85,      // Must reach this to be considered "up"
  UP_EXIT: 100,      // Must drop below this to leave "up"
  DOWN_ENTER: 145,   // Must reach this to be considered "down"
  DOWN_EXIT: 130,    // Must rise above this to leave "down"
};

// Scoring weights
const SCORE_WEIGHTS = {
  ELBOW_POSITION: 0.45,  // 45% - full range of motion
  BODY_CONTROL: 0.35,    // 35% - minimal swinging
  SMOOTHNESS: 0.20,      // 20% - controlled movement
};

// Variation-specific adjustments
const VARIATION_THRESHOLDS: Record<PullUpVariation, typeof THRESHOLDS> = {
  standard: THRESHOLDS,
  chinup: {
    ...THRESHOLDS,
    // Chin-ups typically have tighter elbow angle at top
    ELBOW_UP_MIN: 35,
    ELBOW_UP_MAX: 85,
  },
  wide: {
    ...THRESHOLDS,
    // Wide grip doesn't pull as high
    ELBOW_UP_MIN: 50,
    ELBOW_UP_MAX: 100,
  },
  neutral: THRESHOLDS,
};

/**
 * Moving average filter for smoothing angle data
 */
export class AngleSmoothing {
  private buffer: number[] = [];
  private readonly windowSize: number;

  constructor(windowSize: number = 5) {
    this.windowSize = windowSize;
  }

  update(value: number | null): number | null {
    if (value === null) return null;
    
    this.buffer.push(value);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }
    
    const sum = this.buffer.reduce((a, b) => a + b, 0);
    return sum / this.buffer.length;
  }

  getVelocity(): number | null {
    if (this.buffer.length < 2) return null;
    return this.buffer[this.buffer.length - 1] - this.buffer[this.buffer.length - 2];
  }

  reset(): void {
    this.buffer = [];
  }
}

/**
 * Get elbow angle (shoulder-elbow-wrist)
 */
export function getElbowAngle(
  landmarks: PoseLandmark[],
  side: 'left' | 'right'
): number | null {
  const shoulderIdx = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
  const elbowIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
  const wristIdx = side === 'left' ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST;

  const shoulder = getLandmark(landmarks, shoulderIdx, THRESHOLDS.MIN_VISIBILITY);
  const elbow = getLandmark(landmarks, elbowIdx, THRESHOLDS.MIN_VISIBILITY);
  const wrist = getLandmark(landmarks, wristIdx, THRESHOLDS.MIN_VISIBILITY);

  if (!shoulder || !elbow || !wrist) {
    return null;
  }

  return calculateAngle(shoulder, elbow, wrist);
}

/**
 * Get body alignment (shoulder-hip-knee angle for detecting swing)
 */
export function getBodyAlignment(
  landmarks: PoseLandmark[],
  side: 'left' | 'right'
): number | null {
  const shoulderIdx = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
  const hipIdx = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;
  const kneeIdx = side === 'left' ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE;

  const shoulder = getLandmark(landmarks, shoulderIdx, THRESHOLDS.MIN_VISIBILITY);
  const hip = getLandmark(landmarks, hipIdx, THRESHOLDS.MIN_VISIBILITY);
  const knee = getLandmark(landmarks, kneeIdx, THRESHOLDS.MIN_VISIBILITY);

  if (!shoulder || !hip || !knee) {
    return null;
  }

  return calculateAngle(shoulder, hip, knee);
}

/**
 * Check if person is in pull-up position (arms above head, hanging)
 */
export function isInPullUpPosition(landmarks: PoseLandmark[]): boolean {
  const leftWrist = getLandmark(landmarks, POSE_LANDMARKS.LEFT_WRIST, THRESHOLDS.MIN_VISIBILITY);
  const rightWrist = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_WRIST, THRESHOLDS.MIN_VISIBILITY);
  const leftShoulder = getLandmark(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);
  const rightShoulder = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);

  if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) {
    return false;
  }

  // In pull-up: wrists should be above shoulders (lower Y value in screen coords)
  const wristsAboveShoulders = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
  
  return wristsAboveShoulders;
}

/**
 * Check chin position relative to hands (for rep counting)
 */
export function getChinToHandsRatio(landmarks: PoseLandmark[]): number | null {
  const nose = getLandmark(landmarks, POSE_LANDMARKS.NOSE, THRESHOLDS.MIN_VISIBILITY);
  const leftWrist = getLandmark(landmarks, POSE_LANDMARKS.LEFT_WRIST, THRESHOLDS.MIN_VISIBILITY);
  const rightWrist = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_WRIST, THRESHOLDS.MIN_VISIBILITY);
  const leftShoulder = getLandmark(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);
  const rightShoulder = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);

  if (!nose || !leftWrist || !rightWrist || !leftShoulder || !rightShoulder) {
    return null;
  }

  const avgWristY = (leftWrist.y + rightWrist.y) / 2;
  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  
  // Calculate how far chin is relative to wrist-shoulder range
  // 0 = at wrist level (top), 1 = at shoulder level (hanging)
  const range = avgShoulderY - avgWristY;
  if (Math.abs(range) < 0.01) return null;
  
  return (nose.y - avgWristY) / range;
}

function averageAngles(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return (a + b) / 2;
}

// Store last phase for hysteresis
let lastPhase: ExercisePhase = 'down';

/**
 * Detect the current phase with hysteresis
 */
function detectPhase(elbowAngle: number | null): ExercisePhase {
  if (elbowAngle === null) return 'transition';
  
  if (lastPhase === 'down') {
    if (elbowAngle <= PHASE_THRESHOLDS.UP_ENTER) {
      lastPhase = 'up';
      return 'up';
    } else if (elbowAngle < PHASE_THRESHOLDS.DOWN_EXIT) {
      lastPhase = 'transition';
      return 'transition';
    }
    return 'down';
  } else if (lastPhase === 'up') {
    if (elbowAngle >= PHASE_THRESHOLDS.DOWN_ENTER) {
      lastPhase = 'down';
      return 'down';
    } else if (elbowAngle > PHASE_THRESHOLDS.UP_EXIT) {
      lastPhase = 'transition';
      return 'transition';
    }
    return 'up';
  } else {
    if (elbowAngle >= PHASE_THRESHOLDS.DOWN_ENTER) {
      lastPhase = 'down';
      return 'down';
    } else if (elbowAngle <= PHASE_THRESHOLDS.UP_ENTER) {
      lastPhase = 'up';
      return 'up';
    }
    return 'transition';
  }
}

/**
 * Reset phase detection state
 */
export function resetPhaseDetection(): void {
  lastPhase = 'down';
}

/**
 * Analyze pull-up form from pose landmarks
 */
export function analyzePullUpForm(
  landmarks: PoseLandmark[],
  smoothedElbow?: number | null,
  elbowVelocity?: number | null,
  variation: PullUpVariation = 'standard'
): FormAnalysis {
  const feedback: FormFeedback[] = [];
  let elbowScore = 0;
  let bodyScore = 0;
  let smoothnessScore = 100;

  const thresholds = VARIATION_THRESHOLDS[variation];

  // Check if in pull-up position
  if (!isInPullUpPosition(landmarks)) {
    return {
      isCorrect: false,
      score: 0,
      feedback: [{ type: 'info', message: 'เตรียมท่า - ยกมือขึ้นจับบาร์' }],
      phase: 'transition',
    };
  }

  // Get angles
  const leftElbow = getElbowAngle(landmarks, 'left');
  const rightElbow = getElbowAngle(landmarks, 'right');
  const avgElbow = smoothedElbow ?? averageAngles(leftElbow, rightElbow);

  const leftBody = getBodyAlignment(landmarks, 'left');
  const rightBody = getBodyAlignment(landmarks, 'right');
  const avgBody = averageAngles(leftBody, rightBody);

  // Determine phase
  const rawElbow = averageAngles(leftElbow, rightElbow);
  const phase = detectPhase(rawElbow);

  // ========== Elbow Position Check (45% weight) ==========
  if (avgElbow !== null) {
    if (phase === 'up') {
      if (avgElbow >= thresholds.ELBOW_UP_MIN && avgElbow <= thresholds.ELBOW_UP_MAX) {
        elbowScore = 100;
        feedback.push({
          type: 'success',
          message: '✓ ดึงขึ้นได้ดี',
          bodyPart: 'elbow',
        });
      } else if (avgElbow > thresholds.ELBOW_UP_MAX + 20) {
        elbowScore = 50;
        feedback.push({
          type: 'warning',
          message: 'ดึงขึ้นให้สูงกว่านี้',
          bodyPart: 'elbow',
        });
      } else if (avgElbow > thresholds.ELBOW_UP_MAX) {
        elbowScore = 70;
        feedback.push({
          type: 'info',
          message: 'ดึงขึ้นอีกนิด',
          bodyPart: 'elbow',
        });
      } else {
        elbowScore = 90;
      }
    } else if (phase === 'down') {
      if (avgElbow >= thresholds.ELBOW_DOWN_MIN) {
        elbowScore = 100;
        feedback.push({
          type: 'success',
          message: '✓ ยืดแขนเต็มที่',
          bodyPart: 'elbow',
        });
      } else if (avgElbow < thresholds.ELBOW_DOWN_MIN - 20) {
        elbowScore = 60;
        feedback.push({
          type: 'warning',
          message: 'ปล่อยตัวลงให้สุด',
          bodyPart: 'elbow',
        });
      } else {
        elbowScore = 80;
        feedback.push({
          type: 'info',
          message: 'ยืดแขนให้ตรงกว่านี้',
          bodyPart: 'elbow',
        });
      }
    } else {
      elbowScore = 80;
    }
  }

  // ========== Body Control Check (35% weight) ==========
  if (avgBody !== null) {
    if (avgBody >= thresholds.BODY_ALIGNMENT_MIN) {
      bodyScore = 100;
      feedback.push({
        type: 'success',
        message: '✓ ลำตัวนิ่ง',
        bodyPart: 'body',
      });
    } else if (avgBody >= 140) {
      bodyScore = 70;
      feedback.push({
        type: 'warning',
        message: 'ลดการแกว่งตัว',
        bodyPart: 'body',
      });
    } else {
      bodyScore = 40;
      feedback.push({
        type: 'error',
        message: 'แกว่งตัวมากเกินไป!',
        bodyPart: 'body',
      });
    }
  }

  // ========== Smoothness Check (20% weight) ==========
  if (elbowVelocity !== null && elbowVelocity !== undefined) {
    const absVelocity = Math.abs(elbowVelocity);
    if (absVelocity > 15) {
      smoothnessScore = 50;
      feedback.push({
        type: 'warning',
        message: 'เคลื่อนไหวช้าลง ควบคุมให้ดี',
        bodyPart: 'body',
      });
    } else if (absVelocity > 10) {
      smoothnessScore = 70;
    } else {
      smoothnessScore = 100;
    }
  }

  // Calculate weighted score
  const weightedScore = Math.round(
    elbowScore * SCORE_WEIGHTS.ELBOW_POSITION +
    bodyScore * SCORE_WEIGHTS.BODY_CONTROL +
    smoothnessScore * SCORE_WEIGHTS.SMOOTHNESS
  );

  const hasError = feedback.some(f => f.type === 'error');
  const isCorrect = weightedScore >= 75 && !hasError;

  return {
    isCorrect,
    score: weightedScore,
    feedback,
    phase,
  };
}

/**
 * Pull-up rep counter
 */
export class PullUpRepCounter {
  private state: RepState = {
    count: 0,
    currentPhase: 'down',
    lastPhaseChange: Date.now(),
  };

  private elbowSmoother = new AngleSmoothing(5);
  private minPhaseDuration = 200;
  private maxRepDuration = 6000;
  private reachedValidUp = false;
  private maxUpAngle = 95;
  private highestAngleInRep = 0;
  private lastRepQuality: 'good' | 'partial' | 'none' = 'none';

  update(phase: ExercisePhase, elbowAngle: number | null): boolean {
    const now = Date.now();
    const timeSinceChange = now - this.state.lastPhaseChange;

    const smoothedAngle = this.elbowSmoother.update(elbowAngle);
    
    // Track highest angle reached during pull
    if (smoothedAngle !== null && smoothedAngle > this.highestAngleInRep) {
      this.highestAngleInRep = smoothedAngle;
    }

    // Check if reached valid up position
    if (phase === 'up' && smoothedAngle !== null && smoothedAngle <= this.maxUpAngle) {
      this.reachedValidUp = true;
    }

    if (timeSinceChange < this.minPhaseDuration) {
      return false;
    }

    // Reset if stuck too long
    if (timeSinceChange > this.maxRepDuration && this.state.currentPhase !== 'down') {
      this.state.currentPhase = 'down';
      this.state.lastPhaseChange = now;
      this.reachedValidUp = false;
      this.highestAngleInRep = 0;
      return false;
    }

    // Count rep when going from up back to down
    if (this.state.currentPhase === 'up' && phase === 'down') {
      if (this.reachedValidUp) {
        this.state.count++;
        this.lastRepQuality = this.highestAngleInRep >= 160 ? 'good' : 'partial';
        this.reachedValidUp = false;
        this.highestAngleInRep = 0;
        this.state.currentPhase = 'down';
        this.state.lastPhaseChange = now;
        return true;
      }
    }

    // Update phase
    if (phase !== 'transition' && phase !== this.state.currentPhase) {
      this.state.currentPhase = phase;
      this.state.lastPhaseChange = now;
    }

    return false;
  }

  getSmoothedElbow(angle: number | null): number | null {
    return this.elbowSmoother.update(angle);
  }

  getElbowVelocity(): number | null {
    return this.elbowSmoother.getVelocity();
  }

  getCount(): number {
    return this.state.count;
  }

  getLastRepQuality(): 'good' | 'partial' | 'none' {
    return this.lastRepQuality;
  }

  getCurrentPhase(): ExercisePhase {
    return this.state.currentPhase;
  }

  reset(): void {
    this.state = {
      count: 0,
      currentPhase: 'down',
      lastPhaseChange: Date.now(),
    };
    this.elbowSmoother.reset();
    this.reachedValidUp = false;
    this.highestAngleInRep = 0;
    this.lastRepQuality = 'none';
    resetPhaseDetection();
  }
}
