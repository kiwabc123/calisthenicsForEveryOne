import { PoseLandmark, FormAnalysis, FormFeedback, ExercisePhase } from '@/types/exercise';

// Squat variations
export type SquatVariation = 'standard' | 'sumo' | 'narrow' | 'goblet';

// Variation-specific thresholds
const VARIATION_THRESHOLDS: Record<SquatVariation, {
  minKneeAngle: number;      // Bottom position
  maxKneeAngle: number;      // Top position
  minHipAngle: number;       // Bottom position
  maxHipAngle: number;       // Top position
  stanceMultiplier: number;  // Relative to shoulder width
}> = {
  standard: {
    minKneeAngle: 70,
    maxKneeAngle: 160,
    minHipAngle: 60,
    maxHipAngle: 160,
    stanceMultiplier: 1.0,
  },
  sumo: {
    minKneeAngle: 80,
    maxKneeAngle: 160,
    minHipAngle: 70,
    maxHipAngle: 160,
    stanceMultiplier: 1.5,
  },
  narrow: {
    minKneeAngle: 60,
    maxKneeAngle: 160,
    minHipAngle: 50,
    maxHipAngle: 160,
    stanceMultiplier: 0.7,
  },
  goblet: {
    minKneeAngle: 65,
    maxKneeAngle: 160,
    minHipAngle: 55,
    maxHipAngle: 160,
    stanceMultiplier: 1.0,
  },
};

// Smoothing helper for angle data
class AngleSmoothing {
  private values: number[] = [];
  private readonly maxSize: number;

  constructor(size: number = 5) {
    this.maxSize = size;
  }

  add(value: number | null): number | null {
    if (value === null) return null;
    
    this.values.push(value);
    if (this.values.length > this.maxSize) {
      this.values.shift();
    }
    
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }

  reset(): void {
    this.values = [];
  }
}

// Calculate angle at a joint
function calculateAngle(
  a: PoseLandmark,
  b: PoseLandmark,
  c: PoseLandmark
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

// Get knee angle (hip-knee-ankle)
export function getKneeAngle(
  landmarks: PoseLandmark[],
  side: 'left' | 'right'
): number | null {
  const hipIdx = side === 'left' ? 23 : 24;
  const kneeIdx = side === 'left' ? 25 : 26;
  const ankleIdx = side === 'left' ? 27 : 28;

  const hip = landmarks[hipIdx];
  const knee = landmarks[kneeIdx];
  const ankle = landmarks[ankleIdx];

  if (!hip || !knee || !ankle) return null;
  if (hip.visibility < 0.5 || knee.visibility < 0.5 || ankle.visibility < 0.5) return null;

  return calculateAngle(hip, knee, ankle);
}

// Get hip angle (shoulder-hip-knee)
export function getHipAngle(
  landmarks: PoseLandmark[],
  side: 'left' | 'right'
): number | null {
  const shoulderIdx = side === 'left' ? 11 : 12;
  const hipIdx = side === 'left' ? 23 : 24;
  const kneeIdx = side === 'left' ? 25 : 26;

  const shoulder = landmarks[shoulderIdx];
  const hip = landmarks[hipIdx];
  const knee = landmarks[kneeIdx];

  if (!shoulder || !hip || !knee) return null;
  if (shoulder.visibility < 0.5 || hip.visibility < 0.5 || knee.visibility < 0.5) return null;

  return calculateAngle(shoulder, hip, knee);
}

// Check if feet are planted on ground
function areFeetGrounded(landmarks: PoseLandmark[]): boolean {
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const leftHeel = landmarks[29];
  const rightHeel = landmarks[31];
  
  if (!leftAnkle || !rightAnkle) return false;
  
  // Check if heels are close to ankles (feet flat)
  if (leftHeel && rightHeel) {
    const leftHeelDiff = Math.abs(leftAnkle.y - leftHeel.y);
    const rightHeelDiff = Math.abs(rightAnkle.y - rightHeel.y);
    return leftHeelDiff < 0.05 && rightHeelDiff < 0.05;
  }
  
  return true; // Assume grounded if heels not visible
}

// Check back alignment (shoulder-hip-knee line)
function getBackAlignment(landmarks: PoseLandmark[]): number | null {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const hipMidY = (leftHip.y + rightHip.y) / 2;

  // Calculate angle from vertical
  const dx = shoulderMidX - hipMidX;
  const dy = shoulderMidY - hipMidY;
  const angleFromVertical = Math.abs(Math.atan2(dx, -dy) * (180 / Math.PI));
  
  return angleFromVertical;
}

// Detect knee cave (knees going inward)
function detectKneeCave(landmarks: PoseLandmark[]): number {
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
    return 0;
  }

  // Check if knees are tracking inside the ankles (valgus)
  // In a proper squat, knees should track over toes
  const leftKneeOffset = leftKnee.x - leftAnkle.x;
  const rightKneeOffset = rightKnee.x - rightAnkle.x;
  
  // Negative values indicate knee cave
  const kneeCaveScore = Math.min(leftKneeOffset, rightKneeOffset);
  
  return kneeCaveScore < -0.02 ? Math.abs(kneeCaveScore) * 100 : 0;
}

