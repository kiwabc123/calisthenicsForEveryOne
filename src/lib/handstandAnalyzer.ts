import { PoseLandmark, FormAnalysis, FormFeedback } from '@/types/exercise';
import { calculateAngle, getLandmark, POSE_LANDMARKS } from './poseDetection';

// Handstand variation types
export type HandstandVariation = 'freestanding' | 'wall' | 'pike';

// Handstand form thresholds
const THRESHOLDS = {
  // Body should be vertical (close to 180 degrees from wrist-shoulder-hip line)
  BODY_VERTICAL_MIN: 160,
  BODY_VERTICAL_MAX: 180,
  // Arms should be straight (elbow angle close to 180)
  ARM_STRAIGHT_MIN: 160,
  ARM_STRAIGHT_MAX: 180,
  // Legs should be together and straight (hip angle)
  LEG_STRAIGHT_MIN: 160,
  LEG_STRAIGHT_MAX: 180,
  // Wrists should be under shoulders (horizontal alignment)
  WRIST_SHOULDER_OFFSET_MAX: 0.15, // as fraction of body width
  // Minimum visibility for key landmarks
  MIN_VISIBILITY: 0.4,
};

// Form quality thresholds per variation
const FORM_QUALITY = {
  freestanding: {
    GOOD_MIN_SCORE: 70,
    FAILED_MAX_SCORE: 40,
    FALL_DETECTION_FRAMES: 5,
  },
  wall: {
    GOOD_MIN_SCORE: 60, // More lenient for wall-assisted
    FAILED_MAX_SCORE: 30,
    FALL_DETECTION_FRAMES: 8, // More frames before failing
  },
  pike: {
    GOOD_MIN_SCORE: 50, // Most lenient for pike
    FAILED_MAX_SCORE: 25,
    FALL_DETECTION_FRAMES: 10,
  },
};

// Scoring weights
const SCORE_WEIGHTS = {
  BODY_VERTICAL: 0.35,  // 35% - vertical alignment is crucial
  ARM_POSITION: 0.25,   // 25% - straight arms
  LEG_POSITION: 0.20,   // 20% - legs together
  BALANCE: 0.20,        // 20% - wrist under shoulder
};

export type HandstandPhase = 'holding' | 'falling' | 'not-detected';

/**
 * Get wrist-shoulder-hip angle (should be close to 180 for vertical)
 */
export function getBodyVerticalAngle(
  landmarks: PoseLandmark[],
  side: 'left' | 'right'
): number | null {
  const wristIdx = side === 'left' ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST;
  const shoulderIdx = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
  const hipIdx = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;

  const wrist = getLandmark(landmarks, wristIdx, THRESHOLDS.MIN_VISIBILITY);
  const shoulder = getLandmark(landmarks, shoulderIdx, THRESHOLDS.MIN_VISIBILITY);
  const hip = getLandmark(landmarks, hipIdx, THRESHOLDS.MIN_VISIBILITY);

  if (!wrist || !shoulder || !hip) {
    return null;
  }

  return calculateAngle(wrist, shoulder, hip);
}

/**
 * Get shoulder-hip-ankle angle for leg straightness
 */
export function getLegAngle(
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
 * Get horizontal offset between wrist and shoulder (for balance)
 */
export function getWristShoulderOffset(
  landmarks: PoseLandmark[]
): number | null {
  const leftWrist = getLandmark(landmarks, POSE_LANDMARKS.LEFT_WRIST, THRESHOLDS.MIN_VISIBILITY);
  const rightWrist = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_WRIST, THRESHOLDS.MIN_VISIBILITY);
  const leftShoulder = getLandmark(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);
  const rightShoulder = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);

  if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) {
    return null;
  }

  // Calculate center of wrists and shoulders
  const wristCenterX = (leftWrist.x + rightWrist.x) / 2;
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);

  // Return offset as fraction of shoulder width
  return Math.abs(wristCenterX - shoulderCenterX) / (shoulderWidth || 1);
}

/**
 * Get arm straightness (elbow angle)
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
 * Check if person is in handstand position
 */
