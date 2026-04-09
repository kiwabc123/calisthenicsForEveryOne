import { PoseLandmark, FormAnalysis, FormFeedback, ExercisePhase, RepState } from '@/types/exercise';
import { getElbowAngle, getBodyAlignment, getHipDeviation } from './poseDetection';

// Push-up form thresholds
const THRESHOLDS = {
  // Elbow angle when down (bent)
  ELBOW_DOWN_MIN: 70,
  ELBOW_DOWN_MAX: 110,
  // Elbow angle when up (extended)
  ELBOW_UP_MIN: 150,
  ELBOW_UP_MAX: 180,
  // Body alignment (should be straight)
  BODY_ALIGNMENT_MIN: 160,
  BODY_ALIGNMENT_MAX: 180,
  // Hip deviation threshold (positive = sagging, negative = piking)
  HIP_DEVIATION_THRESHOLD: 0.05, // as fraction of body length
};

// Phase detection with hysteresis to prevent jitter
const PHASE_THRESHOLDS = {
  // Use different thresholds for entering vs leaving a phase (hysteresis)
  UP_ENTER: 145,      // Must reach this to be considered "up"
  UP_EXIT: 130,       // Must drop below this to leave "up"
  DOWN_ENTER: 95,     // Must reach this to be considered "down"
  DOWN_EXIT: 110,     // Must rise above this to leave "down"
};

// Scoring weights (total = 100%)
const SCORE_WEIGHTS = {
  BODY_ALIGNMENT: 0.4,  // 40% - core stability is crucial
  ELBOW_POSITION: 0.4,  // 40% - depth and extension
  SMOOTHNESS: 0.2,      // 20% - controlled movement
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
    
    // Return moving average
    const sum = this.buffer.reduce((a, b) => a + b, 0);
    return sum / this.buffer.length;
  }

  getVelocity(): number | null {
    if (this.buffer.length < 2) return null;
    // Angle change per frame (last - secondLast)
    return this.buffer[this.buffer.length - 1] - this.buffer[this.buffer.length - 2];
  }

  reset(): void {
    this.buffer = [];
  }
}

/**
 * Analyze push-up form from pose landmarks
 */