// Check depth (how low the squat goes)
function getSquatDepth(kneeAngle: number, hipAngle: number, variation: SquatVariation): string {
  const thresholds = VARIATION_THRESHOLDS[variation];
  const depthTarget = thresholds.minKneeAngle + 20; // Parallel = slightly above min
  
  if (kneeAngle <= thresholds.minKneeAngle + 10) {
    return 'deep'; // Below parallel
  } else if (kneeAngle <= depthTarget) {
    return 'parallel'; // At or just above parallel
  } else if (kneeAngle <= thresholds.maxKneeAngle - 30) {
    return 'partial'; // Above parallel
  }
  return 'standing';
}

// Detect current phase based on knee angle and velocity
function detectPhase(
  kneeAngle: number | null,
  lastKneeAngle: number | null,
  variation: SquatVariation
): ExercisePhase {
  if (kneeAngle === null) return 'transition';
  
  const thresholds = VARIATION_THRESHOLDS[variation];
  const midPoint = (thresholds.minKneeAngle + thresholds.maxKneeAngle) / 2;
  
  if (lastKneeAngle !== null) {
    const velocity = kneeAngle - lastKneeAngle;
    
    // Going down (knee angle decreasing)
    if (velocity < -2) return 'down';
    // Going up (knee angle increasing)
    if (velocity > 2) return 'up';
  }
  
  // At bottom position
  if (kneeAngle < midPoint - 20) return 'down';
  // At top position
  if (kneeAngle > thresholds.maxKneeAngle - 20) return 'up';
  
  return 'transition';
}

// Main squat form analysis function
export function analyzeSquatForm(
  landmarks: PoseLandmark[],
  smoothedKnee: number | null,
  kneeVelocity?: number,
  variation: SquatVariation = 'standard'
): FormAnalysis {
  const feedback: FormFeedback[] = [];
  let score = 100;

  // Get angles
  const leftKnee = getKneeAngle(landmarks, 'left');
  const rightKnee = getKneeAngle(landmarks, 'right');
  const avgKnee = leftKnee !== null && rightKnee !== null 
    ? (leftKnee + rightKnee) / 2 
    : leftKnee ?? rightKnee;

  const leftHip = getHipAngle(landmarks, 'left');
  const rightHip = getHipAngle(landmarks, 'right');
  const avgHip = leftHip !== null && rightHip !== null 
    ? (leftHip + rightHip) / 2 
    : leftHip ?? rightHip;

  const thresholds = VARIATION_THRESHOLDS[variation];

  // Determine phase
  const phase = detectPhase(smoothedKnee ?? avgKnee, null, variation);

  // Check if pose is detected
  if (avgKnee === null || avgHip === null) {
    return {
      phase: 'transition',
      score: 0,
      isCorrect: false,
      feedback: [{ type: 'error', message: 'ไม่พบท่าทาง กรุณายืนให้เห็นตัวเต็ม' }],
    };
  }

  // Check squat depth
  const depth = getSquatDepth(smoothedKnee ?? avgKnee, avgHip, variation);
  
  if (phase === 'down' || depth !== 'standing') {
    if (depth === 'deep') {
      feedback.push({ type: 'success', message: '✅ ลงลึกมาก สุดยอด!' });
    } else if (depth === 'parallel') {
      feedback.push({ type: 'success', message: '✅ ลงถึง Parallel ดีมาก' });
    } else if (depth === 'partial') {
      feedback.push({ type: 'warning', message: '⚠️ ลงลึกกว่านี้ได้' });
      score -= 15;
    }
  }

  // Check back alignment
  const backAngle = getBackAlignment(landmarks);
  if (backAngle !== null) {
    if (backAngle > 45) {
      feedback.push({ type: 'error', message: '❌ หลังเอนไปข้างหน้ามากเกินไป' });
      score -= 25;
    } else if (backAngle > 30) {
      feedback.push({ type: 'warning', message: '⚠️ พยายามรักษาหลังให้ตรงกว่านี้' });
      score -= 10;
    } else if (backAngle < 20 && depth !== 'standing') {
      feedback.push({ type: 'success', message: '✅ หลังตรงดี' });
    }
  }

  // Check knee cave
  const kneeCave = detectKneeCave(landmarks);
  if (kneeCave > 5) {
    feedback.push({ type: 'error', message: '❌ เข่าล้มเข้าใน (Knee Cave)' });
    score -= 20;
  } else if (kneeCave > 2) {
    feedback.push({ type: 'warning', message: '⚠️ ระวังเข่าล้มเข้าใน' });
    score -= 10;
  }

  // Check feet grounded
  if (!areFeetGrounded(landmarks)) {
    feedback.push({ type: 'warning', message: '⚠️ ส้นเท้ายกขึ้น วางส้นติดพื้น' });
    score -= 15;
  }

  // Knee symmetry
  if (leftKnee !== null && rightKnee !== null) {
    const kneeDiff = Math.abs(leftKnee - rightKnee);
    if (kneeDiff > 20) {
      feedback.push({ type: 'warning', message: '⚠️ เข่าสองข้างไม่สมดุล' });
      score -= 10;
    }
  }

  // Default feedback if good form
  if (feedback.length === 0 && depth === 'standing') {
    feedback.push({ type: 'info', message: 'เริ่มย่อตัวลงได้เลย' });
  } else if (feedback.length === 0) {
    feedback.push({ type: 'success', message: '✅ Form ดีมาก!' });
  }

  return {
    phase,
    score: Math.max(0, Math.min(100, score)),
    isCorrect: score >= 70,
    feedback,
  };
}