export function isInHandstandPosition(landmarks: PoseLandmark[]): boolean {
  // In handstand, wrists should be below shoulders (higher Y value in screen coords)
  const leftWrist = getLandmark(landmarks, POSE_LANDMARKS.LEFT_WRIST, THRESHOLDS.MIN_VISIBILITY);
  const leftShoulder = getLandmark(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);
  const leftHip = getLandmark(landmarks, POSE_LANDMARKS.LEFT_HIP, THRESHOLDS.MIN_VISIBILITY);

  if (!leftWrist || !leftShoulder || !leftHip) {
    return false;
  }

  // Wrist should be at bottom (highest Y), hip at top (lowest Y)
  // In screen coordinates, Y increases downward
  const isInverted = leftWrist.y > leftShoulder.y && leftShoulder.y > leftHip.y;
  
  return isInverted;
}

/**
 * Check if person is in pike/straddle position (easier variation)
 * Pike: hands on floor, hips up, feet on floor or elevated
 */
export function isInPikePosition(landmarks: PoseLandmark[]): boolean {
  const leftWrist = getLandmark(landmarks, POSE_LANDMARKS.LEFT_WRIST, THRESHOLDS.MIN_VISIBILITY);
  const leftShoulder = getLandmark(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, THRESHOLDS.MIN_VISIBILITY);
  const leftHip = getLandmark(landmarks, POSE_LANDMARKS.LEFT_HIP, THRESHOLDS.MIN_VISIBILITY);

  if (!leftWrist || !leftShoulder || !leftHip) {
    return false;
  }

  // Pike: wrists below shoulders, hips higher than shoulders (lower Y)
  // More lenient than full handstand - hips just need to be elevated
  const handsOnGround = leftWrist.y > leftShoulder.y;
  const hipsElevated = leftHip.y < leftShoulder.y;
  
  return handsOnGround && hipsElevated;
}

function averageAngles(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return (a + b) / 2;
}

/**
 * Analyze handstand form from pose landmarks
 * @param variation - The handstand variation being performed
 */
