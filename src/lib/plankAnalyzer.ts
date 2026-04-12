import { PoseLandmark, FormAnalysis, FormFeedback } from '@/types/exercise';
import { calculateAngle, getLandmark, POSE_LANDMARKS } from './poseDetection';

// Plank variation types
export type PlankVariation = 'high' | 'low' | 'side';

// Plank form thresholds
const THRESHOLDS = {
  // Body should be straight (shoulder-hip-ankle angle)
  BODY_ALIGNMENT_MIN: 160,
  BODY_ALIGNMENT_MAX: 180,
  // Arms straight for high plank
  ARM_STRAIGHT_MIN: 160,
  ARM_STRAIGHT_MAX: 180,
  // Low plank elbow angle (around 90 degrees)
  ELBOW_BENT_MIN: 80,
  ELBOW_BENT_MAX: 110,
  // Hip deviation threshold (positive = sagging, negative = piking)
  HIP_DEVIATION_THRESHOLD: 0.05,
  // Minimum visibility for key landmarks
  MIN_VISIBILITY: 0.4,
};

// Form quality thresholds per variation
const FORM_QUALITY: Record<PlankVariation, { GOOD_MIN_SCORE: number; FAILED_MAX_SCORE: number; FALL_DETECTION_FRAMES: number }> = {
  high: {
    GOOD_MIN_SCORE: 70,
    FAILED_MAX_SCORE: 40,
    FALL_DETECTION_FRAMES: 8,
  },
  low: {
    GOOD_MIN_SCORE: 65,
    FAILED_MAX_SCORE: 35,
    FALL_DETECTION_FRAMES: 8,
  },
  side: {
    GOOD_MIN_SCORE: 60,
    FAILED_MAX_SCORE: 30,
    FALL_DETECTION_FRAMES: 10,
  },
};

// Scoring weights
const SCORE_WEIGHTS = {
  BODY_ALIGNMENT: 0.50,  // 50% - keeping body straight is crucial
  HIP_POSITION: 0.30,    // 30% - no sagging or piking
  ARM_POSITION: 0.20,    // 20% - proper arm placement
};

export type PlankPhase = 'holding' | 'falling' | 'not-detected';

/**
 * Get body alignment angle (shoulder-hip-ankle)
 */
export function getBodyAlignment(
  landmarks: PoseLandmark[],
  side: 'left' | 'right'
): number | null {
  const shoulderIdx = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
  const hipIdx = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;
  const ankleIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ANKLE : POSE_LANDMARKS.RIGHT_ANKLE;

  const shoulder = getLandmark(landmarks, shoulderIdx, THRESHOLDS.MIN_VISIBILITY);
  const hip = getLandmark(landmarks, hipIdx, THRESHOLDS.MIN_VISIBILITY);
  const ankle = getLandmark(landmarks, ankleIdx, THRESHOLDS.MIN_VISIBILITY);

  if (!shoulder || !hip || !ankle) {
    return null;
  }

  return calculateAngle(shoulder, hip, ankle);
}

/**
 * Get arm angle (shoulder-elbow-wrist)
 */
export function getArmAngle(
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
 * Get hip deviation (how far hip is above/below the shoulder-ankle line)
 * Positive = sagging, Negative = piking
 */
export function getHipDeviation(landmarks: PoseLandmark[]): number | null {
  const leftShoulder = getLandmark(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);
  const rightShoulder = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);
  const leftHip = getLandmark(landmarks, POSE_LANDMARKS.LEFT_HIP, THRESHOLDS.MIN_VISIBILITY);
  const rightHip = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_HIP, THRESHOLDS.MIN_VISIBILITY);
  const leftAnkle = getLandmark(landmarks, POSE_LANDMARKS.LEFT_ANKLE, THRESHOLDS.MIN_VISIBILITY);
  const rightAnkle = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_ANKLE, THRESHOLDS.MIN_VISIBILITY);

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !leftAnkle || !rightAnkle) {
    return null;
  }

  // Calculate average positions
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const ankleY = (leftAnkle.y + rightAnkle.y) / 2;

  // Calculate where hip should be on the line from shoulder to ankle
  const expectedHipY = (shoulderY + ankleY) / 2;
  
  // Calculate body length for normalization
  const bodyLength = Math.abs(shoulderY - ankleY);
  if (bodyLength < 0.01) return null;

  // Deviation as fraction of body length (positive = hip too high = sagging in plank)
  // Note: In screen coords, y increases downward, so if hip is below expected, it's sagging
  return (hipY - expectedHipY) / bodyLength;
}

/**
 * Check if person is in plank position
 */
