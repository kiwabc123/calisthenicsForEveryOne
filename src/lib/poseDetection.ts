import { PoseLandmark } from '@/types/exercise';

// MediaPipe Pose landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Calculate angle between three points (in degrees)
 * Point B is the vertex
 */
export function calculateAngle(
  a: PoseLandmark,
  b: PoseLandmark,
  c: PoseLandmark
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  
  if (angle > 180) {
    angle = 360 - angle;
  }
  
  return angle;
}

/**
 * Get landmark with visibility check
 */
export function getLandmark(
  landmarks: PoseLandmark[],
  index: number,
  minVisibility: number = 0.5
): PoseLandmark | null {
  const landmark = landmarks[index];
  if (!landmark || landmark.visibility < minVisibility) {
    return null;
  }
  return landmark;
}

/**
 * Calculate elbow angle (shoulder -> elbow -> wrist)
 */
export function getElbowAngle(
  landmarks: PoseLandmark[],
  side: 'left' | 'right'
): number | null {
  const shoulderIdx = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
  const elbowIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
  const wristIdx = side === 'left' ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST;

  const shoulder = getLandmark(landmarks, shoulderIdx);
  const elbow = getLandmark(landmarks, elbowIdx);
  const wrist = getLandmark(landmarks, wristIdx);

  if (!shoulder || !elbow || !wrist) {
    return null;
  }

  return calculateAngle(shoulder, elbow, wrist);
}

/**
 * Calculate body alignment (shoulder -> hip -> ankle)
 */
export function getBodyAlignment(
  landmarks: PoseLandmark[],
  side: 'left' | 'right'
): number | null {
  const shoulderIdx = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
  const hipIdx = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;
  const ankleIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ANKLE : POSE_LANDMARKS.RIGHT_ANKLE;

  const shoulder = getLandmark(landmarks, shoulderIdx);
  const hip = getLandmark(landmarks, hipIdx);
  const ankle = getLandmark(landmarks, ankleIdx);

  if (!shoulder || !hip || !ankle) {
    return null;
  }

  return calculateAngle(shoulder, hip, ankle);
}

/**
 * Calculate hip angle (shoulder -> hip -> knee)
 */
export function getHipAngle(
  landmarks: PoseLandmark[],
  side: 'left' | 'right'
): number | null {
  const shoulderIdx = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
  const hipIdx = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;
  const kneeIdx = side === 'left' ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE;

  const shoulder = getLandmark(landmarks, shoulderIdx);
  const hip = getLandmark(landmarks, hipIdx);
  const knee = getLandmark(landmarks, kneeIdx);

  if (!shoulder || !hip || !knee) {
    return null;
  }

  return calculateAngle(shoulder, hip, knee);
}

/**
 * Calculate hip deviation from the shoulder-ankle line
 * Positive value = hip is below the line (sagging)
 * Negative value = hip is above the line (piking)
 * Returns deviation as a fraction of body length
 */
export function getHipDeviation(
  landmarks: PoseLandmark[],
  side: 'left' | 'right'
): number | null {
  const shoulderIdx = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
  const hipIdx = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;
  const ankleIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ANKLE : POSE_LANDMARKS.RIGHT_ANKLE;

  const shoulder = getLandmark(landmarks, shoulderIdx);
  const hip = getLandmark(landmarks, hipIdx);
  const ankle = getLandmark(landmarks, ankleIdx);

  if (!shoulder || !hip || !ankle) {
    return null;
  }

  // Calculate expected Y position of hip if body was perfectly straight
  // Using linear interpolation between shoulder and ankle
  const t = (hip.x - shoulder.x) / (ankle.x - shoulder.x);
  const expectedY = shoulder.y + t * (ankle.y - shoulder.y);
  
  // Calculate deviation (positive = hip below line = sagging in push-up position)
  // Note: In screen coordinates, Y increases downward
  const deviation = hip.y - expectedY;
  
  // Normalize by body length
  const bodyLength = Math.sqrt(
    Math.pow(ankle.x - shoulder.x, 2) + Math.pow(ankle.y - shoulder.y, 2)
  );
  
  return bodyLength > 0 ? deviation / bodyLength : null;
}

/**
 * Check if landmark is visible enough
 */
export function isLandmarkVisible(
  landmarks: PoseLandmark[],
  index: number,
  minVisibility: number = 0.5
): boolean {
  const landmark = landmarks[index];
  return landmark && landmark.visibility >= minVisibility;
}

/**
 * Get average position between two landmarks
 */
export function getMidpoint(a: PoseLandmark, b: PoseLandmark): PoseLandmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}