export function analyzeHandstandForm(
  landmarks: PoseLandmark[],
  variation: HandstandVariation = 'freestanding'
): FormAnalysis {
  const feedback: FormFeedback[] = [];
  let bodyScore = 0;
  let armScore = 0;
  let legScore = 0;
  let balanceScore = 0;

  // Check if in handstand position (more lenient for pike - allow partial inversion)
  const inPosition = variation === 'pike' 
    ? isInPikePosition(landmarks) 
    : isInHandstandPosition(landmarks);
    
  if (!inPosition) {
    return {
      isCorrect: false,
      score: 0,
      feedback: [{ type: 'info', message: variation === 'pike' ? 'ยังไม่อยู่ในท่า Pike' : 'ยังไม่อยู่ในท่า Handstand' }],
      phase: 'not-detected',
    };
  }

  const qualityThresholds = FORM_QUALITY[variation];

  // 1. Body vertical alignment
  const leftBodyAngle = getBodyVerticalAngle(landmarks, 'left');
  const rightBodyAngle = getBodyVerticalAngle(landmarks, 'right');
  const avgBodyAngle = averageAngles(leftBodyAngle, rightBodyAngle);

  if (avgBodyAngle !== null) {
    if (avgBodyAngle >= THRESHOLDS.BODY_VERTICAL_MIN) {
      bodyScore = 100;
      feedback.push({ type: 'success', message: '✓ ตัวตั้งตรง' });
    } else if (avgBodyAngle >= 140) {
      bodyScore = 70;
      feedback.push({ type: 'warning', message: 'ลำตัวเอียงเล็กน้อย' });
    } else {
      bodyScore = 40;
      feedback.push({ type: 'error', message: 'ลำตัวเอียงมาก - ดันตัวขึ้น!' });
    }
  }

  // 2. Arm straightness
  const leftArm = getArmAngle(landmarks, 'left');
  const rightArm = getArmAngle(landmarks, 'right');
  const avgArm = averageAngles(leftArm, rightArm);

  if (avgArm !== null) {
    if (avgArm >= THRESHOLDS.ARM_STRAIGHT_MIN) {
      armScore = 100;
      feedback.push({ type: 'success', message: '✓ แขนตรง' });
    } else if (avgArm >= 140) {
      armScore = 70;
      feedback.push({ type: 'warning', message: 'ยืดแขนให้ตรงขึ้น' });
    } else {
      armScore = 40;
      feedback.push({ type: 'error', message: 'ข้อศอกงอ - ล็อคแขนให้ตรง!' });
    }
  }

  // 3. Leg position
  const leftLeg = getLegAngle(landmarks, 'left');
  const rightLeg = getLegAngle(landmarks, 'right');
  const avgLeg = averageAngles(leftLeg, rightLeg);

  if (avgLeg !== null) {
    if (avgLeg >= THRESHOLDS.LEG_STRAIGHT_MIN) {
      legScore = 100;
      feedback.push({ type: 'success', message: '✓ ขาตรง' });
    } else if (avgLeg >= 140) {
      legScore = 70;
      feedback.push({ type: 'warning', message: 'ยืดขาให้ตรงขึ้น' });
    } else {
      legScore = 50;
      feedback.push({ type: 'info', message: 'ขายังงออยู่' });
    }
  }

  // 4. Balance (wrist under shoulder)
  const wristOffset = getWristShoulderOffset(landmarks);
  if (wristOffset !== null) {
    if (wristOffset <= THRESHOLDS.WRIST_SHOULDER_OFFSET_MAX) {
      balanceScore = 100;
    } else if (wristOffset <= 0.25) {
      balanceScore = 70;
      feedback.push({ type: 'warning', message: 'ปรับสมดุล - มือไม่อยู่ใต้ไหล่' });
    } else {
      balanceScore = 40;
      feedback.push({ type: 'error', message: 'เสียสมดุล!' });
    }
  }

  // Calculate total score - adjust weights based on variation
  let totalScore: number;
  
  if (variation === 'pike') {
    // Pike focuses more on arm position, less on body vertical
    totalScore = Math.round(
      bodyScore * 0.20 +
      armScore * 0.40 +
      legScore * 0.15 +
      balanceScore * 0.25
    );
  } else if (variation === 'wall') {
    // Wall can be less strict on balance
    totalScore = Math.round(
      bodyScore * 0.40 +
      armScore * 0.30 +
      legScore * 0.20 +
      balanceScore * 0.10
    );
  } else {
    totalScore = Math.round(
      bodyScore * SCORE_WEIGHTS.BODY_VERTICAL +
      armScore * SCORE_WEIGHTS.ARM_POSITION +
      legScore * SCORE_WEIGHTS.LEG_POSITION +
      balanceScore * SCORE_WEIGHTS.BALANCE
    );
  }

  // Determine phase based on variation thresholds
  const phase: HandstandPhase = totalScore >= qualityThresholds.FAILED_MAX_SCORE ? 'holding' : 'falling';

  return {
    isCorrect: totalScore >= qualityThresholds.GOOD_MIN_SCORE,
    score: totalScore,
    feedback,
    phase,
  };
}

/**
 * Handstand timer tracker
 * Tracks hold time and detects when form fails
 */
export class HandstandTracker {
  private isHolding: boolean = false;
  private startTime: number = 0;
  private totalHoldTime: number = 0;
  private targetTime: number = 0;
  private lowScoreFrames: number = 0;
  private hasTimedOut: boolean = false;
  private hasFailed: boolean = false;
  private bestHoldTime: number = 0;
  private variation: HandstandVariation = 'freestanding';

  constructor(targetTimeSeconds: number = 30, variation: HandstandVariation = 'freestanding') {
    this.targetTime = targetTimeSeconds * 1000;
    this.variation = variation;
  }

  setTargetTime(seconds: number): void {
    this.targetTime = seconds * 1000;
  }

  setVariation(variation: HandstandVariation): void {
    this.variation = variation;
  }

  getVariation(): HandstandVariation {
    return this.variation;
  }

  /**
   * Update tracker with new form analysis
   * Returns true if just failed/timed out (to trigger stop)
   */
  update(analysis: FormAnalysis): { shouldStop: boolean; reason?: 'failed' | 'timeout' | 'success' } {
    const now = Date.now();

    // Check if in valid handstand position
    if (analysis.phase === 'not-detected') {
      if (this.isHolding) {
        // Was holding, now not detected - count as end
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
      this.totalHoldTime = this.targetTime; // Cap at target
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

  fullReset(): void {
    this.reset();
    this.bestHoldTime = 0;
  }
}