export function analyzePushUpForm(
  landmarks: PoseLandmark[],
  smoothedElbow?: number | null,
  elbowVelocity?: number | null
): FormAnalysis {
  const feedback: FormFeedback[] = [];
  let bodyScore = 0;
  let elbowScore = 0;
  let smoothnessScore = 100; // Start with perfect, deduct for issues
    
  // Check both sides and average
  const leftElbow = getElbowAngle(landmarks, 'left');
  const rightElbow = getElbowAngle(landmarks, 'right');
  const avgElbow = smoothedElbow ?? averageAngles(leftElbow, rightElbow);

  const leftBody = getBodyAlignment(landmarks, 'left');
  const rightBody = getBodyAlignment(landmarks, 'right');
  const avgBody = averageAngles(leftBody, rightBody);

  // Get hip deviation to distinguish piking vs sagging
  const leftHipDev = getHipDeviation(landmarks, 'left');
  const rightHipDev = getHipDeviation(landmarks, 'right');
  const avgHipDeviation = averageValues(leftHipDev, rightHipDev);

  // Determine current phase (use raw angle for phase detection)
  const rawElbow = averageAngles(leftElbow, rightElbow);
  const phase = detectPhase(rawElbow);

  // ========== Body Alignment Check (40% weight) ==========
  if (avgBody !== null && avgHipDeviation !== null) {
    if (avgBody >= THRESHOLDS.BODY_ALIGNMENT_MIN) {
      bodyScore = 100;
      feedback.push({
        type: 'success',
        message: 'ลำตัวตรงดี',
        bodyPart: 'body',
      });
    } else {
      // Body is not straight - check if piking or sagging
      if (avgHipDeviation < -THRESHOLDS.HIP_DEVIATION_THRESHOLD) {
        // Piking
        if (avgHipDeviation < -THRESHOLDS.HIP_DEVIATION_THRESHOLD * 2) {
          bodyScore = 40;
          feedback.push({
            type: 'error',
            message: 'สะโพกยกสูงเกินไป',
            bodyPart: 'hip',
          });
        } else {
          bodyScore = 65;
          feedback.push({
            type: 'warning',
            message: 'ลดสะโพกลงเล็กน้อย',
            bodyPart: 'hip',
          });
        }
      } else if (avgHipDeviation > THRESHOLDS.HIP_DEVIATION_THRESHOLD) {
        // Sagging
        if (avgHipDeviation > THRESHOLDS.HIP_DEVIATION_THRESHOLD * 2) {
          bodyScore = 30;
          feedback.push({
            type: 'error',
            message: 'สะโพกตกลงมาเกินไป กระชับหน้าท้อง',
            bodyPart: 'hip',
          });
        } else {
          bodyScore = 60;
          feedback.push({
            type: 'warning',
            message: 'เกร็งหน้าท้องเพิ่มขึ้น',
            bodyPart: 'core',
          });
        }
      } else {
        bodyScore = 75;
        feedback.push({
          type: 'warning',
          message: 'พยายามรักษาลำตัวให้ตรง',
          bodyPart: 'body',
        });
      }
    }
  } else if (avgBody !== null) {
    // Fallback without hip deviation
    bodyScore = avgBody >= THRESHOLDS.BODY_ALIGNMENT_MIN ? 100 : 70;
    if (avgBody < THRESHOLDS.BODY_ALIGNMENT_MIN) {
      feedback.push({
        type: 'warning',
        message: 'พยายามรักษาลำตัวให้ตรง',
        bodyPart: 'body',
      });
    } else {
      feedback.push({
        type: 'success',
        message: 'ลำตัวตรงดี',
        bodyPart: 'body',
      });
    }
  }

  // ========== Elbow Position Check (40% weight) ==========
  if (avgElbow !== null) {
    if (phase === 'down') {
      if (avgElbow >= THRESHOLDS.ELBOW_DOWN_MIN && avgElbow <= THRESHOLDS.ELBOW_DOWN_MAX) {
        elbowScore = 100;
        feedback.push({
          type: 'success',
          message: 'ลงลึกพอดี',
          bodyPart: 'elbow',
        });
      } else if (avgElbow > THRESHOLDS.ELBOW_DOWN_MAX + 20) {
        elbowScore = 40;
        feedback.push({
          type: 'error',
          message: 'ลงให้ลึกกว่านี้มาก',
          bodyPart: 'elbow',
        });
      } else if (avgElbow > THRESHOLDS.ELBOW_DOWN_MAX) {
        elbowScore = 60;
        feedback.push({
          type: 'warning',
          message: 'ลงให้ลึกกว่านี้',
          bodyPart: 'elbow',
        });
      } else if (avgElbow < THRESHOLDS.ELBOW_DOWN_MIN) {
        elbowScore = 85;
        feedback.push({
          type: 'info',
          message: 'ลงลึกมาก ระวังข้อศอก',
          bodyPart: 'elbow',
        });
      } else {
        elbowScore = 90;
      }
    } else if (phase === 'up') {
      if (avgElbow >= THRESHOLDS.ELBOW_UP_MIN) {
        elbowScore = 100;
        feedback.push({
          type: 'success',
          message: 'ยืดแขนได้ดี',
          bodyPart: 'elbow',
        });
      } else if (avgElbow < THRESHOLDS.ELBOW_UP_MIN - 20) {
        elbowScore = 50;
        feedback.push({
          type: 'error',
          message: 'ยืดแขนให้สุดกว่านี้',
          bodyPart: 'elbow',
        });
      } else {
        elbowScore = 70;
        feedback.push({
          type: 'warning',
          message: 'ยืดแขนให้สุด',
          bodyPart: 'elbow',
        });
      }
    } else {
      // Transition phase
      elbowScore = 80;
    }
  }

  // ========== Smoothness Check (20% weight) ==========
  if (elbowVelocity !== null && elbowVelocity !== undefined) {
    const absVelocity = Math.abs(elbowVelocity);
    if (absVelocity > 15) {
      // Very jerky movement
      smoothnessScore = 50;
      feedback.push({
        type: 'warning',
        message: 'เคลื่อนไหวช้าลง ควบคุมให้ดี',
        bodyPart: 'body',
      });
    } else if (absVelocity > 10) {
      smoothnessScore = 70;
    } else if (absVelocity < 1 && phase === 'transition') {
      // Stalling in transition
      smoothnessScore = 80;
    } else {
      smoothnessScore = 100;
    }
  }

  // ========== Calculate Weighted Score ==========
  const weightedScore = Math.round(
    bodyScore * SCORE_WEIGHTS.BODY_ALIGNMENT +
    elbowScore * SCORE_WEIGHTS.ELBOW_POSITION +
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

// Store last phase for hysteresis
let lastPhase: ExercisePhase = 'up';

/**
 * Detect the current phase with hysteresis to prevent jitter
 */
function detectPhase(elbowAngle: number | null): ExercisePhase {
  if (elbowAngle === null) return 'transition';
  
  // Use hysteresis: different thresholds for entering vs leaving a phase
  if (lastPhase === 'up') {
    // Currently in UP phase
    if (elbowAngle <= PHASE_THRESHOLDS.DOWN_ENTER) {
      lastPhase = 'down';
      return 'down';
    } else if (elbowAngle < PHASE_THRESHOLDS.UP_EXIT) {
      lastPhase = 'transition';
      return 'transition';
    }
    return 'up';
  } else if (lastPhase === 'down') {
    // Currently in DOWN phase
    if (elbowAngle >= PHASE_THRESHOLDS.UP_ENTER) {
      lastPhase = 'up';
      return 'up';
    } else if (elbowAngle > PHASE_THRESHOLDS.DOWN_EXIT) {
      lastPhase = 'transition';
      return 'transition';
    }
    return 'down';
  } else {
    // Currently in TRANSITION
    if (elbowAngle >= PHASE_THRESHOLDS.UP_ENTER) {
      lastPhase = 'up';
      return 'up';
    } else if (elbowAngle <= PHASE_THRESHOLDS.DOWN_ENTER) {
      lastPhase = 'down';
      return 'down';
    }
    return 'transition';
  }
}

/**
 * Reset phase detection state (call when starting new session)
 */
export function resetPhaseDetection(): void {
  lastPhase = 'up';
}

/**
 * Average two angles, handling null values
 */
function averageAngles(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return (a + b) / 2;
}

/**
 * Average two values, handling null values
 */
function averageValues(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return (a + b) / 2;
}

/**
 * Enhanced Rep counter state machine with validation
 */
export class PushUpRepCounter {
  private state: RepState = {
    count: 0,
    currentPhase: 'up',
    lastPhaseChange: Date.now(),
  };

  // Smoothing for stable phase detection
  private elbowSmoother = new AngleSmoothing(5);
  
  // Timing constraints
  private minPhaseDuration = 150; // ms - minimum time in a phase
  private maxRepDuration = 5000;  // ms - max time for one rep (prevents stuck state)
  
  // Rep validation
  private reachedValidDown = false;
  private minDownAngle = 105; // Must reach at least this angle to count
  private lowestAngleInRep = 180;
  
  // Quality tracking
  private lastRepQuality: 'good' | 'partial' | 'none' = 'none';

  /**
   * Update rep count based on current pose
   * Returns true if a new rep was completed
   */
  update(phase: ExercisePhase, elbowAngle: number | null): boolean {
    const now = Date.now();
    const timeSinceChange = now - this.state.lastPhaseChange;

    // Smooth the elbow angle
    const smoothedAngle = this.elbowSmoother.update(elbowAngle);
    
    // Track lowest angle reached during descent
    if (smoothedAngle !== null && smoothedAngle < this.lowestAngleInRep) {
      this.lowestAngleInRep = smoothedAngle;
    }

    // Check if reached valid down position
    if (phase === 'down' && smoothedAngle !== null && smoothedAngle <= this.minDownAngle) {
      this.reachedValidDown = true;
    }

    // Prevent state changes during minimum duration (anti-jitter)
    if (timeSinceChange < this.minPhaseDuration) {
      return false;
    }

    // Reset if stuck too long (prevents false state)
    if (timeSinceChange > this.maxRepDuration && this.state.currentPhase !== 'up') {
      this.state.currentPhase = 'up';
      this.state.lastPhaseChange = now;
      this.reachedValidDown = false;
      this.lowestAngleInRep = 180;
      return false;
    }

    // State machine with validation
    if (this.state.currentPhase === 'up' && phase === 'down') {
      // Starting descent
      this.state.currentPhase = 'down';
      this.state.lastPhaseChange = now;
      this.reachedValidDown = false;
      this.lowestAngleInRep = smoothedAngle ?? 180;
      return false;
    }

    if (this.state.currentPhase === 'down' && phase === 'transition') {
      // Starting to come up
      this.state.currentPhase = 'transition';
      this.state.lastPhaseChange = now;
      return false;
    }

    if ((this.state.currentPhase === 'down' || this.state.currentPhase === 'transition') && phase === 'up') {
      // Completed upward movement
      this.state.currentPhase = 'up';
      this.state.lastPhaseChange = now;
      
      // Only count if reached valid down position
      if (this.reachedValidDown) {
        this.state.count++;
        this.lastRepQuality = this.lowestAngleInRep <= 90 ? 'good' : 'partial';
        this.reachedValidDown = false;
        this.lowestAngleInRep = 180;
        return true;
      } else {
        this.lastRepQuality = 'none';
        this.lowestAngleInRep = 180;
        return false;
      }
    }

    // Handle transition back to down (user went back down without fully extending)
    if (this.state.currentPhase === 'transition' && phase === 'down') {
      this.state.currentPhase = 'down';
      this.state.lastPhaseChange = now;
      return false;
    }

    return false;
  }

  getCount(): number {
    return this.state.count;
  }

  getLastRepQuality(): 'good' | 'partial' | 'none' {
    return this.lastRepQuality;
  }

  getSmoothedElbow(elbowAngle: number | null): number | null {
    return this.elbowSmoother.update(elbowAngle);
  }

  getElbowVelocity(): number | null {
    return this.elbowSmoother.getVelocity();
  }

  reset(): void {
    this.state = {
      count: 0,
      currentPhase: 'up',
      lastPhaseChange: Date.now(),
    };
    this.elbowSmoother.reset();
    this.reachedValidDown = false;
    this.lowestAngleInRep = 180;
    this.lastRepQuality = 'none';
    resetPhaseDetection();
  }

  getState(): RepState {
    return { ...this.state };
  }
}