// Squat rep counter class
export class SquatRepCounter {
  private count = 0;
  private phase: ExercisePhase = 'up';
  private prevPhase: ExercisePhase = 'up';
  private lastKneeAngle: number | null = null;
  private kneeSmoothing = new AngleSmoothing(5);
  private lastRepQuality: 'good' | 'partial' | 'none' = 'none';
  private wasAtBottom = false;
  private bottomReached = false;
  private variation: SquatVariation = 'standard';
  
  // Hysteresis thresholds
  private readonly TOP_THRESHOLD_HIGH = 150; // Must go above this to count as "up"
  private readonly BOTTOM_THRESHOLD = 100;    // Must go below for "down"

  setVariation(v: SquatVariation): void {
    this.variation = v;
  }

  getSmoothedKnee(rawAngle: number | null): number | null {
    return this.kneeSmoothing.add(rawAngle);
  }

  getKneeVelocity(): number | null {
    if (this.lastKneeAngle === null) return null;
    const smoothed = this.kneeSmoothing.add(null);
    if (smoothed === null) return null;
    return smoothed - this.lastKneeAngle;
  }

  update(phase: ExercisePhase, kneeAngle: number | null): boolean {
    const smoothedAngle = this.getSmoothedKnee(kneeAngle);
    
    if (smoothedAngle === null) {
      this.lastKneeAngle = null;
      return false;
    }

    let newRep = false;
    const thresholds = VARIATION_THRESHOLDS[this.variation];
    const bottomThreshold = thresholds.minKneeAngle + 30;
    const topThreshold = thresholds.maxKneeAngle - 15;

    // Check if reached bottom
    if (smoothedAngle < bottomThreshold) {
      this.bottomReached = true;
      this.wasAtBottom = true;
    }

    // Count rep when returning to top after reaching bottom
    if (this.bottomReached && smoothedAngle > topThreshold) {
      this.count++;
      newRep = true;
      this.bottomReached = false;
      
      // Determine rep quality based on how deep they went
      if (this.wasAtBottom && smoothedAngle < thresholds.minKneeAngle + 15) {
        this.lastRepQuality = 'good'; // Deep squat
      } else {
        this.lastRepQuality = 'partial';
      }
      this.wasAtBottom = false;
    }

    this.lastKneeAngle = smoothedAngle;
    this.prevPhase = this.phase;
    this.phase = phase;

    return newRep;
  }

  getCount(): number {
    return this.count;
  }

  getLastRepQuality(): 'good' | 'partial' | 'none' {
    return this.lastRepQuality;
  }

  reset(): void {
    this.count = 0;
    this.phase = 'up';
    this.prevPhase = 'up';
    this.lastKneeAngle = null;
    this.lastRepQuality = 'none';
    this.wasAtBottom = false;
    this.bottomReached = false;
    this.kneeSmoothing.reset();
  }
}