export function isInPlankPosition(landmarks: PoseLandmark[]): boolean {
  const leftShoulder = getLandmark(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);
  const leftHip = getLandmark(landmarks, POSE_LANDMARKS.LEFT_HIP, THRESHOLDS.MIN_VISIBILITY);
  const leftWrist = getLandmark(landmarks, POSE_LANDMARKS.LEFT_WRIST, THRESHOLDS.MIN_VISIBILITY);
  const leftAnkle = getLandmark(landmarks, POSE_LANDMARKS.LEFT_ANKLE, THRESHOLDS.MIN_VISIBILITY);

  if (!leftShoulder || !leftHip || !leftWrist || !leftAnkle) {
    return false;
  }

  // In plank: body is mostly horizontal
  // Check that shoulder and hip are at similar height (y values close)
  const shoulderHipVerticalDiff = Math.abs(leftShoulder.y - leftHip.y);
  const bodyHorizontal = shoulderHipVerticalDiff < 0.2;

  // Wrists should be below shoulders (hands on ground)
  const handsOnGround = leftWrist.y > leftShoulder.y;

  // Ankles should be behind hips (legs extended)
  const legsExtended = Math.abs(leftHip.x - leftAnkle.x) > 0.1;

  return bodyHorizontal && handsOnGround && legsExtended;
}

function averageAngles(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return (a + b) / 2;
}

/**
 * Analyze plank form from pose landmarks
 */
export function analyzePlankForm(
  landmarks: PoseLandmark[],
  variation: PlankVariation = 'high'
): FormAnalysis {
  const feedback: FormFeedback[] = [];
  let bodyScore = 0;
  let hipScore = 0;
  let armScore = 0;

  // Check if in plank position
  if (!isInPlankPosition(landmarks)) {
    return {
      isCorrect: false,
      score: 0,
      feedback: [{ type: 'info', message: 'ยังไม่อยู่ในท่า Plank' }],
      phase: 'not-detected',
    };
  }

  const qualityThresholds = FORM_QUALITY[variation];

  // 1. Body alignment (shoulder-hip-ankle)
  const leftBody = getBodyAlignment(landmarks, 'left');
  const rightBody = getBodyAlignment(landmarks, 'right');
  const avgBody = averageAngles(leftBody, rightBody);

  if (avgBody !== null) {
    if (avgBody >= THRESHOLDS.BODY_ALIGNMENT_MIN) {
      bodyScore = 100;
      feedback.push({ type: 'success', message: '✓ ลำตัวตรงดี' });
    } else if (avgBody >= 150) {
      bodyScore = 70;
      feedback.push({ type: 'warning', message: 'ยืดตัวให้ตรงขึ้น' });
    } else {
      bodyScore = 40;
      feedback.push({ type: 'error', message: 'ลำตัวไม่ตรง!' });
    }
  }

  // 2. Hip position (no sagging or piking)
  const hipDeviation = getHipDeviation(landmarks);
  if (hipDeviation !== null) {
    const absDeviation = Math.abs(hipDeviation);
    if (absDeviation <= THRESHOLDS.HIP_DEVIATION_THRESHOLD) {
      hipScore = 100;
      feedback.push({ type: 'success', message: '✓ สะโพกตำแหน่งดี' });
    } else if (hipDeviation > THRESHOLDS.HIP_DEVIATION_THRESHOLD) {
      // Sagging
      if (hipDeviation > THRESHOLDS.HIP_DEVIATION_THRESHOLD * 2) {
        hipScore = 30;
        feedback.push({ type: 'error', message: 'สะโพกตก ยกก้นขึ้น!' });
      } else {
        hipScore = 60;
        feedback.push({ type: 'warning', message: 'เกร็งหน้าท้อง ยกก้นขึ้นเล็กน้อย' });
      }
    } else {
      // Piking (hip too high)
      if (hipDeviation < -THRESHOLDS.HIP_DEVIATION_THRESHOLD * 2) {
        hipScore = 40;
        feedback.push({ type: 'error', message: 'ก้นยกสูงเกินไป ลดลงมา!' });
      } else {
        hipScore = 65;
        feedback.push({ type: 'warning', message: 'ลดก้นลงเล็กน้อย' });
      }
    }
  }

  // 3. Arm position (depends on variation)
  const leftArm = getArmAngle(landmarks, 'left');
  const rightArm = getArmAngle(landmarks, 'right');
  const avgArm = averageAngles(leftArm, rightArm);

  if (avgArm !== null) {
    if (variation === 'high') {
      // High plank - arms should be straight
      if (avgArm >= THRESHOLDS.ARM_STRAIGHT_MIN) {
        armScore = 100;
        feedback.push({ type: 'success', message: '✓ แขนตรง' });
      } else if (avgArm >= 140) {
        armScore = 70;
        feedback.push({ type: 'warning', message: 'ยืดแขนให้ตรงขึ้น' });
      } else {
        armScore = 50;
        feedback.push({ type: 'error', message: 'ล็อคแขนให้ตรง!' });
      }
    } else if (variation === 'low') {
      // Low plank - elbows bent ~90 degrees
      if (avgArm >= THRESHOLDS.ELBOW_BENT_MIN && avgArm <= THRESHOLDS.ELBOW_BENT_MAX) {
        armScore = 100;
        feedback.push({ type: 'success', message: '✓ ข้อศอก 90 องศา' });
      } else if (avgArm > THRESHOLDS.ELBOW_BENT_MAX) {
        armScore = 70;
        feedback.push({ type: 'warning', message: 'งอข้อศอกเพิ่มขึ้น' });
      } else {
        armScore = 70;
        feedback.push({ type: 'warning', message: 'ยืดข้อศอกออกเล็กน้อย' });
      }
    } else {
      // Side plank - one arm straight
      if (avgArm >= THRESHOLDS.ARM_STRAIGHT_MIN) {
        armScore = 100;
      } else {
        armScore = 70;
        feedback.push({ type: 'warning', message: 'ยืดแขนค้ำให้ตรง' });
      }
    }
  }

  // Calculate total score
  const totalScore = Math.round(
    bodyScore * SCORE_WEIGHTS.BODY_ALIGNMENT +
    hipScore * SCORE_WEIGHTS.HIP_POSITION +
    armScore * SCORE_WEIGHTS.ARM_POSITION
  );

  // Determine phase
  const phase: PlankPhase = totalScore >= qualityThresholds.FAILED_MAX_SCORE ? 'holding' : 'falling';

  return {
    isCorrect: totalScore >= qualityThresholds.GOOD_MIN_SCORE,
    score: totalScore,
    feedback,
    phase,
  };
}

