import { PoseLandmark, FormAnalysis, FormFeedback, ExercisePhase, RepState } from '@/types/exercise';
import { getElbowAngle, getBodyAlignment, getHipAngle } from './poseDetection';

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
  // Hip angle (shouldn't sag or pike)
  HIP_ANGLE_MIN: 160,
  HIP_ANGLE_MAX: 180,
};

// Phase detection thresholds
const PHASE_THRESHOLDS = {
  UP: 140,
  DOWN: 100,
};

/**
 * Analyze push-up form from pose landmarks
 */
export function analyzePushUpForm(landmarks: PoseLandmark[]): FormAnalysis {
  const feedback: FormFeedback[] = [];
  let totalScore = 0;
  let checkCount = 0;

  // Check both sides and average
  const leftElbow = getElbowAngle(landmarks, 'left');
  const rightElbow = getElbowAngle(landmarks, 'right');
  const avgElbow = averageAngles(leftElbow, rightElbow);

  const leftBody = getBodyAlignment(landmarks, 'left');
  const rightBody = getBodyAlignment(landmarks, 'right');
  const avgBody = averageAngles(leftBody, rightBody);

  const leftHip = getHipAngle(landmarks, 'left');
  const rightHip = getHipAngle(landmarks, 'right');
  const avgHip = averageAngles(leftHip, rightHip);

  // Determine current phase
  const phase = detectPhase(avgElbow);

  // Check body alignment
  if (avgBody !== null) {
    checkCount++;
    if (avgBody >= THRESHOLDS.BODY_ALIGNMENT_MIN && avgBody <= THRESHOLDS.BODY_ALIGNMENT_MAX) {
      totalScore += 100;
      feedback.push({
        type: 'success',
        message: 'ลำตัวตรงดี',
        bodyPart: 'body',
      });
    } else if (avgBody < THRESHOLDS.BODY_ALIGNMENT_MIN - 10) {
      totalScore += 50;
      feedback.push({
        type: 'error',
        message: 'สะโพกยกสูงเกินไป',
        bodyPart: 'hip',
      });
    } else if (avgBody < THRESHOLDS.BODY_ALIGNMENT_MIN) {
      totalScore += 70;
      feedback.push({
        type: 'warning',
        message: 'พยายามรักษาลำตัวให้ตรง',
        bodyPart: 'body',
      });
    } else {
      totalScore += 100;
    }
  }

  // Check hip position
  if (avgHip !== null) {
    checkCount++;
    if (avgHip >= THRESHOLDS.HIP_ANGLE_MIN && avgHip <= THRESHOLDS.HIP_ANGLE_MAX) {
      totalScore += 100;
    } else if (avgHip < THRESHOLDS.HIP_ANGLE_MIN - 15) {
      totalScore += 40;
      feedback.push({
        type: 'error',
        message: 'สะโพกตกลงมาเกินไป กระชับหน้าท้อง',
        bodyPart: 'hip',
      });
    } else if (avgHip < THRESHOLDS.HIP_ANGLE_MIN) {
      totalScore += 70;
      feedback.push({
        type: 'warning',
        message: 'เกร็งหน้าท้องเพิ่มขึ้น',
        bodyPart: 'core',
      });
    } else {
      totalScore += 100;
    }
  }

  // Check elbow position based on phase
  if (avgElbow !== null) {
    checkCount++;
    if (phase === 'down') {
      if (avgElbow >= THRESHOLDS.ELBOW_DOWN_MIN && avgElbow <= THRESHOLDS.ELBOW_DOWN_MAX) {
        totalScore += 100;
        feedback.push({
          type: 'success',
          message: 'ลงลึกพอดี',
          bodyPart: 'elbow',
        });
      } else if (avgElbow > THRESHOLDS.ELBOW_DOWN_MAX) {
        totalScore += 60;
        feedback.push({
          type: 'warning',
          message: 'ลงให้ลึกกว่านี้',
          bodyPart: 'elbow',
        });
      } else {
        totalScore += 80;
      }
    } else if (phase === 'up') {
      if (avgElbow >= THRESHOLDS.ELBOW_UP_MIN) {
        totalScore += 100;
        feedback.push({
          type: 'success',
          message: 'ยืดแขนได้ดี',
          bodyPart: 'elbow',
        });
      } else {
        totalScore += 70;
        feedback.push({
          type: 'warning',
          message: 'ยืดแขนให้สุด',
          bodyPart: 'elbow',
        });
      }
    } else {
      totalScore += 80;
    }
  }

  const score = checkCount > 0 ? Math.round(totalScore / checkCount) : 0;
  const isCorrect = score >= 80 && !feedback.some(f => f.type === 'error');

  return {
    isCorrect,
    score,
    feedback,
    phase,
  };
}

/**
 * Detect the current phase of the push-up
 */
function detectPhase(elbowAngle: number | null): ExercisePhase {
  if (elbowAngle === null) return 'transition';
  
  if (elbowAngle >= PHASE_THRESHOLDS.UP) {
    return 'up';
  } else if (elbowAngle <= PHASE_THRESHOLDS.DOWN) {
    return 'down';
  } else {
    return 'transition';
  }
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
 * Rep counter state machine
 */
export class PushUpRepCounter {
  private state: RepState = {
    count: 0,
    currentPhase: 'up',
    lastPhaseChange: Date.now(),
  };

  private minPhaseDuration = 200; // ms - prevent false counts from noise

  /**
   * Update rep count based on current phase
   * Returns true if a new rep was completed
   */
  update(phase: ExercisePhase): boolean {
    const now = Date.now();
    const timeSinceChange = now - this.state.lastPhaseChange;

    // Only count state changes after minimum duration
    if (timeSinceChange < this.minPhaseDuration) {
      return false;
    }

    // State machine: up -> down -> up = 1 rep
    if (this.state.currentPhase === 'down' && phase === 'up') {
      this.state.count++;
      this.state.currentPhase = 'up';
      this.state.lastPhaseChange = now;
      return true;
    }

    if (this.state.currentPhase === 'up' && phase === 'down') {
      this.state.currentPhase = 'down';
      this.state.lastPhaseChange = now;
    }

    return false;
  }

  getCount(): number {
    return this.state.count;
  }

  reset(): void {
    this.state = {
      count: 0,
      currentPhase: 'up',
      lastPhaseChange: Date.now(),
    };
  }

  getState(): RepState {
    return { ...this.state };
  }
}
