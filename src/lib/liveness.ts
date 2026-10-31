/**
 * Client-side head-pose estimate used only to guide the person through the
 * liveness challenge. The server re-checks every frame independently.
 *
 * Same formula as the backend's yaw_index (app/services/liveness_service.py):
 * nose offset along the eye axis in the affine frame of eyes + mouth.
 * Positive = the person turned to their own left (unmirrored camera frame).
 */
type Point = { x: number; y: number };

export function yawFromKeypoints(keypoints: Point[] | undefined): number | null {
  // MediaPipe BlazeFace keypoints: 0/1 eyes, 2 nose tip, 3 mouth centre, 4/5 ears.
  const [a, b, nose, mouth] = keypoints ?? [];
  if (!a || !b || !nose || !mouth) return null;
  const [leftEye, rightEye] = a.x <= b.x ? [a, b] : [b, a];
  const eyeMid = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
  const e1 = { x: rightEye.x - leftEye.x, y: rightEye.y - leftEye.y };
  const e2 = { x: mouth.x - eyeMid.x, y: mouth.y - eyeMid.y };
  const det = e1.x * e2.y - e1.y * e2.x;
  if (Math.abs(det) < 1e-9) return null;
  const n = { x: nose.x - eyeMid.x, y: nose.y - eyeMid.y };
  return (n.x * e2.y - n.y * e2.x) / det;
}

export const LIVENESS_PROMPTS: Record<string, string> = {
  center: "Look straight at the camera",
  left: "Slowly turn your head to your LEFT",
  right: "Now turn your head to your RIGHT",
};

/** Client thresholds are a little stricter than the server's so captured frames pass there. */
export function poseMatches(
  step: string,
  yaw: number,
  centerMax: number,
  turnMin: number,
): boolean {
  if (step === "center") return Math.abs(yaw) <= centerMax * 0.8;
  if (step === "left") return yaw >= turnMin * 1.3;
  return yaw <= -turnMin * 1.3;
}