/**
 * Plank timer tracker
 * Tracks hold time and detects when form fails
 */
export class PlankTracker {
  private isHolding: boolean = false;
  private startTime: number = 0;
  private totalHoldTime: number = 0;
  private targetTime: number = 0;
  private lowScoreFrames: number = 0;
  private hasTimedOut: boolean = false;
  private hasFailed: boolean = false;
  private bestHoldTime: number = 0;
  private variation: PlankVariation = 'high';

  constructor(targetTimeSeconds: number = 30, variation: PlankVariation = 'high') {
    this.targetTime = targetTimeSeconds * 1000;
    this.variation = variation;
  }

  setTargetTime(seconds: number): void {
    this.targetTime = seconds * 1000;
  }

  setVariation(variation: PlankVariation): void {
    this.variation = variation;
  }

  getVariation(): PlankVariation {
    return this.variation;
  }

  /**
   * Update tracker with new form analysis
   */
  update(analysis: FormAnalysis): { shouldStop: boolean; reason?: 'failed' | 'timeout' | 'success' } {
    const now = Date.now();

    // Check if in valid plank position
    if (analysis.phase === 'not-detected') {
      if (this.isHolding) {
        this.totalHoldTime += now - this.startTime;
        this.isHolding = false;
      }
      this.lowScoreFrames = 0;
      return { shouldStop: false };
    }

    // Start holding if not already
    if (!this.isHolding) {
      this.isHolding = true;
      this.startTime = now;
    }

    // Check for form failure based on variation thresholds
    const thresholds = FORM_QUALITY[this.variation];
    if (analysis.score < thresholds.FAILED_MAX_SCORE) {
      this.lowScoreFrames++;
      if (this.lowScoreFrames >= thresholds.FALL_DETECTION_FRAMES && !this.hasFailed) {
        this.hasFailed = true;
        this.totalHoldTime += now - this.startTime;
        this.bestHoldTime = Math.max(this.bestHoldTime, this.totalHoldTime);
        return { shouldStop: true, reason: 'failed' };
      }
    } else {
      this.lowScoreFrames = 0;
    }

    // Check for timeout (reached target)
    const currentHoldTime = this.totalHoldTime + (now - this.startTime);
    if (currentHoldTime >= this.targetTime && !this.hasTimedOut) {
      this.hasTimedOut = true;
      this.totalHoldTime = this.targetTime;
      this.bestHoldTime = Math.max(this.bestHoldTime, this.totalHoldTime);
      return { shouldStop: true, reason: 'success' };
    }

    return { shouldStop: false };
  }

  getCurrentHoldTime(): number {
    if (!this.isHolding) return this.totalHoldTime;
    return this.totalHoldTime + (Date.now() - this.startTime);
  }

  getTargetTime(): number {
    return this.targetTime;
  }

  getBestHoldTime(): number {
    return this.bestHoldTime;
  }

  isCurrentlyHolding(): boolean {
    return this.isHolding;
  }

  hasReachedTarget(): boolean {
    return this.hasTimedOut;
  }

  hasFormFailed(): boolean {
    return this.hasFailed;
  }

  reset(): void {
    this.isHolding = false;
    this.startTime = 0;
    this.totalHoldTime = 0;
    this.lowScoreFrames = 0;
    this.hasTimedOut = false;
    this.hasFailed = false;
  }
}
